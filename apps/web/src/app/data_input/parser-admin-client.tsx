"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";

import MarketingHeader from "@/components/marketing/marketing-header";
import {
  createSourceDocumentInputSchema,
  parsedJobDetailSchema,
  parserCommitResponseSchema,
  queuedSourceDocumentSchema,
  type ParsedJobDetail,
  type ProcessingJobStatus,
  type QueuedSourceDocument,
} from "@/lib/source-documents";

const sectionTitleSx = {
  color: "secondary.700",
  fontSize: "1rem",
  fontWeight: 850,
  letterSpacing: "-0.01em",
} as const;

const mutedTextSx = {
  color: "text.secondary",
  fontSize: "0.9rem",
  lineHeight: 1.5,
} as const;

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "background.paper",
    borderRadius: 2,
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "rgba(83,132,180,0.24)",
  },
  "& .MuiInputBase-input": {
    fontSize: "0.92rem",
  },
  "& .MuiInputLabel-root": {
    fontSize: "0.9rem",
  },
} as const;

function panelSx(extra = {}) {
  return {
    borderRadius: 3,
    border: "1px solid rgba(83,132,180,0.12)",
    bgcolor: "rgba(255,255,255,0.88)",
    boxShadow: "0 16px 40px rgba(28,48,146,0.06)",
    ...extra,
  };
}

