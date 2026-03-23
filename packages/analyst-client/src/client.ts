import { parseSSEStream } from "./parser.js";
import type { AnalystEvent } from "./types.js";

export interface ChatOptions {
  sessionId?: string;
  tableAsJson?: boolean;
}

export class AnalystClient {
  constructor(
    private baseUrl: string,
    private apiKey: string,
  ) {}

  async *chat(
    message: string,
    options?: ChatOptions,
  ): AsyncIterable<AnalystEvent> {
    const body: Record<string, unknown> = { message };
    if (options?.sessionId) body.session_id = options.sessionId;
    if (options?.tableAsJson) body.table_as_json = true;

    const response = await fetch(`${this.baseUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "text/event-stream",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `Analyst API error: ${response.status} ${response.statusText} ${errorBody}`,
      );
    }

    yield* parseSSEStream(response.body);
  }
}
