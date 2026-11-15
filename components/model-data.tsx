"use client";

import { useState } from "react";
import { formatClaimValue } from "../lib/claim-values";
import { gravityLabels, type Claim } from "../lib/evidence";
import { downloadEvidence, evidenceCsv, modelDataJson } from "../lib/export";
import { airflowLabel, materialsLabel, modelerRows } from "../lib/insights";
import { Chip, Mark, type OpenClaim } from "./evidence-ui";

export function ModelData({ evidence, open }: { evidence: Claim[]; open: OpenClaim }) {
  const [notice, setNotice] = useState("");
  const rows = modelerRows(evidence);
  function download(format: "csv" | "json") {
    const content = format === "csv" ? evidenceCsv(null, rows) : modelDataJson(rows);
    downloadEvidence(content, format, "firelens-model-data");
    setNotice(`Downloaded ${format.toUpperCase()}.`);
  }

  return <section className="block" id="data" aria-labelledby="data-heading">
    <h2 className="block-title" id="data-heading">Data for fire modelers</h2>
    <p className="section-intro">Download the extracted values with their conditions, materials, gravity, airflow, and sources. Flammability claims are included even when no numeric value has been extracted.</p>
    {rows.length === 0 ? <p className="muted">No verified structured values in our sources.</p> : <>
      <div className="model-data-scroll" tabIndex={0} role="region" aria-label="Structured values">
        <table className="model-data">
          <thead><tr>
            <th scope="col">Quantity</th><th scope="col">Value</th><th scope="col">Conditions</th>
            <th scope="col">Materials</th><th scope="col">Gravity</th><th scope="col">Airflow</th>
            <th scope="col">Evidence</th><th scope="col">Source</th>
          </tr></thead>
          <tbody>{rows.map(claim => <tr key={claim.claim_id} data-structured-claim={claim.claim_id}>
            <th scope="row">{claim.quantity ?? "Not specified"}</th>
            <td className="model-value">{formatClaimValue(claim) || "Not specified"}</td>
            <td>{claim.conditions ?? "Not specified"}</td>
            <td>{materialsLabel(claim)}</td>
            <td>{gravityLabels[claim.gravity_level]}</td>
            <td>{airflowLabel(claim)}</td>
            <td><Mark claim={claim} /></td>
            <td><Chip claim={claim} open={open} /></td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="evidence-actions">
        <button type="button" className="text-button" onClick={() => download("csv")}>Download CSV</button>
        <button type="button" className="text-button" onClick={() => download("json")}>Download JSON</button>
        <span className="small muted" role="status">{notice}</span>
      </div>
    </>}
  </section>;
}
