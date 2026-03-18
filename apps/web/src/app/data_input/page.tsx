"use client";

import { useCallback, useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import CircularProgress from "@mui/material/CircularProgress";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";

import { createSourceDocumentInputSchema } from "@/lib/source-documents";
type SavedLink = {
  id: string;
  title: string;
  url: string;
  attribution: string;
};

type QueuedLinkResponse = {
  id: string;
  title: string;
  source_url: string;
  attribution: string;
};

export default function DataInputPage() {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [attribution, setAttribution] = useState("");
  const [links, setLinks] = useState<SavedLink[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingLinks, setIsLoadingLinks] = useState(true);

  const draftPayload = createSourceDocumentInputSchema.safeParse({
    title,
    sourceUrl: url,
    attribution,
  });
  const canAdd = draftPayload.success && !isSubmitting;

  const loadQueuedLinks = useCallback(async () => {
    setIsLoadingLinks(true);

    try {
      const response = await fetch("/api/queue-source", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        const errorBody = (await response.json()) as { detail?: string };
        throw new Error(
          errorBody.detail ?? "Unable to load queued source links right now.",
        );
      }

      const queuedLinks = (await response.json()) as QueuedLinkResponse[];
      setLinks(
        queuedLinks.map((queuedLink) => ({
          id: queuedLink.id,
          title: queuedLink.title,
          url: queuedLink.source_url,
          attribution: queuedLink.attribution,
        })),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load queued source links right now.",
      );
    } finally {
      setIsLoadingLinks(false);
    }
  }, []);

  useEffect(() => {
    void loadQueuedLinks();
  }, [loadQueuedLinks]);

  async function handleAddLink() {
    const parsedPayload = draftPayload;

    if (!parsedPayload.success) {
      setSuccessMessage(null);
      setErrorMessage("Enter a valid title, attribution, and http/https PDF URL.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/queue-source", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: parsedPayload.data.title,
          sourceUrl: parsedPayload.data.sourceUrl,
          attribution: parsedPayload.data.attribution,
          notes: parsedPayload.data.notes,
        }),
      });

      if (!response.ok) {
        const errorBody = (await response.json()) as { detail?: string };
        throw new Error(
          errorBody.detail ?? "The backend did not accept the queued source.",
        );
      }

      const queuedLink = (await response.json()) as {
        id: string;
        title: string;
        source_url: string;
        attribution: string;
      };

      await loadQueuedLinks();
      setTitle("");
      setUrl("");
      setAttribution("");
      setSuccessMessage("Source link queued successfully.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to queue the source link right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Stack spacing={3}>
        <Box>
          <Link href="/">
            <Button variant="text">Back to home</Button>
          </Link>
        </Box>

        <Box>
          <Typography component="h1" variant="h4" gutterBottom>
            PDF link testing page
          </Typography>
          <Typography color="text.secondary">
            This page is a simple local playground for trying source-link input
            before connecting the full ingestion workflow.
          </Typography>
        </Box>

        <Stack spacing={2}>
          <TextField
            label="Document title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Example: Haib Copper PEA"
            fullWidth
          />
          <TextField
            label="PDF source URL"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.org/report.pdf"
            fullWidth
          />
          <TextField
            label="Attribution"
            value={attribution}
            onChange={(event) => setAttribution(event.target.value)}
            placeholder="Example: Deep-South Resources public study"
            fullWidth
          />
          <Box>
            <Button onClick={handleAddLink} disabled={!canAdd} variant="contained">
              {isSubmitting ? <CircularProgress color="inherit" size={20} /> : "Queue source link"}
            </Button>
          </Box>
        </Stack>

        {errorMessage ? <Alert severity="warning">{errorMessage}</Alert> : null}
        {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

        <Box>
          <Typography variant="h6" gutterBottom>
            Queued links
          </Typography>
          {isLoadingLinks ? (
            <Typography color="text.secondary">Loading queued links...</Typography>
          ) : links.length === 0 ? (
            <Typography color="text.secondary">
              No queued links yet.
            </Typography>
          ) : (
            <List disablePadding>
              {links.map((link) => (
                <ListItem key={link.id} disableGutters divider>
                  <ListItemText
                    primary={link.title}
                    secondary={`${link.url} | ${link.attribution}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Stack>
    </Container>
  );
}
