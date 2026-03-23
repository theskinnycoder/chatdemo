import type { z } from "zod/v4";
import type {
	AnalystEventSchema,
	ContentPartAddedSchema,
	ContentPartDoneSchema,
	FollowUpQueriesSchema,
	OutputItemAddedSchema,
	OutputItemDoneSchema,
	OutputTextDeltaSchema,
	OutputTextDoneSchema,
	ReasoningDeltaSchema,
	ReasoningDoneSchema,
	ReasoningReplaceSchema,
	ResponseCompletedSchema,
	ResponseCreatedSchema,
	ResponseProtocolSchema,
} from "./schemas.js";

export type AnalystEvent = z.infer<typeof AnalystEventSchema>;

export type ResponseProtocol = z.infer<typeof ResponseProtocolSchema>;
export type ResponseCreated = z.infer<typeof ResponseCreatedSchema>;
export type OutputItemAdded = z.infer<typeof OutputItemAddedSchema>;
export type ContentPartAdded = z.infer<typeof ContentPartAddedSchema>;
export type ReasoningReplace = z.infer<typeof ReasoningReplaceSchema>;
export type ReasoningDelta = z.infer<typeof ReasoningDeltaSchema>;
export type ReasoningDone = z.infer<typeof ReasoningDoneSchema>;
export type OutputTextDelta = z.infer<typeof OutputTextDeltaSchema>;
export type OutputTextDone = z.infer<typeof OutputTextDoneSchema>;
export type ContentPartDone = z.infer<typeof ContentPartDoneSchema>;
export type OutputItemDone = z.infer<typeof OutputItemDoneSchema>;
export type FollowUpQueries = z.infer<typeof FollowUpQueriesSchema>;
export type ResponseCompleted = z.infer<typeof ResponseCompletedSchema>;
