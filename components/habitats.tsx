"use client";

import { useMemo, useState } from "react";
import type { Claim } from "../lib/evidence";
import {
  contextClaims, habitatFor, habitats, rankForHabitat, relatedHabitatClaims, type HabitatId, type HabitatRank,
} from "../lib/habitats";
import { ClaimLine, type OpenClaim } from "./evidence-ui";

function FactorList({ rank }: { rank: HabitatRank }) {
  return (
    <ul className="factor-list">
      {rank.factors.map(factor => (
        <li key={factor.id} className={`factor factor-${factor.kind}`}>
          {factor.text}
          {factor.claimIds.length > 0 && <span className="small muted"> {factor.claimIds.join(", ")}</span>}
        </li>
      ))}
    </ul>
  );
}

export function Habitats({ evidence, open }: { evidence: Claim[]; open: OpenClaim }) {
  const [habitatId, setHabitatId] = useState<HabitatId>("pressurized_rover");
  const [selectedId, setSelectedId] = useState<string>();
  const ranks = useMemo(() => rankForHabitat(habitatId, evidence), [habitatId, evidence]);
  const assessed = ranks.filter(rank => !rank.metadataOnly);
  const indexed = ranks.filter(rank => rank.metadataOnly);
  const selected = ranks.find(rank => rank.investigation.investigation_id === (selectedId ?? assessed[0]?.investigation.investigation_id));
  const related = relatedHabitatClaims(habitatId, evidence);
  const context = contextClaims(habitatId, evidence);
  const habitat = habitatFor(habitatId);

  return (
    <section className="block" id="habitats" aria-labelledby="habitats-heading">
      <h2 className="block-title" id="habitats-heading">Habitat relevance</h2>
      <p className="section-intro">
        Investigations are ranked for a spacecraft cabin, a surface habitat, or a pressurized rover from visible, cited factors — gravity class, atmosphere overlap, measured flammability results, and whether a source actually names that habitat.
        A relevance tag appears only when a source supports it. Everything else is labeled Not assessed. There is no hidden score.
      </p>

      <div className="habitat-tabs" role="tablist" aria-label="Habitat">
        {habitats.map(item => (
          <button type="button" role="tab" className="gravity-tab" key={item.id}
            aria-selected={habitatId === item.id}
            onClick={() => { setHabitatId(item.id); setSelectedId(undefined); }}>
            {item.label}
            <small>{rankForHabitat(item.id, evidence).filter(rank => rank.tag === "supported").length} tagged</small>
          </button>
        ))}
      </div>
      <p className="muted">{habitat.blurb}</p>

      {context.length > 0 && (
        <section className="section habitat-context" aria-labelledby="habitat-context-heading">
          <h3 id="habitat-context-heading">Cited habitat conditions</h3>
          <p className="small muted">
            Challenge-statement figures and planned test conditions are listed separately and are not treated as NASA measurements.
          </p>
          <ul className="claim-list compact-claims">
            {context.map(claim => <ClaimLine key={claim.claim_id} claim={claim} open={open} details />)}
          </ul>
        </section>
      )}

      <div className="habitat-layout">
        <nav className="habitat-list" aria-label="Ranked investigations">
          <ol>
            {assessed.map((rank, index) => {
              const id = rank.investigation.investigation_id;
              const current = id === selected?.investigation.investigation_id;
              return (
                <li key={id}>
                  <button type="button" className={`explorer-item ${current ? "is-selected" : ""}`} onClick={() => setSelectedId(id)} aria-current={current ? "true" : undefined}>
                    <span className="explorer-item-title"><span className="rank-index">{index + 1}</span> {rank.name}</span>
                    <span className={`habitat-tag ${rank.tag === "supported" ? "is-supported" : "is-gap"}`}>{rank.tagLabel}</span>
                    <span className="small muted">{id} · {rank.factors.filter(factor => factor.kind === "support" || factor.kind === "context").length} visible factors</span>
                  </button>
                </li>
              );
            })}
          </ol>
          {indexed.length > 0 && (
            <div className="habitat-indexed">
              <h3 className="small muted">Indexed, not yet reviewed</h3>
              <ol>
                {indexed.map(rank => (
                  <li key={rank.investigation.investigation_id}>
                    <button type="button" className={`explorer-item ${rank.investigation.investigation_id === selected?.investigation.investigation_id ? "is-selected" : ""}`} onClick={() => setSelectedId(rank.investigation.investigation_id)}>
                      <span className="explorer-item-title">{rank.name}</span>
                      <span className="habitat-tag is-gap">Not assessed</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </nav>
        {selected && (
          <article className="habitat-detail" aria-labelledby="habitat-detail-heading">
            <p className="eyebrow">{selected.investigation.investigation_id} · <span className={`habitat-tag ${selected.tag === "supported" ? "is-supported" : "is-gap"}`}>{selected.tagLabel}</span></p>
            <h3 id="habitat-detail-heading">{selected.name}</h3>
            <p className="muted">{selected.investigation.title}</p>
            <h4>Visible factors</h4>
            <FactorList rank={selected} />
          </article>
        )}
      </div>

      {related.length > 0 && (
        <section className="section" aria-labelledby="habitat-related-heading">
          <h3 id="habitat-related-heading">Related claims not tied to a PSI investigation</h3>
          <p className="small muted">These claims are relevant to this habitat class but the source did not identify a PSI investigation.</p>
          <ul className="claim-list compact-claims">
            {related.map(claim => <ClaimLine key={claim.claim_id} claim={claim} open={open} details />)}
          </ul>
        </section>
      )}
    </section>
  );
}
