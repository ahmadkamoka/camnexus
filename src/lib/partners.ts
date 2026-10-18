import { z } from "zod";
import { CATALOG, catalogEntry } from "./catalog";
import { CATEGORY_NEEDS, REQUEST_STATUSES, type RequestStatus } from "./resource-requests";
import { scoreSchool, type Evidence, type Need, type School } from "./impact";
import { DEMO_PASSWORD, type DemoSession } from "./school-demo";

export const ORG_TYPES = ["Business", "Nonprofit", "Educational Institution", "Community Organization", "Government Agency", "Other"] as const;
export type OrgType = (typeof ORG_TYPES)[number];
export const ORG_STATUSES = ["pending_verification", "under_review", "verified"] as const;
export type OrgStatus = (typeof ORG_STATUSES)[number];
export const ORG_STATUS_LABEL: Record<OrgStatus, string> = {
  pending_verification: "Pending Verification", under_review: "Under Review", verified: "Verified (demo)",
};
export const OFFER_CONDITIONS = ["new", "refurbished", "used_working", "requires_repair"] as const;
export type OfferCondition = (typeof OFFER_CONDITIONS)[number];
export const CONDITION_LABEL: Record<OfferCondition, string> = {
  new: "New", refurbished: "Refurbished", used_working: "Used — Working", requires_repair: "Requires Repair",
};
export const DELIVERY_OPTIONS = ["transport", "logistics_partner", "digital", "na"] as const;
export type DeliveryOption = (typeof DELIVERY_OPTIONS)[number];
export const DELIVERY_LABEL: Record<DeliveryOption, string> = {
  transport: "Can arrange transportation", logistics_partner: "Requires a logistics partner",
  digital: "Digital or remote delivery", na: "Not applicable",
};
export const NATIONWIDE = "Nationwide";

export interface OfferReview { at: string; status: RequestStatus; note?: string | undefined }
export interface ResourceOffer {
  id: string;
  orgId: string;
  /** Stable shared-catalogue resource type ID (see src/lib/catalog.ts). */
  resourceTypeId: string;
  customResource?: string | undefined;
  quantity?: number | undefined;
  unit: string;
  /** Quantity reserved for an approved allocation (demo: always 0 — no allocation workflow yet). */
  reserved?: number | undefined;
  /** Quantity confirmed delivered (demo: always 0 — no delivery tracking yet). */
  delivered?: number | undefined;
  /** For services, training and infrastructure work: capacity or scope instead of a unit count. */
  capacityScope?: string | undefined;
  condition?: OfferCondition | undefined;
  /** ISO date; undefined = available immediately. */
  availableFrom?: string | undefined;
  location: string;
  serviceAreas: string[];
  delivery: DeliveryOption;
  info?: string | undefined;
  evidence: Evidence[];
  status: RequestStatus;
  submittedAt?: string | undefined;
  reviewHistory: OfferReview[];
  /** Snapshots of previously submitted versions, preserved when an offer is modified. */
  history: { at: string; note: string; snapshot: Record<string, unknown> }[];
}

export interface Organization {
  id: string;
  orgName: string;
  orgType: OrgType;
  regNumber?: string | undefined;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | undefined;
  country: string;
  location: string;
  /** Regions or communities the organization can support; [NATIONWIDE] = all. */
  regions: string[];
  website?: string | undefined;
  accountId: string;
  email: string;
  status: OrgStatus;
  createdAt: string;
  reviewHistory: { at: string; status: OrgStatus; note?: string | undefined }[];
  offers: ResourceOffer[];
}

export type OrgSession = { role: "organization"; orgId: string } | { role: "admin" };

export const registrationSchema = z.object({
  orgName: z.string().trim().min(1, "Organization name is required.").max(120),
  orgType: z.enum(ORG_TYPES),
  regNumber: z.string().trim().max(80).optional(),
  contactName: z.string().trim().min(1, "Contact representative's name is required.").max(100),
  contactEmail: z.string().trim().email("Enter a valid contact email.").max(255),
  contactPhone: z.string().trim().max(40).optional(),
  country: z.string().trim().min(1, "Country is required.").max(80),
  location: z.string().trim().min(1, "Primary location is required.").max(120),
  regions: z.array(z.string().max(80)).min(1, "Select at least one region or community to support.").max(20),
  website: z.string().trim().max(200).optional(),
});

