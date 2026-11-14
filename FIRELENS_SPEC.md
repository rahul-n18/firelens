# FireLens — Build Spec v2

NASA Space Apps Challenge 2026 · Challenge: *Flame in Freefall: AI-Powered Fire Safety Insights from Microgravity Combustion Data* · Team Anantyam

---

## 0. Operating rules for the agent (read first)

You are a senior product engineer with scientific-data discipline. This is a fresh repository; there is no existing code to preserve.

When goals conflict, follow this priority order: (1) scientific honesty, (2) a working end-to-end demo, (3) visual quality, (4) feature count.

Hard rules:

- Never write a scientific number, result, or quotation that you did not read in a source file stored in this repository. Your training knowledge is not a source. The "leads" in section 3 are pointers to check, not facts to copy.
- If a source cannot be accessed, record it in `corpus/unavailable.json` with the reason and move on. Never reconstruct inaccessible content from memory.
- If you have no network access, finish scaffolding, then stop and print an exact list of files the team must download manually and where to place them.
- Never report something as done unless you ran it and saw it pass.

**Deadline:** demo-ready by Sunday 15 November 2026, 14:30 CET. Space Apps submissions close at 23:59 local time the same day.

---

## 1. Product

### The problem (from the official challenge)

NASA's Physical Science Informatics (PSI) repository publishes decades of low-gravity combustion results, but the volume is overwhelming. The challenge asks for a web dashboard that summarizes, ranks, and interprets combustion investigations; identifies those most relevant to habitable environments (spacecraft, stations, lunar and Martian bases, pressurized rovers); and extracts data that supports predictive modeling of fire scenarios.

### The user

A fire safety engineer working on a lunar habitat, a Gateway module, or a commercial station. They have a concrete design decision (what particle sizes a smoke detector must sense, where to place it, whether ground test data applies to their gravity level) and must defend it in a design review.

### The job FireLens does

> "For my conditions, what has actually been measured, on which platform, what was only modeled or hypothesized, and what has nobody measured yet?"

**Pitch:** FireLens shows what NASA's fire experiments actually found, how each result was obtained, and exactly where the evidence runs out, with every claim one click from the original source.

### Why this wins

Most entries in this challenge are dark "mission-control" dashboards with flame animations, invented risk scores, and ML predictions trained on very small datasets. Judges with combustion backgrounds will notice overreach. FireLens competes on two things those entries cannot show: claims that are machine-verified against stored NASA sources, and an honest gap analysis that says "this has not been measured; here is the nearest evidence and what would close the gap." That second part is directly useful for Artemis-era planning.

### Three signature features (everything else is secondary)

1. **Evidence Answer.** A short answer where every sentence links to the claims it rests on.
2. **Gravity Coverage Map.** A matrix with evidence topics as rows (smoke particle size, particle morphology, detector response, smoke transport, flame soot onset) and test conditions as columns (1g ground lab, microgravity on ISS, lunar 0.16g, Mars 0.38g, numerical model only). Each cell shows the kind of evidence present; cells with no evidence in the corpus are hatched. This is the visual signature of the product and is shown on first load, so the landing page contains real content instead of an empty search box.
3. **Source Inspector.** A side panel showing the verbatim excerpt, document title, page or section, DOI, retrieval date, a working link, and an "Excerpt verified" indicator backed by the checksum pipeline in section 3.

### Focus

One vertical done properly: **smoke and fire detection**, built on SAME and SAME-R, with SPICE as the related flame-soot investigation. Every other PSI combustion investigation appears in the index as "Indexed, not yet reviewed" (metadata only), so ranking covers the whole field without pretending all of it was read.

---

## 2. Scope and time budget

Build in this order. Each phase must leave the app working. If time runs short, cut from the bottom.

| Phase | Priority | Contents |
|---|---|---|
| P0 | Must | Corpus pipeline: snapshots, manifest, claims, verifier passing |
| P1 | Must | Search, ranked investigations, deterministic Evidence Answer, Source Inspector |
| P2 | Must | Flight vs ground comparison, Coverage Map, evidence-gap answers |
| P3 | Should | Mobile layout, keyboard support, all UI states, `docs/sources.md`, "Copy evidence brief", structured evidence export (CSV/JSON) |
| P4 | Could | Optional LLM synthesis behind a toggle, with validator |
| P5 | Could | Review more investigations (e.g. Saffire, BASS) using the same pipeline |

**Out of scope:** authentication, databases, vector stores, agent frameworks, flame simulators, risk scores, ML predictions, a chatbot interface, animated hero sections.

