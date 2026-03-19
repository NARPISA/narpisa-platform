import { createTheme } from "@mui/material/styles";

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
}

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#FFA102",
      100: "#ffd6ba",
      200: "#FFA102",
      300: "#cb7f00",
      400: "#995f00",
      500: "#6a4000",
      600: "#3e2400",
      700: "#1c0e00",
    },
    secondary: {
      main: "#BC2D29",
      100: "#fceded",
      200: "#f8caca",
      300: "#f39392",
      400: "#ef4f4c",
      500: "#BC2D29",
      600: "#801c19",
      700: "#490b0a",
    },
    background: {
      default: "#F4EED1",
      main: "#F4EED1",
      100: "#F4EED1",
      200: "#cec69f",
      300: "#a59f80",
      400: "#7f7a61",
      500: "#5a5744",
      600: "#383629",
      700: "#191811",
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
      primary: "#181817",
      secondary: "#575653",
    },
    grey: {
      100: "#eeede9",
      200: "#c6c5bf",
      300: "#9f9e9a",
      400: "#7a7976",
      500: "#575653",
      600: "#363534",
      700: "#181817",
    },
  },
  shape: {
    borderRadius: 20,
  },
  typography: {
    fontFamily: "var(--font-geist-sans), Arial, Helvetica, sans-serif",
    h1: {
      fontWeight: 700,
      lineHeight: 1.1,
    },
    h2: {
      fontWeight: 700,
      lineHeight: 1.2,
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
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
