import { claims as allClaims, investigationName, investigations, isMeasurement, type Claim } from "./evidence";
import { claimKind } from "./claim-kind";
import type { Investigation } from "../scripts/corpus";

export const habitatIds = ["spacecraft_cabin", "surface_habitat", "pressurized_rover"] as const;
export type HabitatId = (typeof habitatIds)[number];

export interface HabitatDefinition {
  id: HabitatId;
  label: string;
  blurb: string;
  matchingGravity: Claim["gravity_level"][];
}

export const habitats: HabitatDefinition[] = [
  {
    id: "spacecraft_cabin",
    label: "Spacecraft cabin",
    blurb: "Habitable volumes in orbit, such as a station cabin. A relevance tag appears only when a cited source names a spacecraft or cabin. Flight on the ISS alone is not treated as that tag.",
    matchingGravity: ["microgravity"],
  },
  {
    id: "surface_habitat",
    label: "Surface habitat",
    blurb: "A habitat on the Moon or Mars. Tags appear only when a cited source names a lunar or surface habitat or a Moon or Mars base.",
    matchingGravity: ["lunar_0.16g", "mars_0.38g"],
  },
  {
    id: "pressurized_rover",
    label: "Pressurized rover",
    blurb: "A pressurized rover on the Moon or Mars. No investigation in this corpus is named as a rover study. Rankings still show gravity and atmosphere factors, including challenge-stated rover conditions, which are not NASA measurements.",
    matchingGravity: ["lunar_0.16g", "mars_0.38g"],
  },
];

export const habitatAtmosphereRefs = [
  {
    id: "challenge_moon_rover",
    habitatIds: ["surface_habitat", "pressurized_rover"] as HabitatId[],
    label: "challenge-stated Moon base and pressurized rover atmosphere",
    kind: "challenge_context" as const,
    oxygen: "30% or greater",
    pressure: "10.2 psi or less",
    claimIds: ["CHALLENGE-002", "CHALLENGE-003", "CHALLENGE-014"],
  },
  {
    id: "bre_planned",
    habitatIds: ["spacecraft_cabin", "surface_habitat", "pressurized_rover"] as HabitatId[],
    label: "BRE planned atmospheres for human space missions",
    kind: "planned_test_condition" as const,
    oxygen: "21%, 26.5%, and 34%",
    pressure: "14.7, 10.2, and 8.2 psia",
    claimIds: ["BRE-001"],
  },
] as const;

export type FactorKind = "support" | "context" | "caution" | "gap";

export interface RankFactor {
  id: string;
  kind: FactorKind;
  text: string;
  claimIds: string[];
}

export interface HabitatRank {
  investigation: Investigation;
  name: string;
  tag: "supported" | "not_assessed";
  tagLabel: string;
  factors: RankFactor[];
  metadataOnly: boolean;
  sort: number[];
}

const mentionPatterns: Record<HabitatId, RegExp> = {
  spacecraft_cabin: /\bspacecraft(?:s)?\b|\bstation cabin\b|\bhabitable volumes?\b/iu,
  surface_habitat: /\blunar habitats?\b|\bmoon base\b|\bmars(?:ian)?(?: base| habitat)|\bsurface habitats?\b/iu,
  pressurized_rover: /\bpressurized rover|\brover(?:s)?\b/iu,
};

const notSpaceApplications = /not being conducted to serve any space applications/iu;

export function habitatFor(id: HabitatId) {
  return habitats.find(item => item.id === id)!;
}

function blob(claim: Claim) {
  return `${claim.claim_text} ${claim.conditions ?? ""} ${claim.source_excerpt}`;
}

export function mentionedHabitats(claim: Claim): HabitatId[] {
  const text = blob(claim);
  return habitatIds.filter(id => mentionPatterns[id].test(text));
}

function linked(investigationId: string, evidence: Claim[]) {
  return evidence.filter(claim => claim.investigation_id === investigationId);
}

function uniqueClaims(ids: string[], evidence: Claim[]) {
  const seen = new Set<string>();
  const rows: Claim[] = [];
  for (const id of ids) {
    const claim = evidence.find(item => item.claim_id === id) ?? allClaims.find(item => item.claim_id === id);
    if (!claim || seen.has(claim.claim_id)) continue;
    seen.add(claim.claim_id);
    rows.push(claim);
  }
  return rows;
}

