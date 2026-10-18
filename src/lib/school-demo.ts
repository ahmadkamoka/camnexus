import { infrastructureSchema, prepareSubmittedRequests, needsFromRequests, REQUEST_STATUSES, type RequestStatus } from "./resource-requests";
import { z } from "zod";
import { SAMPLE_SCHOOLS, normalizeSchool, type School, type Verification } from "./impact";
import { normalizeSchoolVersions } from "./assessment-versions";

export const SCHOOL_REGISTRY = SAMPLE_SCHOOLS.map((school, i) => ({
  id: school.id, registrationId: `CN-DEMO-${String(i + 1).padStart(3, "0")}`,
  name: school.name, community: school.community ?? "", region: school.region,
  accountId: `school-${i + 1}`, email: `school-${i + 1}@camnexus.example`,
}));
export type DemoSession = { role: "school"; schoolId: string } | { role: "admin" };
// Public fictional credentials, not secrets or production authentication.
export const DEMO_PASSWORD = "demo-only";
export function demoLogin(schoolId: string, account: string, password: string): DemoSession | null {
  const entry = SCHOOL_REGISTRY.find((s) => s.id === schoolId);
  const normalized = account.trim().toLowerCase();
  return entry && (normalized === entry.accountId || normalized === entry.email) && password === DEMO_PASSWORD
    ? { role: "school", schoolId: entry.id } : null;
}
export function submitDemoAssessment(schools: School[], session: DemoSession | null, school: School, at: string): School[] {
  const entry = SCHOOL_REGISTRY.find((s) => s.id === school.id);
  if (!entry || session?.role !== "school" || session.schoolId !== entry.id) throw new Error("This demo account cannot submit needs for that school.");
  schools = normalizeSchoolVersions(schools);
  const previous = schools.find((s) => s.id === entry.id);
  infrastructureSchema.parse(school);
  z.string().datetime().parse(at);
  const canonical = { ...school, id: entry.id, name: entry.name, community: entry.community, region: entry.region, registrationId: entry.registrationId };
  const requests = prepareSubmittedRequests(canonical, previous, at);
  // Unchanged verified requests keep their status, so the school-level status only stays verified when every request does.
  const verification: Verification = requests.every((r) => r.status === "verified") ? "verified" : "pending_review";
  const submitted = { ...canonical, assessmentSubmittedAt: at, requests, needs: needsFromRequests(requests), urgentNeed: needsFromRequests(requests.filter((r) => r.primary))[0], verification };
  const history = [...(previous?.history ?? [])];
  if (previous && !history.some((e) => e.snapshot && JSON.stringify(e.snapshot.requests) === JSON.stringify(previous.requests))) {
    const previousAt = previous.assessmentSubmittedAt ?? previous.requests?.find((r) => r.submittedAt)?.submittedAt;
    if (previousAt) history.push({ at: previousAt, status: previous.verification ?? "unverified",
      kind: history.some((e) => e.kind === "submission" && e.at === previousAt) ? "review" : "submission",
      snapshot: assessmentSnapshot(previous) });
  }
  const updated = normalizeSchool({ ...submitted, id: entry.id, name: entry.name, community: entry.community,
    region: entry.region, registrationId: entry.registrationId, sample: previous?.sample ?? true,
    verification, reviewMessage: undefined,
    history: [...history, { at, status: verification, kind: "submission" as const, snapshot: assessmentSnapshot(submitted) }],
  });
  return previous ? schools.map((s) => s.id === entry.id ? updated : s) : [...schools, updated];
}
export function assessmentSnapshot(school: School): Omit<School, "history"> {
  const { history: _history, ...snapshot } = school;
  return JSON.parse(JSON.stringify(snapshot));
}
export function reviewDemoAssessment(schools: School[], session: DemoSession | null, id: string, status: Verification, at: string, message?: string): School[] {
  if (session?.role !== "admin") throw new Error("CamNexus Administrator access is required.");
  z.enum(["unverified", "pending_review", "under_review", "verified"]).parse(status);
  z.string().datetime().parse(at); z.string().max(1000).optional().parse(message);
  return schools.map((s) => {
    if (s.id !== id) return s;
    const updated = { ...s, verification: status, reviewMessage: message,
      requests: s.requests?.map((r) => ({ ...r, status: status === "unverified" ? "pending_review" as const : status, reviewHistory: [...r.reviewHistory, { at, status: status === "unverified" ? "pending_review" as const : status, note: message }] })) };
    return { ...updated, history: [...(s.history ?? []), { at, status, kind: "review" as const, message, snapshot: assessmentSnapshot(updated) }] };
  });
}
export function reviewDemoRequest(schools: School[], session: DemoSession | null, schoolId: string, requestId: string, status: RequestStatus, at: string, note?: string): School[] {
  if (session?.role !== "admin") throw new Error("CamNexus Administrator access is required.");
  z.enum(REQUEST_STATUSES).parse(status); z.string().datetime().parse(at);
  const message = z.string().trim().max(1000).optional().parse(note);
  const school = schools.find((s) => s.id === schoolId);
  if (!school?.requests?.some((r) => r.id === requestId)) throw new Error("Request not found.");
  return schools.map((s) => {
    if (s.id !== schoolId) return s;
    const requests = (s.requests ?? []).map((r) => r.id === requestId ? { ...r, status, reviewHistory: [...r.reviewHistory, { at, status, note: message }] } : r);
    const verification = requests.every((r) => r.status === "verified") ? "verified" as const : "under_review" as const;
    return { ...s, requests, verification, history: [...(s.history ?? []), { at, status: verification, kind: "review" as const, message, requestId, requestStatus: status, snapshot: assessmentSnapshot({ ...s, requests, verification }) }] };
  });
}
