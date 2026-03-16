import { Kafka, type Consumer, type KafkaConfig, type Producer } from "kafkajs";
import type { Logger } from "pino";
import { attachTraceContext, createTraceContext, extractTraceContext, type TraceContext } from "./tracing.js";
import { incrementCounter, observeHistogram } from "./metrics.js";
import { emitTraceEvent } from "./trace-exporter.js";

export type EventHandler = (event: {
  key: string;
  payload: unknown;
  raw: string;
  topic: string;
  partition: number;
  offset: string;
  traceContext: TraceContext | null;
}) => Promise<void>;

type KafkaHeaderValue = Buffer | string | null | undefined;

function headerText(value: KafkaHeaderValue): string | null {
  if (Buffer.isBuffer(value)) {
    const text = value.toString().trim();
    return text.length > 0 ? text : null;
  }
  if (typeof value === "string") {
    const text = value.trim();
    return text.length > 0 ? text : null;
  }
  return null;
}

function traceFromHeaders(
  headers?: Record<string, KafkaHeaderValue> | null
): TraceContext | null {
  if (!headers) return null;
  const traceId = headerText(headers["x-trace-id"]);
  if (!traceId) return null;
  const spanId = headerText(headers["x-span-id"]);
  const parentSpanId = headerText(headers["x-parent-span-id"]);
  const origin = headerText(headers["x-trace-origin"]);
  const startedAt = headerText(headers["x-trace-started-at"]);
  return createTraceContext({
    traceId,
    ...(spanId ? { spanId } : {}),
    ...(parentSpanId ? { parentSpanId } : {}),
    ...(origin ? { origin } : {}),
    ...(startedAt ? { startedAt } : {})
  });
}

function traceHeaders(traceContext: TraceContext): Record<string, string> {
  return {
    "x-trace-id": traceContext.traceId,
    "x-span-id": traceContext.spanId,
    "x-parent-span-id": traceContext.parentSpanId ?? "",
    "x-trace-origin": traceContext.origin ?? "",
    "x-trace-started-at": traceContext.startedAt
  };
}

export class KafkaEventBus {
  private readonly kafka: Kafka;
  private readonly producer: Producer;
  private producerConnected = false;
  private readonly serviceName: string;

  constructor(private readonly logger: Logger, kafkaConfig: KafkaConfig) {
    this.kafka = new Kafka(kafkaConfig);
    this.producer = this.kafka.producer();
    this.serviceName = process.env.SERVICE_NAME ?? "unknown-service";
  }

  async connectProducer(): Promise<void> {
    if (this.producerConnected) {
      return;
    }
    await this.producer.connect();
    this.producerConnected = true;
    this.logger.info("Kafka producer connected");
  }

  async disconnectProducer(): Promise<void> {
    if (!this.producerConnected) {
      return;
    }
    await this.producer.disconnect();
    this.producerConnected = false;
    this.logger.info("Kafka producer disconnected");
  }

  async publish(
    topic: string,
    key: string,
    payload: unknown,
    options?: { traceContext?: TraceContext | null }
  ): Promise<void> {
    if (!this.producerConnected) {
      await this.connectProducer();
    }
    const startedAt = Date.now();
    const inheritedTrace = options?.traceContext ?? extractTraceContext(payload);
    const traceContext = inheritedTrace ? createTraceContext(inheritedTrace) : null;
    const messagePayload = traceContext ? attachTraceContext(payload, traceContext) : payload;
    const message = traceContext
      ? { key, value: JSON.stringify(messagePayload), headers: traceHeaders(traceContext) }
      : { key, value: JSON.stringify(messagePayload) };
    try {
      await this.producer.send({
        topic,
        messages: [message]
      });
      const durationMs = Date.now() - startedAt;
      incrementCounter("kafka_publish_total", 1, { service: this.serviceName, topic });
      observeHistogram("kafka_publish_duration_ms", durationMs, { service: this.serviceName, topic });
      emitTraceEvent({
        service: this.serviceName,
        operation: "kafka.publish",
        traceContext,
        durationMs,
        status: "ok",
        attributes: { topic, key }
      });
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      incrementCounter("kafka_publish_errors_total", 1, { service: this.serviceName, topic });
      observeHistogram("kafka_publish_duration_ms", durationMs, { service: this.serviceName, topic });
      emitTraceEvent({
        service: this.serviceName,
        operation: "kafka.publish",
        traceContext,
        durationMs,
        status: "error",
        attributes: { topic, key },
        error:
          error instanceof Error
            ? {
                message: error.message,
                ...(error.stack ? { stack: error.stack } : {})
              }
            : { message: String(error) }
      });
      throw error;
    }
  }

