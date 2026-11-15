import claimsData from "../corpus/claims.json" with { type: "json" };
import investigationData from "../corpus/investigations.json" with { type: "json" };
import manifestData from "../corpus/manifest.json" with { type: "json" };
import vocabulary from "../corpus/vocabulary.json" with { type: "json" };
import type { Claim, Investigation, Source } from "../scripts/corpus";

export const claims = claimsData as Claim[];
export const investigations = investigationData as Investigation[];
export const sources = new Map((manifestData as Source[]).map(source => [source.source_id, source]));
export type { Claim };

export const demoQueries = [
  "What did SAME-R measure in orbit, and what ground tests followed?",
  "Which investigations study smoke behavior in microgravity?",
  "What smoke-particle diameter was measured at lunar gravity?",
];
export const relatedHeading = "Related results, investigation not identified by the source";
export const spiceHeading = "Different meaning: flame smoke point (soot emission)";
export const metadataHeading = "Indexed, not yet reviewed";

export const gravityLabels: Record<Claim["gravity_level"], string> = {
  "1g": "1g ground", microgravity: "Microgravity", "lunar_0.16g": "Lunar gravity",
  "mars_0.38g": "Mars gravity", multiple: "Multiple gravity levels", unspecified: "Gravity unspecified",
};
export const platformLabels: Record<Claim["platform"], string> = {
  ISS_FLIGHT: "ISS flight", GROUND_LAB: "Ground lab", REDUCED_GRAVITY_AIRCRAFT: "Reduced-gravity aircraft",
  DROP_TOWER: "Drop tower", NUMERICAL_MODEL: "Computer model", MIXED: "Mixed platforms", UNSPECIFIED: "Platform unspecified",
};
export const statusLabels: Record<Claim["claim_status"], string> = {
  REPORTED_RESULT: "Measured", REPORTED_METHOD: "How it was measured", MODEL_RESULT: "Computer model",
  OBJECTIVE_OR_HYPOTHESIS: "Goal, not a result", TEAM_INFERENCE: "Our inference", NOT_ESTABLISHED: "No evidence in corpus",
};
export function statusLabel(claim: Claim) {
  return claim.evidence_label ?? statusLabels[claim.claim_status];
}
export const byClaim = new Map(claims.map(claim => [claim.claim_id, claim]));
const linkedClaims = new Map(investigations.map(row => [
  row.investigation_id, claims.filter(claim => claim.investigation_id === row.investigation_id),
]));
const shortNames: Record<string, string> = { "PSI-101": "SAME-R", "PSI-102": "SAME", "PSI-107": "SPICE", "PSI-47": "DAFT / DAFT-2" };
export function investigationName(row: Investigation) {
  return shortNames[row.investigation_id] ?? row.title;
}

const stop = new Set("a an and are as at by did do does for from has how in is it of on or that the their to was were what when which with".split(" "));
function tokens(text: string) {
  return (text.toLowerCase().replace(/same[‐‑–-]r\b/gu, "samer").match(/[\p{L}\d]+/gu) ?? [])
    .filter(token => !stop.has(token))
    .map(token => token.replace(/^measur(?:e|ed|ing|ements?)$/u, "measure")
      .replace(/^particles$/u, "particle").replace(/^smokes$/u, "smoke")
      .replace(/^tests$/u, "test").replace(/^studies$/u, "study"));
}

function hasPhrase(query: string, phrase: string) {
  const words = phrase.toLowerCase().replace(/[-‐‑–]/gu, " ").trim().split(/\s+/u);
  const target = words.join(" ").replace(/(\d) g\b/gu, "$1g");
  return query.includes(` ${target} `);
}

