import { inject, injectable } from "tsyringe";
import type { ErrorStorage, RecordErrorParams, Logger } from "./interfaces.js";

const MAX_MESSAGE_LENGTH = 1024;
const MAX_STACK_LENGTH = 4096;

export interface ErrorServiceOptions {
  storage: ErrorStorage;
  maxMessageLength?: number;
  maxStackLength?: number;
  logger?: Logger;
}

@injectable()
export class ErrorService {
  private maxMessageLength = MAX_MESSAGE_LENGTH;
  private maxStackLength = MAX_STACK_LENGTH;

  constructor(
    @inject("ErrorStorage") private storage: ErrorStorage,
    @inject("Logger") private logger: Logger,
  ) {}

  /** Record an error. Fire-and-forget — never throws. */
  async recordError(params: RecordErrorParams): Promise<void> {
    try {
      await this.storage.insertError({
        source: params.source,
        severity: params.severity,
        message: params.message.slice(0, this.maxMessageLength),
        stack: params.stack
          ? params.stack.slice(0, this.maxStackLength)
          : null,
        code: params.code ?? null,
        route: params.route ?? null,
        user_id: params.userId ?? null,
        workspace_id: params.workspaceId ?? null,
        organisation_id: params.organisationId ?? null,
        session_id: params.sessionId ?? null,
        metadata: params.metadata ?? "{}",
      });
    } catch (error) {
      this.logger.error("Failed to record error:", error);
    }
  }
}
