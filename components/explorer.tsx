"use client";

import { useMemo, useState } from "react";
import { investigations, type Claim } from "../lib/evidence";
import {
  allProfiles, attributeKeys, attributeLabels, compareProfiles, familyLabel, hardwareFamilies, profileFor,
  type InvestigationProfile,
} from "../lib/profiles";
import { ClaimLine, type OpenClaim } from "./evidence-ui";

function AttributeCard({ profile, open }: { profile: InvestigationProfile; open: OpenClaim }) {
  return (
    <div className="attribute-grid">
      {profile.attributes.map(bucket => (
        <section className="attribute-card" key={bucket.key} aria-labelledby={`${profile.investigation.investigation_id}-${bucket.key}`}>
          <h4 id={`${profile.investigation.investigation_id}-${bucket.key}`}>{bucket.label}</h4>
          {bucket.claims.length > 0 ? (
            <ul className="claim-list compact-claims">
              {bucket.claims.map(claim => <ClaimLine key={claim.claim_id} claim={claim} open={open} details />)}
            </ul>
          ) : (
            <p className="small muted">No cited {bucket.label.toLowerCase()} in this corpus.</p>
          )}
        </section>
      ))}
      {profile.results.length > 0 && (
        <section className="attribute-card attribute-wide" aria-labelledby={`${profile.investigation.investigation_id}-results`}>
          <h4 id={`${profile.investigation.investigation_id}-results`}>Cited measured results</h4>
          <ul className="claim-list compact-claims">
            {profile.results.map(claim => <ClaimLine key={claim.claim_id} claim={claim} open={open} details />)}
          </ul>
        </section>
      )}
    </div>
  );
}

