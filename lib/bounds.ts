import { byClaim, type Claim } from "./evidence";
import { claimKind } from "./claim-kind";

export interface BoundPoint {
  id: string;
  label: string;
  pressurePsi: number;
  pressureUnit: "psi" | "psia";
  oxygenPercent: number;
  oxygenBound?: "or_greater";
  pressureBound?: "or_less";
  kindId: ReturnType<typeof claimKind>["id"];
  kindLabel: string;
  claimIds: string[];
  habitatNote: string;
}

export interface BoundGroup {
  id: string;
  title: string;
  summary: string;
  claimIds: string[];
}

function claims(ids: string[]): Claim[] {
  return ids.map(id => {
    const claim = byClaim.get(id);
    if (!claim) throw new Error(`Missing bound claim ${id}`);
    return claim;
  });
}

export const atmospherePoints: BoundPoint[] = [
  {
    id: "earth",
    label: "Earth sea level",
    pressurePsi: 14.7,
    pressureUnit: "psi",
    oxygenPercent: 21,
    kindId: "challenge_context",
    kindLabel: "Challenge context",
    claimIds: ["CHALLENGE-001"],
    habitatNote: "Cited as Earth’s sea-level atmosphere. BRE also lists 14.7 psia and 21% oxygen as a planned test condition.",
  },
  {
    id: "suit",
    label: "Spacesuit",
    pressurePsi: 4.3,
    pressureUnit: "psi",
    oxygenPercent: 100,
    kindId: "challenge_context",
    kindLabel: "Challenge context",
    claimIds: ["CHALLENGE-001"],
    habitatNote: "Cited as a spacesuit condition, not a cabin, habitat, or rover atmosphere.",
  },
  {
    id: "challenge-moon-rover",
    label: "Moon base and pressurized rover (challenge statement)",
    pressurePsi: 10.2,
    pressureUnit: "psi",
    oxygenPercent: 30,
    oxygenBound: "or_greater",
    pressureBound: "or_less",
    kindId: "challenge_context",
    kindLabel: "Challenge context",
    claimIds: ["CHALLENGE-002", "CHALLENGE-003", "CHALLENGE-014"],
    habitatNote: "The challenge statement says the Moon base and pressurized rovers are expected to sit between the spacesuit and Earth, likely at 30% oxygen or greater and 10.2 psi or less. This is not a NASA measurement.",
  },
  {
    id: "bre-147-21",
    label: "BRE planned mission atmosphere",
    pressurePsi: 14.7,
    pressureUnit: "psia",
    oxygenPercent: 21,
    kindId: "planned_test_condition",
    kindLabel: "Planned test condition",
    claimIds: ["BRE-001"],
    habitatNote: "One of three NASA-considered atmospheres BRE planned to examine. Not a measured cabin condition in this corpus.",
  },
  {
    id: "bre-102-265",
    label: "BRE planned mission atmosphere",
    pressurePsi: 10.2,
    pressureUnit: "psia",
    oxygenPercent: 26.5,
    kindId: "planned_test_condition",
    kindLabel: "Planned test condition",
    claimIds: ["BRE-001"],
    habitatNote: "Shares the 10.2 psi pressure with the challenge statement, but 26.5% oxygen is a different cited figure from the challenge’s 30% or greater. They are not treated as the same atmosphere.",
  },
  {
    id: "bre-82-34",
    label: "BRE planned mission atmosphere",
    pressurePsi: 8.2,
    pressureUnit: "psia",
    oxygenPercent: 34,
    kindId: "planned_test_condition",
    kindLabel: "Planned test condition",
    claimIds: ["BRE-001"],
    habitatNote: "A third planned test condition. Not a measured Moon or rover atmosphere in this corpus.",
  },
];

export const atmosphereClaims = () => claims([...new Set(atmospherePoints.flatMap(point => point.claimIds))]);

