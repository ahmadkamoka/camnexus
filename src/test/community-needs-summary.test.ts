import { describe, expect, it } from "vitest";
import { communityNeedsSummary } from "@/lib/community-needs-summary";
import { SAMPLE_SCHOOLS, normalizeSchool, type School } from "@/lib/impact";
import { newRequest, type ResourceRequest } from "@/lib/resource-requests";
import { submitDemoAssessment } from "@/lib/school-demo";
import { normalizeSchoolVersions } from "@/lib/assessment-versions";

const sample = SAMPLE_SCHOOLS[0];
if (!sample) throw new Error("Missing sample school");
const base: School = { ...sample, requests: [], history: [] };
const firstAt = "2026-10-18T06:00:00.000Z";
const secondAt = "2026-10-18T06:10:00.000Z";
function request(category: ResourceRequest["category"], resource: string, quantity: number | undefined): ResourceRequest {
  return { ...newRequest(base), category, resource, quantity, assessmentFormat: "compact", submittedAt: firstAt };
}
const roof = request("Classroom construction or repairs", "Roof repairs", 2);
const books = request("Books and educational materials", "Textbooks", 40);

describe("Community Needs page summaries", () => {
  it("counts communities once at their highest level, not individual schools or category sums", () => {
    const schools = [
      { ...base, id: "a", community: "A", requests: [roof, books] },
      { ...base, id: "b", community: "A", requests: [books] },
      { ...base, id: "c", community: "B", requests: [request("Water and sanitation", "Toilets", 2)] },
      { ...base, id: "d", community: "C", requests: [request("Electricity and energy infrastructure", "Solar power system", 3)] },
      { ...base, id: "e", community: "D", requests: [books] },
      { ...base, id: "f", community: "E", requests: [] },
      { ...base, id: "g", community: "F", requests: [request("Other", "Other", 5)] },
    ];
    expect(communityNeedsSummary(schools).counts).toEqual({ critical: 1, high: 1, moderate: 1, low: 1 });
  });

  it("totals quantities by resource type and keeps only the five largest totals", () => {
    const schools = [
      { ...base, requests: [books, roof, request("Digital equipment", "Laptops", 8), request("Water and sanitation", "Toilets", 6), request("Classroom furniture", "Student desks", 12), request("Electricity and energy infrastructure", "Solar power system", 5)] },
      { ...base, id: "second", requests: [request("Books and educational materials", "Textbooks", 10)] },
    ];
    expect(communityNeedsSummary(schools).resources.map(({ name, quantity }) => [name, quantity])).toEqual([
      ["Textbooks", 50], ["Student Desks", 12], ["Laptops", 8], ["Toilets", 6], ["Solar Panels", 5],
    ]);
  });

  it("charts only resource types in the current catalogue and leaves legacy requests stored", () => {
    const legacy = request("Teacher training", "Digital literacy training", 12);
    const schools = [{ ...base, requests: [legacy, books] }];
    expect(communityNeedsSummary(schools).resources.map(({ name, quantity }) => [name, quantity])).toEqual([["Textbooks", 40]]);
    expect(schools[0]?.requests?.some((r) => r.resource === "Digital literacy training" && r.quantity === 12)).toBe(true);
  });

  it("does not infer missing quantities or count unsubmitted requests", () => {
    const draft = { ...books, submittedAt: undefined, quantity: 999 };
    expect(communityNeedsSummary([{ ...base, requests: [draft, request("Classroom construction or repairs", "Roof repairs", undefined)] }]).resources).toEqual([]);
  });

  it("updates both summaries from the second submission alone, including after refresh, without mutating history", () => {
    const session = { role: "school" as const, schoolId: base.id };
    const first = submitDemoAssessment([base], session, { ...base, requests: [roof, books] }, firstAt);
    expect(communityNeedsSummary(first).counts.critical).toBe(1);
    const second = submitDemoAssessment(first, session, { ...base, requests: [{ ...books, quantity: 15 }] }, secondAt);
    const refreshed = normalizeSchoolVersions(JSON.parse(JSON.stringify(second))).map(normalizeSchool);
    const before = structuredClone(refreshed);
    expect(communityNeedsSummary(refreshed).counts).toEqual({ critical: 0, high: 0, moderate: 0, low: 1 });
    expect(communityNeedsSummary(refreshed).resources.map(({ name, quantity }) => [name, quantity])).toEqual([["Textbooks", 15]]);
    expect(refreshed).toEqual(before);
    expect(refreshed[0]?.history?.some((event) => event.snapshot?.requests?.some((r) => r.resource === "Roof repairs"))).toBe(true);
  });
});