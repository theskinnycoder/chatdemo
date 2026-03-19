import { Card, CardText, Divider, Actions, Button, Fields, Field } from "chat";

/**
 * Welcome card shown when bot joins a conversation.
 */
export function welcomeCard() {
  return Card({
    title: "AI Assistant",
    children: [
      CardText("Hey there! I'm an AI assistant powered by Claude. I can help you with:"),
      Divider(),
      Fields([
        Field({ label: "Weather", value: "Ask about weather in any city" }),
        Field({ label: "Math", value: "Evaluate calculations" }),
        Field({ label: "General", value: "Ask me anything!" }),
      ]),
    ],
  });
}

/**
 * Rich card displaying a weather tool result.
 */
export function weatherCard(data: {
  city: string;
  temperature: string;
  condition: string;
  humidity: string;
  windSpeed: string;
}) {
  return Card({
    title: `Weather in ${data.city}`,
    children: [
      Fields([
        Field({ label: "Temperature", value: data.temperature }),
        Field({ label: "Condition", value: data.condition }),
        Field({ label: "Humidity", value: data.humidity }),
        Field({ label: "Wind Speed", value: data.windSpeed }),
      ]),
    ],
  });
}

/**
 * Rich card displaying a calculator result.
 */
export function calculatorCard(data: { expression: string; result: number }) {
  return Card({
    title: "Calculator",
    children: [CardText(`\`${data.expression}\` = *${String(data.result)}*`)],
  });
}

/**
 * Suggested action buttons for new conversations.
 */
export function suggestedActionsCard() {
  return Card({
    title: "Try one of these",
    children: [
      Actions([
        Button({ id: "weather-prompt", label: "What's the weather in Tokyo?" }),
        Button({ id: "calc-prompt", label: "What is 42 * 1337?" }),
        Button({ id: "help-prompt", label: "What can you do?" }),
      ]),
    ],
  });
}
