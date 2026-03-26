"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import { alpha, useTheme } from "@mui/material/styles";
import type { SxProps, Theme } from "@mui/material/styles";
import DottedMap from "dotted-map/without-countries";

import { PinContainer } from "@/components/ui/3d-pin";

import africaMapJson from "./ui/africa-map-data";

interface Marker {
  lat: number;
  lng: number;
  label?: string;
  href?: string;
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

  const { svgMap, mapWidth, mapHeight, positionedMarkers } = useMemo(() => {
    const map = new DottedMap({
      map: JSON.parse(africaMapJson as string),
    });

    const svg = map.getSVG({
      radius: 0.22,
      color: isDark ? dotColorDark : dotColorLight,
      shape: "circle",
      backgroundColor: isDark ? backgroundColorDark : backgroundColorLight,
    });

    const positioned = [];
    for (const marker of markers) {
      const point = map.getPin({ lat: marker.lat, lng: marker.lng });
      if (point) {
        positioned.push({ marker, point });
      }
    }

    return {
      svgMap: svg,
      mapWidth: map.image.width,
      mapHeight: map.image.height,
      positionedMarkers: positioned,
    };
  }, [
    isDark,
    markers,
    dotColorLight,
    dotColorDark,
    backgroundColorLight,
    backgroundColorDark,
  ]);

  const pinHoverDepth = useRef(0);
  const [mapTilted, setMapTilted] = useState(false);

  const handlePinHoverChange = useCallback((hovered: boolean) => {
    pinHoverDepth.current += hovered ? 1 : -1;
    if (pinHoverDepth.current < 0) {
      pinHoverDepth.current = 0;
    }
    setMapTilted(pinHoverDepth.current > 0);
  }, []);

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100%",
        borderRadius: 2,
        position: "relative",
        overflow: "hidden",
        py: 2,
        px: 0.5,
        ...sx,
      }}
    >
      <Box
        sx={{
          perspective: "1000px",
          perspectiveOrigin: "50% 45%",
          position: "relative",
          width: "100%",
          maxWidth: "100%",
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: "100%",
            maxWidth: "100%",
            aspectRatio: `${mapWidth} / ${mapHeight}`,
            transformStyle: "preserve-3d",
            transition:
              "transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)",
            transform: mapTilted
              ? "rotateX(40deg) translateZ(0)"
              : "rotateX(0deg) translateZ(0)",
            borderRadius: 2,
          }}
        >
          <Box
            component="img"
            src={`data:image/svg+xml;utf8,${encodeURIComponent(svgMap)}`}
            alt="Africa dotted map"
            draggable={false}
            sx={{
              position: "absolute",
              inset: 0,
              height: "100%",
              width: "100%",
              objectFit: "fill",
              pointerEvents: "none",
              userSelect: "none",
              display: "block",
              borderRadius: 2,
              transform: "translateZ(0)",
            }}
          />

          <Box
            sx={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              transformStyle: "preserve-3d",
            }}
          >
            {positionedMarkers.map(({ marker, point }, index) => (
              <Box
                key={`${marker.lat}-${marker.lng}`}
                sx={{
                  position: "absolute",
                  left: `${(point.x / mapWidth) * 100}%`,
                  top: `${(point.y / mapHeight) * 100}%`,
                  transform:
                    "translate(-50%, -50%) translateZ(28px)",
                  transformStyle: "preserve-3d",
                  zIndex: 10 + index,
                  pointerEvents: "auto",
                }}
              >
                <PinContainer
                  title={marker.label}
                  href={marker.href}
                  anchorOnly
                  onHoverChange={handlePinHoverChange}
                >
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      bgcolor: markerColor,
                      boxShadow: `0 0 0 2px ${alpha(markerColor, 0.35)}`,
                    }}
                  />
                </PinContainer>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
