import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  evidenceLabels, focus, gravities, methods, platforms, readJson, sha256, statuses,
  type Claim, type Investigation, type Source, type Unavailable,
} from "./corpus.js";
import { extractText } from "./extraction.js";

export function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[‘’]/gu, "'")
    .replace(/[“”]/gu, '"')
    .replace(/\u00ad/gu, "")
    .replace(/(\p{L})-[^\S\r\n]*\r?\n[^\S\r\n]*(?=\p{L})/gu, "$1")
    .replace(/\s+/gu, " ")
    .trim();
}

function numericTokens(text: string | number | undefined): string[] {
  if (text === undefined) return [];
  return normalize(String(text))
    .replace(/−/gu, "-")
    .replace(/(\d),(?=\d{3}(?:\D|$))/gu, "$1")
    .match(/(?<![\d.])(?:[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?)/gu) ?? [];
}

const scalar = "[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)(?:[eE][+-]?\\d+)?";
const valuePattern = new RegExp(`^${scalar}(?:–${scalar})?$`, "u");
const bounds = {
  greater_than: /(?:\b(?:over|above|greater than|more than|exceed(?:ed|s)?)\s+|>\s*)$/iu,
  less_than: /(?:\b(?:below|under|less than|fewer than)\s+|<\s*)$/iu,
};
const scalarQualifiers = {
  ...bounds,
  approximately: /\b(?:approximately|about|roughly)\s+$/iu,
};

function checkValue(claim: Claim, excerpt: string, fail: (message: string) => void): void {
  const { value, unit, value_qualifier: qualifier } = claim;
  if (value === undefined) {
    if (unit !== undefined || qualifier !== undefined) fail("unit and value_qualifier require a value");
    return;
  }
  if (value === "twice" && unit === undefined && qualifier === "typically") {
    if (!/\btypically twice\b/iu.test(excerpt)) fail("the excerpt must state typically twice");
    return;
  }
  if (!valuePattern.test(String(value))) {
    fail("value must be a number or an en dash separated numeric range, with the unit stored separately");
    return;
  }
  if (unit !== undefined && (typeof unit !== "string" || !unit.trim() || numericTokens(unit).length)) {
    fail("unit must be a nonempty unit label without a numeric value");
  }
  const [lower, upper] = String(value).split("–");
  if (upper !== undefined) {
    let stated = false;
    for (const first of excerpt.matchAll(/(?<![\d.])[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?/gu)) {
      if (first[0] !== lower) continue;
      const following = excerpt.slice(first.index + first[0].length);
      const second = new RegExp(`^\\s*(?:to\\s+|[-–]\\s*)(${scalar})(?![\\d.])`, "u").exec(following);
      if (second?.[1] === upper) stated = true;
    }
    if (!stated || (qualifier !== undefined && qualifier !== "range")) {
      fail("numeric range and qualifier must match the excerpt");
    }
    return;
  }
  if (qualifier !== undefined && !Object.hasOwn(scalarQualifiers, qualifier)) {
    fail("invalid qualifier for a single numeric value");
    return;
  }
  const positions = [...excerpt.matchAll(/(?<![\d.])(?:[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?)/gu)]
    .filter(match => match[0] === String(value));
  const matchingQualifiers = Object.entries(scalarQualifiers)
    .filter(([, pattern]) => positions.some(match => pattern.test(excerpt.slice(0, match.index))))
    .map(([key]) => key);
  if (qualifier ? !matchingQualifiers.includes(qualifier) : matchingQualifiers.length > 0) {
    fail("value_qualifier must match the bound stated in the excerpt");
  }
}

function isHttps(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function isDoi(value: string | null): boolean {
  return value === null || (typeof value === "string" && /^10\.\d{4,9}\/[^\s]+$/i.test(value));
}

function isTimestamp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(value) &&
    Number.isFinite(Date.parse(value));
}

export function checkClaims(
  claims: Claim[], sources: Source[], texts: Map<string, string>, topics: Set<string>,
  skippedSources: ReadonlySet<string> = new Set(),
): string[] {
  const problems: string[] = [];
  const byId = new Map(sources.map(source => [source.source_id, source]));
  const ids = new Set<string>();
  for (const claim of claims) {
    const fail = (message: string) => problems.push(`${claim.claim_id}: ${message}`);
    if (!claim.claim_id || ids.has(claim.claim_id)) fail("missing or duplicate claim ID");
    ids.add(claim.claim_id);
    const source = byId.get(claim.source_id);
    if (!source) fail(`source ${claim.source_id} is missing from the manifest`);
    if (!isDoi(claim.doi) || !isHttps(claim.source_url)) fail("invalid DOI or HTTPS source URL");
    if (source && (claim.doi !== source.doi || claim.source_url !== source.url)) {
      fail("source URL or DOI differs from the manifest");
    }
    const excerpt = normalize(claim.source_excerpt ?? "");
    const text = texts.get(claim.source_id);
    const page = /^PDF page (\d+)\b/u.exec(claim.source_location ?? "")?.[1];
    const searchable = page && text ? text.split(`[[page ${page}]]\n`)[1]?.split("[[page ")[0] : text;
    if (!excerpt || excerpt.split(" ").length > 60) fail("excerpt must contain 1–60 words");
    if (!skippedSources.has(claim.source_id) && (!searchable || !normalize(searchable).includes(excerpt))) {
      fail("excerpt is absent from extracted text");
    }
    checkValue(claim, excerpt, fail);
    if (claim.airflow) {
      const { value, unit, gravity_level } = claim.airflow;
      const statedSpeeds = [...excerpt.matchAll(/(\d+(?:\.\d+)?)\s*cm\/s\b/gu)].map(match => Number(match[1]));
      if (unit !== "cm/s" || !statedSpeeds.includes(value) || !gravities.includes(gravity_level) ||
          (claim.gravity_level !== "multiple" && gravity_level !== claim.gravity_level)) {
        fail("structured airflow must match a speed and gravity supported by the claim");
      }
    }
    const numbers = new Set(numericTokens(excerpt));
    const claimedNumbers = [claim.value, claim.claim_text, claim.conditions, claim.quantity, claim.unit]
      .flatMap(numericTokens);
    for (const number of new Set(claimedNumbers)) {
      if (!numbers.has(number)) fail(`numeric token ${number} is absent from the excerpt`);
    }
    if (!claim.claim_text?.trim() || !claim.source_location?.trim()) fail("missing claim text or source location");
    if (!statuses.includes(claim.claim_status)) fail("invalid claim status");
    if (claim.evidence_label && (!evidenceLabels.includes(claim.evidence_label) ||
      claim.claim_status !== (claim.evidence_label === "Equipment specification" ? "REPORTED_RESULT" : "OBJECTIVE_OR_HYPOTHESIS"))) {
      fail("evidence label conflicts with claim status");
    }
    if (!platforms.includes(claim.platform)) fail("invalid platform");
    if (!gravities.includes(claim.gravity_level)) fail("invalid gravity level");
    if (!Array.isArray(claim.topics) || !claim.topics.length || claim.topics.some(topic => !topics.has(topic))) {
      fail("missing or uncontrolled topics");
    }
    if (claim.investigation_id === "PSI-107") {
      const requiredTopic = claim.claim_status === "REPORTED_METHOD" ? "measurement_method" : "soot_onset";
      if (!claim.topics?.includes(requiredTopic) || claim.topics.includes("smoke_particle_size")) {
        fail(`SPICE requires ${requiredTopic} and excludes smoke_particle_size`);
      }
    }
    if (claim.claim_status === "MODEL_RESULT" && claim.platform !== "NUMERICAL_MODEL") {
      fail("model output requires the NUMERICAL_MODEL platform");
    }
    if (claim.claim_status === "REPORTED_RESULT" && claim.platform === "NUMERICAL_MODEL") {
      fail("numerical model output cannot be classified as a reported measurement");
    }
    if (claim.claim_status === "NOT_ESTABLISHED" && !/Not established in FireLens corpus v1 \(\d+ sources?\)/u.test(claim.claim_text)) {
      fail("missing corpus scope for NOT_ESTABLISHED");
    }
    if (!Array.isArray(claim.materials) || claim.materials.some(material => !material.trim())) {
      fail("materials must be an array of names");
    }
    if (claim.claim_status === "TEAM_INFERENCE") {
      if (!Array.isArray(claim.derived_from) || !claim.derived_from.length) {
        fail("TEAM_INFERENCE requires derived_from");
      } else {
        for (const reference of claim.derived_from) {
          if (reference === claim.claim_id || !claims.some(candidate => candidate.claim_id === reference)) {
            fail(`invalid derived_from reference ${reference}`);
          }
        }
      }
    } else if (Object.hasOwn(claim, "derived_from")) {
      fail("derived_from is only allowed for TEAM_INFERENCE");
    }
    if (claim.review?.status === "HUMAN_REVIEWED") {
      if (!claim.review.reviewer?.trim()) fail("HUMAN_REVIEWED requires a reviewer name");
    } else if (claim.review?.status !== "DRAFT") {
      fail("invalid review status");
    }
  }
  return problems;
}

export async function verifyCorpus(directory: string, publicDirectory = join(directory, "..", "public")) {
  const [sources, claims, vocabulary, investigations, unavailable] = await Promise.all([
    readJson<Source[]>(join(directory, "manifest.json")),
    readJson<Claim[]>(join(directory, "claims.json")),
    readJson<{ topics: Record<string, string[]> }>(join(directory, "vocabulary.json")),
    readJson<Investigation[]>(join(directory, "investigations.json")),
    readJson<Unavailable[]>(join(directory, "unavailable.json")),
  ]);
  const errors: string[] = [];
  const ids = new Set<string>();
  const rawPaths = new Set<string>();
  const figurePaths = new Set<string>();
  const texts = new Map<string, string>();
  const raw = new Map<string, Buffer>();
  const skippedSources = new Set<string>();
  const byId = new Map(sources.map(source => [source.source_id, source]));
  for (const source of sources) {
    const id = source.source_id;
    const referencingClaims = claims.filter(claim => claim.source_id === id).map(claim => claim.claim_id);
    const fail = (message: string) => errors.push(`${[id, ...referencingClaims].join(", ")}: ${message}`);
    if (!/^[A-Z0-9-]+$/u.test(id) || ids.has(id)) fail("invalid or duplicate source ID");
    ids.add(id);
    if (
      !isHttps(source.url) || !isHttps(source.retrieval_url) || !isDoi(source.doi) ||
      !isTimestamp(source.retrieved_at) || !["A", "B"].includes(source.tier) ||
      !source.title?.trim() || !source.publisher?.trim() || !source.access_note?.trim() ||
      !Array.isArray(source.authors) || (source.year !== null && !Number.isInteger(source.year)) ||
      !methods.includes(source.extraction_method) ||
      (source.local_only !== undefined && source.local_only !== true)
    ) fail("invalid manifest metadata");
    if (!/^raw\/[A-Z0-9-]+\.(json|html|pdf)$/u.test(source.raw_file) || !/^[a-f0-9]{64}$/u.test(source.sha256)) {
      fail("invalid raw path or SHA-256");
      continue;
    }
    rawPaths.add(source.raw_file);
    for (const asset of source.derived_assets ?? []) {
      const [left, top, right, bottom] = asset.crop;
      if (source.extraction_method !== "pdfjs" || !Number.isInteger(asset.slide) || asset.slide < 1 ||
          !(left >= 0 && left < right && right <= 1 && top >= 0 && top < bottom && bottom <= 1) ||
          !/^figures\/[a-z0-9-]+\.jpg$/u.test(asset.file) || figurePaths.has(asset.file) ||
          !/^[a-f0-9]{64}$/u.test(asset.sha256)) {
        fail("invalid or duplicate derived figure metadata");
        continue;
      }
      figurePaths.add(asset.file);
      const bytes = await readFile(join(publicDirectory, asset.file)).catch(() => undefined);
      if (!bytes || sha256(bytes) !== asset.sha256) fail(`derived figure missing or SHA-256 mismatch: ${asset.file}`);
    }
    try {
      const bytes = raw.get(source.raw_file) ?? await readFile(resolve(directory, source.raw_file)).catch(error => {
        if (source.local_only && error.code === "ENOENT") return undefined;
        throw error;
      });
      if (bytes === undefined) {
        skippedSources.add(id);
        continue;
      }
      raw.set(source.raw_file, bytes);
      if (sha256(bytes) !== source.sha256) {
        fail("raw SHA-256 mismatch");
        continue;
      }
      const text = await readFile(join(directory, "text", `${id}.txt`), "utf8");
      for (const asset of source.derived_assets ?? []) {
        if (!text.includes(`[[page ${asset.slide}]]\n`)) fail(`derived figure slide is missing: ${asset.file}`);
      }
      if (normalize(text) !== normalize(await extractText(bytes, source))) {
        fail("stored text differs from extraction of the raw snapshot");
      }
      texts.set(id, text);
    } catch (error) {
      fail(String(error));
    }
  }
  for (const file of await readdir(join(directory, "raw"))) {
    if (!rawPaths.has(`raw/${file}`)) errors.push(`raw/${file}: missing manifest entry`);
  }

  errors.push(...checkClaims(claims, sources, texts, new Set(Object.keys(vocabulary.topics)), skippedSources));
  for (const id of [...focus, ...sources.filter(source => source.tier === "B").map(source => source.source_id)]) {
    if (!claims.some(claim => claim.source_id === id)) errors.push(`${id}: source has no claims`);
  }
  for (const claim of claims) {
    if (claim.investigation_id !== null && !investigations.some(record => record.investigation_id === claim.investigation_id)) {
      errors.push(`${claim.claim_id}: unknown investigation ${claim.investigation_id}`);
    }
  }
  const indexBytes = raw.get("raw/PSI-COMBUSTION-INDEX.json");
  if (!indexBytes) {
    errors.push("PSI-COMBUSTION-INDEX: missing search snapshot");
  } else {
    const { hits } = JSON.parse(indexBytes.toString()) as {
      hits: { total: number; hits: { _source: { Accession: string } }[] };
    };
    const expected = new Set(hits.hits.map(hit => hit._source.Accession));
    const actual = new Set(investigations.map(record => record.investigation_id));
    if (expected.size !== hits.total || actual.size !== investigations.length ||
        expected.size !== actual.size || [...expected].some(id => !actual.has(id))) {
      errors.push("PSI-COMBUSTION-INDEX: investigations do not match the complete search snapshot");
    }
    for (const row of investigations) {
      const source = byId.get(row.source_id);
      const bytes = source && raw.get(source.raw_file);
      const record = bytes && JSON.parse(bytes.toString());
      const coverage = claims.some(claim => claim.investigation_id === row.investigation_id) ? "DRAFT_CLAIMS" : "METADATA_ONLY";
      if (!record || record.accession !== row.investigation_id || record.title !== row.title ||
          (record.investigationAcronym?.trim() || undefined) !== row.acronym ||
          (record.doi || null) !== row.doi || (record.objective ?? "") !== row.objective || row.coverage !== coverage) {
        errors.push(`${row.investigation_id}: index row differs from the individual PSI record or expected coverage`);
      }
    }
  }
  for (const entry of unavailable) {
    if (!entry.source_id || !entry.title?.trim() || !isTimestamp(entry.attempted_at) ||
        !entry.reason?.trim() || !entry.attempted_urls?.length || !entry.attempted_urls.every(isHttps)) {
      errors.push(`${entry.source_id}: unavailable entry requires source, date, HTTPS attempts, and reason`);
    }
  }
  for (const source of sources.filter(source => source.access_level)) {
    if (!unavailable.some(entry => entry.source_id === source.source_id)) {
      errors.push(`${source.source_id}: partial access requires a full-text attempt in unavailable.json`);
    }
  }
  return { errors, claims, sources, investigations, unavailable, skippedSources };
}
