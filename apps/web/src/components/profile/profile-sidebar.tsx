"use client";

import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/profile", label: "Profile", prefixMatch: false },
  { href: "/profile/password", label: "Security", prefixMatch: true },
  { href: "/profile/users", label: "Users", prefixMatch: true },
] as const;

function isActive(pathname: string, href: string, prefixMatch: boolean) {
  if (prefixMatch) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return pathname === href;
}

type ProfileSidebarProps = {
  isAdmin: boolean;
};

export default function ProfileSidebar({ isAdmin }: ProfileSidebarProps) {
  const pathname = usePathname() ?? "";
  const visibleNavItems = NAV_ITEMS.filter((item) => isAdmin || item.href !== "/profile/users");

  return (
    <Paper
      elevation={0}
      sx={{
        width: { xs: "100%", md: 232 },
        flexShrink: 0,
        p: 1.25,
        borderRadius: 1,
        border: "1px solid rgba(83,132,180,0.18)",
        bgcolor: "background.paper",
      }}
    >
      <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {visibleNavItems.map(({ href, label, prefixMatch }) => {
          const active = isActive(pathname, href, prefixMatch);
          return (
            <ListItemButton
              key={href}
              component={Link}
              href={href}
              prefetch={false}
              selected={active}
              sx={{
                borderRadius: 1,
                py: 1.35,
                px: 2,
                "&.Mui-selected": {
                  bgcolor: "secondary.100",
                  border: "1px solid",
                  borderColor: "secondary.main",
                  "&:hover": { bgcolor: "secondary.200" },
                },
                "&:not(.Mui-selected)": {
                  border: "1px solid transparent",
                },
              }}
            >
              <ListItemText
                primary={label}
                primaryTypographyProps={{
                  sx: { fontSize: "1.15rem", fontWeight: active ? 700 : 600 },
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Paper>
  );
}
