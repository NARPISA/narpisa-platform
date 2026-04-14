import Link from "@mui/material/Link";

type NavUnderlineLinkProps = {
  href: string;
  label: string;
  active?: boolean;
  color?: string;
  fontSize?: string | { xs: string; sm?: string; md?: string; lg?: string };
};

export default function NavUnderlineLink({
  href,
  label,
  active = false,
  color = "inherit",
  fontSize = "1rem",
}: NavUnderlineLinkProps) {
  return (
    <Link
      href={href}
      underline="none"
      color={color}
      sx={{
        position: "relative",
        display: "inline-block",
        lineHeight: 1.2,
        pb: 0.25,
        fontWeight: 700,
        fontSize,
        transition: "color 0.2s ease",
        "&::after": {
          content: '""',
          position: "absolute",
          left: 0,
          right: 0,
          bottom: -3,
          height: 3,
          bgcolor: "primary.main",
          transform: active ? "scaleX(1)" : "scaleX(0)",
          transformOrigin: "center",
          transition: "transform 0.25s ease",
        },
        "&:hover": {
          color: "primary.main",
        },
        "&:hover::after": {
          transform: "scaleX(1)",
        },
      }}
    >
      {label}
    </Link>
  );
}
