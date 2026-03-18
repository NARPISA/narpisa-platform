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

export type ProcessingJobStatus = z.infer<typeof processingJobStatusSchema>;
export type SourceDocument = z.infer<typeof sourceDocumentSchema>;
export type CreateSourceDocumentInput = z.infer<
  typeof createSourceDocumentInputSchema
>;
