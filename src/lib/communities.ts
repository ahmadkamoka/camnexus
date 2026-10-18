import { reportedNeeds, activeRequests, requestName } from "./resource-requests";
import type { Need, School, Verification } from "./impact";
import { criticalityOf, criticalityLevelForScore, type CriticalityLevel } from "./criticality";

/** Approximate town-centre coordinates (not school locations). */
export const TOWN_COORDS: Record<string, [number, number]> = {
  "yaounde": [3.848, 11.502], "douala": [4.051, 9.768], "bafoussam": [5.478, 10.418], "bertoua": [4.577, 13.684],
  "garoua": [9.301, 13.397], "maroua": [10.591, 14.316], "ngaoundere": [7.322, 13.584], "bamenda": [5.96, 10.146],
  "buea": [4.155, 9.241], "limbe": [4.023, 9.199], "kumba": [4.636, 9.446], "ebolowa": [2.9, 11.15],
  "kribi": [2.94, 9.91], "mbalmayo": [3.517, 11.5], "kousseri": [12.077, 15.031], "dschang": [5.444, 10.053],
  "foumban": [5.727, 10.9], "nkongsamba": [4.954, 9.94], "edea": [3.8, 10.133], "batouri": [4.433, 14.367],
  "mokolo": [10.74, 13.802], "kumbo": [6.2, 10.68], "sangmelima": [2.933, 11.983], "meiganga": [6.517, 14.3],
  "tibati": [6.467, 12.633], "guider": [9.933, 13.95], "yagoua": [10.343, 15.233], "abong-mbang": [3.983, 13.183],
};

export const keyOf = (name: string) =>
  name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");

export type Level = "critical" | "high" | "moderate" | "low" | "insufficient";
export const LEVELS: { key: Level; label: string; range: string }[] = [
  { key: "critical", label: "Critical", range: "80–100" },
  { key: "high", label: "High", range: "60–79" },
  { key: "moderate", label: "Moderate", range: "40–59" },
  { key: "low", label: "Low", range: "0–39" },
  { key: "insufficient", label: "Insufficient information", range: "—" },
];
export const levelColor = (l: Level) => `var(--priority-${l === "insufficient" ? "unknown" : l})`;

export function levelOf(score: number | null): Level {
  if (score === null) return "insufficient";
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "moderate";
  return "low";
}

export interface Community {
  key: string;
  name: string;
  region: string;
  coords: [number, number] | null;
  schools: School[];
  /** Highest preliminary criticality among schools with active submitted requests. */
  points: number | null;
  level: CriticalityLevel;
  /** Schools in this community with at least one active submitted request. */
  assessed: number;
  students: number;
  resourceNeeds: string[];
  topNeeds: { need: Need; count: number }[];
  challenges: string[];
  verified: number;
  unverified: number;
  underReview: number;
}

export function buildCommunities(schools: School[]): Community[] {
  const groups = new Map<string, School[]>();
  for (const s of schools) {
    const name = s.community?.trim();
    const k = name ? keyOf(name) : `__unknown__${s.region}`;
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }
  return [...groups.entries()].map(([key, list]) => {
    const crits = list.map(criticalityOf).filter((x) => x.points !== null);
    const points = crits.length ? Math.max(...crits.map((x) => x.points ?? 0)) : null;
    const level: CriticalityLevel = points === null ? "not_assessed"
      : criticalityLevelForScore(points);
    const needCount = new Map<Need, number>();
    list.forEach((s) => reportedNeeds(s).forEach((n) => needCount.set(n, (needCount.get(n) ?? 0) + 1)));
    const topNeeds = [...needCount.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([need, count]) => ({ need, count }));
    const ch: [string, number][] = [
      ["No electricity", list.filter((s) => s.electricity === "none").length],
      ["Intermittent electricity", list.filter((s) => s.electricity === "intermittent").length],
      ["No internet", list.filter((s) => s.internet === "none").length],
      ["Limited internet", list.filter((s) => s.internet === "limited").length],
      ["No working computers", list.filter((s) => (s.workingComputers ?? s.computers) === 0).length],
      ["Power/internet status unknown", list.filter((s) => s.electricity === "unknown" || s.internet === "unknown").length],
    ];
    const v = (st: Verification) => list.filter((s) => (s.verification ?? "unverified") === st).length;
    const first = list[0];
    const named = first?.community?.trim();
    const regions = [...new Set(list.map((s) => s.region))];
    return {
      key, name: named || `Unspecified community (${first?.region ?? "Unknown"})`, region: regions.join(", "),
      coords: named ? TOWN_COORDS[keyOf(named)] ?? null : null,
      schools: list, points, level, assessed: crits.length, students: list.reduce((a, s) => a + s.students, 0),
      resourceNeeds: [...new Set(list.flatMap((s) => activeRequests(s).map(requestName)))],
      topNeeds, challenges: ch.filter(([, n]) => n > 0).map(([t, n]) => `${t} (${n})`),
      verified: v("verified"), underReview: v("under_review"), unverified: v("unverified") + v("pending_review"),
    };
  }).sort((a, b) => (b.points ?? -1) - (a.points ?? -1) || a.name.localeCompare(b.name));
}

/** Marker radius by students, clamped for readability. */
export const markerRadius = (students: number) => Math.round(Math.min(20, Math.max(7, 4 + Math.sqrt(students) * 0.45)));
