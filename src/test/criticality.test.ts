import { describe, expect, it } from "vitest";
import { SAMPLE_SCHOOLS, type School } from "@/lib/impact";
import { criticalityOf, CRITICALITY_MAX } from "@/lib/criticality";
import type { ResourceCategory, ResourceRequest } from "@/lib/resource-requests";

let n = 0;
const req = (category: ResourceCategory, resource: string, overrides: Partial<ResourceRequest> = {}): ResourceRequest => ({
  id: `t-req-${++n}`, schoolId: "t", registrationId: "", community: "Testville", region: "Centre",
  category, resource, quantity: 1, units: "units", primary: false,
  reason: "", evidence: [], status: "pending_review", reviewHistory: [],
  submittedAt: "2026-10-10T09:00:00.000Z", ...overrides,
});

const sample = SAMPLE_SCHOOLS[0];
if (!sample) throw new Error("Missing sample school");
const schoolWith = (requests: ResourceRequest[]): School => ({
  ...sample, id: "t", community: "Testville", requests, history: [],
});

describe("preliminary criticality scoring", () => {
  it("counts each category group once: Roof Repairs + Classroom Repairs = 5, not 10", () => {
    const c = criticalityOf(schoolWith([
      req("Classroom construction or repairs", "Roof repairs"),
      req("Classroom construction or repairs", "Classroom renovation"),
    ]));
    expect(c.points).toBe(5);
    expect(c.level).toBe("critical");
  });

  it("Roof Repairs + Textbooks = 5 (Critical), never a sum", () => {
    const c = criticalityOf(schoolWith([
      req("Classroom construction or repairs", "Roof repairs"),
      req("Books and educational materials", "Textbooks"),
    ]));
    expect(c.points).toBe(5);
    expect(c.level).toBe("critical");
  });

  it("Toilets + Solar Panels = 4 (High), never a sum", () => {
    const c = criticalityOf(schoolWith([
      req("Water and sanitation", "Toilets"),
      req("Electricity and energy infrastructure", "Solar power system"),
    ]));
    expect(c.points).toBe(4);
    expect(c.level).toBe("high");
  });

  it("only-Other submissions show Unclassified Needs, never a fabricated Low score", () => {
    const c = criticalityOf(schoolWith([req("Other", "Other", { customResource: "School garden" })]));
    expect(c.points).toBe(0);
    expect(c.level).toBe("unclassified");
  });

  it("a school without an active submission is Not Yet Assessed", () => {
    const c = criticalityOf(schoolWith([]));
    expect(c.points).toBeNull();
    expect(c.level).toBe("not_assessed");
  });

  it("ignores drafts (no submittedAt) and rejected requests", () => {
    const c = criticalityOf(schoolWith([
      req("Classroom construction or repairs", "Roof repairs", { submittedAt: undefined }),
      req("Water and sanitation", "Toilets", { status: "rejected" }),
    ]));
    expect(c.points).toBeNull();
    expect(c.level).toBe("not_assessed");
  });

  it("recalculates when a submitted assessment changes", () => {
    const before = criticalityOf(schoolWith([req("Digital equipment", "Laptops")]));
    expect(before.points).toBe(1);
    expect(before.level).toBe("low");
    const after = criticalityOf(schoolWith([
      req("Digital equipment", "Laptops"),
      req("Electricity and energy infrastructure", "Solar power system"),
    ]));
    expect(after.points).toBe(3);
    expect(after.level).toBe("moderate");
  });

  it("Textbooks + Laptops = 1 (Low), never a sum", () => {
    expect(criticalityOf(schoolWith([
      req("Books and educational materials", "Textbooks"),
      req("Digital equipment", "Laptops"),
    ]))).toMatchObject({ points: 1, level: "low" });
  });

  it.each([
    ["Classroom construction or repairs", "Roof repairs", 5, "critical"],
    ["Water and sanitation", "Toilets", 4, "high"],
    ["Electricity and energy infrastructure", "Solar power system", 3, "moderate"],
    ["Classroom furniture", "Student desks", 2, "moderate"],
    ["Books and educational materials", "Textbooks", 1, "low"],
    ["Digital equipment", "Laptops", 1, "low"],
  ] as const)("assigns %s its category priority", (category, resource, points, level) => {
    expect(criticalityOf(schoolWith([req(category, resource)]))).toMatchObject({ points, level });
  });

  it("caps all categories at 5 and leaves every request and quantity untouched", () => {
    const school = schoolWith([
      req("Classroom construction or repairs", "Roof repairs", { quantity: 2 }),
      req("Water and sanitation", "Toilets", { quantity: 3 }),
      req("Electricity and energy infrastructure", "Solar power system", { quantity: 4 }),
      req("Classroom furniture", "Student desks", { quantity: 20 }),
      req("Books and educational materials", "Textbooks", { quantity: 40 }),
      req("Digital equipment", "Laptops", { quantity: 10 }),
      req("Other", "Other", { customResource: "Garden", quantity: 1 }),
    ]);
    const before = structuredClone(school);
    const result = criticalityOf(school);
    expect(CRITICALITY_MAX).toBe(5);
    expect(result).toMatchObject({ points: 5, level: "critical" });
    expect(result.groups).toHaveLength(7);
    expect(school).toEqual(before);
  });
});
