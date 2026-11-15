"use client";

import Image from "next/image";
import { Tabs } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import { illustrateCabin } from "../lib/cabin-illustration";
import { gravityEvidence, gravityStatus, isMeasurement, sources, type Claim, type GravityStop } from "../lib/evidence";
import { Chip, ClaimLine, DraftLabel, type OpenClaim } from "./evidence-ui";

const gravityOptions = [
  { id: "1g", label: "Earth", coefficient: 1 },
  { id: "mars_0.38g", label: "Mars", coefficient: .38 },
  { id: "lunar_0.16g", label: "Moon", coefficient: .16 },
  { id: "microgravity", label: "Space Station", coefficient: 0 },
] as const;

function evidenceOrder(claim: Claim) {
  if (isMeasurement(claim)) return 0;
  if (claim.claim_status === "MODEL_RESULT") return 1;
  return 2;
}

export function SeeIt({ evidence, byId, open, dark }: {
  evidence: Claim[];
  byId: ReadonlyMap<string, Claim>;
  open: OpenClaim;
  dark: boolean;
}) {
  const [gravity, setGravity] = useState<GravityStop>("1g");
  const [airflow, setAirflow] = useState(0);
  const [reached, setReached] = useState(false);
  const [showFigure, setShowFigure] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const active = gravityOptions.find(option => option.id === gravity)!;
  const local = gravityEvidence(gravity, evidence);
  const status = gravityStatus(local);
  const rows = local.sort((a, b) => evidenceOrder(a) - evidenceOrder(b)).slice(0, 3);
  const nearby = gravityOptions
    .filter(option => option.id !== gravity && gravityStatus(gravityEvidence(option.id, evidence)) !== "Nothing measured")
    .sort((a, b) => Math.abs(a.coefficient - active.coefficient) - Math.abs(b.coefficient - active.coefficient))
    .slice(0, 2).map(option => option.label);
  const markers = evidence
    .filter(claim => claim.airflow?.gravity_level === gravity && (isMeasurement(claim) || claim.claim_status === "MODEL_RESULT"))
    .sort((a, b) => a.airflow!.value - b.airflow!.value);
  const maxAirflow = Math.max(10, ...markers.map(claim => claim.airflow!.value));
  const particleSize = gravity === "microgravity" ? byId.get("NTRS13-004") : undefined;
  const simulation = byId.get("NTRS13-010");
  const simulationSource = simulation && sources.get(simulation.source_id);
  const figure = simulationSource?.derived_assets?.find(asset => asset.slide === 3);
  const canShowFigure = (gravity === "1g" || gravity === "microgravity") && simulation && simulationSource && figure;
  const noMeasuredInput = (gravity === "mars_0.38g" || gravity === "lunar_0.16g") && status !== "Measured";

  useEffect(() => {
    if (canvas.current) return illustrateCabin(canvas.current, active.coefficient, airflow, Boolean(particleSize), setReached);
    // Redraw a reduced-motion canvas when its computed theme colors change.
  }, [active.coefficient, airflow, dark, particleSize]);

  return <section className="block" id="see" aria-labelledby="see-heading">
    <h2 className="block-title" id="see-heading">See what gravity does to smoke</h2>
    <p className="section-intro">Choose a gravity level, adjust the airflow, and watch the detector.</p>
    <Tabs.Root value={gravity} orientation="horizontal" onValueChange={value => {
      setGravity(value as GravityStop);
      setShowFigure(false);
    }}>
      <div className="cabin-layout">
        <div className="cabin-stage">
          <Tabs.List aria-label="Gravity level" className="gravity-tabs">
            {gravityOptions.map(option => {
              const coverage = gravityStatus(gravityEvidence(option.id, evidence));
              return <Tabs.Trigger value={option.id} className="gravity-tab" key={option.id}>
                {option.label}<small>{coverage}</small>
              </Tabs.Trigger>;
            })}
          </Tabs.List>
          <Tabs.Content value={gravity} key={gravity} className="cabin-content">
            <canvas ref={canvas} width={880} height={380} role="img" aria-label="Illustration of smoke in a cabin" />
            {particleSize && <p className="cabin-note">
              Particles drawn larger here, based on <Chip claim={particleSize} open={open} /> <DraftLabel claim={particleSize} />
            </p>}
            <p className="detector-state" aria-live="polite">
              <span className="detector-dot" data-reached={reached} aria-hidden="true" />
              <span>{reached ? "Ceiling detector: smoke reached it" : "Ceiling detector: no smoke yet"}
                {noMeasuredInput && " (illustration only, no measured data at this gravity)"}</span>
            </p>
            <div className="cabin-controls">
              <label htmlFor="cabin-airflow">Cabin airflow</label><span>{airflow} cm/s</span>
              <input id="cabin-airflow" type="range" min={0} max={maxAirflow} step={1} value={airflow}
                aria-valuetext={`${airflow} cm/s`} onChange={event => setAirflow(event.currentTarget.valueAsNumber)} />
              {markers.length > 0 && <div className="airflow-ticks" aria-hidden="true">
                {markers.map(claim => <span key={claim.claim_id}
                  className={claim.claim_status === "MODEL_RESULT" ? "model-text" : undefined}
                  style={{ left: `${claim.airflow!.value / maxAirflow * 100}%` }}>▲</span>)}
              </div>}
              {markers.length > 0 && <ul className="airflow-markers" aria-label="Airflow values in our sources">
                {markers.map(claim => <li key={claim.claim_id}>
                  <span className={claim.claim_status === "MODEL_RESULT" ? "model-text" : undefined}>
                    ▲ {claim.airflow!.value} {claim.airflow!.unit} {claim.claim_status === "MODEL_RESULT" ? "NASA model" : "NASA test"}
                  </span>{" "}<Chip claim={claim} open={open} /> <DraftLabel claim={claim} />
                </li>)}
              </ul>}
            </div>
            <p className="cabin-note">Simplified illustration for intuition, not a NASA simulation or prediction. ▲ marks airflow values from NASA’s published work.</p>
          </Tabs.Content>
        </div>

        <aside className="cabin-evidence" aria-labelledby="cabin-evidence-heading">
          <h3 id="cabin-evidence-heading">What NASA has</h3>
          <p className="muted">{active.label}</p>
          <p className={`coverage-status ${status === "Nothing measured" ? "gap-text" : status === "Simulated only" ? "model-text" : ""}`}>
            <span aria-hidden="true" className={`mark ${status === "Measured" ? "reported_result" : status === "Simulated only" ? "model_result" : "not_established"}`} />
            {status}
          </p>
          {rows.length > 0 ? <ul className="cabin-claims">{rows.map(claim =>
            <ClaimLine key={claim.claim_id} claim={claim} open={open} />,
          )}</ul> : <p className="gap-text">No smoke or fire measurements at this gravity in our sources.
            {nearby.length > 0 && <> <span className="muted">Nearest evidence: {nearby.join(" and ")}.</span></>}</p>}
          {canShowFigure && <button className="figure-toggle" type="button" aria-expanded={showFigure}
            aria-controls="destiny-simulation" onClick={() => setShowFigure(value => !value)}>
            {showFigure ? "Hide NASA’s cabin simulation" : "Show NASA’s own cabin simulation"}
          </button>}
        </aside>
      </div>
    </Tabs.Root>

    {canShowFigure && <figure className="source-figure" id="destiny-simulation" hidden={!showFigure}>
      <Image src={`/${figure.file}`} width={956} height={606} unoptimized alt="NASA cabin comparison at low and normal gravity" />
      <figcaption><span>{simulation.claim_text}</span> <Chip claim={simulation} open={open} /> <DraftLabel claim={simulation} />
        <br /><a href={simulationSource.url}>{simulationSource.publisher}, slide {figure.slide}</a></figcaption>
    </figure>}
  </section>;
}
