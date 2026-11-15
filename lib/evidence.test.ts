import { describe, expect, it } from "vitest";
import { comparisonRows, coverage, crossGravity, demoQueries, evidenceGap, search, spiceHeading, statusLabel } from "./evidence";

describe("FireLens search", () => {
  it("ranks SAME-R first for the flight and ground follow-up question", () => {
    const result = search(demoQueries[0]);
    expect(result.rankings[0].item.investigation_id).toBe("PSI-101");
    expect(result.direct.map(claim => claim.platform)).toEqual(["ISS_FLIGHT", "ISS_FLIGHT", "GROUND_LAB"]);
    expect(result.direct.every(claim => claim.investigation_id === "PSI-101")).toBe(true);
    expect(result.related.every(claim => claim.investigation_id === null)).toBe(true);
  });

  it("orders aerosol investigations above SPICE and explains matches deterministically", () => {
    const result = search(demoQueries[1]);
    expect(result.rankings.findIndex(row => row.isSoot)).toBeGreaterThan(1);
    expect(result.rankings.slice(0, 2).map(row => row.item.investigation_id)).toEqual(expect.arrayContaining(["PSI-101", "PSI-102"]));
    expect(result.spice.map(row => row.item.investigation_id)).toEqual(["PSI-107"]);
    expect(spiceHeading).toContain("flame smoke point");
    expect(result.main[0].matches.flatMap(match => match.terms)).toContain("smoke");
    expect(result.rankings).toEqual(search(demoQueries[1]).rankings);
  });
});

describe("condition-specific evidence", () => {
  it.each([
    [demoQueries[2], "lunar gravity"],
    ["What smoke-particle diameter was measured at Mars gravity?", "mars gravity"],
    ["What was measured at elevated oxygen at reduced pressure?", "elevated oxygen at reduced pressure"],
  ])("reports a scoped gap for %s", (query, condition) => {
    const gap = evidenceGap(search(query));
    expect(gap?.text).toContain(condition);
    expect(gap?.text).not.toMatch(/\d\s*(?:nm|[µμ]m)/u);
    expect(gap?.scope).toContain("FireLens corpus v1");
  });

  it("shows modeled evidence at its matching gravity without classifying it as measured", () => {
    const lunar = evidenceGap(search(demoQueries[2]))!;
    expect(lunar.related.map(claim => [claim.claim_id, statusLabel(claim)])).toEqual([
      ["LUNAR-001", "Computer model"], ["LUNAR-002", "Computer model"], ["ESA-001", "Planned (as of 2021)"],
    ]);
    const transport = coverage.find(row => row.topic === "smoke_transport")!;
    expect(transport.cells.find(cell => cell.id === "model")?.claims.map(claim => claim.claim_id)).toEqual(["NTRS13-010"]);
    expect(transport.cells.find(cell => cell.id === "lunar_0.16g")?.claims.map(claim => claim.claim_id))
      .toEqual(["LUNAR-001", "LUNAR-002", "LUNAR-003"]);
    expect(coverage.flatMap(row => row.cells.find(cell => cell.id === "model")?.claims ?? [])
      .map(claim => claim.claim_id)).toEqual(["PSI-115-001", "NTRS13-010"]);
    expect(comparisonRows.flatMap(row => [...row.flight, ...row.ground]).every(claim => claim.claim_status !== "MODEL_RESULT")).toBe(true);
    expect(crossGravity.map(claim => claim.claim_id)).toEqual(["NTRS13-002", "NTRS13-004"]);
  });

  it("uses objective language for displayed objectives", () => {
    const displayed = [0, 1, 2].flatMap(i => {
      const result = search(demoQueries[i]);
      return [...result.direct, ...result.related, ...(evidenceGap(result)?.related ?? [])];
    });
    const objectives = displayed.filter(claim => claim.claim_status === "OBJECTIVE_OR_HYPOTHESIS");
    expect(objectives.length).toBeGreaterThan(0);
    for (const claim of objectives) expect(claim.claim_text).not.toMatch(/\b(?:showed|found|measured)\b/iu);
  });
});