export function parseQuery(input: string) {
  const cleaned = ` ${input.toLowerCase().replace(/[-‐‑–]/gu, " ").replace(/[^\p{L}\d. ]/gu, " ").replace(/\s+/gu, " ").replace(/(\d) g\b/gu, "$1g").trim()} `;
  const gravity = Object.entries(vocabulary.gravity).filter(([, terms]) => terms.some(term => hasPhrase(cleaned, term)))
    .map(([key]) => key as Claim["gravity_level"]);
  const platform = Object.entries(vocabulary.platform).filter(([, terms]) => terms.some(term => hasPhrase(cleaned, term)))
    .map(([key]) => key as Claim["platform"]);
  if (hasPhrase(cleaned, "in orbit") && !platform.includes("ISS_FLIGHT")) platform.push("ISS_FLIGHT");
  const quantity = hasPhrase(cleaned, "diameter") ? "diameter" : hasPhrase(cleaned, "particle size") ? "particle size" : null;
  const atmosphere = /\b(?:oxygen|pressure)\b/u.test(cleaned) && /\b(?:elevated|reduced)\b/u.test(cleaned);
  return { gravity, platform, quantity, atmosphere, terms: [...new Set(tokens(input))] };
}

type Fields = Record<string, { text: string; boost: number }>;
function index<T>(items: T[], fields: (item: T) => Fields) {
  const docs = items.map(item => ({
    item,
    fields: Object.entries(fields(item)).map(([name, { text, boost }]) => ({ name, words: tokens(text), boost })),
  }));
  const frequencies = new Map<string, number>();
  const averages = new Map<string, number>();
  for (const doc of docs) {
    for (const word of new Set(doc.fields.flatMap(field => field.words))) {
      frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
    }
    for (const field of doc.fields) averages.set(field.name, (averages.get(field.name) ?? 0) + field.words.length / docs.length);
  }
  return (terms: string[]) => docs.map(({ item, fields }) => {
    let score = 0;
    const matches: { field: string; terms: string[] }[] = [];
    for (const { name, words, boost } of fields) {
      const matched: string[] = [];
      for (const term of terms) {
        const tf = words.filter(word => word === term).length;
        if (!tf) continue;
        matched.push(term === "samer" ? "same-r" : term);
        const df = frequencies.get(term) ?? 0;
        const idf = Math.log(1 + (docs.length - df + 0.5) / (df + 0.5));
        score += boost * idf * (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * words.length / (averages.get(name) || 1)));
      }
      if (matched.length) matches.push({ field: name, terms: matched });
    }
    return { item, score, matches };
  });
}

const claimIndex = index(claims, claim => ({
  Claim: { text: claim.claim_text, boost: 3 },
  Excerpt: { text: claim.source_excerpt, boost: 1 },
  Topics: { text: claim.topics.map(topic => topic.replaceAll("_", " ")).join(" "), boost: 1.6 },
}));
const investigationIndex = index(investigations, row => ({
  Title: { text: `${row.title} ${shortNames[row.investigation_id] ?? ""} ${row.investigation_id}`, boost: 4 },
  Objective: { text: row.objective, boost: 1.4 },
}));

