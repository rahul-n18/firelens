import { describe, expect, test } from "vitest";
import { byClaim } from "./evidence";
import { claimKind } from "./claim-kind";
import { compareProfiles, familyFor, profileFor } from "./profiles";

describe("claim kinds", () => {
  test("labels challenge context separately from measurements", () => {
    const kind = claimKind(byClaim.get("CHALLENGE-003")!);
    expect(kind).toMatchObject({ id: "challenge_context", measured: false, label: "Challenge context" });
    expect(kind.notice).toMatch(/not a NASA measurement/i);
    expect(claimKind(byClaim.get("BRE-001")!).label).toBe("Planned test condition");
    expect(claimKind(byClaim.get("BRE-004")!).label).toBe("Measured result");
    expect(claimKind(byClaim.get("BASS-003")!).label).toBe("Equipment specification");
  });
});

describe("investigation profiles", () => {
  test("places BASS and BASS-II in the MSG family and compares structured fields", () => {
    expect(familyFor("PSI-26")?.label).toBe("MSG / SPICE flow duct");
    const bass = profileFor("PSI-26")!;
    const bassii = profileFor("PSI-25")!;
    expect(bass.attributes.find(bucket => bucket.key === "fuels")!.claims.map(claim => claim.claim_id)).toContain("BASS-004");
    const points = compareProfiles([bass, bassii]);
    expect(points.some(point => /MSG \/ SPICE flow duct/.test(point.text))).toBe(true);
  });
});
