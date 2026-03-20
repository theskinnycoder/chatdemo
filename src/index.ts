import { Hono } from "hono";
import { Chat, toAiMessages, type Thread, type Message } from "chat";
import { createSlackAdapter } from "@chat-adapter/slack";
import { createMemoryState } from "@chat-adapter/state-memory";
import { runAgent } from "./agent.js";

const bot = new Chat({
	userName: "Maaya",
	adapters: {
		slack: createSlackAdapter(),
	},
	state: createMemoryState(),
});

async function handleAgentResponse(thread: Thread, message: Message) {
	await thread.startTyping("Thinking...");

	const messages: Message[] = [];
	if (thread.id.endsWith(":")) {
		messages.push(message);
	} else {
		for await (const msg of thread.allMessages) {
			messages.push(msg);
		}
	}

	const history = await toAiMessages(messages);
	const result = runAgent(history);
	await thread.post(result.textStream);
}

bot.onNewMention(async (thread, message) => {
	await thread.subscribe();
	await handleAgentResponse(thread, message);
});

bot.onSubscribedMessage(async (thread, message) => {
	await handleAgentResponse(thread, message);
});

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

const app = new Hono();
const port = Number(Bun.env.PORT ?? 3000);

app.get("/", (c) => c.text("Maaya agent is running"));

app.post("/api/webhooks/slack", async (c) => {
	return bot.webhooks.slack(c.req.raw);
});

app.notFound((c) => c.text("Not Found", 404));

app.onError((error, c) => {
	console.error("Slack webhook error", error);
	return c.text("Internal Server Error", 500);
});

console.log(`AI Agent Slack bot is running on http://localhost:${port}`);
console.log(`Slack webhook endpoint: http://localhost:${port}/api/webhooks/slack`);

export default {
	port,
	fetch: app.fetch,
};