const count = z.number().int().min(0).max(1_000_000);
const evidenceSchema = z.object({ id: z.string().min(1).max(100), name: z.string().max(120), type: z.string().max(100), size: z.number().nonnegative(),
  preview: z.string().max(100000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/).optional() });
export const offerSchema = z.object({
  id: z.string().min(1).max(100), orgId: z.string().max(100), resourceTypeId: z.string().min(1).max(160),
  customResource: z.string().trim().max(120).optional(),
  quantity: count.optional(), unit: z.string().min(1).max(80), capacityScope: z.string().trim().max(1000).optional(),
  reserved: count.optional(), delivered: count.optional(),
  condition: z.enum(OFFER_CONDITIONS).optional(), availableFrom: z.string().max(40).optional(),
  location: z.string().trim().min(1, "Enter the current resource location.").max(120),
  serviceAreas: z.array(z.string().max(80)).min(1, "Select at least one service area.").max(20),
  delivery: z.enum(DELIVERY_OPTIONS), info: z.string().trim().max(1000).optional(), evidence: z.array(evidenceSchema).max(5),
  status: z.enum(REQUEST_STATUSES), submittedAt: z.string().datetime().optional(),
  reviewHistory: z.array(z.object({ at: z.string().datetime(), status: z.enum(REQUEST_STATUSES), note: z.string().max(1000).optional() })),
  history: z.array(z.object({ at: z.string().datetime(), note: z.string().max(1000), snapshot: z.record(z.string(), z.unknown()) })).max(100),
}).superRefine((o, ctx) => {
  const entry = catalogEntry(o.resourceTypeId);
  if (!entry) { ctx.addIssue({ code: "custom", message: "Choose a resource from the shared catalogue." }); return; }
  if (entry.custom && !o.customResource?.trim()) ctx.addIssue({ code: "custom", message: "Describe the custom resource." });
  if (entry.classification === "physical_goods") {
    if (o.quantity === undefined || o.quantity < 1) ctx.addIssue({ code: "custom", message: "Enter a positive whole-number quantity." });
    if (!o.condition) ctx.addIssue({ code: "custom", message: "Select the resource condition." });
  } else if (!o.capacityScope?.trim()) {
    ctx.addIssue({ code: "custom", message: "Describe the available capacity or scope." });
  }
});
export const offersSchema = z.array(offerSchema).min(1, "Add at least one resource offer.").max(50)
  .superRefine((offers, ctx) => {
    if (new Set(offers.map((o) => o.id)).size !== offers.length) ctx.addIssue({ code: "custom", message: "Offer IDs must be unique." });
  });

/** Validation issues shown on the offer card before submission. */
export function offerIssues(o: ResourceOffer): string[] {
  const issues: string[] = [];
  const entry = catalogEntry(o.resourceTypeId);
  if (!entry) issues.push("Choose a resource from the shared catalogue.");
  else {
    if (entry.custom && !o.customResource?.trim()) issues.push("Describe the custom resource.");
    if (entry.classification === "physical_goods") {
      if (o.quantity === undefined || o.quantity < 1) issues.push("Enter a positive whole-number quantity.");
      if (!o.condition) issues.push("Select the resource condition.");
    } else if (!o.capacityScope?.trim()) issues.push("Describe the available capacity or scope.");
  }
  if (!o.location.trim()) issues.push("Enter the current resource location.");
  if (!o.serviceAreas.length) issues.push("Select at least one service area.");
  return issues;
}

export function newOffer(orgId: string): ResourceOffer {
  const first = CATALOG.find((e) => e.category === "Digital equipment")!;
  return { id: crypto.randomUUID(), orgId, resourceTypeId: first.id, unit: first.unit, condition: "refurbished",
    location: "", serviceAreas: [NATIONWIDE], delivery: "transport", evidence: [], status: "pending_review", reviewHistory: [], history: [] };
}

export const offerName = (o: ResourceOffer) => {
  const entry = catalogEntry(o.resourceTypeId);
  return !entry ? "Unknown resource" : entry.custom ? o.customResource || "Other resource" : entry.name;
};
export const offerAmount = (o: ResourceOffer) => {
  const entry = catalogEntry(o.resourceTypeId);
  if (entry && entry.classification !== "physical_goods") return o.capacityScope || "Scope not recorded";
  return o.quantity === undefined ? "Quantity not recorded" : `${o.quantity} ${o.unit}`;
};

