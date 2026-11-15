"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  byClaim, claims, comparisonRows, coverage, coverageColumns, crossGravity, demoQueries, evidenceGap, gravityEvidence, gravityLabels, gravityStatus, gravityStops, investigations, investigationName, metadataHeading,
  platformLabels, relatedHeading, search, sources, spiceHeading, statusLabel, statusLabels, type Claim, type GravityStop,
} from "../lib/evidence";
import { citation, evidenceBrief, evidenceCsv, evidenceJson } from "../lib/export";
import { Glossary, Input, Sheet, Toggle } from "./ui";

type OpenClaim = (claim: Claim) => void;
type Result = ReturnType<typeof search>["rankings"][number];

function Mark({ claim }: { claim: Claim }) {
  return <span className="evidence-label"><span aria-hidden="true" className={`mark ${claim.claim_status.toLowerCase()}`} />{statusLabel(claim)}</span>;
}

function CoverageMap({ gravity, filter, open }: {
  gravity: Claim["gravity_level"][];
  filter: GravityStop | null;
  open: (claims: Claim[]) => void;
}) {
  const cellContents = (cell: typeof coverage[number]["cells"][number]) => {
    if (!cell.claims.length) return <span className="small">No evidence in corpus</span>;
    const groups = new Map<Claim["claim_status"], Claim[]>();
    for (const claim of cell.claims) {
      const evidence = groups.get(claim.claim_status) ?? [];
      evidence.push(claim);
      groups.set(claim.claim_status, evidence);
    }
    return <>
      <ul className="coverage-marks">{[...groups].map(([status, evidence]) => {
        const reviewed = evidence.filter(item => item.review.status === "HUMAN_REVIEWED").length;
        return <li key={status}><button type="button" className="coverage-button" onClick={() => open(evidence)}>
          <span className="evidence-label">
            <span aria-hidden="true" className={`mark ${status.toLowerCase()}`} />
            {statusLabels[status]} · {evidence.length} ({reviewed} reviewed)
          </span>
        </button></li>;
      })}</ul>
      {!groups.has("REPORTED_RESULT") && <p className="coverage-measurement small muted">No measurement in corpus</p>}
    </>;
  };
  const cellClass = (cell: typeof coverage[number]["cells"][number]) =>
    `${cell.claims.length ? "" : "hatched"} ${gravity.some(value => value === cell.id) ? "condition-active" : ""}`;
  const columns = coverageColumns.filter(column => !filter || column.id === filter);
  const visibleCells = (row: typeof coverage[number]) => row.cells.filter(cell => !filter || cell.id === filter);
  return <section className="section" aria-labelledby="coverage-heading">
    <div className="section-title"><h2 id="coverage-heading">Gravity coverage map</h2></div>
    <p className="muted small coverage-note">Hatching marks conditions with no evidence in the corpus. The computer model column covers studies spanning multiple gravity levels.</p>
    <table className="coverage-table">
      <thead><tr><th scope="col">Evidence topic</th>{columns.map(column =>
        <th scope="col" key={column.id} className={gravity.some(value => value === column.id) ? "condition-active" : ""}>{column.label}</th>)}</tr></thead>
      <tbody>{coverage.map(row => <tr key={row.topic}><th scope="row">{row.label}</th>
        {visibleCells(row).map(cell => <td key={cell.id} className={cellClass(cell)} data-topic={row.topic} data-gravity={cell.id}>{cellContents(cell)}</td>)}</tr>)}</tbody>
    </table>
    <div className="coverage-stack">{coverage.map(row => <section key={row.topic}><h3>{row.label}</h3>
      <dl>{visibleCells(row).map(cell => <div className={cellClass(cell)} key={cell.id} data-topic={row.topic} data-gravity={cell.id}><dt>{cell.label}</dt><dd>{cellContents(cell)}</dd></div>)}</dl>
    </section>)}</div>
  </section>;
}