function hasPressure(text: string, psi: number) {
  const value = String(psi).replace(".", "\\.");
  return new RegExp(`${value}\\s*psi(?:a)?\\b`, "iu").test(text);
}

function hasPercent(text: string, percent: number) {
  const value = String(percent).replace(".", "\\.");
  return new RegExp(`${value}\\s*(?:%|percent\\b)`, "iu").test(text);
}

function moleFractionRange(text: string): [number, number] | undefined {
  const match = text.replace(/−/gu, "-").match(/(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*mole fraction/iu);
  if (!match) return;
  return [Number(match[1]), Number(match[2])];
}

function atmRange(text: string): [number, number] | undefined {
  const match = text.replace(/−/gu, "-").match(/(\d+(?:\.\d+)?)\s*atm\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*atm/iu)
    ?? text.replace(/−/gu, "-").match(/(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*atm/iu);
  if (!match) return;
  return [Number(match[1]), Number(match[2])];
}

function inRange(value: number, range: [number, number]) {
  const low = Math.min(range[0], range[1]);
  const high = Math.max(range[0], range[1]);
  return value >= low && value <= high;
}

function gravityLabel(level: Claim["gravity_level"]) {
  if (level === "microgravity") return "microgravity";
  if (level === "lunar_0.16g") return "lunar gravity";
  if (level === "mars_0.38g") return "Mars gravity";
  if (level === "1g") return "1g ground";
  if (level === "multiple") return "multiple gravity levels";
  return "unspecified gravity";
}

function atmosphereFactors(habitatId: HabitatId, claims: Claim[]): RankFactor[] {
  const factors: RankFactor[] = [];
  const refs = habitatAtmosphereRefs.filter(ref => ref.habitatIds.includes(habitatId));

  for (const claim of claims) {
    const text = blob(claim);
    const kind = claimKind(claim);
    const psi102 = hasPressure(text, 10.2);
    const psi147 = hasPressure(text, 14.7);
    const psi82 = hasPressure(text, 8.2);
    const pct265 = hasPercent(text, 26.5);
    const pct30 = hasPercent(text, 30);
    const pct34 = hasPercent(text, 34);
    const pct21 = hasPercent(text, 21);
    const moles = moleFractionRange(text);
    const atms = atmRange(text);
    const includes102atm = atms ? inRange(10.2 / 14.696, atms) : false;
    const includes30mole = moles ? inRange(0.3, moles) : false;
    const includes265mole = moles ? inRange(0.265, moles) : false;

    if (habitatId !== "spacecraft_cabin" && (psi102 || pct265 || pct30 || pct34 || includes102atm || includes30mole)) {
      const pieces: string[] = [];
      if (psi102 && pct265) {
        pieces.push("It cites 10.2 psia and 26.5% oxygen as a planned test condition");
      } else if (psi102) {
        pieces.push("It cites 10.2 psi, which matches the challenge-stated Moon and rover pressure");
      }
      if (pct265 && !psi102) pieces.push("It cites 26.5% oxygen, a planned test condition");
      if (pct30) pieces.push("It cites 30% oxygen, which is challenge-statement context unless the claim itself is labeled otherwise");
      if (pct34 || psi82) pieces.push("It also cites another planned mission atmosphere (8.2 psia and/or 34% oxygen)");
      if (includes102atm && atms) {
        pieces.push(`The cited pressure range is ${atms[0]} to ${atms[1]} atm. 10.2 psi is about 0.69 atm, which sits inside that range. This is a unit conversion for comparison, not a measured result at 10.2 psi`);
      }
      if (includes30mole && moles) {
        pieces.push(`The cited oxygen mole-fraction range is ${moles[0]} to ${moles[1]}, which includes 0.30 (30%). That is a range overlap, not a measurement at the challenge-stated composition`);
      }
      if (includes265mole && moles && !includes30mole) {
        pieces.push(`The cited oxygen mole-fraction range includes 0.265 (26.5%), a planned test condition`);
      }
      if (psi102 && pct265 && refs.some(ref => ref.id === "challenge_moon_rover")) {
        pieces.push("The 10.2 psi figure matches the challenge-stated Moon and rover pressure, but 26.5% oxygen and the challenge-stated 30% or greater are different cited values and are not treated as the same atmosphere");
      }
      if (pieces.length) {
        factors.push({
          id: `atmosphere-${claim.claim_id}`,
          kind: "context",
          text: `${pieces.join(". ")}. Label: ${kind.label}.`,
          claimIds: [claim.claim_id],
        });
      }
    }

    if (habitatId === "spacecraft_cabin" && (psi147 || pct21) && (kind.id === "planned_test_condition" || psi147)) {
      factors.push({
        id: `atmosphere-cabin-${claim.claim_id}`,
        kind: kind.id === "planned_test_condition" ? "context" : "support",
        text: `A cited ${kind.label.toLowerCase()} includes a 14.7 psia, 21% oxygen atmosphere, which matches Earth's sea-level figures also given as challenge context.`,
        claimIds: [claim.claim_id],
      });
    }
  }

  return factors;
}

function gravityFactor(habitat: HabitatDefinition, claims: Claim[]): RankFactor {
  const matching = claims.filter(claim => habitat.matchingGravity.includes(claim.gravity_level));
  const measured = matching.filter(isMeasurement);
  const modeled = matching.filter(claim => claim.claim_status === "MODEL_RESULT");
  const present = [...new Set(matching.map(claim => claim.gravity_level))];
  if (measured.length) {
    return {
      id: "gravity",
      kind: "support",
      text: `${measured.length} measured ${measured.length === 1 ? "result is" : "results are"} at ${present.map(gravityLabel).join(" and ")}, which matches this habitat’s gravity class.`,
      claimIds: measured.map(claim => claim.claim_id),
    };
  }
  if (modeled.length) {
    return {
      id: "gravity",
      kind: "context",
      text: `${modeled.length} computer-model ${modeled.length === 1 ? "result is" : "results are"} at ${present.map(gravityLabel).join(" and ")}. ${habitat.id === "spacecraft_cabin" ? "That gravity matches a spacecraft cabin, but these are simulations, not measurements." : "That gravity matches this habitat class, but these are simulations, not measurements."}`,
      claimIds: modeled.map(claim => claim.claim_id),
    };
  }
  if (matching.length) {
    return {
      id: "gravity",
      kind: "context",
      text: `Linked claims include ${present.map(gravityLabel).join(" and ")}, which matches this habitat’s gravity class, but none is a measured result.`,
      claimIds: matching.map(claim => claim.claim_id),
    };
  }
  const other = [...new Set(claims.map(claim => claim.gravity_level).filter(level => level !== "unspecified" && level !== "multiple"))];
  if (other.length) {
    return {
      id: "gravity",
      kind: "gap",
      text: `Cited gravity in this corpus is ${other.map(gravityLabel).join(" and ")}, which does not match this habitat’s gravity class (${habitat.matchingGravity.map(gravityLabel).join(" or ")}).`,
      claimIds: [],
    };
  }
  return {
    id: "gravity",
    kind: "gap",
    text: `No cited gravity level in this corpus matches ${habitat.matchingGravity.map(gravityLabel).join(" or ")}.`,
    claimIds: [],
  };
}

function flammabilityFactor(claims: Claim[]): RankFactor | undefined {
  const topics = new Set(["material_flammability", "flame_spread"]);
  const measured = claims.filter(claim => isMeasurement(claim) && claim.topics.some(topic => topics.has(topic)));
  if (!measured.length) return;
  return {
    id: "flammability",
    kind: "support",
    text: `${measured.length} measured ${measured.length === 1 ? "result concerns" : "results concern"} material flammability or flame spread.`,
    claimIds: measured.map(claim => claim.claim_id),
  };
}

export function rankForHabitat(habitatId: HabitatId, evidence: Claim[] = allClaims): HabitatRank[] {
  const habitat = habitatFor(habitatId);
  const ranks = investigations.map(investigation => {
    const claims = linked(investigation.investigation_id, evidence);
    const mentionClaims = claims.filter(claim => mentionedHabitats(claim).includes(habitatId));
    const cautionClaims = claims.filter(claim => notSpaceApplications.test(blob(claim)));
    const factors: RankFactor[] = [];
    if (mentionClaims.length) {
      factors.push({
        id: "mention",
        kind: "support",
        text: `A cited source names this habitat class (${mentionClaims.map(claim => claim.claim_id).join(", ")}).`,
        claimIds: mentionClaims.map(claim => claim.claim_id),
      });
    }
    if (cautionClaims.length) {
      factors.push({
        id: "caution",
        kind: "caution",
        text: "A cited PSI statement says this research is not being conducted to serve any space applications.",
        claimIds: cautionClaims.map(claim => claim.claim_id),
      });
    }
    factors.push(gravityFactor(habitat, claims));
    factors.push(...atmosphereFactors(habitatId, claims));
    const flammability = flammabilityFactor(claims);
    if (flammability) factors.push(flammability);
    const metadataOnly = investigation.coverage === "METADATA_ONLY" || claims.length === 0;
    if (metadataOnly) {
      factors.push({
        id: "metadata",
        kind: "gap",
        text: "This investigation is indexed in PSI, but FireLens does not yet have extracted claims that can be ranked.",
        claimIds: [],
      });
    }
    if (!mentionClaims.length) {
      factors.push({
        id: "tag",
        kind: "gap",
        text: `Habitat relevance: Not assessed. No source in this corpus names a ${habitat.label.toLowerCase()} for this investigation.`,
        claimIds: [],
      });
    }
    const supported = mentionClaims.length > 0 && cautionClaims.length === 0;
    const measuredMatch = claims.filter(claim => isMeasurement(claim) && habitat.matchingGravity.includes(claim.gravity_level)).length;
    const atmosphereWeight = factors.reduce((score, factor) => {
      if (!factor.id.startsWith("atmosphere")) return score;
      if (/10\.2/.test(factor.text) && /26\.5/.test(factor.text)) return score + 4;
      if (/10\.2/.test(factor.text) && !/about 0\.69 atm/.test(factor.text)) return score + 3;
      return score + 1;
    }, 0);
    const reviewed = claims.some(claim => claim.review.status === "HUMAN_REVIEWED") ? 1 : 0;
    const sort = [
      supported ? 1 : 0,
      cautionClaims.length ? 0 : 1,
      metadataOnly ? 0 : 1,
      measuredMatch,
      atmosphereWeight,
      flammability ? flammability.claimIds.length : 0,
      reviewed,
    ];
    return {
      investigation,
      name: investigationName(investigation),
      tag: supported ? "supported" as const : "not_assessed" as const,
      tagLabel: supported ? habitat.label : "Not assessed",
      factors,
      metadataOnly,
      sort,
    };
  });
  return ranks.sort((a, b) => {
    for (let i = 0; i < a.sort.length; i += 1) {
      if (b.sort[i] !== a.sort[i]) return b.sort[i] - a.sort[i];
    }
    return a.investigation.investigation_id.localeCompare(b.investigation.investigation_id);
  });
}

export function relatedHabitatClaims(habitatId: HabitatId, evidence: Claim[] = allClaims) {
  const contextIds = new Set(contextClaims(habitatId, evidence).map(claim => claim.claim_id));
  return evidence.filter(claim => {
    if (claim.investigation_id !== null || contextIds.has(claim.claim_id)) return false;
    if (mentionedHabitats(claim).includes(habitatId)) return true;
    if (atmosphereFactors(habitatId, [claim]).length) return true;
    if (habitatId === "surface_habitat" && habitatFor(habitatId).matchingGravity.includes(claim.gravity_level)
      && (isMeasurement(claim) || claim.claim_status === "MODEL_RESULT" || claim.evidence_label === "Authors' suggestion" || (claim.evidence_label ?? "").startsWith("Planned"))) {
      return true;
    }
    return false;
  });
}

export function contextClaims(habitatId: HabitatId, evidence: Claim[] = allClaims) {
  const ids: string[] = habitatAtmosphereRefs.filter(ref => ref.habitatIds.includes(habitatId)).flatMap(ref => [...ref.claimIds]);
  if (habitatId !== "spacecraft_cabin") ids.push("CHALLENGE-006", "CHALLENGE-007");
  return uniqueClaims(ids, evidence);
}
