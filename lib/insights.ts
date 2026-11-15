import { byClaim, type Claim } from "./evidence";

export interface InsightSection {
  id: "prevention" | "detection" | "suppression" | "earth";
  label: string;
  blurb: string;
  claimIds: string[];
}

export const insightSections: InsightSection[] = [
  {
    id: "prevention",
    label: "Prevention",
    blurb: "What the sources say about material selection, flammability limits, and whether ground-test margins still hold in low gravity or ventilation.",
    claimIds: [
      "LUCI-004",
      "NTRS12-SOLID-001",
      "NTRS12-SOLID-002",
      "NTRS12-FLEX-001",
      "NTRS16-FLEX-003",
      "BASS-001",
      "BRE-006",
      "CHALLENGE-004",
    ],
  },
  {
    id: "detection",
    label: "Detection",
    blurb: "Measured detector response, cited sensitivity limits, and suggestions for placement or how particle-size data are used. Challenge-statement applications are labeled as such.",
    claimIds: [
      "SAME-006",
      "NTRS13-008",
      "NTRS13-008b",
      "NTRS13-009",
      "NTRS13-009b",
      "NTRS13-006",
      "LUNAR-004",
      "LUNAR-001",
    ],
  },
  {
    id: "suppression",
    label: "Suppression",
    blurb: "Cited work on inert-gas suppressants, extinction, and cool-flame follow-on burning. Challenge statements about carbon dioxide, helium, or water mist are not treated as NASA measurements.",
    claimIds: [
      "NTRS12-FLEX-002",
      "NTRS12-FLEX-003",
      "NTRS16-FLEX-002",
      "LUCI-003",
      "BASS-007",
      "BASS-002",
      "FLEX-001",
      "FLEX-003",
      "CHALLENGE-012",
    ],
  },
  {
    id: "earth",
    label: "Earth applications",
    blurb: "Applications named by the investigation records or the challenge statement, including sealed-environment fire safety on Earth. Water-mist extinguishers and firefighter gear appear only as challenge-statement context.",
    claimIds: [
      "EARTH-001",
      "EARTH-002",
      "EARTH-003",
      "EARTH-004",
      "EARTH-005",
      "EARTH-006",
      "EARTH-007",
      "EARTH-008",
      "CHALLENGE-005",
    ],
  },
];

export const insightsIntro = "These briefings are composed only from verified claims. Challenge context and planned test conditions are labeled and are not measurements.";

export const insightsGap = "No quantitative Saffire flame-spread or flame-size measurement is in this corpus. Fine-water-mist extinguishers and firefighter-gear applications appear only as challenge-statement context.";

export function insightClaims(section: InsightSection, evidence: Claim[] = [...byClaim.values()]) {
  return section.claimIds.map(id => {
    const claim = evidence.find(item => item.claim_id === id) ?? byClaim.get(id);
    if (!claim) throw new Error(`Missing insight claim ${id}`);
    return claim;
  });
}

const flammabilityTopics = new Set(["material_flammability", "flame_spread"]);

export function modelerRows(evidence: Claim[]) {
  const valued = evidence.filter(claim => claim.value !== undefined);
  const seen = new Set(valued.map(claim => claim.claim_id));
  const flammability = evidence.filter(claim =>
    !seen.has(claim.claim_id) && claim.topics.some(topic => flammabilityTopics.has(topic)),
  );
  return [...valued, ...flammability];
}

export function materialsLabel(claim: Claim) {
  return claim.materials.length ? claim.materials.join(", ") : "Not specified";
}

export function airflowLabel(claim: Claim) {
  return claim.airflow ? `${claim.airflow.value} ${claim.airflow.unit}` : "Not specified";
}
