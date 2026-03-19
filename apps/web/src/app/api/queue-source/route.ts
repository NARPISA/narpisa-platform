import { NextResponse } from "next/server";

import { getPdfWorkerUrl } from "@/lib/env";
import { createSourceDocumentInputSchema } from "@/lib/source-documents";

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

async function forwardQueueRequest(init?: RequestInit, path = "") {
  try {
    const pdfWorkerUrl = getPdfWorkerUrl();
    const backendResponse = await fetch(`${pdfWorkerUrl}/api/v1/queue-source${path}`, {
      cache: "no-store",
      ...init,
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

export async function GET() {
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

  if (isQueuedDocument(payload)) {
    return normalizeQueuedDocument(payload);
  }

  return payload;
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
