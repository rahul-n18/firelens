import { describe, expect, test } from "vitest";
import { evidenceGap, isMeasurement, search } from "./evidence";
import { claimKind } from "./claim-kind";
import { interpret } from "./interpret";

describe("deterministic interpretation", () => {
  test("does not treat a microgravity measurement as the answer to a lunar question", () => {
    const result = search("What smoke-particle diameter was measured at lunar gravity?");
    const view = interpret(result, evidenceGap(result));
    expect(view.sentences.every(item => item.claim.gravity_level === "lunar_0.16g" || !isMeasurement(item.claim))).toBe(true);
    expect(view.sentences.every(item => item.claim.gravity_level !== "microgravity" || !isMeasurement(item.claim))).toBe(true);
    expect(view.notes.some(note => /no measured result/i.test(note) || /no reported measurement/i.test(note))).toBe(true);
    expect(view.disclosure).toMatch(/does not call an AI model/i);
  });

  test("labels challenge context instead of calling it a measurement", () => {
    const result = search("Moon base oxygen 30% at 10.2 psi");
    const view = interpret(result, evidenceGap(result));
    const target = view.sentences.find(item => item.claim.source_id === "SPACEAPPS-2026-FIF");
    expect(target).toBeTruthy();
    expect(claimKind(target!.claim).id).toBe("challenge_context");
    expect(target!.text).toMatch(/challenge-statement context, not a NASA measurement/i);
    expect(target!.text).not.toMatch(/^A measured result/i);
  });

  test("each sentence is bound to one claim and does not say measured unless the claim is a measurement", () => {
    const result = search("Which investigations study smoke behavior in microgravity?");
    const view = interpret(result, evidenceGap(result));
    expect(view.sentences.length).toBeGreaterThan(0);
    expect(view.sentences.length).toBeLessThanOrEqual(3);
    for (const item of view.sentences) {
      expect(item.text).toContain(item.claim.claim_text);
      if (!isMeasurement(item.claim)) expect(item.text).not.toMatch(/^A measured result/i);
    }
  });
});
