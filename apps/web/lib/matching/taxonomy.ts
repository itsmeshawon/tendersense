/**
 * Capability taxonomy — the fixed 10 items from SoT §16.7. Custom
 * additions are not permitted until Pro tier (Phase 3 v2 §Q1 decision):
 * a shared vector space keeps every workspace's capabilities comparable.
 *
 * `signalWords` drives cold-start auto-derive (Phase 3 v2 §2b + Q7):
 * for each imported project, if ≥ 2 signal words hit the project's
 * title+description, the capability is suggested (not confirmed) in
 * the capabilities tab.
 */

export interface CapabilityDefinition {
  key: string;
  label: string;
  signalWords: string[];
}

export const CAPABILITY_TAXONOMY: readonly CapabilityDefinition[] = [
  {
    key: "software_dev",
    label: "Software development",
    signalWords: [
      "software",
      "application",
      "web",
      "backend",
      "frontend",
      "api",
      "development",
    ],
  },
  {
    key: "erp",
    label: "ERP",
    signalWords: ["erp", "sap", "oracle ebs", "financial", "ledger", "modules"],
  },
  {
    key: "networking",
    label: "Networking & connectivity",
    signalWords: [
      "network",
      "lan",
      "wan",
      "fiber",
      "router",
      "switch",
      "connectivity",
    ],
  },
  {
    key: "hardware_supply",
    label: "Hardware supply",
    signalWords: [
      "hardware",
      "server",
      "workstation",
      "printer",
      "supply of computer",
      "laptop",
      "desktop",
    ],
  },
  {
    key: "cloud_hosting",
    label: "Cloud & hosting",
    signalWords: [
      "cloud",
      "aws",
      "azure",
      "gcp",
      "hosting",
      "colocation",
      "vps",
    ],
  },
  {
    key: "ai_ml",
    label: "AI & data science",
    signalWords: [
      "ai",
      "machine learning",
      "ml",
      "data science",
      "analytics",
      "nlp",
      "model",
    ],
  },
  {
    key: "security",
    label: "Cybersecurity",
    signalWords: [
      "security",
      "cyber",
      "firewall",
      "penetration",
      "audit",
      "vulnerability",
      "siem",
    ],
  },
  {
    key: "training",
    label: "Training & capacity building",
    signalWords: [
      "training",
      "capacity building",
      "workshop",
      "certification",
      "learning",
    ],
  },
  {
    key: "consultancy",
    label: "Consultancy",
    signalWords: [
      "consultancy",
      "consulting",
      "advisory",
      "assessment",
      "strategy",
    ],
  },
  {
    key: "civil_works",
    label: "Civil works",
    signalWords: [
      "construction",
      "civil",
      "road",
      "bridge",
      "building",
      "works",
    ],
  },
];

export interface CapabilitySuggestion {
  key: string;
  label: string;
  confidence: number;
  hits: number;
}

/**
 * Cold-start heuristic: given a project, return the capabilities whose
 * signal-word hit count is ≥ 2 in the title + description. Ranked by
 * hit count desc; confidence = hits / signalWords.length clamped to
 * (0, 1].
 *
 * Word-boundary aware, case-insensitive (Phase 3 v2 §7 Q2 + Q7).
 */
export function bucketProjectToCapabilities(project: {
  title: string;
  description: string | null;
}): CapabilitySuggestion[] {
  const haystack = `${project.title ?? ""} ${project.description ?? ""}`;
  const suggestions: CapabilitySuggestion[] = [];
  for (const cap of CAPABILITY_TAXONOMY) {
    let hits = 0;
    for (const w of cap.signalWords) {
      if (containsWord(haystack, w)) hits += 1;
    }
    if (hits >= 2) {
      suggestions.push({
        key: cap.key,
        label: cap.label,
        hits,
        confidence: Math.min(1, hits / cap.signalWords.length),
      });
    }
  }
  return suggestions.sort((a, b) => b.hits - a.hits);
}

function containsWord(haystack: string, word: string): boolean {
  if (!word) return false;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b${escaped}\\b`, "i");
  return re.test(haystack);
}
