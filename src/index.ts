import { Chat, type Thread } from "chat";
import { createSlackAdapter } from "@chat-adapter/slack";
import { createMemoryState } from "@chat-adapter/state-memory";
import type { ModelMessage } from "ai";
import { runAgent } from "./agent.js";
import { welcomeCard, suggestedActionsCard } from "./blocks.js";

// ---------------------------------------------------------------------------
// Chat SDK instance
// ---------------------------------------------------------------------------
const bot = new Chat({
  userName: "ai-agent",
  adapters: {
    slack: createSlackAdapter(),
  },
  state: createMemoryState(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Collect thread history into CoreMessage[] for the AI SDK. */
async function collectMessages(thread: Thread): Promise<ModelMessage[]> {
  const messages: ModelMessage[] = [];
  for await (const msg of thread.allMessages) {
    if (!msg.text) continue;
    messages.push({
      role: msg.author.isBot ? "assistant" : "user",
      content: msg.text,
    });
  }
  return messages;
}

/** Stream an AI agent response into the thread. */
async function handleAgentResponse(thread: Thread) {
  const messages = await collectMessages(thread);
  const result = runAgent(messages);

  // Stream the response — chat-sdk's thread.post() accepts AsyncIterable<string>
  // and handles Slack's native streaming (post-then-edit with throttled updates)
  await thread.post(result.textStream);
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

/**
 * New @mention or DM — greet, subscribe to thread, and respond.
 * DMs automatically set isMention=true, so this handles both channels and DMs.
 */
bot.onNewMention(async (thread) => {
  // Subscribe so follow-up messages in this thread also get handled
  await thread.subscribe();
  await handleAgentResponse(thread);
});

/**
 * Follow-up messages in threads the bot has subscribed to.
 * Maintains full conversation context.
 */
bot.onSubscribedMessage(async (thread) => {
  await handleAgentResponse(thread);
});

/**
 * Handle button clicks from suggested actions card.
 */
bot.onAction(async (action) => {
  const prompts: Record<string, string> = {
    "weather-prompt": "What's the weather in Tokyo?",
    "calc-prompt": "What is 42 * 1337?",
    "help-prompt": "What can you do?",
  };

  const prompt = prompts[action.actionId];
  if (!prompt || !action.thread) return;

  await action.thread.subscribe();
  const result = runAgent([{ role: "user", content: prompt }]);
  await action.thread.post(result.textStream);
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
console.log("AI Agent Slack bot is running!");
