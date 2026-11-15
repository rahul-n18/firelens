import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { demoQueries } from "../lib/evidence";

async function reviewShot(page: Page, name: string, viewport: { width: number; height: number }) {
  await mkdir("artifacts/review", { recursive: true });
  await page.setViewportSize(viewport);
  await page.screenshot({ path: `artifacts/review/${name}.png`, fullPage: false, animations: "disabled" });
}

test("interprets a lunar measurement question without treating microgravity results as the answer", async ({ page }, info) => {
  await page.goto(`/?q=${encodeURIComponent(demoQueries[2])}#ask`);
  const answer = page.getByRole("region", { name: "Evidence answer" });
  const interpret = answer.getByRole("region", { name: "Interpretation" });
  await expect(interpret).toBeVisible();
  await expect(interpret.getByText(/assembled from verified claims with fixed templates/i)).toBeVisible();
  await expect(interpret.getByText(/does not call an AI model/i)).toBeVisible();
  await expect(interpret.getByText(/no reported measurement|no measured result/i).first()).toBeVisible();
  await expect(interpret.getByText(/nearest evidence/i).first()).toBeVisible();
  await expect(interpret.getByText(/^A measured result in this corpus states:/)).toHaveCount(0);

  if (info.project.name === "desktop") {
    await reviewShot(page, "interpret-desktop", { width: 1440, height: 900 });
    await reviewShot(page, "interpret-mobile", { width: 390, height: 844 });
    await page.setViewportSize({ width: 1440, height: 900 });
  }
});
