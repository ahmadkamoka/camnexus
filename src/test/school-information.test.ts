import { describe, expect, it } from "vitest";
import { assessmentDraftSchema, infrastructureSchema, schoolInformationInfrastructure } from "@/lib/resource-requests";
import { normalizeSchool, SAMPLE_SCHOOLS, scoreSchool, type School } from "@/lib/impact";
import { submitDemoAssessment } from "@/lib/school-demo";
import { assertAssessmentReviewable } from "@/lib/admin-review";

const draft = { name: "School Alpha", community: "Mbalmayo", region: "Centre", students: "820", electricity: "unknown" as const, reliableElectricity: "no" as const, solarPower: "" as const, comments: "", evidence: [], requests: [] };
const answers = assessmentDraftSchema.parse(draft);
const sample = SAMPLE_SCHOOLS[0];
if (!sample) throw new Error("Missing school fixture");

describe("School Information", () => {
  it("accepts missing computer and internet answers while requiring at least one student", () => {
    expect(infrastructureSchema.safeParse({ students: 820, electricity: "unknown" }).success).toBe(true);
    for (const students of [undefined, 0, -1, 1.5]) {
      expect(infrastructureSchema.safeParse({ students, electricity: "unknown" }).success).toBe(false);
    }
  });
  it("restores both simplified drafts and pre-removal computer/internet answers losslessly", () => {
    expect(answers.computers).toBe("");
    expect(answers.internet).toBe("unknown");
    const legacy = assessmentDraftSchema.parse({ ...draft, computers: "6", working: "4", internet: "limited" });
    expect(schoolInformationInfrastructure(undefined, legacy)).toMatchObject({ computers: 6, workingComputers: 4, internet: "limited" });
  });
  it("does not invent computers or outage severity from a No answer", () => {
    const result = schoolInformationInfrastructure(undefined, answers);
    expect(result).toMatchObject({ electricity: "unknown", reliableElectricity: false, internet: "unknown" });
    expect(result.computers).toBeUndefined();
    expect(result.workingComputers).toBeUndefined();
  });
  it("allows unanswered solar preference and stores Yes/No without a panel quantity", () => {
    expect(schoolInformationInfrastructure(undefined, answers).solarPowerRequested).toBeUndefined();
    expect(schoolInformationInfrastructure(undefined, { ...answers, solarPower: "yes" }).solarPowerRequested).toBe(true);
    expect(schoolInformationInfrastructure(undefined, { ...answers, solarPower: "no" }).solarPowerRequested).toBe(false);
  });
  it("hides solar preferences from submissions when reliable electricity is Yes", () => {
    expect(schoolInformationInfrastructure(undefined, { ...answers, reliableElectricity: "yes", solarPower: "yes" })).toMatchObject({ electricity: "reliable", reliableElectricity: true, solarPowerRequested: undefined });
  });
  it("excludes missing infrastructure factors and re-scales without treating them as zero or worst", () => {
    const school: School = { ...sample, requests: undefined, students: 400, needs: ["Digital literacy"], ...schoolInformationInfrastructure(undefined, { ...answers, reliableElectricity: "yes" }) };
    const normalized = normalizeSchool(school);
    expect(normalized.computers).toBeUndefined();
    expect(normalized.workingComputers).toBeUndefined();
    const score = scoreSchool(normalized);
    expect(score.factors.filter((f) => f.unknown).map((f) => f.key)).toEqual(["device", "internet", "conditions"]);
    expect(score.knownMax).toBe(50);
    expect(score.total).toBe(10);
    expect(score.total).not.toBe(scoreSchool({ ...school, computers: 0, workingComputers: 0, internet: "none" }).total);
  });
  it("submits and remains reviewable without computer/internet measurements", () => {
    const input: School = { ...sample, ...schoolInformationInfrastructure(undefined, answers) };
    const updated = submitDemoAssessment([], { role: "school", schoolId: "s1" }, input, "2026-10-18T03:41:00.000Z")[0];
    if (!updated) throw new Error("Missing submission");
    expect(updated.computers).toBeUndefined();
    expect(updated.workingComputers).toBeUndefined();
    expect(updated.internet).toBe("unknown");
    expect(updated.history?.[0]?.snapshot?.computers).toBeUndefined();
    expect(() => assertAssessmentReviewable(updated)).not.toThrow();
    expect(() => assertAssessmentReviewable({ ...updated, students: 0 })).toThrow();
  });
  it("preserves hidden records, registry mapping, resource requests and earlier history on submission", () => {
    const earlier = { ...sample, teachers: 20, classrooms: 15 };
    const at = "2026-10-18T03:41:00.000Z";
    const originalHistory = [{ at: "2026-10-17T03:41:00.000Z", status: "pending_review" as const, kind: "submission" as const, snapshot: earlier }];
    const previous = { ...earlier, history: originalHistory };
    const input = { ...previous, students: 821, ...schoolInformationInfrastructure(previous, { ...answers, solarPower: "yes" }) };
    const updated = submitDemoAssessment([previous], { role: "school", schoolId: "s1" }, input, at)[0];
    expect(updated).toMatchObject({ id: "s1", region: "Centre", community: "Mbalmayo", registrationId: "CN-DEMO-001", computers: 6, workingComputers: 6, internet: "limited", teachers: 20, classrooms: 15, solarPowerRequested: true });
    expect(updated?.requests?.map((r) => r.id)).toEqual(sample.requests?.map((r) => r.id));
    expect(updated?.history?.[0]).toEqual(originalHistory[0]);
    expect(updated?.history).toHaveLength(2);
    expect(previous.history).toEqual(originalHistory);
  });
});