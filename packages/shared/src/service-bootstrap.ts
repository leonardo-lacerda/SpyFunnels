import { loadConfig } from "@funnel/config";
import { createLogger } from "@funnel/logger";
import { KafkaEventBus } from "./event-bus.js";

export function bootstrapService(serviceName: string) {
  const config = loadConfig({
    ...process.env,
    SERVICE_NAME: serviceName
  });
  const logger = createLogger(serviceName, config.LOG_LEVEL);
  const kafkaConfig: {
    clientId: string;
    brokers: string[];
    ssl?: { rejectUnauthorized: boolean };
    sasl?: { mechanism: "plain"; username: string; password: string };
  } = {
    clientId: `${config.KAFKA_CLIENT_ID}-${serviceName}`,
    brokers: config.kafkaBrokers
  };
  if (config.KAFKA_SSL) {
    kafkaConfig.ssl = {
      rejectUnauthorized: false
    };
  }
  if (config.KAFKA_SASL_USERNAME && config.KAFKA_SASL_PASSWORD) {
    kafkaConfig.sasl = {
      mechanism: "plain",
      username: config.KAFKA_SASL_USERNAME,
      password: config.KAFKA_SASL_PASSWORD
    };
  }
  const eventBus = new KafkaEventBus(logger, kafkaConfig);

  return { config, logger, eventBus };
}
