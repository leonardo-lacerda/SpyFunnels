import { z } from "zod";

const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  SERVICE_NAME: z.string().min(1),
  SERVICE_PORT: z.coerce.number().int().positive().default(8080),
  API_PORT: z.coerce.number().int().positive().default(3001),
  WEB_PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  KAFKA_BROKERS: z.string().default("localhost:9092"),
  KAFKA_CLIENT_ID: z.string().default("funnel-intelligence"),
  KAFKA_GROUP_ID: z.string().default("funnel-workers"),
  KAFKA_SSL: z.coerce.boolean().default(false),
  KAFKA_SASL_USERNAME: z.string().optional(),
  KAFKA_SASL_PASSWORD: z.string().optional(),
  MAILPIT_API_URL: z.string().url().default("http://localhost:8025"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  FUNNEL_OCR_ENABLED: z.coerce.boolean().default(false),
  FUNNEL_OCR_MAX_IMAGES: z.coerce.number().int().positive().default(3),
  FUNNEL_OCR_TIMEOUT_MS: z.coerce.number().int().positive().default(12000),
  FUNNEL_EXTRACTION_CONCURRENCY: z.coerce.number().int().positive().default(4),
  FUNNEL_AI_CONCURRENCY: z.coerce.number().int().positive().default(2),
  FUNNEL_MAX_AI_CALLS: z.coerce.number().int().positive().default(12),
  METRICS_ENABLED: z.coerce.boolean().default(true),
  TRACE_EXPORTER_ENDPOINT: z.string().url().optional(),
  TRACE_EXPORTER_TIMEOUT_MS: z.coerce.number().int().positive().default(5000)
});

export type AppConfig = z.infer<typeof baseSchema> & {
  kafkaBrokers: string[];
};

export function loadConfig(overrides: Record<string, string | undefined> = process.env): AppConfig {
  const parsed = baseSchema.parse(overrides);
  const kafkaBrokers = parsed.KAFKA_BROKERS.split(",").map((entry) => entry.trim()).filter(Boolean);
  return {
    ...parsed,
    kafkaBrokers
  };
}
