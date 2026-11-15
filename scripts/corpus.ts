import { createHash, randomUUID } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../", import.meta.url));
export const corpus = join(root, "corpus");
export const focus = ["PSI-47", "PSI-101", "PSI-102", "PSI-107", "PSI-115"];
export const statuses = ["REPORTED_RESULT", "REPORTED_METHOD", "MODEL_RESULT", "OBJECTIVE_OR_HYPOTHESIS", "TEAM_INFERENCE", "NOT_ESTABLISHED"] as const;
export const platforms = ["ISS_FLIGHT", "GROUND_LAB", "REDUCED_GRAVITY_AIRCRAFT", "DROP_TOWER", "NUMERICAL_MODEL", "MIXED", "UNSPECIFIED"] as const;
export const gravities = ["1g", "microgravity", "lunar_0.16g", "mars_0.38g", "multiple", "unspecified"] as const;
export const methods = ["pdfjs", "html", "json"] as const;
export const evidenceLabels = ["Equipment specification", "Authors' statement", "Authors' suggestion", "Planned (NASA)", "Planned (as of 2021)", "Earth application"] as const;

export interface DerivedFigure {
  file: string;
  slide: number;
  crop: [left: number, top: number, right: number, bottom: number];
  sha256: string;
}

export interface Source {
  source_id: string;
  title: string;
  authors: string[];
  year: number | null;
  publisher: string;
  tier: "A" | "B";
  url: string;
  doi: string | null;
  retrieval_url: string;
  retrieval_user_agent?: string;
  raw_file: string;
  retrieved_at: string;
  sha256: string;
  extraction_method: typeof methods[number];
  access_note: string;
  local_only?: true;
  access_level?: "ABSTRACT_ONLY";
  pages?: [number, number];
  html_selector?: string;
  derived_assets?: DerivedFigure[];
}

export interface Claim {
  claim_id: string;
  investigation_id: string | null;
  source_id: string;
  claim_text: string;
  source_excerpt: string;
  source_location: string;
  claim_status: typeof statuses[number];
  evidence_label?: typeof evidenceLabels[number];
  platform: typeof platforms[number];
  gravity_level: typeof gravities[number];
  topics: string[];
  materials: string[];
  quantity?: string;
  value?: string | number;
  unit?: string;
  value_qualifier?: "greater_than" | "less_than" | "range" | "approximately" | "typically";
  airflow?: { value: number; unit: "cm/s"; gravity_level: typeof gravities[number] };
  conditions?: string;
  attribution_note?: string;
  derived_from?: string[];
  doi: string | null;
  source_url: string;
  review: { status: "DRAFT" | "HUMAN_REVIEWED"; reviewer: string | null; date: string | null; batch?: "A" };
}

export interface Investigation {
  investigation_id: string;
  title: string;
  acronym?: string;
  doi: string | null;
  objective: string;
  source_id: string;
  coverage: "DRAFT_CLAIMS" | "METADATA_ONLY";
}

export interface Unavailable {
  source_id: string;
  title: string;
  attempted_at: string;
  attempted_urls: string[];
  reason: string;
}

export async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

export async function atomicWrite(path: string, contents: string | Uint8Array): Promise<void> {
  const temp = join(dirname(path), `.firelens-${randomUUID()}.tmp`);
  await writeFile(temp, contents);
  await rename(temp, path);
}

export function writeJson(path: string, value: unknown): Promise<void> {
  return atomicWrite(path, JSON.stringify(value, null, 2) + "\n");
}

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
