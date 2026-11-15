import { describe, expect, test } from "vitest";
import { byClaim } from "./evidence";
import { claimKind } from "./claim-kind";
import { insightSections, insightClaims, modelerRows } from "./insights";
import { claims } from "./evidence";

describe("safety insights and modeler rows", () => {
  test("keeps challenge suppression and Earth-application claims labeled as context, not measurements", () => {
    const suppression = insightClaims(insightSections.find(section => section.id === "suppression")!);
    const earth = insightClaims(insightSections.find(section => section.id === "earth")!);
    expect(suppression.map(claim => claim.claim_id)).toContain("CHALLENGE-012");
    expect(claimKind(byClaim.get("CHALLENGE-012")!).id).toBe("challenge_context");
    expect(earth.map(claim => claim.claim_id)).toContain("CHALLENGE-005");
    expect(claimKind(byClaim.get("CHALLENGE-005")!).id).toBe("challenge_context");
    expect(earth.some(claim => claim.evidence_label === "Earth application")).toBe(true);
  });

  test("extends modeler rows with flammability claims that have no extracted numeric value", () => {
    const rows = modelerRows(claims);
    expect(rows.some(claim => claim.value !== undefined)).toBe(true);
    expect(rows.some(claim => claim.claim_id === "NTRS12-FLEX-002" && claim.value === undefined)).toBe(true);
    expect(rows.filter(claim => claim.value !== undefined).length).toBe(claims.filter(claim => claim.value !== undefined).length);
  });
});
