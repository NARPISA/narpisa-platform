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
      default: "#252827",
      main: "#252827",
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
    error: {
      main: "#8d3434",
      light: "#b04a4a",
      dark: "#6b2828",
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
    MuiCssBaseline: {
      styleOverrides: {
        html: {
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
      },
    },
  },
});

export default theme;
