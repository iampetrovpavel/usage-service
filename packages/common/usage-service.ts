import { inject, injectable } from "tsyringe";
import type {
  UsageStorage,
  PricingProvider,
  PricingCache,
  RecordUsageParams,
  Logger,
} from "./interfaces.js";

export interface UsageServiceOptions {
  storage: UsageStorage;
  pricing: PricingProvider;
  cache?: PricingCache | null;
  /** TTL for cached prices in seconds. Default: 3600 (1 hour). */
  cacheTtl?: number;
  logger?: Logger;
}

@injectable()
export class UsageService {
  private cacheTtl = 3600;
  private cache: PricingCache | null = null;

  constructor(
    @inject("UsageStorage") private storage: UsageStorage,
    @inject("PricingProvider") private pricing: PricingProvider,
    @inject("Logger") private logger: Logger,
  ) {}

  /** Look up the current price for a model+operation. Checks cache first, falls back to pricing provider. */
  async getPrice(model: string, operation: string): Promise<string | null> {
    const cacheKey = `price:${model}:${operation}`;

    if (this.cache) {
      try {
        const cached = await this.cache.get(cacheKey);
        if (cached !== null) return cached;
      } catch {
        // Cache unavailable, fall through to pricing provider
      }
    }

    const price = await this.pricing.getPrice(model, operation);

    if (this.cache && price !== null) {
      try {
        await this.cache.set(cacheKey, price, this.cacheTtl);
      } catch {
        // Cache write failure, non-critical
      }
    }

    return price;
  }

  /** Record an AI usage event with computed cost. Fire-and-forget — never throws. */
  async recordUsage(params: RecordUsageParams): Promise<void> {
    try {
      let cost = "0";

      if ((params.inputTokens ?? 0) > 0 || (params.outputTokens ?? 0) > 0) {
        const inputPrice = await this.getPrice(params.model, "input_tokens");
        const outputPrice = await this.getPrice(params.model, "output_tokens");

        if (inputPrice && outputPrice) {
          const inputCost = (params.inputTokens ?? 0) * parseFloat(inputPrice);
          const outputCost =
            (params.outputTokens ?? 0) * parseFloat(outputPrice);
          cost = (inputCost + outputCost).toFixed(6);
        } else {
          this.logger.warn(
            `No price found for model=${params.model} tokens`
          );
        }
      } else if ((params.characters ?? 0) > 0) {
        const charPrice = await this.getPrice(params.model, "characters");
        if (charPrice) {
          cost = ((params.characters ?? 0) * parseFloat(charPrice)).toFixed(6);
        } else {
          this.logger.warn(
            `No price found for model=${params.model} characters`
          );
        }
      } else if ((params.audioDurationMs ?? 0) > 0) {
        const minutePrice = await this.getPrice(
          params.model,
          "audio_minutes"
        );
        if (minutePrice) {
          const minutes = (params.audioDurationMs ?? 0) / 60000;
          cost = (minutes * parseFloat(minutePrice)).toFixed(6);
        } else {
          this.logger.warn(
            `No price found for model=${params.model} audio_minutes`
          );
        }
      }

      await this.storage.insertUsage({
        session_id: params.sessionId ?? null,
        user_id: params.userId ?? null,
        workspace_id: params.workspaceId ?? null,
        organisation_id: params.organisationId ?? null,
        model: params.model,
        operation: params.operation,
        input_tokens: params.inputTokens ?? 0,
        output_tokens: params.outputTokens ?? 0,
        characters: params.characters ?? 0,
        audio_duration_ms: params.audioDurationMs ?? 0,
        cost,
      });
    } catch (error) {
      this.logger.error("Failed to record AI usage:", error);
    }
  }

  /** Sum all costs for a session. Returns "0" if no rows or on error. */
  async getSessionCost(sessionId: string): Promise<string> {
    try {
      return await this.storage.getSessionCost(sessionId);
    } catch (error) {
      this.logger.error("Failed to get session cost:", error);
      return "0";
    }
  }
}
