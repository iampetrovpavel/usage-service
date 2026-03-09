import { z } from "zod";

export const adminLoginInput = z.object({
  idToken: z.string().min(1),
});

export const adminUsageSessionsInput = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(100),
  userIdFilter: z.string().optional(),
});

export const adminUsageBySessionInput = z.object({
  sessionId: z.union([z.string().uuid(), z.string().startsWith("call:")]).nullable(),
});

export const adminErrorsInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
  sourceFilter: z.enum(["server", "app"]).optional(),
  severityFilter: z.enum(["error", "warning", "fatal"]).optional(),
  search: z.string().max(256).optional(),
  since: z.string().optional(),
});

export const errorReportInput = z.object({
  message: z.string().min(1).max(2048),
  stack: z.string().max(8192).optional(),
  code: z.string().max(128).optional(),
  screen: z.string().max(128).optional(),
  component: z.string().max(128).optional(),
  severity: z.enum(["error", "warning", "fatal"]).default("error"),
  deviceInfo: z
    .object({
      platform: z.string(),
      version: z.string().optional(),
      model: z.string().optional(),
    })
    .optional(),
});

export type AdminLoginInput = z.infer<typeof adminLoginInput>;
export type AdminUsageSessionsInput = z.infer<typeof adminUsageSessionsInput>;
export type AdminUsageBySessionInput = z.infer<typeof adminUsageBySessionInput>;
export type AdminErrorsInput = z.infer<typeof adminErrorsInput>;
export type ErrorReportInput = z.infer<typeof errorReportInput>;
