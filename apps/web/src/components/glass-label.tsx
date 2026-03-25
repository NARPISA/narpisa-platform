"use client";

import Box, { type BoxProps } from "@mui/material/Box";

import GlassSurface, { type GlassSurfaceProps } from "./glass-surface";

type GlassLabelProps = Omit<BoxProps, "component"> & {
  glass?: Partial<GlassSurfaceProps>;
};

export default function GlassLabel({
  children = "label",
  sx,
  glass,
  ...props
}: GlassLabelProps) {
  return (
    <GlassSurface borderRadius={10} {...glass}>
      <Box
        component="span"
        sx={[
          (theme) => ({
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            paddingInline: "0.5em",
            paddingBlock: "0.22em",
            color: theme.palette.common.white,
            fontFamily: theme.typography.fontFamily,
            fontSize: theme.typography.button.fontSize,
            fontWeight: 400,
            lineHeight: 1,
            textAlign: "center",
          }),
          ...(sx === undefined || sx === null
            ? []
            : Array.isArray(sx)
              ? sx
              : [sx]),
        ]}
        {...props}
      >
        {children}
      </Box>
    </GlassSurface>
  );
}
