import { claims as allClaims, investigationName, investigations, isMeasurement, type Claim } from "./evidence";
import { claimKind } from "./claim-kind";
import type { Investigation } from "../scripts/corpus";

export const attributeKeys = ["objective", "fuels", "geometry", "conditions", "variables", "sensors", "hardware"] as const;
export type AttributeKey = (typeof attributeKeys)[number];
export const attributeLabels: Record<AttributeKey, string> = {
  objective: "Objective",
  fuels: "Fuels and samples",
  geometry: "Sample or burner geometry",
  conditions: "O2, pressure, and airflow",
  variables: "Variables",
  sensors: "Sensors and diagnostics",
  hardware: "Hardware",
};

export interface HardwareFamily {
  id: string;
  label: string;
  investigationIds: string[];
  basisClaimIds: string[];
}

export const hardwareFamilies: HardwareFamily[] = [
  {
    id: "cir-acme",
    label: "CIR / ACME",
    investigationIds: ["PSI-10", "PSI-20", "PSI-21", "PSI-22", "PSI-23", "PSI-159"],
    basisClaimIds: ["CHALLENGE-015", "BRE-003", "EFIELD-002", "CFIG-002"],
  },
  {
    id: "cir-mdca",
    label: "CIR / MDCA",
    investigationIds: ["PSI-69", "PSI-68", "PSI-39"],
    basisClaimIds: ["CHALLENGE-010", "FLEX-002", "FLEX2-002", "CFI-002"],
  },
  {
    id: "msg-spice-duct",
    label: "MSG / SPICE flow duct",
    investigationIds: ["PSI-25", "PSI-26", "PSI-107", "PSI-106"],
    basisClaimIds: ["CHALLENGE-009", "BASS-003", "BASSII-004", "NTRS12-SLICE-001", "SLICE-003"],
  },
  {
    id: "cygnus-saffire",
    label: "Cygnus / Saffire",
    investigationIds: ["PSI-98", "PSI-99", "PSI-100"],
    basisClaimIds: ["SAFFIRE-I-005", "SAFFIRE-II-005", "SAFFIRE-III-003"],
  },
  {
    id: "smoke-diagnostics",
    label: "Smoke diagnostics",
    investigationIds: ["PSI-101", "PSI-102", "PSI-47"],
    basisClaimIds: [],
  },
];

const assigned: Record<string, Partial<Record<AttributeKey, string[]>>> = {
  "PSI-26": {
    objective: ["BASS-001", "BASS-002", "NTRS12-BASS-002"],
    fuels: ["BASS-004"],
    geometry: ["BASS-006"],
    conditions: ["BASS-005"],
    variables: ["BASS-005"],
    hardware: ["BASS-003", "NTRS12-BASS-001"],
  },
  "PSI-25": {
    objective: ["BASSII-001", "BASSII-002"],
    geometry: ["BASSII-002"],
    conditions: ["BASSII-005", "BASSII-006"],
    variables: ["BASSII-003", "BASSII-006"],
    hardware: ["BASSII-004"],
  },
  "PSI-98": {
    objective: ["SAFFIRE-I-001"],
    fuels: ["SAFFIRE-I-002"],
    geometry: ["SAFFIRE-I-003"],
    conditions: ["SAFFIRE-I-004"],
    sensors: ["SAFFIRE-I-006"],
    hardware: ["SAFFIRE-I-005"],
  },
  "PSI-99": {
    objective: ["SAFFIRE-II-001"],
    fuels: ["SAFFIRE-II-002"],
    geometry: ["SAFFIRE-II-003"],
    conditions: ["SAFFIRE-II-004"],
    hardware: ["SAFFIRE-II-005"],
  },
  "PSI-100": {
    objective: ["SAFFIRE-III-001"],
    fuels: ["SAFFIRE-III-004"],
    conditions: ["SAFFIRE-III-002"],
    hardware: ["SAFFIRE-III-003"],
  },
  "PSI-69": {
    objective: ["FLEX-001", "FLEX-003", "NTRS12-FLEX-005"],
    fuels: ["NTRS12-FLEX-005"],
    conditions: ["FLEX-004", "NTRS12-FLEX-006"],
    hardware: ["FLEX-002", "NTRS12-FLEX-006"],
  },
  "PSI-68": {
    objective: ["FLEX2-001", "NTRS12-FLEX2-001"],
    conditions: ["FLEX2-003"],
    variables: ["FLEX2-004"],
    hardware: ["FLEX2-002"],
  },
  "PSI-39": {
    objective: ["CFI-001", "CFI-006"],
    fuels: ["CFI-004"],
    conditions: ["CFI-001", "CFI-003"],
    sensors: ["CFI-005"],
    hardware: ["CFI-002"],
  },
  "PSI-20": {
    objective: ["BRE-007"],
    fuels: ["BRE-002"],
    conditions: ["BRE-001"],
    hardware: ["BRE-003"],
  },
  "PSI-159": {
    objective: ["CFIG-001"],
    fuels: ["CFIG-001"],
    conditions: ["CFIG-005"],
    sensors: ["CFIG-004"],
    hardware: ["CFIG-002"],
    variables: ["CFIG-003"],
  },
  "PSI-22": {
    objective: ["EFIELD-001"],
    fuels: ["EFIELD-004"],
    conditions: ["EFIELD-003"],
    hardware: ["EFIELD-002"],
  },
  "PSI-106": {
    objective: ["SLICE-001", "SLICE-002"],
    fuels: ["SLICE-004"],
    sensors: ["SLICE-003"],
    hardware: ["SLICE-003", "NTRS12-SLICE-001"],
  },
};

