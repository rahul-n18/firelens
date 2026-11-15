import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { byClaim, demoQueries, metadataHeading, spiceHeading } from "../lib/evidence";

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

async function audit(page: Page) {
  const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(scan.violations.filter(issue => issue.impact === "serious" || issue.impact === "critical")).toEqual([]);
}

const representative = ["SAMER-010", "PSI-47-001", "LUNAR-001"];
for (const [index, query] of demoQueries.entries()) {
  test(`Q${index + 1} mouse flow, source link, and accessibility`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/");
    if (index === 0) {
      await audit(page);
      await noOverflow(page);
      await page.screenshot({ path: `artifacts/${info.project.name}-landing.png`, fullPage: true, animations: "disabled" });
    }
    await page.getByRole("link", { name: query }).click();
    const answer = page.getByRole("region", { name: "Evidence answer" });
    const trigger = index === 1
      ? answer.getByRole("button", { name: /^Inspect / }).first()
      : answer.getByRole("button", { name: `Inspect ${representative[index]}`, exact: true });
    await expect(trigger).toBeVisible();
    if (index === 1) {
      await expect(page.getByRole("heading", { name: spiceHeading })).toBeVisible();
      await expect(page.getByRole("heading", { name: metadataHeading })).toBeVisible();
      await expect(page.getByText("Matched", { exact: true }).first()).toBeVisible();
    }
    await noOverflow(page);
    await audit(page);
    await page.screenshot({ path: `artifacts/${info.project.name}-q${index + 1}.png`, fullPage: true, animations: "disabled" });
    const inspected = (await trigger.innerText()).replace(/^Inspect\s+/u, "").trim();
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("link", { name: "Open source" })).toHaveAttribute("href", byClaim.get(inspected)!.source_url);
    await audit(page);
    await page.screenshot({ path: `artifacts/${info.project.name}-q${index + 1}-inspector.png`, animations: "disabled" });
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    expect(errors).toEqual([]);
  });

  test(`Q${index + 1} keyboard search and inspector focus`, async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("/");
    const input = page.getByRole("searchbox", { name: "Search the corpus" });
    await expect(input).toBeFocused();
    await page.keyboard.insertText(query);
    await page.keyboard.press("ArrowDown");
    await expect(page.locator(".active-result")).toBeVisible();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("link", { name: "Open source" })).toHaveAttribute("href", /^https:\/\//u);
    for (let step = 0; step < 5; step++) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(input).toBeFocused();
  });
}

test("copies the evidence brief and exports CSV and JSON", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByRole("link", { name: demoQueries[2] }).click();
  await page.getByRole("button", { name: "Copy evidence brief" }).click();
  await expect(page.getByText("Evidence brief copied.")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("[LUNAR-001] Computer model");
  for (const format of ["CSV", "JSON"]) {
    const [download] = await Promise.all([
      page.waitForEvent("download"), page.getByRole("button", { name: `Export evidence (${format})`, exact: true }).click(),
    ]);
    expect(download.suggestedFilename()).toBe(`firelens-evidence.${format.toLowerCase()}`);
    const content = await readFile((await download.path())!, "utf8");
    expect(content).toContain("LUNAR-001");
    if (format === "JSON") expect(JSON.parse(content).claims.find((claim: { claim_id: string }) => claim.claim_id === "LUNAR-001").claim_status).toBe("MODEL_RESULT");
    else expect(content.split("\r\n")[0]).toContain("source_url");
  }
  await page.getByRole("button", { name: "Dark theme" }).click();
  await audit(page);
  await noOverflow(page);
});