/** Remaining available = total offered − reserved − confirmed delivered, never negative. */
export function availableQty(o: ResourceOffer): number | undefined {
  if (o.quantity === undefined) return undefined;
  return Math.max(0, o.quantity - (o.reserved ?? 0) - (o.delivered ?? 0));
}

/** "Requires Repair" items are flagged until their condition is resolved. */
export const needsRepair = (o: ResourceOffer) => o.condition === "requires_repair";

// Material modifications return a previously reviewed offer to Pending Review and preserve a snapshot.
export function materialOfferChange(a: ResourceOffer, b: ResourceOffer): boolean {
  return a.resourceTypeId !== b.resourceTypeId || (a.customResource ?? "") !== (b.customResource ?? "")
    || a.quantity !== b.quantity || (a.capacityScope ?? "") !== (b.capacityScope ?? "")
    || a.condition !== b.condition || (a.availableFrom ?? "") !== (b.availableFrom ?? "")
    || a.delivery !== b.delivery || a.location.trim() !== b.location.trim()
    || a.serviceAreas.join("|") !== b.serviceAreas.join("|") || (a.info ?? "") !== (b.info ?? "");
}

// --- Demo data: three clearly fictional organizations ---
const demoAt = "2026-10-01T09:00:00.000Z";
const demoReview = (status: RequestStatus): OfferReview[] => [{ at: demoAt, status }];
const demoOffer = (o: Partial<ResourceOffer> & Pick<ResourceOffer, "id" | "orgId" | "resourceTypeId">): ResourceOffer => ({
  unit: catalogEntry(o.resourceTypeId)?.unit ?? "units", location: "Yaoundé (fictional depot)", serviceAreas: [NATIONWIDE],
  delivery: "transport", evidence: [], status: "pending_review", submittedAt: demoAt, reviewHistory: [], history: [], ...o,
});
export const SAMPLE_ORGANIZATIONS: Organization[] = [
  {
    id: "org-1", orgName: "Sample: Digital Bridge Initiative (fictional)", orgType: "Nonprofit",
    contactName: "Demo Contact", contactEmail: "org-1@camnexus.example", country: "Cameroon", location: "Yaoundé (fictional)",
    regions: [NATIONWIDE], accountId: "org-1", email: "org-1@camnexus.example", status: "verified", createdAt: demoAt,
    reviewHistory: [{ at: demoAt, status: "verified", note: "Demo verification — simulated only." }],
    offers: [
      demoOffer({ id: "org-1-offer-1", orgId: "org-1", resourceTypeId: "digital-equipment:laptops", quantity: 30, condition: "refurbished", status: "verified", reviewHistory: demoReview("verified"), info: "Illustrative offer — wiped and tested refurbished laptops." }),
      demoOffer({ id: "org-1-offer-2", orgId: "org-1", resourceTypeId: "digital-equipment:tablets", quantity: 15, condition: "new", delivery: "logistics_partner" }),
    ],
  },
  {
    id: "org-2", orgName: "Sample: Readers for All (fictional)", orgType: "Educational Institution",
    contactName: "Demo Contact", contactEmail: "org-2@camnexus.example", country: "Cameroon", location: "Douala (fictional)",
    regions: ["Centre", "Littoral", "East"], accountId: "org-2", email: "org-2@camnexus.example", status: "verified", createdAt: demoAt,
    reviewHistory: [{ at: demoAt, status: "verified", note: "Demo verification — simulated only." }],
    offers: [
      demoOffer({ id: "org-2-offer-1", orgId: "org-2", resourceTypeId: "books-and-educational-materials:textbooks", quantity: 500, condition: "new", status: "verified", reviewHistory: demoReview("verified"), location: "Douala (fictional warehouse)", serviceAreas: ["Centre", "Littoral", "East"] }),
      demoOffer({ id: "org-2-offer-2", orgId: "org-2", resourceTypeId: "books-and-educational-materials:stationery", quantity: 200, condition: "new", location: "Douala (fictional warehouse)", serviceAreas: ["Centre", "Littoral"] }),
    ],
  },
  {
    id: "org-3", orgName: "Sample: Teacher Upskill Collective (fictional)", orgType: "Community Organization",
    contactName: "Demo Contact", contactEmail: "org-3@camnexus.example", country: "Cameroon", location: "Bamenda (fictional)",
    regions: ["Northwest", "West"], accountId: "org-3", email: "org-3@camnexus.example", status: "pending_verification", createdAt: demoAt,
    reviewHistory: [],
    offers: [
      demoOffer({ id: "org-3-offer-1", orgId: "org-3", resourceTypeId: "teacher-training:digital-literacy-training", capacityScope: "Digital literacy training for up to 20 teachers (fictional)", delivery: "digital", location: "Remote (fictional)", serviceAreas: [NATIONWIDE] }),
    ],
  },
];

