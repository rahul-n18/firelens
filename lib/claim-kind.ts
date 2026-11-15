import type { Claim } from "../scripts/corpus";
import { isMeasurement, statusLabels } from "./evidence";

export type ClaimKindId =
  | "challenge_context"
  | "planned_test_condition"
  | "equipment"
  | "measured"
  | "method"
  | "model"
  | "earth_application"
  | "objective"
  | "authors_statement"
  | "authors_suggestion"
  | "planned"
  | "inference"
  | "not_established";

export interface ClaimKind {
  id: ClaimKindId;
  label: string;
  markClass: string;
  measured: boolean;
  notice?: string;
}

export function claimKind(claim: Claim): ClaimKind {
  if (claim.source_id === "SPACEAPPS-2026-FIF" || claim.evidence_label === "Challenge context") {
    return {
      id: "challenge_context",
      label: "Challenge context",
      markClass: "challenge_context",
      measured: false,
      notice: "This is challenge-statement context, not a NASA measurement.",
    };
  }
  if (claim.evidence_label === "Planned test condition") {
    return {
      id: "planned_test_condition",
      label: "Planned test condition",
      markClass: "objective_or_hypothesis",
      measured: false,
      notice: "This is a planned or proposed test condition, not a measured result.",
    };
  }
  if (claim.evidence_label === "Equipment specification") {
    return { id: "equipment", label: "Equipment specification", markClass: "reported_method", measured: false };
  }
  if (claim.evidence_label === "Earth application") {
    return { id: "earth_application", label: "Earth application", markClass: "objective_or_hypothesis", measured: false };
  }
  if (claim.evidence_label === "Authors' statement") {
    return { id: "authors_statement", label: "Authors' statement", markClass: "objective_or_hypothesis", measured: false };
  }
  if (claim.evidence_label === "Authors' suggestion") {
    return { id: "authors_suggestion", label: "Authors' suggestion", markClass: "objective_or_hypothesis", measured: false };
  }
  if (claim.evidence_label === "Planned (as of Dec 2025)" || claim.evidence_label === "Planned (as of 2021)") {
    return { id: "planned", label: claim.evidence_label, markClass: "objective_or_hypothesis", measured: false };
  }
  if (isMeasurement(claim)) {
    return { id: "measured", label: "Measured result", markClass: "reported_result", measured: true };
  }
  if (claim.claim_status === "REPORTED_METHOD") {
    return { id: "method", label: statusLabels.REPORTED_METHOD, markClass: "reported_method", measured: false };
  }
  if (claim.claim_status === "MODEL_RESULT") {
    return { id: "model", label: statusLabels.MODEL_RESULT, markClass: "model_result", measured: false };
  }
  if (claim.claim_status === "TEAM_INFERENCE") {
    return { id: "inference", label: statusLabels.TEAM_INFERENCE, markClass: "team_inference", measured: false };
  }
  if (claim.claim_status === "NOT_ESTABLISHED") {
    return { id: "not_established", label: statusLabels.NOT_ESTABLISHED, markClass: "not_established", measured: false };
  }
  return { id: "objective", label: statusLabels.OBJECTIVE_OR_HYPOTHESIS, markClass: "objective_or_hypothesis", measured: false };
}

export function kindLabel(claim: Claim) {
  return claimKind(claim).label;
}
