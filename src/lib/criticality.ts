import { activeRequests, type ResourceCategory } from "./resource-requests";
import type { School } from "./impact";

/** The seven shared selection groups; the highest requested priority determines the score. */
export type CriticalityGroup =
  | "building-safety"
  | "water-sanitation"
  | "electricity"
  | "classroom-furniture"
  | "learning-materials"
  | "technology"
  | "other";

export const CRITICALITY_GROUP_POINTS: Record<CriticalityGroup, number> = {
  "building-safety": 5,
  "water-sanitation": 4,
  electricity: 3,
  "classroom-furniture": 2,
  "learning-materials": 1,
  technology: 1,
  other: 0,
};

export const CRITICALITY_GROUP_LABELS: Record<CriticalityGroup, string> = {
  "building-safety": "Building & Safety",
  "water-sanitation": "Water & Sanitation",
  electricity: "Electricity",
  "classroom-furniture": "Classroom Furniture",
  "learning-materials": "Learning Materials",
  technology: "Technology",
  other: "Other",
};

/** Maximum possible score: the highest category priority, never a sum. */
export const CRITICALITY_MAX = 5;

/** Legacy catalogue categories outside the seven groups are unclassified but still count as assessed. */
const CATEGORY_GROUP: Record<ResourceCategory, CriticalityGroup> = {
  "Classroom construction or repairs": "building-safety",
  "Water and sanitation": "water-sanitation",
  "Electricity and energy infrastructure": "electricity",
  "Classroom furniture": "classroom-furniture",
  "Books and educational materials": "learning-materials",
  "STEM and laboratory equipment": "learning-materials",
  "Digital equipment": "technology",
  Other: "other",
  "Internet and connectivity": "other",
  "Teacher training": "other",
};

export type CriticalityLevel = "critical" | "high" | "moderate" | "low" | "unclassified" | "not_assessed";

export const CRITICALITY_LEVELS: { key: CriticalityLevel; label: string; range: string }[] = [
  { key: "critical", label: "Critical", range: "5" },
  { key: "high", label: "High", range: "4" },
  { key: "moderate", label: "Moderate", range: "2–3" },
  { key: "low", label: "Low", range: "1" },
  { key: "unclassified", label: "Unclassified Needs", range: "—" },
  { key: "not_assessed", label: "Not Yet Assessed", range: "—" },
];

export const criticalityLevelLabel = (l: CriticalityLevel) => CRITICALITY_LEVELS.find((x) => x.key === l)?.label ?? "Not Yet Assessed";

export const criticalityLevelForScore = (score: number): CriticalityLevel =>
  score === 0 ? "unclassified" : score >= 5 ? "critical" : score === 4 ? "high" : score >= 2 ? "moderate" : "low";

/** Marker colours: red / orange / yellow / green / grey, via the existing priority tokens. */
export const criticalityColor = (l: CriticalityLevel) =>
  `var(--priority-${l === "unclassified" || l === "not_assessed" ? "unknown" : l})`;

export interface Criticality {
  /** Highest category priority (0–5); null when there are no active submitted requests. */
  points: number | null;
  level: CriticalityLevel;
  /** All distinct requested groups, highest priority first; lower groups remain requested. */
  groups: CriticalityGroup[];
}

/**
 * Preliminary criticality from a school's active submitted resource requests.
 * Only the highest category priority counts; resources and quantities are never changed or summed.
 * Drafts (no submittedAt) and rejected requests are ignored; only-Other submissions are
 * "Unclassified Needs" rather than a fabricated Low score.
 */
export function criticalityOf(school: School): Criticality {
  const submitted = activeRequests(school).filter((r) => r.submittedAt);
  if (!submitted.length) return { points: null, level: "not_assessed", groups: [] };
  const groups = [...new Set(submitted.map((r) => CATEGORY_GROUP[r.category] ?? "other"))]
    .sort((a, b) => CRITICALITY_GROUP_POINTS[b] - CRITICALITY_GROUP_POINTS[a]);
  const points = Math.max(...groups.map((g) => CRITICALITY_GROUP_POINTS[g]));
  const level = criticalityLevelForScore(points);
  return { points, level, groups };
}
