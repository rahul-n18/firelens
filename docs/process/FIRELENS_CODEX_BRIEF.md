# FireLens — Final Build Brief for Codex

This brief replaces the landing experience of the current app. Read it completely before changing code. It supersedes FIRELENS_SPEC_v3.md. docs/process/FIRELENS_SPEC.md Section 0 (scientific honesty) still applies in full.

---

## 0. The two rules that override everything

**Rule 1 — The corpus is the only source of facts.**
Every scientific statement, number, quote, status or label shown in the app must come from `corpus/claims.json` (and the manifest/investigations files), verified by `verify-corpus`. Nothing factual may be hardcoded in a component. If a claim needed by a section does not exist or fails verification, that element is not rendered; the app shows the matching "not in our sources" state instead.

**Rule 2 — The prototype is the UI, not the content.**
`docs/design/firelens-prototype.html` is the visual reference: layout, spacing, colours, type, components, interactions and the smoke animation. Its text and numbers are placeholders that show where corpus content goes. Do not copy any factual sentence or number from it. Use each claim's stored `claim_text`, `value`, `unit` and `conditions`. Do not rewrite stored claims to match the prototype's wording.

What may be hardcoded (UI copy, no facts): section headings, one-line instructions, button labels, empty-state templates, the illustration disclaimer. The full allowed list is in Section 4.

---

## 1. What we are building, and why

Judges must understand the product in 10 seconds. The 2025 Space Apps global winners closest to this challenge won by (1) making complex NASA science accessible through design and visualisation, (2) answering one simple question, and (3) making the data transparent and trustworthy. FireLens does exactly that for spacecraft fire safety:

**The question:** Does smoke behave the same away from Earth?
**The answer the page shows:** what NASA measured in orbit, what was only simulated for the Moon, what nobody has measured (Mars), and what to test next, with every fact one click from its verified source.

How the page answers NASA's challenge brief:

| Challenge asks | Answered by |
|---|---|
| Summarize, rank, interpret investigations | Measured section, Mission briefings, "Most relevant studies", Ask section |
| Habitable crew environments | Gravity tabs (See it) and Mission tabs (station, Moon base, Mars base) |
| Data for predictive modelling | Data for fire modelers table + CSV/JSON export |
| Next-generation safety equipment | Detector chart + authors' suggestion + "Test next" column |
| Earth fire safety (optional) | Earth tabs, from verified claims only |
| AI-powered | Trust strip: AI drafts, software verifies, people review |

---

## 2. Setup

1. Copy the reference file into the repo at `docs/design/firelens-prototype.html` (it is in the project folder; ask the user if missing). Open it in a browser before coding.
2. Commit the current state: "WIP before final redesign". Tag it `pre-final`.

---

## 3. Corpus additions (Phase A — do first)

Add these claims from sources already stored. Each excerpt must be verbatim from the stored file; if the verifier cannot match an excerpt, skip that claim and report it. Status DRAFT; regenerate `docs/claims-review.md` listing only new claims for human review. Proposed `claim_text` values are given; keep them unless they say more than the excerpt.

From `corpus/raw/NTRS-20140006585.pdf` (NASA Glenn presentation; investigation_id null):

