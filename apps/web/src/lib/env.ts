import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const pdfWorkerUrlSchema = z.url();

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function getPublicEnv(): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

export function getSupabaseAnonKey(): string {
  return getPublicEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function getSupabaseUrl(): string {
  return getPublicEnv().NEXT_PUBLIC_SUPABASE_URL;
}

export function getPdfWorkerUrl() {
  return pdfWorkerUrlSchema.parse(
    process.env.NEXT_PUBLIC_PDF_WORKER_URL ?? "http://localhost:8000",
  );
}
