"use client";

import * as React from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

type ProfileViewProps = {
  initialFirstName: string;
  initialLastName: string;
  email: string;
  userId: string;
  initialCompany: string;
  initialAddress: string;
  initialBiography: string;
  accountType: string;
  initialLinkedInUrl: string;
  initialEducation: EducationEntry[];
  initialEmployment: EmploymentEntry[];
};

type EducationEntry = {
  school: string;
  degree: string;
  fieldOfStudy: string;
  startYear: string;
  endYear: string;
};

type EmploymentEntry = {
  company: string;
  title: string;
  startYear: string;
  endYear: string;
  description: string;
};

const EMPTY_EDUCATION: EducationEntry = {
  school: "",
  degree: "",
  fieldOfStudy: "",
  startYear: "",
  endYear: "",
};

const EMPTY_EMPLOYMENT: EmploymentEntry = {
  company: "",
  title: "",
  startYear: "",
  endYear: "",
  description: "",
};

function buildFullName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

export default function ProfileView({
  initialFirstName,
  initialLastName,
  email,
  userId,
  initialCompany,
  initialAddress,
  initialBiography,
  accountType,
  initialLinkedInUrl,
  initialEducation,
  initialEmployment,
}: ProfileViewProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const [firstName, setFirstName] = React.useState(initialFirstName);
  const [lastName, setLastName] = React.useState(initialLastName);
  const [company, setCompany] = React.useState(initialCompany);
  const [address, setAddress] = React.useState(initialAddress);
  const [biography, setBiography] = React.useState(initialBiography);
  const [linkedInUrl, setLinkedInUrl] = React.useState(initialLinkedInUrl);
  const [education, setEducation] = React.useState<EducationEntry[]>(
    initialEducation.length > 0 ? initialEducation : [EMPTY_EDUCATION],
  );
  const [employment, setEmployment] = React.useState<EmploymentEntry[]>(
    initialEmployment.length > 0 ? initialEmployment : [EMPTY_EMPLOYMENT],
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSendingReset, setIsSendingReset] = React.useState(false);
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
  } as const;
  const biographyFieldSx = {
    ...editableFieldSx,
    "& .MuiOutlinedInput-root": {
      ...editableFieldSx["& .MuiOutlinedInput-root"],
      alignItems: "flex-start",
    },
    "& .MuiInputBase-inputMultiline": {
      py: 1,
    },
  } as const;
  const initialSnapshot = React.useMemo(
    () =>
      JSON.stringify({
        firstName: initialFirstName.trim(),
        lastName: initialLastName.trim(),
        company: initialCompany.trim(),
        address: initialAddress.trim(),
        biography: initialBiography.trim(),
        linkedInUrl: initialLinkedInUrl.trim(),
        education: initialEducation
          .map((entry) => ({
            school: entry.school.trim(),
            degree: entry.degree.trim(),
            fieldOfStudy: entry.fieldOfStudy.trim(),
            startYear: entry.startYear.trim(),
            endYear: entry.endYear.trim(),
          }))
          .filter((entry) =>
            Boolean(
              entry.school ||
                entry.degree ||
                entry.fieldOfStudy ||
                entry.startYear ||
                entry.endYear,
            ),
          ),
        employment: initialEmployment
          .map((entry) => ({
            company: entry.company.trim(),
            title: entry.title.trim(),
            startYear: entry.startYear.trim(),
            endYear: entry.endYear.trim(),
            description: entry.description.trim(),
          }))
          .filter((entry) =>
            Boolean(
              entry.company ||
                entry.title ||
                entry.startYear ||
                entry.endYear ||
                entry.description,
            ),
          ),
      }),
    [
      initialAddress,
      initialBiography,
      initialCompany,
      initialEducation,
      initialEmployment,
      initialFirstName,
      initialLastName,
      initialLinkedInUrl,
    ],
  );
  const currentSnapshot = React.useMemo(
    () =>
      JSON.stringify({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        company: company.trim(),
        address: address.trim(),
        biography: biography.trim(),
        linkedInUrl: linkedInUrl.trim(),
        education: education
          .map((entry) => ({
            school: entry.school.trim(),
            degree: entry.degree.trim(),
            fieldOfStudy: entry.fieldOfStudy.trim(),
            startYear: entry.startYear.trim(),
            endYear: entry.endYear.trim(),
          }))
          .filter((entry) =>
            Boolean(
              entry.school ||
                entry.degree ||
                entry.fieldOfStudy ||
                entry.startYear ||
                entry.endYear,
            ),
          ),
        employment: employment
          .map((entry) => ({
            company: entry.company.trim(),
            title: entry.title.trim(),
            startYear: entry.startYear.trim(),
            endYear: entry.endYear.trim(),
            description: entry.description.trim(),
          }))
          .filter((entry) =>
            Boolean(
              entry.company ||
                entry.title ||
                entry.startYear ||
                entry.endYear ||
                entry.description,
            ),
          ),
      }),
    [firstName, lastName, company, address, biography, linkedInUrl, education, employment],
  );
  const [savedSnapshot, setSavedSnapshot] = React.useState(initialSnapshot);
  const hasUnsavedChanges = currentSnapshot !== savedSnapshot;

  React.useEffect(() => {
    setSavedSnapshot(initialSnapshot);
  }, [initialSnapshot]);

  React.useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("profile:unsaved-changed", {
        detail: { hasUnsavedChanges },
      }),
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("profile:unsaved-changed", {
          detail: { hasUnsavedChanges: false },
        }),
      );
    };
  }, [hasUnsavedChanges]);

  React.useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("profile:save-state-changed", {
        detail: { isSaving },
      }),
    );
  }, [isSaving]);

  React.useEffect(() => {
    const onRequestSave = () => {
      if (!isSaving) {
        formRef.current?.requestSubmit();
      }
    };
    const onRequestState = () => {
      window.dispatchEvent(
        new CustomEvent("profile:unsaved-changed", {
          detail: { hasUnsavedChanges },
        }),
      );
      window.dispatchEvent(
        new CustomEvent("profile:save-state-changed", {
          detail: { isSaving },
        }),
      );
    };
    window.addEventListener("profile:request-save", onRequestSave);
    window.addEventListener("profile:request-state", onRequestState);
    return () => {
      window.removeEventListener("profile:request-save", onRequestSave);
      window.removeEventListener("profile:request-state", onRequestState);
    };
  }, [hasUnsavedChanges, isSaving]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter both first name and last name.");
      return;
    }

    setIsSaving(true);
    const fullName = buildFullName(firstName, lastName);
    const normalizedEducation = education
      .map((entry) => ({
        school: entry.school.trim(),
        degree: entry.degree.trim(),
        fieldOfStudy: entry.fieldOfStudy.trim(),
        startYear: entry.startYear.trim(),
        endYear: entry.endYear.trim(),
      }))
      .filter((entry) =>
        Boolean(
          entry.school ||
            entry.degree ||
            entry.fieldOfStudy ||
            entry.startYear ||
            entry.endYear,
        ),
      );
    const normalizedEmployment = employment
      .map((entry) => ({
        company: entry.company.trim(),
        title: entry.title.trim(),
        startYear: entry.startYear.trim(),
        endYear: entry.endYear.trim(),
        description: entry.description.trim(),
      }))
      .filter((entry) =>
        Boolean(
          entry.company ||
            entry.title ||
            entry.startYear ||
            entry.endYear ||
            entry.description,
        ),
      );

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        company: company.trim(),
        address: address.trim(),
        biography: biography.trim(),
        linkedin_url: linkedInUrl.trim(),
        education: normalizedEducation,
        employment: normalizedEmployment,
      },
    });
    setIsSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSavedSnapshot(currentSnapshot);
    setSuccess("Name updated successfully.");
  }

  function updateEducation(index: number, patch: Partial<EducationEntry>) {
    setEducation((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  function updateEmployment(index: number, patch: Partial<EmploymentEntry>) {
    setEmployment((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  async function handleResetPassword() {
    setError(null);
    setSuccess(null);
    setIsSendingReset(true);

    const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${appUrl}/auth/callback?next=/signin`,
      },
    );

    setIsSendingReset(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSuccess(
      "If an account exists for this email, you will receive a reset link shortly.",
    );
  }

  return (
    <Stack spacing={2.5}>
      <Box
        component="form"
        ref={formRef}
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
        <Stack divider={<Box sx={{ borderBottom: "1px solid rgba(83,132,180,0.15)" }} />}>
          <Box sx={{ py: 1.35 }}>
            <Typography sx={sectionTitleSx}>Basic information</Typography>
            <Typography sx={{ fontSize: "0.9rem", color: "text.secondary", mt: 0.25 }}>
              Core profile details used across your account.
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "220px minmax(0, 1fr)" },
              gap: { xs: 1, md: 2 },
              py: 1.35,
              alignItems: "center",
            }}
          >
            <Typography sx={rowLabelSx}>Name</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.25 }}>
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
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "220px minmax(0, 1fr)" },
              gap: { xs: 1, md: 2 },
              py: 1.35,
              alignItems: "center",
            }}
          >
            <Typography sx={rowLabelSx}>Email account</Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} alignItems={{ md: "center" }}>
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
              <Button
                variant="text"
                disabled={isSendingReset}
                onClick={handleResetPassword}
                sx={{ whiteSpace: "nowrap" }}
              >
                {isSendingReset ? "Sending..." : "Reset Password"}
              </Button>
            </Stack>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "220px minmax(0, 1fr)" },
              gap: { xs: 1, md: 2 },
              py: 1.35,
              alignItems: "center",
            }}
          >
            <Typography sx={rowLabelSx}>Account type</Typography>
            <TextField
              value={accountType}
              fullWidth
              disabled
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
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "220px minmax(0, 1fr)" },
              gap: { xs: 1, md: 2 },
              py: 1.35,
              alignItems: "center",
            }}
          >
            <Typography sx={rowLabelSx}>Company</Typography>
            <TextField
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              fullWidth
              sx={editableFieldSx}
            />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "220px minmax(0, 1fr)" },
              gap: { xs: 1, md: 2 },
              py: 1.35,
              alignItems: "center",
            }}
          >
            <Typography sx={rowLabelSx}>Address</Typography>
            <TextField
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              fullWidth
              sx={editableFieldSx}
            />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "220px minmax(0, 1fr)" },
              gap: { xs: 1, md: 2 },
              py: 1.35,
              alignItems: "start",
            }}
          >
            <Typography sx={rowLabelSx}>Biography</Typography>
            <TextField
              value={biography}
              onChange={(event) => setBiography(event.target.value)}
              fullWidth
              multiline
              minRows={5}
              maxRows={5}
              sx={biographyFieldSx}
            />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "220px minmax(0, 1fr)" },
              gap: { xs: 1, md: 2 },
              py: 1.35,
              alignItems: "center",
            }}
          >
            <Typography sx={rowLabelSx}>User ID</Typography>
            <Typography sx={{ fontSize: "0.95rem", color: "text.secondary", wordBreak: "break-all" }}>
              {userId}
            </Typography>
          </Box>
        </Stack>

        <Stack spacing={2.5} sx={{ pt: 2 }}>
          <Box>
            <Typography sx={sectionTitleSx}>Education</Typography>
            <Typography sx={{ fontSize: "0.9rem", color: "text.secondary", mt: 0.25 }}>
              Add one or more education records.
            </Typography>
            <Stack spacing={1.25} sx={{ mt: 1.25 }}>
              {education.map((item, index) => (
                <Box
                  key={`education-${index}`}
                  sx={{
                    p: 1.25,
                    borderRadius: 1,
                    border: "1px solid rgba(83,132,180,0.2)",
                    bgcolor: "rgba(245,247,250,0.55)",
                  }}
                >
                  <Stack spacing={1}>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1 }}>
                      <TextField
                        placeholder="School"
                        value={item.school}
                        onChange={(event) =>
                          updateEducation(index, { school: event.target.value })
                        }
                        fullWidth
                        sx={editableFieldSx}
                      />
                      <TextField
                        placeholder="Degree"
                        value={item.degree}
                        onChange={(event) =>
                          updateEducation(index, { degree: event.target.value })
                        }
                        fullWidth
                        sx={editableFieldSx}
                      />
                    </Box>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 1fr" }, gap: 1 }}>
                      <TextField
                        placeholder="Field of study"
                        value={item.fieldOfStudy}
                        onChange={(event) =>
                          updateEducation(index, { fieldOfStudy: event.target.value })
                        }
                        fullWidth
                        sx={editableFieldSx}
                      />
                      <TextField
                        placeholder="Start year"
                        value={item.startYear}
                        onChange={(event) =>
                          updateEducation(index, { startYear: event.target.value })
                        }
                        fullWidth
                        sx={editableFieldSx}
                      />
                      <TextField
                        placeholder="End year"
                        value={item.endYear}
                        onChange={(event) =>
                          updateEducation(index, { endYear: event.target.value })
                        }
                        fullWidth
                        sx={editableFieldSx}
                      />
                    </Box>
                    {education.length > 1 ? (
                      <Box>
                        <Button
                          color="error"
                          variant="text"
                          onClick={() =>
                            setEducation((prev) => prev.filter((_, i) => i !== index))
                          }
                        >
                          Remove
                        </Button>
                      </Box>
                    ) : null}
                  </Stack>
                </Box>
              ))}
            </Stack>
            <Button
              variant="outlined"
              sx={{ mt: 1.25 }}
              onClick={() => setEducation((prev) => [...prev, { ...EMPTY_EDUCATION }])}
            >
              Add education
            </Button>
          </Box>

          <Box>
            <Typography sx={sectionTitleSx}>Employment</Typography>
            <Typography sx={{ fontSize: "0.9rem", color: "text.secondary", mt: 0.25 }}>
              Add one or more work experiences.
            </Typography>
            <Stack spacing={1.25} sx={{ mt: 1.25 }}>
              {employment.map((item, index) => (
                <Box
                  key={`employment-${index}`}
                  sx={{
                    p: 1.25,
                    borderRadius: 1,
                    border: "1px solid rgba(83,132,180,0.2)",
                    bgcolor: "rgba(245,247,250,0.55)",
                  }}
                >
                  <Stack spacing={1}>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1 }}>
                      <TextField
                        placeholder="Company"
                        value={item.company}
                        onChange={(event) =>
                          updateEmployment(index, { company: event.target.value })
                        }
                        fullWidth
                        sx={editableFieldSx}
                      />
                      <TextField
                        placeholder="Job title"
                        value={item.title}
                        onChange={(event) =>
                          updateEmployment(index, { title: event.target.value })
                        }
                        fullWidth
                        sx={editableFieldSx}
                      />
                    </Box>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1 }}>
                      <TextField
                        placeholder="Start year"
                        value={item.startYear}
                        onChange={(event) =>
                          updateEmployment(index, { startYear: event.target.value })
                        }
                        fullWidth
                        sx={editableFieldSx}
                      />
                      <TextField
                        placeholder="End year"
                        value={item.endYear}
                        onChange={(event) =>
                          updateEmployment(index, { endYear: event.target.value })
                        }
                        fullWidth
                        sx={editableFieldSx}
                      />
                    </Box>
                    <TextField
                      placeholder="Role description"
                      value={item.description}
                      onChange={(event) =>
                        updateEmployment(index, { description: event.target.value })
                      }
                      fullWidth
                      multiline
                      minRows={3}
                      sx={editableFieldSx}
                    />
                    {employment.length > 1 ? (
                      <Box>
                        <Button
                          color="error"
                          variant="text"
                          onClick={() =>
                            setEmployment((prev) => prev.filter((_, i) => i !== index))
                          }
                        >
                          Remove
                        </Button>
                      </Box>
                    ) : null}
                  </Stack>
                </Box>
              ))}
            </Stack>
            <Button
              variant="outlined"
              sx={{ mt: 1.25 }}
              onClick={() => setEmployment((prev) => [...prev, { ...EMPTY_EMPLOYMENT }])}
            >
              Add work experience
            </Button>
          </Box>

          <Box
            sx={{
              p: 1.25,
              borderRadius: 1,
              border: "1px solid rgba(83,132,180,0.2)",
              bgcolor: "rgba(245,247,250,0.55)",
            }}
          >
            <Typography sx={sectionTitleSx}>LinkedIn</Typography>
            <Typography sx={{ fontSize: "0.9rem", color: "text.secondary", mt: 0.25, mb: 1 }}>
              Add your LinkedIn profile and connect your account.
            </Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} alignItems={{ md: "center" }}>
              <TextField
                placeholder="https://www.linkedin.com/in/your-handle"
                value={linkedInUrl}
                onChange={(event) => setLinkedInUrl(event.target.value)}
                fullWidth
                sx={editableFieldSx}
              />
              <Button
                variant="outlined"
                component="a"
                href="https://www.linkedin.com/login"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ whiteSpace: "nowrap" }}
              >
                Connect LinkedIn
              </Button>
            </Stack>
          </Box>

          <Stack spacing={1.25}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {success ? <Alert severity="success">{success}</Alert> : null}
          </Stack>
        </Stack>
      </Box>
    </Stack>
  );
}
