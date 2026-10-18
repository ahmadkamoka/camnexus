import { describe, expect, it } from "vitest";
import { normalizeSchool, SAMPLE_SCHOOLS, type School } from "@/lib/impact";
import { normalizeSchoolVersions } from "@/lib/assessment-versions";
import { activeRequests, newRequest } from "@/lib/resource-requests";
import { criticalityOf } from "@/lib/criticality";
import { buildCommunities } from "@/lib/communities";
import { assessmentSnapshot, submitDemoAssessment, reviewDemoAssessment } from "@/lib/school-demo";

const sample = SAMPLE_SCHOOLS[0];
if (!sample) throw new Error("Missing school");
const base: School = { ...sample, requests: [], history: [] };
const session = { role: "school" as const, schoolId: base.id };
const firstAt = "2026-10-18T05:00:00.000Z";
const secondAt = "2026-10-18T05:10:00.000Z";
const roof = { ...newRequest(base), id: "roof", assessmentFormat: "compact" as const, category: "Classroom construction or repairs" as const, resource: "Roof repairs", quantity: 2, submittedAt: firstAt };
const water = { ...newRequest(base), id: "water", assessmentFormat: "compact" as const, category: "Water and sanitation" as const, resource: "Water tanks", quantity: 1, submittedAt: firstAt };
const books = { ...newRequest(base), id: "books", assessmentFormat: "compact" as const, category: "Books and educational materials" as const, resource: "Textbooks", quantity: 40, submittedAt: secondAt };
const mustSchool = (schools: School[]) => {
  const school = schools[0];
  if (!school) throw new Error("Missing result");
  return school;
};

describe("One active assessment per registered school", () => {
  it("uses the second assessment alone, removes old needs, and persists through refresh", () => {
    const first = submitDemoAssessment([base], session, { ...base, requests: [roof, water] }, firstAt);
    expect(criticalityOf(mustSchool(first))).toMatchObject({ points: 5, level: "critical" });
    const reviewed = reviewDemoAssessment(first, { role: "admin" }, base.id, "verified", "2026-10-18T05:05:00.000Z", "Checked first assessment");
    const oldHistory = structuredClone(mustSchool(reviewed).history);
    const second = submitDemoAssessment(reviewed, session, { ...base, requests: [books] }, secondAt);
    const refreshed = normalizeSchoolVersions(JSON.parse(JSON.stringify(second))).map(normalizeSchool);
    const current = mustSchool(refreshed);
    expect(activeRequests(current).map((r) => [r.resource, r.quantity])).toEqual([["Textbooks", 40]]);
    expect(criticalityOf(current)).toMatchObject({ points: 1, level: "low" });
    expect(current.history?.slice(0, oldHistory?.length)).toEqual(oldHistory);
    expect(current.history?.[0]?.snapshot?.requests?.map((r) => r.resource)).toEqual(["Roof repairs", "Water tanks"]);
    expect(current.history?.[1]?.snapshot?.requests?.[0]?.reviewHistory[0]?.note).toBe("Checked first assessment");
    expect(buildCommunities(refreshed)[0]).toMatchObject({ points: 1, assessed: 1, resourceNeeds: ["Textbooks"] });
  });

  it("repairs accumulated requests using the latest submission snapshot, not a later review", () => {
    const first = { ...base, requests: [roof, water] };
    const second = { ...base, requests: [books] };
    const history: NonNullable<School["history"]> = [
      { at: secondAt, kind: "submission", status: "pending_review", snapshot: assessmentSnapshot(second) },
      { at: firstAt, kind: "submission", status: "pending_review", snapshot: assessmentSnapshot(first) },
      { at: "2026-10-18T05:20:00.000Z", kind: "review", status: "verified", snapshot: assessmentSnapshot(first) },
    ];
    const input = { ...base, requests: [roof, water, { ...books, status: "verified" as const, reviewHistory: [{ at: secondAt, status: "verified" as const, note: "Keep this review" }] }], history };
    const result = normalizeSchool(input);
    expect(activeRequests(result).map((r) => r.id)).toEqual(["books"]);
    expect(result.requests?.[0]?.reviewHistory[0]?.note).toBe("Keep this review");
    expect(result.history?.slice(0, history.length)).toEqual(history);
    expect(normalizeSchool(result)).toEqual(result);
    expect(criticalityOf(input).points).toBe(1);
  });

  it("archives mixed timestamp cohorts without merging requests when no snapshots exist", () => {
    const result = normalizeSchool({ ...base, requests: [roof, water, books] });
    expect(result.requests?.map((r) => r.id)).toEqual(["books"]);
    expect(result.history?.find((e) => e.at === firstAt)?.snapshot?.requests?.map((r) => r.id)).toEqual(["roof", "water"]);
    expect(normalizeSchool(result)).toEqual(result);
  });

  it("keeps one school from duplicate saved rows and retains every earlier version and review", () => {
    const old = { ...base, requests: [roof, water], history: [{ at: firstAt, kind: "review" as const, status: "under_review" as const, message: "Original review" }] };
    const latest = { ...base, requests: [books] };
    const result = normalizeSchoolVersions([latest, old]).map(normalizeSchool);
    expect(result).toHaveLength(1);
    expect(criticalityOf(mustSchool(result)).points).toBe(1);
    expect(mustSchool(result).history?.some((e) => e.message === "Original review")).toBe(true);
    expect(mustSchool(result).history?.some((e) => e.snapshot?.requests?.some((r) => r.id === "roof"))).toBe(true);
    expect(buildCommunities(result)[0]?.assessed).toBe(1);
    const submitted = submitDemoAssessment([latest, old], session, { ...base, requests: [books] }, "2026-10-18T05:30:00.000Z");
    expect(submitted).toHaveLength(1);
    expect(activeRequests(mustSchool(submitted))).toHaveLength(1);
  });

  it("preserves explicitly empty latest submissions rather than reviving historical needs", () => {
    const history: NonNullable<School["history"]> = [
      { at: firstAt, kind: "submission", status: "pending_review", snapshot: assessmentSnapshot({ ...base, requests: [roof] }) },
      { at: secondAt, kind: "submission", status: "pending_review", snapshot: assessmentSnapshot({ ...base, requests: [] }) },
    ];
    const current = normalizeSchool({ ...base, requests: [roof], history });
    expect(activeRequests(current)).toEqual([]);
    expect(criticalityOf(current)).toMatchObject({ points: null, level: "not_assessed" });
    expect(normalizeSchool(current)).toEqual(current);
  });

  it("retains latest Other-only requests as Unclassified Needs, not historical High", () => {
    const first = submitDemoAssessment([base], session, { ...base, requests: [roof, water] }, firstAt);
    const other = { ...newRequest(base), id: "other", assessmentFormat: "compact" as const, category: "Other" as const, resource: "Other", customResource: "Sports equipment", quantity: 3 };
    const second = submitDemoAssessment(first, session, { ...base, requests: [other] }, secondAt);
    expect(criticalityOf(mustSchool(second))).toMatchObject({ points: 0, level: "unclassified" });
  });

  it("does not merge different schools that happen to share a display name", () => {
    expect(normalizeSchoolVersions([{ ...base, requests: [roof] }, { ...base, id: "s2", requests: [books] }])).toHaveLength(2);
  });
});