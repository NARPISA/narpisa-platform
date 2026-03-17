import type { PropsWithChildren, ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";

type SectionCardProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
  footer?: ReactNode;
}>;

export function SectionCard({
  eyebrow,
  title,
  description,
  footer,
  children,
}: SectionCardProps) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        borderColor: "divider",
      }}
    >
      <CardContent sx={{ p: 3.5 }}>
        <Typography
          color="primary.main"
          sx={{
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </Typography>
        <Typography sx={{ mt: 1.5 }} variant="h5" color="text.primary">
          {title}
        </Typography>
        <Typography sx={{ mt: 1.5 }} variant="body2" color="text.secondary">
          {description}
        </Typography>
        {children ? <Box sx={{ mt: 3 }}>{children}</Box> : null}
        {footer ? (
          <Typography sx={{ mt: 3 }} variant="body2" color="text.secondary">
            {footer}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}
