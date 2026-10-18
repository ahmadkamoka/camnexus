import { z } from "zod";
import type { Evidence, Need, School } from "./impact";
import { currentAssessment } from "./assessment-versions";

export const RESOURCE_CATALOG = {
  "Digital equipment": ["Desktop computers", "Laptops", "Tablets", "Projectors", "Other"],
  "Books and educational materials": ["Textbooks", "Reading books", "Stationery", "Learning kits", "Other"],
  "Classroom furniture": ["Student desks", "Chairs", "Whiteboards", "Storage cabinets", "Other"],
  "Classroom construction or repairs": ["New classrooms", "Roof repairs", "Classroom renovation", "Sanitation facilities", "Other"],
  "Water and sanitation": ["Toilets", "Water fountains", "Water tanks", "Other"],
  "Electricity and energy infrastructure": ["Solar power system", "Electrical wiring", "Battery storage", "Generator", "Other"],
  "Internet and connectivity": ["Internet connection", "Wi-Fi equipment", "Network installation", "Other"],
  "Teacher training": ["Digital literacy training", "STEM teaching", "General professional development", "Other"],
  "STEM and laboratory equipment": ["Science laboratory kits", "Laboratory equipment", "Mathematics kits", "Robotics kits", "Other"],
  Other: ["Other"],
} as const;
export type ResourceCategory = keyof typeof RESOURCE_CATALOG;
export const CATEGORIES = Object.keys(RESOURCE_CATALOG) as ResourceCategory[];
export const REQUEST_STATUSES = ["pending_review", "under_review", "verified", "more_information", "rejected"] as const;
export type RequestStatus = typeof REQUEST_STATUSES[number];
export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  pending_review: "Pending Review", under_review: "Under Review", verified: "Verified (demo)", more_information: "More Information Required", rejected: "Rejected",
};
export const URGENCIES = ["Critical", "High", "Medium", "Low"] as const;
export type Urgency = typeof URGENCIES[number];
export interface ResourceRequest {
  /** Compact school form does not collect per-resource urgency, reason or primary ranking. */
  assessmentFormat?: "compact" | undefined;
  id: string;
  schoolId: string;
  registrationId: string;
  community: string;
  region: string;
  category: ResourceCategory;
  resource: string;
  customResource?: string | undefined;
  quantity?: number | undefined;
  units: string;
  scope?: string | undefined;
  existingQuantity?: number | undefined;
  affectedCount?: number | undefined;
  quantityExplanation?: string | undefined;
  urgency?: Urgency | undefined;
  primary: boolean;
  reason: string;
  evidence: Evidence[];
  status: RequestStatus;
  submittedAt?: string | undefined;
  reviewHistory: { at: string; status: RequestStatus; note?: string | undefined }[];
  legacyNeed?: Need | undefined;
}
export const isScopeRequest = (category: ResourceCategory) => category === "Classroom construction or repairs";
export const unitsFor = (category: ResourceCategory) => category === "Teacher training" ? "teachers" : category === "Internet and connectivity" ? "connections / installations" : "units";
export const requestName = (request: ResourceRequest) => request.resource === "Other" ? request.customResource || "Other resource" : request.resource;
export const requestAmount = (r: ResourceRequest) => isScopeRequest(r.category) && r.scope?.trim() ? r.scope : r.quantity === undefined ? "Quantity not recorded" : `${r.quantity} ${r.units}`;

