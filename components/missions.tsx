"use client";

import { Tabs } from "radix-ui";
import { coverageTopics, gravityEvidence, gravityLabels, investigations, isMeasurement, missionGravityStatus, type Claim, type GravityStop } from "../lib/evidence";
import { ClaimLine, type OpenClaim } from "./evidence-ui";

const missions = [
  { gravity: "microgravity", name: "Space Station" },
  { gravity: "lunar_0.16g", name: "Moon base" },
  { gravity: "mars_0.38g", name: "Mars base" },
  { gravity: "1g", name: "Earth" },
] as const;
const missionTopics = [...coverageTopics, ["pyrolysis", "Pyrolysis"], ["flame_spread", "Flame spread"], ["material_flammability", "Material flammability"]] as const;
const nextLabels = ["Planned (as of Dec 2025)", "Planned (as of 2021)", "Authors' suggestion", "Earth application"];

function testPriority(claim: Claim) {
  return nextLabels.indexOf(claim.evidence_label ?? "");
}

function MissionClaims({ items, open }: { items: Claim[]; open: OpenClaim }) {
  return <ul className="mission-claims">
    {items.map(claim => <ClaimLine key={claim.claim_id} claim={claim} open={open} />)}
  </ul>;
}

function MissionBrief({ gravity, evidence, open }: { gravity: GravityStop; evidence: Claim[]; open: OpenClaim }) {
  const local = gravityEvidence(gravity, evidence);
  const measured = local.filter(isMeasurement);
  const modeled = local.filter(claim => claim.claim_status === "MODEL_RESULT");
  const measuredTopics = new Set(measured.flatMap(claim => claim.topics));
  const gaps = missionTopics.filter(([topic]) => !measuredTopics.has(topic));
  const statements = local.filter(claim => claim.evidence_label === "Authors' statement");
  const plans = local.filter(claim => testPriority(claim) >= 0)
    .sort((a, b) => testPriority(a) - testPriority(b));
  const label = gravityLabels[gravity].toLowerCase();
  const studies = investigations.flatMap(study => {
    const claims = local.filter(claim => claim.investigation_id === study.investigation_id);
    return claims.length ? [{
      study, total: claims.length, measured: claims.filter(isMeasurement).length,
      modeled: claims.filter(claim => claim.claim_status === "MODEL_RESULT").length,
    }] : [];
  }).sort((a, b) => b.total - a.total || a.study.investigation_id.localeCompare(b.study.investigation_id));

  return <>
    <div className="mission-columns">
      <section className="mission-column" aria-labelledby="mission-know">
        <h3 id="mission-know"><span className="mark reported_result" aria-hidden="true" /> What we know</h3>
        {measured.length > 0 ? <MissionClaims items={measured} open={open} />
          : <p className="muted">No reported measurements for this gravity in our sources.</p>}
      </section>
      <section className="mission-column" aria-labelledby="mission-modeled">
        <h3 id="mission-modeled"><span className="mark model_result" aria-hidden="true" /> Only simulated</h3>
        {modeled.length > 0 ? <MissionClaims items={modeled} open={open} />
          : <p className="muted">No simulations for this gravity in our sources.</p>}
      </section>
      <section className="mission-column" aria-labelledby="mission-gaps">
        <h3 id="mission-gaps"><span className="mark not_established" aria-hidden="true" /> Nobody has measured</h3>
        {gaps.length > 0 ? <ul className="mission-gaps">
          {gaps.map(([topic, name]) => <li className="gap-text" key={topic}>
            No measurements of {name.toLowerCase()} at {label} in our sources.
          </li>)}
        </ul> : <p className="muted">Our sources include a measurement for every topic listed here.</p>}
        {statements.length > 0 && <MissionClaims items={statements} open={open} />}
      </section>
      <section className="mission-column" aria-labelledby="mission-plans">
        <h3 id="mission-plans"><span className="mark" aria-hidden="true" /> Test next</h3>
        {plans.length > 0 ? <MissionClaims items={plans} open={open} />
          : <p className="muted">No planned work at this gravity in our sources.</p>}
      </section>
    </div>
    <section className="mission-studies" aria-labelledby="mission-studies-heading">
      <h3 id="mission-studies-heading">Most relevant studies</h3>
      {studies.length > 0 ? <ol>{studies.slice(0, 5).map(({ study, measured, modeled }) =>
        <li key={study.investigation_id}>
          <a href={`?investigation=${encodeURIComponent(study.investigation_id)}#ask`}>
            {study.acronym || study.title}
          </a>
          {`: ${measured} measured ${measured === 1 ? "result" : "results"}, ${modeled} ${modeled === 1 ? "simulation" : "simulations"} at ${label}`}
        </li>,
      )}</ol> : <p className="muted">No investigations linked to verified claims at this gravity.</p>}
    </section>
  </>;
}

export function Missions({ evidence, open, gravity, onGravityChange }: {
  evidence: Claim[];
  open: OpenClaim;
  gravity: GravityStop;
  onGravityChange: (gravity: GravityStop) => void;
}) {
  const unscoped = evidence.filter(claim =>
    (claim.gravity_level === "multiple" || claim.gravity_level === "unspecified") &&
    (testPriority(claim) >= 0 || claim.evidence_label === "Authors' statement"),
  );

  return <section className="block" id="missions" aria-labelledby="missions-heading">
    <h2 className="block-title" id="missions-heading">Mission briefings</h2>
    <p className="section-intro">See what our sources show at each gravity and what the authors suggest testing next. A <a href="#habitats">habitat ranking</a> below lists studies for a spacecraft cabin, a surface habitat, or a pressurized rover, with the cited factors shown.</p>
    <Tabs.Root value={gravity} orientation="horizontal" onValueChange={value => onGravityChange(value as GravityStop)}>
      <Tabs.List aria-label="Mission" className="mission-tabs">
        {missions.map(mission => {
          const status = missionGravityStatus(gravityEvidence(mission.gravity, evidence));
          return <Tabs.Trigger className="gravity-tab" key={mission.gravity} value={mission.gravity}>
            {mission.name}<small className={status === "Nothing measured" ? "gap-text" : status === "Simulated only" ? "model-text" : undefined}>{status}</small>
          </Tabs.Trigger>;
        })}
      </Tabs.List>
      <Tabs.Content value={gravity}>
        <MissionBrief gravity={gravity} evidence={evidence} open={open} />
      </Tabs.Content>
    </Tabs.Root>
    {unscoped.length > 0 && <details className="evidence-details mission-context">
      <summary>Statements and plans without a single gravity level</summary>
      <MissionClaims items={unscoped} open={open} />
    </details>}
  </section>;
}
