import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import MarketingShell from "@/components/marketing/marketing-shell";

const PLANS = [
  {
    id: "basic",
    name: "Basic",
    accent: "#f47a10",
    price: "FREE",
    priceSubtext: "",
    intro: "",
    features: ["Database access"],
  },
  {
    id: "silver",
    name: "Silver",
    accent: "#9ea4ac",
    price: "$49",
    priceSubtext: "monthly",
    intro: "Basic, plus",
    features: ["Data Exporting", "Precise Filtering"],
  },
  {
    id: "gold",
    name: "Gold",
    accent: "#f4cb06",
    price: "$99",
    priceSubtext: "monthly",
    intro: "Silver, plus",
    features: ["Networking Hub", "Map Access"],
  },
  {
    id: "platinum",
    name: "Platinum",
    accent: "#28389a",
    price: "$249",
    priceSubtext: "monthly",
    intro: "Gold, plus",
    features: ["Premium Support", "Priority Access", "Custom Tools"],
  },
] as const;

export default function PricingPage() {
  return (
    <MarketingShell>
      <Container maxWidth={false} sx={{ maxWidth: "1240px", pt: { xs: 6, md: 7.5 }, pb: { xs: 8, md: 10 } }}>
        <Stack spacing={4} sx={{ transform: "translateY(-10px)" }}>
          <Typography
            component="h1"
            sx={{
              color: "primary.main",
              textAlign: "center",
              fontSize: { xs: "3rem", md: "5.4rem" },
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 0.95,
            }}
          >
            Monetization Model
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
              gap: { xs: 2, md: 2.5 },
            }}
          >
            {PLANS.map((plan) => (
              <Box
                key={plan.id}
                sx={{
                  borderRadius: 2,
                  overflow: "hidden",
                  border: "2px solid",
                  borderColor: plan.accent,
                  bgcolor: "background.paper",
                }}
              >
                <Box
                  sx={{
                    bgcolor: plan.accent,
                    color: "common.white",
                    py: 1.2,
                    textAlign: "center",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: { xs: "2.1rem", md: "2.5rem" },
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
                    {plan.name}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    p: { xs: 2.5, md: 3 },
                    minHeight: { xs: 340, md: 405 },
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Typography sx={{ fontSize: { xs: "5.2rem", md: "7rem" }, fontWeight: 800, color: "#121212" }}>
                    {plan.price}
                  </Typography>
                  {plan.priceSubtext ? (
                    <Typography sx={{ fontSize: "2.6rem", fontWeight: 700, color: "#121212", mt: -0.75 }}>
                      {plan.priceSubtext}
                    </Typography>
                  ) : null}

                  {plan.intro ? (
                    <Typography sx={{ mt: 2.2, mb: 1.2, fontSize: "3.2rem", color: "#1b1b1b" }}>
                      <Box component="span" sx={{ fontWeight: 800 }}>
                        {plan.intro.split(",")[0]}
                      </Box>
                      <Box component="span" sx={{ fontWeight: 500 }}>
                        {plan.intro.includes(",") ? `,${plan.intro.split(",").slice(1).join(",")}` : ""}
                      </Box>
                    </Typography>
                  ) : (
                    <Box sx={{ mt: 2.2, mb: 1.2 }} />
                  )}

                  <Stack sx={{ flex: 1, justifyContent: "center", mt: { xs: 1.5, md: 2 } }}>
                    <Stack spacing={0.8} alignItems="center">
                      {plan.features.map((feature) => (
                        <Stack key={feature} direction="row" spacing={0.8} alignItems="center">
                          <CheckRoundedIcon sx={{ fontSize: "1.9rem", color: "#1b1b1b" }} />
                          <Typography sx={{ fontSize: "2.3rem", color: "#1b1b1b", lineHeight: 1.25 }}>
                            {feature}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Stack>
                </Box>
              </Box>
            ))}
          </Box>
        </Stack>
      </Container>
    </MarketingShell>
  );
}

