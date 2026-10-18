import { describe, expect, it } from "vitest";
import { CATALOG, requestTypeId, RESOURCE_CATEGORY_GROUPS } from "@/lib/catalog";
import { compactSchoolRequests, createSchoolCardRequest, schoolResourceCards, SCHOOL_RESOURCE_OPTIONS } from "@/lib/school-resource-cards";
import { SAMPLE_SCHOOLS, scoreSchool } from "@/lib/impact";
import { requestsSchema, requestIssues, assessmentDraftSchema } from "@/lib/resource-requests";
import { submitDemoAssessment } from "@/lib/school-demo";

const school = SAMPLE_SCHOOLS[0];
if (!school) throw new Error("Missing demo school");
const request = (name: string, quantity?: number) => {
  const entry = SCHOOL_RESOURCE_OPTIONS.find((e) => e.name === name);
  if (!entry) throw new Error("Missing resource");
  return { ...createSchoolCardRequest(entry, school), quantity };
};
const at = "2026-10-18T03:55:00.000Z";

describe("Compact school resource assessments", () => {
  it("uses the seven shared category groups with existing resource IDs and no replacement types", () => {
    expect(RESOURCE_CATEGORY_GROUPS.map((g) => g.label)).toEqual([
      "Building & Safety", "Water & Sanitation", "Electricity", "Classroom Furniture", "Learning Materials", "Technology", "Other",
    ]);
    expect(SCHOOL_RESOURCE_OPTIONS.map((e) => e.id)).toEqual([
      "classroom-construction-or-repairs:roof-repairs", "classroom-construction-or-repairs:classroom-renovation",
      "water-and-sanitation:toilets", "water-and-sanitation:water-fountains", "water-and-sanitation:water-tanks",
      "electricity-and-energy-infrastructure:solar-power-system",
      "classroom-furniture:student-desks", "classroom-furniture:chairs", "classroom-furniture:whiteboards",
      "books-and-educational-materials:textbooks", "books-and-educational-materials:reading-books",
      "books-and-educational-materials:stationery", "stem-and-laboratory-equipment:science-laboratory-kits",
      "digital-equipment:laptops", "digital-equipment:desktop-computers", "other:other",
    ]);
    expect(SCHOOL_RESOURCE_OPTIONS.every((e) => CATALOG.includes(e))).toBe(true);
  });
  it("accepts compact quantities for repair requests instead of requiring a scope description", () => {
    const roof = request("Roof repairs", 2);
    expect(requestsSchema.safeParse([roof]).success).toBe(true);
    expect(requestIssues(roof)).toEqual([]);
    expect(requestsSchema.safeParse([{ ...roof, quantity: undefined }]).success).toBe(false);
  });
  it("retains historical requests instead of silently converting them to other types", () => {
    const entry = CATALOG.find((e) => e.name === "Projectors");
    if (!entry) throw new Error("Missing legacy Projectors type");
    const saved = { ...createSchoolCardRequest(entry, school), quantity: 25, submittedAt: at };
    const before = JSON.stringify(saved);
    const cards = schoolResourceCards([saved]);
    expect(SCHOOL_RESOURCE_OPTIONS.some((e) => e.id === entry.id)).toBe(false);
    expect(cards.find((c) => c.request?.id === saved.id)?.request).toEqual(saved);
    expect(cards.find((c) => c.entry.name === "Science laboratory kits")?.request).toBeUndefined();
    const stored = submitDemoAssessment(SAMPLE_SCHOOLS, { role: "school", schoolId: school.id }, { ...school, requests: [saved] }, at);
    const updated = stored.find((s) => s.id === school.id);
    expect(updated?.requests?.[0]?.resource).toBe("Projectors");
    expect(updated?.history?.at(-1)?.snapshot?.requests?.[0]?.resource).toBe("Projectors");
    expect(JSON.stringify(saved)).toBe(before);
  });
  it("requires at least one selected positive whole-number quantity", () => {
    expect(requestsSchema.safeParse([]).success).toBe(false);
    for (const quantity of [undefined, 0, -1, 1.5, NaN]) expect(requestsSchema.safeParse([request("Laptops", quantity)]).success).toBe(false);
    expect(requestsSchema.safeParse([request("Laptops", 2), request("Textbooks", 40)]).success).toBe(true);
  });
  it("allows an absent explanation and uncollected urgency/primary without fabricating them", () => {
    const r = request("Laptops", 2);
    expect(requestIssues(r)).toEqual([]);
    expect(requestsSchema.parse([r])[0]).toMatchObject({ reason: "", primary: false });
    expect(r.urgency).toBeUndefined();
    expect(r.existingQuantity).toBeUndefined();
  });
  it("requires a custom name with a positive quantity for Other", () => {
    expect(requestsSchema.safeParse([request("Other", 3)]).success).toBe(false);
    expect(requestsSchema.safeParse([{ ...request("Other", 3), customResource: "Sports equipment" }]).success).toBe(true);
  });
  it("preserves selected legacy requests and their recorded details, including extra catalogue resources", () => {
    const old = SAMPLE_SCHOOLS[1]?.requests ?? [];
    const cards = schoolResourceCards(old);
    expect(cards.find((c) => c.request)?.request).toEqual(old[0]);
    expect(compactSchoolRequests(old)[0]).toMatchObject(old[0] ?? {});
    expect(cards.some((c) => c.entry.name === "Reading books")).toBe(true);
  });
  it("saves only selected requests, overall explanation and earlier snapshots through refresh normalization", () => {
    const laptops = request("Laptops", 7);
    const selected = [laptops, { ...request("Other", 3), customResource: "Sports equipment" }];
    const stored = submitDemoAssessment(SAMPLE_SCHOOLS, { role: "school", schoolId: school.id }, { ...school, requests: selected, comments: "More learning materials" }, at);
    const refreshed = JSON.parse(JSON.stringify(stored));
    const saved = refreshed.find((s: { id: string }) => s.id === school.id);
    expect(saved.requests.map((r: { resource: string; quantity: number }) => [r.resource, r.quantity])).toEqual([["Laptops", 7], ["Other", 3]]);
    expect(saved.requests[1].customResource).toBe("Sports equipment");
    expect(saved.comments).toBe("More learning materials");
    expect(saved.history.at(-1).snapshot.requests).toHaveLength(2);
    const resubmitted = submitDemoAssessment(stored, { role: "school", schoolId: school.id }, { ...saved, requests: [laptops] }, "2026-10-18T04:00:00.000Z");
    expect(resubmitted.find((s) => s.id === school.id)?.history?.at(-2)?.snapshot?.requests).toHaveLength(2);
    expect(resubmitted.find((s) => s.id === school.id)?.requests).toHaveLength(1);
    expect(requestTypeId(laptops.category, laptops.resource)).toBe("digital-equipment:laptops");
  });
  it("restores unfinished compact drafts without changing submitted records", () => {
    const draft = { name: school.name, community: school.community, region: school.region, students: "820", electricity: "unknown", comments: "", evidence: [], requests: [request("Laptops")] };
    expect(assessmentDraftSchema.parse(draft).requests[0]?.assessmentFormat).toBe("compact");
    expect(school.requests?.[0]?.quantity).toBe(25);
  });
  it("excludes missing compact urgency from scoring rather than assigning zero or worst case", () => {
    const score = scoreSchool({ ...school, computers: undefined, workingComputers: undefined, electricity: "unknown", internet: "unknown", teachers: undefined, classrooms: undefined, urgentNeed: undefined, requests: [{ ...request("Laptops", 7), submittedAt: at }] });
    expect(score.knownMax).toBe(25);
    expect(score.needs).toBe(5);
    expect(score.total).toBe(20);
    expect(score.insufficient).toBe(true);
  });
});