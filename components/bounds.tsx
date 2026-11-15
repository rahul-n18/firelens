"use client";

import {
  atmosphereIntro, atmospherePoints, boundsIntro, boundClaims, challengeOxygenPercent,
  challengePressurePsi, challengeRegionLabel, chartCaption, chartDescription, gravityIntro,
  oxygenLabel, oxygenTicks, partialGravityGroups, pressureLabel, pressureTicks,
} from "../lib/bounds";
import { ClaimLine, Mark, type OpenClaim } from "./evidence-ui";
import { byClaim } from "../lib/evidence";

const width = 640;
const height = 400;
const pad = { left: 58, right: 18, top: 20, bottom: 48 };
const maxPsi = 16;
const maxO2 = 100;

function xOf(psi: number) {
  return pad.left + (psi / maxPsi) * (width - pad.left - pad.right);
}
function yOf(oxygen: number) {
  return pad.top + ((maxO2 - oxygen) / maxO2) * (height - pad.top - pad.bottom);
}

function AtmosphereChart() {
  const region = {
    x: xOf(0),
    y: yOf(100),
    w: xOf(challengePressurePsi) - xOf(0),
    h: yOf(challengeOxygenPercent) - yOf(100),
  };

  return (
    <figure className="bound-chart">
      <figcaption className="small muted">
        {chartCaption}
      </figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="bound-chart-title bound-chart-desc">
        <title id="bound-chart-title">Cited Moon, rover, and comparison atmospheres</title>
        <desc id="bound-chart-desc">{chartDescription}</desc>
        <defs>
          <pattern id="bound-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1" />
          </pattern>
        </defs>
        {pressureTicks.map(tick => (
          <g key={`x-${tick}`}>
            <line className="bound-grid" x1={xOf(tick)} y1={pad.top} x2={xOf(tick)} y2={height - pad.bottom} />
            <text className="bound-tick" x={xOf(tick)} y={height - pad.bottom + 16} textAnchor="middle">{tick}</text>
          </g>
        ))}
        {oxygenTicks.map(tick => (
          <g key={`y-${tick}`}>
            <line className="bound-grid" x1={pad.left} y1={yOf(tick)} x2={width - pad.right} y2={yOf(tick)} />
            <text className="bound-tick" x={pad.left - 8} y={yOf(tick) + 4} textAnchor="end">{tick}</text>
          </g>
        ))}
        <rect className="bound-region" x={region.x} y={region.y} width={region.w} height={region.h} fill="url(#bound-hatch)" />
        <rect className="bound-region-outline" x={region.x} y={region.y} width={region.w} height={region.h} />
        <text className="bound-region-label" x={region.x + 10} y={region.y + 28}>{challengeRegionLabel}</text>
        {atmospherePoints.map(point => {
          const planned = point.kindId === "planned_test_condition";
          return (
            <g key={point.id} transform={`translate(${xOf(point.pressurePsi)} ${yOf(point.oxygenPercent)})`}>
              {planned
                ? <rect className="bound-mark planned" x="-5" y="-5" width="10" height="10" />
                : <circle className="bound-mark context" r="6" />}
            </g>
          );
        })}
        <text className="bound-axis" x={(pad.left + width - pad.right) / 2} y={height - 8} textAnchor="middle">Pressure (psi or psia, as cited)</text>
        <text className="bound-axis" x={14} y={(pad.top + height - pad.bottom) / 2} textAnchor="middle" transform={`rotate(-90 14 ${(pad.top + height - pad.bottom) / 2})`}>Oxygen (%)</text>
      </svg>
      <ul className="bound-legend">
        <li><span className="bound-legend-mark context" aria-hidden="true" /> Challenge context</li>
        <li><span className="bound-legend-mark planned" aria-hidden="true" /> Planned test condition</li>
      </ul>
    </figure>
  );
}

export function Bounds({ open }: { open: OpenClaim }) {
  return (
    <section className="block" id="bounds" aria-labelledby="bounds-heading">
      <h2 className="block-title" id="bounds-heading">Moon and rover bounds</h2>
      <p className="section-intro">
        {boundsIntro}
      </p>

      <div className="bounds-grid">
        <section className="bound-panel" aria-labelledby="atmosphere-bounds-heading">
          <h3 id="atmosphere-bounds-heading">Cited atmospheres</h3>
          <p className="muted">
            {atmosphereIntro}
          </p>
          <AtmosphereChart />
          <div className="bound-table-scroll" tabIndex={0} role="region" aria-label="Cited atmosphere values">
            <table className="bound-table">
              <thead>
                <tr>
                  <th scope="col">Cited condition</th>
                  <th scope="col">Oxygen</th>
                  <th scope="col">Pressure</th>
                  <th scope="col">Kind</th>
                </tr>
              </thead>
              <tbody>
                {atmospherePoints.map(point => {
                  const claim = byClaim.get(point.claimIds[0])!;
                  return (
                    <tr key={point.id}>
                      <th scope="row">
                        {point.label}
                        <p className="small muted">{point.habitatNote}</p>
                      </th>
                      <td>{oxygenLabel(point)}</td>
                      <td>{pressureLabel(point)}</td>
                      <td><Mark claim={claim} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bound-panel" aria-labelledby="gravity-bounds-heading">
          <h3 id="gravity-bounds-heading">Partial gravity</h3>
          <p className="muted">
            {gravityIntro}
          </p>
          <ol className="bound-groups">
            {partialGravityGroups.map(group => (
              <li key={group.id}>
                <h4>{group.title}</h4>
                <p>{group.summary}</p>
                <ul className="claim-list compact-claims">
                  {boundClaims(group.claimIds).map(claim => (
                    <ClaimLine key={claim.claim_id} claim={claim} open={open} details />
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </section>
  );
}
