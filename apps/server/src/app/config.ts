import { z } from "zod";

export const envSchema = z.object({
  PORT: z.coerce.number(),
  CLICKHOUSE_URL: z.string(),
  CLICKHOUSE_USER: z.string(),
  CLICKHOUSE_PASSWORD: z.string(),
  CLICKHOUSE_DATABASE: z.string(),
  JWT_SECRET: z.string(),
  ADMIN_EMAIL: z.string(),
  NATS_URL: z.string(),
});

export type Config = z.infer<typeof envSchema>;
export const config: Config = envSchema.parse(process.env);
