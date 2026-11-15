import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

async function reviewShot(page: Page, name: string, viewport: { width: number; height: number }) {
  await mkdir("artifacts/review", { recursive: true });
  await page.setViewportSize(viewport);
  await page.screenshot({ path: `artifacts/review/${name}.png`, fullPage: false, animations: "disabled" });
}

test("shows prevention, detection, suppression, and Earth applications with labeled claim kinds", async ({ page }, info) => {
  await page.goto("/#insights");
  const insights = page.getByRole("region", { name: "Prevention, detection, and suppression" });
  await expect(insights.getByRole("heading", { name: "Prevention, detection, and suppression" })).toBeVisible();
  await expect(insights.getByRole("heading", { name: "Prevention", exact: true })).toBeVisible();
  await expect(insights.getByRole("heading", { name: "Detection", exact: true })).toBeVisible();
  await expect(insights.getByRole("heading", { name: "Suppression", exact: true })).toBeVisible();
  await expect(insights.getByRole("heading", { name: "Earth applications", exact: true })).toBeVisible();
  await expect(insights.getByText(/water-mist extinguishers and firefighter-gear applications appear only as challenge-statement context/i)).toBeVisible();
  const earth = insights.getByRole("region", { name: "Earth applications" });
  await expect(earth.getByRole("button", { name: "Inspect CHALLENGE-005" })).toBeVisible();
  await expect(earth.locator(".evidence-label", { hasText: "Challenge context" })).toBeVisible();
  await earth.getByRole("button", { name: "Inspect CHALLENGE-005" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Challenge context")).toBeVisible();
  await expect(dialog.getByText("This is challenge-statement context, not a NASA measurement.")).toBeVisible();
  await page.keyboard.press("Escape");

  const suppression = insights.getByRole("region", { name: "Suppression" });
  await expect(suppression.getByRole("button", { name: "Inspect NTRS12-FLEX-002" })).toBeVisible();
  await expect(suppression.locator(".evidence-label", { hasText: "Challenge context" })).toBeVisible();

  if (info.project.name === "desktop") {
    await reviewShot(page, "insights-desktop", { width: 1440, height: 900 });
    await reviewShot(page, "insights-mobile", { width: 390, height: 844 });
    await page.setViewportSize({ width: 1440, height: 900 });
  }
});

test("extends the modeler table and downloads with flammability fields", async ({ page }, info) => {
  await page.goto("/#data");
  const section = page.getByRole("region", { name: "Data for fire modelers" });
  await expect(section.getByRole("columnheader", { name: "Materials" })).toBeVisible();
  await expect(section.getByRole("columnheader", { name: "Gravity" })).toBeVisible();
  await expect(section.getByRole("columnheader", { name: "Airflow" })).toBeVisible();
  await expect(section.locator("[data-structured-claim=NTRS12-FLEX-002]")).toBeVisible();
  if (info.project.name === "desktop") {
    await reviewShot(page, "data-desktop", { width: 1440, height: 900 });
    await reviewShot(page, "data-mobile", { width: 390, height: 844 });
    await page.setViewportSize({ width: 1440, height: 900 });
  }
});
