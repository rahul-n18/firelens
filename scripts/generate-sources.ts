import { join } from "node:path";
import { atomicWrite, corpus, readJson, root, type Claim, type Source, type Unavailable } from "./corpus.js";

const [sources, claims, unavailable] = await Promise.all([
  readJson<Source[]>(join(corpus, "manifest.json")),
  readJson<Claim[]>(join(corpus, "claims.json")),
  readJson<Unavailable[]>(join(corpus, "unavailable.json")),
]);

const sections = sources.map(source => {
  const supported = claims.filter(claim => claim.source_id === source.source_id).map(claim => claim.claim_id);
  return [
    `## ${source.source_id} · ${source.title}`, "",
    `- Publisher and tier · ${source.publisher} · ${source.tier}`,
    `- Retrieved · ${source.retrieved_at}`,
    `- SHA-256 · \`${source.sha256}\``,
    `- DOI · ${source.doi ? `[${source.doi}](https://doi.org/${source.doi})` : "Unlisted"}`,
    `- Supported claims · ${supported.length ? supported.map(id => `\`${id}\``).join(", ") : "Metadata only"}`,
    `- Access · ${source.local_only ? "Local-only snapshot. " : ""}${source.access_note}`,
    `- [Source](${source.url}) · [Snapshot retrieval URL](${source.retrieval_url})`,
  ].join("\n");
});
const failures = unavailable.map(entry => [
  `- **${entry.source_id} · ${entry.title}**. ${entry.reason} Checked ${entry.attempted_at}.`,
  `  ${entry.attempted_urls.map((url, index) => `[Attempt ${index + 1}](${url})`).join(" · ")}`,
].join("\n"));

await atomicWrite(join(root, "docs", "sources.md"), [
  "# FireLens sources", "Generated from the corpus manifest, claims, and unavailable-source log.",
  ...sections, "## Unavailable full texts", failures.join("\n"),
].join("\n\n") + "\n");
