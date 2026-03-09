import { injectable, inject } from "tsyringe";
import type { TRPCContext } from "./context";
import type { AdminRouter } from "./routers/admin";

@injectable()
export class TRPCRouter {
  constructor(
    @inject("TRPCContext") private trpcContext: TRPCContext,
    @inject("AdminRouter") private adminRouter: AdminRouter,
  ) {}

  createRouter() {
    return this.trpcContext.router({
      admin: this.adminRouter.createRouter(),
    });
  }
}

export type AppRouter = ReturnType<TRPCRouter["createRouter"]>;
