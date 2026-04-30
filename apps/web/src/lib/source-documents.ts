import { z } from "zod";

export const processingJobStatusSchema = z.enum([
  "queued",
  "fetching",
  "parsing",
  "completed",
  "failed",
]);

export const sourceDocumentSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  sourceUrl: z.url(),
  sourceDomain: z.string(),
  mimeType: z.string().default("application/pdf"),
  status: processingJobStatusSchema,
  attribution: z.string(),
  contentHash: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createSourceDocumentInputSchema = z.object({
  title: z.string().min(3).max(160),
  sourceUrl: z.url(),
  attribution: z.string().min(3).max(240),
  notes: z.string().max(500).optional(),
});

export const queuedSourceDocumentSchema = z.object({
  id: z.string().uuid(),
  documentId: z.union([z.string(), z.number().int()]),
  title: z.string(),
  sourceUrl: z.url(),
  sourceDomain: z.string(),
  attribution: z.string(),
  notes: z.string().nullable().optional(),
  mimeType: z.string(),
  status: processingJobStatusSchema,
  contentHash: z.string().nullable(),
  pageCount: z.number().int().nullable(),
  sourceHttpStatus: z.number().int().nullable(),
  errorMessage: z.string().nullable(),
  queuedAt: z.string(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const parsedRecordSchema = z.object({
  id: z.string().uuid(),
  documentId: z.number().int(),
  jobId: z.string().uuid().nullable(),
  recordType: z.string(),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.string().nullable(),
});

export const parsedJobDetailSchema = z.object({
  job: queuedSourceDocumentSchema,
  records: parsedRecordSchema.array(),
});

export const parserCommitResponseSchema = z.object({
  jobId: z.string().uuid(),
  recordsCommitted: z.number().int(),
  factsAccepted: z.number().int(),
});

export type ProcessingJobStatus = z.infer<typeof processingJobStatusSchema>;
export type SourceDocument = z.infer<typeof sourceDocumentSchema>;
export type CreateSourceDocumentInput = z.infer<
  typeof createSourceDocumentInputSchema
>;
export type QueuedSourceDocument = z.infer<typeof queuedSourceDocumentSchema>;
export type ParsedRecord = z.infer<typeof parsedRecordSchema>;
export type ParsedJobDetail = z.infer<typeof parsedJobDetailSchema>;
export type ParserCommitResponse = z.infer<typeof parserCommitResponseSchema>;
