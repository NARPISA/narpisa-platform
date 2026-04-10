import type { Metadata } from "next";
import { Bruno_Ace, Chathura, Manrope } from "next/font/google";
import Box from "@mui/material/Box";

import SiteFooter from "@/components/site-footer";
import ThemeRegistry from "@/components/theme-registry";

import "./globals.css";

/** Primary UI copy: body, forms, dense UI text */
const chathura = Chathura({
  variable: "--font-chathura",
  subsets: ["latin"],
  weight: ["100", "300", "400", "700", "800"],
  display: "swap",
});

/** Display / “style” headings and accent typography */
const brunoAce = Bruno_Ace({
  variable: "--font-bruno-ace",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NaRPISA Platform",
  description:
    "Source-led intelligence platform for mineral value addition, document parsing, and trading workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${chathura.variable} ${brunoAce.variable} ${manrope.variable} antialiased`}
      >
        <ThemeRegistry>
          <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <Box sx={{ position: "relative", zIndex: 1, flex: 1 }}>{children}</Box>
            <Box sx={{ position: "sticky", bottom: 0, zIndex: 0 }}>
              <SiteFooter />
            </Box>
          </Box>
        </ThemeRegistry>
      </body>
    </html>
  );
}