export function Explorer({ evidence, open }: { evidence: Claim[]; open: OpenClaim }) {
  const profiles = useMemo(() => allProfiles(evidence), [evidence]);
  const [familyId, setFamilyId] = useState<string>("all");
  const [selectedId, setSelectedId] = useState(profiles.find(profile => profile.claimCount > 0)?.investigation.investigation_id ?? profiles[0]?.investigation.investigation_id);
  const [compareIds, setCompareIds] = useState<string[]>(["PSI-26", "PSI-25"]);
  const visible = profiles.filter(profile => familyId === "all" || (profile.family?.id ?? "other") === familyId);
  const selected = selectedId ? profileFor(selectedId, evidence) : undefined;
  const compared = compareIds.flatMap(id => {
    const profile = profileFor(id, evidence);
    return profile ? [profile] : [];
  });
  const points = compareProfiles(compared);

  function toggleCompare(id: string) {
    setCompareIds(current => {
      if (current.includes(id)) return current.filter(item => item !== id);
      if (current.length >= 3) return current;
      return [...current, id];
    });
  }

  return (
    <section className="block" id="explore" aria-labelledby="explore-heading">
      <h2 className="block-title" id="explore-heading">Investigation explorer</h2>
      <p className="section-intro">
        Group studies by hardware family and read attribute cards built only from verified claims.
        Compare two or three investigations side by side. Similarities and differences come from those structured fields, not from free-form interpretation.
      </p>

      <div className="family-tabs" role="tablist" aria-label="Hardware family">
        <button type="button" role="tab" aria-selected={familyId === "all"} className="gravity-tab" onClick={() => setFamilyId("all")}>
          All families<small>{profiles.length} investigations</small>
        </button>
        {hardwareFamilies.map(family => {
          const count = profiles.filter(profile => profile.family?.id === family.id).length;
          return (
            <button type="button" role="tab" aria-selected={familyId === family.id} className="gravity-tab" key={family.id} onClick={() => setFamilyId(family.id)}>
              {family.label}<small>{count} investigations</small>
            </button>
          );
        })}
        <button type="button" role="tab" aria-selected={familyId === "other"} className="gravity-tab" onClick={() => setFamilyId("other")}>
          Other hardware<small>{profiles.filter(profile => !profile.family).length} investigations</small>
        </button>
      </div>

      <div className="explorer-layout">
        <nav className="explorer-list" aria-label="Investigations">
          <ol>
            {visible.map(profile => {
              const id = profile.investigation.investigation_id;
              return (
                <li key={id}>
                  <button type="button" className={`explorer-item ${id === selectedId ? "is-selected" : ""}`} onClick={() => setSelectedId(id)} aria-current={id === selectedId ? "true" : undefined}>
                    <span className="explorer-item-title">{profile.name}</span>
                    <span className="small muted">{id} · {profile.family?.label ?? "Other hardware"}</span>
                    <span className="small muted">
                      {profile.coverage === "METADATA_ONLY" ? "Metadata only" : `${profile.claimCount} claims, ${profile.measuredCount} measured`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
        {selected && (
          <article className="explorer-detail" aria-labelledby="explorer-detail-heading">
            <p className="eyebrow">{selected.investigation.investigation_id} · {familyLabel(selected.investigation.investigation_id)}</p>
            <h3 id="explorer-detail-heading">{selected.name}</h3>
            <p className="muted">{selected.investigation.title}</p>
            {selected.coverage === "METADATA_ONLY" ? (
              <p className="small muted">This investigation is indexed in PSI, but FireLens does not yet have extracted claims for the attribute cards below.</p>
            ) : (
              <p className="small muted">{selected.claimCount} verified claims, including {selected.measuredCount} measured results. Challenge context and planned test conditions are labeled and are not counted as measurements.</p>
            )}
            <div className="evidence-actions">
              <button type="button" className="text-button" aria-pressed={compareIds.includes(selected.investigation.investigation_id)} onClick={() => toggleCompare(selected.investigation.investigation_id)}>
                {compareIds.includes(selected.investigation.investigation_id) ? "Remove from compare" : compareIds.length >= 3 ? "Compare list is full" : "Add to compare"}
              </button>
            </div>
            <AttributeCard profile={selected} open={open} />
          </article>
        )}
      </div>

      <section className="section" aria-labelledby="compare-heading">
        <div className="section-title">
          <h3 id="compare-heading">Compare investigations</h3>
          <span className="small muted">Choose two or three. {compareIds.length} selected.</span>
        </div>
        <div className="compare-picks" role="group" aria-label="Investigations to compare">
          {investigations.map(row => {
            const pressed = compareIds.includes(row.investigation_id);
            const disabled = !pressed && compareIds.length >= 3;
            return (
              <button type="button" className="text-button" key={row.investigation_id} aria-pressed={pressed} disabled={disabled} onClick={() => toggleCompare(row.investigation_id)}>
                {profiles.find(profile => profile.investigation.investigation_id === row.investigation_id)?.name ?? row.title}
              </button>
            );
          })}
        </div>
        {compared.length >= 2 ? (
          <>
            <div className="comparison-scroll" tabIndex={0} role="region" aria-label="Investigation comparison table">
              <table className="comparison-table compare-table">
                <thead>
                  <tr>
                    <th scope="col">Attribute</th>
                    {compared.map(profile => <th scope="col" key={profile.investigation.investigation_id}>{profile.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Hardware family</th>
                    {compared.map(profile => <td key={profile.investigation.investigation_id}>{profile.family?.label ?? "Other hardware"}</td>)}
                  </tr>
                  {attributeKeys.map(key => (
                    <tr key={key}>
                      <th scope="row">{attributeLabels[key]}</th>
                      {compared.map(profile => {
                        const bucket = profile.attributes.find(item => item.key === key)!;
                        return (
                          <td key={profile.investigation.investigation_id}>
                            {bucket.claims.length ? (
                              <ul className="comparison-claims">
                                {bucket.claims.map(claim => (
                                  <ClaimLine key={claim.claim_id} claim={claim} open={open} />
                                ))}
                              </ul>
                            ) : <span className="small muted">Not cited in corpus</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="compare-points">
              <h4>Similarities and differences</h4>
              {points.length ? (
                <ul>
                  {points.map(point => (
                    <li key={point.text} className={point.kind === "gap" ? "compare-gap" : undefined}>
                      {point.text}
                    </li>
                  ))}
                </ul>
              ) : <p className="small muted">No structured similarities or differences could be derived from the cited fields.</p>}
              <p className="small muted">These points only compare fields that already have verified claims. They are not a scientific model of how the flames would behave together.</p>
            </div>
          </>
        ) : (
          <p className="muted">Select at least two investigations to compare their cited attributes.</p>
        )}
      </section>
    </section>
  );
}

