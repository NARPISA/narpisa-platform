import type { CSSProperties } from "react";
import { createTheme } from "@mui/material/styles";

const fontMain = 'var(--font-manrope), "Helvetica Neue", Arial, sans-serif';
const fontStyle = 'var(--font-bruno-ace), var(--font-chathura), sans-serif';

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
  }

  interface PaletteOptions {
    tertiary?: ExtendedColorScale;
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
        },
        "body .MuiDataGrid-panel .MuiDataGrid-filterForm .MuiInputBase-root": {
          minHeight: "auto !important",
        },
      },
    },
  },
});

export default theme;
