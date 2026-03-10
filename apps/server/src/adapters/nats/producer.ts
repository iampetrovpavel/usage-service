import { injectable, inject } from "tsyringe";
import {
  connect,
  type NatsConnection,
  type JetStreamClient,
  type JetStreamManager,
  StringCodec,
} from "nats";
import type { RecordUsageParams, RecordErrorParams } from "@usage-service/common";
import type { Config } from "../../app/config";

const sc = StringCodec();

@injectable()
export class NatsProducer {
  private nc: NatsConnection | null = null;
  private js: JetStreamClient | null = null;

  constructor(
    @inject("Config") private config: Config,
  ) {}

  async start(streamName = "USAGE_SERVICE"): Promise<NatsConnection> {
    const natsUrl = this.config.NATS_URL;

    this.nc = await connect({ servers: natsUrl });
    console.log(`NATS producer connected at ${natsUrl}`);

    const jsm: JetStreamManager = await this.nc.jetstreamManager();

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

    this.js = this.nc.jetstream();
    console.log("NATS JetStream producer ready");
    return this.nc;
  }

  async publishUsage(params: RecordUsageParams): Promise<void> {
    if (!this.js) {
      throw new Error("NATS producer not started");
    }
    await this.js.publish("usage.record", sc.encode(JSON.stringify(params)));
  }

  async publishError(params: RecordErrorParams): Promise<void> {
    if (!this.js) {
      throw new Error("NATS producer not started");
    }
    await this.js.publish("error.record", sc.encode(JSON.stringify(params)));
  }

  async close(): Promise<void> {
    if (this.nc) {
      await this.nc.drain();
      this.nc = null;
      this.js = null;
    }
  }
}
