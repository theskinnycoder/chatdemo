import { streamText, stepCountIs, type ModelMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { weatherTool } from "./tools/weather.js";
import { calculatorTool } from "./tools/calculator.js";

const SYSTEM_PROMPT = `You are a helpful Slack bot assistant powered by Claude with access to tools.

Guidelines:
- Keep responses concise and well-formatted for Slack
- Use Slack mrkdwn: *bold*, _italic_, \`code\`, \`\`\`code blocks\`\`\`, > blockquotes
- Use bullet points for lists
- When using the weather tool, provide the city's latitude and longitude
- When using the calculator tool, write valid JavaScript math expressions
- Always be helpful, friendly, and to the point
- Current date: ${new Date().toISOString().split("T")[0]}`;

/**
 * Runs the AI agent with streaming, tools, and extended thinking.
 * Returns a streamText result whose textStream can be passed directly
 * to chat-sdk's thread.post() for native Slack streaming.
 */
export function runAgent(messages: ModelMessage[]) {
  return streamText({
    model: anthropic("claude-sonnet-4-5-20250514"),
    system: SYSTEM_PROMPT,
    messages,
    tools: {
      weather: weatherTool,
      calculator: calculatorTool,
    },
    stopWhen: stepCountIs(5),
    providerOptions: {
      anthropic: {
        thinking: { type: "enabled", budgetTokens: 5000 },
      },
    },
  });
}
