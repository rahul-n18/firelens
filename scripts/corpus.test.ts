import { cp, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";
import { corpus, readJson, root, type Claim, type Source } from "./corpus.js";
import { extractText } from "./extraction.js";
import { checkClaims, normalize, verifyCorpus } from "./verification.js";

let fixtureClaim: Claim;
let fixtureSource: Source;
let fixtureText: Map<string, string>;
let topics: Set<string>;

beforeAll(async () => {
  const claims = await readJson<Claim[]>(join(corpus, "claims.json"));
  const manifest = await readJson<Source[]>(join(corpus, "manifest.json"));
  fixtureClaim = claims.find(claim => claim.claim_id === "SAMER-002")!;
  fixtureSource = manifest.find(source => source.source_id === fixtureClaim.source_id)!;
  fixtureText = new Map([[fixtureSource.source_id, await readFile(
    join(corpus, "text", `${fixtureSource.source_id}.txt`), "utf8",
  )]]);
  topics = new Set(fixtureClaim.topics);
});

function verifyClaim(patch: Partial<Claim> = {}, sources = [fixtureSource]): string[] {
  return checkClaims([{ ...fixtureClaim, ...patch }], sources, fixtureText, topics);
}

describe("claim verifier", () => {
  test("matches all LUCI and FM2 excerpts to the citation page without punctuation normalization", async () => {
    const sourceId = "NTRS-20250010653-ABSTRACT";
    const sources = await readJson<Source[]>(join(corpus, "manifest.json"));
    const source = sources.find(item => item.source_id === sourceId)!;
    const text = await extractText(await readFile(join(corpus, source.raw_file)), source);
    const claims = await readJson<Claim[]>(join(corpus, "claims.json"));
    const cited = claims.filter(claim => claim.claim_id.startsWith("LUCI-") || claim.claim_id === "PLANNED-002");
    expect(cited).toHaveLength(5);
    for (const claim of cited) {
      expect(claim.source_id).toBe(sourceId);
      expect(claim.review.status).toBe("DRAFT");
      expect(text).toContain(claim.source_excerpt);
    }
    expect(cited.find(claim => claim.claim_id === "LUCI-004")!.source_excerpt).toContain("NASA’s");
  });

  test("keeps hardcoded measurements out of rendered component code", async () => {
    const componentFiles = (await Promise.all(["app", "components"].map(async directory =>
      (await readdir(join(root, directory), { recursive: true }))
        .filter(file => /\.tsx?$/u.test(file)).map(file => join(directory, file)),
    ))).flat();
    for (const file of componentFiles) {
      const text = await readFile(join(root, file), "utf8");
      expect(text.match(/\d+\s?(?:nm\b|[µμ]m\b|cm\/s\b|%)/gu) ?? [], file).toEqual([]);
    }
  });

  test("matches normalized text but preserves numeric token boundaries", () => {
    expect(normalize(" A curly ‘quote’ and ﬂight de- \r\n tectors ")).toBe("A curly 'quote' and flight detectors");
    expect(verifyClaim()).toEqual([]);
    expect(verifyClaim({ value: 6 })).toContain("SAMER-002: numeric token 6 is absent from the excerpt");
  });

  test("rejects an altered excerpt", () => {
    const source_excerpt = fixtureClaim.source_excerpt.replace("successfully", "unsuccessfully");
    expect(verifyClaim({ source_excerpt })).toContain("SAMER-002: excerpt is absent from extracted text");
  });

  test("rejects a number absent from the claim excerpt", () => {
    expect(verifyClaim({ claim_text: "SAME-R completed 67 flight test points." }))
      .toContain("SAMER-002: numeric token 67 is absent from the excerpt");
  });

  test("requires separate units and preserves bounds", async () => {
    const claims = await readJson<Claim[]>(join(corpus, "claims.json"));
    const bound = claims.find(claim => claim.claim_id === "SAME-004")!;
    const measure = { ...fixtureClaim, source_excerpt: bound.source_excerpt, claim_text: bound.claim_text };
    const check = (patch: Partial<Claim>) => checkClaims(
      [{ ...measure, value: bound.value, unit: bound.unit, ...patch }],
      [fixtureSource], new Map([[fixtureSource.source_id, bound.source_excerpt]]), topics,
    );
    expect(check({ value_qualifier: "greater_than" })).toEqual([]);
    expect(check({})).toContain("SAMER-002: value_qualifier must match the bound stated in the excerpt");
    expect(check({ value_qualifier: "less_than" })).toContain("SAMER-002: value_qualifier must match the bound stated in the excerpt");
    expect(check({ value: "500 nm" })).toContain(
      "SAMER-002: value must be a number or an en dash separated numeric range, with the unit stored separately",
    );
  });

  test("rejects an inference without evidence IDs", () => {
    expect(verifyClaim({ claim_status: "TEAM_INFERENCE" }))
      .toContain("SAMER-002: TEAM_INFERENCE requires derived_from");
  });

  test("rejects a source missing from the manifest", () => {
    expect(verifyClaim({}, [])).toContain("SAMER-002: source PSI-101 is missing from the manifest");
  });

  test("requires a reviewer for human review", () => {
    expect(verifyClaim({ review: { status: "HUMAN_REVIEWED", reviewer: null, date: null } }))
      .toContain("SAMER-002: HUMAN_REVIEWED requires a reviewer name");
  });

  test("rejects a PDF page locator that does not contain the evidence", async () => {
    const id = "NTRS-20140006585";
    const [claims, sources, extracted] = await Promise.all([
      readJson<Claim[]>(join(corpus, "claims.json")),
      readJson<Source[]>(join(corpus, "manifest.json")),
      readFile(join(corpus, "text", `${id}.txt`), "utf8"),
    ]);
    const claim = claims.find(row => row.claim_id === "NTRS13-001")!;
    expect(checkClaims(
      [{ ...claim, source_location: "PDF page 1" }],
      sources, new Map([[id, extracted]]), new Set(claim.topics),
    )).toContain("NTRS13-001: excerpt is absent from extracted text");
  });

  test("rejects a raw checksum mismatch and names affected claims", async () => {
    const directory = await mkdtemp(join(tmpdir(), "firelens-verifier-"));
    try {
      await cp(corpus, directory, { recursive: true });
      await writeFile(join(directory, fixtureSource.raw_file), "{}");
      const { errors } = await verifyCorpus(directory, join(root, "public"));
      expect(errors).toContain("PSI-101, SAMER-001, SAMER-002, SAMER-003, SAMER-010, SAMER-011: raw SHA-256 mismatch");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }, 20_000);

  test("passes without local-only files and rejects a corrupt local-only PDF", async () => {
    const directory = await mkdtemp(join(tmpdir(), "firelens-public-corpus-"));
    try {
      const sources = await readJson<Source[]>(join(corpus, "manifest.json"));
      const local = sources.filter(source => source.local_only);
      const privatePaths = new Set(local.flatMap(source => [
        join(corpus, source.raw_file), join(corpus, "text", `${source.source_id}.txt`),
      ]));
      await cp(corpus, directory, { recursive: true, filter: path => !privatePaths.has(path) });
      const result = await verifyCorpus(directory, join(root, "public"));
      expect(result.errors).toEqual([]);
      expect([...result.skippedSources]).toEqual(local.map(source => source.source_id));
      await writeFile(join(directory, "raw/NIST-SAME.pdf"), "invalid PDF");
      const corrupt = await verifyCorpus(directory, join(root, "public"));
      expect(corrupt.skippedSources.has("NIST-SAME")).toBe(false);
      expect(corrupt.errors).toContain("NIST-SAME, SAME-003, SAME-006: raw SHA-256 mismatch");
      expect(corrupt.errors).toContain("SAE-2009-01-2468, SAME-004: raw SHA-256 mismatch");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }, 20_000);
});
