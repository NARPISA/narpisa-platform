"use client";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import type { LicenseMapFeature } from "./map-types";
import { applicantItems, featureStatus } from "./map-utils";

type MapFeatureCardProps = {
  feature: LicenseMapFeature;
  onClose: () => void;
};

export default function MapFeatureCard({ feature, onClose }: MapFeatureCardProps) {
  const applicants = applicantItems(feature.properties.applicants);

  return (
    <Box
      sx={{
        position: "absolute",
        right: 16,
        bottom: 16,
        width: { xs: "calc(100% - 32px)", sm: 440 },
        bgcolor: "rgba(28,28,28,0.94)",
        color: "common.white",
        boxShadow: 5,
        borderRadius: "18px",
        p: 3,
        zIndex: 1,
      }}
    >
      <Stack spacing={1.6}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
          <Stack spacing={0.6}>
            <Typography sx={{ fontWeight: 800, color: "common.white", fontSize: "2.45rem", lineHeight: 1 }}>
              {feature.properties.licenseNo || "License"}
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.75)", fontSize: "1.08rem", fontWeight: 600 }}>
              {feature.properties.type}
            </Typography>
          </Stack>
          <IconButton
            size="medium"
            onClick={onClose}
            sx={{ color: "common.white", mt: -0.5, mr: -0.5 }}
          >
            <CloseRoundedIcon fontSize="medium" />
          </IconButton>
        </Stack>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.18)" }} />

        <Stack spacing={0.95}>
          <Typography sx={{ fontSize: "1.08rem", lineHeight: 1.38 }}>
            <Box component="span" sx={{ fontWeight: 800 }}>Region:</Box>{" "}
            {feature.properties.region || "Unknown"}
          </Typography>
          <Typography sx={{ fontSize: "1.08rem", lineHeight: 1.38 }}>
            <Box component="span" sx={{ fontWeight: 800 }}>Status:</Box>{" "}
            {featureStatus(feature)}
          </Typography>

          <Stack spacing={0.45}>
            <Typography sx={{ fontSize: "1.08rem", fontWeight: 800 }}>
              Applicants
            </Typography>
            {applicants.length > 0 ? (
              <List dense disablePadding sx={{ pl: 1 }}>
                {applicants.map((applicant) => (
                  <ListItem
                    key={applicant}
                    disablePadding
                    sx={{ display: "list-item", listStyleType: "disc", ml: 2, py: 0.2 }}
                  >
                    <ListItemText
                      primary={applicant}
                      slotProps={{
                        primary: {
                          sx: { color: "common.white", fontSize: "1.02rem", lineHeight: 1.38 },
                        },
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography sx={{ fontSize: "1rem", color: "rgba(255,255,255,0.72)" }}>
                Unknown
              </Typography>
            )}
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}
