import { NextResponse } from "next/server";

import { getPdfWorkerUrl } from "@/lib/env";
import { createSourceDocumentInputSchema } from "@/lib/source-documents";

async function forwardQueueRequest(init?: RequestInit) {
  try {
    const pdfWorkerUrl = getPdfWorkerUrl();
    const backendResponse = await fetch(`${pdfWorkerUrl}/api/v1/queue-source`, {
      cache: "no-store",
      ...init,
    });

    const responseBody = (await backendResponse.json()) as unknown;

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
