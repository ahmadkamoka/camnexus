import { describe, expect, it } from "vitest";
import { SAMPLE_SCHOOLS, normalizeSchool, scoreSchool, simulate, recommend, type School } from "@/lib/impact";
import { assessmentDraftSchema, newRequest, migrateRequests, requestsSchema, type ResourceRequest } from "@/lib/resource-requests";
import { submitDemoAssessment, reviewDemoRequest } from "@/lib/school-demo";
import { buildCommunities } from "@/lib/communities";
import { criticalityOf } from "@/lib/criticality";

const sample = SAMPLE_SCHOOLS[0];
if (!sample) throw new Error("Missing sample");
const at = "2026-10-17T19:20:00.000Z";
const request: ResourceRequest = { ...newRequest(sample), id: "request-1", category: "Books and educational materials", resource: "Textbooks", quantity: 150, existingQuantity: 20, primary: true, reason: "Students share too few textbooks.", urgency: "High" };
const school: School = { ...sample, teachers: 20, classrooms: 15, requests: [request] };
const session = { role: "school" as const, schoolId: school.id };
describe("Advanced resource assessments", () => {
  it("migrates legacy needs without inventing quantities or losing historical snapshots", () => {
    const legacy = { ...sample, requests: undefined, history: [{ at, kind: "submission" as const, status: "pending_review" as const, snapshot: { ...sample, requests: undefined } }] };
    const migrated = normalizeSchool(legacy);
    expect(migrateRequests(legacy).map((r) => r.legacyNeed)).toEqual(sample.needs);
    expect(migrated.requests?.every((r) => r.quantity === undefined)).toBe(true);
    expect(migrated.history).toEqual(legacy.history);
    expect(normalizeSchool(migrated).requests).toEqual(migrated.requests);
  });
  it("requires exactly one primary need", () => {
    expect(requestsSchema.safeParse([{ ...request, primary: false }]).success).toBe(false);
    expect(requestsSchema.safeParse([request, { ...request, id: "request-2" }]).success).toBe(false);
    expect(requestsSchema.safeParse([request]).success).toBe(true);
  });
  it("allows unfinished local drafts while rejecting invalid stored types", () => {
    const draft = { name: school.name, community: "Mbalmayo", region: "Centre", students: "", teachers: "", classrooms: "", computers: "", working: "", electricity: "unknown", internet: "unknown", comments: "", evidence: [], requests: [{ ...request, quantity: undefined, primary: false, reason: "" }] };
    expect(assessmentDraftSchema.safeParse(draft).success).toBe(true);
    expect(assessmentDraftSchema.safeParse({ ...draft, students: {} }).success).toBe(false);
    expect(assessmentDraftSchema.safeParse({ ...draft, requests: [{ ...request, category: "invalid" }] }).success).toBe(false);
  });
  it("submits without teacher or classroom counts and still reads drafts saved before those fields were removed", () => {
    const saved = submitDemoAssessment(SAMPLE_SCHOOLS, session, { ...school, teachers: undefined, classrooms: undefined }, at);
    expect(saved[0]?.students).toBe(sample.students);
    expect(saved[0]?.teachers).toBeUndefined();
    expect(saved[0]?.classrooms).toBeUndefined();
    const legacyDraft = { name: "School Alpha", community: "Mbalmayo", region: "Centre", students: "820", teachers: "20", classrooms: "15", computers: "6", working: "6", electricity: "intermittent", internet: "limited", comments: "", evidence: [], requests: [] };
    const restored = assessmentDraftSchema.parse(legacyDraft);
    expect(restored.students).toBe("820");
    expect(restored).not.toHaveProperty("teachers");
  });
  it("preserves legacy review status and registry identity during migration", () => {
    const migrated = normalizeSchool({ ...sample, requests: undefined, verification: "verified" });
    expect(migrated.requests?.every((r) => r.status === "verified")).toBe(true);
    expect(migrated.requests?.[0]?.registrationId).toBe("CN-DEMO-001");
    expect(scoreSchool(migrated).provisional).toBe(false);
  });
  it("requires independently unique request IDs", () => {
    expect(requestsSchema.safeParse([request, { ...request, primary: false }]).success).toBe(false);
  });
  it("requires positive integral quantities and reasons", () => {
    for (const quantity of [0, -1, 1.5, NaN]) expect(requestsSchema.safeParse([{ ...request, quantity }]).success).toBe(false);
    expect(requestsSchema.safeParse([{ ...request, reason: " " }]).success).toBe(false);
  });
  it("allows construction scope without arbitrary quantities", () => {
    expect(requestsSchema.safeParse([{ ...request, category: "Classroom construction or repairs", resource: "Roof repairs", quantity: undefined, scope: "Repair roof on two classrooms" }]).success).toBe(true);
    expect(requestsSchema.safeParse([{ ...request, category: "Classroom construction or repairs", resource: "Roof repairs", scope: "" }]).success).toBe(false);
  });
  it("requires a custom name for Other", () => {
    expect(requestsSchema.safeParse([{ ...request, resource: "Other" }]).success).toBe(false);
  });
  it("keeps one school record with canonical request identity and pending status", () => {
    const saved = submitDemoAssessment(SAMPLE_SCHOOLS, session, { ...school, requests: [{ ...request, schoolId: "s2", registrationId: "edited", community: "edited", region: "West", status: "verified" }] }, at);
    expect(saved).toHaveLength(5);
    expect(saved[0]?.requests?.[0]).toMatchObject({ schoolId: "s1", registrationId: "CN-DEMO-001", community: "Mbalmayo", region: "Centre", status: "pending_review", submittedAt: at });
  });
  it("prevents missing-request submissions through the mutation helper", () => {
    expect(() => submitDemoAssessment(SAMPLE_SCHOOLS, session, { ...school, requests: undefined }, at)).toThrow();
  });
  it("supports mixed review status and preserves previous versions on resubmission", () => {
    const submitted = submitDemoAssessment(SAMPLE_SCHOOLS, session, { ...school, requests: [request, { ...request, id: "request-2", primary: false }] }, at);
    const reviewed = reviewDemoRequest(submitted, { role: "admin" }, school.id, request.id, "verified", at, "Evidence reviewed");
    expect(reviewed[0]?.requests?.map((r) => r.status)).toEqual(["verified", "pending_review"]);
    expect(reviewed[0]?.history?.find((e) => e.kind === "submission" && e.at === at)?.snapshot?.requests?.[0]?.status).toBe("pending_review");
    const current = reviewed[0]; if (!current) throw new Error("Missing school");
    const updated = submitDemoAssessment(reviewed, session, { ...current, requests: current.requests?.map((r) => ({ ...r, quantity: 151 })) }, at);
    expect(updated[0]?.history).toHaveLength((reviewed[0]?.history?.length ?? 0) + 1);
    expect(updated[0]?.history?.find((e) => e.kind === "submission" && e.at === at)?.snapshot?.requests?.[0]?.quantity).toBe(150);
    expect(updated[0]?.requests?.[0]?.reviewHistory?.[0]?.note).toBe("Evidence reviewed");
    expect(updated[0]?.requests?.every((r) => r.status === "pending_review")).toBe(true);
  });
  it("keeps an unchanged verified request verified when a new request is added", () => {
    const submitted = submitDemoAssessment(SAMPLE_SCHOOLS, session, { ...school, requests: [request] }, at);
    const reviewed = reviewDemoRequest(submitted, { role: "admin" }, school.id, request.id, "verified", at, "Evidence reviewed");
    const current = reviewed[0]; if (!current) throw new Error("Missing school");
    const updated = submitDemoAssessment(reviewed, session, { ...current, students: 999, requests: [...(current.requests ?? []), { ...request, id: "request-new", primary: false }] }, "2026-10-18T19:00:00.000Z");
    expect(updated[0]?.requests?.find((r) => r.id === request.id)?.status).toBe("verified");
    expect(updated[0]?.requests?.find((r) => r.id === "request-new")?.status).toBe("pending_review");
    expect(updated[0]?.verification).toBe("pending_review");
  });
  it("returns a materially changed verified request to pending review with a reassessment note", () => {
    const submitted = submitDemoAssessment(SAMPLE_SCHOOLS, session, { ...school, requests: [request] }, at);
    const reviewed = reviewDemoRequest(submitted, { role: "admin" }, school.id, request.id, "verified", at);
    const current = reviewed[0]; if (!current) throw new Error("Missing school");
    const updated = submitDemoAssessment(reviewed, session, { ...current, requests: [{ ...request, quantity: 300 }] }, "2026-10-18T19:00:00.000Z");
    const changed = updated[0]?.requests?.[0];
    expect(changed?.status).toBe("pending_review");
    expect(changed?.reviewHistory.at(-1)?.note).toContain("reassessment");
  });
  it("restricts individual decisions to demo administrators", () => {
    for (const status of ["pending_review", "under_review", "verified", "more_information", "rejected"] as const) {
      expect(() => reviewDemoRequest([school], session, school.id, request.id, status, at)).toThrow();
      expect(reviewDemoRequest([school], { role: "admin" }, school.id, request.id, status, at)[0]?.requests?.[0]?.status).toBe(status);
    }
  });
  it("does not multiply priority for many identical resource categories", () => {
    const submitted = { ...request, submittedAt: at, urgency: "Critical" as const };
    const one = scoreSchool({ ...school, requests: [submitted] });
    const many = scoreSchool({ ...school, requests: Array.from({ length: 50 }, (_, i) => ({ ...submitted, id: `r-${i}` })) });
    expect(one.needs).toBe(10);
    expect(many.needs).toBe(one.needs);
    expect(many.total).toBe(one.total);
    expect(many.total).toBeLessThanOrEqual(100);
    expect(many.total).toBeGreaterThanOrEqual(0);
  });
  it("averages urgency within five illustrative points rather than using it as final ranking", () => {
    const sc = scoreSchool({ ...school, requests: [{ ...request, submittedAt: at, urgency: "Critical" }, { ...request, id: "r-2", primary: false, submittedAt: at, urgency: "Low" }] });
    expect(sc.needs).toBe(8.1);
    expect(sc.provisional).toBe(true);
  });
  it("updates one community marker from the exact shared criticality calculation", () => {
    const saved = submitDemoAssessment(SAMPLE_SCHOOLS, session, school, at);
    const community = buildCommunities(saved).find((c) => c.name === "Mbalmayo");
    expect(buildCommunities(saved)).toHaveLength(5);
    expect(community?.resourceNeeds).toContain("Textbooks");
    expect(community?.points).toBe(criticalityOf(saved[0] ?? school).points);
  });
  it("does not recommend laptops for textbook and desk requests", () => {
    const s = { ...school, requests: [{ ...request, submittedAt: at }, { ...request, id: "r-2", category: "Classroom furniture" as const, resource: "Student desks", quantity: 80, primary: false, submittedAt: at }] };
    const opts = simulate(s, 20000);
    expect(opts.find((o) => o.key === "equipment")?.relevant).toBe(false);
    expect(recommend(s, opts).option?.key).toBe("lowtech");
  });
  it("caps the computer scenario at the quantity requested while leaving the request intact", () => {
    const s = { ...school, requests: [{ ...request, category: "Digital equipment" as const, resource: "Laptops", quantity: 5, submittedAt: at }] };
    expect(simulate(s, 20000)[0]?.cost).toBe(2800);
    expect(s.requests[0]?.quantity).toBe(5);
  });
  it("withholds unrelated recommendations for unsupported furniture requests", () => {
    const s = { ...school, requests: [{ ...request, category: "Classroom furniture" as const, resource: "Student desks", submittedAt: at }] };
    expect(recommend(s, simulate(s, 20000)).option).toBeNull();
  });
});