import { expect, test } from "@playwright/test";

test("homepage renders the MINERAL DB hero", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /mineral\s+db/i }),
  ).toBeVisible();
});

test("homepage navigation links to the database page", async ({ page }) => {
  await page.goto("/");

  const dbLink = page.getByRole("link", { name: /database/i });
  await expect(dbLink).toBeVisible();
  await expect(dbLink).toHaveAttribute("href", "/data_input");
});
