import { AnalystEventSchema } from "./schemas.js";
import type { AnalystEvent } from "./types.js";

export async function* parseSSEStream(
  body: ReadableStream<Uint8Array>,
): AsyncIterable<AnalystEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "";
  let currentData = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        currentData = line.slice(6);
      } else if (line === "" && currentEvent && currentData) {
        const parsed = JSON.parse(currentData);
        const result = AnalystEventSchema.safeParse(parsed);
        if (result.success) {
          yield result.data;
        } else {
          console.warn(
            `[analyst-client] Failed to parse event "${currentEvent}":`,
            result.error.issues?.[0]?.message ?? result.error,
          );
        }
        currentEvent = "";
        currentData = "";
      }
    }
  }
}