export function familyFor(investigationId: string) {
  return hardwareFamilies.find(family => family.investigationIds.includes(investigationId));
}

export function familyLabel(investigationId: string) {
  return familyFor(investigationId)?.label ?? "Other hardware";
}

function guessKey(claim: Claim): AttributeKey | "results" | undefined {
  const location = claim.source_location.toLowerCase();
  if (claim.evidence_label === "Equipment specification" || /\b(experimenthardware|hardware)\b/u.test(location)) return "hardware";
  if (/^objective\b/u.test(location) || location.includes("objective")) return "objective";
  if (claim.materials.length && !claim.airflow && !claim.conditions) return "fuels";
  if (claim.airflow || claim.conditions) return "conditions";
  if (/\b(sensor|camera|radiometer|thermocouple|diagnostic)/u.test(`${claim.claim_text} ${location}`)) return "sensors";
  if (/geometry|burner|sample card|flow duct|mm diameter|meters (long|wide)/i.test(`${claim.claim_text} ${claim.conditions ?? ""}`)) return "geometry";
  if (/variable|independently varied|primary variables/i.test(`${claim.claim_text} ${location}`)) return "variables";
  if (isMeasurement(claim)) return "results";
  return;
}

export interface AttributeBucket {
  key: AttributeKey;
  label: string;
  claims: Claim[];
}

export interface InvestigationProfile {
  investigation: Investigation;
  name: string;
  family: HardwareFamily | undefined;
  coverage: Investigation["coverage"];
  attributes: AttributeBucket[];
  results: Claim[];
  materials: string[];
  claimCount: number;
  measuredCount: number;
}

export function profileFor(investigationId: string, evidence: Claim[] = allClaims): InvestigationProfile | undefined {
  const investigation = investigations.find(row => row.investigation_id === investigationId);
  if (!investigation) return;
  const linked = evidence.filter(claim => claim.investigation_id === investigationId);
  const used = new Set<string>();
  const buckets: AttributeBucket[] = [];
  const explicit = assigned[investigationId] ?? {};
  for (const key of attributeKeys) {
    const unique: Claim[] = [];
    for (const id of explicit[key] ?? []) {
      const claim = linked.find(item => item.claim_id === id);
      if (!claim || used.has(claim.claim_id)) continue;
      used.add(claim.claim_id);
      unique.push(claim);
    }
    buckets.push({ key, label: attributeLabels[key], claims: unique });
  }
  for (const claim of linked) {
    if (used.has(claim.claim_id)) continue;
    const key = guessKey(claim);
    if (!key || key === "results") continue;
    const bucket = buckets.find(item => item.key === key)!;
    bucket.claims.push(claim);
    used.add(claim.claim_id);
  }
  const results = linked.filter(claim => isMeasurement(claim) && !used.has(claim.claim_id));
  const materials = [...new Set(linked.flatMap(claim => claim.materials))];
  return {
    investigation,
    name: investigationName(investigation),
    family: familyFor(investigationId),
    coverage: investigation.coverage,
    attributes: buckets,
    results,
    materials,
    claimCount: linked.length,
    measuredCount: results.length,
  };
}

