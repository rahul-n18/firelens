import { gravityLabels, platformLabels, sources, statusLabel, type Claim } from "./evidence";

export function citation(claim: Claim) {
  const source = sources.get(claim.source_id)!;
  return [source.authors.join(", "), source.title, source.year, claim.source_location,
    claim.doi ? `DOI ${claim.doi}` : null, claim.source_url].filter(Boolean).join(" · ");
}

export function evidenceBrief(query: string, claims: Claim[], gap?: string) {
  return [
    "FireLens evidence brief", query, gap,
    ...claims.map(claim => [
      `[${claim.claim_id}] ${statusLabel(claim)} · ${platformLabels[claim.platform]} · ${gravityLabels[claim.gravity_level]}`,
      claim.review.status === "DRAFT" && "Not yet reviewed",
      claim.investigation_id === null && "Investigation not identified by source",
      claim.claim_text, claim.conditions, claim.attribution_note, citation(claim),
    ].filter(Boolean).join("\n")),
  ].filter(Boolean).join("\n\n");
}

export function evidenceJson(query: string, claims: Claim[], gap?: string) {
  return JSON.stringify({ query, gap: gap ?? null, claims }, null, 2) + "\n";
}

export function evidenceCsv(query: string, claims: Claim[], gap?: string) {
  const fields = ["claim_id", "investigation_id", "claim_status", "platform", "gravity_level", "claim_text",
    "source_excerpt", "source_location", "source_url", "doi", "quantity", "value", "unit", "value_qualifier",
    "conditions", "attribution_note", "review_status", "reviewer", "review_date", "query", "gap"] as const;
  const cell = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[\s]*[=+@-]/u.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  const rows = claims.map(claim => fields.map(field => {
    if (field === "query") return query;
    if (field === "gap") return gap;
    if (field === "review_status") return claim.review.status;
    if (field === "reviewer") return claim.review.reviewer;
    if (field === "review_date") return claim.review.date;
    return claim[field];
  }).map(cell).join(","));
  return [fields.join(","), ...rows].join("\r\n") + "\r\n";
}