export function search(input: string) {
  const query = parseQuery(input);
  const soot = vocabulary.disambiguation[0];
  const smokeIntent = query.terms.some(term => ["smoke", "particle", "aerosol", "samer", "same"].includes(term));
  const explicitSoot = /\b(?:smoke[- ]point|soot|spice|coflow)\b/iu.test(input);
  const claimHits = claimIndex(query.terms).filter(hit => hit.score > 0).map(hit => ({
    ...hit,
    score: hit.score + (query.gravity.includes(hit.item.gravity_level) ? 2 : 0)
      + (query.platform.includes(hit.item.platform) ? 1 : 0),
  })).sort((a, b) => b.score - a.score || a.item.claim_id.localeCompare(b.item.claim_id));
  const rankings = investigationIndex(query.terms).map(hit => {
    const id = hit.item.investigation_id;
    const support = claimHits.filter(claim => claim.item.investigation_id === id);
    const isSoot = id === soot.investigation_id;
    const family = id === "PSI-101" || id === "PSI-102";
    const impliedSoot = isSoot && smokeIntent && query.gravity.includes("microgravity");
    const boost = (smokeIntent && family ? 8 : 0)
      + (smokeIntent && id === "PSI-101" && query.gravity.includes("microgravity") ? 4 : 0);
    return {
      ...hit, isSoot, support, allClaims: linkedClaims.get(id) ?? [],
      score: hit.score + (support[0]?.score ?? 0) + boost + (impliedSoot ? 1 : 0),
      matches: [...hit.matches, ...(support[0]?.matches ?? []), ...(impliedSoot && !support.length
        ? [{ field: "Topic disambiguation", terms: ["smoke point", "microgravity"] }] : [])],
    };
  }).filter(hit => hit.score > 0).sort((a, b) => {
    const layer = (hit: typeof a) => hit.item.coverage === "METADATA_ONLY" ? 2 : hit.isSoot && smokeIntent && !explicitSoot ? 1 : 0;
    return layer(a) - layer(b) || b.score - a.score || a.item.investigation_id.localeCompare(b.item.investigation_id);
  });
  const main = rankings.filter(hit => hit.item.coverage !== "METADATA_ONLY" && !hit.isSoot);
  const spice = rankings.filter(hit => hit.isSoot);
  const metadata = rankings.filter(hit => hit.item.coverage === "METADATA_ONLY");
  const named = query.terms.includes("samer") ? "PSI-101" : query.terms.includes("same") ? "PSI-102" : null;
  const followup = named === "PSI-101" && query.platform.includes("GROUND_LAB") && query.platform.includes("ISS_FLIGHT");
  const eligible = (claim: Claim) => (!named || claim.investigation_id === named)
    && (explicitSoot || !smokeIntent || claim.investigation_id !== "PSI-107")
    && (!query.quantity || claim.topics.includes("smoke_particle_size"))
    && (!query.gravity.length || query.gravity.includes(claim.gravity_level)
      || (followup && claim.platform === "GROUND_LAB"))
    && !query.atmosphere;
  const directRanked = claimHits.map(hit => hit.item).filter(eligible);
  const direct = followup
    ? ["SAMER-010", "SAMER-001", "SAMER-009"].map(id => byClaim.get(id)!)
    : directRanked.slice(0, 3);
  const related = followup
    ? ["NTRS13-001", "NTRS13-002", "NTRS13-003", "NTRS13-004", "SAMER-007", "SAMER-008"].map(id => byClaim.get(id)!)
    : claimHits.map(hit => hit.item).filter(claim =>
      claim.investigation_id === null && eligible(claim) && !direct.includes(claim)).slice(0, 5);
  return { query, claimHits, rankings, main, spice, metadata, direct, related, followup, smokeIntent, explicitSoot };
}

export const coverageTopics = [
  ["smoke_particle_size", "Smoke particle size"],
  ["smoke_morphology", "Particle morphology"],
  ["detector_response", "Detector response"],
  ["smoke_transport", "Smoke transport"],
  ["soot_onset", "Flame soot onset"],
] as const;

export const gravityStops = [
  { id: "microgravity", name: "ISS microgravity", value: "≈0g", position: 0 },
  { id: "lunar_0.16g", name: "Moon", value: "0.16g", position: 16 },
  { id: "mars_0.38g", name: "Mars", value: "0.38g", position: 38 },
  { id: "1g", name: "Earth", value: "1g", position: 100 },
] as const;
export type GravityStop = typeof gravityStops[number]["id"];

export function gravityEvidence(gravity: GravityStop) {
  return claims.filter(claim => claim.gravity_level === gravity && claim.claim_status !== "NOT_ESTABLISHED");
}

