import { describe, expect, it } from "vitest";
import { SAMPLE_SCHOOLS } from "@/lib/impact";
import { CATALOG, catalogEntry, requestTypeId } from "@/lib/catalog";
import {
  SAMPLE_ORGANIZATIONS, availableQty, findMatches, needsRepair, newOffer, orgLogin, registerOrganization, reviewOrganization, reviewOrgOffer,
  submitOrgOffers, type Organization, type ResourceOffer,
} from "@/lib/partners";
import { RESOURCE_CATALOG } from "@/lib/resource-requests";

const AT = "2026-10-17T12:00:00.000Z";
const orgSession = (orgId: string) => ({ role: "organization" as const, orgId });
const admin = { role: "admin" as const };

describe("shared resource catalogue", () => {
  it("covers every school-assessment category and resource with a stable ID", () => {
    for (const [category, resources] of Object.entries(RESOURCE_CATALOG)) {
      for (const name of resources) {
        const entry = catalogEntry(requestTypeId(category as keyof typeof RESOURCE_CATALOG, name));
        expect(entry, `${category}/${name}`).toBeDefined();
        expect(entry!.name).toBe(name);
      }
    }
  });
  it("school requests and offers reference the same resource ID", () => {
    expect(requestTypeId("Digital equipment", "Laptops")).toBe("digital-equipment:laptops");
    expect(SAMPLE_ORGANIZATIONS[0]!.offers[0]!.resourceTypeId).toBe("digital-equipment:laptops");
  });
});

describe("organization accounts", () => {
  it("provides demo access to at least one existing fictional organization", () => {
    expect(orgLogin(SAMPLE_ORGANIZATIONS, "org-1", "demo-only")).toEqual({ role: "organization", orgId: "org-1" });
    expect(orgLogin(SAMPLE_ORGANIZATIONS, "org-1@camnexus.example", "demo-only")).toEqual({ role: "organization", orgId: "org-1" });
  });
  it("rejects wrong passwords and unknown accounts", () => {
    expect(orgLogin(SAMPLE_ORGANIZATIONS, "org-1", "wrong")).toBeNull();
    expect(orgLogin(SAMPLE_ORGANIZATIONS, "nobody", "demo-only")).toBeNull();
  });
  it("registers a new organization as Pending Verification with a unique ID", () => {
    const { orgs, org } = registerOrganization(SAMPLE_ORGANIZATIONS, {
      orgName: "Test Org", orgType: "Business", contactName: "Rep", contactEmail: "rep@example.com",
      country: "Cameroon", location: "Douala", regions: ["Littoral"],
    }, AT);
    expect(org.status).toBe("pending_verification");
    expect(org.id).toBeTruthy();
    expect(orgs).toHaveLength(SAMPLE_ORGANIZATIONS.length + 1);
    expect(new Set(orgs.map((o) => o.id)).size).toBe(orgs.length);
  });
});

describe("resource offers", () => {
  const validOffer = (orgId: string): ResourceOffer => ({ ...newOffer(orgId), quantity: 10, condition: "new", location: "Yaoundé" });
  it("an organization can submit multiple offers, each with a unique ID", () => {
    const a = validOffer("org-1"), b = { ...validOffer("org-1"), id: crypto.randomUUID() };
    const next = submitOrgOffers(SAMPLE_ORGANIZATIONS, orgSession("org-1"), "org-1", [a, b], AT);
    const offers = next.find((o) => o.id === "org-1")!.offers;
    expect(offers).toHaveLength(2);
    expect(new Set(offers.map((o) => o.id)).size).toBe(2);
    expect(offers.every((o) => o.status === "pending_review")).toBe(true);
  });
  it("an organization cannot submit offers for another organization", () => {
    expect(() => submitOrgOffers(SAMPLE_ORGANIZATIONS, orgSession("org-2"), "org-1", [validOffer("org-1")], AT)).toThrow();
    expect(() => submitOrgOffers(SAMPLE_ORGANIZATIONS, null, "org-1", [validOffer("org-1")], AT)).toThrow();
  });
  it("modifying a submitted verified offer returns it to Pending Review and preserves history", () => {
    const org1 = SAMPLE_ORGANIZATIONS[0]!;
    const edited = { ...org1.offers[0]!, quantity: 99 };
    const next = submitOrgOffers(SAMPLE_ORGANIZATIONS, orgSession("org-1"), "org-1", [edited, org1.offers[1]!], AT);
    const saved = next.find((o) => o.id === "org-1")!.offers[0]!;
    expect(saved.status).toBe("pending_review");
    expect(saved.history.length).toBe(1);
    expect((saved.history[0]!.snapshot as unknown as ResourceOffer).quantity).toBe(30);
  });
  it("an unchanged verified offer keeps its status on resubmission", () => {
    const org1 = SAMPLE_ORGANIZATIONS[0]!;
    const next = submitOrgOffers(SAMPLE_ORGANIZATIONS, orgSession("org-1"), "org-1", [...org1.offers], AT);
    expect(next.find((o) => o.id === "org-1")!.offers[0]!.status).toBe("verified");
  });
});

