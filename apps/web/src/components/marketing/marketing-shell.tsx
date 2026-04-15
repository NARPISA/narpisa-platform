import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";

import MarketingHeader from "./marketing-header";

type MarketingShellProps = {
  children: ReactNode;
  headerTransparent?: boolean;
  sx?: SxProps<Theme>;
};

export default function MarketingShell({
  children,
  headerTransparent = false,
  sx,
}: MarketingShellProps) {
  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100svh",
        bgcolor: "background.default",
        overflow: "hidden",
        ...sx,
      }}
    >
      <MarketingHeader transparent={headerTransparent} />
      <Box component="main" sx={{ position: "relative", zIndex: 1 }}>
        {children}
      </Box>
    </Box>
  );
}
