import { Chat, toAiMessages, type Thread, type Message } from "chat";
import { createSlackAdapter } from "@chat-adapter/slack";
import { createMemoryState } from "@chat-adapter/state-memory";
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

/** Collect thread history and stream an AI response. */
async function handleAgentResponse(thread: Thread, message: Message) {
  await thread.startTyping("Thinking...");

  // Collect conversation history using chat-sdk's built-in converter
  const allMessages: Message[] = [];
  for await (const msg of thread.allMessages) {
    allMessages.push(msg);
  }
  const history = await toAiMessages(allMessages);

  // Run the agent and stream the response directly to Slack
  const result = runAgent(history);
  await thread.post(result.textStream);
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

/**
 * New @mention or DM — subscribe to thread and respond.
 * DMs automatically set isMention=true, so this handles both channels and DMs.
 */
bot.onNewMention(async (thread, message) => {
  await thread.subscribe();
  await handleAgentResponse(thread, message);
});

/**
 * Follow-up messages in subscribed threads.
 * Maintains full conversation context via thread history.
 */
bot.onSubscribedMessage(async (thread, message) => {
  await handleAgentResponse(thread, message);
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
