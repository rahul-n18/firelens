import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { formatClaimValue } from "../lib/claim-values";
import { kindLabel } from "../lib/claim-kind";
import { byClaim, type Claim } from "../lib/evidence";

async function assertBindings(page: Page) {
  await expect(page.locator(".claim-chip:visible:not([data-claim-id])")).toHaveCount(0);
  const rendered = await page.locator("[data-claim-id]:visible, [data-claim-text]:visible, [data-claim-excerpt]:visible, [data-big-value]:visible")
    .evaluateAll(nodes => nodes.map(node => ({
      chipId: node.getAttribute("data-claim-id"),
      sentenceId: node.getAttribute("data-claim-text"),
      excerptId: node.getAttribute("data-claim-excerpt"),
      numberId: node.getAttribute("data-big-value"),
      text: node.textContent,
    })));
  expect(rendered.length).toBeGreaterThan(0);
  for (const { chipId, sentenceId, excerptId, numberId, text } of rendered) {
    const id = chipId ?? sentenceId ?? excerptId ?? numberId ?? "";
    const claim = byClaim.get(id);
    expect(claim, id).toBeDefined();
    if (!claim) continue;
    if (chipId) expect(text).toBe(claim.claim_id);
    if (sentenceId) expect(text).toBe(claim.claim_text);
    if (excerptId) expect(text).toBe(claim.source_excerpt);
    if (numberId) expect(text).toBe(formatClaimValue(claim, { headline: true }));
  }
}

test("runs the public demo from the hero through the Moon briefing and source inspector", async ({ page }) => {
  expect((await page.goto("/"))?.ok()).toBe(true);
  const start = Date.now();
  await expect(page.getByRole("heading", { name: "Does smoke behave the same away from Earth?" })).toBeVisible();
  await page.getByRole("link", { name: "See the difference" }).click();
  const see = page.getByRole("region", { name: "See what gravity does to smoke" });
  await expect(see.locator(".detector-state")).toHaveText("Ceiling detector: smoke reached it", { timeout: 10_000 });
  await see.getByRole("tab", { name: /^Space Station/ }).click();
  await expect(see.locator(".detector-state")).toHaveText("Ceiling detector: no smoke yet");
  await see.getByRole("button", { name: "Show NASA’s own cabin simulation" }).click();
  await expect(see.getByRole("img", { name: /NASA cabin comparison/ })).toBeVisible();

  const nav = page.getByRole("navigation", { name: "Sections" });
  await nav.getByRole("link", { name: "Measured" }).click();
  await expect(page.getByText("Twice", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: /Original chart comparing/ })).toBeVisible();
  await expect(page.locator(".detector-range").first()).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Authors' suggestion" }).locator("blockquote")).toBeVisible();

  await nav.getByRole("link", { name: "Missions" }).click();
  const missions = page.getByRole("region", { name: "Mission briefings" });
  const moon = missions.getByRole("tab", { name: /Moon base.*Flames measured, smoke only simulated/ });
  await moon.click();
  await expect(moon).toHaveAttribute("aria-selected", "true");
  await expect(missions.getByRole("region", { name: "Nobody has measured" }).getByText(/No measurements of smoke transport/)).toBeVisible();
  const plans = missions.getByRole("region", { name: "Test next" });
  await expect(plans.getByRole("button").first()).toHaveText("PLANNED-002");
  await expect(plans.getByText("Planned (as of Dec 2025)")).toBeVisible();
  await expect(plans.getByRole("button", { name: "Inspect LUNAR-004" })).toBeVisible();
  await assertBindings(page);
  await plans.getByRole("button", { name: "Inspect LUNAR-004" }).click();
  const inspector = page.getByRole("dialog");
  await expect(inspector.locator("blockquote")).toHaveText(byClaim.get("LUNAR-004")!.source_excerpt);
  await expect(inspector.getByText("Reviewed by R. Naveen", { exact: true })).toBeVisible();
  await expect(inspector.getByText("Excerpt verified", { exact: true })).toBeVisible();
  await assertBindings(page);
  expect(Date.now() - start).toBeLessThan(30_000);
});

