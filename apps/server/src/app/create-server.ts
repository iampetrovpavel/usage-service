import { injectable, inject } from "tsyringe";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { initClickHouseTables } from "@usage-service/common";
import type { TRPCContext } from "../adapters/trpc/context";
import type { TRPCRouter } from "../adapters/trpc/router";
import type { NatsConsumer } from "../adapters/nats/consumer";
// import type { NatsProducer } from "../adapters/nats/producer";
import type { Config } from "./config";
import { NodeClickHouseClient } from '@clickhouse/client/dist/client';

@injectable()
export class CreateServer {
  constructor(
    @inject("Config") private config: Config,
    @inject("ClickHouseClient") private clickhouse: NodeClickHouseClient,
    @inject("TRPCContext") private trpcContext: TRPCContext,
    @inject("TRPCRouter") private trpcRouter: TRPCRouter,
    @inject("NatsConsumer") private natsConsumer: NatsConsumer,
    // @inject("NatsProducer") private natsProducer: NatsProducer,
  ) {}

  async create() {
    // Init ClickHouse tables
    await initClickHouseTables(this.clickhouse);
    console.log("ClickHouse tables initialized");

    // Start NATS consumer (non-blocking — continues if NATS unavailable)
    try {
      await this.natsConsumer.start();
    } catch (err) {
      console.warn("NATS consumer failed to start (will operate without event consumption):", err);
    }

    // Start NATS producer (non-blocking — continues if NATS unavailable)
    try {
      // await this.natsProducer.start();
    } catch (err) {
      console.warn("NATS producer failed to start (will operate without event publishing):", err);
    }

    // Start tRPC HTTP server
    const server = createHTTPServer({
      middleware: (req, res, next) => {
        res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        if (req.method === "OPTIONS") {
          res.writeHead(200);
          res.end();
          return;
        }
        next();
      },
      router: this.trpcRouter.createRouter(),
      createContext: ({ req }) =>
        this.trpcContext.createContext({ req }),
    });

    server.listen(this.config.PORT);
    console.log(`tRPC server listening on port ${this.config.PORT}`);
  }
}
