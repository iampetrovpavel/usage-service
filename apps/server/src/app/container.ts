import "reflect-metadata";
import { container } from "tsyringe";
import { ClickHouseErrorStorage, ClickHouseUsageStorage, ErrorService, UsageService } from "@usage-service/common";
import { ConfigPricingProvider } from "../adapters/pricing/config-pricing-provider";
import { TRPCContext } from "../adapters/trpc/context";
import { AdminRouter } from "../adapters/trpc/routers/admin";
import { TRPCRouter } from "../adapters/trpc/router";
import { NatsConsumer } from "../adapters/nats/consumer";
import { NatsProducer } from "../adapters/nats/producer";
import { CreateServer } from "./create-server";
import { createClient } from '@clickhouse/client';
import { config } from './config';

container.registerInstance("Config", config);

const clickHouseClient = createClient({
    url: config.CLICKHOUSE_URL,
    username: config.CLICKHOUSE_USER,
    password: config.CLICKHOUSE_PASSWORD,
    database: config.CLICKHOUSE_DATABASE,
});
container.registerInstance("ClickHouseClient", clickHouseClient);

container.registerSingleton("PricingProvider", ConfigPricingProvider);
container.registerInstance("Logger", console);

container.registerSingleton("UsageStorage", ClickHouseUsageStorage);
container.registerSingleton("ErrorStorage", ClickHouseErrorStorage);
container.registerSingleton("UsageService", UsageService);
container.registerSingleton("ErrorService", ErrorService);

container.registerSingleton("TRPCContext", TRPCContext);
container.registerSingleton("AdminRouter", AdminRouter);
container.registerSingleton("TRPCRouter", TRPCRouter);
container.registerSingleton("NatsConsumer", NatsConsumer);
container.registerSingleton("NatsProducer", NatsProducer);
container.registerSingleton("CreateServer", CreateServer);

export { container };