test("keeps the mission and data views accessible in both themes", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#missions");
  const tabs = page.getByRole("tablist", { name: "Mission", exact: true });
  await tabs.getByRole("tab", { name: /^Space Station/ }).focus();
  await page.keyboard.press("End");
  await expect(tabs.getByRole("tab", { name: /^Earth/ })).toHaveAttribute("aria-selected", "true");
  await assertBindings(page);
  await page.keyboard.press("Home");
  await expect(tabs.getByRole("tab", { name: /^Space Station/ })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowRight");
  await expect(tabs.getByRole("tab", { name: /^Moon base/ })).toBeFocused();
  await expect(tabs.getByRole("tab", { name: /^Moon base/ })).toHaveAttribute("aria-selected", "true");
  expect(await page.evaluate(() => {
    const focused = document.activeElement!.getBoundingClientRect();
    return focused.top >= document.querySelector("header")!.getBoundingClientRect().bottom;
  })).toBe(true);
  for (const theme of ["light", "dark"]) {
    if (theme === "dark") await page.getByRole("button", { name: "Dark theme" }).click();
    await expect(page.locator(".firelens")).toHaveAttribute("data-theme", theme);
    await expect(page.getByRole("region", { name: "Structured values" }).getByRole("table")).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations.filter(violation => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const text of await page.locator(".gap-text:visible").allTextContents()) {
      expect(text.trim()).toMatch(/^(Nothing measured|No (measurements|reported measurement|smoke measurements))/u);
    }
    const buttons = await page.locator(".claim-chip:visible").evaluateAll(nodes => nodes.map(node => ({
      height: node.getBoundingClientRect().height, wraps: getComputedStyle(node).whiteSpace !== "nowrap",
    })));
    expect(buttons.every(button => button.height >= 24 && !button.wraps)).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("links the most relevant studies directly to scoped Ask results", async ({ page }) => {
  await page.goto("/#missions");
  const studies = page.getByRole("region", { name: "Most relevant studies" });
  const first = studies.getByRole("link").first();
  const name = (await first.innerText()).trim();
  const href = await first.getAttribute("href");
  expect(href).toMatch(/\?investigation=PSI-\d+#ask$/u);
  const investigation = new URL(href!, "http://127.0.0.1").searchParams.get("investigation");
  await first.click();
  await expect(page).toHaveURL(new RegExp(`\\?investigation=${investigation}#ask$`));
  const ask = page.getByRole("region", { name: "Ask your own question" });
  await expect(ask.locator(".ask-filter")).toContainText(name);
  await expect(ask.getByRole("region", { name: "Ranked investigations" }).locator(".result")).toHaveCount(1);
  await expect(ask.locator(".result")).toContainText(investigation!);
  await ask.getByRole("button", { name: "Clear investigation filter" }).click();
  await expect(ask.locator(".ask-filter")).toHaveCount(0);
  await expect(page).toHaveURL(/\/#ask$/u);
});

test("exports exactly the same structured claims as the model data table", async ({ page }) => {
  await page.goto("/#data");
  const section = page.getByRole("region", { name: "Data for fire modelers" });
  const displayed = await section.locator("[data-structured-claim]").evaluateAll(nodes => nodes.map(node => ({
    id: node.getAttribute("data-structured-claim")!,
    cells: [...node.children].map(cell => cell.textContent?.trim() ?? ""),
  })));
  expect(displayed.length).toBeGreaterThan(0);
  const content: Record<string, string> = {};
  for (const format of ["CSV", "JSON"]) {
    const [download] = await Promise.all([page.waitForEvent("download"), section.getByRole("button", { name: "Download " + format }).click()]);
    expect(download.suggestedFilename()).toBe("firelens-model-data." + format.toLowerCase());
    content[format] = await readFile((await download.path())!, "utf8");
  }
  const json = JSON.parse(content.JSON).claims as Claim[];
  const [header, ...records] = content.CSV.trimEnd().split("\r\n");
  const fields = header.split(",");
  const csv = records.map(line => Object.fromEntries(
    [...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/gu)].map((cell, i) => [fields[i], cell[1].replaceAll('""', '"')]),
  ));
  expect(json.map(row => row.claim_id)).toEqual(displayed.map(row => row.id));
  expect(csv.map(row => row.claim_id)).toEqual(displayed.map(row => row.id));
  for (const [i, { id, cells }] of displayed.entries()) {
    const claim = byClaim.get(id)!;
    expect(cells[0]).toBe(claim.quantity);
    expect(cells[1]).toBe(formatClaimValue(claim));
    expect(cells[2]).toBe(claim.conditions ?? "Not specified");
    expect(cells[3]).toContain(kindLabel(claim));
    expect(cells[4]).toBe(id);
    expect(json[i]).toEqual({ ...claim, evidence_label: kindLabel(claim) });
    expect(csv[i]).toMatchObject({
      quantity: claim.quantity, value: String(claim.value), unit: claim.unit ?? "", conditions: claim.conditions ?? "",
      evidence_label: kindLabel(claim), value_qualifier: claim.value_qualifier ?? "", source_url: claim.source_url,
      source_location: claim.source_location, source_excerpt: claim.source_excerpt, review_status: claim.review.status,
    });
  }
});
