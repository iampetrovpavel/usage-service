/** Storage backend for usage records (e.g. ClickHouse, PostgreSQL, in-memory). */
export interface UsageStorage {
  insertUsage(record: UsageRecord): Promise<void>;
  getSessionCost(sessionId: string): Promise<string>;
}

/** Storage backend for error records. */
export interface ErrorStorage {
  insertError(record: ErrorRecord): Promise<void>;
}

/** Pricing provider — looks up unit price for a model+operation pair. */
export interface PricingProvider {
  getPrice(model: string, operation: string): Promise<string | null>;
}

/** Optional cache layer for pricing data. */
export interface PricingCache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
}

/** A row inserted into the usage storage. */
export interface UsageRecord {
  session_id: string | null;
  user_id: string | null;
  model: string;
  operation: string;
  input_tokens: number;
  output_tokens: number;
  characters: number;
  audio_duration_ms: number;
  cost: string;
}

/** A row inserted into the error storage. */
export interface ErrorRecord {
  source: string;
  severity: string;
  message: string;
  stack: string | null;
  code: string | null;
  route: string | null;
  user_id: string | null;
  session_id: string | null;
  metadata: string;
}

/** Parameters for recording a usage event. */
export interface RecordUsageParams {
  sessionId?: string | null;
  userId?: string | null;
  model: string;
  operation: string;
  inputTokens?: number;
  outputTokens?: number;
  characters?: number;
  audioDurationMs?: number;
}

/** Parameters for recording an error. */
export interface RecordErrorParams {
  source: string;
  severity: string;
  message: string;
  stack?: string | null;
  code?: string | null;
  route?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  metadata?: string | null;
}

/** Logger interface — defaults to console if not provided. */
export interface Logger {
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}
