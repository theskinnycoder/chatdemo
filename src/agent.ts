import { streamText, stepCountIs } from "ai";
import type { AiMessage } from "chat";
import { openai } from "@ai-sdk/openai";
import { weatherTool } from "./tools/weather.js";
import { calculatorTool } from "./tools/calculator.js";

const SYSTEM_PROMPT = `You are a helpful Slack bot assistant powered by OpenAI GPT-5 Mini with access to tools.

Guidelines:
- Keep responses concise and well-formatted for Slack
- Use Slack mrkdwn: *bold*, _italic_, \`code\`, \`\`\`code blocks\`\`\`, > blockquotes
- Use bullet points for lists
- When using the weather tool, provide the city's latitude and longitude
- When using the calculator tool, write valid JavaScript math expressions
- Always be helpful, friendly, and to the point
- Current date: ${new Date().toISOString().split("T")[0]}`;

/**
 * Runs the AI agent with streaming and tools.
 * Returns a streamText result whose textStream can be passed directly
 * to chat-sdk's thread.post() for native Slack streaming.
 */
export function runAgent(messages: AiMessage[]) {
	return streamText({
		model: openai("gpt-5-mini"),
		system: SYSTEM_PROMPT,
		messages,
		tools: {
			weather: weatherTool,
			calculator: calculatorTool,
		},
		stopWhen: stepCountIs(5),
	});
}