function GravityLadder({ selected, onSelect, open }: {
  selected: GravityStop | null;
  onSelect: (gravity: GravityStop | null) => void;
  open: OpenClaim;
}) {
  return <section className="ladder-section" aria-labelledby="gravity-heading">
    <div className="section-title">
      <h2 id="gravity-heading">Explore by gravity</h2>
      <button type="button" className="text-button" aria-pressed={!selected} onClick={() => onSelect(null)}>Show all</button>
    </div>
    <div className="ladder-ruler" aria-hidden="true">
      {gravityStops.map(stop => <span className="ladder-tick" key={stop.id} style={{ left: `${stop.position}%` }}>
        <span className="mono">{stop.position === 0 ? "0g" : stop.value}</span>
      </span>)}
    </div>
    <div className="ladder-stops" role="group" aria-label="Filter evidence by gravity">
      {gravityStops.map(stop => <button type="button" key={stop.id} className="ladder-stop" aria-pressed={selected === stop.id}
        onClick={() => onSelect(selected === stop.id ? null : stop.id)}>
        <strong>{stop.name}</strong><span className="mono small">{stop.value}</span>
        <span className="ladder-status">{gravityStatus(gravityEvidence(stop.id))}</span>
      </button>)}
    </div>
    <p className="small muted ladder-note">Choose a stop to filter the evidence below.</p>
    <div className="ladder-references small muted">
      <span>Scale references <Chip claim={byClaim.get("LUNAR-001")!} open={open} /> <Chip claim={byClaim.get("ESA-001")!} open={open} /></span>
      {claims.filter(claim => claim.gravity_level === "unspecified" && claim.claim_status === "OBJECTIVE_OR_HYPOTHESIS"
        && statusLabel(claim).startsWith("Planned")).map(claim =>
        <span key={claim.claim_id}>{statusLabel(claim)} <Chip claim={claim} open={open} /></span>)}
    </div>
  </section>;
}

const findingGroups = [
  { title: "Particle sizes across gravity levels", ids: ["NTRS13-004"] },
  { title: "Ground and flight comparison", ids: ["NTRS13-002"] },
  { title: "The Moon", ids: ["LUNAR-001", "ESA-001"] },
];

function Findings({ open }: { open: OpenClaim }) {
  const suggestion = byClaim.get("NTRS13-006")!;
  return <section className="section" aria-labelledby="findings-heading">
    <div className="section-title"><h2 id="findings-heading">Key findings</h2></div>
    <div className="finding-grid">{findingGroups.map(({ title, ids }) => <article className="finding" key={title}>
      <h3>{title}</h3>
      {ids.map(id => {
        const claim = byClaim.get(id)!;
        const reviewed = claim.review.status === "HUMAN_REVIEWED";
        return <div className="finding-item" key={id}>
          <div className="claim-meta">{reviewed ? <Mark claim={claim} /> : "Not yet reviewed"}</div>
          <p>{reviewed ? claim.claim_text : "Open the claim to see the source excerpt."} <Chip claim={claim} open={open} /></p>
          <a className="small" href={claim.source_url} target="_blank" rel="noreferrer">{sources.get(claim.source_id)?.title}</a>
        </div>;
      })}
    </article>)}</div>
    <p className="findings-note"><strong>Why it matters</strong> <span className="small muted">· {statusLabel(suggestion)}</span><br />
      {suggestion.claim_text} <Chip claim={suggestion} open={open} />
    </p>
  </section>;
}

function GravityResults({ gravity, open }: { gravity: GravityStop; open: OpenClaim }) {
  const evidence = gravityEvidence(gravity);
  const related = evidence.filter(claim => !claim.investigation_id);
  const linked = evidence.filter(claim => claim.investigation_id);
  const stop = gravityStops.find(item => item.id === gravity)!;
  return <section className="section" aria-labelledby="filtered-gravity">
    <div className="section-title"><h2 id="filtered-gravity">{stop.name} evidence</h2></div>
    {evidence.length === 0 && <p>Nothing in our sources at this gravity.</p>}
    {linked.length > 0 && <ul className="claim-list">{linked.map(claim => <ClaimLine key={claim.claim_id} claim={claim} open={open} details />)}</ul>}
    {related.length > 0 && <div className={linked.length ? "related" : undefined}>
      <h3>{relatedHeading}</h3>
      <ul className="claim-list">{related.map(claim => <ClaimLine key={claim.claim_id} claim={claim} open={open} details />)}</ul>
    </div>}
  </section>;
}

