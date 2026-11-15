import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

async function reviewShot(page: Page, name: string, viewport: { width: number; height: number }) {
  await mkdir("artifacts/review", { recursive: true });
  await page.setViewportSize(viewport);
  await page.screenshot({ path: `artifacts/review/${name}.png`, fullPage: false, animations: "disabled" });
}

test("ranks investigations for a pressurized rover with visible, labeled factors", async ({ page }, info) => {
  await page.goto("/#habitats");
  const habitats = page.getByRole("region", { name: "Habitat relevance" });
  await expect(habitats.getByRole("heading", { name: "Habitat relevance" })).toBeVisible();
  await habitats.getByRole("tab", { name: /Pressurized rover/ }).click();
  await expect(habitats.getByText(/No investigation in this corpus is named as a rover study/)).toBeVisible();
  await expect(habitats.getByRole("heading", { name: "Cited habitat conditions" })).toBeVisible();
  await expect(habitats.locator(".evidence-label", { hasText: "Challenge context" }).first()).toBeVisible();
  await expect(habitats.getByText(/30% or greater/).first()).toBeVisible();
  await expect(habitats.getByText(/10\.2 psi or less/).first()).toBeVisible();

  const list = habitats.getByRole("navigation", { name: "Ranked investigations" });
  await expect(list.getByRole("button", { name: /ACME BRE/ })).toBeVisible();
  await list.getByRole("button", { name: /ACME BRE/ }).click();
  const detail = habitats.getByRole("article");
  await expect(detail.getByRole("heading", { name: "ACME BRE", exact: true })).toBeVisible();
  await expect(detail.locator(".habitat-tag", { hasText: "Not assessed" })).toBeVisible();
  await expect(detail.getByText(/26\.5%/)).toBeVisible();
  await expect(detail.getByText(/30%/)).toBeVisible();
  await expect(detail.getByText(/different cited values/)).toBeVisible();
  await expect(detail.getByText(/planned test condition/i)).toBeVisible();
  await expect(habitats.getByRole("heading", { name: "Indexed, not yet reviewed" })).toBeVisible();

  if (info.project.name === "desktop") {
    await reviewShot(page, "habitats-desktop", { width: 1440, height: 900 });
    await reviewShot(page, "habitats-mobile", { width: 390, height: 844 });
    await page.setViewportSize({ width: 1440, height: 900 });
  }
});

test("tags a spacecraft cabin only when a source names it", async ({ page }) => {
  await page.goto("/#habitats");
  const habitats = page.getByRole("region", { name: "Habitat relevance" });
  await habitats.getByRole("tab", { name: /Spacecraft cabin/ }).click();
  const list = habitats.getByRole("navigation", { name: "Ranked investigations" });
  await list.getByRole("button", { name: /PSI-39/ }).click();
  const detail = habitats.getByRole("article");
  await expect(detail.locator(".habitat-tag", { hasText: "Spacecraft cabin" })).toBeVisible();
  await expect(detail.getByText(/names this habitat class/)).toBeVisible();
  await list.getByRole("button", { name: /E-FIELD/ }).click();
  await expect(habitats.getByRole("article").locator(".habitat-tag", { hasText: "Not assessed" })).toBeVisible();
  await expect(habitats.getByRole("article").getByText(/not being conducted to serve any space applications/i)).toBeVisible();
});
