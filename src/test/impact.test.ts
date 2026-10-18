import { describe, expect, it } from "vitest";
import { SAMPLE_SCHOOLS, WEIGHTS, scoreSchool, simulate, type School } from "@/lib/impact";

const base: School = { id: "t", name: "T", region: "Centre", students: 400, computers: 0, workingComputers: 0, classrooms: 10, teachers: 10,
  electricity: "none", internet: "none", needs: ["Digital literacy"], verification: "unverified" };

describe("priority score", () => {
  it("stays within 0-100 for all samples", () => {
    for (const s of SAMPLE_SCHOOLS) {
      const t = scoreSchool(s).total;
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(100);
    }
  });
  it("is deterministic", () => {
    expect(scoreSchool(base)).toEqual(scoreSchool({ ...base }));
  });
  it("weights digital gaps more when digital needs are reported", () => {
    const d = scoreSchool(base);
    const nd = scoreSchool({ ...base, needs: ["Reading materials"] });
    expect(d.device).toBe(25);
    expect(nd.device).toBe(10);
    expect(d.electricity).toBe(20);
    expect(nd.electricity).toBe(10);
  });
  it("uses working computers, not total", () => {
    expect(scoreSchool({ ...base, computers: 40, workingComputers: 0 }).device).toBe(25);
    expect(scoreSchool({ ...base, computers: 40, workingComputers: 40 }).device).toBe(0);
  });
  it("does not raise score from size alone", () => {
    const big = { ...base, students: 4000, teachers: 100, classrooms: 100, computers: 0, workingComputers: 0 };
    expect(scoreSchool(big).total).toBe(scoreSchool(base).total);
  });
  it("excludes unknown power instead of treating it as worst", () => {
    const sc = scoreSchool({ ...base, electricity: "unknown" });
    expect(sc.factors.find((f) => f.key === "electricity")!.unknown).toBe(true);
    expect(sc.knownMax).toBe(80);
  });
  it("requires more assessment when over 30% of points are unknown", () => {
    expect(scoreSchool({ ...base, electricity: "unknown", teachers: undefined }).insufficient).toBe(true);
    expect(scoreSchool(base).insufficient).toBe(false);
  });
  it("excludes learning conditions when teacher and classroom counts are not recorded", () => {
    const missing = scoreSchool({ ...base, teachers: undefined, classrooms: undefined });
    const worst = scoreSchool({ ...base, teachers: 5, classrooms: 4 });
    const best = scoreSchool({ ...base, teachers: 400, classrooms: 400 });
    expect(missing.factors.find((f) => f.key === "conditions")!.unknown).toBe(true);
    expect(missing.knownMax).toBe(worst.knownMax - WEIGHTS.conditionsTeacher - WEIGHTS.conditionsClassroom);
    expect(missing.total).toBe(71); // 60 known points re-scaled over 85
    expect(missing.total).not.toBe(worst.total); // never treated as the worst case
    expect(missing.total).not.toBe(best.total); // never treated as zero
  });
  it("marks unverified schools as provisional", () => {
    expect(scoreSchool(base).provisional).toBe(true);
    expect(scoreSchool({ ...base, verification: "verified" }).provisional).toBe(false);
  });
  it("samples default to unverified", () => {
    expect(SAMPLE_SCHOOLS.every((s) => s.verification === "unverified")).toBe(true);
  });
  it("marks options over budget", () => {
    expect(simulate(SAMPLE_SCHOOLS[0]!, 1000).every((o) => !o.fits)).toBe(true);
  });
});
