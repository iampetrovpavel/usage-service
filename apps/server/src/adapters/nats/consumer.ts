import { injectable, inject } from "tsyringe";
import {
  connect,
  type NatsConnection,
  type JetStreamClient,
  type JetStreamManager,
  StringCodec,
} from "nats";
import type { UsageService, ErrorService, RecordUsageParams, RecordErrorParams } from "@usage-service/common";
import type { Config } from "@usage-service/common";

const sc = StringCodec();

@injectable()
export class NatsConsumer {
  constructor(
    @inject("UsageService") private usageService: UsageService,
    @inject("ErrorService") private errorService: ErrorService,
    @inject("Config") private config: Config,
  ) {}

  async start(streamName = "USAGE_SERVICE"): Promise<NatsConnection> {
    const natsUrl = this.config.NATS_URL;

    const nc = await connect({ servers: natsUrl });
    console.log(`Connected to NATS at ${natsUrl}`);

    const jsm: JetStreamManager = await nc.jetstreamManager();

    // Ensure stream exists
    try {
      await jsm.streams.info(streamName);
    } catch {
      await jsm.streams.add({
        name: streamName,
        subjects: ["usage.record", "error.record"],
      });
      console.log(`Created JetStream stream: ${streamName}`);
    }

    const js: JetStreamClient = nc.jetstream();

    // Usage consumer
    const usageConsumer = await js.consumers.get(streamName, {
      durable_name: "usage-processor",
      filter_subject: "usage.record",
    } as any);

    (async () => {
      const messages = await usageConsumer.consume();
      for await (const msg of messages) {
        try {
          const payload = JSON.parse(sc.decode(msg.data)) as RecordUsageParams;
          await this.usageService.recordUsage(payload);
          msg.ack();
        } catch (err) {
          console.error("Failed to process usage event:", err);
          msg.nak();
        }
      }
    })();

    // Error consumer
    const errorConsumer = await js.consumers.get(streamName, {
      durable_name: "error-processor",
      filter_subject: "error.record",
    } as any);

    (async () => {
      const messages = await errorConsumer.consume();
      for await (const msg of messages) {
        try {
          const payload = JSON.parse(sc.decode(msg.data)) as RecordErrorParams;
          await this.errorService.recordError(payload);
          msg.ack();
        } catch (err) {
          console.error("Failed to process error event:", err);
          msg.nak();
        }
      }
    })();

    console.log("NATS JetStream consumers started");
    return nc;
  }
}
