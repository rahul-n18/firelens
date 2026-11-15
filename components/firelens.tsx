"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  claims, comparisonRows, coverage, coverageColumns, crossGravity, demoQueries, evidenceGap, gravityLabels, heroCoverage, investigationName, investigations, isMeasurement, metadataHeading,
  platformLabels, relatedHeading, search, sources, spiceHeading, statusLabels, type Claim, type ClaimFilter, type GravityStop,
} from "../lib/evidence";
import { citation, downloadEvidence, evidenceBrief, evidenceCsv, evidenceJson } from "../lib/export";
import { Input, Sheet, Toggle } from "./ui";

import { ClaimLine, DraftLabel, Mark, type OpenClaim } from "./evidence-ui";
import { claimKind } from "../lib/claim-kind";
import { Detectors, Measurements } from "./measurements";
import { SeeIt } from "./see-it";
import { Missions } from "./missions";
import { ModelData } from "./model-data";
import { Explorer } from "./explorer";
const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

type Result = ReturnType<typeof search>["rankings"][number];

function CoverageMap({ gravity, permitted, open }: {
  gravity: Claim["gravity_level"][];
  permitted: ClaimFilter;
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
      {!cell.claims.some(isMeasurement) && <p className="coverage-measurement small muted">No measurement in corpus</p>}
    </>;
  };
  const cellClass = (cell: typeof coverage[number]["cells"][number]) =>
    `${cell.claims.length ? "" : "hatched"} ${gravity.some(value => value === cell.id) ? "condition-active" : ""}`;
  const visibleCells = (row: typeof coverage[number]) => row.cells.map(cell => ({
    ...cell, claims: cell.claims.filter(permitted),
  }));
  return <section className="section" aria-labelledby="coverage-heading">
    <div className="section-title"><h2 id="coverage-heading">All evidence by topic</h2></div>
    <p className="muted small coverage-note">Hatching marks conditions with no evidence in the corpus. The computer model column covers studies spanning multiple gravity levels.</p>
    <table className="coverage-table">
      <thead><tr><th scope="col">Evidence topic</th>{coverageColumns.map(column =>
        <th scope="col" key={column.id} className={gravity.some(value => value === column.id) ? "condition-active" : ""}>{column.label}</th>)}</tr></thead>
      <tbody>{coverage.map(row => <tr key={row.topic}><th scope="row">{row.label}</th>
        {visibleCells(row).map(cell => <td key={cell.id} className={cellClass(cell)} data-topic={row.topic} data-gravity={cell.id}>{cellContents(cell)}</td>)}</tr>)}</tbody>
    </table>
    <div className="coverage-stack">{coverage.map(row => <section key={row.topic}><h3>{row.label}</h3>
      <dl>{visibleCells(row).map(cell => <div className={cellClass(cell)} key={cell.id} data-topic={row.topic} data-gravity={cell.id}><dt>{cell.label}</dt><dd>{cellContents(cell)}</dd></div>)}</dl>
    </section>)}</div>
  </section>;
}

function Comparison({ open, permitted }: { open: OpenClaim; permitted: ClaimFilter }) {
  const cell = (claims: Claim[]) => {
    const entries = claims.filter(permitted);
    return entries.length
      ? <ul className="comparison-claims">{entries.map(claim => <ClaimLine claim={claim} open={open} key={claim.claim_id} />)}</ul>
      : <span className="small muted">Not reported in corpus</span>;
  };
  return <section className="section" aria-labelledby="comparison-heading">
    <div className="section-title"><h2 id="comparison-heading">Flight vs ground comparison</h2></div>
    <div className="comparison-scroll" tabIndex={0} role="region" aria-label="Flight and ground evidence table">
      <table className="comparison-table">
        <thead><tr><th scope="col">Evidence</th><th scope="col">ISS flight, Microgravity</th><th scope="col">Ground lab, 1g</th></tr></thead>
        <tbody>{comparisonRows.map(row =>
          <tr key={row.label}><th scope="row">{row.label}</th><td>{cell(row.flight)}</td><td>{cell(row.ground)}</td></tr>)}</tbody>
      </table>
    </div>
    <div className="related"><h3>{relatedHeading}</h3><ul className="claim-list cross-gravity">
      {crossGravity.filter(permitted).map(claim => <ClaimLine key={claim.claim_id} claim={claim} open={open} details />)}
    </ul></div>
  </section>;
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
        <span className="small muted">{item.investigation_id}</span>
        <h4>{first ? <button type="button" onClick={() => open(first)}>{investigationName(item)}</button>
          : <a href={sources.get(item.source_id)?.url}>{investigationName(item)}</a>}</h4>
        {investigationName(item) !== item.title && <p className="muted">{item.title}</p>}
        <p className="small"><strong>Matched</strong> {[...byField].map(([field, terms]) => `${field.toLowerCase()} (${[...terms].join(", ")})`).join(" / ") || "smoke research"}</p>
        <p className="small muted">{counts.join(", ") || "Metadata only"}</p>
      </li>;
    })}</ol>
  </section>;
}

