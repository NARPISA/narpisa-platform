"use client";

import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";

type SavedLink = {
  id: number;
  title: string;
  url: string;
};

export default function DataInputPage() {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [links, setLinks] = useState<SavedLink[]>([]);

  const isValidUrl = useMemo(() => {
    if (!url) {
      return false;
    }

    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, [url]);

  const canAdd = title.trim().length > 0 && isValidUrl;

  function handleAddLink() {
    if (!canAdd) {
      return;
    }

    setLinks((currentLinks) => [
      {
        id: Date.now(),
        title: title.trim(),
        url: url.trim(),
      },
      ...currentLinks,
    ]);
    setTitle("");
    setUrl("");
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
          <Box>
            <Button onClick={handleAddLink} disabled={!canAdd} variant="contained">
              Add test link
            </Button>
          </Box>
        </Stack>

        {!url || isValidUrl ? null : (
          <Alert severity="warning">
            Enter a valid `http` or `https` URL before adding the link.
          </Alert>
        )}

        <Box>
          <Typography variant="h6" gutterBottom>
            Added links
          </Typography>
          {links.length === 0 ? (
            <Typography color="text.secondary">
              No test links added yet.
            </Typography>
          ) : (
            <List disablePadding>
              {links.map((link) => (
                <ListItem key={link.id} disableGutters divider>
                  <ListItemText primary={link.title} secondary={link.url} />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Stack>
    </Container>
  );
}
