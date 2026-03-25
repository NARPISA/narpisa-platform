import type { CSSProperties } from "react";
import { createTheme } from "@mui/material/styles";

const fontMain = 'var(--font-chathura), "Helvetica Neue", Arial, sans-serif';
const fontStyle = 'var(--font-bruno-ace), var(--font-chathura), sans-serif';

type CustomScale = {
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  main: string;
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
    ternary: CustomScale;
    accent: CustomScale;
  }

  interface PaletteOptions {
    ternary?: CustomScale;
    accent?: CustomScale;
  }

  interface TypographyVariants {
    style: CSSProperties;
  }

  interface TypographyVariantsOptions {
    style?: CSSProperties;
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    style: true;
  }
}

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#71A89E",
      100: "#c6f6ed",
      200: "#8ed1c5",
      300: "#71A89E",
      400: "#568179",
      500: "#3c5c56",
      600: "#233935",
      700: "#0d1917",
    },
    secondary: {
      main: "#C6D0CD",
      100: "#edf2f0",
      200: "#C6D0CD",
      300: "#a0a9a6",
      400: "#7c8381",
      500: "#5a5f5d",
      600: "#3a3d3c",
      700: "#1c1e1e",
    },
    background: {
      default: "#434846",
      main: "#434846",
      100: "#d0ddd9",
      200: "#abb5b2",
      300: "#868f8c",
      400: "#646a68",
      500: "#434846",
      600: "#252827",
      700: "#101111",
    },
    accent: {
      100: "#f2eff9",
      200: "#cfc7e8",
      300: "#ab9cd7",
      400: "#8971c5",
      500: "#6849a8",
      600: "#432E6F",
      700: "#21153B",
      main: "#432E6F",
    },
    text: {
      primary: "#C6D0CD",
      secondary: "#71A89E",
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
      lineHeight: 1.1,
    },
    h2: {
      fontFamily: fontStyle,
      fontWeight: 400,
      lineHeight: 1.2,
    },
    h3: {
      fontFamily: fontStyle,
      fontWeight: 400,
    },
    h4: {
      fontFamily: fontStyle,
      fontWeight: 400,
    },
    h5: {
      fontFamily: fontStyle,
      fontWeight: 400,
    },
    h6: {
      fontFamily: fontStyle,
      fontWeight: 400,
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
      fontWeight: 700,
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 20,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 12px 32px rgba(25, 24, 17, 0.12)",
        },
      },
    },
  },
});

export default theme;
