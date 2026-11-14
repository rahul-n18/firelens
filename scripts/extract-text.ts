import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { atomicWrite, corpus, readJson, sha256, type Source } from "./corpus.js";
import { extractText } from "./extraction.js";

const manifest = await readJson<Source[]>(join(corpus, "manifest.json"));
const textDir = join(corpus, "text");
await mkdir(textDir, { recursive: true });
let extracted = 0;
for (const source of manifest) {
  const bytes = await readFile(join(corpus, source.raw_file)).catch(error => {
    if (source.local_only && error.code === "ENOENT") return undefined;
    throw error;
  });
  if (bytes === undefined) {
    console.log(`${source.source_id}: local-only, skipped (raw snapshot absent)`);
    continue;
  }
  if (sha256(bytes) !== source.sha256) throw new Error(`${source.source_id}: raw SHA-256 mismatch`);
  await atomicWrite(join(textDir, `${source.source_id}.txt`), await extractText(bytes, source));
  extracted++;
}
console.log(`Extracted ${extracted} sources`);
