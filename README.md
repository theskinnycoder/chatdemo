# Maaya — AI Agent Slack Bot

A streaming AI-powered Slack bot built with [Chat SDK](https://chat-sdk.dev), [Vercel AI SDK](https://ai-sdk.dev), [Hono](https://hono.dev), and Bun. Uses OpenAI GPT-5 Mini with tool calling and rich BlockKit messages.

## Features

- **Streaming responses** — AI responses stream into channels, MPIMs, and Slack Assistant threads in real-time
- **Tool calling** — Weather lookups (Open-Meteo) and math calculations
- **Rich BlockKit UI** — Cards, fields, buttons, and suggested actions
- **Conversation context** — Maintains thread history for multi-turn conversations
- **Slack Assistant API** — Works in channels (@mentions) and DMs
- **In-memory state** — Thread subscriptions and state for development

## Prerequisites

- Bun 1.3+
- A Slack workspace where you can create apps

## Slack App Setup

1. Open `manifest.yaml` and replace the placeholder webhook URLs with your public URL, for example `https://your-domain.com/api/webhooks/slack`.
2. Go to [api.slack.com/apps](https://api.slack.com/apps) and choose **Create New App** → **From app manifest**.
3. Paste the contents of `manifest.yaml`, review the generated app config, and create the app.
4. Install the app to your workspace.
5. Copy the **Bot User OAuth Token** (`xoxb-...`) and the **Signing Secret** into your local `.env`.

The manifest already includes the required scopes, event subscriptions, interactivity settings, and app home configuration.

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `SLACK_BOT_TOKEN` | Bot User OAuth Token (`xoxb-...`) |
| `SLACK_SIGNING_SECRET` | Found in Basic Information → Signing Secret |
| `OPENAI_API_KEY` | From [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |

## Development

```bash
# Install dependencies
bun install

# Run in development mode (with watch mode)
bun run dev

# Build for production
bun run build

# Run production build
bun run start
```

## Architecture

```
src/
├── index.ts          # Hono server, Slack webhook route, bot startup
├── agent.ts          # AI agent: streamText + OpenAI + tools
├── tools/
│   ├── weather.ts    # Weather tool (Open-Meteo API, no key needed)
│   └── calculator.ts # Math expression evaluator
└── blocks.ts         # BlockKit JSX components for rich Slack messages
```

### How It Works

1. User @mentions the bot or sends a DM
2. Chat SDK routes channel mentions, DMs, and assistant thread messages into the bot handlers
3. Thread message history is collected as `CoreMessage[]`
4. `streamText()` calls OpenAI with tools
5. The `fullStream` (AsyncIterable) is passed to `thread.post()` for live streaming
6. Assistant lifecycle hooks set suggested prompts and status for Slack Assistant threads
7. Follow-up messages in subscribed threads trigger `onSubscribedMessage` with full context

### Key Integration

The core integration is passing AI SDK's `result.fullStream` directly to Chat SDK's `thread.post()`:

```typescript
const result = streamText({ model, messages, tools });
await thread.post(result.fullStream); // Streams to Slack in real-time
```

Chat SDK handles the Slack-specific streaming protocol (post-then-edit with throttled updates).

## Tools

| Tool | Description | API |
|---|---|---|
| `weather` | Current weather for any city | [Open-Meteo](https://open-meteo.com) (free, no key) |
| `calculator` | Evaluate math expressions | Built-in (JavaScript) |

## License

MIT
