import pino, { type Logger, type LoggerOptions } from "pino";

export function createLogger(serviceName: string, level = process.env.LOG_LEVEL ?? "info"): Logger {
  const options: LoggerOptions = {
    level,
    base: { service: serviceName }
  };
  if (process.env.NODE_ENV !== "production") {
    options.transport = {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard"
      }
    };
  }
  return pino(options);
}
