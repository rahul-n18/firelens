import { gravityLabels, platformLabels, type Claim } from "../lib/evidence";
import { claimKind } from "../lib/claim-kind";

export type OpenClaim = (claim: Claim) => void;

export function Mark({ claim }: { claim: Claim }) {
  const kind = claimKind(claim);
  return <span className="evidence-label"><span aria-hidden="true" className={`mark ${kind.markClass}`} />{kind.label}</span>;
}

export function Chip({ claim, open }: { claim: Claim; open: OpenClaim }) {
  return <button type="button" className="claim-chip" data-claim-id={claim.claim_id}
    onClick={() => open(claim)} aria-label={`Inspect ${claim.claim_id}`}>{claim.claim_id}</button>;
}

export function ClaimLine({ claim, open, details }: { claim: Claim; open: OpenClaim; details?: boolean }) {
  return <li className="claim-line">
    <div className="claim-meta"><Mark claim={claim} />{details && <span>{platformLabels[claim.platform]}, {gravityLabels[claim.gravity_level]}</span>}
      <DraftLabel claim={claim} /></div>
    <p><span data-claim-text={claim.claim_id}>{claim.claim_text}</span> <Chip claim={claim} open={open} /></p>
    {details && claim.conditions && <p className="small muted">{claim.conditions}</p>}
  </li>;
}

export function DraftLabel({ claim }: { claim: Claim }) {
  return claim.review.status === "DRAFT" ? <span className="review-label">Not yet reviewed</span> : null;
}
