import { alpha } from "@mui/material/styles";
import type { SxProps, Theme } from "@mui/material/styles";

export const authShellSx = {
  minHeight: "auto",
  bgcolor: "secondary.main",
} satisfies SxProps<Theme>;

export const authPageSx = {
  minHeight: "calc(100svh - 8.8rem)",
  px: 2,
  pt: { xs: 10, md: 12 },
  pb: { xs: 3, md: 4 },
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
} satisfies SxProps<Theme>;

export const authPaperSx = {
  width: "min(100%, 70rem)",
  minHeight: { xs: "auto", md: "52rem" },
  borderRadius: 0,
  px: { xs: 3, sm: 7 },
  py: { xs: 4, md: 5 },
  boxShadow: 8,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
} satisfies SxProps<Theme>;

export const authCenteredPaperSx = {
  ...authPaperSx,
  justifyContent: "center",
} satisfies SxProps<Theme>;

export const authTitleSx = {
  color: "background.600",
  typography: { xs: "h4", md: "authTitle" },
  textAlign: "center",
} satisfies SxProps<Theme>;

export const authBodyTextSx = {
  color: "background.600",
  typography: "authBody",
  textAlign: "center",
} satisfies SxProps<Theme>;

export const authLabelSx = {
  color: "background.600",
  typography: "authLabel",
} satisfies SxProps<Theme>;

export const authLinkSx = {
  color: "info.main",
  fontSize: "inherit",
} satisfies SxProps<Theme>;

export const authSmallLinkSx = {
  color: "info.main",
  fontSize: "1.8rem",
} satisfies SxProps<Theme>;

export const authFieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "0.8rem",
    backgroundColor: "background.300",
    minHeight: "4.5rem",
    typography: "authInput",
    color: "common.white",
    "& fieldset": {
      borderColor: (theme) => alpha(theme.palette.background[700], 0.08),
    },
    "&:hover fieldset": {
      borderColor: (theme) => alpha(theme.palette.background[700], 0.18),
    },
    "&.Mui-focused fieldset": {
      borderColor: "secondary.main",
    },
  },
  "& .MuiInputBase-input": {
    typography: "authInput",
  },
  "& .MuiFormHelperText-root": {
    typography: "authLabel",
  },
  "& .MuiOutlinedInput-input::placeholder": {
    color: (theme) => alpha(theme.palette.common.white, 0.92),
    opacity: 1,
  },
} satisfies SxProps<Theme>;

export const authPrimaryButtonSx = {
  width: "100%",
  maxWidth: "40rem",
  minHeight: "5.3rem",
  py: "1.2rem",
  borderRadius: 0,
  bgcolor: "primary.main",
  color: "common.white",
  typography: "authBody",
  fontWeight: 500,
  textTransform: "none",
  boxShadow: "none",
  "&:hover": {
    bgcolor: "primary.400",
    boxShadow: "none",
  },
} satisfies SxProps<Theme>;

export const authHeroButtonSx = {
  ...authPrimaryButtonSx,
  typography: "authAction",
  fontWeight: 400,
} satisfies SxProps<Theme>;

export const authSecondaryButtonSx = {
  ...authPrimaryButtonSx,
  color: "text.primary",
  bgcolor: "background.300",
  fontWeight: 600,
  "&:hover": {
    bgcolor: "background.400",
    boxShadow: "none",
  },
} satisfies SxProps<Theme>;

export const authPillButtonSx = {
  mt: 3,
  minWidth: "16.2rem",
  minHeight: "6rem",
  borderRadius: "5.3rem",
  bgcolor: "background.500",
  color: "common.white",
  typography: "authBody",
  textTransform: "none",
  boxShadow: "none",
  "&:hover": {
    bgcolor: "background.700",
    boxShadow: "none",
  },
} satisfies SxProps<Theme>;
