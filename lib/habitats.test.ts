import { describe, expect, test } from "vitest";
import { byClaim } from "./evidence";
import { contextClaims, mentionedHabitats, rankForHabitat, relatedHabitatClaims } from "./habitats";

describe("habitat relevance", () => {
  test("tags only investigations whose sources name the habitat", () => {
    expect(mentionedHabitats(byClaim.get("CFI-006")!)).toContain("spacecraft_cabin");
    expect(mentionedHabitats(byClaim.get("BRE-005")!)).toContain("spacecraft_cabin");
    expect(mentionedHabitats(byClaim.get("LUCI-004")!)).toEqual(["spacecraft_cabin", "surface_habitat"]);
    expect(mentionedHabitats(byClaim.get("CHALLENGE-002")!)).toEqual(["surface_habitat", "pressurized_rover"]);
    expect(mentionedHabitats(byClaim.get("BASS-003")!)).toEqual([]);
  });

  test("ranks BRE highly for a pressurized rover on cited atmosphere overlap, without a rover tag", () => {
    const ranks = rankForHabitat("pressurized_rover");
    const bre = ranks.find(rank => rank.investigation.investigation_id === "PSI-20")!;
    expect(ranks[0].investigation.investigation_id).toBe("PSI-20");
    expect(bre.tag).toBe("not_assessed");
    expect(bre.tagLabel).toBe("Not assessed");
    expect(bre.factors.some(factor => /26\.5%/.test(factor.text) && /30%/.test(factor.text))).toBe(true);
    expect(bre.factors.some(factor => /planned test condition/i.test(factor.text))).toBe(true);
    expect(ranks.every(rank => rank.tag === "not_assessed")).toBe(true);
  });

  test("keeps E-FIELD untagged and shows the not-for-space-applications caution", () => {
    const efield = rankForHabitat("spacecraft_cabin").find(rank => rank.investigation.investigation_id === "PSI-22")!;
    expect(efield.tag).toBe("not_assessed");
    expect(efield.factors.some(factor => factor.kind === "caution" && /not being conducted to serve any space applications/i.test(factor.text))).toBe(true);
  });

  test("lists unlinked lunar-habitat and challenge rover claims as related evidence", () => {
    const related = relatedHabitatClaims("surface_habitat").map(claim => claim.claim_id);
    expect(related).toContain("LUCI-004");
    expect(contextClaims("pressurized_rover").map(claim => claim.claim_id)).toContain("CHALLENGE-002");
    expect(contextClaims("pressurized_rover").map(claim => claim.claim_id)).toContain("CHALLENGE-003");
  });
});
