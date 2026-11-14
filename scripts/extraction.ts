import { load } from "cheerio";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { Source } from "./corpus.js";

function jsonText(value: unknown, section = ""): string[] {
  if (typeof value === "string") return [`[[${section}]]\n${value}`];
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) =>
    jsonText(child, section ? `${section}.${key}` : key));
}

async function pdfText(bytes: Uint8Array, range?: [number, number]): Promise<string> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const resolve = createRequire(import.meta.url).resolve;
  const pdfRoot = dirname(resolve("pdfjs-dist/package.json"));
  const options = {
    data: new Uint8Array(bytes),
    isEvalSupported: false,
    standardFontDataUrl: join(pdfRoot, "standard_fonts") + "/",
    cMapUrl: join(pdfRoot, "cmaps") + "/",
    cMapPacked: true,
  };
  const task = getDocument(options);
  try {
    const pdf = await task.promise;
    const [first, last] = range ?? [1, pdf.numPages];
    if (first < 1 || last < first || last > pdf.numPages) throw new Error("Invalid PDF page range");
    const pages: string[] = [];
    for (let number = first; number <= last; number++) {
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      const body = content.items.map(item => "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "").join("");
      pages.push(`[[page ${number}]]\n${body.trim()}`);
      page.cleanup();
    }
    return pages.join("\n\n");
  } finally {
    await task.destroy();
  }
}

export async function extractText(bytes: Uint8Array, source: Pick<Source, "extraction_method" | "pages" | "html_selector">): Promise<string> {
  const decoded = () => Buffer.from(bytes).toString("utf8");
  let text: string;
  switch (source.extraction_method) {
    case "pdfjs":
      text = await pdfText(bytes, source.pages);
      break;
    case "json":
      text = jsonText(JSON.parse(decoded())).join("\n\n");
      break;
    case "html": {
      const $ = load(decoded());
      $("script, style, nav, header, footer, noscript").remove();
      const article = $(source.html_selector ?? "article, main").first();
      const blocks = source.html_selector
        ? $(source.html_selector).toArray()
        : article.find("h1,h2,h3,h4,p,li,blockquote,figcaption").toArray();
      text = blocks.map(block => $(block).text().replace(/\s+/gu, " ").trim()).filter(Boolean).join("\n\n");
      break;
    }
  }
  if (!text.replace(/\[\[page \d+\]\]/gu, "").trim()) throw new Error("Extraction produced no readable text");
  return text.trim() + "\n";
}
