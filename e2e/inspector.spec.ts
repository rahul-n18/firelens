import { expect, test } from "@playwright/test";
import { claims, demoQueries } from "../lib/evidence";

test("ranks SAME-R and opens a claim with the stored source URL", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: demoQueries[0] }).click();
  await expect(page.getByRole("heading", { name: "Ranked investigations" })).toBeVisible();
  await expect(page.locator(".result").first().getByRole("heading")).toHaveText("SAME-R");
  const trigger = page.getByRole("region", { name: "Evidence answer" }).getByRole("button", { name: "Inspect SAMER-010" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Excerpt verified")).toBeVisible();
  await expect(dialog.getByText("Not yet reviewed")).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Open source" })).toHaveAttribute("href", "https://psi.nasa.gov/physci/repo/data/investigations/PSI-101");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("shows flight and ground evidence with separate cross-gravity claims", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "All evidence by topic" })).toBeHidden();
  await page.getByText("Show all evidence by topic", { exact: true }).click();
  await page.getByRole("link", { name: demoQueries[0] }).click();
  const comparison = page.getByRole("region", { name: "Flight vs ground comparison" });
  await expect(comparison.getByText("Ground-test airflow of 8 cm/s", { exact: true })).toBeVisible();
  await expect(comparison.getByText(claims.find(claim => claim.claim_id === "NTRS13-004")!.claim_text, { exact: false })).toBeVisible();
  await expect(comparison.getByRole("button", { name: "Inspect NTRS13-002" })).toBeVisible();
  await expect(comparison.getByRole("button", { name: "Inspect NTRS13-004" })).toBeVisible();
  await expect(comparison.getByText("Not reported in corpus").first()).toBeVisible();
});

test("labels lunar models and planned work as context for the gap", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: demoQueries[2] }).click();
  const gap = page.locator(".gap-card");
  await expect(gap.getByText("No reported measurement establishes smoke-particle diameter under lunar gravity in this corpus.")).toBeVisible();
  await expect(gap.getByText("Computer model", { exact: true })).toHaveCount(2);
  await expect(gap.getByText("Planned (as of 2021)")).toBeVisible();
  await expect(gap.getByText("ISS flight, Microgravity").first()).toBeVisible();
  await expect(gap.getByText("Ground lab, 1g")).toBeVisible();
  await page.getByText("Show all evidence by topic", { exact: true }).click();
  const transport = page.locator('[data-topic="smoke_transport"][data-gravity="lunar_0.16g"]:visible');
  await expect(transport).toHaveClass(/condition-active/);
  await expect(transport).not.toHaveClass(/hatched/);
  await expect(transport.getByText("No measurement in corpus")).toBeVisible();
  const models = transport.getByRole("button", { name: "Computer model · 3 (2 reviewed)" });
  await expect(models.locator(".model_result")).toHaveCSS("border-top-style", "dashed");
  await models.click();
  const dialog = page.getByRole("dialog");
  const group = dialog.getByRole("group", { name: "Claims in this coverage cell" });
  await expect(group.getByRole("button", { name: "LUNAR-001" })).toHaveAttribute("aria-pressed", "true");
  await group.getByRole("button", { name: "LUNAR-002" }).click();
  await expect(group.getByRole("button", { name: "LUNAR-002" })).toHaveAttribute("aria-pressed", "true");
  await group.getByRole("button", { name: "LUNAR-003" }).click();
  await expect(dialog.getByText("Not yet reviewed")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(models).toBeFocused();
});

test("hatches only cells without claims and displays corpus totals", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Show all evidence by topic", { exact: true }).click();
  const cells = page.locator("[data-topic][data-gravity]:visible");
  expect(await cells.count()).toBeGreaterThan(0);
  const hatched = await cells.evaluateAll(nodes => nodes
    .filter(node => node.classList.contains("hatched"))
    .map(node => ({ topic: node.getAttribute("data-topic"), gravity: node.getAttribute("data-gravity") })));
  expect(hatched.length).toBeGreaterThan(0);
  for (const { topic, gravity } of hatched) {
    const matching = claims.filter(claim => topic !== null && claim.topics.includes(topic) &&
      (gravity === "model"
        ? claim.gravity_level === "multiple" && claim.platform === "NUMERICAL_MODEL"
        : claim.gravity_level === gravity));
    expect(matching, `${topic} at ${gravity} has claims and must not be hatched`).toHaveLength(0);
  }
  const reviewed = claims.filter(claim => claim.review.status === "HUMAN_REVIEWED").length;
  await expect(page.getByRole("region", { name: "How the evidence is checked" }))
    .toContainText(`People review ${reviewed} of ${claims.length} claims.`);
  const particle = page.locator('[data-topic="smoke_particle_size"][data-gravity="microgravity"]:visible');
  await expect(particle.getByRole("button", { name: /^Measured/ })).toHaveText("Measured · 5 (3 reviewed)");
  await expect(particle.getByText("Not yet reviewed")).toHaveCount(0);
});

test("introduces the evidence and lets keyboard users reach Ask and the source inspector", async ({ page }) => {
  await page.goto("/");
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 1 })).toHaveText("Does smoke behave the same away from Earth?");
  await expect(main.locator(".lede")).toContainText("measurements in orbit");
  await expect(main.locator(".lede")).toContainText("simulations for the Moon");
  await expect(main.locator(".lede")).toContainText("what’s missing for Mars");

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(main).toBeFocused();
  await page.keyboard.press("/");
  const input = page.getByRole("searchbox", { name: "Search the corpus" });
  await expect(input).toBeFocused();
  const searchTop = await input.evaluate(node => node.getBoundingClientRect().top);
  const stickyBottom = await page.getByRole("banner").evaluate(node => node.getBoundingClientRect().bottom);
  expect(searchTop).toBeGreaterThan(stickyBottom);

  await input.fill(demoQueries[1]);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog").getByText("Excerpt verified")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(input).toBeFocused();
});
