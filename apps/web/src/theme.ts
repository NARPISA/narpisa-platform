import type { CSSProperties } from "react";
import { createTheme } from "@mui/material/styles";

const fontMain = "var(--font-manrope), 'Helvetica Neue', Arial, sans-serif";
const fontStyle = "var(--font-manrope), 'Helvetica Neue', Arial, sans-serif";

type ExtendedColorScale = {
  main: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
};

type HomePalette = {
  heroOverlay: string;
  heroTint: string;
  heroGradient: string;
  featuresSectionBg: string;
  featuresSectionBorder: string;
  featuresCardBg: string;
  featuresCardSubtle: string;
  investorsSectionBg: string;
  investorsHeading: string;
  investorsBody: string;
  investorsTileBg: string;
  investorsTileBorder: string;
  investorsBannerBg: string;
  investorsBannerBorder: string;
  glassButtonBg: string;
  glassButtonBorder: string;
};

declare module "@mui/material/styles" {
  interface TypeBackground {
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    main: string;
  }

  interface Palette {
    tertiary: ExtendedColorScale;
    home: HomePalette;
  }

  interface PaletteOptions {
    tertiary?: ExtendedColorScale;
    home?: HomePalette;
  }

  interface TypographyVariants {
    authTitle: CSSProperties;
    authBody: CSSProperties;
    authLabel: CSSProperties;
    authInput: CSSProperties;
    authAction: CSSProperties;
    style: CSSProperties;
  }

