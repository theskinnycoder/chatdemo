import { createSlackAdapter, type SlackAdapter } from "@chat-adapter/slack";
import { createMemoryState } from "@chat-adapter/state-memory";
import { AnalystClient } from "@maaya/analyst-client";
import { Chat, type Thread } from "chat";
import { FollowUpCard } from "./cards/follow-up.js";
import { splitIntoTableChunks } from "./message-chunker.js";
import { markdownToSlackBlocks, postSlackBlocks } from "./slack-blocks.js";
import { mapAnalystToStreamChunks } from "./stream-mapper.js";

const analyst = new AnalystClient(Bun.env.BASE_URL!, Bun.env.API_KEY_JWT!);

const adapters = { slack: createSlackAdapter() };

export const bot = new Chat<typeof adapters>({
  userName: "Maaya",
  adapters,
  state: createMemoryState(),
});

const slack = bot.getAdapter("slack") as SlackAdapter;

/**
 * Derive a deterministic UUID-formatted session ID from the thread ID.
 * The Analyst API expects UUID-format session IDs.
 * We hash the thread.id (format "channel:threadTs") into a stable UUID.
 */
function getSessionId(thread: Thread): string {
  const hash = Bun.hash(thread.id).toString(16).padStart(32, "0");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join("-");
}

async function handleAnalystResponse(thread: Thread, messageText: string) {
  try {
    await thread.startTyping("Thinking...");

    const sessionId = getSessionId(thread);
    const events = analyst.chat(messageText, { sessionId });
    const { stream, getContentLog, getFollowUpQueries } =
      mapAnalystToStreamChunks(events);

    await thread.post(stream);

    // Post tables as separate messages with native Slack table blocks.
    // Tables are suppressed from the stream (not shown during streaming)
    // to avoid rendering as raw pipe-delimited text.
    // Task cards from streaming are preserved — we never update the
    // original message.
    const contentLog = getContentLog();
    const fullText = contentLog
      .filter((s) => s.type === "text")
      .map((s) => s.text)
      .join("");

    if (/\|[-:\s]+\|/.test(fullText)) {
      const token = Bun.env.SLACK_BOT_TOKEN!;
      const { channel, threadTs } = slack.decodeThreadId(thread.id);

      for (const segment of contentLog) {
        if (segment.type !== "text") continue;
        if (!/\|[-:\s]+\|/.test(segment.text)) continue;

        const chunks = splitIntoTableChunks(segment.text);
        for (const chunk of chunks) {
          if (/\|[-:\s]+\|/.test(chunk)) {
            const blocks = markdownToSlackBlocks(chunk);
            await postSlackBlocks(token, channel, threadTs, blocks, chunk);
          }
        }
      }
    }

    const followUps = getFollowUpQueries();
    if (followUps.length > 0) {
      await thread.post(FollowUpCard({ queries: followUps }));
    }
  } catch (error) {
    console.error("Analyst response failed", error);
    await thread.post("Sorry, something went wrong. Please try again.");
  }
}

bot.onNewMention(async (thread, message) => {
  await thread.subscribe();
  await handleAnalystResponse(thread, message.text);
});

bot.onSubscribedMessage(async (thread, message) => {
  await handleAnalystResponse(thread, message.text);
});

bot.onDirectMessage(async (thread, message) => {
  await thread.subscribe();
  await handleAnalystResponse(thread, message.text);
});

bot.onAssistantThreadStarted(async (event) => {
  await slack.setSuggestedPrompts(event.channelId, event.threadTs, [
    { title: "Show tables", message: "What tables are in the database?" },
    {
      title: "Show schema",
      message: "Show me the schema of the commit table",
    },
    { title: "Get help", message: "What can you help me with?" },
  ]);
  await slack.setAssistantStatus(
    event.channelId,
    event.threadTs,
    "Ready to help",
  );
});

bot.onAssistantContextChanged(async (event) => {
  await slack.setAssistantStatus(
    event.channelId,
    event.threadTs,
    "Context updated",
  );
});

bot.onAction(async (action) => {
  if (!action.actionId.startsWith("analyst-followup")) return;
  if (!action.thread || !action.value) return;

  const thread = action.thread;
  const question = action.value;

  // Delete the follow-up card message that was clicked
  try {
    await slack.deleteMessage(action.threadId, action.messageId);
  } catch {
    // Ignore delete failures
  }

  // Post attribution: "@user asked 'question'"
  const mention = thread.mentionUser(action.user.userId);
  await thread.post(`${mention} asked "${question}"`);

  // Subscribe and respond
  await thread.subscribe();
  await handleAnalystResponse(thread as Thread, question);
});
