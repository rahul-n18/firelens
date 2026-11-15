import { claims as allClaims, investigationName, investigations, isMeasurement, type Claim } from "./evidence";
import { claimKind } from "./claim-kind";
import type { Investigation } from "../scripts/corpus";

export const habitatIds = ["spacecraft_cabin", "moon_base", "mars_base", "pressurized_rover"] as const;
export type HabitatId = (typeof habitatIds)[number];
export type RelevanceLevel = "High" | "Medium" | "Low";
export const SCORE_MAX = 100;

export interface HabitatDefinition {
  id: HabitatId;
  label: string;
  blurb: string;
  matchingGravity: Claim["gravity_level"][];
  boundingGravity: Claim["gravity_level"][];
}

export const habitats: HabitatDefinition[] = [
  {
    id: "spacecraft_cabin",
    label: "Spacecraft cabin",
    blurb: "Habitable volumes in orbit, such as a station cabin. Gravity match is microgravity. Atmosphere overlap uses cited 14.7 psi / 21% oxygen figures, not the challenge-stated Moon and rover atmosphere.",
    matchingGravity: ["microgravity"],
    boundingGravity: ["1g"],
  },
  {
    id: "moon_base",
    label: "Moon surface base",
    blurb: "A habitat on the lunar surface. Gravity match is lunar gravity. Atmosphere overlap uses the challenge-stated Moon atmosphere (30% oxygen or greater, 10.2 psi or less), kept distinct from BRE’s planned 26.5% oxygen at 10.2 psia.",
    matchingGravity: ["lunar_0.16g"],
    boundingGravity: ["microgravity", "1g"],
  },
  {
    id: "mars_base",
    label: "Mars surface base",
    blurb: "A habitat on the Martian surface. Gravity match is Mars gravity. This corpus does not cite a Mars-cabin atmosphere, so oxygen and pressure overlap is not scored from the Moon and rover challenge figures.",
    matchingGravity: ["mars_0.38g"],
    boundingGravity: ["microgravity", "1g"],
  },
  {
    id: "pressurized_rover",
    label: "Pressurized rover",
    blurb: "A pressurized rover on the Moon or Mars. Gravity match is lunar or Mars gravity. Atmosphere overlap uses the same challenge-stated rover figures as the Moon base, still distinct from BRE’s planned 26.5% oxygen at 10.2 psia. No investigation in this corpus is named as a rover study.",
    matchingGravity: ["lunar_0.16g", "mars_0.38g"],
    boundingGravity: ["microgravity", "1g"],
  },
];

export const habitatAtmosphereRefs = [
  {
    id: "challenge_moon_rover",
    habitatIds: ["moon_base", "pressurized_rover"] as HabitatId[],
    label: "challenge-stated Moon base and pressurized rover atmosphere",
    kind: "challenge_context" as const,
    oxygen: "30% or greater",
    pressure: "10.2 psi or less",
    claimIds: ["CHALLENGE-002", "CHALLENGE-003", "CHALLENGE-014"],
  },
  {
    id: "bre_planned",
    habitatIds: ["spacecraft_cabin", "moon_base", "mars_base", "pressurized_rover"] as HabitatId[],
    label: "BRE planned atmospheres for human space missions",
    kind: "planned_test_condition" as const,
    oxygen: "21%, 26.5%, and 34%",
    pressure: "14.7, 10.2, and 8.2 psia",
    claimIds: ["BRE-001"],
  },
] as const;

export const scoringNote = "These scores are FireLens’s own ranking method, derived from cited claims and the factors listed here. They are not a NASA rating.";

export type FactorKind = "support" | "context" | "caution" | "gap";

export interface RankFactor {
  id: string;
  kind: FactorKind;
  label: string;
  text: string;
  points: number;
  maxPoints: number;
  claimIds: string[];
}

export interface HabitatRank {
  investigation: Investigation;
  name: string;
  score: number;
  level: RelevanceLevel;
  namedBySource: boolean;
  caveat: string | undefined;
  factors: RankFactor[];
  metadataOnly: boolean;
}

const mentionPatterns: Record<HabitatId, RegExp> = {
  spacecraft_cabin: /\bspacecraft(?:s)?\b|\bstation cabin\b|\bhabitable volumes?\b/iu,
  moon_base: /\blunar habitats?\b|\bmoon base\b/iu,
  mars_base: /\bmars(?:ian)?(?: base| habitat)s?\b/iu,
  pressurized_rover: /\bpressurized rover|\brover(?:s)?\b/iu,
};

