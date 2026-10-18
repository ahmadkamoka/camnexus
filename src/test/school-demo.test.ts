import { describe, expect, it } from "vitest";
import { SAMPLE_SCHOOLS, scoreSchool } from "@/lib/impact";
import { SCHOOL_REGISTRY, DEMO_PASSWORD, demoLogin, submitDemoAssessment, reviewDemoAssessment } from "@/lib/school-demo";

const sample = SAMPLE_SCHOOLS[0];
if (!sample) throw new Error("Missing sample school");
const school = { ...sample, teachers: 20, classrooms: 15, requests: sample.requests?.map((r, i) => ({ ...r, quantity: 20, urgency: "High" as const, reason: "Students lack access to essential learning resources.", primary: i === 0 })) };
const session = { role: "school" as const, schoolId: school.id };
const at = "2026-10-17T19:00:00.000Z";
describe("Fictional school workflow", () => {
  it("provides exactly five distinct school registry IDs", () => {
    expect(SCHOOL_REGISTRY).toHaveLength(5);
    expect(new Set(SCHOOL_REGISTRY.map((r) => r.registrationId)).size).toBe(5);
  });
  it("accepts only the account assigned to the selected school", () => {
    expect(demoLogin("s1", "school-1", DEMO_PASSWORD)).toEqual({ role: "school", schoolId: "s1" });
    expect(demoLogin("s2", "school-1", DEMO_PASSWORD)).toBeNull();
  });
  it("rejects incorrect passwords", () => {
    expect(demoLogin("s1", "school-1", "wrong")).toBeNull();
  });
  it("prevents a school account submitting to another registry ID", () => {
    expect(() => submitDemoAssessment(SAMPLE_SCHOOLS, session, { ...school, id: "s2" }, at)).toThrow();
  });
  it("requires a demo school session to submit", () => {
    expect(() => submitDemoAssessment(SAMPLE_SCHOOLS, null, school, at)).toThrow();
  });
  it("rejects arbitrary new school IDs", () => {
    expect(() => submitDemoAssessment(SAMPLE_SCHOOLS, { role: "school", schoolId: "new" }, { ...school, id: "new" }, at)).toThrow();
  });
  it("updates an existing record without duplicates", () => {
    const result = submitDemoAssessment(SAMPLE_SCHOOLS, session, { ...school, students: 901 }, at);
    expect(result).toHaveLength(5);
    expect(result.find((s) => s.id === "s1")?.students).toBe(901);
  });
  it("uses immutable registry identity rather than edited form identity", () => {
    const result = submitDemoAssessment(SAMPLE_SCHOOLS, session, { ...school, name: "Changed", region: "West", community: "Changed" }, at);
    expect(result[0]?.name).toBe(school.name);
    expect(result[0]?.region).toBe("Centre");
    expect(result[0]?.community).toBe("Mbalmayo");
    expect(result[0]?.registrationId).toBe("CN-DEMO-001");
  });
  it("submits needs as Pending Review and keeps priority provisional", () => {
    const result = submitDemoAssessment(SAMPLE_SCHOOLS, session, { ...school, verification: "verified" }, at);
    expect(result[0]?.verification).toBe("pending_review");
    const saved = result[0];
    if (!saved) throw new Error("Missing submission");
    expect(scoreSchool(saved).provisional).toBe(true);
  });
  it("preserves earlier submission snapshots and dates on update", () => {
    const first = submitDemoAssessment(SAMPLE_SCHOOLS, session, school, at);
    const second = submitDemoAssessment(first, session, { ...school, students: 1000 }, "2026-10-18T19:00:00.000Z");
    expect(second[0]?.history).toHaveLength((first[0]?.history?.length ?? 0) + 1);
    expect(second[0]?.history?.slice(0, first[0]?.history?.length)).toEqual(first[0]?.history);
    expect(second[0]?.history?.at(-2)?.at).toBe(at);
    expect(second[0]?.history?.at(-2)?.snapshot?.students).toBe(820);
    expect(second[0]?.history?.at(-1)?.snapshot?.students).toBe(1000);
  });
  it("keeps administrator review separate from ordinary school accounts", () => {
    expect(() => reviewDemoAssessment(SAMPLE_SCHOOLS, session, "s1", "verified", at)).toThrow();
  });
  it("records administrator status changes and additional information requests", () => {
    const first = submitDemoAssessment(SAMPLE_SCHOOLS, session, school, at);
    const reviewed = reviewDemoAssessment(first, { role: "admin" }, "s1", "under_review", at, "Confirm classroom count");
    expect(reviewed[0]?.verification).toBe("under_review");
    expect(reviewed[0]?.reviewMessage).toBe("Confirm classroom count");
    expect(reviewed[0]?.history).toHaveLength((first[0]?.history?.length ?? 0) + 1);
    const verified = reviewDemoAssessment(reviewed, { role: "admin" }, "s1", "verified", at);
    expect(verified[0]?.verification).toBe("verified");
    expect(verified[0]?.history).toHaveLength((reviewed[0]?.history?.length ?? 0) + 1);
  });
});