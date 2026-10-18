import { describe, expect, it } from "vitest";
import { SAMPLE_SCHOOLS, type School } from "@/lib/impact";
import { SAMPLE_ORGANIZATIONS, newOffer, reviewOrganization, reviewOrgOffer, type Organization } from "@/lib/partners";
import { reviewDemoRequest } from "@/lib/school-demo";
import { buildRecommendations, communityMatchSummary, compareAllocations, comparableTypes, RANK_WEIGHTS } from "@/lib/matching";

const AT = "2026-10-18T12:00:00.000Z";
const admin = { role: "admin" as const };
const bertoua = SAMPLE_SCHOOLS.find((s) => s.region === "East")!; // digital literacy, intermittent power, no internet

/** A sample school with its school-level and per-request verification completed. */
function verifiedSchool(id: string): School {
  const base = SAMPLE_SCHOOLS.find((s) => s.id === id)!;
  let s: School = { ...base, verification: "verified" as const };
  for (const r of s.requests ?? []) s = reviewDemoRequest([s], admin, s.id, r.id, "verified", AT).find((x) => x.id === s.id)!;
  return s;
}
const verifiedBertoua = () => verifiedSchool("s4");

describe("recommendation eligibility", () => {
  it("matches a school request and an offer with the same resource type ID", () => {
    const recs = buildRecommendations([bertoua], SAMPLE_ORGANIZATIONS);
    expect(recs.some((r) => r.offer.id === "org-1-offer-1" && r.request.resource === "Laptops")).toBe(true);
  });
  it("does not match different resource types", () => {
    const recs = buildRecommendations([bertoua], SAMPLE_ORGANIZATIONS);
    expect(recs.every((r) => r.offer.resourceTypeId.endsWith(r.request.resource.toLowerCase().replace(/[^a-z0-9]+/g, "-")) || r.request.resource === "Other")).toBe(true);
  });
  it("respects geographic restrictions unless nationwide", () => {
    const west = SAMPLE_SCHOOLS.find((s) => s.region === "West")!;
    const recs = buildRecommendations([west], [SAMPLE_ORGANIZATIONS[1]!]); // Readers for All: East only
    expect(recs.every((r) => r.category === "incompatible")).toBe(true);
  });
  it("unverified organizations cannot produce fully eligible matches", () => {
    const recs = buildRecommendations([verifiedBertoua()], SAMPLE_ORGANIZATIONS);
    expect(recs.filter((r) => r.org.status !== "verified").every((r) => r.category !== "eligible")).toBe(true);
  });
  it("unverified offers cannot produce fully eligible matches", () => {
    const recs = buildRecommendations([verifiedBertoua()], SAMPLE_ORGANIZATIONS);
    expect(recs.filter((r) => r.offer.status !== "verified").every((r) => r.category !== "eligible")).toBe(true);
  });
  it("unverified school needs cannot produce fully eligible matches", () => {
    const recs = buildRecommendations([bertoua], SAMPLE_ORGANIZATIONS); // requests pending review
    expect(recs.every((r) => r.category !== "eligible")).toBe(true);
    expect(recs.some((r) => r.category === "needs_verification")).toBe(true);
  });
  it("damaged equipment receives a deployment warning and is not eligible", () => {
    const orgs = SAMPLE_ORGANIZATIONS.map((o) => o.id === "org-1"
      ? { ...o, offers: o.offers.map((of) => of.id === "org-1-offer-1" ? { ...of, condition: "requires_repair" as const } : of) }
      : o);
    const rec = buildRecommendations([verifiedBertoua()], orgs).find((r) => r.offer.id === "org-1-offer-1")!;
    expect(rec.category).toBe("needs_infrastructure");
    expect(rec.warnings.some((w) => w.includes("requires repair"))).toBe(true);
  });
  it("identifies electricity and connectivity limitations without disqualifying the school", () => {
    const rec = buildRecommendations([verifiedBertoua()], SAMPLE_ORGANIZATIONS).find((r) => r.offer.id === "org-1-offer-1")!;
    expect(rec.category).toBe("needs_infrastructure"); // intermittent power + no internet
    expect(rec.warnings.some((w) => w.includes("intermittent"))).toBe(true);
    expect(rec.warnings.some((w) => w.includes("internet"))).toBe(true);
    expect(rec.recommendedQty).toBeGreaterThan(0); // still recommendable, with prerequisites
  });
  it("a fully verified, infrastructure-ready match is eligible", () => {
    // Bafoussam: reliable power, verified teacher-training request; org-3 verified with a verified nationwide training offer.
    const school = verifiedSchool("s5");
    const orgs = reviewOrganization(SAMPLE_ORGANIZATIONS, admin, "org-3", "verified", AT);
    const orgs2 = reviewOrgOffer(orgs, admin, "org-3", orgs.find((o) => o.id === "org-3")!.offers[0]!.id, "verified", AT);
    const recs = buildRecommendations([school], orgs2);
    expect(recs.some((r) => r.category === "eligible")).toBe(true);
  });
});

describe("quantities", () => {
  it("recommended quantity never exceeds available stock or outstanding need", () => {
    const school = verifiedBertoua();
    const recs = buildRecommendations([school], SAMPLE_ORGANIZATIONS);
    for (const r of recs) {
      if (r.recommendedQty === undefined) continue;
      expect(r.recommendedQty).toBeLessThanOrEqual(r.outstandingQty!);
      expect(r.recommendedQty).toBeLessThanOrEqual((r.offer.quantity ?? 0) - (r.offer.reserved ?? 0) - (r.offer.delivered ?? 0));
    }
    const laptops = recs.find((r) => r.offer.id === "org-1-offer-1" && r.request.resource === "Laptops")!;
    expect(laptops.recommendedQty).toBe(Math.min(laptops.outstandingQty!, 30));
    expect(laptops.remainingOfferQty).toBe(30 - laptops.recommendedQty!);
  });
});