const cabinMaterials = /\b(?:pmma|nylon|nomex|cotton|fiberglass|sibal|ultem|silicone|lampwick|fabric)\b/iu;
const dropletFuels = /\b(?:heptane|methanol|n-dodecane|dodecane|droplet)\b/iu;
const gaseousFuels = /\b(?:methane|ethylene|ch4|c2h4|gaseous fuels?)\b/iu;
const notSpaceApplications = /not being conducted to serve any space applications/iu;
const sealedVehicle = /\bcygnus\b|\bsealed environments?\b|\bcargo (?:supply )?vehicle\b/iu;

const preventionTopics = new Set(["material_flammability", "flame_spread"]);
const detectionTopics = new Set(["detector_response", "smoke_particle_size", "smoke_transport", "smoke_morphology"]);
const suppressionPattern = /\b(?:suppress(?:ant|ion|es|ed)?|extinguish(?:ing|ment|es|ed)?|inert gas|limiting oxygen index|\bloi\b)\b/iu;

export function habitatFor(id: HabitatId) {
  return habitats.find(item => item.id === id)!;
}

export function relevanceLevel(score: number): RelevanceLevel {
  if (score >= 60) return "High";
  if (score >= 35) return "Medium";
  return "Low";
}

export function scoreLabel(rank: Pick<HabitatRank, "level" | "score">) {
  return `${rank.level} · ${rank.score}`;
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
  return new RegExp(`(?<!\\b(?:below|under|above|over|greater than|less than|up to|at least)\\s+)${value}\\s*(?:%|percent\\b)`, "iu").test(text);
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

function factor(partial: Omit<RankFactor, "maxPoints"> & { maxPoints?: number }): RankFactor {
  return { maxPoints: partial.maxPoints ?? 25, ...partial };
}

function gravityFactor(habitat: HabitatDefinition, claims: Claim[]): RankFactor {
  const matching = claims.filter(claim => habitat.matchingGravity.includes(claim.gravity_level));
  const measured = matching.filter(isMeasurement);
  const modeled = matching.filter(claim => claim.claim_status === "MODEL_RESULT");
  const present = [...new Set(matching.map(claim => claim.gravity_level))];
  if (measured.length) {
    return factor({
      id: "gravity",
      kind: "support",
      label: "Gravity match",
      points: 25,
      text: `${measured.length} measured ${measured.length === 1 ? "result is" : "results are"} at ${present.map(gravityLabel).join(" and ")}, which matches this habitat’s gravity class.`,
      claimIds: measured.map(claim => claim.claim_id),
    });
  }
  if (modeled.length) {
    return factor({
      id: "gravity",
      kind: "context",
      label: "Gravity match",
      points: 18,
      text: `${modeled.length} computer-model ${modeled.length === 1 ? "result is" : "results are"} at ${present.map(gravityLabel).join(" and ")}. That gravity matches this habitat class, but these are simulations, not measurements.`,
      claimIds: modeled.map(claim => claim.claim_id),
    });
  }
  if (matching.length) {
    return factor({
      id: "gravity",
      kind: "context",
      label: "Gravity match",
      points: 12,
      text: `Linked claims include ${present.map(gravityLabel).join(" and ")}, which matches this habitat’s gravity class, but none is a measured result.`,
      claimIds: matching.map(claim => claim.claim_id),
    });
  }
  const bounding = claims.filter(claim => habitat.boundingGravity.includes(claim.gravity_level));
  if (bounding.length) {
    const levels = [...new Set(bounding.map(claim => claim.gravity_level))];
    return factor({
      id: "gravity",
      kind: "context",
      label: "Gravity bound",
      points: 8,
      text: `No claim in this investigation is at ${habitat.matchingGravity.map(gravityLabel).join(" or ")}. Cited results at ${levels.map(gravityLabel).join(" and ")} are used only as a gravity bound, not as a match.`,
      claimIds: bounding.slice(0, 4).map(claim => claim.claim_id),
    });
  }
  return factor({
    id: "gravity",
    kind: "gap",
    label: "Gravity match",
    points: 0,
    text: `No cited gravity level in this corpus matches or bounds ${habitat.matchingGravity.map(gravityLabel).join(" or ")}.`,
    claimIds: [],
  });
}

interface AtmosphereHit {
  claim: Claim;
  points: number;
  pieces: string[];
}

function atmosphereHits(habitatId: HabitatId, claims: Claim[]): AtmosphereHit[] {
  const hits: AtmosphereHit[] = [];
  const moonOrRover = habitatId === "moon_base" || habitatId === "pressurized_rover";
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
    const includes21mole = moles ? inRange(0.21, moles) : false;
    const pieces: string[] = [];
    let points = 0;

    if (moonOrRover && (psi102 || pct265 || pct30 || includes102atm || includes30mole || pct34 || psi82)) {
      if (psi102 && pct265) {
        pieces.push("It cites 10.2 psia and 26.5% oxygen as a planned test condition");
        points = Math.max(points, 15);
      } else if (psi102) {
        pieces.push("It cites 10.2 psi, which matches the challenge-stated Moon and rover pressure");
        points = Math.max(points, 12);
      }
      if (pct30 && kind.id === "challenge_context") {
        pieces.push("It cites 30% oxygen as challenge-statement context, not a NASA measurement");
        points = Math.max(points, 8);
      }
      if (includes102atm && atms) {
        pieces.push(`The cited pressure range is ${atms[0]} to ${atms[1]} atm. 10.2 psi is about 0.69 atm, which sits inside that range. This is a unit conversion for comparison, not a measured result at 10.2 psi`);
        points = Math.max(points, 10);
      }
      if (includes30mole && moles) {
        pieces.push(`The cited oxygen mole-fraction range is ${moles[0]} to ${moles[1]}, which includes 0.30 (30%). That is a range overlap, not a measurement at the challenge-stated composition`);
        points = Math.max(points, 10);
      }
      if (psi102 && pct265) {
        pieces.push("The 10.2 psi figure matches the challenge-stated Moon and rover pressure, but 26.5% oxygen and the challenge-stated 30% or greater are different cited values and are not treated as the same atmosphere");
      }
      if ((pct34 || psi82) && !points) {
        pieces.push("It cites another planned mission atmosphere (8.2 psia and/or 34% oxygen), which is not the challenge-stated Moon or rover composition");
        points = Math.max(points, 6);
      }
    }

    if (habitatId === "spacecraft_cabin" && (psi147 || pct21 || includes21mole)) {
      pieces.push(`A cited ${kind.label.toLowerCase()} includes a 14.7 psia and/or 21% oxygen atmosphere, which matches Earth's sea-level figures also given as challenge context.`);
      points = Math.max(points, kind.id === "planned_test_condition" ? 15 : isMeasurement(claim) ? 20 : 10);
    }

    if (habitatId === "mars_base" && (psi147 || psi102 || pct21 || pct265 || pct34)) {
      pieces.push("Cited atmospheres in this investigation are planned or challenge figures for human space missions or the Moon and rover, not a cited Mars-cabin atmosphere. They are scored only as a weak planned-condition overlap.");
      points = Math.max(points, 5);
    }

    if (pieces.length) hits.push({ claim, points, pieces });
  }
  return hits;
}

