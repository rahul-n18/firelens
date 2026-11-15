import { corpus, platforms, statuses } from "./corpus.js";
import { verifyCorpus } from "./verification.js";

const { errors, claims, sources, investigations, unavailable, skippedSources } = await verifyCorpus(corpus);
for (const id of skippedSources) console.log(`${id}: local-only, skipped (raw snapshot absent)`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  const skippedClaims = claims.filter(claim => skippedSources.has(claim.source_id)).length;
  console.log(`Verified ${claims.length - skippedClaims} claims against snapshots, ${sources.length - skippedSources.size} source snapshots, ${investigations.length} PSI investigations, ${unavailable.length} unavailable entries`);
  if (skippedClaims) console.log(`${skippedClaims} claims checked without the local-only source text`);
  console.log("By claim status", Object.fromEntries(statuses.map(status =>
    [status, claims.filter(claim => claim.claim_status === status).length])));
  console.log("By platform", Object.fromEntries(platforms.map(platform =>
    [platform, claims.filter(claim => claim.platform === platform).length])));
}
