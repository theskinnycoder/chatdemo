/** @jsxImportSource chat */
import { Actions, Button, Card, CardText } from "chat";

export function FollowUpCard({ queries }: { queries: string[] }) {
  return (
    <Card>
      <CardText>:sparkles: *Follow-up questions*</CardText>
      {queries.map((query, i) => (
        <Actions key={i}>
          <Button id={`analyst-followup-${i}`} value={query}>
            {query.length > 72 ? query.slice(0, 72) + "..." : query}
          </Button>
        </Actions>
      ))}
    </Card>
  );
}