export function gravityStatus(evidence: Claim[]) {
  if (evidence.some(claim => claim.claim_status === "REPORTED_RESULT")) return "Measured";
  if (evidence.some(claim => claim.claim_status === "MODEL_RESULT")) return "Modeled only";
  const planned = evidence.find(claim => claim.claim_id === "ESA-001");
  if (planned) return statusLabel(planned);
  return evidence.length ? "Goals or methods only" : "Nothing in our sources";
}

const gravityColumns = [
  { id: "1g", label: "Ground · 1g" },
  { id: "microgravity", label: "Microgravity" },
  { id: "lunar_0.16g", label: "Lunar · 0.16g" },
  { id: "mars_0.38g", label: "Mars · 0.38g" },
] as const;

const isMultiGravityModel = (claim: Claim) =>
  claim.platform === "NUMERICAL_MODEL" && claim.gravity_level === "multiple";

export const coverageColumns = [
  ...gravityColumns,
  ...(claims.some(isMultiGravityModel) ? [{ id: "model", label: "Computer model" } as const] : []),
];

export const coverage = coverageTopics.map(([topic, label]) => ({
  topic, label,
  cells: coverageColumns.map(column => ({
    ...column,
    claims: claims.filter(claim =>
      (claim.topics.includes(topic) || (topic === "soot_onset" && claim.investigation_id === "PSI-107")) &&
      (column.id === "model" ? isMultiGravityModel(claim) : claim.gravity_level === column.id)),
  })),
}));

export const comparisonRows = [
  { label: "What was measured", flight: [], ground: ["SAMER-009"] },
  { label: "Conditions", flight: ["SAMER-002"], ground: [] },
  { label: "Instruments and methods", flight: ["SAMER-010", "SAMER-011"], ground: ["SAMER-009"] },
  { label: "Limitations", flight: ["SAMER-011"], ground: [] },
  { label: "Follow-up objectives", flight: ["SAMER-001"], ground: ["SAMER-003"] },
  { label: "Comparable particle-size values", flight: [], ground: [] },
].map(row => ({
  label: row.label,
  flight: row.flight.map(id => byClaim.get(id)!),
  ground: row.ground.map(id => byClaim.get(id)!),
}));
export const crossGravity = ["NTRS13-002", "NTRS13-004"].map(id => byClaim.get(id)!);

export function evidenceGap(result: ReturnType<typeof search>) {
  const { query, claimHits } = result;
  if ((!query.quantity && !query.atmosphere) || (!query.gravity.length && !query.platform.length && !query.atmosphere)) return null;
  const requested = query.quantity === "diameter" ? "smoke-particle diameter" : query.quantity === "particle size" ? "smoke particle size" : "a smoke measurement";
  const measured = (claim: Claim) => claim.claim_status === "REPORTED_RESULT" &&
    (!query.quantity || claim.topics.includes("smoke_particle_size")) &&
    (query.quantity !== "diameter" || /\bdiameter\b/iu.test(claim.quantity ?? claim.claim_text)) &&
    (!query.gravity.length || query.gravity.includes(claim.gravity_level)) &&
    (!query.platform.length || query.platform.includes(claim.platform)) && !query.atmosphere;
  if (claimHits.some(hit => measured(hit.item))) return null;
  const lunar = query.gravity.includes("lunar_0.16g");
  const condition = query.atmosphere ? "elevated oxygen at reduced pressure"
    : [...query.gravity.map(value => gravityLabels[value].toLowerCase()), ...query.platform.map(value => platformLabels[value].toLowerCase())].join(" and ");
  const context = ["SAME-003", "SAME-004", "SAMER-009"].map(id => byClaim.get(id)!);
  const related = [
    ...(lunar ? ["LUNAR-001", "LUNAR-002"] : []),
    ...(!query.atmosphere ? ["ESA-001"] : []),
  ].map(id => byClaim.get(id)!);
  return {
    text: `No reported measurement establishes ${requested} under ${condition} in this corpus.`,
    scope: `Not established in FireLens corpus v1 (${sources.size} sources)`,
    context, related,
  };
}