describe("allocation comparison", () => {
  function setup() {
    // Two verified schools requesting the same resource, one verified offer of 30 laptops.
    const a = verifiedBertoua(); // East, laptop request verified
    const bBase = SAMPLE_SCHOOLS.find((s) => s.region === "Centre")!;
    let b: School = { ...bBase, verification: "verified" as const };
    for (const r of b.requests ?? []) b = reviewDemoRequest([b], admin, b.id, r.id, "verified", AT).find((x) => x.id === b.id)!;
    const orgs = SAMPLE_ORGANIZATIONS.map((o) => o.id === "org-1" ? { ...o, offers: o.offers.map((of) => ({ ...of, serviceAreas: ["Nationwide"] })) } : o);
    return { schools: [a, b], orgs };
  }
  it("compares Priority First and Balanced Distribution without double counting", () => {
    const { schools, orgs } = setup();
    const typeId = comparableTypes(schools, orgs).find((t) => t.name === "Laptops");
    expect(typeId).toBeDefined();
    const cmp = compareAllocations(schools, orgs, typeId!.id)!;
    expect(cmp.stock).toBe(30);
    for (const sc of cmp.scenarios) {
      expect(sc.totalUsed).toBeLessThanOrEqual(cmp.stock);
      expect(sc.unallocated).toBe(cmp.stock - sc.totalUsed);
      for (const l of sc.lines) expect(l.qty).toBeLessThanOrEqual(l.request.quantity!);
    }
    const pf = cmp.scenarios.find((s) => s.key === "priority_first")!;
    const bal = cmp.scenarios.find((s) => s.key === "balanced")!;
    // Priority first concentrates on the top-ranked school; balanced spreads wider or equal.
    expect(bal.lines.length).toBeGreaterThanOrEqual(pf.lines.length);
  });
  it("returns null when nothing is fully eligible", () => {
    expect(compareAllocations(SAMPLE_SCHOOLS, SAMPLE_ORGANIZATIONS, "digital-equipment:laptops")).toBeNull();
  });
});

describe("ranking", () => {
  it("weights sum to 1 so no single factor dominates", () => {
    const total = Object.values(RANK_WEIGHTS).reduce((a, w) => a + w, 0);
    expect(Math.abs(total - 1)).toBeLessThan(1e-9);
  });
  it("is deterministic and explains itself", () => {
    const a = buildRecommendations([bertoua], SAMPLE_ORGANIZATIONS);
    const b = buildRecommendations([bertoua], SAMPLE_ORGANIZATIONS);
    expect(a.map((r) => `${r.offer.id}:${r.request.id}:${r.score}`)).toEqual(b.map((r) => `${r.offer.id}:${r.request.id}:${r.score}`));
    const rec = a.find((r) => r.offer.id === "org-1-offer-1")!;
    expect(rec.reasons.length).toBeGreaterThan(2);
    expect(rec.prerequisites.length).toBeGreaterThan(0);
    expect(rec.reasons.some((x) => x.includes("shared-catalogue"))).toBe(true);
  });
  it("marks self-reported urgency as provisional until verified", () => {
    const rec = buildRecommendations([bertoua], SAMPLE_ORGANIZATIONS).find((r) => r.request.urgency)!;
    expect(rec.reasons.some((x) => x.includes("provisional"))).toBe(true);
  });
});

describe("community aggregation", () => {
  it("counts each request and offer once and never reduces outstanding needs", () => {
    const school = verifiedBertoua();
    const recs = buildRecommendations([school], SAMPLE_ORGANIZATIONS);
    const m = communityMatchSummary(recs, "Bertoua");
    expect(m.potential).toBeLessThanOrEqual(m.outstanding);
    expect(m.unmet).toBe(m.outstanding - m.potential);
    expect(m.potential).toBeLessThanOrEqual(m.offered);
  });
  it("reacts to updated offers", () => {
    const school = verifiedBertoua();
    const before = communityMatchSummary(buildRecommendations([school], SAMPLE_ORGANIZATIONS), "Bertoua");
    const orgs: Organization[] = SAMPLE_ORGANIZATIONS.map((o) => o.id === "org-1"
      ? { ...o, offers: [...o.offers, { ...newOffer("org-1"), id: "org-1-offer-9", resourceTypeId: "digital-equipment:laptops", quantity: 10, unit: "units", condition: "new" as const, location: "Yaoundé", serviceAreas: ["East"], status: "verified" as const, submittedAt: AT }] }
      : o);
    const after = communityMatchSummary(buildRecommendations([school], orgs), "Bertoua");
    expect(after.offered).toBe(before.offered + 10);
  });
  it("organization review changes flow into recommendations", () => {
    // Bafoussam requests teacher training; org-3 offers it nationwide.
    const bBase = SAMPLE_SCHOOLS.find((s) => s.region === "West")!;
    let school: School = { ...bBase, verification: "verified" as const };
    for (const r of school.requests ?? []) school = reviewDemoRequest([school], admin, school.id, r.id, "verified", AT).find((x) => x.id === school.id)!;
    const before = buildRecommendations([school], SAMPLE_ORGANIZATIONS);
    expect(before.find((r) => r.org.id === "org-3")!.category).toBe("needs_verification");
    const orgs = reviewOrganization(SAMPLE_ORGANIZATIONS, admin, "org-3", "verified", AT);
    const orgs2 = reviewOrgOffer(orgs, admin, "org-3", orgs.find((o) => o.id === "org-3")!.offers[0]!.id, "verified", AT);
    const after = buildRecommendations([school], orgs2);
    expect(after.find((r) => r.org.id === "org-3")!.category).toBe("eligible");
  });
});