function Comparison({ open }: { open: OpenClaim }) {
  const cell = (entries: Claim[]) => entries.length
    ? <ul className="comparison-claims">{entries.map(claim => <ClaimLine claim={claim} open={open} key={claim.claim_id} />)}</ul>
    : <span className="small muted">Not reported in corpus</span>;
  return <section className="section" aria-labelledby="comparison-heading">
    <div className="section-title"><h2 id="comparison-heading">Flight vs ground comparison</h2></div>
    <div className="comparison-scroll" tabIndex={0} role="region" aria-label="Flight and ground evidence table">
      <table className="comparison-table">
        <thead><tr><th scope="col">Evidence</th><th scope="col">ISS flight · Microgravity</th><th scope="col">Ground lab · 1g</th></tr></thead>
        <tbody>{comparisonRows.map(row =>
          <tr key={row.label}><th scope="row">{row.label}</th><td>{cell(row.flight)}</td><td>{cell(row.ground)}</td></tr>)}</tbody>
      </table>
    </div>
    <div className="related"><h3>{relatedHeading}</h3><ul className="claim-list cross-gravity">
      {crossGravity.map(claim => <ClaimLine key={claim.claim_id} claim={claim} open={open} details />)}
    </ul></div>
  </section>;
}

export function Chip({ claim, open }: { claim: Claim; open: OpenClaim }) {
  return <button type="button" className="claim-chip mono" onClick={() => open(claim)} aria-label={`Inspect ${claim.claim_id}`}>{claim.claim_id}</button>;
}

export function ClaimLine({ claim, open, details }: { claim: Claim; open: OpenClaim; details?: boolean }) {
  return <li className="claim-line">
    <div className="claim-meta"><Mark claim={claim} />{details && <span>{platformLabels[claim.platform]} · {gravityLabels[claim.gravity_level]}</span>}
      {claim.review.status === "DRAFT" && <span className="review-label">Not yet reviewed</span>}</div>
    <p>{claim.claim_text} <Chip claim={claim} open={open} /></p>
    {details && claim.conditions && <p className="small muted">{claim.conditions}</p>}
    {details && claim.claim_id === "NTRS13-004" && <p className="small muted">Low gravity and normal gravity · Results varied by material</p>}
  </li>;
}

function Results({ title, results, active, open, track, children }: {
  title: string; results: Result[]; active: number; open: OpenClaim; track: (id: string) => number; children?: ReactNode;
}) {
  if (!results.length) return null;
  return <section className="result-group"><h3>{title}</h3>{children}
    <ol className="result-list">{results.map(result => {
      const { item, allClaims } = result;
      const index = track(item.investigation_id);
      const first = result.support[0]?.item ?? allClaims[0];
      const counts = Object.entries(statusLabels).flatMap(([status, label]) => {
        const count = allClaims.filter(claim => claim.claim_status === status).length;
        return count ? [`${count} ${label.toLowerCase()}`] : [];
      });
      const byField = new Map<string, Set<string>>();
      for (const match of result.matches) {
        const terms = byField.get(match.field) ?? new Set<string>();
        match.terms.forEach(term => terms.add(term));
        byField.set(match.field, terms);
      }
      return <li className={`result ${index === active ? "active-result" : ""}`} key={item.investigation_id}>
        <span className="small mono muted">{item.investigation_id}</span>
        <h4>{first ? <button type="button" onClick={() => open(first)}>{investigationName(item)}</button>
          : <a href={sources.get(item.source_id)?.url}>{investigationName(item)}</a>}</h4>
        {investigationName(item) !== item.title && <p className="muted">{item.title}</p>}
        <p className="small"><strong>Matched</strong> {[...byField].map(([field, terms]) => `${field.toLowerCase()} · ${[...terms].join(", ")}`).join(" / ") || "smoke research"}</p>
        <p className="small muted">{counts.join(" · ") || "Metadata only"} · Habitat relevance: Not assessed</p>
      </li>;
    })}</ol>
  </section>;
}

const latest = [...sources.values()].reduce((date, source) => source.retrieved_at > date ? source.retrieved_at : date, "");
const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const reviewedCount = claims.filter(claim => claim.review.status === "HUMAN_REVIEWED").length;
const investigationsWithEvidence = new Set(claims.flatMap(claim => claim.investigation_id ? [claim.investigation_id] : [])).size;

