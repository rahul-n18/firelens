import { expect, test } from "@playwright/test";

test("illustrates smoke reaching the Earth detector but not the station detector", async ({ page }) => {
  await page.clock.install();
  await page.goto("/#see");
  const see = page.getByRole("region", { name: "See what gravity does to smoke" });
  const station = see.getByRole("tab", { name: /^Space Station/ });
  const detector = see.locator(".detector-state");
  const airflow = see.getByRole("slider", { name: "Cabin airflow" });
  await see.locator("canvas").scrollIntoViewIfNeeded();
  await expect(airflow).toHaveValue("0");
  await page.clock.runFor(9_500);
  await expect(detector).toHaveText("Ceiling detector: smoke reached it", { timeout: 500 });
  await expect(see.locator(".detector-dot")).toHaveCSS("background-color", "rgb(185, 28, 28)");

  await station.click();
  await page.clock.runFor(10_000);
  await expect(detector).toHaveText("Ceiling detector: no smoke yet");
  await airflow.fill("8");
  await page.clock.runFor(10_000);
  await expect(detector).toHaveText("Ceiling detector: no smoke yet");

  await see.getByRole("button", { name: "Show NASA’s own cabin simulation" }).click();
  await expect(see.getByRole("img", { name: "NASA cabin comparison at low and normal gravity" })).toBeVisible();
  await see.getByRole("button", { name: "Inspect NTRS13-010" }).click();
  const inspector = page.getByRole("dialog");
  await expect(inspector.getByText("Excerpt verified", { exact: true })).toBeVisible();
  await expect(inspector.getByText("Not yet reviewed", { exact: true })).toBeVisible();
});

test("navigates the gravity tabs by keyboard and renders a reduced-motion frame", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#see");
  const tabs = page.getByRole("tablist", { name: "Gravity level" });
  const earth = tabs.getByRole("tab", { name: /^Earth/ });
  const moon = tabs.getByRole("tab", { name: /^Moon/ });
  const mars = tabs.getByRole("tab", { name: /^Mars/ });
  const station = tabs.getByRole("tab", { name: /^Space Station/ });
  const see = page.getByRole("region", { name: "See what gravity does to smoke" });
  await expect(see.locator(".detector-state")).toHaveText("Ceiling detector: smoke reached it");
  await earth.focus();
  await page.keyboard.press("ArrowRight");
  await expect(mars).toBeFocused();
  await expect(mars).toHaveAttribute("aria-selected", "true");
  await expect(see.getByText(/No smoke or fire measurements at this gravity/)).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(moon).toHaveAttribute("aria-selected", "true");
  await expect(see.getByRole("list", { name: "Airflow values in our sources" }).getByRole("listitem")).toHaveCount(2);
  await expect(see.locator(".detector-state")).toContainText("illustration only, no measured data at this gravity");
  await page.keyboard.press("End");
  await expect(station).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(earth).toHaveAttribute("aria-selected", "true");
  const canvas = see.locator("canvas");
  const frame = await canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL());
  await page.clock.install();
  await page.clock.runFor(500);
  expect(await canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL())).toBe(frame);
});