export const partialGravityGroups: BoundGroup[] = [
  {
    id: "psi-gap",
    title: "Not in PSI, according to the challenge statement",
    summary: "The challenge statement says there is currently no partial-gravity combustion data in PSI, and that such data is expected from LUCI and FM2.",
    claimIds: ["CHALLENGE-006"],
  },
  {
    id: "luci-measured",
    title: "Simulated lunar gravity, reported outside the PSI investigation index",
    summary: "LUCI reports the first extended-duration combustion tests in simulated lunar gravity, including burns long enough to define a limiting oxygen value for extinction. Those claims are not linked to a PSI investigation in this corpus.",
    claimIds: ["LUCI-001", "LUCI-002", "LUCI-003", "LUCI-004"],
  },
  {
    id: "lunar-models",
    title: "Lunar-gravity smoke transport is simulated only",
    summary: "The lunar smoke results in this corpus are computer-model findings, not measurements, and they concern smoke layers and airflow rather than flame spread in a rover cabin.",
    claimIds: ["LUNAR-001", "LUNAR-002", "LUNAR-003"],
  },
  {
    id: "planned",
    title: "Planned partial-gravity work",
    summary: "FM2 burn tests on the lunar surface are described as planned, and ESA reported plans for a partial-gravity flight campaign on particle sizes.",
    claimIds: ["PLANNED-002", "ESA-001"],
  },
  {
    id: "efield-not-substitute",
    title: "E-FIELD is not a measured habitat partial-gravity result",
    summary: "The challenge statement says E-FIELD Flames mimicked partial gravity with an electric field. That is challenge-statement context, not a measured partial-gravity fire result. The PSI record also states the research is not being conducted to serve any space applications.",
    claimIds: ["CHALLENGE-007", "EFIELD-005"],
  },
  {
    id: "low-flow-partial",
    title: "A general low-flow finding, not a rover measurement",
    summary: "An overview states that in the low flow conditions of microgravity or partial gravity, some materials are flammable at lower oxygen concentrations than in normal gravity. It does not report a Moon or rover atmosphere or a rover test.",
    claimIds: ["NTRS12-SOLID-002"],
  },
];


export function oxygenLabel(point: BoundPoint) {
  return point.oxygenBound === "or_greater" ? `${point.oxygenPercent}% or greater` : `${point.oxygenPercent}%`;
}

export function pressureLabel(point: BoundPoint) {
  return point.pressureBound === "or_less" ? `${point.pressurePsi} ${point.pressureUnit} or less` : `${point.pressurePsi} ${point.pressureUnit}`;
}

function pointById(id: string) {
  return atmospherePoints.find(point => point.id === id)!;
}

export const challengeMoonRover = pointById("challenge-moon-rover");
export const chartCaption = `Cited pressure and oxygen figures only. The hatched region is the challenge-stated “${pressureLabel(challengeMoonRover)}, ${oxygenLabel(challengeMoonRover)} oxygen” band. It is not a measured envelope.`;

export const chartDescription = [
  "A chart of oxygen percent versus pressure in psi.",
  `It marks Earth’s ${pointById("earth").pressurePsi} ${pointById("earth").pressureUnit} and ${oxygenLabel(pointById("earth"))} oxygen, a spacesuit at ${pressureLabel(pointById("suit"))} and ${oxygenLabel(pointById("suit"))} oxygen, the challenge-stated Moon and rover band of ${pressureLabel(challengeMoonRover)} and ${oxygenLabel(challengeMoonRover)} oxygen, and BRE planned conditions at ${pressureLabel(pointById("bre-147-21"))} and ${oxygenLabel(pointById("bre-147-21"))}, ${pressureLabel(pointById("bre-102-265"))} and ${oxygenLabel(pointById("bre-102-265"))}, and ${pressureLabel(pointById("bre-82-34"))} and ${oxygenLabel(pointById("bre-82-34"))} oxygen.`,
  "None of these plotted values is a measured Moon or rover cabin atmosphere in this corpus.",
].join(" ");

export const challengeRegionLabel = `Challenge context: ${pressureLabel(challengeMoonRover)}, ${oxygenLabel(challengeMoonRover).replace(" or greater", " O2 or greater")}`;

export const boundsIntro = "This panel bounds what the corpus can support for a Moon base or pressurized rover. Challenge-statement figures, planned test conditions, and measured results are kept separate. Microgravity results are not treated as lunar or rover answers. No measured Moon or rover cabin atmosphere is in this corpus.";

export const atmosphereIntro = `The challenge places the Moon base and pressurized rovers between a spacesuit and Earth’s atmosphere, likely at ${oxygenLabel(challengeMoonRover)} oxygen and ${pressureLabel(challengeMoonRover)}. BRE planned different oxygen figures at a matching ${pointById("bre-102-265").pressurePsi} ${pointById("bre-102-265").pressureUnit}. Those are not the same cited atmosphere, and neither is a measurement.`;

export const gravityIntro = "What we can cite at lunar or other partial gravity is bounded by a small set of claims. E-FIELD is not used here as a measured habitat result.";

export const oxygenTicks = [0, 20, 40, 60, 80, 100];
export const pressureTicks = [0, ...new Set(atmospherePoints.map(point => point.pressurePsi))].sort((a, b) => a - b);
export const challengePressurePsi = challengeMoonRover.pressurePsi;
export const challengeOxygenPercent = challengeMoonRover.oxygenPercent;

export const measuredMoonRoverAtmospheres: Claim[] = [];

export function boundClaims(ids: string[]) {
  return claims(ids);
}

export function kindForPoint(point: BoundPoint) {
  return claimKind(byClaim.get(point.claimIds[0])!);
}
