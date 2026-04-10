"use client";

import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import { DATABASE_DRAWER_LINKS } from "@/app/database/database-types";
import NavUnderlineLink from "@/components/nav-underline-link";
import DatabaseBrandLogo from "./database-brand-logo";

type DatabaseNavDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export default function DatabaseNavDrawer({
  open,
  onClose,
}: DatabaseNavDrawerProps) {
  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 310,
          bgcolor: "secondary.main",
          color: "common.white",
          px: 3,
          py: 2,
        },
      }}
    >
      <Stack spacing={3}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <DatabaseBrandLogo size={56} />
            <Typography sx={{ fontSize: "2rem", fontWeight: 700 }}>
              minerals
            </Typography>
          </Stack>
          <IconButton onClick={onClose} sx={{ color: "common.white" }}>
            <CloseRoundedIcon />
          </IconButton>
        </Stack>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.35)" }} />

        <Stack spacing={2}>
          {DATABASE_DRAWER_LINKS.map((item) => {
            const isActive = item.label === "Database";
            return (
              <Box key={item.href}>
                <NavUnderlineLink
                  href={item.href}
                  label={item.label}
                  active={isActive}
                  color="inherit"
                  fontSize="2rem"
                />
              </Box>
            );
          })}
        </Stack>
      </Stack>
    </Drawer>
  );
}
