"use client";

import { useCallback, useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";

import GlassButton from "@/components/glass-button";
import MarketingHeader from "@/components/marketing/marketing-header";
import NarpisaTextField from "@/components/text-field";
import {
  createSourceDocumentInputSchema,
  queuedSourceDocumentSchema,
  type ProcessingJobStatus,
  type QueuedSourceDocument,
} from "@/lib/source-documents";

export default function DataInputPage() {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [attribution, setAttribution] = useState("");
  const [links, setLinks] = useState<QueuedSourceDocument[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingLinks, setIsLoadingLinks] = useState(true);
  const [isRefreshingLinks, setIsRefreshingLinks] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  const draftPayload = createSourceDocumentInputSchema.safeParse({
    title,
    sourceUrl: url,
    attribution,
  });
  const canAdd = draftPayload.success && !isSubmitting;

  const loadQueuedLinks = useCallback(async (options?: { background?: boolean }) => {
    const isBackgroundRefresh = options?.background ?? false;

    if (isBackgroundRefresh) {
      setIsRefreshingLinks(true);
    } else {
      setIsLoadingLinks(true);
    }

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

      const queuedLinks = queuedSourceDocumentSchema
        .array()
        .parse(await response.json());
      setLinks(queuedLinks);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load queued source links right now.",
      );
    } finally {
      if (isBackgroundRefresh) {
        setIsRefreshingLinks(false);
      } else {
        setIsLoadingLinks(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadQueuedLinks();
  }, [loadQueuedLinks]);

  useEffect(() => {
    const hasActiveJobs = links.some((link) =>
      ["queued", "fetching", "parsing"].includes(link.status),
    );
    if (!hasActiveJobs) {
      return undefined;
    }

    const pollingTimer = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void loadQueuedLinks({ background: true });
    }, 3000);

    return () => {
      window.clearInterval(pollingTimer);
    };
  }, [links, loadQueuedLinks]);

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

      queuedSourceDocumentSchema.parse(await response.json());

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

  async function handleDeleteLink(jobId: string) {
    setDeletingJobId(jobId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/queue-source?jobId=${encodeURIComponent(jobId)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorBody = (await response.json()) as { detail?: string };
        throw new Error(errorBody.detail ?? "Unable to delete queued source.");
      }

      await loadQueuedLinks();
      setSuccessMessage("Queued source deleted.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete queued source right now.",
      );
    } finally {
      setDeletingJobId(null);
    }
  }

  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        overflowX: "hidden",
      }}
    >
      <MarketingHeader />

      <Stack
        spacing={3}
        sx={{
          px: 3,
          pt: { xs: 7, sm: 8 },
          pb: 5,
          maxWidth: "48rem",
          mx: "auto",
          width: 1,
        }}
      >
        <Typography component="h1" variant="h4" color="secondary" align="center">
          Enter Data
        </Typography>

        <Stack spacing={2} sx={{ width: 1 }}>
          <NarpisaTextField
            fieldWidth="long"
            label="Enter PDF Address"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.org/report.pdf"
            formControlSx={{ maxWidth: "none" }}
          />
          <NarpisaTextField
            fieldWidth="long"
            label="Document Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Example: Haib Copper PEA"
            formControlSx={{ maxWidth: "none" }}
          />
          <NarpisaTextField
            fieldWidth="long"
            label="Attribution"
            value={attribution}
            onChange={(event) => setAttribution(event.target.value)}
            placeholder="Example: Deep-South Resources public study"
            formControlSx={{ maxWidth: "none" }}
          />

          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <GlassButton onClick={() => void handleAddLink()} disabled={!canAdd}>
              {isSubmitting ? (
                <CircularProgress color="inherit" size={24} />
              ) : (
                "Parse"
              )}
            </GlassButton>
          </Box>
        </Stack>

        {errorMessage ? <Alert severity="warning">{errorMessage}</Alert> : null}
        {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

        <Stack spacing={1.5} sx={{ width: 1 }}>
          <Typography variant="h6" color="secondary">
            Queued links
          </Typography>
          {isRefreshingLinks ? (
            <Typography variant="style" color="text.secondary">
              Refreshing queue status...
            </Typography>
          ) : null}
          {isLoadingLinks ? (
            <Typography variant="style" color="text.secondary">
              Loading queued links...
            </Typography>
          ) : links.length === 0 ? (
            <Typography variant="style" color="text.secondary">
              No queued links yet.
            </Typography>
          ) : (
            <List disablePadding>
              {links.map((link) => (
                <ListItem
                  key={link.id}
                  disableGutters
                  divider
                  sx={{ borderColor: "divider" }}
                >
                  <ListItemText
                    primary={link.title}
                    secondary={`${link.sourceUrl} | ${link.attribution}`}
                  />
                  <Stack alignItems="flex-end" spacing={1}>
                    <Chip
                      color={getStatusColor(link.status)}
                      label={getStatusLabel(link.status)}
                      size="small"
                    />
                    {link.status === "fetching" || link.status === "parsing" ? (
                      <CircularProgress size={18} />
                    ) : null}
                    {canDeleteJob(link.status) ? (
                      <IconButton
                        aria-label={`Delete ${link.title}`}
                        disabled={deletingJobId === link.id}
                        onClick={() => void handleDeleteLink(link.id)}
                        size="small"
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    ) : null}
                    {link.errorMessage ? (
                      <Typography color="error" variant="style">
                        {link.errorMessage}
                      </Typography>
                    ) : null}
                  </Stack>
                </ListItem>
              ))}
            </List>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

function getStatusColor(status: ProcessingJobStatus) {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "error";
    case "fetching":
    case "parsing":
      return "warning";
    default:
      return "default";
  }
}

function getStatusLabel(status: ProcessingJobStatus) {
  switch (status) {
    case "queued":
      return "Queued";
    case "fetching":
      return "Fetching PDF";
    case "parsing":
      return "Parsing PDF";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
  }
}

function canDeleteJob(status: ProcessingJobStatus) {
  return status === "queued" || status === "completed" || status === "failed";
}
