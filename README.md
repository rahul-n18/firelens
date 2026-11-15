# FireLens

FireLens assembles traceable evidence about smoke, detection, and flame soot onset from NASA PSI and the accompanying literature. Search the reviewed corpus, compare flight and ground evidence, and open the original excerpts. The gravity coverage map shows where observations, models, and objectives are available. You can copy a cited evidence brief or export the active answer as CSV or JSON.

## Run the corpus checks

Use Node.js 20.19 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Press `/` to focus search, use the arrow keys to select an investigation, and press Enter to open its source. Escape closes the inspector and returns focus.

`npm test` runs the corpus verifier followed by Vitest. The verifier checks the raw SHA-256 hashes, reproduces the stored text from the snapshots, checks excerpts and numeric tokens, validates claim references and classifications, and matches the investigation index against the stored PSI search response. It runs offline. `npm run build` verifies the corpus, checks TypeScript, and creates a deployable static export in `out/`.

Run `npx playwright install chromium` once, then run `npm run e2e` against a fresh build. Playwright performs the demo and accessibility checks at both widths and writes screenshots to `artifacts/`. Run `npm run check:links` for the network source checks.

## Work with the corpus

- `npm run fetch-sources` verifies the local raw files and attempts to restore missing bytes from their manifest URLs. If an upstream file has changed, the command reports the mismatch and preserves the recorded version.
- `npm run extract-text` regenerates the extracted text, including one-based PDF page markers. The SAE paper shares the original NIST-hosted PDF and uses the page range for Appendix B.
- `npm run docs:sources` regenerates the [source register](docs/sources.md).
- `npm run docs:claims` regenerates the [draft claim review](docs/claims-review.md). The [manifest](corpus/manifest.json) records source URLs, retrieval dates, and hashes.

Claim review is a human step. Check the source location and evidence classification with the paraphrase. The [access log](corpus/unavailable.json) identifies the three papers represented by abstracts. The [investigation index](corpus/investigations.json) records which PSI investigations have draft claims and which are indexed as metadata only.

Some snapshots are designated `local_only` in the manifest, including the lunar smoke-model poster and the NIST report with its SAE appendix. The verifier reports missing local snapshots as skipped, and the app omits their claims. To reproduce the full evidence shown in production, restore the manifest's local-only snapshots at their `raw_file` paths under `corpus/` and run `npm run extract-text` followed by `npm test`. The verifier checks the snapshot hashes before a production build.

Corpus excerpts are quoted from the cited sources. Full texts designated as local-only, including third-party copyrighted materials, are not included in the public repository. Source materials retain their own licenses and copyright notices.
