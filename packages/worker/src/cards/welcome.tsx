/** @jsxImportSource chat */
import { Card, CardText, Divider, Fields, Field, Actions, Button } from "chat";

export function WelcomeCard() {
  return (
    <Card title="Maaya — Database Analyst">
      <CardText>
        Hi! I'm Maaya, your AI database analyst. Ask me anything about your
        SingleStore databases, tables, schemas, and data.
      </CardText>
      <Divider />
      <Fields>
        <Field label="Tables" value="Explore database tables and schemas" />
        <Field label="Queries" value="Ask questions about your data" />
        <Field label="Analysis" value="Get insights and summaries" />
      </Fields>
    </Card>
  );
}

export function SuggestedPromptsCard() {
  return (
    <Card title="Try one of these">
      <Actions>
        <Button
          id="analyst-followup-0"
          value="What tables are in the database?"
        >
          What tables are in the database?
        </Button>
        <Button
          id="analyst-followup-1"
          value="Show me the schema of the commit table"
        >
          Show me table schemas
        </Button>
        <Button id="analyst-followup-2" value="What can you help me with?">
          What can you do?
        </Button>
      </Actions>
    </Card>
  );
}
