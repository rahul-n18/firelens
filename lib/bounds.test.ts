import { describe, expect, test } from "vitest";
import { claimKind } from "./claim-kind";
import { atmospherePoints, measuredMoonRoverAtmospheres, partialGravityGroups } from "./bounds";
import { byClaim } from "./evidence";

describe("Moon and rover bounds", () => {
  test("keeps the challenge 30%/10.2 psi statement distinct from BRE’s planned 26.5%/10.2 psia", () => {
    const challenge = atmospherePoints.find(point => point.id === "challenge-moon-rover")!;
    const bre = atmospherePoints.find(point => point.id === "bre-102-265")!;
    expect(challenge.oxygenPercent).toBe(30);
    expect(challenge.oxygenBound).toBe("or_greater");
    expect(challenge.pressurePsi).toBe(10.2);
    expect(challenge.pressureBound).toBe("or_less");
    expect(challenge.kindId).toBe("challenge_context");
    expect(bre.oxygenPercent).toBe(26.5);
    expect(bre.pressurePsi).toBe(10.2);
    expect(bre.kindId).toBe("planned_test_condition");
    expect(challenge.habitatNote).toMatch(/not a NASA measurement/i);
    expect(bre.habitatNote).toMatch(/different cited figure/);
    expect(measuredMoonRoverAtmospheres).toEqual([]);
  });

  test("does not treat E-FIELD as a measured partial-gravity habitat result", () => {
    const group = partialGravityGroups.find(item => item.id === "efield-not-substitute")!;
    expect(group.claimIds).toEqual(["CHALLENGE-007", "EFIELD-005"]);
    expect(claimKind(byClaim.get("CHALLENGE-007")!).id).toBe("challenge_context");
    expect(group.summary).toMatch(/not a measured partial-gravity fire result/i);
  });
});
