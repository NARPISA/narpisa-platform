"use client";

import LinkedInIcon from "@mui/icons-material/LinkedIn";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { Provider } from "@supabase/supabase-js";
import * as React from "react";

import { getPdfWorkerUrl, getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

type LinkedInAccount = {
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
  lastSyncedAt: string | null;
};

type NetworkProfile = {
  isVisible: boolean;
  headline: string;
  company: string;
  roleCategory: string;
  disciplines: string[];
  regions: string[];
  bio: string;
  linkedInUrl: string;
};

type NetworkInterest = {
  interestType: string;
  label: string;
  commodityId: number | null;
  countryId: number | null;
  siteId: number | null;
};

type NetworkEntityOption = {
  id: number;
  label: string;
};

type NetworkTagOptions = {
  disciplines: string[];
  regions: string[];
  commodities: NetworkEntityOption[];
  countries: NetworkEntityOption[];
  sites: NetworkEntityOption[];
};

type ProfileViewProps = {
  profileId: string;
  initialFirstName: string;
  initialLastName: string;
  email: string;
  initialLinkedInUrl: string;
  linkedInAccount: LinkedInAccount | null;
  initialNetworkProfile: NetworkProfile;
  initialNetworkInterests: NetworkInterest[];
  tagOptions: NetworkTagOptions;
};

export default function ProfileView({
  profileId,
  initialFirstName,
  initialLastName,
  email,
  initialLinkedInUrl,
  linkedInAccount,
  initialNetworkProfile,
  initialNetworkInterests,
  tagOptions,
}: ProfileViewProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;
  const pdfWorkerUrl = getPdfWorkerUrl();
  const [firstName, setFirstName] = React.useState(initialFirstName);
  const [lastName, setLastName] = React.useState(initialLastName);
  const [linkedInUrl, setLinkedInUrl] = React.useState(initialLinkedInUrl);
  const [linkedInConnection, setLinkedInConnection] =
    React.useState(linkedInAccount);
  const [isNetworkVisible, setIsNetworkVisible] = React.useState(
    initialNetworkProfile.isVisible,
  );
  const [headline, setHeadline] = React.useState(initialNetworkProfile.headline);
  const [company, setCompany] = React.useState(initialNetworkProfile.company);
  const [roleCategory, setRoleCategory] = React.useState(
    initialNetworkProfile.roleCategory,
  );
  const [disciplines, setDisciplines] = React.useState(
    normalizeList(initialNetworkProfile.disciplines),
  );
  const [regions, setRegions] = React.useState(
    normalizeList(initialNetworkProfile.regions),
  );
  const [bio, setBio] = React.useState(initialNetworkProfile.bio);
  const [commodities, setCommodities] = React.useState(
    labelsForType(initialNetworkInterests, "commodity"),
  );
  const [countries, setCountries] = React.useState(
    labelsForType(initialNetworkInterests, "country"),
  );
  const [sites, setSites] = React.useState(
    labelsForType(initialNetworkInterests, "site"),
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [isLinkedInLoading, setIsLinkedInLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const inputCornerRadius = 1;
  const rowLabelSx = {
    fontSize: "1.05rem",
    fontWeight: 600,
    color: "text.primary",
  } as const;
  const sectionTitleSx = {
    fontSize: "1.05rem",
    fontWeight: 700,
    color: "text.primary",
    letterSpacing: "0.01em",
  } as const;

  const editableFieldSx = {
    "& .MuiOutlinedInput-root": {
      bgcolor: "transparent",
      color: "text.primary",
      borderRadius: inputCornerRadius,
    },
    "& .MuiOutlinedInput-notchedOutline": {
      borderRadius: inputCornerRadius,
      borderColor: "rgba(83,132,180,0.28)",
    },
    "& .MuiInputBase-input": {
      color: "text.primary",
      fontSize: "0.95rem",
      py: 1.05,
    },
    "& .MuiInputLabel-root": {
      color: "text.secondary",
      fontSize: "0.95rem",
    },
  } as const;

  const buildSnapshot = React.useCallback(
    () =>
      JSON.stringify({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        linkedInUrl: linkedInUrl.trim(),
        isNetworkVisible,
        headline: headline.trim(),
        company: company.trim(),
        roleCategory: roleCategory.trim(),
        disciplines: normalizeList(disciplines),
        regions: normalizeList(regions),
        bio: bio.trim(),
        commodities: normalizeList(commodities),
        countries: normalizeList(countries),
        sites: normalizeList(sites),
      }),
    [
      firstName,
      lastName,
      linkedInUrl,
      isNetworkVisible,
      headline,
      company,
      roleCategory,
      disciplines,
      regions,
      bio,
      commodities,
      countries,
      sites,
    ],
  );

  const initialSnapshot = React.useMemo(
    () =>
      JSON.stringify({
        firstName: initialFirstName.trim(),
        lastName: initialLastName.trim(),
        linkedInUrl: initialLinkedInUrl.trim(),
        isNetworkVisible: initialNetworkProfile.isVisible,
        headline: initialNetworkProfile.headline.trim(),
        company: initialNetworkProfile.company.trim(),
        roleCategory: initialNetworkProfile.roleCategory.trim(),
        disciplines: normalizeList(initialNetworkProfile.disciplines),
        regions: normalizeList(initialNetworkProfile.regions),
        bio: initialNetworkProfile.bio.trim(),
        commodities: labelsForType(initialNetworkInterests, "commodity"),
        countries: labelsForType(initialNetworkInterests, "country"),
        sites: labelsForType(initialNetworkInterests, "site"),
      }),
    [
      initialFirstName,
      initialLastName,
      initialLinkedInUrl,
      initialNetworkProfile,
      initialNetworkInterests,
    ],
  );
  const currentSnapshot = React.useMemo(() => buildSnapshot(), [buildSnapshot]);
  const [savedSnapshot, setSavedSnapshot] = React.useState(initialSnapshot);
  const hasUnsavedChanges = currentSnapshot !== savedSnapshot;

  React.useEffect(() => {
    setSavedSnapshot(initialSnapshot);
  }, [initialSnapshot]);

  async function handleConnectLinkedIn() {
    setError(null);
    setIsLinkedInLoading(true);
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "linkedin_oidc" as Provider,
      options: {
        redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent("/profile")}`,
      },
    });

    if (signInError) {
      setIsLinkedInLoading(false);
      setError(signInError.message);
    }
  }

  async function handleDisconnectLinkedIn() {
    setError(null);
    setSuccess(null);
    setIsLinkedInLoading(true);
    const { error: deleteError } = await supabase
      .from("profile_social_accounts")
      .delete()
      .eq("profile_id", profileId)
      .eq("provider", "linkedin");
    setIsLinkedInLoading(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setLinkedInConnection(null);
    setSuccess("LinkedIn account disconnected.");
  }

  async function saveNetworkInterests() {
    const commodityRows = buildInterestRows(
      profileId,
      "commodity",
      commodities,
      tagOptions.commodities,
      "commodity_id",
    );
    const countryRows = buildInterestRows(
      profileId,
      "country",
      countries,
      tagOptions.countries,
      "country_id",
    );
    const siteRows = buildInterestRows(
      profileId,
      "site",
      sites,
      tagOptions.sites,
      "site_id",
    );
    const interestRows = [
      ...commodityRows,
      ...countryRows,
      ...siteRows,
    ];

    const { error: deleteError } = await supabase
      .from("network_interests")
      .delete()
      .eq("profile_id", profileId);

    if (deleteError) {
      return deleteError;
    }

    if (interestRows.length === 0) {
      return null;
    }

    const { error: insertError } = await supabase
      .from("network_interests")
      .insert(interestRows);
    return insertError;
  }

  async function refreshBackendNetworkProfile() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      return;
    }

    try {
      await fetch(`${pdfWorkerUrl}/api/v1/network/profiles/${profileId}/refresh`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Profile saves should not fail just because recommendation refresh is unavailable.
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter both first name and last name.");
      return;
    }

    setIsSaving(true);
    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({
        firstname: firstName.trim(),
        lastname: lastName.trim(),
        linkedin_url: linkedInUrl.trim() || null,
      })
      .eq("id", profileId);

    if (profileUpdateError) {
      setIsSaving(false);
      setError(profileUpdateError.message);
      return;
    }

    const { error: networkProfileError } = await supabase
      .from("network_profiles")
      .upsert(
        {
          profile_id: profileId,
          is_visible: isNetworkVisible,
          headline: headline.trim() || null,
          company: company.trim() || null,
          role_category: roleCategory.trim() || null,
          disciplines: normalizeList(disciplines),
          regions: normalizeList(regions),
          bio: bio.trim() || null,
          linkedin_url: linkedInUrl.trim() || null,
        },
        { onConflict: "profile_id" },
      );

    if (networkProfileError) {
      setIsSaving(false);
      setError(networkProfileError.message);
      return;
    }

    const interestsError = await saveNetworkInterests();
    setIsSaving(false);

    if (interestsError) {
      setError(interestsError.message);
      return;
    }

    await refreshBackendNetworkProfile();
    setSavedSnapshot(buildSnapshot());
    setSuccess("Profile and network recommendations updated successfully.");
  }

  return (
    <Stack spacing={2.5}>
      <Box
        component="form"
        onSubmit={handleSave}
        sx={{
          borderRadius: inputCornerRadius,
          px: { xs: 2, md: 2.5 },
          pb: { xs: 2, md: 2.5 },
          pt: 0,
          bgcolor: "background.paper",
          border: "1px solid rgba(83,132,180,0.18)",
        }}
      >
        <Stack
          divider={<Box sx={{ borderBottom: "1px solid rgba(83,132,180,0.15)" }} />}
        >
          <Box sx={{ py: 1.35 }}>
            <Typography sx={sectionTitleSx}>Profile information</Typography>
            <Typography sx={{ fontSize: "0.9rem", color: "text.secondary", mt: 0.25 }}>
              Manage account identity and public network details.
            </Typography>
          </Box>

          <ProfileRow label="Name" rowLabelSx={rowLabelSx}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 1.25,
              }}
            >
              <TextField
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="First name"
                fullWidth
                sx={editableFieldSx}
              />
              <TextField
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Last name"
                fullWidth
                sx={editableFieldSx}
              />
            </Box>
          </ProfileRow>

          <ProfileRow label="Email account" rowLabelSx={rowLabelSx}>
            <TextField
              value={email}
              fullWidth
              disabled
              type="email"
              autoComplete="email"
              sx={{
                ...editableFieldSx,
                "& .MuiInputBase-input.Mui-disabled": {
                  WebkitTextFillColor: "rgba(24,28,38,0.9)",
                  opacity: 1,
                },
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <LockOutlinedIcon sx={{ color: "rgba(24,28,38,0.45)" }} />
                  </InputAdornment>
                ),
              }}
            />
          </ProfileRow>

          <ProfileRow label="LinkedIn account" rowLabelSx={rowLabelSx}>
            <Stack spacing={1.25}>
              {linkedInConnection ? (
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.25}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                >
                  <Avatar
                    src={linkedInConnection.avatarUrl ?? undefined}
                    sx={{ bgcolor: "secondary.main" }}
                  >
                    <LinkedInIcon />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: "0.95rem", fontWeight: 700 }}>
                      {linkedInConnection.displayName ?? "LinkedIn connected"}
                    </Typography>
                    <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
                      {linkedInConnection.email ?? "Verified LinkedIn identity"}
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    disabled={isLinkedInLoading}
                    onClick={() => {
                      void handleDisconnectLinkedIn();
                    }}
                  >
                    Disconnect
                  </Button>
                </Stack>
              ) : (
                <Button
                  variant="contained"
                  disabled={isLinkedInLoading}
                  startIcon={<LinkedInIcon />}
                  onClick={() => {
                    void handleConnectLinkedIn();
                  }}
                  sx={{ alignSelf: "flex-start" }}
                >
                  {isLinkedInLoading ? "Connecting..." : "Connect LinkedIn"}
                </Button>
              )}
              <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
                LinkedIn sign-in verifies the account association. The public profile URL remains editable because OIDC does not always return one.
              </Typography>
            </Stack>
          </ProfileRow>

          <ProfileRow label="LinkedIn URL" rowLabelSx={rowLabelSx}>
            <Stack spacing={1}>
              <TextField
                placeholder="https://www.linkedin.com/in/your-handle"
                value={linkedInUrl}
                onChange={(event) => setLinkedInUrl(event.target.value)}
                fullWidth
                sx={editableFieldSx}
              />
              <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
                Shown on your opt-in network profile when visibility is enabled.
              </Typography>
            </Stack>
          </ProfileRow>

          <Box sx={{ py: 1.35 }}>
            <Typography sx={sectionTitleSx}>Mining network profile</Typography>
            <Typography sx={{ fontSize: "0.9rem", color: "text.secondary", mt: 0.25 }}>
              These fields power the in-app graph and are visible only after you opt in.
            </Typography>
          </Box>

          <ProfileRow label="Network visibility" rowLabelSx={rowLabelSx}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Switch
                checked={isNetworkVisible}
                onChange={(event) => setIsNetworkVisible(event.target.checked)}
              />
              <Box>
                <Typography sx={{ fontSize: "0.95rem", fontWeight: 700 }}>
                  {isNetworkVisible ? "Visible in the network" : "Hidden from the network"}
                </Typography>
                <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
                  Authenticated users can discover opted-in profiles.
                </Typography>
              </Box>
            </Stack>
          </ProfileRow>

          <ProfileRow label="Professional context" rowLabelSx={rowLabelSx}>
            <Stack spacing={1.25}>
              <TextField
                placeholder="Mining finance lead, ESG analyst, exploration geologist..."
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
                fullWidth
                sx={editableFieldSx}
              />
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  gap: 1.25,
                }}
              >
                <TextField
                  placeholder="Company or organization"
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  fullWidth
                  sx={editableFieldSx}
                />
                <TextField
                  placeholder="Role category"
                  value={roleCategory}
                  onChange={(event) => setRoleCategory(event.target.value)}
                  fullWidth
                  sx={editableFieldSx}
                />
              </Box>
              <TextField
                placeholder="Short network bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                fullWidth
                multiline
                minRows={3}
                sx={editableFieldSx}
              />
            </Stack>
          </ProfileRow>

          <ProfileRow label="Graph tags" rowLabelSx={rowLabelSx}>
            <Stack spacing={1.25}>
              <TagAutocomplete
                label="Disciplines"
                placeholder="Geology, project finance, permitting"
                options={tagOptions.disciplines}
                value={disciplines}
                onChange={setDisciplines}
                editableFieldSx={editableFieldSx}
              />
              <TagAutocomplete
                label="Commodities"
                placeholder="Copper, lithium, uranium"
                options={tagOptions.commodities.map((option) => option.label)}
                value={commodities}
                onChange={setCommodities}
                editableFieldSx={editableFieldSx}
              />
              <TagAutocomplete
                label="Countries or regions"
                placeholder="Namibia, Botswana, Southern Africa"
                options={tagOptions.countries.map((option) => option.label)}
                value={countries}
                onChange={setCountries}
                editableFieldSx={editableFieldSx}
              />
              <TagAutocomplete
                label="Sites of interest"
                placeholder="Husab, Rossing, Tschudi"
                options={tagOptions.sites.map((option) => option.label)}
                value={sites}
                onChange={setSites}
                editableFieldSx={editableFieldSx}
              />
              <TagAutocomplete
                label="Regions"
                placeholder="Erongo, Otjozondjupa, Copperbelt"
                options={tagOptions.regions}
                value={regions}
                onChange={setRegions}
                editableFieldSx={editableFieldSx}
              />
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {[
                  ...disciplines,
                  ...commodities,
                  ...countries,
                  ...sites,
                  ...regions,
                ]
                  .slice(0, 12)
                  .map((tag) => (
                    <Chip key={tag} label={tag} size="small" />
                  ))}
              </Stack>
            </Stack>
          </ProfileRow>

          <Stack spacing={1.25} sx={{ py: 1.35 }}>
            {error ? (
              <Alert severity="error" sx={{ "& .MuiAlert-message": { fontSize: "0.9rem" } }}>
                {error}
              </Alert>
            ) : null}
            {success ? (
              <Alert severity="success" sx={{ "& .MuiAlert-message": { fontSize: "0.9rem" } }}>
                {success}
              </Alert>
            ) : null}
            <Box>
              <Button
                type="submit"
                variant="contained"
                disabled={isSaving || !hasUnsavedChanges}
                sx={{ minWidth: 150 }}
              >
                {isSaving ? "Saving..." : "Save profile"}
              </Button>
            </Box>
          </Stack>
        </Stack>
      </Box>
    </Stack>
  );
}

function ProfileRow({
  label,
  rowLabelSx,
  children,
}: {
  label: string;
  rowLabelSx: object;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "220px minmax(0, 1fr)" },
        gap: { xs: 1, md: 2 },
        py: 1.35,
        alignItems: "center",
      }}
    >
      <Typography sx={rowLabelSx}>{label}</Typography>
      {children}
    </Box>
  );
}

function TagAutocomplete({
  label,
  placeholder,
  options,
  value,
  onChange,
  editableFieldSx,
}: {
  label: string;
  placeholder: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  editableFieldSx: object;
}) {
  return (
    <Autocomplete
      multiple
      freeSolo
      options={options}
      value={value}
      onChange={(_event, nextValue) => onChange(normalizeList(nextValue))}
      filterSelectedOptions
      slotProps={{
        paper: {
          sx: {
            "& .MuiAutocomplete-option": {
              fontSize: "0.95rem",
              minHeight: 36,
            },
            "& .MuiAutocomplete-noOptions": {
              fontSize: "0.95rem",
            },
          },
        },
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          sx={editableFieldSx}
        />
      )}
    />
  );
}

function normalizeList(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    ),
  );
}

function buildInterestRows(
  profileId: string,
  interestType: "commodity" | "country" | "site",
  labels: string[],
  options: NetworkEntityOption[],
  idColumn: "commodity_id" | "country_id" | "site_id",
) {
  const optionsByLabel = new Map(
    options.map((option) => [option.label.toLowerCase(), option]),
  );

  return normalizeList(labels).map((label) => {
    const option = optionsByLabel.get(label.toLowerCase());
    return {
      profile_id: profileId,
      interest_type: interestType,
      [idColumn]: option?.id ?? null,
      label,
    };
  });
}

function labelsForType(interests: NetworkInterest[], interestType: string) {
  return normalizeList(
    interests
      .filter((interest) => interest.interestType === interestType)
      .map((interest) => interest.label),
  );
}