// Category-specific wording so no nonsensical questions appear for a resource type.
export const CATEGORY_LABELS: Record<ResourceCategory, { quantity: string; existing: string; reason: string }> = {
  "Digital equipment": { quantity: "Quantity of equipment needed", existing: "Functional units of this resource already at the school", reason: "Explain the need, including how electricity and connectivity limitations affect using this equipment." },
  "Books and educational materials": { quantity: "Quantity of books or materials needed", existing: "Usable units of this resource already available", reason: "Explain why these materials are needed and how their absence affects students or teachers." },
  "Classroom furniture": { quantity: "Quantity of furniture needed", existing: "Usable units already available", reason: "Explain why this furniture is needed and how its absence affects students or teachers." },
  "Classroom construction or repairs": { quantity: "Classrooms or facilities affected (optional estimate)", existing: "Usable units already available", reason: "Describe the work required, the estimated scope, and the current condition of the facilities." },
  "Water and sanitation": { quantity: "Quantity of facilities needed", existing: "Usable units already available", reason: "Describe the current water and sanitation conditions and how they affect students." },
  "Electricity and energy infrastructure": { quantity: "Quantity needed", existing: "Functional units already available", reason: "Explain the current electricity limitations and how they disrupt learning." },
  "Internet and connectivity": { quantity: "Quantity needed", existing: "Functional connections or equipment already available", reason: "Explain the current connectivity limitations and how they disrupt learning." },
  "Teacher training": { quantity: "Number of teachers requiring training", existing: "Teachers already trained in this subject", reason: "Explain why this training is needed and how the gap affects teaching quality." },
  "STEM and laboratory equipment": { quantity: "Quantity of equipment needed", existing: "Usable units already available", reason: "Explain why this equipment is needed and how its absence affects students or teachers." },
  Other: { quantity: "Quantity needed", existing: "Usable units already available", reason: "Explain why this resource is needed and how its absence affects students or teachers." },
};

// Missing or invalid information, used for the "Incomplete" indicator and the review summary.
export function requestIssues(r: ResourceRequest, schoolTeachers?: number): string[] {
  const issues: string[] = [];
  if (!(RESOURCE_CATALOG[r.category] as readonly string[]).includes(r.resource)) issues.push("Choose a resource from its category.");
  if (r.resource === "Other" && !r.customResource?.trim()) issues.push("Name the custom resource.");
  if (isScopeRequest(r.category) && r.assessmentFormat !== "compact") {
    if (!r.scope?.trim()) issues.push("Describe the construction or repair scope.");
  } else if (r.quantity === undefined || r.quantity < 1) issues.push("Enter a positive whole-number quantity.");
  if (r.assessmentFormat !== "compact" && !r.urgency) issues.push("Select an urgency level (not recorded in the legacy assessment).");
  if (r.assessmentFormat !== "compact" && !r.reason.trim()) issues.push("Explain the reason for this request.");
  if (r.category === "Teacher training" && schoolTeachers !== undefined && r.quantity !== undefined && r.quantity > schoolTeachers && !r.quantityExplanation?.trim())
    issues.push("Requested teachers exceed the school's total teachers — add an explanation.");
  return issues;
}

// Material modifications return a previously reviewed request to Pending Review.
export function materialChange(a: ResourceRequest, b: ResourceRequest): boolean {
  return a.category !== b.category || a.resource !== b.resource || (a.customResource ?? "") !== (b.customResource ?? "")
    || a.quantity !== b.quantity || (a.scope ?? "") !== (b.scope ?? "") || a.urgency !== b.urgency || a.reason.trim() !== b.reason.trim();
}
export const urgencyShare = { Critical: 1, High: 0.75, Medium: 0.5, Low: 0.25 } as const;
export const CATEGORY_NEEDS: Record<ResourceCategory, Need[]> = {
  "Digital equipment": ["Digital literacy"], "Books and educational materials": ["Reading materials"],
  "Classroom furniture": ["Classroom infrastructure"], "Classroom construction or repairs": ["Classroom infrastructure"],
  "Water and sanitation": ["Classroom infrastructure"],
  "Electricity and energy infrastructure": ["Classroom infrastructure"], "Internet and connectivity": ["Digital literacy"],
  "Teacher training": ["Teacher training"], "STEM and laboratory equipment": ["STEM resources"], Other: [],
};
export function needsFromRequests(requests: ResourceRequest[]): Need[] {
  return [...new Set(requests.flatMap((r) => r.legacyNeed ? [r.legacyNeed] : CATEGORY_NEEDS[r.category]))];
}
export const activeRequests = (s: School) => (currentAssessment(s).requests ?? []).filter((r) => r.status !== "rejected");
export const reportedNeeds = (s: School): Need[] => s.requests ? needsFromRequests(activeRequests(s)) : s.needs;