| claim_id | Slide | Verbatim excerpt | Status / label | Platform / gravity | Structured value | Proposed claim_text |
|---|---|---|---|---|---|---|
| NTRS13-007 | 19 | For lampwick and silicone approximately 40% of the aerosol mass had aerodynamic diameters greater than 1 μm | REPORTED_RESULT | ISS_FLIGHT / microgravity | value 40, unit %, qualifier "approximately", conditions "aerodynamic diameter > 1 μm; lampwick and silicone" | For lampwick and silicone, about 40% of smoke mass was in particles larger than 1 µm. |
| NTRS13-008 | 4 | ISS detector: sensitive > 0.5 micron | REPORTED_RESULT, label "Equipment specification" | UNSPECIFIED / unspecified | value 0.5, unit µm, qualifier greater_than | The Space Station smoke detector is sensitive to particles larger than 0.5 µm. |
| NTRS13-008b | 4 | 2-pass IR laser-diode forward-scattering detector (30 degrees) minimum reported sensitivity is 0.3 μm. | as above | as above | value 0.3, unit µm | Its minimum reported sensitivity is 0.3 µm. |
| NTRS13-009 | 4 | STS Detector: sensitive < 1 micron | as above | as above | value 1, unit µm, qualifier less_than | The Space Shuttle smoke detector is sensitive to particles smaller than 1 µm. |
| NTRS13-009b | 4 | dual-chamber ionization with inertial separator which rejects particles larger than 1-2 microns. | as above | as above | value "1-2", unit µm | It rejects particles larger than 1–2 µm. |
| NTRS13-010 | 3 | Destiny Smoke Detection Simulation-25% Soot | MODEL_RESULT | NUMERICAL_MODEL / multiple | — | NASA simulated smoke in the ISS Destiny module at low and normal gravity. |
| NTRS13-011 | 6 | First Moment: First Alert™ Smoke Detector | REPORTED_METHOD | ISS_FLIGHT / microgravity; topics detector_response, earth_application | — | SAME used a commercial First Alert smoke detector among its instruments. |
| NTRS13-012 | 7 | Sample Materials: | REPORTED_METHOD; conditions "Silicone, Teflon, Kapton, LampWick, Pyrell, DBP" (each name must appear on slide 7) | ISS_FLIGHT / microgravity | — | The experiments heated silicone, Teflon, Kapton, lampwick, Pyrell and DBP. |
| NTRS13-013 | 19 | Spacecraft fire conditions include an even wider array of materials and conditions. | OBJECTIVE_OR_HYPOTHESIS, label "Authors' statement" | MIXED / multiple | — | The authors note real spacecraft fires involve an even wider range of materials and conditions. |

Add structured values to existing claims where the excerpt contains them: NTRS13-001 (100–600, nm, range), NTRS13-004 (value "twice", qualifier "typically"), SAMER-002 (66), SAME-004 (500, nm, greater_than), NTRS13-002 (8, cm/s), LUNAR-002 (5 min at 5 cm/s). The verifier must confirm every number appears in the excerpt.

Optional, only if found verbatim:
- LUNAR-003: the 1 cm/s lunar forced-flow sentence in `corpus/text/NTRS-20230013826.txt` (MODEL_RESULT, lunar_0.16g).
- LUNAR-004: the future-work sentence about detector placement relative to air supply/return in the same file (OBJECTIVE_OR_HYPOTHESIS, "Authors' suggestion").
- EARTH-001…004: sentences in `corpus/text/PSI-*.txt` that state Earth applications (start with the BASS-II objective in PSI-25). gravity 1g, topic earth_application.
- PLANNED-001/002: planned NASA lunar combustion investigations, reported elsewhere as LUCI (Lunar-g Combustion Investigation) and FM2 (Flammability of Materials on the Moon). Find an official NASA page (nasa.gov or science.nasa.gov) describing each, snapshot it into the corpus with sha256, and add one verbatim claim per investigation (OBJECTIVE_OR_HYPOTHESIS, label "Planned (NASA)", gravity lunar_0.16g, topics material_flammability or smoke_transport as the source states). Do not use third-party or hackathon sources. If no official source is found, skip both.

Figures (public NTRS PDF): render slides 3 and 18 with `pdftoppm -r 110 -jpeg -jpegopt quality=78`; crop by page fractions (left, top, right, bottom): slide 3 → (0.10, 0.24, 0.89, 0.888); slide 18 → (0.06, 0.19, 0.92, 0.885). Save to `public/figures/`, record in the manifest as derived assets (source, slide, crop, sha256). Show figures as images only; never redraw or digitise them.

Run `npm test`, commit "Phase A".

---

## 4. Content binding: where every element gets its content