export function allProfiles(evidence: Claim[] = allClaims) {
  return investigations.map(row => profileFor(row.investigation_id, evidence)!);
}

export interface ComparePoint {
  text: string;
  kind: "similar" | "different" | "gap";
}

function materialKey(name: string) {
  return name.trim().toLowerCase();
}

export function compareProfiles(profiles: InvestigationProfile[]): ComparePoint[] {
  if (profiles.length < 2 || profiles.length > 3) return [];
  const points: ComparePoint[] = [];
  const families = new Set(profiles.map(profile => profile.family?.id ?? "other"));
  if (families.size === 1) {
    const label = profiles[0].family?.label ?? "Other hardware";
    points.push({ kind: "similar", text: `${names(profiles)} are grouped in the ${label} hardware family.` });
  } else {
    points.push({
      kind: "different",
      text: `${names(profiles)} sit in different hardware families: ${profiles.map(profile => `${profile.name} (${profile.family?.label ?? "Other hardware"})`).join("; ")}.`,
    });
  }
  const materialSets = profiles.map(profile => new Set(profile.materials.map(materialKey)));
  const sharedMaterials = [...materialSets[0]].filter(material => materialSets.every(set => set.has(material)));
  if (sharedMaterials.length) {
    const labels = sharedMaterials.map(material => profiles[0].materials.find(name => materialKey(name) === material)!);
    points.push({ kind: "similar", text: `Cited materials in common: ${labels.join(", ")}.` });
  }
  for (const key of attributeKeys) {
    const filled = profiles.filter(profile => claimCount(profile, key) > 0);
    const empty = profiles.filter(profile => claimCount(profile, key) === 0);
    if (filled.length === profiles.length) {
      points.push({ kind: "similar", text: `Each investigation has at least one cited ${attributeLabels[key].toLowerCase()} claim.` });
    } else if (filled.length && empty.length) {
      points.push({
        kind: "gap",
        text: `${names(filled)} ${verb(filled)} cited ${attributeLabels[key].toLowerCase()}; ${names(empty)} ${empty.length === 1 ? "does" : "do"} not in this corpus.`,
      });
    }
  }
  const planned = profiles.filter(profile => profile.attributes.some(bucket => bucket.claims.some(claim => claimKind(claim).id === "planned_test_condition")));
  if (planned.length) {
    points.push({
      kind: "gap",
      text: `${names(planned)} include a planned test condition, which is not a measured result.`,
    });
  }
  const measured = profiles.filter(profile => profile.measuredCount > 0);
  const unmeasured = profiles.filter(profile => profile.measuredCount === 0);
  if (measured.length && unmeasured.length) {
    points.push({
      kind: "different",
      text: `${names(measured)} ${verb(measured)} at least one measured result in this corpus; ${names(unmeasured)} ${unmeasured.length === 1 ? "does" : "do"} not.`,
    });
  }
  return points;
}

function claimCount(profile: InvestigationProfile, key: AttributeKey) {
  return profile.attributes.find(bucket => bucket.key === key)?.claims.length ?? 0;
}

function names(profiles: InvestigationProfile[]) {
  if (profiles.length === 1) return profiles[0].name;
  if (profiles.length === 2) return `${profiles[0].name} and ${profiles[1].name}`;
  return `${profiles[0].name}, ${profiles[1].name}, and ${profiles[2].name}`;
}

function verb(profiles: InvestigationProfile[]) {
  return profiles.length === 1 ? "has" : "have";
}
