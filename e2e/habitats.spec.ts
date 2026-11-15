import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

async function reviewShot(page: Page, name: string, viewport: { width: number; height: number }) {
  await mkdir("artifacts/review", { recursive: true });
  await page.setViewportSize(viewport);
  const layout = page.getByRole("navigation", { name: "Ranked investigations" });
  await layout.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `artifacts/review/${name}.png`, fullPage: false, animations: "disabled" });
}

test("ranks investigations for a pressurized rover with a FireLens score and visible factors", async ({ page }, info) => {
  await page.goto("/#habitats");
  const habitats = page.getByRole("region", { name: "Habitat relevance" });
  await expect(habitats.getByRole("heading", { name: "Habitat relevance" })).toBeVisible();
  await habitats.getByRole("tab", { name: /Pressurized rover/ }).click();
  await expect(habitats.getByText(/not a NASA rating/i).first()).toBeVisible();
  await expect(habitats.getByText(/No investigation in this corpus is named as a rover study/)).toBeVisible();
  await expect(habitats.getByRole("heading", { name: "Cited habitat conditions" })).toBeVisible();
  await expect(habitats.locator(".evidence-label", { hasText: "Challenge context" }).first()).toBeVisible();
  await expect(habitats.getByText(/30% or greater/).first()).toBeVisible();
  await expect(habitats.getByText(/10\.2 psi or less/).first()).toBeVisible();

  const list = habitats.getByRole("navigation", { name: "Ranked investigations" });
  await expect(list.getByRole("button", { name: /ACME BRE/ })).toBeVisible();
  await expect(list.locator(".habitat-score").first()).toContainText(/High|Medium|Low/);
  await list.getByRole("button", { name: /ACME BRE/ }).click();
  const detail = habitats.getByRole("article");
  await expect(detail.getByRole("heading", { name: "ACME BRE", exact: true })).toBeVisible();
  await expect(detail.locator(".habitat-score")).toContainText(/High · \d+/);
  await expect(detail.getByText(/no source in this corpus names a pressurized rover/i)).toBeVisible();
  await expect(detail.getByRole("heading", { name: "Score breakdown" })).toBeVisible();
  await expect(detail.getByText(/26\.5%/)).toBeVisible();
  await expect(detail.getByText(/30%/)).toBeVisible();
  await expect(detail.getByText(/different cited values/)).toBeVisible();
  await expect(detail.getByText(/planned test condition/i).first()).toBeVisible();
  await expect(detail.getByRole("button", { name: "Inspect BRE-001" }).first()).toBeVisible();
  await expect(habitats.getByRole("heading", { name: "Indexed, not yet reviewed" })).toBeVisible();

  if (info.project.name === "desktop") {
    await reviewShot(page, "habitats-desktop", { width: 1440, height: 900 });
    await reviewShot(page, "habitats-mobile", { width: 390, height: 844 });
    await page.setViewportSize({ width: 1440, height: 900 });
  }
});

test("scores a Moon surface base separately and keeps E-FIELD low for a spacecraft cabin", async ({ page }, info) => {
  await page.goto("/#habitats");
  const habitats = page.getByRole("region", { name: "Habitat relevance" });
  await habitats.getByRole("tab", { name: /Moon surface base/ }).click();
  const list = habitats.getByRole("navigation", { name: "Ranked investigations" });
  await expect(list.locator(".habitat-score").first()).toContainText(/High|Medium|Low/);
  await expect(habitats.getByRole("article").getByRole("heading", { name: "Score breakdown" })).toBeVisible();
  if (info.project.name === "desktop") {
    await habitats.getByRole("navigation", { name: "Ranked investigations" }).scrollIntoViewIfNeeded();
    await reviewShot(page, "habitats-moon-desktop", { width: 1440, height: 900 });
  }

  await habitats.getByRole("tab", { name: /Spacecraft cabin/ }).click();
  await list.getByRole("button", { name: /PSI-39/ }).click();
  const detail = habitats.getByRole("article");
  await expect(detail.locator(".habitat-score")).toContainText(/High|Medium|Low/);
  await expect(detail.getByText(/names this habitat class/)).toBeVisible();
  await list.getByRole("button", { name: /E-FIELD/ }).click();
  await expect(habitats.getByRole("article").locator(".habitat-score")).toContainText(/Low · /);
  await expect(habitats.getByRole("article").getByText(/not being conducted to serve any space applications/i)).toBeVisible();
  await expect(habitats.getByRole("article").getByText(/no source in this corpus names a spacecraft cabin/i)).toBeVisible();
});