export default function ParserAdminClient() {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [attribution, setAttribution] = useState("");
  const [notes, setNotes] = useState("");
  const [links, setLinks] = useState<QueuedSourceDocument[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ParsedJobDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingLinks, setIsLoadingLinks] = useState(true);
  const [isRefreshingLinks, setIsRefreshingLinks] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  const draftPayload = createSourceDocumentInputSchema.safeParse({
    title,
    sourceUrl: url,
    attribution,
    notes: notes || undefined,
  });
  const canAdd = draftPayload.success && !isSubmitting;
  const activeJobs = links.filter((link) =>
    ["queued", "fetching", "parsing"].includes(link.status),
  ).length;
  const completedJobs = links.filter((link) => link.status === "completed").length;

  const groupedRecords = useMemo(() => {
    const groups = new Map<string, ParsedJobDetail["records"]>();
    for (const record of selectedDetail?.records ?? []) {
      const rows = groups.get(record.recordType) ?? [];
      rows.push(record);
      groups.set(record.recordType, rows);
    }
    return Array.from(groups.entries());
  }, [selectedDetail]);

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
        throw new Error(errorBody.detail ?? "Unable to load parser jobs right now.");
      }
      setLinks(queuedSourceDocumentSchema.array().parse(await response.json()));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load parser jobs right now.",
      );
    } finally {
      if (isBackgroundRefresh) {
        setIsRefreshingLinks(false);
      } else {
        setIsLoadingLinks(false);
      }
    }
  }, []);

  const loadJobDetail = useCallback(async (jobId: string) => {
    setIsLoadingDetail(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/queue-source?jobId=${encodeURIComponent(jobId)}`, {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        const errorBody = (await response.json()) as { detail?: string };
        throw new Error(errorBody.detail ?? "Unable to load parsed records.");
      }
      setSelectedDetail(parsedJobDetailSchema.parse(await response.json()));
      setSelectedJobId(jobId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load parsed records.",
      );
    } finally {
      setIsLoadingDetail(false);
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
      if (document.visibilityState === "visible") {
        void loadQueuedLinks({ background: true });
      }
    }, 3000);

    return () => window.clearInterval(pollingTimer);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: parsedPayload.data.title,
          sourceUrl: parsedPayload.data.sourceUrl,
          attribution: parsedPayload.data.attribution,
          notes: parsedPayload.data.notes,
        }),
      });
      if (!response.ok) {
        const errorBody = (await response.json()) as { detail?: string };
        throw new Error(errorBody.detail ?? "The backend did not accept the source.");
      }
      const queued = queuedSourceDocumentSchema.parse(await response.json());
      await loadQueuedLinks();
      setTitle("");
      setUrl("");
      setAttribution("");
      setNotes("");
      setSuccessMessage("PDF source queued successfully.");
      setSelectedJobId(queued.id);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to queue the source right now.",
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
      if (selectedJobId === jobId) {
        setSelectedJobId(null);
        setSelectedDetail(null);
      }
      await loadQueuedLinks();
      setSuccessMessage("Queued source deleted.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to delete queued source.",
      );
    } finally {
      setDeletingJobId(null);
    }
  }

  async function handleCommit(jobId: string) {
    setIsCommitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await fetch(
        `/api/queue-source?jobId=${encodeURIComponent(jobId)}&action=commit`,
        { method: "POST" },
      );
      if (!response.ok) {
        const errorBody = (await response.json()) as { detail?: string };
        throw new Error(errorBody.detail ?? "Unable to commit parsed records.");
      }
      const result = parserCommitResponseSchema.parse(await response.json());
      setSuccessMessage(
        `Committed ${result.recordsCommitted} parsed records and accepted ${result.factsAccepted} facts.`,
      );
      await loadJobDetail(jobId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to commit parsed records.",
      );
    } finally {
      setIsCommitting(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f4f7fb",
        backgroundImage:
          "radial-gradient(circle at top left, rgba(83,132,180,0.14), transparent 34rem)",
      }}
    >
      <MarketingHeader />
      <Stack
        component="main"
        spacing={3}
        sx={{ maxWidth: 1180, mx: "auto", px: { xs: 2, md: 4 }, py: { xs: 3, md: 4 } }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "flex-end" }}
          spacing={2}
        >
          <Stack spacing={1} sx={{ maxWidth: 720 }}>
            <Chip
              label="Admin parser workspace"
              size="small"
              sx={{
                width: "fit-content",
                bgcolor: "secondary.100",
                color: "secondary.700",
                fontWeight: 700,
              }}
            />
            <Typography
              component="h1"
              sx={{
                color: "secondary.700",
                fontSize: { xs: "2rem", md: "2.85rem" },
                fontWeight: 850,
                letterSpacing: "-0.04em",
                lineHeight: 1.05,
              }}
            >
              PDF Parser Admin
            </Typography>
            <Typography
              sx={{
                color: "text.secondary",
                fontSize: { xs: "0.98rem", md: "1.08rem" },
                lineHeight: 1.55,
              }}
            >
              Queue source PDFs, monitor extraction, review parsed records, and commit accepted data to Supabase.
            </Typography>
          </Stack>
          <Button
            variant="contained"
            onClick={() => void loadQueuedLinks({ background: true })}
            disabled={isRefreshingLinks}
            sx={{
              borderRadius: 999,
              px: 2.5,
              bgcolor: "secondary.700",
              boxShadow: "none",
              "&:hover": { bgcolor: "secondary.600", boxShadow: "none" },
            }}
          >
            Refresh Queue
          </Button>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <SummaryCard label="Active jobs" value={activeJobs} />
          <SummaryCard label="Completed jobs" value={completedJobs} />
          <SummaryCard label="Parsed records" value={selectedDetail?.records.length ?? 0} />
        </Stack>

        {errorMessage ? <Alert severity="warning">{errorMessage}</Alert> : null}
        {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

        <Stack direction={{ xs: "column", lg: "row" }} spacing={3} alignItems="flex-start">
          <Card sx={panelSx({ width: { xs: 1, lg: 380 }, flexShrink: 0 })}>
            <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
              <Stack spacing={2}>
                <Typography sx={sectionTitleSx}>
                  Queue a PDF source
                </Typography>
                <TextField
                  label="Enter PDF Address"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://example.org/report.pdf"
                  fullWidth
                  size="small"
                  sx={fieldSx}
                />
                <TextField
                  label="Document Title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Example: Haib Copper PEA"
                  fullWidth
                  size="small"
                  sx={fieldSx}
                />
                <TextField
                  label="Attribution"
                  value={attribution}
                  onChange={(event) => setAttribution(event.target.value)}
                  placeholder="Example: Deep-South Resources public study"
                  fullWidth
                  size="small"
                  sx={fieldSx}
                />
                <TextField
                  label="Notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional review notes"
                  fullWidth
                  multiline
                  minRows={3}
                  sx={fieldSx}
                />
                <Button
                  variant="contained"
                  onClick={() => void handleAddLink()}
                  disabled={!canAdd}
                  sx={{
                    mt: 0.5,
                    minHeight: 44,
                    borderRadius: 2,
                    bgcolor: "primary.main",
                    fontWeight: 800,
                    boxShadow: "none",
                    "&:hover": { bgcolor: "primary.400", boxShadow: "none" },
                  }}
                >
                  {isSubmitting ? <CircularProgress color="inherit" size={22} /> : "Parse PDF"}
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={panelSx({ flex: 1, width: 1, minWidth: 0 })}>
            <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography sx={sectionTitleSx}>
                    Parser queue
                  </Typography>
                  {isRefreshingLinks ? <Chip label="Refreshing" size="small" /> : null}
                </Stack>
                {isLoadingLinks ? (
                  <Typography sx={mutedTextSx}>Loading parser jobs...</Typography>
                ) : links.length === 0 ? (
                  <Typography sx={mutedTextSx}>No queued PDF sources yet.</Typography>
                ) : (
                  <List disablePadding sx={{ display: "grid", gap: 1.25 }}>
                    {links.map((link) => (
                      <ListItem
                        key={link.id}
                        sx={{
                          gap: 2,
                          alignItems: "flex-start",
                          border: "1px solid rgba(83,132,180,0.14)",
                          borderRadius: 2.5,
                          bgcolor: "rgba(255,255,255,0.72)",
                          px: 2,
                          py: 1.5,
                        }}
                      >
                        <ListItemText
                          primary={link.title}
                          secondary={`${link.sourceUrl} | ${link.attribution}`}
                          primaryTypographyProps={{
                            sx: {
                              color: "text.primary",
                              fontSize: "1rem",
                              fontWeight: 800,
                              lineHeight: 1.25,
                            },
                          }}
                          secondaryTypographyProps={{
                            sx: {
                              mt: 0.45,
                              color: "text.secondary",
                              fontSize: "0.82rem",
                              lineHeight: 1.4,
                              overflowWrap: "anywhere",
                            },
                          }}
                        />
                        <Stack alignItems="flex-end" spacing={0.75}>
                          <Chip color={getStatusColor(link.status)} label={getStatusLabel(link.status)} size="small" />
                          <Button size="small" disabled={link.status !== "completed"} onClick={() => void loadJobDetail(link.id)}>
                            Review
                          </Button>
                          {canDeleteJob(link.status) ? (
                            <IconButton aria-label={`Delete ${link.title}`} disabled={deletingJobId === link.id} onClick={() => void handleDeleteLink(link.id)} size="small">
                              <DeleteOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                          ) : null}
                        </Stack>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Stack>

        <Card sx={panelSx()}>
          <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                <Box>
                  <Typography sx={sectionTitleSx}>
                    Parsed preview
                  </Typography>
                  <Typography sx={mutedTextSx}>
                    Review extracted records before committing them into current data tables.
                  </Typography>
                </Box>
                <Button variant="contained" disabled={!selectedJobId || isCommitting || !selectedDetail?.records.length} onClick={() => selectedJobId && void handleCommit(selectedJobId)}>
                  {isCommitting ? "Committing..." : "Commit parsed data"}
                </Button>
              </Stack>
              {isLoadingDetail ? (
                <Typography sx={mutedTextSx}>Loading parsed records...</Typography>
              ) : groupedRecords.length === 0 ? (
                <Typography sx={mutedTextSx}>Select a completed parser job to preview extracted data.</Typography>
              ) : (
                groupedRecords.map(([recordType, records]) => (
                  <Stack key={recordType} spacing={1}>
                    <Divider />
                    <Typography sx={{ fontSize: "0.95rem", fontWeight: 800 }}>
                      {titleize(recordType)} ({records.length})
                    </Typography>
                    {records.slice(0, 5).map((record) => (
                      <Box key={record.id} component="pre" sx={{ m: 0, p: 1.5, borderRadius: 1, bgcolor: "action.hover", overflowX: "auto", fontSize: 12 }}>
                        {JSON.stringify(record.payload, null, 2)}
                      </Box>
                    ))}
                  </Stack>
                ))
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card sx={panelSx({ flex: 1 })}>
      <CardContent sx={{ p: 2.25 }}>
        <Typography sx={{ color: "text.secondary", fontSize: "0.84rem", fontWeight: 700 }}>
          {label}
        </Typography>
        <Typography
          sx={{
            mt: 0.5,
            color: "secondary.700",
            fontSize: "1.65rem",
            fontWeight: 850,
            lineHeight: 1,
          }}
        >
          {value}
        </Typography>
      </CardContent>
    </Card>
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

function titleize(value: string) {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
