import { mkdir, readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { atomicWrite, corpus, readJson, sha256, type Source } from "./corpus.js";

// Restore only the recorded version. A changed upstream response needs fresh
// extraction and claim review before it can replace a pinned snapshot.
const manifest = await readJson<Source[]>(join(corpus, "manifest.json"));
const snapshots = new Map<string, Source>();
for (const source of manifest) {
  if (!/^raw\/[A-Z0-9-]+\.(json|html|pdf)$/.test(source.raw_file)) {
    throw new Error(`${source.source_id}: unsafe raw filename`);
  }
  if (!source.retrieval_url.startsWith("https://")) throw new Error(`${source.source_id}: HTTPS required`);
  const previous = snapshots.get(source.raw_file);
  if (previous && (previous.sha256 !== source.sha256 || previous.local_only !== source.local_only)) {
    throw new Error(`${source.raw_file}: conflicting hashes or local-only flags`);
  }
  snapshots.set(source.raw_file, source);
}
const failures: string[] = [];
let networkReached = false;
let restored = 0;
for (const source of snapshots.values()) {
  try {
    const path = join(corpus, source.raw_file);
    const exists = await stat(path).then(() => true, (error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
      return false;
    });
    if (exists) {
      if (sha256(await readFile(path)) !== source.sha256) throw new Error("local SHA-256 mismatch");
      continue;
    }
    if (source.local_only) {
      console.log(`${source.raw_file}: local-only, skipped (restore manually from ${source.retrieval_url})`);
      continue;
    }
    const headers = source.retrieval_user_agent ? { "User-Agent": source.retrieval_user_agent } : undefined;
    const response = await fetch(source.retrieval_url, { signal: AbortSignal.timeout(30_000), headers });
    networkReached = true;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (sha256(bytes) !== source.sha256) throw new Error("upstream bytes differ from the recorded snapshot");
    await mkdir(dirname(path), { recursive: true });
    await atomicWrite(path, bytes);
    restored++;
  } catch (error) {
    failures.push(`${source.raw_file} <- ${source.retrieval_url} (${String(error)})`);
  }
}

console.log(`Checked ${snapshots.size} raw snapshots and restored ${restored}`);
if (failures.length) {
  if (!networkReached) console.error("No remote snapshot response was obtained during this run.");
  console.error("Unresolved snapshots and their retrieval URLs:");
  console.error(failures.join("\n"));
  process.exitCode = 1;
}