describe("verification separation", () => {
  it("only demo administrators may change organization status", () => {
    expect(() => reviewOrganization(SAMPLE_ORGANIZATIONS, orgSession("org-1"), "org-3", "verified", AT)).toThrow();
    const next = reviewOrganization(SAMPLE_ORGANIZATIONS, admin, "org-3", "verified", AT);
    expect(next.find((o) => o.id === "org-3")!.status).toBe("verified");
  });
  it("organization verification does not verify its offers", () => {
    const next = reviewOrganization(SAMPLE_ORGANIZATIONS, admin, "org-3", "verified", AT);
    expect(next.find((o) => o.id === "org-3")!.offers[0]!.status).toBe("pending_review");
  });
  it("only demo administrators may verify offers", () => {
    expect(() => reviewOrgOffer(SAMPLE_ORGANIZATIONS, orgSession("org-1"), "org-1", "org-1-offer-2", "verified", AT)).toThrow();
    const next = reviewOrgOffer(SAMPLE_ORGANIZATIONS, admin, "org-1", "org-1-offer-2", "verified", AT);
    expect(next.find((o) => o.id === "org-1")!.offers[1]!.status).toBe("verified");
  });
});

describe("match preparation", () => {
  const bertoua = SAMPLE_SCHOOLS.find((s) => s.region === "East")!;
  it("matches a verified laptop offer to a digital-literacy school", () => {
    const m = findMatches([bertoua], SAMPLE_ORGANIZATIONS);
    const laptops = m.find((x) => x.offer.id === "org-1-offer-1");
    expect(laptops).toBeDefined();
    expect(laptops!.needs).toContain("Digital literacy");
  });
  it("verified offers from verified organizations are not actionable while the school's needs stay unverified", () => {
    const m = findMatches([bertoua], SAMPLE_ORGANIZATIONS);
    const laptops = m.find((x) => x.offer.id === "org-1-offer-1")!;
    expect(laptops.actionable).toBe(false);
    expect(laptops.warnings.some((w) => w.includes("not yet verified"))).toBe(true);
    const verifiedSchool = { ...bertoua, verification: "verified" as const };
    const m2 = findMatches([verifiedSchool], SAMPLE_ORGANIZATIONS);
    expect(m2.find((x) => x.offer.id === "org-1-offer-1")!.actionable).toBe(true);
  });
  it("available quantity is total minus reserved and delivered, never negative", () => {
    const offer = { ...newOffer("org-1"), quantity: 10, reserved: 4, delivered: 3 };
    expect(availableQty(offer)).toBe(3);
    expect(availableQty({ ...offer, reserved: 9, delivered: 5 })).toBe(0);
    expect(availableQty({ ...offer, quantity: undefined })).toBeUndefined();
  });
  it("requires-repair equipment is flagged and never actionable", () => {
    const verifiedSchool = { ...bertoua, verification: "verified" as const };
    const orgs = SAMPLE_ORGANIZATIONS.map((o) => o.id === "org-1"
      ? { ...o, offers: o.offers.map((of) => of.id === "org-1-offer-1" ? { ...of, condition: "requires_repair" as const } : of) }
      : o);
    const m = findMatches([verifiedSchool], orgs);
    const laptops = m.find((x) => x.offer.id === "org-1-offer-1")!;
    expect(needsRepair(laptops.offer)).toBe(true);
    expect(laptops.warnings.some((w) => w.includes("requires repair"))).toBe(true);
  });
  it("only verified offers from verified organizations are actionable", () => {
    const m = findMatches([bertoua], SAMPLE_ORGANIZATIONS);
    const pendingOffer = m.find((x) => x.offer.id === "org-1-offer-2");
    if (pendingOffer) expect(pendingOffer.actionable).toBe(false);
    const verifiedOrg = reviewOrganization(SAMPLE_ORGANIZATIONS, admin, "org-3", "verified", AT);
    const m2 = findMatches(SAMPLE_SCHOOLS, verifiedOrg);
    expect(m2.filter((x) => x.org.id === "org-3").every((x) => !x.actionable)).toBe(true);
  });
  it("skips regions the offer does not serve unless nationwide", () => {
    const west = SAMPLE_SCHOOLS.find((s) => s.region === "West")!;
    expect(findMatches([west], [SAMPLE_ORGANIZATIONS[1]!]).length).toBe(0);
    expect(findMatches([west], [SAMPLE_ORGANIZATIONS[0]!]).length).toBeGreaterThan(0);
  });
  it("custom Other offers never auto-match", () => {
    const custom: Organization = { ...SAMPLE_ORGANIZATIONS[0]!, id: "org-x", offers: [{ ...newOffer("org-x"), resourceTypeId: "digital-equipment:other", customResource: "3D printers", quantity: 2, condition: "new", location: "Yaoundé", status: "verified" }] };
    expect(findMatches(SAMPLE_SCHOOLS, [custom]).length).toBe(0);
  });
  it("catalogue IDs stay stable for future matching", () => {
    expect(CATALOG.length).toBeGreaterThan(20);
    expect(new Set(CATALOG.map((e) => e.id)).size).toBe(CATALOG.length);
  });
});
