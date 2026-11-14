import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { corpus, readJson, type Claim, type Source } from "./corpus.js";

const curl = promisify(execFile);
const claims = await readJson<Claim[]>(join(corpus, "claims.json"));
const manifest = await readJson<Source[]>(join(corpus, "manifest.json"));
const userAgents = new Map(manifest.filter(source => source.retrieval_user_agent).map(source => [source.url, source.retrieval_user_agent!]));
const urls = [...new Set(claims.map(claim => claim.source_url))].sort();
let failures = 0;
for (const batch of Array.from({ length: Math.ceil(urls.length / 4) }, (_, index) => urls.slice(index * 4, index * 4 + 4))) {
  const results = await Promise.all(batch.map(async url => {
    try {
      const { stdout } = await curl("curl", ["-sSL", "--max-time", "12", "-o", "/dev/null", "-w", "%{http_code}", url]);
      if (!/^2\d\d$/u.test(stdout) && userAgents.has(url)) {
        const retry = await curl("curl", ["-sSL", "--max-time", "12", "-A", userAgents.get(url)!, "-o", "/dev/null", "-w", "%{http_code}", url]);
        return { url, status: `${retry.stdout} (browser user agent, default ${stdout})`, ok: /^2\d\d$/u.test(retry.stdout) };
      }
      return { url, status: stdout, ok: /^2\d\d$/u.test(stdout) };
    } catch (error) {
      const result = error as { stdout?: string; stderr?: string };
      return { url, status: result.stderr?.trim() || result.stdout || "Transport error", ok: false };
    }
  }));
  for (const result of results) {
    if (!result.ok) failures++;
    console.log(`${result.ok ? "PASS" : "FAIL"} ${result.status} ${result.url}`);
  }
}
console.log(`${urls.length - failures} passed, ${failures} failed across ${urls.length} unique claim source URLs.`);
if (failures) process.exitCode = 1;
