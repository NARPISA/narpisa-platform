import Box from "@mui/material/Box";

const DATABASE_LOGO_URL =
  "https://www.figma.com/api/mcp/asset/1addbfa0-512a-479f-9b6a-6a8aa6f7c1ef";

type DatabaseBrandLogoProps = {
  size?: number;
};

export default function DatabaseBrandLogo({ size = 56 }: DatabaseBrandLogoProps) {
  return (
    <Box
      component="img"
      src={DATABASE_LOGO_URL}
      alt="NaRPISA logo"
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