  interface TypographyVariantsOptions {
    authTitle?: CSSProperties;
    authBody?: CSSProperties;
    authLabel?: CSSProperties;
    authInput?: CSSProperties;
    authAction?: CSSProperties;
    style?: CSSProperties;
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    authTitle: true;
    authBody: true;
    authLabel: true;
    authInput: true;
    authAction: true;
    style: true;
  }
}

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#F07213",
      100: "#fff0e5",
      200: "#ffd4b3",
      300: "#F07213",
      400: "#e06510",
      500: "#be5510",
      600: "#8f3f0c",
      700: "#5c2808",
    },
    secondary: {
      main: "#5384B4",
      100: "#e8eef5",
      200: "#c5d4e6",
      300: "#9fb8d4",
      400: "#7699c0",
      500: "#5384B4",
      600: "#3d6489",
      700: "#2a435c",
    },
    tertiary: {
      main: "#1C3092",
      100: "#e7ebfb",
      200: "#c0caf2",
      300: "#96a6e8",
      400: "#6a80dc",
      500: "#4560c8",
      600: "#3248af",
      700: "#1C3092",
    },
    home: {
      heroOverlay: "rgba(28, 48, 146, 0.12)",
      heroTint: "rgba(83,132,180,0.14)",
      heroGradient:
        "linear-gradient(90deg, rgba(28, 48, 146, 0.12) 0%, rgba(28, 48, 146, 0.08) 42%, rgba(28, 48, 146, 0.04) 100%)",
      featuresSectionBg: "rgba(23,36,56,0.88)",
      featuresSectionBorder: "rgba(255,255,255,0.14)",
      featuresCardBg: "rgba(95,104,122,0.58)",
      featuresCardSubtle: "rgba(255,255,255,0.92)",
      investorsSectionBg: "#f4f4f6",
      investorsHeading: "rgba(15,18,28,0.95)",
      investorsBody: "rgba(30,35,45,0.9)",
      investorsTileBg: "#e4e4e7",
      investorsTileBorder: "rgba(33,43,56,0.08)",
      investorsBannerBg: "rgba(33,41,56,0.78)",
      investorsBannerBorder: "rgba(255,255,255,0.16)",
      glassButtonBg: "rgba(99, 57, 24, 0.56)",
      glassButtonBorder: "rgba(255,255,255,0.12)",
    },
    background: {
      default: "#F6F6F6",
      paper: "#FFFFFF",
      main: "#F6F6F6",
      100: "#FFFFFF",
      200: "#F6F6F6",
      300: "#D6D6D6",
      400: "#A3A3A3",
      500: "#8C8C8C",
      600: "#777777",
      700: "#494949",
    },
    text: {
      primary: "#494949",
      secondary: "#8C8C8C",
    },
    success: {
      main: "#01A538",
      light: "rgba(172, 255, 200, 0.5)",
      dark: "#016e2a",
      contrastText: "#FFFFFF",
    },
    error: {
      main: "#C70000",
      light: "rgba(255, 172, 172, 0.5)",
      dark: "#9e0000",
      contrastText: "#FFFFFF",
    },
  },
  shape: {
    borderRadius: 20,
  },
  typography: {
    fontFamily: fontMain,
    h1: {
      fontFamily: fontStyle,
      fontWeight: 400,
      fontSize: "9.7rem",
    },
    h2: {
      fontFamily: fontStyle,
      fontWeight: 400,
      fontSize: "8rem",
    },
    h3: {
      fontFamily: fontStyle,
      fontWeight: 400,
      fontSize: "6rem",
    },
    h4: {
      fontFamily: fontStyle,
      fontWeight: 400,
      fontSize: "4rem",
    },
    h5: {
      fontFamily: fontStyle,
      fontWeight: 400,
      fontSize: "2rem",
    },
    h6: {
      fontFamily: fontStyle,
      fontWeight: 400,
      fontSize: "1.5rem",
    },
    body1: {
      fontFamily: fontMain,
      fontWeight: 400,
      fontSize: "3rem",
    },
    body2: {
      fontFamily: fontMain,
      fontWeight: 400,
      fontSize: "4rem",
    },
    authTitle: {
      fontFamily: fontStyle,
      fontWeight: 400,
      fontSize: "6rem",
      lineHeight: 1.15,
    },
    authBody: {
      fontFamily: fontMain,
      fontWeight: 400,
      fontSize: "2.2rem",
      lineHeight: 1.4,
    },
    authLabel: {
      fontFamily: fontMain,
      fontWeight: 400,
      fontSize: "2.2rem",
      lineHeight: 1.25,
    },
    authInput: {
      fontFamily: fontMain,
      fontWeight: 400,
      fontSize: "2.2rem",
      lineHeight: 1.25,
    },
    authAction: {
      fontFamily: fontMain,
      fontWeight: 400,
      fontSize: "3rem",
      lineHeight: 1.25,
    },
    style: {
      fontFamily: fontStyle,
      fontWeight: 400,
      fontSize: "1.25rem",
      lineHeight: 1.3,
      letterSpacing: "0.04em",
    },
    button: {
      textTransform: "none",
      fontWeight: 400,
      fontSize: "2rem",
    },
  },
  components: {
    MuiMenuItem: {
      styleOverrides: {
        root: {
          minHeight: 34,
          fontSize: "0.82rem",
          lineHeight: 1.25,
          fontWeight: 500,
        },
      },
    },
    MuiListSubheader: {
      styleOverrides: {
        root: {
          fontSize: "0.8rem",
          lineHeight: 1.25,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          fontFamily: fontMain,
          fontSize: "2rem",
          fontWeight: 400,
          lineHeight: 1.3,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: fontMain,
          fontSize: "0.95rem",
          lineHeight: 1.25,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: fontMain,
          fontSize: "1.15rem",
          lineHeight: 1.3,
          fontWeight: 800,
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontFamily: fontMain,
          fontSize: "0.95rem",
          lineHeight: 1.35,
        },
        input: {
          fontFamily: fontMain,
          fontSize: "0.95rem",
          lineHeight: 1.35,
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontFamily: fontMain,
          fontSize: "0.9rem",
          lineHeight: 1.25,
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          fontFamily: fontMain,
          fontSize: "0.74rem",
          lineHeight: 1.3,
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          fontSize: "62.5%",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        },
        body: {
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        },
        "body .MuiDataGrid-panel .MuiDataGrid-filterForm": {
          padding: "4px 8px !important",
          gap: "4px !important",
          minHeight: "auto !important",
          fontSize: "0.74rem",
        },
        "body .MuiDataGrid-panel .MuiDataGrid-filterForm .MuiInputBase-root": {
          minHeight: "auto !important",
          fontSize: "0.74rem",
        },
        "body .MuiDataGrid-panel .MuiDataGrid-filterForm .MuiFormLabel-root": {
          fontSize: "0.72rem",
        },
        "body .MuiDataGrid-panel .MuiDataGrid-filterForm .MuiInputBase-input, body .MuiDataGrid-panel .MuiDataGrid-filterForm .MuiSelect-select":
          {
            fontSize: "0.74rem",
          },
        "body .MuiDataGrid-panel .MuiDataGrid-filterForm .MuiIconButton-root": {
          padding: "4px",
        },
        "body .MuiDataGrid-panel .MuiDataGrid-columnsManagement": {
          fontSize: "0.74rem",
        },
        "body .MuiDataGrid-panel .MuiDataGrid-columnsManagementHeader": {
          padding: "8px 12px 4px",
        },
        "body .MuiDataGrid-panel .MuiDataGrid-columnsManagementSearchInput .MuiInputBase-root":
          {
            minHeight: "34px",
            fontSize: "0.78rem",
          },
        "body .MuiDataGrid-panel .MuiDataGrid-columnsManagementSearchInput .MuiInputBase-input":
          {
            paddingTop: "7px",
            paddingBottom: "7px",
          },
        "body .MuiDataGrid-panel .MuiDataGrid-columnsManagementRow": {
          fontSize: "0.74rem",
        },
        "body .MuiDataGrid-panel .MuiDataGrid-columnsManagementFooter": {
          padding: "6px 12px 10px",
        },
        "body .MuiDataGrid-panel .MuiDataGrid-columnsManagementFooter .MuiButton-root":
          {
            minWidth: "auto",
            padding: "4px 10px",
            fontSize: "0.72rem",
          },
        "body .MuiDataGrid-menu .MuiMenuItem-root": {
          minHeight: "34px",
          fontSize: "0.74rem",
        },
        "body .MuiDataGrid-menu .MuiMenuItem-root .MuiTypography-root, body .MuiDataGrid-menu .MuiMenuItem-root .MuiListItemText-primary":
          {
            fontSize: "0.74rem",
            lineHeight: 1.2,
          },
        "body .MuiDataGrid-menu .MuiListItemIcon-root": {
          minWidth: "24px",
        },
        "body .MuiDataGrid-menu .MuiSvgIcon-root": {
          fontSize: "0.95rem",
        },
      },
    },
  },
});

export default theme;
