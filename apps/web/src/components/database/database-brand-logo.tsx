import Box from "@mui/material/Box";

const DATABASE_LOGO_URL = "/logo.png";

type DatabaseBrandLogoProps = {
  size?: number;
};

export default function DatabaseBrandLogo({ size = 56 }: DatabaseBrandLogoProps) {
  return (
    <Box
      component="img"
      src={DATABASE_LOGO_URL}
      alt="NaRPISA logo"
      loading="eager"
      fetchPriority="high"
      decoding="async"
      sx={{
        width: size,
        height: size,
        objectFit: "cover",
        borderRadius: "50%",
        border: "2px solid #f0c700",
        bgcolor: "#f0c700",
      }}
    />
  );
}
