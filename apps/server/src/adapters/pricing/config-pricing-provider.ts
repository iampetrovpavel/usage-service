import { injectable } from "tsyringe";
import type { PricingProvider } from "@usage-service/common";
import { DEFAULT_PRICES } from "./default-prices";

@injectable()
export class ConfigPricingProvider implements PricingProvider {
  private prices: Map<string, string>;

  constructor() {
    this.prices = new Map();
    for (const [model, ops] of Object.entries(DEFAULT_PRICES)) {
      for (const [op, price] of Object.entries(ops)) {
        this.prices.set(`${model}:${op}`, price);
      }
    }
  }

  async getPrice(model: string, operation: string): Promise<string | null> {
    return this.prices.get(`${model}:${operation}`) ?? null;
  }
}
