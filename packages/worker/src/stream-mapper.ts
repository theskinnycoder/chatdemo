import type { AnalystEvent } from "@maaya/analyst-client";
import type { StreamChunk } from "chat";

/**
 * A content segment in streaming order.
 * Used to reconstruct the final message with task cards at their
 * original positions.
 */
export type ContentSegment =
  | { type: "text"; text: string }
  | { type: "reasoning"; title: string; output: string };

/**
 * Maps Analyst SSE events to Chat SDK StreamChunks.
 *
 * Tracks an ordered content log so the final message can be
 * rebuilt with task cards inline at their original positions.
 */
export function mapAnalystToStreamChunks(events: AsyncIterable<AnalystEvent>) {
  let followUpQueries: string[] = [];
  const contentLog: ContentSegment[] = [];
  // Track current text accumulator — flushed when a reasoning step interrupts
  let currentText = "";

  const flushText = () => {
    if (currentText.trim()) {
      contentLog.push({ type: "text", text: currentText });
    }
    currentText = "";
  };

  const stream = (async function* (): AsyncIterable<string | StreamChunk> {
    let lineBuffer = "";
    let inTable = false;

    function* processLine(line: string): Generator<string | StreamChunk, void> {
      const trimmed = line.trim();
      const isTableLine = trimmed.startsWith("|") && trimmed.endsWith("|");

      if (isTableLine) {
        if (!inTable) inTable = true;
        // Suppress table line from stream, but accumulate in currentText
        currentText += line + "\n";
        return;
      }

      if (inTable) inTable = false;

      currentText += line + "\n";
      yield line + "\n";
    }

    for await (const event of events) {
      switch (event.type) {
        case "response.output_item.added":
          if (event.item.type === "thinking") {
            flushText();
            yield {
              type: "task_update",
              id: event.item.id,
              title: "Thinking...",
              status: "in_progress",
            } satisfies StreamChunk;
          }
          break;

        case "response.content_part.added":
          if (event.part.type === "reasoning" && event.part.title) {
            yield {
              type: "task_update",
              id: event.item_id,
              title: event.part.title,
              status: "in_progress",
            } satisfies StreamChunk;
          }
          break;

        case "response.reasoning.done": {
          const output =
            event.text.length > 100
              ? event.text.slice(0, 100) + "..."
              : event.text;
          contentLog.push({
            type: "reasoning",
            title: event.title,
            output,
          });
          yield {
            type: "task_update",
            id: event.item_id,
            title: event.title,
            status: "complete",
            output,
          } satisfies StreamChunk;
          break;
        }

        case "response.output_text.delta": {
          lineBuffer += event.delta;
          const lines = lineBuffer.split("\n");
          lineBuffer = lines.pop() ?? "";

          for (const line of lines) {
            yield* processLine(line);
          }
          break;
        }

        case "response.follow_up_queries_event":
          followUpQueries = event.follow_up_queries;
          break;
      }
    }

    // Flush remaining buffer
    if (lineBuffer.length > 0) {
      yield* processLine(lineBuffer);
    }
    flushText();
  })();

  return {
    stream,
    getContentLog: () => contentLog,
    getFollowUpQueries: () => followUpQueries,
  };
}