function atmosphereFactor(habitatId: HabitatId, claims: Claim[]): RankFactor {
  const hits = atmosphereHits(habitatId, claims).sort((a, b) => b.points - a.points);
  if (!hits.length) {
    const text = habitatId === "mars_base"
      ? "This corpus does not cite a Mars-cabin oxygen or pressure condition for this investigation."
      : habitatId === "spacecraft_cabin"
        ? "No cited 14.7 psi or 21% oxygen condition was extracted for this investigation."
        : "No cited overlap with the challenge-stated 10.2 psi or 30% oxygen Moon and rover atmosphere, or with BRE’s distinct planned 26.5% oxygen at 10.2 psia, was extracted for this investigation.";
    return factor({
      id: "atmosphere",
      kind: "gap",
      label: "Atmosphere overlap",
      points: 0,
      text,
      claimIds: [],
    });
  }
  const best = hits[0];
  const extras = hits.slice(1, 3).flatMap(hit => hit.claim.claim_id === best.claim.claim_id ? [] : [hit]);
  return factor({
    id: "atmosphere",
    kind: "context",
    label: "Atmosphere overlap",
    points: Math.min(25, best.points),
    text: `${best.pieces.join(". ")}. Label: ${claimKind(best.claim).label}.${extras.length ? " Additional overlapping claims are cited." : ""}`,
    claimIds: [best.claim.claim_id, ...extras.map(hit => hit.claim.claim_id)],
  });
}

