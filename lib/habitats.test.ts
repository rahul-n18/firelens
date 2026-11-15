import { describe, expect, test } from "vitest";
import { byClaim } from "./evidence";
import {
  contextClaims, mentionedHabitats, rankForHabitat, relatedHabitatClaims, relevanceLevel, scoreLabel,
} from "./habitats";

describe("habitat relevance", () => {
  test("tags habitat names only as a factor, not as the headline", () => {
    expect(mentionedHabitats(byClaim.get("CFI-006")!)).toContain("spacecraft_cabin");
    expect(mentionedHabitats(byClaim.get("BRE-005")!)).toContain("spacecraft_cabin");
    expect(mentionedHabitats(byClaim.get("LUCI-004")!)).toEqual(expect.arrayContaining(["spacecraft_cabin", "moon_base"]));
    expect(mentionedHabitats(byClaim.get("CHALLENGE-002")!)).toEqual(expect.arrayContaining(["moon_base", "pressurized_rover"]));
    expect(mentionedHabitats(byClaim.get("CHALLENGE-002")!)).not.toContain("mars_base");
    expect(mentionedHabitats(byClaim.get("BASS-003")!)).toEqual([]);
  });

  test("scores BRE highly for a pressurized rover on planned 10.2 psia overlap, without treating 26.5% as 30%", () => {
    const ranks = rankForHabitat("pressurized_rover");
    const bre = ranks.find(rank => rank.investigation.investigation_id === "PSI-20")!;
    expect(ranks[0].investigation.investigation_id).toBe("PSI-20");
    expect(bre.score).toBeGreaterThanOrEqual(60);
    expect(bre.level).toBe("High");
    expect(scoreLabel(bre)).toBe(`High · ${bre.score}`);
    expect(bre.namedBySource).toBe(false);
    expect(bre.caveat).toMatch(/no source in this corpus names a pressurized rover/i);
    const atmosphere = bre.factors.find(factor => factor.id === "atmosphere")!;
    expect(atmosphere.points).toBeGreaterThan(0);
    expect(atmosphere.text).toMatch(/26\.5%/);
    expect(atmosphere.text).toMatch(/30%/);
    expect(atmosphere.text).toMatch(/different cited values/);
    expect(atmosphere.claimIds).toContain("BRE-001");
    expect(bre.factors.reduce((sum, factor) => sum + factor.points, 0)).toBe(bre.score);
  });

  test("orders habitats differently and does not apply Moon/rover challenge atmospheres to a Mars base", () => {
    const cabin = rankForHabitat("spacecraft_cabin").filter(rank => !rank.metadataOnly);
    const moon = rankForHabitat("moon_base").filter(rank => !rank.metadataOnly);
    const mars = rankForHabitat("mars_base").filter(rank => !rank.metadataOnly);
    const rover = rankForHabitat("pressurized_rover").filter(rank => !rank.metadataOnly);
    expect(cabin.map(rank => rank.investigation.investigation_id).slice(0, 5))
      .not.toEqual(rover.map(rank => rank.investigation.investigation_id).slice(0, 5));
    expect(moon.map(rank => rank.investigation.investigation_id).slice(0, 5))
      .not.toEqual(mars.map(rank => rank.investigation.investigation_id).slice(0, 5));
    const moonBre = moon.find(rank => rank.investigation.investigation_id === "PSI-20")!;
    const marsBre = mars.find(rank => rank.investigation.investigation_id === "PSI-20")!;
    expect(moonBre.score).toBeGreaterThan(marsBre.score);
    expect(marsBre.factors.find(factor => factor.id === "atmosphere")!.points).toBeLessThanOrEqual(5);
    expect(moonBre.factors.find(factor => factor.id === "atmosphere")!.points).toBeGreaterThan(5);
  });

  test("keeps E-FIELD low after the not-for-space-applications deduction", () => {
    const efield = rankForHabitat("spacecraft_cabin").find(rank => rank.investigation.investigation_id === "PSI-22")!;
    expect(efield.namedBySource).toBe(false);
    expect(efield.level).toBe("Low");
    expect(efield.factors.some(factor => factor.id === "caution" && factor.points === -20)).toBe(true);
    expect(efield.caveat).toMatch(/no source in this corpus names a spacecraft cabin/i);
  });

  test("lists unlinked lunar-habitat and challenge rover claims as related or context evidence", () => {
    expect(relatedHabitatClaims("moon_base").map(claim => claim.claim_id)).toContain("LUCI-004");
    expect(contextClaims("pressurized_rover").map(claim => claim.claim_id)).toContain("CHALLENGE-002");
    expect(contextClaims("pressurized_rover").map(claim => claim.claim_id)).toContain("CHALLENGE-003");
    expect(contextClaims("mars_base").map(claim => claim.claim_id)).not.toContain("CHALLENGE-003");
  });

  test("maps numeric scores onto High, Medium, and Low bands", () => {
    expect(relevanceLevel(60)).toBe("High");
    expect(relevanceLevel(59)).toBe("Medium");
    expect(relevanceLevel(35)).toBe("Medium");
    expect(relevanceLevel(34)).toBe("Low");
  });
});
