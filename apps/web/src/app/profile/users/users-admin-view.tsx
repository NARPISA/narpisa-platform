"use client";

import * as React from "react";
import Alert from "@mui/material/Alert";
import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";

import { createClient } from "@/lib/supabase/client";

export type TierOption = {
  id: string;
  name: string;
  description: string | null;
};

export type ProfileUserRow = {
  id: string;
  firstname: string | null;
  lastname: string | null;
  tier_id: string;
  created_at: string;
  tier_name: string | null;
  email: string | null;
};

type UsersAdminViewProps = {
  isAdmin: boolean;
  currentUserId: string;
  initialRows: ProfileUserRow[];
  tiers: TierOption[];
  errorMessage?: string | null;
};

export default function UsersAdminView({
  isAdmin,
  currentUserId,
  initialRows,
  tiers,
  errorMessage,
}: UsersAdminViewProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const [rows, setRows] = React.useState(initialRows);
  const [drafts, setDrafts] = React.useState<Record<string, { firstname: string; lastname: string; tier_id: string }>>(
    () =>
      Object.fromEntries(
        initialRows.map((r) => [
          r.id,
          {
            firstname: r.firstname ?? "",
            lastname: r.lastname ?? "",
            tier_id: r.tier_id,
          },
        ]),
      ),
  );
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [banner, setBanner] = React.useState<{ severity: "success" | "error"; message: string } | null>(null);

  const bodySx = { fontSize: "0.875rem", lineHeight: 1.45 } as const;
  const headSx = { fontSize: "0.8125rem", fontWeight: 600, lineHeight: 1.4, color: "text.secondary" } as const;

  function setDraft(
    id: string,
    patch: Partial<{ firstname: string; lastname: string; tier_id: string }>,
  ) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  }

  async function saveRow(id: string) {
    setBanner(null);
    const d = drafts[id];
    if (!d) {
      return;
    }
    setSavingId(id);
    const { error } = await supabase
      .from("profiles")
      .update({
        firstname: d.firstname.trim() || null,
        lastname: d.lastname.trim() || null,
        tier_id: d.tier_id,
      })
      .eq("id", id);
    setSavingId(null);

    if (error) {
      setBanner({ severity: "error", message: error.message });
      return;
    }

    const tierName = tiers.find((t) => t.id === d.tier_id)?.name ?? null;
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              firstname: d.firstname.trim() || null,
              lastname: d.lastname.trim() || null,
              tier_id: d.tier_id,
              tier_name: tierName,
              email: r.email,
            }
          : r,
      ),
    );
    setBanner({ severity: "success", message: "User updated." });
  }

  const dirty = (id: string) => {
    const d = drafts[id];
    const r = rows.find((row) => row.id === id);
    if (!d || !r) {
      return false;
    }
    return (
      d.firstname !== (r.firstname ?? "") ||
      d.lastname !== (r.lastname ?? "") ||
      d.tier_id !== r.tier_id
    );
  };

  return (
    <>
      <Backdrop
        open={savingId !== null}
        sx={{
          color: "common.white",
          zIndex: (theme) => theme.zIndex.modal + 1,
          bgcolor: "rgba(20, 28, 45, 0.42)",
          backdropFilter: "blur(2px)",
        }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <CircularProgress size={20} color="inherit" />
          <Typography sx={{ ...bodySx, color: "common.white", fontWeight: 600 }}>
            Saving user changes...
          </Typography>
        </Stack>
      </Backdrop>
      <Stack spacing={2.5}>
      {errorMessage ? (
        <Alert severity="error" sx={{ "& .MuiAlert-message": { ...bodySx } }}>
          {errorMessage}
        </Alert>
      ) : null}

      {!isAdmin ? (
        <Alert severity="info" sx={{ "& .MuiAlert-message": { ...bodySx } }}>
          Only administrators can edit tiers or profile names. You can still browse registered users.
        </Alert>
      ) : null}

      {banner ? (
        <Alert severity={banner.severity} sx={{ "& .MuiAlert-message": { ...bodySx } }}>
          {banner.message}
        </Alert>
      ) : null}

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 1,
          border: "1px solid rgba(83,132,180,0.18)",
          overflowX: "auto",
        }}
      >
        <Table size="small" sx={{ minWidth: 880, "& .MuiTableCell-root": { py: 1 } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={headSx}>First name</TableCell>
              <TableCell sx={headSx}>Last name</TableCell>
              <TableCell sx={headSx}>Email</TableCell>
              <TableCell sx={headSx}>Tier</TableCell>
              <TableCell sx={headSx}>User ID</TableCell>
              <TableCell align="right" sx={headSx}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const d = drafts[row.id];
              const isSelf = row.id === currentUserId;
              return (
                <TableRow key={row.id} hover selected={isSelf}>
                  <TableCell sx={{ verticalAlign: "top" }}>
                    <TextField
                      value={d?.firstname ?? ""}
                      onChange={(e) => setDraft(row.id, { firstname: e.target.value })}
                      disabled={!isAdmin}
                      size="small"
                      fullWidth
                      sx={{
                        minWidth: 108,
                        "& .MuiInputBase-input": { ...bodySx, py: 0.75 },
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ verticalAlign: "top" }}>
                    <TextField
                      value={d?.lastname ?? ""}
                      onChange={(e) => setDraft(row.id, { lastname: e.target.value })}
                      disabled={!isAdmin}
                      size="small"
                      fullWidth
                      sx={{
                        minWidth: 108,
                        "& .MuiInputBase-input": { ...bodySx, py: 0.75 },
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ verticalAlign: "top", maxWidth: 200, wordBreak: "break-all" }}>
                    <Typography sx={{ ...bodySx }}>{row.email?.trim() ? row.email : "—"}</Typography>
                  </TableCell>
                  <TableCell sx={{ verticalAlign: "top", minWidth: 140 }}>
                    {isAdmin ? (
                      <FormControl size="small" fullWidth>
                        <InputLabel id={`tier-${row.id}`} sx={bodySx}>
                          Tier
                        </InputLabel>
                        <Select
                          labelId={`tier-${row.id}`}
                          label="Tier"
                          value={d?.tier_id ?? ""}
                          onChange={(e) => setDraft(row.id, { tier_id: String(e.target.value) })}
                          sx={{ ...bodySx }}
                          MenuProps={{
                            PaperProps: { sx: { "& .MuiMenuItem-root": { ...bodySx, minHeight: 36 } } },
                          }}
                        >
                          {tiers.map((t) => (
                            <MenuItem key={t.id} value={t.id}>
                              {t.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : (
                      <Typography sx={{ ...bodySx, py: 0.5 }}>{row.tier_name ?? "—"}</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ verticalAlign: "top", maxWidth: 200 }}>
                    <Typography sx={{ ...bodySx, wordBreak: "break-all", fontFamily: "monospace" }}>
                      {row.id}
                    </Typography>
                    {isSelf ? (
                      <Typography sx={{ ...bodySx, fontSize: "0.75rem", color: "text.secondary" }}>You</Typography>
                    ) : null}
                  </TableCell>
                  <TableCell align="right" sx={{ verticalAlign: "top" }}>
                    {isAdmin ? (
                      <Button
                        variant="contained"
                        size="small"
                        disabled={!dirty(row.id) || savingId === row.id}
                        onClick={() => void saveRow(row.id)}
                        sx={{ ...bodySx, textTransform: "none", minWidth: 72, py: 0.5 }}
                      >
                        {savingId === row.id ? "Saving…" : "Save"}
                      </Button>
                    ) : (
                      <Box sx={{ height: 40 }} />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      </Stack>
    </>
  );
}
