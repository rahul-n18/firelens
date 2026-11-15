import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { atomicWrite, corpus, readJson, root, type Claim, type Source } from "./corpus.js";

const [manifest, claims] = await Promise.all([
  readJson<Source[]>(join(corpus, "manifest.json")),
  readJson<Claim[]>(join(corpus, "claims.json")),
]);
const directory = join(root, "docs");
await mkdir(directory, { recursive: true });
const cell = (value: string) => value.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
const sources = new Map(manifest.map(source => [source.source_id, source]));
const pending = claims.filter(claim => claim.review.status === "DRAFT");
const phaseA = pending.filter(claim => claim.review.batch === "A");
const qualifiers = { greater_than: "> ", less_than: "< ", approximately: "≈ ", typically: "typically ", range: "" };
const review = [
  "# FireLens Phase A draft claims",
  "",
  "Confirm each paraphrase, source location, evidence classification, platform, and gravity level against the snapshot. For claims you approve, record your name and review date in `corpus/claims.json` and set the review status to `HUMAN_REVIEWED`.",
  "",
  "| ID | Draft claim | Verbatim excerpt | Location | Evidence | Value | Attribution note |",
  "| --- | --- | --- | --- | --- | --- | --- |",
  ...phaseA.map(claim => {
    const source = sources.get(claim.source_id);
    if (!source) throw new Error(`${claim.claim_id}: missing source`);
    const link = source.local_only ? source.url : `../corpus/${source.raw_file}`;
    const location = `[${claim.source_id}](${link}), ${claim.source_location}`;
    const evidence = `${claim.evidence_label ?? claim.claim_status} · ${claim.platform} · ${claim.gravity_level}` +
      (source.access_level === "ABSTRACT_ONLY" ? " · abstract only" : "") +
      (source.local_only ? " · local-only" : "");
    const prefix = claim.value_qualifier ? qualifiers[claim.value_qualifier] : "";
    const value = claim.value === undefined ? "" : `\`${prefix}${claim.value}${claim.unit ? ` ${claim.unit}` : ""}\``;
    const fields = [claim.claim_id, claim.claim_text, claim.source_excerpt, location, evidence, value, claim.attribution_note ?? ""];
    return `| ${fields.map(cell).join(" | ")} |`;
  }),
  "",
];
await atomicWrite(join(directory, "claims-review.md"), review.join("\n"));