function materialsFactor(claims: Claim[]): RankFactor {
  const textFor = (claim: Claim) => `${blob(claim)} ${claim.materials.join(" ")}`;
  const cabin = claims.filter(claim => claim.materials.some(name => cabinMaterials.test(name)) || cabinMaterials.test(textFor(claim)));
  const gas = claims.filter(claim => gaseousFuels.test(textFor(claim)));
  const droplet = claims.filter(claim => dropletFuels.test(textFor(claim)));
  if (cabin.length) {
    const measured = cabin.some(isMeasurement);
    return factor({
      id: "materials",
      kind: measured ? "support" : "context",
      label: "Cabin materials",
      points: measured ? 20 : 14,
      maxPoints: 20,
      text: measured
        ? "Cited fuels include cabin-relevant solids such as fabrics, PMMA, nylon, Nomex, or silicone, with at least one measured result."
        : "Cited fuels include cabin-relevant solids such as fabrics, PMMA, nylon, Nomex, or silicone, but not as a measured result in this corpus.",
      claimIds: cabin.slice(0, 4).map(claim => claim.claim_id),
    });
  }
  if (gas.length) {
    return factor({
      id: "materials",
      kind: "context",
      label: "Cabin materials",
      points: 10,
      maxPoints: 20,
      text: "Cited fuels are gaseous (for example methane or ethylene). Those are relevant to materials-flammability studies, but they are not cabin furnishings.",
      claimIds: gas.slice(0, 4).map(claim => claim.claim_id),
    });
  }
  if (droplet.length) {
    return factor({
      id: "materials",
      kind: "context",
      label: "Cabin materials",
      points: 8,
      maxPoints: 20,
      text: "Cited fuels are liquid droplets (for example heptane, methanol, or dodecane), which inform combustion limits more than cabin interior materials.",
      claimIds: droplet.slice(0, 4).map(claim => claim.claim_id),
    });
  }
  return factor({
    id: "materials",
    kind: "gap",
    label: "Cabin materials",
    points: 0,
    maxPoints: 20,
    text: "No cabin-relevant material or fuel type was extracted for this investigation.",
    claimIds: [],
  });
}

function pillarsFactor(claims: Claim[]): RankFactor {
  const prevention = claims.filter(claim => claim.topics.some(topic => preventionTopics.has(topic)));
  const detection = claims.filter(claim => claim.topics.some(topic => detectionTopics.has(topic)));
  const suppression = claims.filter(claim =>
    suppressionPattern.test(blob(claim)) || /\bextinction\b/iu.test(blob(claim)),
  );
  const groups = [
    ["prevention", prevention],
    ["detection", detection],
    ["suppression", suppression],
  ] as const;
  const present = groups.filter(([, rows]) => rows.length);
  const points = Math.min(15, present.length * 5);
  const claimIds = present.flatMap(([, rows]) => rows.slice(0, 2).map(claim => claim.claim_id));
  if (!present.length) {
    return factor({
      id: "pillars",
      kind: "gap",
      label: "Fire-safety pillar",
      points: 0,
      maxPoints: 15,
      text: "No extracted claim was classified as prevention, detection, or suppression for this investigation.",
      claimIds: [],
    });
  }
  return factor({
    id: "pillars",
    kind: "support",
    label: "Fire-safety pillar",
    points,
    maxPoints: 15,
    text: `Cited claims inform ${present.map(([name]) => name).join(", ")}.`,
    claimIds: [...new Set(claimIds)],
  });
}

function evidenceFactor(claims: Claim[]): RankFactor {
  const measured = claims.filter(isMeasurement);
  const planned = claims.filter(claim =>
    claimKind(claim).id === "planned_test_condition" || claimKind(claim).id === "planned",
  );
  const reviewed = claims.filter(claim => claim.review.status === "HUMAN_REVIEWED");
  let points = 0;
  let text: string;
  if (measured.length) {
    points = 10;
    text = `${measured.length} measured ${measured.length === 1 ? "result is" : "results are"} cited.`;
  } else if (planned.length) {
    points = 6;
    text = "The strongest cited items are planned test conditions or planned work, not measured results.";
  } else if (claims.length) {
    points = 3;
    text = "Cited items are objectives, methods, or remarks, not measured results.";
  } else {
    return factor({
      id: "evidence",
      kind: "gap",
      label: "Evidence strength",
      points: 0,
      maxPoints: 15,
      text: "No extracted claims are available to score evidence strength.",
      claimIds: [],
    });
  }
  if (reviewed.length) {
    points += 5;
    text += ` ${reviewed.length} ${reviewed.length === 1 ? "claim is" : "claims are"} human-reviewed.`;
  } else {
    text += " All cited claims for this investigation are still drafts.";
  }
  return factor({
    id: "evidence",
    kind: measured.length ? "support" : "context",
    label: "Evidence strength",
    points,
    maxPoints: 15,
    text,
    claimIds: (measured.length ? measured : planned.length ? planned : claims).slice(0, 4).map(claim => claim.claim_id),
  });
}

