import type { Claim } from "../scripts/corpus";

const prefixes = {
  greater_than: ">",
  less_than: "<",
  approximately: "≈",
  range: "",
  typically: "typically ",
};

export function formatClaimValue(claim: Claim, { headline = false } = {}) {
  if (claim.value === undefined) return "";
  const qualifier = claim.value_qualifier;
  const prefix = qualifier && !(headline && qualifier === "typically") ? prefixes[qualifier] : "";
  const text = String(claim.value);
  const value = headline ? text.charAt(0).toUpperCase() + text.slice(1) : text;
  return prefix + value + (claim.unit ? ` ${claim.unit}` : "");
}

export function particleSizeBounds(claim: Claim): [number, number] | undefined {
  if (claim.value === undefined || !["nm", "µm", "μm"].includes(claim.unit ?? "")) return;
  const scale = claim.unit === "nm" ? 1 / 1000 : 1;
  const [lower, upper = lower] = String(claim.value).split("–").map(Number);
  if (!Number.isFinite(lower) || !Number.isFinite(upper)) return;
  return [lower * scale, upper * scale];
}
