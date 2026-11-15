"use client";

import { useMemo, useState } from "react";
import { byClaim, type Claim } from "../lib/evidence";
import {
  contextClaims, habitatFor, habitats, rankForHabitat, relatedHabitatClaims, scoreLabel, scoringNote, SCORE_MAX,
  type HabitatId, type HabitatRank,
} from "../lib/habitats";
import { Chip, ClaimLine, type OpenClaim } from "./evidence-ui";

function FactorList({ rank, open }: { rank: HabitatRank; open: OpenClaim }) {
  return (
    <ul className="factor-list">
      {rank.factors.map(factor => (
        <li key={factor.id} className={`factor factor-${factor.kind}`}>
          <div className="factor-head">
            <strong>{factor.label}</strong>
            <span className="factor-points">{factor.points}/{factor.maxPoints}</span>
          </div>
          <p>{factor.text}</p>
          {factor.claimIds.length > 0 && (
            <div className="factor-chips">
              {factor.claimIds.map(id => {
                const claim = byClaim.get(id);
                return claim ? <Chip key={id} claim={claim} open={open} /> : <span className="small muted" key={id}>{id}</span>;
              })}
            </div>
          )}
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
        Investigations are ranked for a spacecraft cabin, a Moon surface base, a Mars surface base, or a pressurized rover with a transparent FireLens score.
        The score uses cited factors: gravity match or bound, oxygen and pressure overlap, cabin-material relevance, fire-safety pillar, and evidence strength.
        A <a href="#bounds">Moon and rover bounds</a> panel then separates challenge-stated atmospheres and partial-gravity evidence from measurements.
      </p>
      <p className="small muted">{scoringNote}</p>

      <div className="habitat-tabs" role="tablist" aria-label="Habitat">
        {habitats.map(item => {
          const top = rankForHabitat(item.id, evidence).find(rank => !rank.metadataOnly);
          return (
            <button type="button" role="tab" className="gravity-tab" key={item.id}
              aria-selected={habitatId === item.id}
              onClick={() => { setHabitatId(item.id); setSelectedId(undefined); }}>
              {item.label}
              <small>{top ? `Top ${scoreLabel(top)}` : "No scored studies"}</small>
            </button>
          );
        })}
      </div>
      <p className="muted">{habitat.blurb}</p>

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
                    <span className={`habitat-score is-${rank.level.toLowerCase()}`}>{scoreLabel(rank)}</span>
                    <span className="small muted">{id}</span>
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
                      <span className="habitat-score is-low">{scoreLabel(rank)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </nav>
        {selected && (
          <article className="habitat-detail" aria-labelledby="habitat-detail-heading">
            <p className="eyebrow">{selected.investigation.investigation_id} · <span className={`habitat-score is-${selected.level.toLowerCase()}`}>{scoreLabel(selected)}</span></p>
            <h3 id="habitat-detail-heading">{selected.name}</h3>
            <p className="muted">{selected.investigation.title}</p>
            {selected.caveat && <p className="small muted habitat-caveat">{selected.caveat}</p>}
            <h4>Score breakdown</h4>
            <p className="small muted">{selected.score} of {SCORE_MAX}. {scoringNote}</p>
            <FactorList rank={selected} open={open} />
          </article>
        )}
      </div>

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
