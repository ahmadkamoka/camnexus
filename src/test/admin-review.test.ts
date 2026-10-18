import { describe, expect, it } from "vitest";
import { SAMPLE_SCHOOLS } from "@/lib/impact";
import { assertAssessmentReviewable, assertRequestReviewable } from "@/lib/admin-review";
const first = SAMPLE_SCHOOLS[0];
if (!first?.requests?.[0]) throw new Error("Missing sample request");
const school = { ...first, teachers: 20, classrooms: 10, workingComputers: 6 };
const request = first.requests[0];
describe("Administrator review safeguards", () => {
  it("blocks whole-assessment verification when required infrastructure data is missing", () => { expect(() => assertAssessmentReviewable({ ...school, students: 0 })).toThrow(); });
  it("verifies a school whose teacher and classroom counts were never recorded", () => { expect(() => assertAssessmentReviewable({ ...school, teachers: undefined, classrooms: undefined })).not.toThrow(); });
  it("blocks whole-assessment verification with missing request quantities", () => { expect(() => assertAssessmentReviewable({ ...school, requests: [{ ...request, quantity: undefined }] })).toThrow(); });
  it("blocks whole-assessment verification from bypassing rejected requests", () => { expect(() => assertAssessmentReviewable({ ...school, requests: [{ ...request, status: "rejected" }] })).toThrow(); });
  it("blocks whole-assessment verification from bypassing more-information requests", () => { expect(() => assertAssessmentReviewable({ ...school, requests: [{ ...request, status: "more_information" }] })).toThrow(); });
  it("allows complete pending requests without modifying any records", () => { const before = JSON.stringify(school); expect(() => assertAssessmentReviewable(school)).not.toThrow(); expect(JSON.stringify(school)).toBe(before); });
  it("blocks individual verification when urgency is missing", () => { expect(() => assertRequestReviewable({ ...request, urgency: undefined })).toThrow(); });
});
