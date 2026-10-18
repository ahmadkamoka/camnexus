import { describe, expect, it } from "vitest";
import { SAMPLE_SCHOOLS, type School } from "@/lib/impact";
import { buildCommunities, levelOf } from "@/lib/communities";
import { criticalityOf } from "@/lib/criticality";

describe("community map rules", () => {
  it("classifies legacy priority bands (used by matching)", () => {
    expect(levelOf(80)).toBe("critical");
    expect(levelOf(79)).toBe("high");
    expect(levelOf(60)).toBe("high");
    expect(levelOf(59)).toBe("moderate");
    expect(levelOf(40)).toBe("moderate");
    expect(levelOf(39)).toBe("low");
    expect(levelOf(null)).toBe("insufficient");
  });
  it("groups schools per community and uses the highest school criticality", () => {
    const a = { ...SAMPLE_SCHOOLS[1]!, id: "a", community: "Bertoua" };
    const b = { ...SAMPLE_SCHOOLS[3]!, id: "b", community: "bertoua " };
    const [c] = buildCommunities([a, b]);
    expect(c!.schools.length).toBe(2);
    expect(c!.students).toBe(a.students + b.students);
    expect(c!.assessed).toBe(2);
    expect(c!.points).toBe(Math.max(criticalityOf(a).points!, criticalityOf(b).points!));
    const highest = criticalityOf(a).points === c?.points ? criticalityOf(a) : criticalityOf(b);
    expect(c?.level).toBe(highest.level);
  });
  it("reports how many schools have submitted assessments", () => {
    const assessed = { ...SAMPLE_SCHOOLS[0]!, id: "a", community: "Bertoua" };
    const unassessed: School = { ...SAMPLE_SCHOOLS[0]!, id: "b", community: "Bertoua", requests: [] };
    const [c] = buildCommunities([assessed, unassessed]);
    expect(c!.schools.length).toBe(2);
    expect(c!.assessed).toBe(1);
  });
  it("communities with no submissions are Not Yet Assessed", () => {
    const s: School = { ...SAMPLE_SCHOOLS[0]!, id: "x", community: "Bertoua", requests: [] };
    const [c] = buildCommunities([s]);
    expect(c!.level).toBe("not_assessed");
    expect(c!.points).toBeNull();
    expect(c!.assessed).toBe(0);
  });
  it("puts communities without known coordinates in unmapped", () => {
    const s: School = { ...SAMPLE_SCHOOLS[0]!, id: "x", community: "Nowhereville" };
    expect(buildCommunities([s])[0]!.coords).toBeNull();
  });
  it("maps every sample community", () => {
    expect(buildCommunities(SAMPLE_SCHOOLS).every((c) => c.coords)).toBe(true);
  });
});
