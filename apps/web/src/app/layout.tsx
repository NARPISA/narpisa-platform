import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Box from "@mui/material/Box";
import { Suspense } from "react";

import SiteFooter from "@/components/site-footer";
import ThemeRegistry from "@/components/theme-registry";
import ToolpadProviders from "@/components/toolpad-providers";

import "./globals.css";

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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${manrope.variable} antialiased`}
      >
        <ThemeRegistry>
          <Suspense fallback={null}>
            <ToolpadProviders>
              <Box
                sx={{
                  minHeight: "100vh",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Box sx={{ position: "relative", zIndex: 1, flex: 1 }}>
                  {children}
                </Box>
                <SiteFooter />
              </Box>
            </ToolpadProviders>
          </Suspense>
        </ThemeRegistry>
      </body>
    </html>
  );
}
