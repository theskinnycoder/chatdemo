import { bot } from "@maaya/worker";
import { Hono } from "hono";

const app = new Hono();
const port = Number(Bun.env.PORT ?? 3000);

app.get("/", (c) => c.text("Maaya is running"));

app.post("/api/webhooks/slack", async (c) => {
	return bot.webhooks.slack(c.req.raw);
});

app.notFound((c) => c.text("Not Found", 404));

app.onError((error, c) => {
	console.error("Slack webhook error", error);
	return c.text("Internal Server Error", 500);
});

console.log(`Maaya running on http://localhost:${port}`);
console.log(`Webhook: http://localhost:${port}/api/webhooks/slack`);

export default { port, fetch: app.fetch };