export function FireLens({ available }: { available: string[] }) {
  const [query, setQuery] = useState("");
  const [investigationId, setInvestigationId] = useState<string>();
  const [missionGravity, setMissionGravity] = useState<GravityStop>("microgravity");
  const [showMetadata, setShowMetadata] = useState(false);
  const [selected, setSelected] = useState<Claim | null>(null);
  const [coverageGroup, setCoverageGroup] = useState<Claim[]>([]);
  const [dark, setDark] = useState(false);
  const [active, setActive] = useState(-1);
  const [notice, setNotice] = useState("");
  const [citationNotice, setCitationNotice] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  const [evidence, permitted] = useMemo(() => {
    const verifiedSources = new Set(available);
    const matches: ClaimFilter = claim => verifiedSources.has(claim.source_id) && claim.claim_status !== "TEAM_INFERENCE";
    return [claims.filter(matches), matches] as const;
  }, [available]);
  const byId = useMemo(() => new Map(evidence.map(claim => [claim.claim_id, claim])), [evidence]);
  const coverageAt = heroCoverage(evidence);
  const coverageCopy = [
    coverageAt.orbit === "Measured" ? "measurements in orbit" : "gaps in orbit",
    coverageAt.moon === "Simulated only" ? "what has only been simulated for smoke on the Moon" : coverageAt.moon === "Measured" ? "smoke measurements for the Moon" : "gaps in our smoke evidence for the Moon",
    coverageAt.mars === "Nothing measured" ? "what’s missing for Mars" : coverageAt.mars === "Measured" ? "measurements for Mars" : "simulations for Mars",
  ];
  const reviewedCount = evidence.filter(claim => claim.review.status === "HUMAN_REVIEWED").length;
  const investigation = investigations.find(study => study.investigation_id === investigationId);
  const searchText = query.trim() || investigation?.title || "";
  const result = useMemo(() => search(searchText, permitted, investigationId), [permitted, searchText, investigationId]);
  const hasQuery = Boolean(searchText);
  const metadata = showMetadata ? result.metadata : result.metadata.slice(0, 5);
  const hiddenMetadata = result.metadata.length - metadata.length;
  const ordered = [...result.main, ...result.spice, ...metadata];
  const spiceMethod = byId.get("SPICE-002");
  function open(claim: Claim, group: Claim[] = []) {
    origin.current = document.activeElement instanceof HTMLElement ? document.activeElement : input.current;
    setCitationNotice("");
    setSelected(claim);
    setCoverageGroup(group);
  }
  const selectedSource = selected && sources.get(selected.source_id);
  const changeQuery = (value: string) => { setQuery(value); setShowMetadata(false); setActive(-1); setNotice(""); };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("q");
    const scope = investigations.find(study => study.investigation_id === params.get("investigation"));
    if (!initial && !scope) return;
    // Set after hydration so the static export accepts shareable links.
    const timer = window.setTimeout(() => {
      if (initial) setQuery(initial);
      if (scope) setInvestigationId(scope.investigation_id);
    }, 0);
    return () => window.clearTimeout(timer);
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
  const gap = evidenceGap(result, claim => permitted(claim) && (!investigationId || claim.investigation_id === investigationId), available.length);
  const answer = gap ? [] : result.direct.filter(claim => claim.investigation_id !== null);
  const related = gap ? [] : [...result.direct.filter(claim => claim.investigation_id === null), ...result.related];
  const shown = [...answer, ...related, ...(gap ? [...gap.context, ...gap.related] : [])];
  const exportClaims = [...new Map([
    ...shown, ...(result.followup ? comparisonRows.flatMap(row => [...row.flight, ...row.ground]).filter(permitted) : []),
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
    const data = format === "csv" ? evidenceCsv(searchText, exportClaims, gapSummary) : evidenceJson(searchText, exportClaims, gapSummary);
    downloadEvidence(data, format, "firelens-evidence");
    setNotice(`Evidence exported as ${format.toUpperCase()}.`);
  }

  return <div className="firelens" data-theme={dark ? "dark" : "light"}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="topbar"><div className="top-inner">
      <a className="wordmark" href="#main-content">FireLens</a>
      <nav className="page-nav" aria-label="Sections"><a href="#see">See it</a><a href="#measured">Measured</a><a href="#explore">Explore</a><a href="#missions">Missions</a><a href="#data">Data</a><a href="#ask">Ask</a></nav>
      <div className="top-actions"><span>Built on NASA PSI open data</span>
        <Toggle pressed={dark} onPressedChange={setDark} aria-label="Dark theme">{dark ? "Light" : "Dark"}</Toggle></div>
    </div></header>
    <main className="page" id="main-content" tabIndex={-1}>
      <section className="hero" aria-labelledby="hero-heading">
        <h1 id="hero-heading">Does smoke behave the same away from Earth?</h1>
        <p className="lede">Explore the evidence in our sources, from {coverageCopy[0]} to {coverageCopy[1]} and {coverageCopy[2]}.</p>
        <div className="hero-actions">
          <a className="primary-button" href="#see">See the difference</a>
          <a className="secondary-button" href="#missions">Open a mission briefing</a>
        </div>
      </section>
      <SeeIt evidence={evidence} byId={byId} open={open} dark={dark} onMoonBriefing={() => setMissionGravity("lunar_0.16g")} />
      <Measurements byId={byId} open={open} />
      <Detectors byId={byId} open={open} />
      <Explorer evidence={evidence} open={open} />
      <Missions evidence={evidence} open={open} gravity={missionGravity} onGravityChange={setMissionGravity} />
      <ModelData evidence={evidence} open={open} />
      <section className="block" id="ask" aria-labelledby="query-heading">
        <h2 className="block-title" id="query-heading">Ask your own question</h2>
        <p className="section-intro">Explore the verified evidence and see where our sources have gaps.</p>
        <div className="query-section">
          {investigation && <div className="ask-filter">
            <p>Investigation: <strong>{investigation.acronym || investigation.title}</strong></p>
            <button className="text-button" type="button" onClick={() => {
              const location = new URL(window.location.href);
              location.searchParams.delete("investigation");
              window.history.replaceState(null, "", location);
              setInvestigationId(undefined);
              setActive(-1);
              input.current?.focus();
            }}>Clear investigation filter</button>
          </div>}
          <label className="field-label" htmlFor="evidence-query">Search the corpus</label>
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
        </div>
        {hasQuery && <section className="section" aria-labelledby="answer-heading">
          <div className="section-title"><h2 id="answer-heading">Evidence answer</h2>{conditions.length > 0 && <span className="small muted">Conditions: {conditions.join(", ")}</span>}</div>
          {gap && <div className="gap-card" aria-labelledby="gap-heading">
            <h3 id="gap-heading">Evidence gap</h3>
            <p className="gap-text"><strong>{gap.text}</strong></p><p className="small muted">{gap.scope}</p>
            {gap.context.length > 0 && <><h4>Nearest evidence</h4>
            <ul className="claim-list">{gap.context.map(claim => <ClaimLine claim={claim} open={open} details key={claim.claim_id} />)}</ul></>}
            {gap.related.length > 0 && <div className="related"><h4>{relatedHeading}</h4>
              <ul className="claim-list">{gap.related.map(claim => <ClaimLine claim={claim} open={open} details key={claim.claim_id} />)}</ul>
            </div>}
          </div>}
          {answer.length > 0 && <ul className="claim-list">{answer.map(claim => <ClaimLine claim={claim} open={open} details key={claim.claim_id} />)}</ul>}
          {related.length > 0 && <div className="related"><h3>{relatedHeading}</h3>
            <ul className="claim-list">{related.map(claim => <ClaimLine claim={claim} open={open} details key={claim.claim_id} />)}</ul></div>}
          {!shown.length && <p className="empty">No match in corpus. Try smoke particle size, detector response, or soot emission.</p>}
          {exportClaims.length > 0 && <div className="evidence-actions" role="group" aria-label="Share evidence">
            <button type="button" className="text-button" onClick={() => copy(evidenceBrief(searchText, exportClaims, gapSummary), "Evidence brief", setNotice)}>Copy evidence brief</button>
            <button type="button" className="text-button" onClick={() => download("csv")}>Export evidence (CSV)</button>
            <button type="button" className="text-button" onClick={() => download("json")}>Export evidence (JSON)</button>
            <span className="small muted" role="status">{notice}</span>
          </div>}
          {answerSources.length > 0 && <div className="answer-sources"><h3>Sources</h3><ul>{answerSources.map(claim =>
            <li key={claim.source_id}><button type="button" className="link-button" onClick={() => open(claim)}>{sources.get(claim.source_id)?.title}</button></li>)}</ul></div>}
        </section>}
        <details className="evidence-details">
          <summary>Show all evidence by topic</summary>
          <CoverageMap gravity={result.query.gravity} permitted={permitted} open={group => {
            open(group.find(claim => claim.review.status === "HUMAN_REVIEWED") ?? group[0], group);
          }} />
          {result.followup && <Comparison open={open} permitted={permitted} />}
        </details>
        {hasQuery && ordered.length > 0 && <section className="section" aria-labelledby="ranking-heading">
          <div className="section-title"><h2 id="ranking-heading">Ranked investigations</h2></div>
          <Results title={result.smokeIntent ? "Smoke aerosol and detection" : "Investigations with claims"} results={result.main} active={active} open={open} track={id => ordered.findIndex(hit => hit.item.investigation_id === id)} />
          <Results title={result.smokeIntent ? spiceHeading : "Flame soot onset"} results={result.spice} active={active} open={open} track={id => ordered.findIndex(hit => hit.item.investigation_id === id)}>
            {spiceMethod && <ul className="claim-list"><ClaimLine claim={spiceMethod} open={open} /></ul>}
          </Results>
          <Results title={metadataHeading} results={metadata} active={active} open={open} track={id => ordered.findIndex(hit => hit.item.investigation_id === id)} />
          {hiddenMetadata > 0 && <button className="text-button metadata-more" type="button"
            onClick={() => setShowMetadata(true)}>Show {hiddenMetadata} more</button>}
        </section>}
      </section>
      <section className="trust" aria-label="How the evidence is checked">
        <p><strong>AI drafts</strong> claims from the source documents.</p>
        <p><strong>Software verifies</strong> every quote against the stored source.</p>
        <p><strong>People review</strong> {reviewedCount} of {evidence.length} claims.</p>
      </section>
      <footer className="read-note">
        <p>Click any claim code to see its exact quote, review status and source.</p>
        <p>Team Anantyam, NASA Space Apps Challenge.</p>
      </footer>
    </main>
    <Sheet open={selected !== null} onClose={() => setSelected(null)} onRestore={() => origin.current?.focus()}>
      {selected && selectedSource && <>
        {coverageGroup.length > 1 && <div className="evidence-actions" role="group" aria-label="Claims in this coverage cell">
          {coverageGroup.map(claim => <span className="coverage-claim-option" key={claim.claim_id}>
            <button className="claim-chip" data-claim-id={claim.claim_id} type="button" aria-pressed={selected.claim_id === claim.claim_id}
              onClick={() => { setCitationNotice(""); setSelected(claim); }}>{claim.claim_id}</button>
            <DraftLabel claim={claim} />
          </span>)}
        </div>}
        <p className="eyebrow">{selected.claim_id}, {selectedSource.publisher}</p>
        <h3 className="source-title">{selectedSource.title}</h3>
        <div className="claim-meta"><Mark claim={selected} /><span className="review-label">{selected.review.status === "DRAFT" ? "Not yet reviewed" : `Reviewed by ${selected.review.reviewer}`}</span></div>
        {claimKind(selected).notice && <p className="kind-notice">{claimKind(selected).notice}</p>}
        <blockquote data-claim-excerpt={selected.claim_id}>{selected.source_excerpt}</blockquote>
        <p data-claim-text={selected.claim_id}>{selected.claim_text}</p>
        {selected.attribution_note && <p className="small muted">{selected.attribution_note}</p>}
        <dl className="source-details">
          <dt>Location</dt><dd>{selected.source_location}</dd>
          <dt>DOI</dt><dd className="mono">{selected.doi ?? "Not listed"}</dd>
          <dt>Retrieved</dt><dd>{dateFormatter.format(new Date(selectedSource.retrieved_at))}</dd>
          <dt>Platform</dt><dd>{platformLabels[selected.platform]}, {gravityLabels[selected.gravity_level]}</dd>
          <dt>Snapshot</dt><dd>Excerpt verified</dd>
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
