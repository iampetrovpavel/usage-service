import { injectable, inject } from "tsyringe";
import { initTRPC, TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import type { Config } from "@usage-service/common";

export interface Context {
  token: string | null;
}

@injectable()
export class TRPCContext {
  public readonly router;
  public readonly publicProcedure;
  public readonly adminProcedure;

  constructor(@inject("Config") private config: Config) {
    const t = initTRPC.context<Context>().create();

    this.router = t.router;
    this.publicProcedure = t.procedure;

    this.adminProcedure = t.procedure.use(async ({ ctx, next }) => {
      if (!ctx.token) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Missing token" });
      }

      try {
        const payload = jwt.verify(ctx.token, this.config.JWT_SECRET) as { role: string };
        if (payload.role !== "admin") {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Not an admin" });
        }
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid token" });
      }

      return next();
    });
  }

  createContext(opts: { req: Request }): Context {
    const authHeader = opts.req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    return { token };
  }
}
