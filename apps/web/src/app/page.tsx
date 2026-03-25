import Box from "@mui/material/Box";

import AfricaMapFrame from "@/components/africa-map-frame";
import GlassNav from "@/components/glass-nav";
import MineralHero from "@/components/mineral-hero";

export default function Home() {
  return (
    <Box
      component="main"
      sx={{
        bgcolor: "background.default",
        overflowX: "hidden",
      }}
    >
      <GlassNav />
      <MineralHero />
      <AfricaMapFrame />
    </Box>
  );
}
