import { gravityLabels, platformLabels, sources, type Claim } from "./evidence";
import { kindLabel } from "./claim-kind";

export function citation(claim: Claim) {
  const source = sources.get(claim.source_id)!;
  return [source.authors.join(", "), source.title, source.year, claim.source_location,
    claim.doi ? `DOI ${claim.doi}` : null, claim.source_url].filter(Boolean).join(" · ");
}

export function evidenceBrief(query: string, claims: Claim[], gap?: string) {
  return [
    "FireLens evidence brief", query, gap,
    ...claims.map(claim => [
      `[${claim.claim_id}] ${kindLabel(claim)} · ${platformLabels[claim.platform]} · ${gravityLabels[claim.gravity_level]}`,
      claim.investigation_id === null && "Investigation not identified by source",
      claim.claim_text, claim.conditions, claim.attribution_note, citation(claim),
    ].filter(Boolean).join("\n")),
  ].filter(Boolean).join("\n\n");
}

export function evidenceJson(query: string, claims: Claim[], gap?: string) {
  return JSON.stringify({ query, gap: gap ?? null, claims }, null, 2) + "\n";
}

export function modelDataJson(claims: Claim[]) {
  const rows = claims.map(claim => ({ ...claim, evidence_label: kindLabel(claim) }));
  return JSON.stringify({ claims: rows }, null, 2) + "\n";
}

export function downloadEvidence(data: string, format: "csv" | "json", filename: string) {
  const type = format === "csv" ? "text/csv;charset=utf-8" : "application/json";
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.${format}`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function evidenceCsv(query: string | null, claims: Claim[], gap?: string) {
  const claimFields = ["claim_id", "investigation_id", "claim_status", "evidence_label", "platform", "gravity_level", "claim_text",
    "source_excerpt", "source_location", "source_url", "doi", "quantity", "value", "unit", "value_qualifier",
    "conditions", "materials", "topics", "airflow_value", "airflow_unit", "airflow_gravity_level",
    "attribution_note"] as const;
  const fields = query === null ? claimFields : [...claimFields, "query", "gap"] as const;
  const cell = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[\s]*[=+@-]/u.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  const rows = claims.map(claim => fields.map(field => {
    if (field === "query") return query;
    if (field === "gap") return gap;
    if (field === "evidence_label") return kindLabel(claim);
    if (field === "materials") return claim.materials.join("; ");
    if (field === "topics") return claim.topics.join("; ");
    if (field === "airflow_value") return claim.airflow?.value;
    if (field === "airflow_unit") return claim.airflow?.unit;
    if (field === "airflow_gravity_level") return claim.airflow?.gravity_level;
    return claim[field];
  }).map(cell).join(","));
  return [fields.join(","), ...rows].join("\r\n") + "\r\n";
}