export function newRequest(school: Pick<School, "id" | "registrationId" | "community" | "region">): ResourceRequest {
  return { id: crypto.randomUUID(), schoolId: school.id, registrationId: school.registrationId ?? "", community: school.community ?? "", region: school.region,
    category: "Digital equipment", resource: "Laptops", units: "units", urgency: "Medium", primary: false, reason: "", evidence: [], status: "pending_review", reviewHistory: [] };
}

// Unknown legacy quantities, reasons and urgency are never inferred as verified facts:
// urgency stays unrecorded rather than being replaced with Medium, and missing values are never treated as zero.
export function migrateRequests(school: School): ResourceRequest[] {
  if (school.requests) return school.requests;
  const mapping: Record<Need, [ResourceCategory, string]> = {
    "Digital literacy": ["Digital equipment", "Other"], "Reading materials": ["Books and educational materials", "Reading books"],
    "Teacher training": ["Teacher training", "General professional development"], "STEM resources": ["STEM and laboratory equipment", "Other"],
    "Classroom infrastructure": ["Classroom construction or repairs", "Other"],
  };
  return school.needs.map((need, i) => {
    const [category, resource] = mapping[need];
    return { id: `${school.id}-legacy-${i + 1}`, schoolId: school.id, registrationId: school.registrationId ?? "", community: school.community ?? "", region: school.region,
      category, resource, customResource: resource === "Other" ? need : undefined, units: unitsFor(category), urgency: undefined, primary: need === school.urgentNeed,
      reason: school.comments ?? "", evidence: [], status: school.verification === "verified" ? "verified" : school.verification === "under_review" ? "under_review" : "pending_review", reviewHistory: [], legacyNeed: need };
  });
}

const count = z.number().int().min(0).max(1_000_000);
const evidenceSchema = z.object({ id: z.string().min(1).max(100), name: z.string().max(120), type: z.string().max(100), size: z.number().nonnegative(),
  preview: z.string().max(100000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/).optional() });
export const requestSchema = z.object({
  assessmentFormat: z.literal("compact").optional(),
  id: z.string().min(1).max(100), schoolId: z.string().max(100), registrationId: z.string().max(100), community: z.string().max(80), region: z.string().max(80),
  category: z.enum(CATEGORIES as [ResourceCategory, ...ResourceCategory[]]), resource: z.string().min(1).max(120), customResource: z.string().trim().max(120).optional(),
  quantity: count.optional(), units: z.string().min(1).max(80), scope: z.string().trim().max(1000).optional(), existingQuantity: count.optional(),
  affectedCount: count.optional(), quantityExplanation: z.string().trim().max(1000).optional(),
  urgency: z.enum(URGENCIES).optional(), primary: z.boolean(), reason: z.string().trim().max(1000),
  evidence: z.array(evidenceSchema).max(5), status: z.enum(REQUEST_STATUSES), submittedAt: z.string().datetime().optional(),
  reviewHistory: z.array(z.object({ at: z.string().datetime(), status: z.enum(REQUEST_STATUSES), note: z.string().max(1000).optional() })),
  legacyNeed: z.enum(["Digital literacy", "Reading materials", "Teacher training", "STEM resources", "Classroom infrastructure"]).optional(),
}).superRefine((r, ctx) => {
  if (!(RESOURCE_CATALOG[r.category] as readonly string[]).includes(r.resource)) ctx.addIssue({ code: "custom", message: "Choose a resource from its category." });
  if (r.resource === "Other" && !r.customResource?.trim()) ctx.addIssue({ code: "custom", message: "Name the custom resource." });
  if (isScopeRequest(r.category) && r.assessmentFormat !== "compact") {
    if (!r.scope?.trim()) ctx.addIssue({ code: "custom", message: "Describe the construction or repair scope." });
  } else if (r.quantity === undefined || r.quantity < 1) ctx.addIssue({ code: "custom", message: "Enter a positive whole-number quantity for every request." });
  if (r.assessmentFormat !== "compact") {
    if (!r.reason) ctx.addIssue({ code: "custom", message: "Explain the reason for every request." });
    if (!r.urgency) ctx.addIssue({ code: "custom", message: "Select an urgency level for every request; legacy assessments did not record one." });
  }
});
export const requestsSchema = z.array(requestSchema).min(1, "Add at least one resource request.").max(50).superRefine((requests, ctx) => {
  if (!requests.every((r) => r.assessmentFormat === "compact") && requests.filter((r) => r.primary).length !== 1) ctx.addIssue({ code: "custom", message: "Select exactly one request as the highest-priority need." });
  if (new Set(requests.map((r) => r.id)).size !== requests.length) ctx.addIssue({ code: "custom", message: "Request IDs must be unique." });
});
export const assessmentDraftSchema = z.object({
  name: z.string().max(120), community: z.string().max(80), region: z.string().max(80),
  students: z.string().max(20), computers: z.string().max(20).default(""), working: z.string().max(20).default(""),
  electricity: z.enum(["reliable", "intermittent", "none", "unknown"]), internet: z.enum(["reliable", "limited", "none", "unknown"]).default("unknown"),
  reliableElectricity: z.enum(["yes", "no", ""]).default(""), solarPower: z.enum(["yes", "no", ""]).default(""),
  comments: z.string().max(1000), evidence: z.array(evidenceSchema).max(5),
  requests: z.array(requestSchema.innerType().extend({ reason: z.string().max(1000) })).max(50),
});
export const infrastructureSchema = z.object({ students: count.min(1), computers: count.optional(), workingComputers: count.optional(),
  electricity: z.enum(["reliable", "intermittent", "none", "unknown"]), internet: z.enum(["reliable", "limited", "none", "unknown"]).optional(),
  reliableElectricity: z.boolean().optional(), solarPowerRequested: z.boolean().optional(),
  comments: z.string().max(1000).optional(), evidence: z.array(evidenceSchema).max(5).optional(),
}).refine((s) => s.workingComputers === undefined || s.computers === undefined || s.workingComputers <= s.computers, "Working computers cannot exceed total computers.");