/** Backfill defaults for records saved by earlier versions of the prototype. */
export function normalizeOrganization(raw: unknown): Organization | null {
  if (!raw || typeof raw !== "object") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose record from browser storage
  const o: any = raw;
  if (typeof o.id !== "string" || typeof o.orgName !== "string") return null;
  const status: OrgStatus = o.status === "verified" ? "verified" : o.status === "under_review" ? "under_review" : "pending_verification";
  return {
    id: o.id, orgName: o.orgName,
    orgType: (ORG_TYPES as readonly string[]).includes(o.orgType as string) ? o.orgType as OrgType : "Other",
    regNumber: typeof o.regNumber === "string" ? o.regNumber : undefined,
    contactName: typeof o.contactName === "string" ? o.contactName : "Not recorded",
    contactEmail: typeof o.contactEmail === "string" ? o.contactEmail : "",
    contactPhone: typeof o.contactPhone === "string" ? o.contactPhone : undefined,
    country: typeof o.country === "string" ? o.country : "Cameroon",
    location: typeof o.location === "string" ? o.location : "Not recorded",
    regions: Array.isArray(o.regions) ? (o.regions as unknown[]).filter((r): r is string => typeof r === "string") : [NATIONWIDE],
    website: typeof o.website === "string" ? o.website : undefined,
    accountId: typeof o.accountId === "string" ? o.accountId : o.id,
    email: typeof o.email === "string" ? o.email : "",
    status, createdAt: typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString(),
    reviewHistory: Array.isArray(o.reviewHistory) ? o.reviewHistory as Organization["reviewHistory"] : [],
    offers: Array.isArray(o["offers"]) ? (o["offers"] as ResourceOffer[]).map((of) => ({ ...of, orgId: o["id"] as string, history: of.history ?? [], reviewHistory: of.reviewHistory ?? [], evidence: of.evidence ?? [] })) : [],
  };
}

/** Simulated demo login — fictional accounts only, not production authentication. */
export function orgLogin(orgs: Organization[], account: string, password: string): OrgSession | null {
  const normalized = account.trim().toLowerCase();
  const org = orgs.find((o) => normalized === o.accountId.toLowerCase() || (o.email && normalized === o.email.toLowerCase()));
  return org && password === DEMO_PASSWORD ? { role: "organization", orgId: org.id } : null;
}

export function registerOrganization(orgs: Organization[], data: z.infer<typeof registrationSchema>, at: string): { orgs: Organization[]; org: Organization } {
  const parsed = registrationSchema.parse(data);
  z.string().datetime().parse(at);
  const id = crypto.randomUUID();
  const n = orgs.length + 1;
  const org: Organization = {
    ...parsed, regNumber: parsed.regNumber || undefined, contactPhone: parsed.contactPhone || undefined, website: parsed.website || undefined,
    id, accountId: `org-${id.slice(0, 8)}`, email: `org-${n}@camnexus.example`,
    status: "pending_verification", createdAt: at, reviewHistory: [], offers: [],
  };
  return { orgs: [...orgs, org], org };
}

/** An organization account can only submit offers for its own organization. */
export function submitOrgOffers(orgs: Organization[], session: OrgSession | null, orgId: string, offers: ResourceOffer[], at: string): Organization[] {
  if (session?.role !== "organization" || session.orgId !== orgId) throw new Error("This demo account cannot submit offers for that organization.");
  const org = orgs.find((o) => o.id === orgId);
  if (!org) throw new Error("Organization not found.");
  z.string().datetime().parse(at);
  const parsed = offersSchema.parse(offers);
  const next = parsed.map((o) => {
    const base: ResourceOffer = { ...o, orgId, history: o.history ?? [] };
    const prior = org.offers.find((p) => p.id === o.id);
    if (!prior) return { ...base, status: "pending_review" as const, submittedAt: at, reviewHistory: [] };
    if (!materialOfferChange(prior, base) && prior.status !== "pending_review")
      return { ...base, status: prior.status, submittedAt: at, reviewHistory: prior.reviewHistory, history: prior.history };
    const { history: _h, ...snapshot } = prior;
    return { ...base, status: "pending_review" as const, submittedAt: at,
      reviewHistory: prior.status !== "pending_review"
        ? [...prior.reviewHistory, { at, status: "pending_review" as const, note: "Material change submitted; administrator reassessment required." }]
        : prior.reviewHistory,
      history: prior.submittedAt ? [...prior.history, { at, note: "Previous submitted version preserved.", snapshot: JSON.parse(JSON.stringify(snapshot)) as Omit<ResourceOffer, "history"> }] : prior.history };
  });
  return orgs.map((o) => o.id === orgId ? { ...o, offers: next } : o);
}

