import { CATALOG, RESOURCE_SELECTION_OPTIONS, requestTypeId, type CatalogEntry } from "./catalog";
import { newRequest, type ResourceRequest } from "./resource-requests";
import type { School } from "./impact";

export const SCHOOL_RESOURCE_OPTIONS = RESOURCE_SELECTION_OPTIONS;

export function schoolResourceCards(requests: ResourceRequest[]) {
  const cards = SCHOOL_RESOURCE_OPTIONS.map((entry) => ({
    key: entry.id, entry, request: requests.find((r) => requestTypeId(r.category, r.resource) === entry.id),
  }));
  // Keep every existing/legacy request editable, including additional custom entries.
  for (const request of requests) {
    if (cards.some((card) => card.request?.id === request.id)) continue;
    const entry = CATALOG.find((candidate) => candidate.id === requestTypeId(request.category, request.resource));
    if (entry) cards.push({ key: request.id, entry, request });
  }
  return cards;
}

export function createSchoolCardRequest(entry: CatalogEntry, school: Pick<School, "id" | "registrationId" | "community" | "region">): ResourceRequest {
  return { ...newRequest(school), category: entry.category, resource: entry.name, units: entry.unit,
    assessmentFormat: "compact", urgency: undefined, primary: false };
}

export function compactSchoolRequests(requests: ResourceRequest[]): ResourceRequest[] {
  return requests.map((request) => ({ ...request, assessmentFormat: "compact" }));
}