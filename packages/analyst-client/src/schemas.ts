import { z } from "zod/v4";

// === Shared sub-schemas ===

const OutputItemSchema = z.object({
	type: z.enum(["thinking", "message"]),
	id: z.string(),
	status: z.enum(["in_progress", "completed"]),
	role: z.literal("assistant"),
	content: z.array(z.any()),
});

const ReasoningPartSchema = z.object({
	type: z.literal("reasoning"),
	title: z.string(),
	text: z.string(),
});

const OutputTextPartSchema = z.object({
	type: z.literal("output_text"),
	text: z.string(),
	annotations: z.array(z.any()).optional(),
});

const ContentPartSchema = z.union([ReasoningPartSchema, OutputTextPartSchema]);

// === 13 Event Schemas (discriminated by "type" field in data payload) ===

export const ResponseProtocolSchema = z.object({
	type: z.literal("response.protocol"),
	version: z.string(),
	protocol: z.literal("streaming"),
});

export const ResponseCreatedSchema = z.object({
	type: z.literal("response.created"),
	response: z.object({
		id: z.string(),
		created_at: z.number(),
		status: z.enum(["in_progress", "completed", "failed"]),
		error: z.any().nullable(),
		output: z.array(z.any()),
		session_id: z.string(),
	}),
});

export const OutputItemAddedSchema = z.object({
	type: z.literal("response.output_item.added"),
	output_index: z.number(),
	item: OutputItemSchema,
});

export const ContentPartAddedSchema = z.object({
	type: z.literal("response.content_part.added"),
	item_id: z.string(),
	output_index: z.number(),
	content_index: z.number(),
	part: ContentPartSchema,
});

export const ReasoningReplaceSchema = z.object({
	type: z.literal("response.reasoning.replace"),
	item_id: z.string(),
	output_index: z.number(),
	content_index: z.number(),
	text: z.string(),
});

export const ReasoningDeltaSchema = z.object({
	type: z.literal("response.reasoning.delta"),
	item_id: z.string(),
	output_index: z.number(),
	content_index: z.number(),
	delta: z.string(),
});

export const ReasoningDoneSchema = z.object({
	type: z.literal("response.reasoning.done"),
	item_id: z.string(),
	output_index: z.number(),
	content_index: z.number(),
	title: z.string(),
	text: z.string(),
});

export const OutputTextDeltaSchema = z.object({
	type: z.literal("response.output_text.delta"),
	item_id: z.string(),
	output_index: z.number(),
	content_index: z.number(),
	delta: z.string(),
});

export const OutputTextDoneSchema = z.object({
	type: z.literal("response.output_text.done"),
	item_id: z.string(),
	output_index: z.number(),
	content_index: z.number(),
	text: z.string(),
});

export const ContentPartDoneSchema = z.object({
	type: z.literal("response.content_part.done"),
	item_id: z.string(),
	output_index: z.number(),
	content_index: z.number(),
	part: ContentPartSchema,
});

export const OutputItemDoneSchema = z.object({
	type: z.literal("response.output_item.done"),
	output_index: z.number(),
	item: OutputItemSchema,
});

export const FollowUpQueriesSchema = z.object({
	type: z.literal("response.follow_up_queries_event"),
	follow_up_queries: z.array(z.string()),
});

export const ResponseCompletedSchema = z.object({
	type: z.literal("response.completed"),
	response: z.object({
		id: z.string(),
		created_at: z.number(),
		status: z.enum(["completed", "failed"]),
		error: z.any().nullable(),
		output: z.array(z.any()),
		session_id: z.string(),
		checkpoint_id: z.string().optional(),
	}),
});

// === Master discriminated union ===

export const AnalystEventSchema = z.discriminatedUnion("type", [
	ResponseProtocolSchema,
	ResponseCreatedSchema,
	OutputItemAddedSchema,
	ContentPartAddedSchema,
	ReasoningReplaceSchema,
	ReasoningDeltaSchema,
	ReasoningDoneSchema,
	OutputTextDeltaSchema,
	OutputTextDoneSchema,
	ContentPartDoneSchema,
	OutputItemDoneSchema,
	FollowUpQueriesSchema,
	ResponseCompletedSchema,
]);
