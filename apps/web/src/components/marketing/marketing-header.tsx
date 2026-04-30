"use client";

import { useSession } from "@toolpad/core/useSession";
import { useState } from "react";
import Avatar from "@mui/material/Avatar";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { usePathname } from "next/navigation";

import BrandHomeLink from "@/components/brand-home-link";

type MarketingHeaderProps = {
  transparent?: boolean;
};

type MarketingNavLink = {
  label: string;
  href: string;
};

const NAV_LINKS: MarketingNavLink[] = [
  { label: "Database", href: "/database" },
  { label: "Network", href: "/network" },
  { label: "Map", href: "/map" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Login", href: "/signin" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

type HeaderProfileUser = {
  name?: string | null;
  email?: string | null;
};

function getProfileLabel(user: HeaderProfileUser) {
  const name = user.name?.trim();
  if (name) {
    return `Hi, ${name}`;
  }
  return user.email ?? "Profile";
}

function HeaderLink({
  href,
  label,
  active,
  color,
}: MarketingNavLink & { active: boolean; color: string }) {
  return (
    <Link
      href={href}
      underline="none"
      color={color}
      sx={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        minHeight: 32,
        fontSize: "1.55rem",
        fontWeight: 700,
        letterSpacing: "-0.01em",
        transition: "color 180ms ease",
        "&::after": {
          content: '""',
          position: "absolute",
          left: 0,
          bottom: -8,
          width: active ? "calc(100% + 16px)" : 0,
          height: 4,
          borderRadius: 999,
          bgcolor: "primary.main",
          transition: "width 220ms ease",
        },
        "&:hover": {
          color: "primary.main",
        },
        "&:hover::after": {
          width: "calc(100% + 16px)",
        },
      }}
    >
      {label}
    </Link>
  );
}

export default function MarketingHeader({ transparent = false }: MarketingHeaderProps) {
  const pathname = usePathname() ?? "";
  const session = useSession();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const profileLabel = session?.user ? getProfileLabel(session.user) : "Profile";

  const textColor = transparent ? "var(--marketing-header-fg, #ffffff)" : "text.primary";
  const transparentBorderColor = "var(--marketing-header-border, rgba(255,255,255,0.18))";

  return (
    <>
      <Box
        component="header"
        sx={{
          position: transparent ? "absolute" : "sticky",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          px: { xs: 2, sm: 2.5, md: 4 },
          py: { xs: 1.5, md: 2.25 },
          bgcolor: transparent ? "transparent" : "rgba(255,255,255,0.95)",
          borderBottom: transparent ? "none" : "1px solid rgba(28,48,146,0.08)",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{
            maxWidth: "1240px",
            mx: "auto",
            minHeight: 58,
          }}
        >
          <BrandHomeLink size={52} color={textColor} title="Alluvial AI" subtitle="a NaRPISA platform" />

          <Stack
            component="nav"
            aria-label="Primary"
            direction="row"
            alignItems="center"
            spacing={3.25}
            sx={{ display: { xs: "none", md: "flex" } }}
          >
            {NAV_LINKS.map((link) => (
              link.href === "/signin" && session?.user ? (
                <Button
                  key={link.href}
                  href="/profile"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1.25,
                    borderRadius: "999px",
                    px: 1.25,
                    py: 0.75,
                    minHeight: 48,
                    color: textColor,
                    bgcolor: transparent ? "rgba(255,255,255,0.12)" : "secondary.100",
                    border: "1px solid",
                    borderColor: "transparent",
                    textTransform: "none",
                    "&:hover": {
                      bgcolor: transparent ? "rgba(255,255,255,0.2)" : "secondary.200",
                      borderColor: transparent ? "rgba(255,255,255,0.3)" : "rgba(83,132,180,0.3)",
                    },
                  }}
                >
                  <Avatar
                    src={session.user.image ?? undefined}
                    alt={session.user.name ?? session.user.email ?? "Profile"}
                    sx={{
                      width: 34,
                      height: 34,
                      fontSize: "1.3rem",
                      bgcolor: transparent ? "rgba(255,255,255,0.22)" : "secondary.main",
                      color: "common.white",
                    }}
                  />
                  <Typography sx={{ fontSize: "1.45rem", fontWeight: 700, color: textColor }}>
                    {profileLabel}
                  </Typography>
                </Button>
              ) : (
                <HeaderLink
                  key={link.href}
                  {...link}
                  active={isActive(pathname, link.href)}
                  color={textColor}
                />
              )
            ))}
          </Stack>

          <IconButton
            aria-label="Open navigation menu"
            onClick={() => setDrawerOpen(true)}
            sx={{
              display: { xs: "inline-flex", md: "none" },
              color: textColor,
              border: "1px solid",
              borderColor: transparent ? transparentBorderColor : "rgba(83,132,180,0.18)",
            }}
          >
            <MenuRoundedIcon />
          </IconButton>
        </Stack>
      </Box>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 320,
            p: 3,
            bgcolor: "background.paper",
          },
        }}
      >
        <Stack spacing={2.5}>
          <BrandHomeLink size={48} title="Alluvial AI" color="text.primary" />
          {NAV_LINKS.filter((link) => !(link.href === "/signin" && session?.user)).map((link) => (
            <Button
              key={link.href}
              href={link.href}
              onClick={() => setDrawerOpen(false)}
              sx={{
                justifyContent: "flex-start",
                px: 0,
                py: 1,
                fontSize: "1.6rem",
                fontWeight: 700,
                color: isActive(pathname, link.href) ? "primary.main" : "text.primary",
              }}
            >
              {link.label}
            </Button>
          ))}
          {session?.user ? (
            <Box sx={{ pt: 1 }}>
              <Button
                href="/profile"
                onClick={() => setDrawerOpen(false)}
                sx={{
                  width: "100%",
                  justifyContent: "flex-start",
                  gap: 1.25,
                  px: 1,
                  py: 1,
                  borderRadius: 3,
                  textTransform: "none",
                  bgcolor: "secondary.100",
                  border: "1px solid transparent",
                  "&:hover": {
                    borderColor: "rgba(83,132,180,0.3)",
                  },
                }}
              >
                <Avatar
                  src={session.user.image ?? undefined}
                  alt={session.user.name ?? session.user.email ?? "Profile"}
                  sx={{
                    width: 36,
                    height: 36,
                    fontSize: "1.3rem",
                    bgcolor: "secondary.main",
                    color: "common.white",
                  }}
                />
                <Typography sx={{ fontSize: "1.55rem", fontWeight: 700, color: "text.primary" }}>
                  {profileLabel}
                </Typography>
              </Button>
            </Box>
          ) : null}
        </Stack>
      </Drawer>
    </>
  );
}