export function reviewOrganization(orgs: Organization[], session: OrgSession | DemoSession | null, orgId: string, status: OrgStatus, at: string, note?: string): Organization[] {
  if (session?.role !== "admin") throw new Error("CamNexus Administrator access is required.");
  z.enum(ORG_STATUSES).parse(status); z.string().datetime().parse(at);
  const message = z.string().trim().max(1000).optional().parse(note);
  return orgs.map((o) => o.id === orgId ? { ...o, status, reviewHistory: [...o.reviewHistory, { at, status, note: message }] } : o);
}

export function reviewOrgOffer(orgs: Organization[], session: OrgSession | DemoSession | null, orgId: string, offerId: string, status: RequestStatus, at: string, note?: string): Organization[] {
  if (session?.role !== "admin") throw new Error("CamNexus Administrator access is required.");
  z.enum(REQUEST_STATUSES).parse(status); z.string().datetime().parse(at);
  const message = z.string().trim().max(1000).optional().parse(note);
  const org = orgs.find((o) => o.id === orgId);
  if (!org?.offers.some((o) => o.id === offerId)) throw new Error("Offer not found.");
  return orgs.map((o) => o.id === orgId
    ? { ...o, offers: o.offers.map((of) => of.id === offerId ? { ...of, status, reviewHistory: [...of.reviewHistory, { at, status, note: message }] } : of) }
    : o);
}

// --- Rule-based match preparation (review only — no automatic allocation) ---
export interface Match {
  org: Organization;
  offer: ResourceOffer;
  school: School;
  needs: Need[];
  /** Eligible for review only when the organization, the offer AND the school's needs are verified, with remaining quantity. */
  actionable: boolean;
  warnings: string[];
}

export function findMatches(schools: School[], orgs: Organization[]): Match[] {
  const out: Match[] = [];
  for (const org of orgs) {
    for (const offer of org.offers) {
      if (offer.status === "rejected") continue;
      const entry = catalogEntry(offer.resourceTypeId);
      if (!entry || entry.custom) continue; // custom "Other" entries never auto-match
      if (entry.classification === "physical_goods" && (offer.quantity === undefined || offer.quantity < 1)) continue;
      const categoryNeeds = CATEGORY_NEEDS[entry.category];
      if (!categoryNeeds.length) continue;
      for (const s of schools) {
        if (!offer.serviceAreas.includes(NATIONWIDE) && !offer.serviceAreas.includes(s.region)) continue;
        const needs = s.needs.filter((n) => categoryNeeds.includes(n));
        if (!needs.length) continue;
        const warnings: string[] = [];
        if (needsRepair(offer)) warnings.push("Equipment requires repair — not immediately deployable until the condition is resolved.");
        if (availableQty(offer) === 0) warnings.push("No remaining available quantity.");
        if (entry.category === "Digital equipment" && s.electricity !== "reliable")
          warnings.push(s.electricity === "unknown" ? "Electricity status unknown — confirm before deploying equipment." : "Electricity is not reliable — power infrastructure may be needed before equipment deployment.");
        if (entry.category === "Digital equipment" && s.internet === "none") warnings.push("No internet — plan for offline content.");
        const schoolVerified = (s.verification ?? "unverified") === "verified";
        if (!schoolVerified) warnings.push("School assessment is not yet verified.");
        if (scoreSchool(s).insufficient) warnings.push("School data is incomplete — additional assessment required.");
        // Eligible for review only when organization, offer AND school need are all verified.
        out.push({ org, offer, school: s, needs,
          actionable: org.status === "verified" && offer.status === "verified" && schoolVerified && availableQty(offer) !== 0, warnings });
      }
    }
  }
  return out.sort((a, b) => Number(b.actionable) - Number(a.actionable) || scoreSchool(b.school).total - scoreSchool(a.school).total);
}
