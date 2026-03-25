"use client";

import { useMemo } from "react";
import Box from "@mui/material/Box";
import { alpha, useTheme } from "@mui/material/styles";
import type { SxProps, Theme } from "@mui/material/styles";
import DottedMap from "dotted-map/without-countries";

import africaMapJson from "./africa-map-data";

interface Marker {
  lat: number;
  lng: number;
  label?: string;
}

export interface AfricaMapProps {
  markers?: Marker[];
  markerColor?: string;
  dotColorLight?: string;
  dotColorDark?: string;
  backgroundColorLight?: string;
  backgroundColorDark?: string;
  sx?: SxProps<Theme>;
}

export default function AfricaMap(props: AfricaMapProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const {
    markers = [],
    markerColor = theme.palette.primary.main,
    dotColorLight = alpha(theme.palette.common.black, 0.25),
    dotColorDark = alpha(theme.palette.common.white, 0.25),
    backgroundColorLight = theme.palette.background.paper,
    backgroundColorDark = theme.palette.background.default,
    sx,
  } = props;

  const svgMap = useMemo(() => {
    const map = new DottedMap({
      map: JSON.parse(africaMapJson as string),
    });

    for (const marker of markers) {
      map.addPin({
        lat: marker.lat,
        lng: marker.lng,
        svgOptions: {
          color: markerColor,
          radius: 0.45,
        },
        data: {
          label: marker.label,
        },
      });
    }

    return map.getSVG({
      radius: 0.22,
      color: isDark ? dotColorDark : dotColorLight,
      shape: "circle",
      backgroundColor: isDark ? backgroundColorDark : backgroundColorLight,
    });
  }, [
    isDark,
    markers,
    markerColor,
    dotColorLight,
    dotColorDark,
    backgroundColorLight,
    backgroundColorDark,
  ]);

  return (
    <Box
      sx={{
        width: "100%",
        borderRadius: 2,
        position: "relative",
        overflow: "hidden",
        ...sx,
      }}
    >
      <Box
        component="img"
        src={`data:image/svg+xml;utf8,${encodeURIComponent(svgMap)}`}
        alt="Africa dotted map"
        draggable={false}
        sx={{
          height: "100%",
          width: "100%",
          objectFit: "contain",
          pointerEvents: "none",
          userSelect: "none",
          display: "block",
        }}
      />
    </Box>
  );
}
