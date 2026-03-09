import "reflect-metadata";

// Core services
export { UsageService, type UsageServiceOptions } from "./usage-service.js";
export { ErrorService, type ErrorServiceOptions } from "./error-service.js";

// Interfaces
export type {
  UsageStorage,
  ErrorStorage,
  PricingProvider,
  PricingCache,
  UsageRecord,
  ErrorRecord,
  RecordUsageParams,
  RecordErrorParams,
  Logger,
} from "./interfaces.js";

// ClickHouse adapters
export {
  ClickHouseUsageStorage,
  ClickHouseErrorStorage,
} from "./clickhouse/storage.js";
export {
  initClickHouseTables,
  type InitTablesOptions,
} from "./clickhouse/init.js";

// Schemas
export {
  adminLoginInput,
  adminUsageSessionsInput,
  adminUsageBySessionInput,
  adminErrorsInput,
  errorReportInput,
  type AdminLoginInput,
  type AdminUsageSessionsInput,
  type AdminUsageBySessionInput,
  type AdminErrorsInput,
  type ErrorReportInput,
} from "./schemas.js";
