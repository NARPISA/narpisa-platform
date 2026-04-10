"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";

const SCALE_KEYS = ["100", "200", "300", "400", "500", "600", "700", "main"] as const;

const BACKGROUND_KEYS = ["default", "paper", "main", ...SCALE_KEYS] as const;

function stringEntries(obj: object, keys: readonly string[]): { label: string; color: string }[] {
  const rec = obj as Record<string, unknown>;
  return keys
    .filter((k) => typeof rec[k] === "string")
    .map((k) => ({ label: k, color: rec[k] as string }));
}

function SwatchRow({ label, color }: { label: string; color: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 0.5 }}>
      <Box
        sx={{
          width: 48,
          height: 36,
          borderRadius: 1,
          bgcolor: color,
          border: 1,
          borderColor: "divider",
          flexShrink: 0,
        }}
      />
      <Typography component="span" sx={{ minWidth: 140, fontFamily: "monospace", fontSize: "0.8125rem" }}>
        {color}
      </Typography>
      <Typography color="text.secondary" sx={{ fontSize: "0.875rem" }}>
        {label}
      </Typography>
    </Stack>
  );
}

function ScaleSection({
  title,
  entries,
}: {
  title: string;
  entries: { label: string; color: string }[];
}) {
  return (
    <Card variant="outlined" sx={{ bgcolor: "background.paper" }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1, fontSize: "1.125rem" }}>
          {title}
        </Typography>
        <Stack divider={<Divider flexItem />}>
          {entries.map((e) => (
            <SwatchRow key={e.label} label={e.label} color={e.color} />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function TestThemeClient() {
  const theme = useTheme();
  const { palette } = theme;

  const primaryEntries = stringEntries(palette.primary, SCALE_KEYS);

  const secondaryEntries = stringEntries(palette.secondary, SCALE_KEYS);

  const backgroundEntries = stringEntries(palette.background, BACKGROUND_KEYS);

  const successEntries = stringEntries(palette.success, ["main", "light", "dark", "contrastText"]);

  const errorEntries = stringEntries(palette.error, ["main", "light", "dark", "contrastText"]);

  const textEntries = [
    { label: "primary", color: palette.text.primary },
    { label: "secondary", color: palette.text.secondary },
    { label: "disabled", color: palette.text.disabled },
  ];

  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        py: 4,
        px: 2,
      }}
    >
      <Stack spacing={3} sx={{ maxWidth: 720, mx: "auto" }}>
        <Box>
          <Typography variant="h5" color="primary" sx={{ fontSize: "1.5rem", mb: 0.5 }}>
            Theme preview
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: "0.875rem" }}>
            Route <Typography component="span" sx={{ fontFamily: "monospace" }}>/test_theme</Typography> — not linked in
            the app.
          </Typography>
        </Box>

        <ScaleSection title="Primary" entries={primaryEntries} />
        <ScaleSection title="Secondary" entries={secondaryEntries} />
        <ScaleSection title="Background" entries={backgroundEntries} />
        <ScaleSection title="Text" entries={textEntries} />
        <ScaleSection title="Success" entries={successEntries} />
        <ScaleSection title="Error" entries={errorEntries} />

        <Card variant="outlined" sx={{ bgcolor: "background.paper" }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontSize: "1.125rem" }}>
              Buttons
            </Typography>
            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
              <Button color="primary" variant="contained">
                Primary
              </Button>
              <Button color="secondary" variant="contained">
                Secondary
              </Button>
              <Button color="success" variant="contained">
                Success
              </Button>
              <Button color="error" variant="contained">
                Error
              </Button>
              <Button color="primary" variant="outlined">
                Primary out
              </Button>
              <Button color="success" variant="outlined">
                Success out
              </Button>
              <Button color="error" variant="outlined">
                Error out
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ bgcolor: "background.paper" }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontSize: "1.125rem" }}>
              Alerts
            </Typography>
            <Stack spacing={2}>
              <Alert severity="success">Success alert</Alert>
              <Alert severity="error">Error alert</Alert>
              <Alert severity="info">Info alert</Alert>
              <Alert severity="warning">Warning alert</Alert>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
