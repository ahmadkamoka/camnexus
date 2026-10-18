import type { School } from "./impact";
import type { ResourceRequest } from "./resource-requests";

const time = (at?: string) => at && Number.isFinite(Date.parse(at)) ? Date.parse(at) : -1;
const snapshotOf = (school: School): Omit<School, "history"> => {
  const { history: _history, ...snapshot } = school;
  return JSON.parse(JSON.stringify(snapshot));
};

/** Requests belong to one submission, never a union of historical versions. */
export function currentAssessment(school: School): School {
  const latest = school.history?.filter((e) => e.kind === "submission" && e.snapshot)
    .reduce<NonNullable<School["history"]>[number] | undefined>((best, e) =>
      !best || time(e.at) >= time(best.at) ? e : best, undefined);
  const topAt = school.requests?.reduce<string | undefined>((best, r) =>
    time(r.submittedAt) > time(best) ? r.submittedAt : best, undefined);
  if (!school.assessmentSubmittedAt && latest?.snapshot && time(latest.at) >= time(topAt)) {
    const source = latest.snapshot;
    const requests = source.requests?.map((r) => {
      const reviewed = school.requests?.find((p) => p.id === r.id && p.submittedAt === r.submittedAt);
      return reviewed ? { ...r, status: reviewed.status, reviewHistory: reviewed.reviewHistory } : r;
    });
    if (time(latest.at) === time(topAt) && JSON.stringify(requests) === JSON.stringify(school.requests)) return school;
    return { ...school, ...(time(latest.at) > time(topAt) ? source : {}), requests,
      needs: source.needs, urgentNeed: source.urgentNeed, history: school.history,
      assessmentSubmittedAt: latest.at };
  }
  if (!topAt) return school;
  const at = school.assessmentSubmittedAt ?? topAt;
  const requests = school.requests?.filter((r) => !r.submittedAt || r.submittedAt === at);
  if (requests?.length === school.requests?.length) return school;
  return { ...school, assessmentSubmittedAt: at, requests };
}

/** Losslessly archive legacy mixed request cohorts before projecting the current one. */
export function normalizeAssessmentVersions(school: School): School {
  const history = [...(school.history ?? [])];
  const cohorts = new Map<string, ResourceRequest[]>();
  for (const request of school.requests ?? []) {
    if (!request.submittedAt) continue;
    cohorts.set(request.submittedAt, [...(cohorts.get(request.submittedAt) ?? []), request]);
  }
  for (const [at, requests] of cohorts) {
    const represented = history.some((e) => e.snapshot?.requests && requests.every((r) =>
      e.snapshot?.requests?.some((p) => JSON.stringify(p) === JSON.stringify(r))));
    if (!represented && (cohorts.size > 1 || history.length > 0)) {
      history.push({ at, status: school.verification ?? "unverified",
        kind: history.some((e) => e.kind === "submission" && e.at === at) ? "review" : "submission",
        snapshot: snapshotOf({ ...school, requests, assessmentSubmittedAt: at }) });
    }
  }
  const projected = currentAssessment(history.length !== (school.history?.length ?? 0) ? { ...school, history } : school);
  const unrecorded = school.requests?.filter((r) => !r.submittedAt && !projected.requests?.some((p) => p.id === r.id));
  if (unrecorded?.length && projected.assessmentSubmittedAt) {
    history.push({ at: projected.assessmentSubmittedAt, kind: "review", status: school.verification ?? "unverified",
      snapshot: snapshotOf(school) });
    return { ...projected, history };
  }
  return projected;
}

/** Older duplicate rows become inactive snapshots, not duplicate schools or merged needs. */
export function normalizeSchoolVersions(schools: School[]): School[] {
  const groups = new Map<string, School[]>();
  for (const school of schools) groups.set(school.id, [...(groups.get(school.id) ?? []), school]);
  return [...groups.values()].map((versions) => {
    const first = versions[0];
    if (!first) throw new Error("Missing school version");
    if (versions.length === 1) return normalizeAssessmentVersions(first);
    const normalized = versions.map(normalizeAssessmentVersions);
    const submittedAt = (s: School) => s.assessmentSubmittedAt ?? s.requests?.reduce<string | undefined>((best, r) => time(r.submittedAt) > time(best) ? r.submittedAt : best, undefined);
    const latest = normalized.reduce((best, s) => time(submittedAt(s)) >= time(submittedAt(best)) ? s : best);
    const history: NonNullable<School["history"]> = [];
    const append = (event: NonNullable<School["history"]>[number]) => {
      if (!history.some((e) => JSON.stringify(e) === JSON.stringify(event))) history.push(event);
    };
    versions.forEach((s, i) => {
      const version = normalized[i];
      version?.history?.forEach(append);
      const at = version ? submittedAt(version) : undefined;
      if (at) append({ at, kind: "submission", status: s.verification ?? "unverified", snapshot: snapshotOf(s) });
    });
    return { ...latest, history: history.sort((a, b) => time(a.at) - time(b.at)) };
  });
}