**Stack:** Next.js (App Router), TypeScript strict, Tailwind, shadcn/ui primitives. Corpus stored as versioned JSON in the repo. Client-side search (MiniSearch or a small hand-written BM25). Vitest for unit tests, Playwright for end-to-end tests and screenshots. Deploy to Vercel. The app must be fully functional with no API key; the only server route allowed is the optional P4 synthesis endpoint.

---

## 3. Source of truth

### 3.1 Sources

**Tier A — PSI investigation records (primary)**

- PSI-101, SAME-R (Smoke Aerosol Measurement Experiment – Reflight). DOI 10.60555/2np7-jv14. https://psi.nasa.gov/physci/repo/data/investigations/PSI-101
- PSI-102, SAME. A third-party listing reports DOI 10.60555/gd4k-8h62; verify on PSI before using it. https://psi.nasa.gov/physci/repo/data/investigations/PSI-102
- PSI-107, SPICE (Smoke Point In Co-flow Experiment). DOI 10.60555/9kbh-e962. https://psi.nasa.gov/physci/repo/data/investigations/PSI-107
- The full list of PSI Combustion Science investigations (ID, title, DOI, objective) for the "Indexed, not yet reviewed" layer.

Access note: PSI investigation pages are rendered by JavaScript, so a plain HTTP fetch returns an empty page shell. Get the structured metadata by inspecting the JSON requests the PSI web app makes and saving those responses, or via the search endpoint `https://psi.nasa.gov/physci/repo/search?q=&data_source=psi&data_type=investigation`, or by manual download. Record which method was used for each source. Check and record the license stated on PSI for public files.

**Tier B — Reports and papers (where the measurements are). Leads to verify; do not copy anything from this list into claims.**

