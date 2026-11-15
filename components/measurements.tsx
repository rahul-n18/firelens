import Image from "next/image";
import { formatClaimValue, particleSizeBounds } from "../lib/claim-values";
import { sources, type Claim } from "../lib/evidence";
import { Chip, DraftLabel, Mark, type OpenClaim } from "./evidence-ui";

const headlineIds = ["NTRS13-004", "NTRS13-001", "SAMER-002"];
const diameterIds = ["NTRS13-001", "SAME-004", "NTRS13-008", "NTRS13-008b", "NTRS13-009", "NTRS13-009b"];

type Props = { byId: ReadonlyMap<string, Claim>; open: OpenClaim };

export function Measurements({ byId, open }: Props) {
  const highlights = headlineIds.flatMap(id => {
    const claim = byId.get(id);
    return claim?.value !== undefined ? [claim] : [];
  });
  const chartClaim = byId.get("NTRS13-002");
  const chartSource = chartClaim && sources.get(chartClaim.source_id);
  const chart = chartSource?.derived_assets?.find(asset => asset.slide === 18);

  return <section className="block" id="measured" aria-labelledby="measured-heading">
    <h2 className="block-title" id="measured-heading">What NASA measured on the Space Station</h2>
    {highlights.length > 0 ? <div className="measurement-highlights">
      {highlights.map(claim => <div className="measurement-highlight" key={claim.claim_id}>
        <p className="measurement-value" data-big-value={claim.claim_id}>{formatClaimValue(claim, { headline: true })}</p>
        <p><span data-claim-text={claim.claim_id}>{claim.claim_text}</span> <Chip claim={claim} open={open} /></p>
        <DraftLabel claim={claim} />
      </div>)}
    </div> : <p className="muted">No verified measurements for this section in our sources.</p>}
    {chart && chartSource && chartClaim && <figure className="source-figure measured-figure">
      <p className="chart-reading">Dots above the line mean bigger particles in low gravity.</p>
      <Image unoptimized src={`/${chart.file}`} width={1040} height={649} alt="Original chart comparing low- and normal-gravity particle sizes" />
      <figcaption>
        <span data-claim-text={chartClaim.claim_id}>{chartClaim.claim_text}</span> <Chip claim={chartClaim} open={open} /> <DraftLabel claim={chartClaim} />
        <br /><a href={chartSource.url}>{chartSource.publisher}, slide {chart.slide}</a>
      </figcaption>
    </figure>}
  </section>;
}

export function Detectors({ byId, open }: Props) {
  const diameter = diameterIds.flatMap(id => {
    const claim = byId.get(id);
    const bounds = claim && particleSizeBounds(claim);
    return claim && bounds ? [{ claim, bounds }] : [];
  });
  const largest = Math.max(0, ...diameter.map(row => row.bounds[1]));
  const axisMax = Math.ceil(largest * 2.2) / 2;
  const ticks = axisMax > 0 ? Array.from({ length: 6 }, (_, i) => +(i * axisMax / 5).toPrecision(3)) : [];
  const axisUnit = diameter.find(row => row.claim.unit !== "nm")?.claim.unit ?? "µm";
  const fraction = byId.get("NTRS13-007");
  const suggestion = byId.get("NTRS13-006");

  return <section className="block" id="detectors" aria-labelledby="detectors-heading">
    <h2 className="block-title" id="detectors-heading">How do detector specifications compare?</h2>
    <p className="section-intro">Compare reported smoke sizes and equipment specifications from the sources.</p>
    <div className="detector-chart" role="region" aria-label="Smoke measurements and detector specifications">
      {diameter.length > 0 && <>
        <div className="detector-axis">
          <h3>Particle size or threshold ({axisUnit})</h3>
          <div className="detector-ticks" aria-hidden="true">{ticks.map(tick => <span key={tick}>{tick}</span>)}</div>
        </div>
        <ul className="detector-rows">
          {diameter.map(({ claim, bounds: [lower, upper] }) => {
            const isUpperLimit = claim.value_qualifier === "less_than";
            const isLowerLimit = claim.value_qualifier === "greater_than";
            const from = isUpperLimit ? 0 : lower;
            const to = isLowerLimit ? axisMax : upper;
            return <li key={claim.claim_id} className="detector-row">
              <div>
                <h4>{claim.quantity} <strong className="detector-value">{formatClaimValue(claim)}</strong></h4>
                <p className="muted"><span data-claim-text={claim.claim_id}>{claim.claim_text}</span> <Chip claim={claim} open={open} /></p>
                <div className="claim-meta"><Mark claim={claim} /> <DraftLabel claim={claim} /></div>
              </div>
              <div className="detector-track" aria-hidden="true">
                <span className={`detector-range ${isUpperLimit ? "before-bound" : isLowerLimit ? "after-bound" : ""}`}
                  style={{ left: `${from / axisMax * 100}%`, width: `${(to - from) / axisMax * 100}%` }} />
              </div>
            </li>;
          })}
        </ul>
      </>}
      {fraction && typeof fraction.value === "number" && fraction.unit === "%" && <div className="detector-row mass-fraction">
        <div>
          <h4>{fraction.quantity} <strong className="detector-value">{formatClaimValue(fraction)}</strong></h4>
          <p className="muted"><span data-claim-text={fraction.claim_id}>{fraction.claim_text}</span> <Chip claim={fraction} open={open} /></p>
          {fraction.conditions && <p className="muted">{fraction.conditions}</p>}
          <div className="claim-meta"><Mark claim={fraction} /> <DraftLabel claim={fraction} /></div>
        </div>
        <div className="fraction-track" aria-hidden="true"><span style={{ width: `${fraction.value}%` }} /></div>
      </div>}
      {!diameter.length && !fraction && <p className="muted">No verified smoke sizes or detector specifications in our sources.</p>}
    </div>
    {suggestion && <aside className="detector-suggestion" aria-labelledby="detector-suggestion-heading">
      <h3 id="detector-suggestion-heading">{suggestion.evidence_label}</h3>
      <blockquote data-claim-excerpt={suggestion.claim_id}>{suggestion.source_excerpt}</blockquote>
      <Chip claim={suggestion} open={open} /> <DraftLabel claim={suggestion} />
    </aside>}
  </section>;
}
