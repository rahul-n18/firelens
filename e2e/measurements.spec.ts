import { expect, test } from "@playwright/test";
import { byClaim } from "../lib/evidence";

test("shows verified headline values and the original NASA comparison chart", async ({ page }) => {
  await page.goto("/#measured");
  const section = page.getByRole("region", { name: "What NASA measured on the Space Station" });
  await expect(section.locator("[data-big-value]")).toHaveText(["Twice", "100–600 nm", "66"]);
  await expect(section.getByRole("img", { name: "Original chart comparing low- and normal-gravity particle sizes" }))
    .toHaveAttribute("src", "/figures/particle-size-comparison.jpg");
  const narrative = section.locator('[data-claim-text="NTRS13-004"]');
  await expect(narrative).toHaveText(byClaim.get("NTRS13-004")!.claim_text);
  await section.getByRole("button", { name: "Inspect NTRS13-004" }).click();
  await expect(page.getByRole("dialog").locator("blockquote")).toHaveText(byClaim.get("NTRS13-004")!.source_excerpt);
});

test("preserves detector thresholds and quotes the authors verbatim", async ({ page }) => {
  await page.goto("/#detectors");
  const chart = page.getByRole("region", { name: "Smoke measurements and detector specifications" });
  await expect(chart.locator(".detector-value")).toHaveText([
    "100–600 nm", ">500 nm", ">0.5 µm", "0.3 µm", "<1 µm", "1–2 µm", "≈40 %",
  ]);
  await expect(chart.locator(".detector-range.before-bound")).toHaveCount(1);
  await expect(chart.locator(".detector-range.after-bound")).toHaveCount(2);
  await chart.getByRole("button", { name: "Inspect NTRS13-008b" }).click();
  const inspector = page.getByRole("dialog");
  await expect(inspector.getByText("Equipment specification", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  const suggestion = page.getByRole("complementary", { name: "Authors' suggestion" });
  await expect(suggestion.locator("blockquote")).toHaveText(byClaim.get("NTRS13-006")!.source_excerpt);
});
