import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

async function reviewShot(page: Page, name: string, viewport: { width: number; height: number }) {
  await mkdir("artifacts/review", { recursive: true });
  await page.setViewportSize(viewport);
  await page.screenshot({ path: `artifacts/review/${name}.png`, fullPage: false, animations: "disabled" });
}

test("bounds Moon and rover atmospheres and partial gravity with labeled claim kinds", async ({ page }, info) => {
  await page.goto("/#bounds");
  const bounds = page.getByRole("region", { name: "Moon and rover bounds" });
  await expect(bounds.getByRole("heading", { name: "Moon and rover bounds" })).toBeVisible();
  await expect(bounds.getByText(/No measured Moon or rover cabin atmosphere is in this corpus/)).toBeVisible();
  await expect(bounds.getByRole("img", { name: /Cited Moon, rover, and comparison atmospheres/ })).toBeVisible();
  const table = bounds.getByRole("region", { name: "Cited atmosphere values" });
  await expect(table.getByRole("row", { name: /Moon base and pressurized rover/ })).toContainText("30% or greater");
  await expect(table.getByRole("row", { name: /Moon base and pressurized rover/ })).toContainText("10.2 psi or less");
  await expect(table.getByRole("row", { name: /Moon base and pressurized rover/ })).toContainText("Challenge context");
  await expect(table.getByRole("row", { name: /26\.5%/ })).toContainText("10.2 psia");
  await expect(table.getByRole("row", { name: /26\.5%/ })).toContainText("Planned test condition");
  await expect(table.getByText(/different cited figure/)).toBeVisible();
  await expect(bounds.getByRole("heading", { name: "E-FIELD is not a measured habitat partial-gravity result" })).toBeVisible();
  await expect(bounds.getByText(/not a measured partial-gravity fire result/)).toBeVisible();
  await expect(bounds.locator(".evidence-label", { hasText: "Challenge context" }).first()).toBeVisible();

  if (info.project.name === "desktop") {
    await reviewShot(page, "bounds-desktop", { width: 1440, height: 900 });
    await reviewShot(page, "bounds-mobile", { width: 390, height: 844 });
    await page.setViewportSize({ width: 1440, height: 900 });
  }
});
