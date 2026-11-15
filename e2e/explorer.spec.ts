import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

async function reviewShot(page: Page, name: string, viewport: { width: number; height: number }) {
  await mkdir("artifacts/review", { recursive: true });
  await page.setViewportSize(viewport);
  await page.screenshot({ path: `artifacts/review/${name}.png`, fullPage: false, animations: "disabled" });
}

test("groups investigations by hardware family and compares cited attributes", async ({ page }, info) => {
  await page.goto("/#explore");
  const explore = page.getByRole("region", { name: "Investigation explorer" });
  await expect(explore.getByRole("heading", { name: "Investigation explorer" })).toBeVisible();
  await explore.getByRole("tab", { name: /MSG \/ SPICE flow duct/ }).click();
  const list = explore.getByRole("navigation", { name: "Investigations" });
  await expect(list.getByRole("button", { name: /BASS-II/ })).toBeVisible();
  await list.getByRole("button", { name: /PSI-26/ }).click();
  const detail = explore.getByRole("article");
  await expect(detail.getByRole("heading", { name: "BASS", exact: true })).toBeVisible();
  await expect(detail.getByRole("heading", { name: "Fuels and samples" })).toBeVisible();
  const fuels = detail.getByRole("heading", { name: "Fuels and samples" }).locator("xpath=ancestor::section[1]");
  await expect(fuels.getByText("75% cotton and 25% fiberglass").first()).toBeVisible();
  await expect(detail.locator(".evidence-label", { hasText: "Challenge context" })).toHaveCount(0);

  await expect(page.getByRole("heading", { name: "Compare investigations" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Similarities and differences" })).toBeVisible();
  await expect(page.getByText(/MSG \/ SPICE flow duct hardware family/)).toBeVisible();

  if (info.project.name === "desktop") {
    await reviewShot(page, "explore-desktop", { width: 1440, height: 900 });
    await reviewShot(page, "explore-mobile", { width: 390, height: 844 });
    await page.setViewportSize({ width: 1440, height: 900 });
  }
});

test("planned test conditions and challenge context are labeled in the inspector", async ({ page }) => {
  await page.goto("/#explore");
  await page.getByRole("tab", { name: /CIR \/ ACME/ }).click();
  await page.getByRole("navigation", { name: "Investigations" }).getByRole("button", { name: /ACME BRE/ }).click();
  const detail = page.getByRole("article");
  await expect(detail.getByText("Planned test condition").first()).toBeVisible();
  await detail.getByRole("heading", { name: "O2, pressure, and airflow" }).locator("xpath=ancestor::section[1]").getByRole("button", { name: "Inspect BRE-001" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Planned test condition")).toBeVisible();
  await expect(dialog.getByText("This is a planned or proposed test condition, not a measured result.")).toBeVisible();
  await page.keyboard.press("Escape");
});
