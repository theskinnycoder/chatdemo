# chatdemo — AI Agent Slack Bot

A streaming AI-powered Slack bot built with [Chat SDK](https://chat-sdk.dev) and [Vercel AI SDK](https://ai-sdk.dev). Uses Claude Sonnet 4.5 with extended thinking, tool calling, and rich BlockKit messages.

## Features

- **Streaming responses** — AI responses stream into Slack in real-time
- **Extended thinking** — Claude reasons through complex questions before responding
- **Tool calling** — Weather lookups (Open-Meteo) and math calculations
- **Rich BlockKit UI** — Cards, fields, buttons, and suggested actions
- **Conversation context** — Maintains thread history for multi-turn conversations
- **Slack Assistant API** — Works in channels (@mentions) and DMs
- **In-memory state** — Thread subscriptions and state for development

## Prerequisites

- Node.js 18+
- pnpm
- A Slack workspace where you can create apps

## Slack App Setup

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and click **Create New App** → **From scratch**
2. Name your app and select your workspace

### Bot Token Scopes

Under **OAuth & Permissions**, add these Bot Token Scopes:

| Scope | Purpose |
|---|---|
| `app_mentions:read` | Receive @mention events |
| `assistant:write` | Assistant thread features |
| `chat:write` | Post messages |
| `im:history` | Read DM history |
| `im:read` | Receive DM events |
| `im:write` | Send DMs |

### Event Subscriptions

Under **Event Subscriptions**, enable events and subscribe to these Bot Events:

- `app_mention` — When someone @mentions the bot
- `assistant_thread_started` — When a user opens a DM thread
- `message.im` — Direct messages to the bot

Set the **Request URL** to your server's public URL (e.g. `https://your-server.com/api/events`).

### App Home

Under **App Home**, enable the **Messages Tab** so users can DM the bot.

### Install

Click **Install to Workspace** and copy the **Bot User OAuth Token** (`xoxb-...`).

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `SLACK_BOT_TOKEN` | Bot User OAuth Token (`xoxb-...`) |
| `SLACK_SIGNING_SECRET` | Found in Basic Information → Signing Secret |
| `ANTHROPIC_API_KEY` | From [console.anthropic.com](https://console.anthropic.com) |

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode (with hot reload)
pnpm dev

# Build for production
pnpm build

# Run production build
pnpm start
```

## Architecture

```
src/
├── index.ts          # Chat SDK setup, event handlers, bot startup
├── agent.ts          # AI agent: streamText + Claude + tools + thinking
├── tools/
│   ├── weather.ts    # Weather tool (Open-Meteo API, no key needed)
│   └── calculator.ts # Math expression evaluator
└── blocks.ts         # BlockKit JSX components for rich Slack messages
```

### How It Works

1. User @mentions the bot or sends a DM
2. Chat SDK's `onNewMention` handler fires, subscribes to the thread
3. Thread message history is collected as `CoreMessage[]`
4. `streamText()` calls Claude with tools and extended thinking
5. The `textStream` (AsyncIterable) is passed to `thread.post()` for live streaming
6. Follow-up messages in the thread trigger `onSubscribedMessage` with full context

### Key Integration

The magic is in passing AI SDK's `result.textStream` directly to Chat SDK's `thread.post()`:

```typescript
const result = streamText({ model, messages, tools });
await thread.post(result.textStream); // Streams to Slack in real-time
```

Chat SDK handles the Slack-specific streaming protocol (post-then-edit with throttled updates).

## Tools

| Tool | Description | API |
|---|---|---|
| `weather` | Current weather for any city | [Open-Meteo](https://open-meteo.com) (free, no key) |
| `calculator` | Evaluate math expressions | Built-in (JavaScript) |

## License

MIT
