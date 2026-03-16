import { Pool, type QueryResultRow } from "pg";
import type { Logger } from "pino";

export class DatabaseClient {
  private readonly pool: Pool;

  constructor(databaseUrl: string, private readonly logger: Logger) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 25,
      idleTimeoutMillis: 30_000
    });
  }

  async query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
    const started = Date.now();
    const result = await this.pool.query<T>(text, params);
    this.logger.debug({ query: text, durationMs: Date.now() - started, rows: result.rowCount }, "SQL query");
    return result.rows;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

