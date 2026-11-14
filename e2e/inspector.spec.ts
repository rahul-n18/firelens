import { expect, test } from "@playwright/test";
import { claims, demoQueries, investigations } from "../lib/evidence";

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
  await expect(page.getByRole("heading", { name: "All evidence by topic" })).toBeVisible();
  await page.getByRole("link", { name: demoQueries[0] }).click();
  const comparison = page.getByRole("region", { name: "Flight vs ground comparison" });
  await expect(comparison.getByText("Ground-test airflow of 8 cm/s", { exact: true })).toBeVisible();
  await expect(comparison.getByText("Low gravity and normal gravity · Results varied by material")).toBeVisible();
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
  await expect(gap.getByText("ISS flight · Microgravity").first()).toBeVisible();
  await expect(gap.getByText("Ground lab · 1g")).toBeVisible();
  const transport = page.locator('[data-topic="smoke_transport"][data-gravity="lunar_0.16g"]:visible');
  await expect(transport).toHaveClass(/condition-active/);
  await expect(transport).not.toHaveClass(/hatched/);
  await expect(transport.getByText("No measurement in corpus")).toBeVisible();
  const models = transport.getByRole("button", { name: "Computer model · 2 (2 reviewed)" });
  await expect(models.locator(".model_result")).toHaveCSS("border-top-style", "dashed");
  await models.click();
  const dialog = page.getByRole("dialog");
  const group = dialog.getByRole("group", { name: "Claims in this coverage cell" });
  await expect(group.getByRole("button", { name: "LUNAR-001" })).toHaveAttribute("aria-pressed", "true");
  await group.getByRole("button", { name: "LUNAR-002" }).click();
  await expect(group.getByRole("button", { name: "LUNAR-002" })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(models).toBeFocused();
});

test("hatches only cells without claims and displays corpus totals", async ({ page }) => {
  await page.goto("/");
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
  const linked = new Set(claims.map(claim => claim.investigation_id).filter(Boolean)).size;
  await expect(page.locator(".corpus-status")).toContainText(
    `${claims.length} claims · ${reviewed} human-reviewed · ${linked} investigations with evidence · ${investigations.length} indexed`,
  );
  const particle = page.locator('[data-topic="smoke_particle_size"][data-gravity="microgravity"]:visible');
  await expect(particle.getByRole("button", { name: /^Measured/ })).toHaveText("Measured · 4 (3 reviewed)");
  await expect(particle.getByText("Not yet reviewed")).toHaveCount(0);
});

test("introduces the evidence and filters it by gravity from the landing page", async ({ page }) => {
  await page.goto("/");
  const landing = page.getByRole("main");
  await expect(landing.getByRole("heading", { level: 1 })).toHaveText("How does fire behave away from Earth?");
  const ladder = landing.getByRole("group", { name: "Filter evidence by gravity" });
  await expect(ladder.getByRole("button")).toHaveCount(4);
  const findings = landing.getByRole("region", { name: "Key findings" });
  await expect(findings.getByRole("article")).toHaveCount(3);
  for (const id of ["NTRS13-004", "LUNAR-001", "ESA-001"]) {
    const claim = claims.find(item => item.claim_id === id)!;
    await expect(findings.getByText(claim.claim_text, { exact: false })).toBeVisible();
    await expect(findings.getByRole("button", { name: `Inspect ${id}` })).toBeVisible();
  }
  const suggestion = findings.getByText("Why it matters", { exact: true }).locator("..");
  await expect(suggestion).toContainText("Authors' suggestion");
  await suggestion.getByRole("button", { name: "Inspect NTRS13-006" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Authors' suggestion", { exact: true })).toBeVisible();
  await expect(dialog.getByText("PDF page 19, Conclusions")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  const draft = claims.find(claim => claim.claim_id === "NTRS13-002")!;
  await expect(findings.getByText(draft.claim_text, { exact: false })).toHaveCount(0);
  await expect(findings.getByText("Not yet reviewed")).toBeVisible();
  await ladder.getByRole("button", { name: /Moon.*0.16g.*Modeled only/ }).click();
  const lunar = landing.getByRole("region", { name: "Moon evidence" });
  await expect(lunar.getByRole("button", { name: "Inspect LUNAR-002" })).toBeVisible();
  await expect(lunar.getByRole("button", { name: "Inspect ESA-001" })).toHaveCount(0);
  await expect(page.locator('[data-gravity="1g"]:visible')).toHaveCount(0);
  await ladder.getByRole("button", { name: /Mars.*Nothing in our sources/ }).click();
  await expect(landing.getByRole("region", { name: "Mars evidence" })).toContainText("Nothing in our sources");
  await page.getByRole("button", { name: "Show all" }).click();
  await expect(findings).toBeVisible();
  await expect(landing.getByRole("region", { name: "How FireLens works" }).getByRole("listitem")).toHaveCount(3);
  await landing.getByRole("button", { name: "ISS", exact: true }).focus();
  await expect(page.getByRole("tooltip")).toHaveText("International Space Station.");
});
