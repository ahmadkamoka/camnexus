import { describe, expect, it } from "vitest";
import { createSponsorPopup, sponsorCommunityDetails } from "@/lib/sponsor-map-details";
import { buildCommunities } from "@/lib/communities";
import { SAMPLE_SCHOOLS } from "@/lib/impact";
import { newRequest } from "@/lib/resource-requests";
import { assessmentSnapshot } from "@/lib/school-demo";

const sample = SAMPLE_SCHOOLS[0];
if (!sample) throw new Error("Missing sample school");

describe("Sponsor map active request details", () => {
  it("shows only current submitted requests and quantities without rewriting history", () => {
    const oldAt = "2026-10-18T05:00:00.000Z";
    const newAt = "2026-10-18T05:10:00.000Z";
    const roof = { ...newRequest(sample), id: "old-roof", category: "Classroom construction or repairs" as const, resource: "Roof repairs", quantity: 2, submittedAt: oldAt };
    const books = { ...newRequest(sample), id: "new-books", category: "Books and educational materials" as const, resource: "Textbooks", quantity: 40, submittedAt: newAt };
    const school = { ...sample, requests: [roof, books], history: [
      { at: oldAt, kind: "submission" as const, status: "pending_review" as const, snapshot: assessmentSnapshot({ ...sample, requests: [roof] }) },
      { at: newAt, kind: "submission" as const, status: "pending_review" as const, snapshot: assessmentSnapshot({ ...sample, requests: [books] }) },
    ] };
    const before = structuredClone(school);
    const community = buildCommunities([school])[0];
    if (!community) throw new Error("Missing community");
    const details = sponsorCommunityDetails(community);
    expect(details.schools[0]?.requests).toEqual([{ id: "new-books", name: "Textbooks", quantity: 40 }]);
    expect(details.schools[0]?.level).toBe("Low");
    expect(school).toEqual(before);
  });

  it("does not invent requests or quantities for unassessed schools or drafts", () => {
    const draft = { ...newRequest(sample), resource: "Laptops", quantity: undefined, submittedAt: undefined };
    const community = buildCommunities([{ ...sample, requests: [draft], history: [] }])[0];
    if (!community) throw new Error("Missing community");
    expect(sponsorCommunityDetails(community)).toMatchObject({ level: "Not Yet Assessed", schools: [{ name: sample.name, level: "Not Yet Assessed", requests: [] }] });
  });

  it("retains Other custom names and recorded quantities", () => {
    const community = buildCommunities([{ ...sample, history: [], requests: [{ ...newRequest(sample), id: "custom", category: "Other", resource: "Other", customResource: "School garden", quantity: 3, submittedAt: "2026-10-18T05:10:00.000Z" }] }])[0];
    if (!community) throw new Error("Missing community");
    expect(sponsorCommunityDetails(community).schools[0]).toMatchObject({ level: "Unclassified Needs", requests: [{ id: "custom", name: "School garden", quantity: 3 }] });
  });

  it("labels popups with the plain criticality level, with no preliminary qualifier", () => {
    const community = buildCommunities([{ ...sample, history: [], requests: [{ ...newRequest(sample), category: "Classroom construction or repairs", resource: "Roof repairs", quantity: 2, submittedAt: "2026-10-18T05:10:00.000Z" }] }])[0];
    if (!community) throw new Error("Missing community");
    const text = createSponsorPopup(community).textContent ?? "";
    expect(text).toContain("Critical");
    expect(text.match(/Critical/g)).toHaveLength(1);
    expect(text).toContain("Roof repairs — 2");
    expect(text.toLowerCase()).not.toContain("preliminary");
  });
});