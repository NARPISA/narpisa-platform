import { NextResponse } from "next/server";

import { getPdfWorkerUrl } from "@/lib/env";
import { createSourceDocumentInputSchema } from "@/lib/source-documents";
import { createClient } from "@/lib/supabase/server";

type BackendQueuedSourceDocument = {
  id: string;
  document_id: string;
  title: string;
  source_url: string;
  source_domain: string;
  attribution: string;
  notes?: string | null;
  mime_type?: string;
  status: string;
  content_hash?: string | null;
  page_count?: number | null;
  source_http_status?: number | null;
  error_message?: string | null;
  queued_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  updated_at?: string | null;
};

type BackendParsedRecord = {
  id: string;
  document_id: number;
  job_id?: string | null;
  record_type: string;
  payload: Record<string, unknown>;
  created_at?: string | null;
};

type BackendParsedJobDetail = {
  job: BackendQueuedSourceDocument;
  records: BackendParsedRecord[];
};

type BackendCommitResponse = {
  job_id: string;
  records_committed: number;
  facts_accepted: number;
};

async function getAdminAccessToken() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { error: "Authentication required.", status: 401 as const };
  }

  const { data: isAdmin, error } = await supabase.rpc("is_admin_user");
  if (error || !isAdmin) {
    return { error: "Admin access required.", status: 403 as const };
  }

  return { accessToken: session.access_token, status: 200 as const };
}

async function forwardQueueRequest(init?: RequestInit, path = "") {
  const token = await getAdminAccessToken();
  if ("error" in token) {
    return NextResponse.json({ detail: token.error }, { status: token.status });
  }

  try {
    const pdfWorkerUrl = getPdfWorkerUrl();
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token.accessToken}`);
    const backendResponse = await fetch(`${pdfWorkerUrl}/api/v1/queue-source${path}`, {
      cache: "no-store",
      ...init,
      headers,
    });

    if (backendResponse.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const responseBody = normalizeQueueResponse(await backendResponse.json());

    return NextResponse.json(responseBody, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      {
        detail: "Unable to reach the PDF worker. Check that the backend is running.",
      },
      { status: 502 },
    );
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId");
  if (jobId) {
    return forwardQueueRequest(undefined, `/${jobId}`);
  }
  return forwardQueueRequest();
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json(
      {
        detail: "Missing queued job id.",
      },
      { status: 400 },
    );
  }

  return forwardQueueRequest(
    {
      method: "DELETE",
    },
    `/${jobId}`,
  );
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId");
  const action = url.searchParams.get("action");
  if (jobId && action === "commit") {
    return forwardQueueRequest({ method: "POST" }, `/${jobId}/commit`);
  }

  const requestBody = await request.json();
  const parsedPayload = createSourceDocumentInputSchema.safeParse(requestBody);

  if (!parsedPayload.success) {
    return NextResponse.json(
      {
        detail: "Enter a valid title, attribution, and http/https PDF URL.",
      },
      { status: 400 },
    );
  }

  return forwardQueueRequest({
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: parsedPayload.data.title,
      source_url: parsedPayload.data.sourceUrl,
      attribution: parsedPayload.data.attribution,
      notes: parsedPayload.data.notes,
    }),
  });
}

function normalizeQueueResponse(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeQueuedDocument(item as BackendQueuedSourceDocument));
  }

  if (isParsedJobDetail(payload)) {
    return {
      job: normalizeQueuedDocument(payload.job),
      records: payload.records.map(normalizeParsedRecord),
    };
  }

  if (isCommitResponse(payload)) {
    return {
      jobId: payload.job_id,
      recordsCommitted: payload.records_committed,
      factsAccepted: payload.facts_accepted,
    };
  }

  if (isQueuedDocument(payload)) {
    return normalizeQueuedDocument(payload);
  }

  return payload;
}

function normalizeParsedRecord(payload: BackendParsedRecord) {
  return {
    id: payload.id,
    documentId: payload.document_id,
    jobId: payload.job_id ?? null,
    recordType: payload.record_type,
    payload: payload.payload,
    createdAt: payload.created_at ?? null,
  };
}

function normalizeQueuedDocument(payload: BackendQueuedSourceDocument) {
  return {
    id: payload.id,
    documentId: payload.document_id,
    title: payload.title,
    sourceUrl: payload.source_url,
    sourceDomain: payload.source_domain,
    attribution: payload.attribution,
    notes: payload.notes ?? null,
    mimeType: payload.mime_type ?? "application/pdf",
    status: payload.status,
    contentHash: payload.content_hash ?? null,
    pageCount: payload.page_count ?? null,
    sourceHttpStatus: payload.source_http_status ?? null,
    errorMessage: payload.error_message ?? null,
    queuedAt: payload.queued_at,
    startedAt: payload.started_at ?? null,
    completedAt: payload.completed_at ?? null,
    updatedAt: payload.updated_at ?? null,
  };
}

function isQueuedDocument(payload: unknown): payload is BackendQueuedSourceDocument {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "id" in payload &&
    "document_id" in payload &&
    "source_url" in payload
  );
}

function isParsedJobDetail(payload: unknown): payload is BackendParsedJobDetail {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "job" in payload &&
    "records" in payload &&
    Array.isArray((payload as { records?: unknown }).records)
  );
}

function isCommitResponse(payload: unknown): payload is BackendCommitResponse {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "job_id" in payload &&
    "records_committed" in payload
  );
}