/** Preserve hidden legacy answers; a binary No does not establish outage severity. */
export function schoolInformationInfrastructure(previous: School | undefined, draft: {
  computers: string; working: string; internet: School["internet"]; electricity: School["electricity"];
  reliableElectricity: "yes" | "no" | ""; solarPower: "yes" | "no" | "";
}) {
  const legacyCount = (value: string) => {
    if (!value.trim()) return undefined;
    const parsed = count.safeParse(Number(value));
    return parsed.success ? parsed.data : undefined;
  };
  const reliable = draft.reliableElectricity === "yes";
  const electricity = reliable ? "reliable" as const
    : draft.electricity === "none" || draft.electricity === "intermittent" ? draft.electricity : "unknown" as const;
  return {
    computers: previous?.computers ?? legacyCount(draft.computers),
    workingComputers: previous?.workingComputers ?? legacyCount(draft.working),
    internet: previous?.internet ?? draft.internet ?? "unknown" as const,
    teachers: previous?.teachers, classrooms: previous?.classrooms,
    electricity, reliableElectricity: draft.reliableElectricity ? reliable : undefined,
    solarPowerRequested: draft.reliableElectricity === "no" && draft.solarPower ? draft.solarPower === "yes" : undefined,
  };
}

// Unchanged previously reviewed requests keep their status; new requests start as Pending Review;
// materially modified requests return to Pending Review and are flagged for administrator reassessment.
export function prepareSubmittedRequests(school: School, previous: School | undefined, at: string): ResourceRequest[] {
  return requestsSchema.parse(school.requests).map((r) => {
    const base = { ...r, schoolId: school.id, registrationId: school.registrationId ?? "", community: school.community ?? "", region: school.region };
    const prior = previous?.requests?.find((p) => p.id === r.id);
    if (!prior) return { ...base, status: "pending_review" as const, submittedAt: at, reviewHistory: [] };
    if (!materialChange(prior, base) && prior.status !== "pending_review")
      return { ...base, status: prior.status, submittedAt: at, reviewHistory: prior.reviewHistory };
    const changed = materialChange(prior, base);
    return { ...base, status: "pending_review" as const, submittedAt: at,
      reviewHistory: changed && prior.status !== "pending_review"
        ? [...prior.reviewHistory, { at, status: "pending_review" as const, note: "Material change submitted; administrator reassessment required." }]
        : prior.reviewHistory };
  });
}