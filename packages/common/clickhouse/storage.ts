import { inject, injectable } from "tsyringe";
import type {
  UsageStorage,
  ErrorStorage,
  UsageRecord,
  ErrorRecord,
} from "../interfaces.js";
import { ClickHouseClient } from '@clickhouse/client';

@injectable()
export class ClickHouseUsageStorage implements UsageStorage {
  private table = "ai_usage";

  constructor(
    @inject("ClickHouseClient") private client: ClickHouseClient,
  ) {}

  async insertUsage(record: UsageRecord): Promise<void> {
    await this.client.insert({
      table: this.table,
      values: [record],
      format: "JSONEachRow",
    });
  }

  async getSessionCost(sessionId: string): Promise<string> {
    const result = await this.client.query({
      query: `SELECT sum(cost) as total FROM ${this.table} WHERE session_id = {sessionId:UUID}`,
      query_params: { sessionId },
      format: "JSONEachRow",
    });

    const rows = (await result.json()) as Array<{ total: string }>;
    if (!rows || rows.length === 0 || !rows[0]?.total) return "0";
    return rows[0].total;
  }
}

@injectable()
export class ClickHouseErrorStorage implements ErrorStorage {
  private table = "errors";

  constructor(
    @inject("ClickHouseClient") private client: ClickHouseClient,
  ) {}

  async insertError(record: ErrorRecord): Promise<void> {
    await this.client.insert({
      table: this.table,
      values: [record],
      format: "JSONEachRow",
    });
  }
}
