import { describe, expect, it } from "vitest";
import { SAMPLE_SCHOOLS, type School } from "@/lib/impact";
import { assessmentDraftSchema, newRequest, activeRequests } from "@/lib/resource-requests";
import { schoolFormInfrastructure, previousSchoolSubmissions } from "@/lib/school-form-projection";
import { submitDemoAssessment, reviewDemoAssessment } from "@/lib/school-demo";
import { normalizeSchoolVersions } from "@/lib/assessment-versions";

const sample = SAMPLE_SCHOOLS[0];
if (!sample) throw new Error("Missing school fixture");
const base: School = { ...sample, requests: [], history: [] };
const draft = assessmentDraftSchema.parse({ name: base.name, community: base.community, region: base.region, students: "820", electricity: "unknown", comments: "", evidence: [], requests: [] });
const session = { role: "school" as const, schoolId: base.id };
const books = { ...newRequest(base), id: "textbooks", assessmentFormat: "compact" as const, category: "Books and educational materials" as const, resource: "Textbooks", quantity: 12 };

describe("Simplified school form projections", () => {
  it("submits without deleted electricity or solar answers and keeps missing power unknown", () => {
    const school = { ...base, students: 820, requests: [books], ...schoolFormInfrastructure(undefined, draft) };
    const submitted = submitDemoAssessment([], session, school, "2026-10-18T06:00:00.000Z")[0];
    expect(submitted).toMatchObject({ students: 820, electricity: "unknown" });
    expect(submitted?.reliableElectricity).toBeUndefined();
    expect(submitted?.solarPowerRequested).toBeUndefined();
  });
  it("preserves legacy recorded power answers exactly, including unknown binary answers", () => {
    expect(schoolFormInfrastructure({ ...base, electricity: "reliable", solarPowerRequested: true, reliableElectricity: undefined }, draft)).toMatchObject({ electricity: "reliable", reliableElectricity: undefined, solarPowerRequested: true });
    expect(schoolFormInfrastructure({ ...base, electricity: "none", reliableElectricity: false, solarPowerRequested: false }, { ...draft, reliableElectricity: "yes", solarPower: "yes" })).toMatchObject({ electricity: "none", reliableElectricity: false, solarPowerRequested: false });
  });
  it("retains removed answers in restored legacy drafts without inventing quantities", () => {
    const restored = assessmentDraftSchema.parse({ ...draft, reliableElectricity: "no", solarPower: "yes", computers: "6", working: "4", internet: "limited" });
    expect(schoolFormInfrastructure(undefined, restored)).toMatchObject({ electricity: "unknown", reliableElectricity: false, solarPowerRequested: true, computers: 6, workingComputers: 4, internet: "limited" });
    expect(restored.requests).toEqual([]);
  });
  it("has no previous submissions before or after the first submission", () => {
    expect(previousSchoolSubmissions(undefined, base.id)).toEqual([]);
    expect(previousSchoolSubmissions(base, base.id)).toEqual([]);
    const first = submitDemoAssessment([], session, { ...base, requests: [books] }, "2026-10-18T06:00:00.000Z")[0];
    expect(previousSchoolSubmissions(first, base.id)).toEqual([]);
  });
  it("shows only earlier dates and quantities after update and refresh, leaving reviews intact", () => {
    const firstAt = "2026-10-18T06:00:00.000Z";
    const first = submitDemoAssessment([], session, { ...base, requests: [books] }, firstAt);
    const reviewed = reviewDemoAssessment(first, { role: "admin" }, base.id, "verified", "2026-10-18T06:05:00.000Z", "Historical review");
    const history = structuredClone(reviewed[0]?.history);
    const second = submitDemoAssessment(reviewed, session, { ...base, requests: [{ ...books, quantity: 25 }] }, "2026-10-18T06:10:00.000Z");
    const school = normalizeSchoolVersions(JSON.parse(JSON.stringify(second)))[0];
    if (!school) throw new Error("Missing submitted school");
    const before = JSON.stringify(school);
    const previous = previousSchoolSubmissions(school, base.id);
    expect(previous.map((event) => event.at)).toEqual([firstAt]);
    expect(previous[0]?.snapshot?.requests?.map((r) => [r.resource, r.quantity])).toEqual([["Textbooks", 12]]);
    expect(activeRequests(school).map((r) => r.quantity)).toEqual([25]);
    expect(school.history?.slice(0, history?.length)).toEqual(history);
    expect(JSON.stringify(school)).toBe(before);
  });
  it("never shows another school's history to the signed-in school", () => {
    const first = submitDemoAssessment([], session, { ...base, requests: [books] }, "2026-10-18T06:00:00.000Z");
    const second = submitDemoAssessment(first, session, { ...base, requests: [books] }, "2026-10-18T06:10:00.000Z")[0];
    expect(previousSchoolSubmissions(second, "s2")).toEqual([]);
    expect(previousSchoolSubmissions(second, base.id)).toHaveLength(1);
  });
});