- NTRS 20140006585, *Evaluation of Low-Gravity Smoke Particulate for Spacecraft Fire Detection*: ISS smoke particle size results, including a comparison with normal-gravity particles.
- NTRS 20170007283, Meyer, *Spacecraft Fire Safety Research at NASA Glenn Research Center*: overview including ground-based testing of SAME smoke after the flights (relevant to demo query 1).
- Aerosol Science and Technology 49 (2015), DOI 10.1080/02786826.2015.1025124 and its companion DOI 10.1080/02786826.2015.1025125: SAME/SAME-R smoke characterization, flight vs ground. Confirm titles and authors from the DOI landing pages; look for open copies on NTRS or core.ac.uk.
- Yang et al., *Smoke Aerosol Measurement Experiment (SAME)*, NASA Technical Memorandum (final report, available via NIST).
- SAE 2009-01-2468, Urban et al., *Smoke Particle Sizes in Low-Gravity and Implications for Spacecraft Smoke Detector Design*. Likely paywalled: use bibliographic metadata only unless full text is legitimately available.
- NTRS 20230013826, Fortenberry et al., *The Influence of Smoke Particle Properties and Cabin Characteristics on Smoke Detection in Lunar Gravity*. This is computational modeling, not measurement; classify its claims as MODEL_RESULT. It is the key "nearest evidence" for the lunar-gravity gap.
- NTRS 20120017940, NASA GRC overview of ISS combustion experiments (describes SPICE's objective).
- SPICE results: Dotson et al., *Laminar Smoke Points of Nonbuoyant Coflowing Flames*; University of Maryland theses by Dotson (2009) and DeBold (2012).
- ESA article *No fire in the sky: preventing an astronaut's worst nightmare*: partner-agency context on planned partial-gravity smoke measurements. Label as ESA, not NASA.

**Tier C — Never cite:** other hackathon repositories, blogs, AI-generated summaries. Wikipedia may be used as a lead only.

### 3.2 Snapshot pipeline

```
corpus/
  raw/<source_id>.(json|pdf|html)   original bytes as retrieved
  text/<source_id>.txt              extracted plain text with page markers: [[page 4]]
  manifest.json                     one entry per source
  investigations.json               PSI index (reviewed + metadata-only)
  claims.json                       reviewed evidence claims
  vocabulary.json                   synonyms, condition terms, disambiguation rules
  unavailable.json                  attempted sources that could not be retrieved, with reason
scripts/
  fetch-sources.ts
  extract-text.ts
  verify-corpus.ts                  runs in `npm test` and blocks the build on failure
```

Manifest fields: `source_id`, `title`, `authors`, `year`, `publisher`, `tier`, `url`, `doi`, `retrieved_at` (ISO 8601), `sha256` of the raw file, `extraction_method`, `access_note` (license, paywall, partial).

### 3.3 Claim schema

| Field | Rule |
|---|---|
| `claim_id` | Stable, e.g. `SAMER-007` |
| `investigation_id` | e.g. `PSI-101`, or `null` for cross-cutting sources |
| `source_id` | Must exist in the manifest |
| `claim_text` | Our plain-English paraphrase; one assertion per claim |
| `source_excerpt` | Verbatim substring of `text/<source_id>.txt`, at most 60 words |
| `source_location` | Page, section, table, or figure |
| `claim_status` | `REPORTED_RESULT`, `MODEL_RESULT`, `OBJECTIVE_OR_HYPOTHESIS`, `TEAM_INFERENCE`, `NOT_ESTABLISHED` |
| `platform` | `ISS_FLIGHT`, `GROUND_LAB`, `REDUCED_GRAVITY_AIRCRAFT`, `DROP_TOWER`, `NUMERICAL_MODEL`, `MIXED`, `UNSPECIFIED` |
| `gravity_level` | `1g`, `microgravity`, `lunar_0.16g`, `mars_0.38g`, `multiple`, `unspecified` |
| `topics` | Controlled vocabulary: `smoke_particle_size`, `smoke_morphology`, `detector_response`, `smoke_transport`, `pyrolysis`, `soot_onset`, … |
| `materials` | Only as named in the source |
| `quantity`, `value`, `unit`, `conditions` | Only when the excerpt itself contains the number |
| `derived_from` | Required (non-empty) for `TEAM_INFERENCE`; forbidden otherwise |
| `doi`, `source_url` | Copied from the manifest |
| `review` | `{status: DRAFT or HUMAN_REVIEWED, reviewer, date}`. The agent may only create `DRAFT`. |

Why these changes from v1: "SOURCE_REPORTED" was ambiguous because papers also report their own hypotheses, so results and objectives are now separate statuses. "FLIGHT/GROUND" could not represent modeling work, which is exactly what exists for lunar gravity. Classification is per claim, because one flight investigation can have ground follow-up tests.

Semantic rules:

- Objectives and hypotheses are never presented as results. UI wording for them is "aimed to" or "hypothesized", never "showed", "found", or "measured".
- Model results never appear in a "measured" column.
- `NOT_ESTABLISHED` statements always carry their scope: "Not established in FireLens corpus v1 (N sources)". Never write "has never been measured".
- Topic disambiguation is mandatory: SPICE's "smoke point" is the flame length at which a flame starts emitting soot. It is not smoke aerosol for fire detection. Tag SPICE claims `soot_onset`, not `smoke_particle_size`.

### 3.4 Corpus verifier (blocks the build)

`verify-corpus.ts` must check, and fail loudly with the offending claim IDs:

- Each `source_excerpt` is an exact substring of the extracted text after normalization (whitespace, ligatures, end-of-line hyphenation, curly quotes).
- Each numeric token in `value` and `claim_text` appears in the excerpt.
- Each `source_id` exists in the manifest, and each raw file's SHA-256 matches the manifest.
- Each `TEAM_INFERENCE` has `derived_from` entries that exist; no other status has `derived_from`.
- DOIs are well formed; URLs use https.
- No claim is `HUMAN_REVIEWED` without a reviewer name.
- Print a summary: claims by status, by platform, by review state.

---

## 4. Search, ranking, and answers

### Ranking (deterministic and explainable)

- Rank at two levels: claims and investigations. Use BM25 over `claim_text`, `source_excerpt`, `topics`, and investigation title and objective, with field boosts.
- Parse the query for conditions using `vocabulary.json`: gravity terms ("in orbit", "ISS", "microgravity", "lunar", "Moon", "0.16 g", "Mars"), platform terms ("ground", "lab", "flight"), and quantities ("diameter", "particle size").
- Disambiguation: when a query matches both smoke aerosol and flame smoke point, group results under "Smoke aerosol and detection" and "Different meaning: flame smoke point (soot emission)", with a one-line explanation.
- Every result shows why it matched: the matched terms and fields, detected conditions, and counts of supporting claims by status. No opaque percentage scores.
- Habitat relevance tags (spacecraft cabin, surface habitat, pressurized rover) only where a source supports them; otherwise "Not assessed".
- Metadata-only investigations rank below reviewed ones, under a divider labeled "Indexed, not yet reviewed".

### Evidence Answer (deterministic by default)

1. **Direct answer:** up to three sentences, each built from one claim, each followed by a claim chip.
2. **Evidence by condition:** a flight vs ground comparison table with rows for what was measured, conditions, instruments, limitations, and missing data. Empty cells say "Not reported in corpus".
3. **Gaps:** if the query asks for a quantity under a condition and no `REPORTED_RESULT` matches both, show the evidence-gap card: what is not established, the nearest evidence (same quantity at another gravity level, or model results, each clearly labeled), and what would close the gap, citing a source only if one states that need.
4. **Sources** used in this answer.

Never answer a lunar question with a microgravity number. Nearest evidence is shown as context, never as the answer.

### Optional LLM synthesis (P4)

- Input: only the retrieved claims (id, text, excerpt, status, platform, gravity level).
- Output: JSON `{sentences: [{text, claim_ids}]}`.
- Validator rejects the output if any sentence has no claim IDs, cites an ID not in the retrieved set, contains a number absent from its cited claims, or uses "showed/found/measured" while citing only objectives or hypotheses.
- On failure, show the deterministic answer with a quiet note: "Synthesis unavailable; showing evidence summary."
- Label generated text: "Written by [model name] from the cited excerpts." No fake typing animation.

---

## 5. Interface and design system

### Concept

A NASA technical memorandum turned into software: calm, typographic, information-dense, precise. Not mission control.

The v1 brief (shadcn dashboard block, dark navy, amber accents, Geist) is the default output of AI app builders and closely matches what other teams in this challenge are building. Do not use it.

### Layout

- **Top bar (48px):** "FireLens" as a text wordmark; "Built on NASA PSI open data"; corpus status computed from the data, e.g. "Corpus v1 · 3 reviewed · 24 indexed · retrieved 14 Nov 2026". Never hard-code counts.
- **Query:** one wide input. Below it, "Try:" followed by the three demo questions as plain text links.
- **Main column, in order:** Evidence Answer, Coverage Map, Flight vs Ground comparison, ranked investigations.
- **Source Inspector:** right-side sheet about 480px wide on desktop; full-screen sheet on mobile.
- **Before any query:** show the Coverage Map for the whole corpus with a one-line explanation of the hatching.

### Typography

- IBM Plex Sans for UI (400, 500, 600). IBM Plex Mono for IDs, DOIs, values, and units, with tabular numerals.
- Source Serif 4 for verbatim source excerpts, set in a quote block with a thin left rule.
- **Rule: serif text is always NASA's or the authors' exact words; sans text is always ours.** Explain this once in a short "How to read the evidence" note.
- Type scale: 13 / 14 / 16 / 20 / 28 px. Prose capped at about 72 characters per line.

### Color

Light theme by default (more legible on projectors and in recorded demos), with a matching dark theme. Define all colors as tokens.

- Light: background `#F7F6F2`, surface `#FFFFFF`, ink `#16181D`, muted `#5B616B`, rule `#E3E1DA`.
- Dark: background `#0F1114`, surface `#16191E`, ink `#E8E6E1`, muted `#9AA0A8`, rule `#2A2E35`.
- One accent, `#B4410E`, used only for links, focus rings, and selected states.

### Evidence encoding (shape and label first, color second; colorblind-safe)

| Status | Mark | Label |
|---|---|---|
| REPORTED_RESULT | Filled square | "Measured" or "Reported" |
| MODEL_RESULT | Dashed outline square | "Model" |
| OBJECTIVE_OR_HYPOTHESIS | Hollow circle | "Objective" or "Hypothesis" |
| TEAM_INFERENCE | Half-filled circle | "Our inference" |
| NOT_ESTABLISHED | 45° hatched cell | "No evidence in corpus" |

Platforms appear as mono labels such as `ISS · µg`, `LAB · 1g`, `CFD MODEL · 0.16g`.

### Components

shadcn/ui primitives only: Input or Command, Table, Tabs, Sheet, Tooltip, HoverCard, Badge (sparingly), Separator, Skeleton, Toggle. Do not use dashboard blocks, sidebar templates, or chart components. Border radius 4px, 1px borders, no shadows except on the Sheet, 4px spacing grid, generous whitespace around the answer.

### Banned

Gradients, glows, glassmorphism, emoji, sparkle or "AI" icons, animated flames, fake telemetry or time series, KPI cards, avatars, decorative charts, count-up numbers, typing effects, parallax, pill badges on everything, `rounded-2xl` everywhere, sidebar navigation with items that do nothing, "Get started" hero sections, and copy such as "AI-powered insights", "unlock", "revolutionize", or "seamless".

### Motion

150ms ease-out for hover and focus; 200ms for the Sheet. Respect `prefers-reduced-motion`.

### Microcopy

Sober and specific. State platform and date only when the source does, e.g. "Measured aboard ISS (Expedition 24, 2010)". Buttons use verbs: "Open source", "Copy citation", "Copy evidence brief", "Export evidence (CSV)".

### Accessibility

WCAG AA contrast in both themes. Visible focus. Keyboard: `/` focuses search, arrow keys move through results, Enter opens, Esc closes the Inspector. The Inspector traps focus and returns it on close. Status marks have accessible names; hatched cells contain readable text.

### Responsive

Below 768px: single column; the Coverage Map becomes a stacked list per topic; the comparison table scrolls horizontally inside its own container with a sticky first column; the page body never scrolls sideways.

### States

Search is instant, so no spinner for it. Skeleton only for optional LLM synthesis. "No match in corpus" states suggest vocabulary terms that do exist. LLM errors fall back silently to the deterministic answer, with the quiet note above.

---

## 6. Required demo queries

**Q1: "What did SAME-R measure in orbit, and what ground tests followed?"**
SAME-R ranks first. The answer separates `ISS_FLIGHT` claims (what was measured in orbit, as the sources state) from `GROUND_LAB` follow-up claims (ground tests as the sources describe them). Both columns of the comparison table are populated; missing equivalents say "Not reported in corpus".

**Q2: "Which investigations study smoke behavior in microgravity?"**
SAME-R and SAME rank above SPICE. SPICE appears in its own group labeled "Different meaning: flame smoke point (soot emission)". Match explanations are visible. Any matching metadata-only investigations appear below the "Indexed, not yet reviewed" divider.

**Q3: "What smoke-particle diameter was measured at lunar gravity?"**
The evidence-gap card appears: no measured smoke-particle diameter at lunar gravity in corpus v1. Nearest evidence lists microgravity flight and 1g ground results, each labeled with its real condition; lunar smoke transport modeling is labeled "Model", not measurement; any source stating such measurements are needed or planned is cited. No diameter appears as the answer. The lunar column of the Coverage Map is highlighted with its hatched cells.

**Q4 (optional showcase): "Are smoke particles larger in microgravity than on Earth?"**
Only if a stored source reports that comparison verbatim.

### 30-second demo script

- **0–5 s:** Landing page shows the Coverage Map. "This is what NASA's fire experiments actually cover. Hatched means no measurement in our corpus."
- **5–15 s:** Ask Q1. Flight and ground evidence side by side. Click a value; the Inspector shows the verbatim NASA excerpt, DOI, and "Excerpt verified".
- **15–25 s:** Ask Q3. The evidence gap, nearest evidence, and model vs measurement distinction.
- **25–30 s:** "Copy evidence brief": a cited summary ready for a design review.

---

## 7. Tests and acceptance

### Unit tests (Vitest)

- The corpus verifier passes on the real corpus and fails on negative fixtures: an altered excerpt, a number missing from its excerpt, an inference without `derived_from`, a source missing from the manifest, a checksum mismatch.
- Ranking: Q2 ordering and SPICE grouping; repeated runs give identical order; match explanations contain the matched terms.
- Classification: Q1 returns at least one `ISS_FLIGHT` and one `GROUND_LAB` claim, with no `MODEL_RESULT` in a measured column.
- Gaps: Q3 returns a gap with no nm or µm value in the direct answer. Also test "Mars gravity" and "elevated oxygen at reduced pressure" variants.
- Wording: claims with `OBJECTIVE_OR_HYPOTHESIS` status never render next to "showed", "found", or "measured".
- If P4 is built: the validator rejects a fabricated claim ID, an unseen number, and an uncited sentence.

### End-to-end tests (Playwright) at 1440×900 and 390×844

- The full flow for all three queries, including opening the Inspector, checking the source link's `href`, and closing with Esc.
- The same flow using only the keyboard.
- Zero console errors; no horizontal page overflow; screenshots saved to `artifacts/`.
- axe accessibility scan with zero serious or critical issues.
- Link check of every `source_url` (when network is available). Report failures; never hide them.

`lint`, `typecheck`, `test`, `build`, and `e2e` must all pass.

### Acceptance criteria

- A judge can ask a question, see ranked investigations with reasons, compare flight and ground evidence, and open the exact source for any finding, with no broken or misleading UI.
- No number appears on screen that is not traceable to a verified claim.
- No hatched cell appears for something the corpus actually covers.

---

## 8. Deliverables and final report

- `README.md`: what FireLens is, how to run it, how verification works, limitations.
- `docs/sources.md`, generated from the manifest and `unavailable.json`: URL, DOI, retrieval date, SHA-256, supported claim IDs, and what could not be accessed and why.
- `docs/claims-review.md`: a table of all `DRAFT` claims (ID, text, excerpt, location) for the team to review and sign off before the demo.
- Final report, containing only what was verified: implemented features; each test command with pass/fail counts; claims by status and review state; unresolved limitations; deployment URL and status.
