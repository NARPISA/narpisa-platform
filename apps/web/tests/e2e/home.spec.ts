import { expect, test } from "@playwright/test";

test("homepage links to the PDF queue testing page", async ({ page }) => {
  await page.goto("/");

  const testerLink = page.getByRole("link", { name: /open pdf link tester/i });
  await expect(testerLink).toBeVisible();
  await testerLink.click();
});