function sealedVehicleFactor(habitatId: HabitatId, claims: Claim[]): RankFactor | undefined {
  if (habitatId !== "pressurized_rover") return;
  const hits = claims.filter(claim => sealedVehicle.test(blob(claim)));
  if (!hits.length) return;
  return factor({
    id: "volume",
    kind: "context",
    label: "Sealed volume",
    points: 8,
    maxPoints: 8,
    text: "A cited source describes a test in a small sealed cargo vehicle. That is not a pressurized rover, but it is a small sealed volume, so it is scored as a limited analog.",
    claimIds: hits.slice(0, 3).map(claim => claim.claim_id),
  });
}

export function rankInvestigation(habitatId: HabitatId, investigation: Investigation, evidence: Claim[] = allClaims): HabitatRank {
  const habitat = habitatFor(habitatId);
  const claims = linked(investigation.investigation_id, evidence);
  const mentionClaims = claims.filter(claim => mentionedHabitats(claim).includes(habitatId));
  const cautionClaims = claims.filter(claim => notSpaceApplications.test(blob(claim)));
  const factors: RankFactor[] = [
    gravityFactor(habitat, claims),
    atmosphereFactor(habitatId, claims),
    materialsFactor(claims),
    pillarsFactor(claims),
    evidenceFactor(claims),
  ];
  const volume = sealedVehicleFactor(habitatId, claims);
  if (volume) factors.push(volume);
  if (mentionClaims.length) {
    factors.push(factor({
      id: "mention",
      kind: "support",
      label: "Named by a source",
      points: 8,
      maxPoints: 8,
      text: "A cited source names this habitat class.",
      claimIds: mentionClaims.map(claim => claim.claim_id),
    }));
  }
  if (cautionClaims.length) {
    factors.push(factor({
      id: "caution",
      kind: "caution",
      label: "Space-application caution",
      points: -20,
      maxPoints: 0,
      text: "A cited PSI statement says this research is not being conducted to serve any space applications. Twenty points are deducted.",
      claimIds: cautionClaims.map(claim => claim.claim_id),
    }));
  }
  const metadataOnly = investigation.coverage === "METADATA_ONLY" || claims.length === 0;
  const raw = metadataOnly ? 0 : factors.reduce((sum, item) => sum + item.points, 0);
  const score = Math.max(0, Math.min(SCORE_MAX, raw));
  const namedBySource = mentionClaims.length > 0;
  return {
    investigation,
    name: investigationName(investigation),
    score,
    level: relevanceLevel(score),
    namedBySource,
    caveat: namedBySource
      ? undefined
      : `No source in this corpus names a ${habitat.label.toLowerCase()} for this investigation.`,
    factors,
    metadataOnly,
  };
}

export function rankForHabitat(habitatId: HabitatId, evidence: Claim[] = allClaims): HabitatRank[] {
  return investigations
    .map(investigation => rankInvestigation(habitatId, investigation, evidence))
    .sort((a, b) => {
      if (a.metadataOnly !== b.metadataOnly) return a.metadataOnly ? 1 : -1;
      if (b.score !== a.score) return b.score - a.score;
      return a.investigation.investigation_id.localeCompare(b.investigation.investigation_id);
    });
}

export function relatedHabitatClaims(habitatId: HabitatId, evidence: Claim[] = allClaims) {
  const contextIds = new Set(contextClaims(habitatId, evidence).map(claim => claim.claim_id));
  return evidence.filter(claim => {
    if (claim.investigation_id !== null || contextIds.has(claim.claim_id)) return false;
    if (mentionedHabitats(claim).includes(habitatId)) return true;
    if (atmosphereHits(habitatId, [claim]).length) return true;
    if (habitatId === "moon_base" && habitatFor(habitatId).matchingGravity.includes(claim.gravity_level)
      && (isMeasurement(claim) || claim.claim_status === "MODEL_RESULT" || claim.evidence_label === "Authors' suggestion" || (claim.evidence_label ?? "").startsWith("Planned"))) {
      return true;
    }
    return false;
  });
}

export function contextClaims(habitatId: HabitatId, evidence: Claim[] = allClaims) {
  const ids: string[] = habitatAtmosphereRefs.filter(ref => ref.habitatIds.includes(habitatId)).flatMap(ref => [...ref.claimIds]);
  if (habitatId === "moon_base" || habitatId === "pressurized_rover" || habitatId === "mars_base") {
    ids.push("CHALLENGE-006", "CHALLENGE-007");
  }
  if (habitatId === "mars_base") {
    return uniqueClaims(ids.filter(id => id === "BRE-001" || id === "CHALLENGE-006" || id === "CHALLENGE-007"), evidence);
  }
  if (habitatId === "spacecraft_cabin") {
    return uniqueClaims(["CHALLENGE-001", "BRE-001"], evidence);
  }
  return uniqueClaims(ids, evidence);
}