export function FireLens({ available }: { available: string[] }) {
  const [query, setQuery] = useState("");
  const [gravityFilter, setGravityFilter] = useState<GravityStop | null>(null);
  const [selected, setSelected] = useState<Claim | null>(null);
  const [coverageGroup, setCoverageGroup] = useState<Claim[]>([]);
  const [dark, setDark] = useState(false);
  const [active, setActive] = useState(-1);
  const [notice, setNotice] = useState("");
  const [citationNotice, setCitationNotice] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  const result = useMemo(() => search(query), [query]);
  const hasQuery = Boolean(query.trim());
  const ordered = [...result.main, ...result.spice, ...result.metadata];
  function open(claim: Claim, group: Claim[] = []) {
    origin.current = document.activeElement instanceof HTMLElement ? document.activeElement : input.current;
    setCitationNotice("");
    setSelected(claim);
    setCoverageGroup(group);
  }
  const selectedSource = selected && sources.get(selected.source_id);
  const changeQuery = (value: string) => { setQuery(value); setGravityFilter(null); setActive(-1); setNotice(""); };

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q");
    if (initial) {
      // Set after hydration so a static export can still accept shared query URLs.
      const timer = window.setTimeout(() => setQuery(initial), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (event.key !== "/" || selected || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof HTMLElement && event.target.matches("input, textarea, [contenteditable]")) return;
      event.preventDefault();
      input.current?.focus();
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [selected]);

  useEffect(() => {
    document.querySelector(".active-result")?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const conditions = [...result.query.gravity.map(value => gravityLabels[value]), ...result.query.platform.map(value => platformLabels[value]),
    result.query.quantity, result.query.atmosphere ? "Oxygen or pressure" : null].filter(Boolean);
  const gap = evidenceGap(result);
  const answer = gap ? [] : result.direct.filter(claim => claim.investigation_id !== null);
  const related = gap ? [] : [...result.direct.filter(claim => claim.investigation_id === null), ...result.related];
  const shown = [...answer, ...related, ...(gap ? [...gap.context, ...gap.related] : [])];
  const exportClaims = [...new Map([
    ...shown, ...(result.followup ? comparisonRows.flatMap(row => [...row.flight, ...row.ground]) : []),
  ].map(claim => [claim.claim_id, claim])).values()];
  const answerSources = [...new Map(exportClaims.map(claim => [claim.source_id, claim])).values()];
  const gapSummary = gap ? `${gap.text} ${gap.scope}.` : undefined;
  async function copy(text: string, label: string, feedback: (message: string) => void) {
    try {
      await navigator.clipboard.writeText(text);
      feedback(`${label} copied.`);
    } catch {
      feedback("Clipboard unavailable.");
    }
  }
  function download(format: "csv" | "json") {
    const data = (format === "csv" ? evidenceCsv : evidenceJson)(query, exportClaims, gapSummary);
    const url = URL.createObjectURL(new Blob([data], { type: format === "csv" ? "text/csv;charset=utf-8" : "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `firelens-evidence.${format}`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`Evidence exported as ${format.toUpperCase()}.`);
  }

  return <div className="firelens" data-theme={dark ? "dark" : "light"}>
    <header className="topbar"><div className="top-inner">
      <div className="brand"><a href="./">FireLens</a><span>Built on NASA PSI open data</span></div>
      <div className="top-actions"><span className="corpus-status mono">Corpus v1 · {claims.length} claims · {reviewedCount} human-reviewed · {investigationsWithEvidence} investigations with evidence · {investigations.length} indexed · retrieved {dateFormatter.format(new Date(latest))}</span>
        <Toggle pressed={dark} onPressedChange={setDark} aria-label="Dark theme">{dark ? "Light" : "Dark"}</Toggle></div>
    </div></header>
    <main className="page">
      <section className="hero" aria-labelledby="hero-heading">
        <h1 id="hero-heading">How does fire behave away from Earth?</h1>
        <p>What do we actually know about smoke and fire in the gravity of the Moon and Mars?</p>
      </section>
      <GravityLadder selected={gravityFilter} open={open} onSelect={gravity => {
        setGravityFilter(gravity);
        if (gravity) { setQuery(""); setActive(-1); setNotice(""); }
      }} />
      <section className="query-section" aria-labelledby="query-heading">
        <p className="eyebrow">NASA PSI · Combustion science</p>
        <h1 id="query-heading">Fire evidence in reduced gravity</h1>
        <label className="sr-only" htmlFor="evidence-query">Search the corpus</label>
        <div className="query-wrap"><Input id="evidence-query" ref={input} type="search" value={query}
          placeholder="Search experiments, measurements, or conditions" onChange={event => changeQuery(event.target.value)}
          onKeyDown={event => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              if (!ordered.length) return;
              event.preventDefault();
              const step = event.key === "ArrowDown" ? 1 : -1;
              const next = active < 0 ? (step === 1 ? 0 : ordered.length - 1) : (active + step + ordered.length) % ordered.length;
              setActive(next);
            }
            if (event.key === "Enter" && ordered.length) {
              event.preventDefault();
              const hit = ordered[active < 0 ? 0 : active];
              const claim = hit.support[0]?.item ?? hit.allClaims[0];
              if (claim) open(claim);
              else { const url = sources.get(hit.item.source_id)?.url; if (url) window.location.assign(url); }
            }
          }} /><kbd aria-hidden="true">/</kbd></div>
        <div className="query-examples"><span className="muted">Try:</span>{demoQueries.map(example =>
          <a href={`?q=${encodeURIComponent(example)}`} key={example} onClick={event => { event.preventDefault(); changeQuery(example); }}>{example}</a>)}</div>
        <p className="sr-only" aria-live="polite">{active >= 0 && ordered[active] ? investigationName(ordered[active].item) : conditions.join(", ")}</p>
      </section>
      {!hasQuery && !gravityFilter && <Findings open={open} />}
      {gravityFilter && <GravityResults gravity={gravityFilter} open={open} />}
      {hasQuery && <section className="section" aria-labelledby="answer-heading">
        <div className="section-title"><h2 id="answer-heading">Evidence answer</h2>{conditions.length > 0 && <span className="small muted">Conditions · {conditions.join(" · ")}</span>}</div>
        {gap && <div className="gap-card" aria-labelledby="gap-heading">
          <h3 id="gap-heading">Evidence gap</h3>
          <p><strong>{gap.text}</strong></p><p className="small muted">{gap.scope}</p>
          <h4>Nearest evidence</h4>
          <ul className="claim-list">{gap.context.map(claim => <ClaimLine claim={claim} open={open} details key={claim.claim_id} />)}</ul>
          {gap.related.length > 0 && <div className="related"><h4>{relatedHeading}</h4>
            <ul className="claim-list">{gap.related.map(claim => <ClaimLine claim={claim} open={open} details key={claim.claim_id} />)}</ul>
          </div>}
        </div>}
        {answer.length > 0 && <ul className="claim-list">{answer.map(claim => <ClaimLine claim={claim} open={open} details key={claim.claim_id} />)}</ul>}
        {related.length > 0 && <div className="related"><h3>{relatedHeading}</h3>
          <ul className="claim-list">{related.map(claim => <ClaimLine claim={claim} open={open} details key={claim.claim_id} />)}</ul></div>}
        {!shown.length && <p className="empty">No match in corpus. Try smoke particle size, detector response, or soot emission.</p>}
        {exportClaims.length > 0 && <div className="evidence-actions" role="group" aria-label="Share evidence">
          <button type="button" className="text-button" onClick={() => copy(evidenceBrief(query, exportClaims, gapSummary), "Evidence brief", setNotice)}>Copy evidence brief</button>
          <button type="button" className="text-button" onClick={() => download("csv")}>Export evidence (CSV)</button>
          <button type="button" className="text-button" onClick={() => download("json")}>Export evidence (JSON)</button>
          <span className="small muted" role="status">{notice}</span>
        </div>}
        {answerSources.length > 0 && <div className="answer-sources"><h3>Sources</h3><ul>{answerSources.map(claim =>
          <li key={claim.source_id}><button type="button" className="link-button" onClick={() => open(claim)}>{sources.get(claim.source_id)?.title}</button></li>)}</ul></div>}
      </section>}
      <CoverageMap gravity={gravityFilter ? [gravityFilter] : result.query.gravity} filter={gravityFilter} open={group => {
        open(group.find(claim => claim.review.status === "HUMAN_REVIEWED") ?? group[0], group);
      }} />
      {result.followup && <Comparison open={open} />}
      {hasQuery && ordered.length > 0 && <section className="section" aria-labelledby="ranking-heading">
        <div className="section-title"><h2 id="ranking-heading">Ranked investigations</h2></div>
        <Results title={result.smokeIntent ? "Smoke aerosol and detection" : "Investigations with claims"} results={result.main} active={active} open={open} track={id => ordered.findIndex(hit => hit.item.investigation_id === id)} />
        <Results title={result.smokeIntent ? spiceHeading : "Flame soot onset"} results={result.spice} active={active} open={open} track={id => ordered.findIndex(hit => hit.item.investigation_id === id)}>
          <p className="muted">SPICE uses smoke point for the onset of soot emission from a flame. <Chip claim={byClaim.get("SPICE-002")!} open={open} /></p>
        </Results>
        <Results title={metadataHeading} results={result.metadata} active={active} open={open} track={id => ordered.findIndex(hit => hit.item.investigation_id === id)} />
      </section>}
      <section className="section" aria-labelledby="how-heading">
        <div className="section-title"><h2 id="how-heading">How FireLens works</h2></div>
        <ol className="process-strip">
          <li><strong>Save the source</strong><p>Save original NASA documents and record a digital fingerprint for each file.</p></li>
          <li><strong>Check the quote</strong><p>Link each claim to an exact quote and check it automatically.</p></li>
          <li><strong>Read the answer</strong><p>See what was measured, modeled, or remains unknown in our sources.</p></li>
        </ol>
      </section>
      <footer className="read-note"><Glossary /><strong>How to read the evidence</strong><p>Serif text quotes the source. Sans-serif text is FireLens’s wording.</p></footer>
    </main>
    <Sheet open={selected !== null} onClose={() => setSelected(null)} onRestore={() => origin.current?.focus()}>
      {selected && selectedSource && <>
        {coverageGroup.length > 1 && <div className="evidence-actions" role="group" aria-label="Claims in this coverage cell">
          {coverageGroup.map(claim => <button key={claim.claim_id} className="claim-chip mono" type="button"
            aria-pressed={selected.claim_id === claim.claim_id}
            onClick={() => { setCitationNotice(""); setSelected(claim); }}>{claim.claim_id}</button>)}
        </div>}
        <p className="eyebrow mono">{selected.claim_id} · {selectedSource.publisher}</p>
        <h3 className="source-title">{selectedSource.title}</h3>
        <div className="claim-meta"><Mark claim={selected} />{selected.review.status === "DRAFT" && <span className="review-label">Not yet reviewed</span>}</div>
        <blockquote>{selected.source_excerpt}</blockquote>
        <p>{selected.claim_text}</p>
        {selected.attribution_note && <p className="small muted">{selected.attribution_note}</p>}
        <dl className="source-details">
          <dt>Location</dt><dd>{selected.source_location}</dd>
          <dt>DOI</dt><dd className="mono">{selected.doi ?? "Not listed"}</dd>
          <dt>Retrieved</dt><dd>{dateFormatter.format(new Date(selectedSource.retrieved_at))}</dd>
          <dt>Platform</dt><dd>{platformLabels[selected.platform]} · {gravityLabels[selected.gravity_level]}</dd>
          <dt>Snapshot</dt><dd>{available.includes(selected.source_id) ? "Excerpt verified" : "Local-only snapshot unavailable for verification"}</dd>
          <dt>Access</dt><dd>{selectedSource.access_note}</dd>
        </dl>
        <div className="evidence-actions">
          <a href={selected.source_url} target="_blank" rel="noreferrer">Open source</a>
          <button type="button" className="text-button" onClick={() => copy(citation(selected), "Citation", setCitationNotice)}>Copy citation</button>
        </div>
        <p className="small muted" role="status">{citationNotice}</p>
      </>}
    </Sheet>
  </div>;
}
