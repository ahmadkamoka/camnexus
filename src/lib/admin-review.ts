import type { School } from "./impact";
import { infrastructureSchema, requestsSchema, requestIssues, type ResourceRequest } from "./resource-requests";

/** Presentation guard for administrator approval; mutations and scoring stay unchanged. */
export function assertRequestReviewable(request: ResourceRequest, teachers?: number) {
  const issues = requestIssues(request, teachers);
  if (issues.length) throw new Error(issues.join(" "));
}
export function assertAssessmentReviewable(school: School) {
  if (!infrastructureSchema.safeParse(school).success) throw new Error("Complete required school and infrastructure information before verification.");
  if (!requestsSchema.safeParse(school.requests).success) throw new Error("Open Resource Requests to resolve missing information or highest-priority selection before verification.");
  for (const request of school.requests ?? []) {
    assertRequestReviewable(request, school.teachers);
    if (request.status === "rejected" || request.status === "more_information") throw new Error("Resolve rejected requests or requests requiring more information individually before whole-assessment verification.");
  }
}
