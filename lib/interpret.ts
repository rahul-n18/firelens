import { evidenceGap, gravityLabels, isMeasurement, search, type Claim } from "./evidence";
import { claimKind } from "./claim-kind";

export const interpretDisclosure = "This interpretation is assembled from verified claims with fixed templates. The running app does not call an AI model.";

export interface InterpretSentence {
  claim: Claim;
  text: string;
}

export interface Interpretation {
  sentences: InterpretSentence[];
  nearest: Claim[];
  notes: string[];
  disclosure: string;
}

type SearchResult = ReturnType<typeof search>;
type Gap = ReturnType<typeof evidenceGap>;

export function sentenceFor(claim: Claim) {
  const kind = claimKind(claim);
  const gravity = claim.gravity_level !== "unspecified" ? ` At ${gravityLabels[claim.gravity_level].toLowerCase()}.` : "";
  const lead = kind.measured
    ? "A measured result in this corpus states:"
    : kind.id === "challenge_context"
      ? "Challenge-statement context, not a NASA measurement:"
      : kind.id === "planned_test_condition"
        ? "A planned or proposed test condition, not a measured result:"
        : kind.id === "model"
          ? "A computer-model result, not a measurement, states:"
          : kind.id === "method" || kind.id === "equipment"
            ? "A reported method or equipment statement, not a measured outcome, states:"
            : kind.id === "earth_application"
              ? "An application named by the source, not a new measurement, states:"
              : kind.id === "planned"
                ? "A planned activity, not a measured result, states:"
                : "A stated objective, hypothesis, or author remark, not a measured result, states:";
  return `${lead} ${claim.claim_text}${gravity}`;
}

function matchesRequestedGravity(claim: Claim, requested: Claim["gravity_level"][]) {
  if (!requested.length) return true;
  if (requested.includes(claim.gravity_level)) return true;
  const kind = claimKind(claim).id;
  return !isMeasurement(claim)
    && (claim.gravity_level === "unspecified" || claim.gravity_level === "multiple")
    && (kind === "challenge_context" || kind === "planned_test_condition");
}

function matchesQuantity(claim: Claim, result: SearchResult) {
  const quantity = result.query.quantity;
  if (!quantity) return true;
  const talksAboutSize = claim.topics.includes("smoke_particle_size")
    || /\b(?:diameter|particle size)\b/iu.test(`${claim.quantity ?? ""} ${claim.claim_text}`);
  if (!talksAboutSize) return false;
  if (!isMeasurement(claim)) return true;
  return quantity !== "diameter" || /\bdiameter\b/iu.test(claim.quantity ?? claim.claim_text);
}

export function interpret(result: SearchResult, gap: Gap): Interpretation {
  const requested = result.query.gravity;
  const pool = [...result.direct, ...result.related, ...result.claimHits.map(hit => hit.item)];
  const seen = new Set<string>();
  const unique = pool.filter(claim => {
    if (seen.has(claim.claim_id)) return false;
    seen.add(claim.claim_id);
    return true;
  });
  const matching = unique.filter(claim => matchesRequestedGravity(claim, requested) && matchesQuantity(claim, result));
  const mismatched = unique.filter(claim => !matching.includes(claim));
  const scoreOf = (claim: Claim) => result.claimHits.find(hit => hit.item.claim_id === claim.claim_id)?.score ?? 0;
  const byScore = (a: Claim, b: Claim) => scoreOf(b) - scoreOf(a) || a.claim_id.localeCompare(b.claim_id);
  const measured = matching.filter(isMeasurement).sort(byScore).slice(0, 2);
  const other = matching.filter(claim => !measured.includes(claim)).sort(byScore);
  const direct = [...measured, ...other].slice(0, 3);
  const notes: string[] = [];
  if (gap) notes.push(gap.text);
  if (requested.length && !direct.some(isMeasurement)) {
    const measuredAtGravity = unique.some(claim => isMeasurement(claim) && requested.includes(claim.gravity_level));
    if (!measuredAtGravity) {
      notes.push(`No measured result in this corpus is at the requested gravity (${requested.map(level => gravityLabels[level].toLowerCase()).join(" or ")}). Claims from other gravity levels are nearest evidence, not the answer.`);
    }
  }
  if (requested.length && mismatched.some(isMeasurement)) {
    notes.push("Retrieved measurements at a different gravity are shown as nearest evidence and are not used as the answer.");
  }
  const nearest = [...new Map([
    ...mismatched,
    ...(gap ? [...gap.context, ...gap.related] : []),
  ].filter(claim => !direct.some(item => item.claim_id === claim.claim_id)).map(claim => [claim.claim_id, claim])).values()];
  return {
    sentences: direct.map(claim => ({ claim, text: sentenceFor(claim) })),
    nearest,
    notes: [...new Set(notes)],
    disclosure: interpretDisclosure,
  };
}
