import { expect, test } from "@playwright/test";

test("homepage highlights the source-led workflow", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /source-led document intelligence for mineral value addition/i,
    }),
  ).toBeVisible();

  await expect(page.getByText(/render-backed fastapi worker/i)).toBeVisible();
});
