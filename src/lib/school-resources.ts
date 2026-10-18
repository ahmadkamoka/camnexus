import type { School } from "./impact";
import type { Organization } from "./partners";
import type { DemoSession } from "./school-demo";
import { currentAssessment } from "./assessment-versions";
import { activeRequests } from "./resource-requests";
import { buildRecommendations } from "./matching";
import { catalogEntry, requestTypeId, resourceCardName } from "./catalog";

/** Read-only school view. Proposed contribution journals are not inventory. */
export function schoolResourceWorkspace(schools: School[], organizations: Organization[], session: DemoSession | null) {
  if (session?.role !== "school") return null;
  const stored = schools.find((school) => school.id === session.schoolId);
  if (!stored) return null;
  const school = currentAssessment(stored);
  const requests = activeRequests(school).filter((request) => Boolean(request.submittedAt));
  const matches = buildRecommendations([{ ...school, requests }], organizations)
    .filter((match) => match.category !== "incompatible")
    .sort((a, b) => a.request.resource.localeCompare(b.request.resource) || a.org.orgName.localeCompare(b.org.orgName));
  return { school, requests, matches };
}

export function schoolResourceName(request: { category: Parameters<typeof requestTypeId>[0]; resource: string; customResource?: string }) {
  if (request.resource === "Other") return request.customResource || "Other resource";
  const entry = catalogEntry(requestTypeId(request.category, request.resource));
  return entry ? resourceCardName(entry) : request.resource;
}