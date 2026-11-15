"use client";

import type { Claim } from "../lib/evidence";
import { insightClaims, insightSections, insightsGap, insightsIntro } from "../lib/insights";
import { ClaimLine, type OpenClaim } from "./evidence-ui";

export function Insights({ evidence, open }: { evidence: Claim[]; open: OpenClaim }) {
  return (
    <section className="block" id="insights" aria-labelledby="insights-heading">
      <h2 className="block-title" id="insights-heading">Prevention, detection, and suppression</h2>
      <p className="section-intro">{insightsIntro} {insightsGap}</p>
      <div className="insights-grid">
        {insightSections.map(section => (
          <section className="insight-panel" key={section.id} aria-labelledby={`${section.id}-heading`}>
            <h3 id={`${section.id}-heading`}>{section.label}</h3>
            <p className="muted">{section.blurb}</p>
            <ul className="claim-list compact-claims">
              {insightClaims(section, evidence).map(claim => (
                <ClaimLine key={claim.claim_id} claim={claim} open={open} details />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
