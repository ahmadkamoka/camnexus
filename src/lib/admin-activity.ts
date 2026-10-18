import { VERIFICATION_LABEL, type School } from "./impact";
import { ORG_STATUS_LABEL, offerName, type Organization } from "./partners";
import { REQUEST_STATUS_LABEL, type RequestStatus } from "./resource-requests";
export type ActivityFilter = "school" | "organization" | "verification" | "offer_update";
export interface AdminActivity { id: string; at: string; source: "school" | "organization"; institutionId: string; institution: string; kind: ActivityFilter; action: string; status: string; note?: string | undefined; snapshot?: unknown }
/** A read-only projection: no synthetic dates, inferred reviews or writes. */
export function adminActivity(schools: School[], organizations: Organization[]): AdminActivity[] {
  const events: AdminActivity[] = [];
  for (const school of schools) {
    for (const [i, h] of (school.history ?? []).entries()) events.push({ id: `school-${school.id}-${i}`, at: h.at, source: "school", institutionId: school.id, institution: school.name, kind: h.kind === "submission" ? "school" : "verification", action: h.kind === "submission" ? "School assessment submitted" : h.requestId ? "Resource request reviewed" : "Assessment reviewed", status: h.requestStatus ? REQUEST_STATUS_LABEL[h.requestStatus as RequestStatus] ?? h.requestStatus : VERIFICATION_LABEL[h.status], note: h.message, snapshot: h.snapshot });
    // Legacy timestamped requests may have no assessment submission event.
    for (const request of school.requests ?? []) {
      if (request.submittedAt && !(school.history ?? []).some((h) => h.kind === "submission" && h.at === request.submittedAt)) events.push({ id: `request-${request.id}`, at: request.submittedAt, source: "school", institutionId: school.id, institution: school.name, kind: "school", action: `${request.resource} request submitted`, status: "Submitted", snapshot: request });
      for (const [i, h] of request.reviewHistory.entries()) if (!(school.history ?? []).some((e) => e.kind === "review" && e.at === h.at)) events.push({ id: `request-review-${request.id}-${i}`, at: h.at, source: "school", institutionId: school.id, institution: school.name, kind: "verification", action: `${request.resource} reviewed`, status: REQUEST_STATUS_LABEL[h.status], note: h.note });
    }
  }
  for (const org of organizations) {
    // createdAt can be a normalization fallback, so it is not historical evidence.
    for (const [i, h] of org.reviewHistory.entries()) events.push({ id: `org-review-${org.id}-${i}`, at: h.at, source: "organization", institutionId: org.id, institution: org.orgName, kind: "verification", action: "Organization reviewed", status: ORG_STATUS_LABEL[h.status], note: h.note });
    for (const offer of org.offers) {
      if (offer.submittedAt) events.push({ id: `offer-${offer.id}`, at: offer.submittedAt, source: "organization", institutionId: org.id, institution: org.orgName, kind: "organization", action: `${offerName(offer)} offer submitted`, status: "Submitted", snapshot: offer });
      for (const [i, h] of offer.reviewHistory.entries()) events.push({ id: `offer-review-${offer.id}-${i}`, at: h.at, source: "organization", institutionId: org.id, institution: org.orgName, kind: "verification", action: `${offerName(offer)} offer reviewed`, status: REQUEST_STATUS_LABEL[h.status], note: h.note });
      for (const [i, h] of offer.history.entries()) events.push({ id: `offer-version-${offer.id}-${i}`, at: h.at, source: "organization", institutionId: org.id, institution: org.orgName, kind: "offer_update", action: `${offerName(offer)} offer updated`, status: "Previous version retained", note: h.note, snapshot: h.snapshot });
    }
  }
  return events.filter((e) => Number.isFinite(Date.parse(e.at))).sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id));
}