  async createConsumer(
    groupId: string,
    topics: string[],
    handler: EventHandler,
    options?: { maxAttempts?: number; retryBackoffMs?: number }
  ): Promise<Consumer> {
    const consumer = this.kafka.consumer({ groupId });
    const maxAttempts = options?.maxAttempts ?? 3;
    const retryBackoffMs = options?.retryBackoffMs ?? 500;

    const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
    const serializeError = (error: unknown) => {
      if (error instanceof Error) {
        return {
          name: error.name,
          message: error.message,
          stack: error.stack
        };
      }
      return { message: String(error) };
    };

    await consumer.connect();
    for (const topic of topics) {
      await consumer.subscribe({ topic, fromBeginning: false });
    }
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        if (!message.value) {
          return;
        }
        incrementCounter("kafka_consume_total", 1, {
          service: this.serviceName,
          topic,
          status: "received"
        });
        const raw = message.value.toString();
        const key = message.key?.toString() ?? "";
        let lastError: unknown;
        let traceContext: TraceContext | null = null;
        const startedAt = Date.now();

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          try {
            const payload = JSON.parse(raw);
            traceContext = traceFromHeaders(message.headers as Record<string, KafkaHeaderValue>) ?? extractTraceContext(payload);
            await handler({
              key,
              payload,
              raw,
              topic,
              partition,
              offset: message.offset,
              traceContext
            });
            const durationMs = Date.now() - startedAt;
            incrementCounter("kafka_consume_total", 1, {
              service: this.serviceName,
              topic,
              status: "success"
            });
            observeHistogram("kafka_consume_duration_ms", durationMs, { service: this.serviceName, topic });
            emitTraceEvent({
              service: this.serviceName,
              operation: "kafka.consume",
              traceContext,
              durationMs,
              status: "ok",
              attributes: { topic, key, partition, offset: message.offset }
            });
            return;
          } catch (error) {
            lastError = error;
            incrementCounter("kafka_consume_retry_total", 1, {
              service: this.serviceName,
              topic,
              attempt
            });
            this.logger.warn(
              {
                topic,
                partition,
                key,
                attempt,
                maxAttempts,
                error: serializeError(error)
              },
              "Kafka consumer handler failed; retrying"
            );
            if (attempt < maxAttempts) {
              await wait(retryBackoffMs * attempt);
            }
          }
        }

        const dlqTopic = `${topic}.dlq`;
        const dlqPayload = {
          topic,
          partition,
          key,
          offset: message.offset,
          timestamp: message.timestamp,
          raw,
          trace: traceContext,
          error: serializeError(lastError),
          failedAt: new Date().toISOString()
        };

        this.logger.error(
          {
            topic,
            partition,
            key,
            dlqTopic,
            error: serializeError(lastError)
          },
          "Kafka consumer handler failed after retries; forwarding to DLQ"
        );

        try {
          await this.publish(dlqTopic, key || `${topic}:${partition}:${message.offset}`, dlqPayload, {
            traceContext
          });
          incrementCounter("kafka_dlq_total", 1, { service: this.serviceName, topic, dlqTopic });
        } catch (dlqError) {
          this.logger.error(
            {
              dlqTopic,
              originalTopic: topic,
              key,
              error: serializeError(dlqError)
            },
            "Failed to publish Kafka message to DLQ"
          );
        }
        const durationMs = Date.now() - startedAt;
        incrementCounter("kafka_consume_total", 1, {
          service: this.serviceName,
          topic,
          status: "failed"
        });
        observeHistogram("kafka_consume_duration_ms", durationMs, { service: this.serviceName, topic });
        emitTraceEvent({
          service: this.serviceName,
          operation: "kafka.consume",
          traceContext,
          durationMs,
          status: "error",
          attributes: { topic, key, partition, offset: message.offset },
          error:
            lastError instanceof Error
              ? {
                  message: lastError.message,
                  ...(lastError.stack ? { stack: lastError.stack } : {})
                }
              : { message: String(lastError) }
        });
      }
    });
    this.logger.info({ topics, groupId }, "Kafka consumer running");
    return consumer;
  }
}