| Element | Source | Rendered text |
|---|---|---|
| Top bar | UI copy | "FireLens", links: See it, Measured, Missions, Data, Ask; "Built on NASA PSI open data"; theme toggle |
| Hero heading | UI copy (a question, not a claim) | "Does smoke behave the same away from Earth?" |
| Hero lede | UI copy, but the three phrases must match computed coverage | "Spacecraft smoke detectors must work in gravity unlike Earth's. FireLens shows what NASA has measured in orbit, what has only been simulated for the Moon, and what nobody has measured yet." If coverage changes so a phrase is no longer true, the build test fails. |
| Gravity tab status (Measured / Simulated only / Nothing measured) | Computed: any REPORTED_RESULT at that gravity → Measured; else any MODEL_RESULT → Simulated only; else Nothing measured | status label |
| "What NASA has" panel rows | Claims at that gravity, ordered Measured → Model → other, max 3 | each claim's `claim_text` + chip |
| Empty panel | Computed | "No smoke or fire measurements at this gravity in our sources. Nearest evidence: {nearest gravity levels that have evidence}." |
| Space Station note | NTRS13-004 | "Particles drawn larger here, based on" + chip NTRS13-004 |
| Slider markers | Claims with airflow values at that gravity (NTRS13-002 → 8 cm/s; LUNAR-002 → 5 cm/s; LUNAR-003 → 1 cm/s if added) | "▲ {value} cm/s" + "NASA test" or "NASA model" per claim status |
| NASA simulation figure | Figure slide 3 + NTRS13-010 | caption with source + chip |
| Big numbers | NTRS13-004, NTRS13-001, SAMER-002 structured values | number from `value`/`unit`; sentence from `claim_text`; chip |
| NASA chart | Figure slide 18 | reading line (UI copy): "Dots above the line mean bigger particles in low gravity."; caption with source |
| Detector chart | NTRS13-001, SAME-004, NTRS13-007, NTRS13-008/008b, NTRS13-009/009b structured values | bars drawn from values; row labels from claims; chips. If any claim is missing, omit that row |
| Authors' suggestion | NTRS13-006 | verbatim excerpt in serif + chip |
| Mission tab status | Same computation as gravity tabs; Earth = gravity 1g | status label |
| "What we know" | REPORTED_RESULT claims at that gravity | claim_text + chip |
| "Only simulated" | MODEL_RESULT claims at that gravity | claim_text + chip |
| "Nobody has measured" | Computed: topics with no REPORTED_RESULT at that gravity, plus OBJECTIVE_OR_HYPOTHESIS claims labelled "Authors' statement" | template "No measurements of {topic label} at {gravity} in our sources." + statement claims |
| "Test next" | Claims labelled authors' suggestion or planned at that gravity (NTRS13-006, ESA-001, LUNAR-004, PLANNED-001/002, EARTH-00x); NASA planned work listed first | claim_text + chip; empty template "No planned work at this gravity in our sources." |
| Most relevant studies | Investigations ranked by count of claims at that gravity | "{acronym}: {n} measured results, {m} simulations at {gravity}" linking to Ask filtered by investigation |
| Data table | All claims with structured values | quantity, value + unit, conditions, evidence label, chip; CSV/JSON export adds source URL, location, verbatim excerpt, review status |
| Ask section | Existing search, answer, gap card, comparison, ranked investigations | unchanged behaviour, restyled |
| Trust strip | UI copy + computed counts | "AI drafts claims from NASA documents." "Software verifies every quote word for word." "People review {n} of {m} claims." |
| Source Inspector | Claim + manifest | existing fields; "Not yet reviewed" for DRAFT |

Every chip opens the existing Source Inspector. DRAFT claims show a small "Not yet reviewed" label wherever they appear.

---

## 5. Page structure and UI (match the prototype)

Order: Top bar → Hero → See it → Measured → Detectors → Mission briefings → Data → Ask → Trust strip → Footer.

