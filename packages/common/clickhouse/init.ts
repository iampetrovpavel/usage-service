import { ClickHouseClient } from '@clickhouse/client';

export interface InitTablesOptions {
  usageTable?: string;
  errorsTable?: string;
}

/** Create the ai_usage and errors tables if they don't exist. */
export async function initClickHouseTables(
  client: ClickHouseClient,
  options: InitTablesOptions = {}
): Promise<void> {
  const usageTable = options.usageTable ?? "ai_usage";
  const errorsTable = options.errorsTable ?? "errors";

  await client.command({
    query: `
      CREATE TABLE IF NOT EXISTS ${usageTable} (
        id              UUID DEFAULT generateUUIDv4(),
        session_id      Nullable(UUID),
        user_id         Nullable(UUID),
        model           LowCardinality(String),
        operation       LowCardinality(String),
        input_tokens    UInt32 DEFAULT 0,
        output_tokens   UInt32 DEFAULT 0,
        characters      UInt32 DEFAULT 0,
        audio_duration_ms UInt32 DEFAULT 0,
        cost            Decimal(10, 6) DEFAULT 0,
        created_at      DateTime64(3) DEFAULT now64()
      ) ENGINE = MergeTree()
      ORDER BY (created_at)
    `,
  });

  await client.command({
    query: `
      CREATE TABLE IF NOT EXISTS ${errorsTable} (
        id          UUID DEFAULT generateUUIDv4(),
        source      LowCardinality(String),
        severity    LowCardinality(String),
        message     String,
        stack       Nullable(String),
        code        Nullable(String),
        route       Nullable(String),
        user_id     Nullable(UUID),
        session_id  Nullable(UUID),
        metadata    String DEFAULT '{}',
        created_at  DateTime64(3) DEFAULT now64()
      ) ENGINE = MergeTree()
      ORDER BY (source, created_at)
    `,
  });
}
