import { injectable, inject } from "tsyringe";
import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";
import {
  adminLoginInput,
  adminUsageSessionsInput,
  adminUsageBySessionInput,
  adminErrorsInput,
} from "@usage-service/common";
import type { TRPCContext } from "../context";
import type { Config } from "../../../app/config";
import { NodeClickHouseClient } from '@clickhouse/client/dist/client';

@injectable()
export class AdminRouter {
  constructor(
    @inject("TRPCContext") private trpcContext: TRPCContext,
    @inject("ClickHouseClient") private clickhouse: NodeClickHouseClient,
    @inject("Config") private config: Config,
  ) {}

  private async verifyGoogleIdToken(idToken: string): Promise<{ email: string }> {
    const resp = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    if (!resp.ok) {
      throw new Error("Invalid Google ID token");
    }
    const data = (await resp.json()) as { email?: string };
    if (!data.email) {
      throw new Error("No email in Google ID token");
    }
    return { email: data.email };
  }

  createRouter() {
    const { publicProcedure, adminProcedure } = this.trpcContext;
    const clickhouse = this.clickhouse;
    const config = this.config;
    const verifyGoogleIdToken = this.verifyGoogleIdToken.bind(this);

    return this.trpcContext.router({
      login: publicProcedure.input(adminLoginInput).mutation(async ({ input }) => {
        let email: string;
        try {
          const googleUser = await verifyGoogleIdToken(input.idToken);
          email = googleUser.email;
        } catch {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid Google credentials",
          });
        }

        const adminEmails = (config.ADMIN_EMAIL ?? "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
        if (adminEmails.length === 0 || !adminEmails.includes(email.toLowerCase())) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "This account is not authorized for admin access",
          });
        }

        const token = jwt.sign({ role: "admin" }, config.JWT_SECRET, { expiresIn: "24h" });
        return { token };
      }),

      usageSessions: adminProcedure
        .input(adminUsageSessionsInput)
        .query(async ({ input }) => {
          const { page, pageSize, userIdFilter } = input;
          const offset = (page - 1) * pageSize;

          try {
            const userFilter = userIdFilter
              ? `AND user_id = '${userIdFilter}'`
              : "";

            const sessionKey = `ifNull(toString(session_id), concat('call:', toString(id)))`;
            const countResult = await clickhouse.query({
              query: `SELECT count(DISTINCT ${sessionKey}) as total FROM ai_usage WHERE 1=1 ${userFilter}`,
              format: "JSONEachRow",
            });
            const countRows = (await countResult.json()) as Array<{ total: string }>;
            const total = parseInt(countRows[0]?.total ?? "0", 10);

            const dataResult = await clickhouse.query({
              query: `
                SELECT
                  ${sessionKey} as session_id,
                  any(user_id) as user_id,
                  any(workspace_id) as workspace_id,
                  any(organisation_id) as organisation_id,
                  sum(cost) as total_cost,
                  sum(input_tokens) as total_input_tokens,
                  sum(output_tokens) as total_output_tokens,
                  count(*) as api_call_count,
                  min(created_at) as created_at
                FROM ai_usage
                WHERE 1=1 ${userFilter}
                GROUP BY session_id
                ORDER BY created_at DESC
                LIMIT ${pageSize} OFFSET ${offset}
              `,
              format: "JSONEachRow",
            });

            interface SessionRow {
              session_id: string | null;
              user_id: string;
              workspace_id: string | null;
              organisation_id: string | null;
              total_cost: string;
              total_input_tokens: number;
              total_output_tokens: number;
              api_call_count: number;
              created_at: string;
            }

            const sessionRows = (await dataResult.json()) as SessionRow[];

            const rows = sessionRows.map((r) => ({
              sessionId: r.session_id,
              userId: r.user_id,
              workspaceId: r.workspace_id,
              organisationId: r.organisation_id,
              totalCost: r.total_cost,
              totalInputTokens: r.total_input_tokens,
              totalOutputTokens: r.total_output_tokens,
              apiCallCount: r.api_call_count,
              createdAt: r.created_at,
            }));

            return { rows, total, page, pageSize };
          } catch (error) {
            console.error("Admin usage sessions query failed:", error);
            return { rows: [], total: 0, page, pageSize };
          }
        }),

      usageBySession: adminProcedure
        .input(adminUsageBySessionInput)
        .query(async ({ input }) => {
          try {
            const isCallId = input.sessionId?.startsWith("call:");
            const condition = input.sessionId === null
              ? "session_id IS NULL"
              : isCallId
                ? `id = '${input.sessionId!.slice(5)}'`
                : `session_id = '${input.sessionId}'`;

            const result = await clickhouse.query({
              query: `
                SELECT
                  id,
                  model,
                  operation,
                  input_tokens,
                  output_tokens,
                  characters,
                  audio_duration_ms,
                  cost,
                  workspace_id,
                  organisation_id,
                  created_at
                FROM ai_usage
                WHERE ${condition}
                ORDER BY created_at
              `,
              format: "JSONEachRow",
            });

            interface UsageRow {
              id: string;
              model: string;
              operation: string;
              input_tokens: number;
              output_tokens: number;
              characters: number;
              audio_duration_ms: number;
              cost: string;
              workspace_id: string | null;
              organisation_id: string | null;
              created_at: string;
            }

            const rows = (await result.json()) as UsageRow[];

            return rows.map((r) => ({
              id: r.id,
              model: r.model,
              operation: r.operation,
              inputTokens: r.input_tokens,
              outputTokens: r.output_tokens,
              characters: r.characters,
              audioDurationMs: r.audio_duration_ms,
              cost: r.cost,
              workspaceId: r.workspace_id,
              organisationId: r.organisation_id,
              createdAt: r.created_at,
            }));
          } catch (error) {
            console.error("Admin usage by session query failed:", error);
            return [];
          }
        }),

      errors: adminProcedure
        .input(adminErrorsInput)
        .query(async ({ input }) => {
          const { page, pageSize, sourceFilter, severityFilter, search, since } = input;
          const offset = (page - 1) * pageSize;

          try {
            const conditions: string[] = ["1=1"];

            if (sourceFilter) {
              conditions.push(`source = '${sourceFilter}'`);
            }
            if (severityFilter) {
              conditions.push(`severity = '${severityFilter}'`);
            }
            if (search) {
              conditions.push(`positionCaseInsensitive(message, '${search.replace(/'/g, "\\'")}') > 0`);
            }
            if (since) {
              conditions.push(`created_at > '${since}'`);
            }

            const whereClause = conditions.join(" AND ");

            const countResult = await clickhouse.query({
              query: `SELECT count(*) as total FROM errors WHERE ${whereClause}`,
              format: "JSONEachRow",
            });
            const countRows = (await countResult.json()) as Array<{ total: string }>;
            const total = parseInt(countRows[0]?.total ?? "0", 10);

            const dataResult = await clickhouse.query({
              query: `
                SELECT
                  id,
                  source,
                  severity,
                  message,
                  stack,
                  code,
                  route,
                  user_id,
                  workspace_id,
                  organisation_id,
                  session_id,
                  metadata,
                  created_at
                FROM errors
                WHERE ${whereClause}
                ORDER BY created_at DESC
                LIMIT ${pageSize} OFFSET ${offset}
              `,
              format: "JSONEachRow",
            });

            interface ErrorRow {
              id: string;
              source: string;
              severity: string;
              message: string;
              stack: string | null;
              code: string | null;
              route: string | null;
              user_id: string | null;
              workspace_id: string | null;
              organisation_id: string | null;
              session_id: string | null;
              metadata: string;
              created_at: string;
            }

            const errorRows = (await dataResult.json()) as ErrorRow[];

            const rows = errorRows.map((r) => ({
              id: r.id,
              source: r.source,
              severity: r.severity,
              message: r.message,
              stack: r.stack,
              code: r.code,
              route: r.route,
              userId: r.user_id,
              workspaceId: r.workspace_id,
              organisationId: r.organisation_id,
              sessionId: r.session_id,
              metadata: r.metadata,
              createdAt: r.created_at,
            }));

            return { rows, total, page, pageSize };
          } catch (error) {
            console.error("Admin errors query failed:", error);
            return { rows: [], total: 0, page, pageSize };
          }
        }),
    });
  }
}
