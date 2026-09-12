/**
 * Deterministic per-requirement evaluator. SoT §22 5-status set.
 *
 * Golden rule: **unknown must never become `gap`.** When the profile
 * doesn't carry the relevant field, return `needs_verification` so the
 * bid team can fill it in rather than seeing a false negative.
 */
import type {
  EvaluationStatus,
  ExtractedRequirement,
  RequirementThreshold,
} from "./types";

export interface WorkspaceCredential {
  normalizedKey: string | null;
  name: string;
  status: "valid" | "expired" | "revoked";
  expiryDate: string | null;
  id?: string;
}

export interface WorkspacePastProject {
  title: string;
  sector: string | null;
  id?: string;
}

export interface WorkspaceFinancials {
  annualRevenue: number | null;
  hasAudited: boolean;
}

export interface WorkspaceSnapshot {
  credentials: WorkspaceCredential[];
  pastProjects: WorkspacePastProject[];
  financials: WorkspaceFinancials | null;
  workforce: { totalEmployees: number | null } | null;
  countryCode: string | null;
}

export interface RequirementEvaluation {
  status: EvaluationStatus;
  reasoning: string;
  evidenceRefs: string[];
}

const COUNTRY_KEY_TO_CODE: Record<string, string> = {
  bangladesh: "BD",
  india: "IN",
  pakistan: "PK",
  nepal: "NP",
  bhutan: "BT",
  sri_lanka: "LK",
  united_states: "US",
  united_kingdom: "GB",
};

function compare(op: RequirementThreshold["operator"], a: number, v: number) {
  switch (op) {
    case "gte":
      return a >= v;
    case "gt":
      return a > v;
    case "lte":
      return a <= v;
    case "lt":
      return a < v;
    case "eq":
      return a === v;
  }
}

export function evaluateRequirement(
  requirement: ExtractedRequirement,
  snapshot: WorkspaceSnapshot,
): RequirementEvaluation {
  const key = requirement.normalizedKey;

  if (!key) {
    return {
      status: "needs_verification",
      reasoning: "Requirement has no normalized key; manual review needed.",
      evidenceRefs: [],
    };
  }

  if (
    key === "submission_hard_copy" ||
    key === "submission_soft_copy" ||
    requirement.category === "submission"
  ) {
    return {
      status: "not_applicable",
      reasoning: "Submission mechanics do not affect eligibility.",
      evidenceRefs: [],
    };
  }

  if (key.startsWith("iso_") || key.startsWith("cmmi_")) {
    const matches = snapshot.credentials.filter((c) => c.normalizedKey === key);
    if (matches.length === 0) {
      return {
        status: "gap",
        reasoning: `No ${key.toUpperCase()} credential recorded for the workspace.`,
        evidenceRefs: [],
      };
    }
    const valid = matches.filter((c) => c.status === "valid");
    if (valid.length > 0) {
      return {
        status: "meets",
        reasoning: `Valid ${valid[0].name} credential on file.`,
        evidenceRefs: valid.map((c) => c.id ?? c.name),
      };
    }
    return {
      status: "needs_verification",
      reasoning:
        "A matching credential exists but is expired or revoked — confirm the current certificate.",
      evidenceRefs: matches.map((c) => c.id ?? c.name),
    };
  }

  if (key === "min_similar_projects") {
    const count = snapshot.pastProjects.length;
    const threshold = requirement.threshold?.value ?? 1;
    if (count === 0) {
      return {
        status: "gap",
        reasoning: `Requires ${threshold} similar projects; none recorded.`,
        evidenceRefs: [],
      };
    }
    if (count >= threshold) {
      return {
        status: "meets",
        reasoning: `${count} projects on file (threshold ${threshold}).`,
        evidenceRefs: snapshot.pastProjects.map((p) => p.id ?? p.title),
      };
    }
    return {
      status: "partially_meets",
      reasoning: `${count} projects on file; threshold ${threshold}.`,
      evidenceRefs: snapshot.pastProjects.map((p) => p.id ?? p.title),
    };
  }

  if (key === "min_years_experience") {
    return {
      status: "needs_verification",
      reasoning:
        "Firm-years-experience is not tracked in the workspace profile yet.",
      evidenceRefs: [],
    };
  }

  if (key.startsWith("sector_")) {
    const target = key.replace(/^sector_/, "");
    const hits = snapshot.pastProjects.filter((p) =>
      (p.sector ?? "").toLowerCase().includes(target),
    );
    if (hits.length > 0) {
      return {
        status: "meets",
        reasoning: `${hits.length} past project(s) in the ${target} sector.`,
        evidenceRefs: hits.map((p) => p.id ?? p.title),
      };
    }
    return snapshot.pastProjects.length === 0
      ? {
          status: "needs_verification",
          reasoning: "No past projects recorded; sector coverage unknown.",
          evidenceRefs: [],
        }
      : {
          status: "gap",
          reasoning: `No projects tagged with sector "${target}".`,
          evidenceRefs: [],
        };
  }

  if (key === "min_annual_turnover") {
    const fin = snapshot.financials;
    if (!fin || fin.annualRevenue == null) {
      return {
        status: "needs_verification",
        reasoning: "Annual revenue not on file — add it to Financials to evaluate.",
        evidenceRefs: [],
      };
    }
    const t = requirement.threshold;
    if (!t) {
      return {
        status: "needs_verification",
        reasoning: "Turnover requirement is missing a threshold value.",
        evidenceRefs: [],
      };
    }
    if (compare(t.operator, fin.annualRevenue, t.value)) {
      return {
        status: "meets",
        reasoning: `Reported turnover ${fin.annualRevenue} clears threshold ${t.value}.`,
        evidenceRefs: ["financials"],
      };
    }
    return {
      status: "gap",
      reasoning: `Reported turnover ${fin.annualRevenue} is below threshold ${t.value}.`,
      evidenceRefs: ["financials"],
    };
  }

  if (key === "audited_financials") {
    const fin = snapshot.financials;
    if (!fin) {
      return {
        status: "needs_verification",
        reasoning: "Financials profile not yet filled in.",
        evidenceRefs: [],
      };
    }
    return fin.hasAudited
      ? {
          status: "meets",
          reasoning: "Audited financial statements are on file.",
          evidenceRefs: ["financials"],
        }
      : {
          status: "gap",
          reasoning: "Financials record indicates audited statements are not available.",
          evidenceRefs: [],
        };
  }

  if (key.startsWith("country_")) {
    const wantSlug = key.replace(/^country_/, "");
    const wantCode = COUNTRY_KEY_TO_CODE[wantSlug];
    if (!snapshot.countryCode) {
      return {
        status: "needs_verification",
        reasoning: "Workspace country not set on the profile.",
        evidenceRefs: [],
      };
    }
    if (!wantCode) {
      return {
        status: "needs_verification",
        reasoning: `Cannot map country requirement "${wantSlug}" to an ISO code.`,
        evidenceRefs: [],
      };
    }
    return snapshot.countryCode === wantCode
      ? {
          status: "meets",
          reasoning: `Workspace registered in ${wantCode}.`,
          evidenceRefs: ["workspace.country_code"],
        }
      : {
          status: "gap",
          reasoning: `Requires registration in ${wantCode}; workspace is ${snapshot.countryCode}.`,
          evidenceRefs: [],
        };
  }

  return {
    status: "needs_verification",
    reasoning: `Rule engine has no evaluator for "${key}"; needs manual review.`,
    evidenceRefs: [],
  };
}
