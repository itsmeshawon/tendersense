/**
 * Rule-based requirement extractor. See Phase 4 plan §3 — we deliberately
 * avoid an LLM for MVP; regex + a small pattern library covers the tender
 * language BRAC IT actually sees.
 */
import type {
  ExtractedRequirement,
  RequirementCategory,
  RequirementThreshold,
} from "./types";

interface PatternDef {
  id: string;
  category: RequirementCategory;
  regex: RegExp;
  confidence: number;
  build: (
    m: RegExpExecArray,
    ctx: { mandatory: boolean },
  ) => {
    normalizedKey?: string;
    threshold?: RequirementThreshold;
  } | null;
}

const MANDATORY_HINTS = /\b(must|shall|required|mandatory|is\s+required)\b/i;

function isMandatoryNear(text: string, index: number): boolean {
  const start = Math.max(0, index - 60);
  const end = Math.min(text.length, index + 80);
  return MANDATORY_HINTS.test(text.slice(start, end));
}

function parseNumber(s: string): number {
  return Number(s.replace(/,/g, ""));
}

const PATTERNS: PatternDef[] = [
  {
    id: "iso_cert",
    category: "certification",
    regex: /\bISO\s*(\d{4,5})\b/gi,
    confidence: 0.95,
    build: (m) => ({ normalizedKey: `iso_${m[1]}` }),
  },
  {
    id: "cmmi_level",
    category: "certification",
    regex: /\bCMMI[\s-]*(?:Level|Lvl)?\s*(\d)\b(?:\s*\(([A-Za-z]+)\))?/gi,
    confidence: 0.92,
    build: (m) => {
      const level = Number(m[1]);
      const flavor = (m[2] ?? "dev").toLowerCase();
      const key = flavor.startsWith("svc") ? "cmmi_svc" : "cmmi_dev";
      return {
        normalizedKey: key,
        threshold: { operator: "gte", value: level, unit: "level" },
      };
    },
  },
  {
    id: "min_years_experience",
    category: "experience",
    regex:
      /\b(?:minimum\s+of\s+|at\s+least\s+)?(\d{1,2})\s*(?:\+)?\s*years?\s+(?:of\s+)?experience\b/gi,
    confidence: 0.9,
    build: (m) => ({
      normalizedKey: "min_years_experience",
      threshold: { operator: "gte", value: parseNumber(m[1]), unit: "years" },
    }),
  },
  {
    id: "min_similar_projects",
    category: "experience",
    regex:
      /\b(?:at\s+least\s+|minimum\s+of\s+|completed\s+)(\d{1,3})\s+similar\s+projects?\b/gi,
    confidence: 0.9,
    build: (m) => ({
      normalizedKey: "min_similar_projects",
      threshold: {
        operator: "gte",
        value: parseNumber(m[1]),
        unit: "projects",
      },
    }),
  },
  {
    id: "sector_experience",
    category: "experience",
    regex:
      /\b(government|public[\s-]sector|banking|healthcare|telecom|education)[\s-]+sector\s+experience\b/gi,
    confidence: 0.7,
    build: (m) => ({
      normalizedKey: `sector_${m[1].toLowerCase().replace(/[\s-]/g, "_")}`,
    }),
  },
  {
    id: "annual_turnover",
    category: "financial",
    regex:
      /\bannual\s+turnover[^.]*?(?:BDT|USD|EUR|GBP|INR|Tk\.?|৳)\s*([\d,]+(?:\.\d+)?)/gi,
    confidence: 0.88,
    build: (m) => ({
      normalizedKey: "min_annual_turnover",
      threshold: { operator: "gte", value: parseNumber(m[1]), unit: "money" },
    }),
  },
  {
    id: "audited_financials",
    category: "financial",
    regex: /\baudited\s+financial\s+statements?\b/gi,
    confidence: 0.9,
    build: () => ({ normalizedKey: "audited_financials" }),
  },
  {
    id: "registered_country",
    category: "geography",
    regex:
      /\b(?:registered|incorporated|operating)\s+(?:and\s+(?:registered|incorporated|operating)\s+)?in\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)/g,
    confidence: 0.75,
    build: (m) => ({
      normalizedKey: `country_${m[1].toLowerCase().replace(/\s+/g, "_")}`,
    }),
  },
  {
    id: "submission_hard_copy",
    category: "submission",
    regex: /\bhard[\s-]cop(?:y|ies)\b/gi,
    confidence: 0.85,
    build: () => ({ normalizedKey: "submission_hard_copy" }),
  },
  {
    id: "submission_soft_copy",
    category: "submission",
    regex: /\bsoft[\s-]cop(?:y|ies)\b/gi,
    confidence: 0.85,
    build: () => ({ normalizedKey: "submission_soft_copy" }),
  },
];

function sentenceAround(text: string, index: number): string {
  const start = text.lastIndexOf(".", index - 1);
  const endDot = text.indexOf(".", index);
  const from = start === -1 ? 0 : start + 1;
  const to = endDot === -1 ? text.length : endDot + 1;
  return text.slice(from, to).trim();
}

export function extractRequirements(text: string): ExtractedRequirement[] {
  const out: ExtractedRequirement[] = [];

  for (const p of PATTERNS) {
    const re = new RegExp(p.regex.source, p.regex.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const mandatory = isMandatoryNear(text, m.index);
      const built = p.build(m, { mandatory });
      if (!built) continue;
      const snippet = sentenceAround(text, m.index) || m[0];
      out.push({
        category: p.category,
        text: snippet,
        normalizedKey: built.normalizedKey,
        mandatory,
        threshold: built.threshold,
        sourceLocation: `${m.index}-${m.index + m[0].length}`,
        confidence: p.confidence,
        patternId: p.id,
      });
    }
  }

  return out;
}