**Design tokens** (copy from the prototype's `:root`, light and dark): paper #F8FAFC, surface #FFFFFF, ink #0F172A, muted #475569, rule #CBD5E1, primary #1E3A5F (selected tabs, primary buttons, focus), gap #DC2626 (ONLY "nothing measured"), model #2563EB (ONLY computer-model evidence), plus the dark values from the prototype. Fonts: Public Sans (UI), Source Serif 4 (verbatim quotes only). No monospace except DOIs. No "A · B · C" strings.

**Evidence marks:** Measured = filled square; Computer model = dashed circle in model colour; Suggestion/statement/spec/planned/method = hollow circle; Nothing measured = red hollow circle with red text.

**See it (smoke illustration):** port the canvas code from the prototype unchanged (soft sprite-based smoke, cabin drawing, tuned physics, font scaling, reduced-motion static frame). Tested behaviour that must stay true: Earth at 0 cm/s reaches the detector within 10 s; Space Station at 0 and 8 cm/s does not. Keep the disclaimer: "Simplified illustration for intuition, not a NASA simulation or prediction. ▲ marks airflow values from NASA's published work." For Moon and Mars, the detector line adds "(illustration only, no measured data at this gravity)". The cabin geometry (vents, detector position) is illustrative; do not present it as NASA data.

**Accessibility and interaction** (from the UI UX Pro Max checklist; already in the prototype): text contrast ≥ 4.5:1 in both themes; tabs use roving tabindex with arrow, Home and End keys; skip link; chips ≥ 24 px tall and never wrap; hover and press feedback at 150–200 ms; reduced motion respected; no horizontal scroll at 375 px; focus never hidden by the sticky bar.

---

## 6. Remove

- Old gravity ladder, old Key findings cards, "Why it matters" line, the "Corpus v1 · …" status string in the top bar
- "Habitat relevance: Not assessed" everywhere
- The coverage table and flight-vs-ground table from the main page (keep them inside Ask, collapsed behind "Show all evidence by topic")
- Metadata-only investigations beyond 5 (show "Show N more")
- Any hardcoded factual sentence in components (replace with claim bindings)
- Any team inference text on the main page

## 7. Keep

Source Inspector, search and demo questions, gap card, exports, `?q=` deep links, dark theme, all existing tests, verify-corpus, docs/sources.md generation.

---

## 8. Phases (each: tests → commit → push → deploy → report the live URL)

- **A** Corpus additions and figures (Section 3)
- **B** Tokens, top bar, hero, trust strip, footer; move existing search into Ask; remove Section 6 items. Site must work end to end.
- **C** See it: canvas, tabs, slider markers, panel, NASA figure toggle
- **D** Measured (numbers + chart) and Detectors (chart + suggestion)
- **E** Mission briefings (tabs, four columns, most relevant studies) and Data table with exports

Cut order if short on time: E's "Most relevant studies" → D's detector chart → E's data table. Never cut C, the mission tabs, the Inspector, or Rule 1.

---

## 9. Acceptance checks (automated where possible)

- **Binding test:** every chip ID on the page exists in claims.json; every sentence next to a chip equals that claim's `claim_text`; every big number equals a verified structured value; no component file contains a hardcoded number with a unit (lint rule: grep for `\d+\s?(nm|µm|cm/s|%)` outside corpus files).
- Hero lede coverage test: Measured at microgravity, Simulated only at lunar, Nothing measured at Mars, all computed.
- Canvas behaviour test (Earth reaches detector; Space Station does not).
- Gap colour used only on "nothing measured" elements.
- 1440×900 and 375×812: no horizontal scroll, zero console errors, axe zero serious/critical, keyboard-only flow works, dark mode checked separately.
- The three demo questions still work in Ask; the lunar question still returns the gap card.
- CSV/JSON rows match the Data table.

## 10. Demo path (30 seconds)

1. Hero question.
2. See it: Earth (detector turns red) → Space Station (smoke stays near the source) → "Show NASA's own cabin simulation".
3. Measured: "Twice" + NASA chart.
4. Detectors chart + authors' suggestion.
5. Missions → Moon base: "Simulated only. Nobody has measured it. Test next."
6. Click any chip: the verbatim NASA quote and "Not yet reviewed" or reviewer.
