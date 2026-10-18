import { describe, expect, it } from "vitest";
import { adminSchoolRequests, adminSubmissionActivity, readAdminContributions } from "@/lib/admin-dashboard";
import { SAMPLE_SCHOOLS } from "@/lib/impact";
import { CONTRIBUTIONS_KEY, saveDemoContribution } from "@/lib/partner-contributions";
import { PARTNER_RESOURCE_OPTIONS } from "@/lib/partner-preferences";

const school = SAMPLE_SCHOOLS[0];
const laptop = PARTNER_RESOURCE_OPTIONS.find((resource) => resource.name === "Laptops");
if (!school || !laptop || !school.requests?.[0]) throw new Error("Missing demo fixtures");
const firstRequest = school.requests[0];
const laptopId = laptop.id;
function storage() {
  const entries = new Map<string, string>();
  return { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); } };
}

describe("Read-only compact administrator dashboard", () => {
  it("shows only current submitted resources, excluding earlier needs and drafts", () => {
    const currentAt = "2026-10-18T05:00:00.000Z";
    const previous = { ...firstRequest, id: "old", submittedAt: "2026-10-17T05:00:00.000Z" };
    const current = { ...firstRequest, id: "current", category: "Digital equipment" as const, resource: "Laptops", quantity: 7, submittedAt: currentAt };
    const fixture = { ...school, assessmentSubmittedAt: currentAt, requests: [previous, current, { ...current, id: "draft", submittedAt: undefined }], history: [] };
    const before = JSON.stringify(fixture);
    const rows = adminSchoolRequests([fixture]);
    expect(rows[0]?.requests.map((request) => [request.id, request.quantity])).toEqual([["current", 7]]);
    expect(rows[0]?.criticality.level).toBe("low");
    expect(JSON.stringify(fixture)).toBe(before);
  });
  it("reads saved proposed contributions with quantities and the persisted estimate without writes", () => {
    const local = storage();
    const saved = saveDemoContribution({ organizationName: "CamNexus Demo Partner", email: "demo@camnexus.example", resources: [{ resourceTypeId: laptopId, quantity: 2 }] }, local);
    const before = local.getItem(CONTRIBUTIONS_KEY);
    const result = readAdminContributions(local);
    expect(result.unreadable).toBe(false);
    expect(result.contributions[0]?.resources[0]?.quantity).toBe(2);
    expect(result.contributions[0]?.estimatedTotalCAD).toBe(800);
    expect(result.contributions[0]?.status).toBe("pending_review");
    expect(result.contributions[0]?.id).toBe(saved.id);
    expect(local.getItem(CONTRIBUTIONS_KEY)).toBe(before);
  });
  it("preserves unreadable journal entries while displaying valid records", () => {
    const local = storage();
    const saved = saveDemoContribution({ organizationName: "Demo Partner", email: "demo@camnexus.example", resources: [{ resourceTypeId: laptopId, quantity: 1 }] }, local);
    local.setItem(CONTRIBUTIONS_KEY, JSON.stringify([saved, { legacy: "preserve me" }]));
    const before = local.getItem(CONTRIBUTIONS_KEY);
    expect(readAdminContributions(local).contributions).toHaveLength(1);
    expect(readAdminContributions(local).unreadable).toBe(true);
    expect(local.getItem(CONTRIBUTIONS_KEY)).toBe(before);
    local.setItem(CONTRIBUTIONS_KEY, "broken");
    expect(readAdminContributions(local).unreadable).toBe(true);
    expect(local.getItem(CONTRIBUTIONS_KEY)).toBe("broken");
  });
  it("retains previous submission snapshots and combines sponsor submissions newest first", () => {
    const local = storage();
    const saved = saveDemoContribution({ organizationName: "Demo Partner", email: "demo@camnexus.example", resources: [{ resourceTypeId: laptopId, quantity: 3 }] }, local);
    const contribution = { ...saved, submittedAt: "2026-10-18T04:00:00.000Z" };
    const snapshot = { ...school, requests: [firstRequest] };
    const fixture = { ...school, requests: [], history: [
      { at: "2026-10-17T01:00:00.000Z", status: "pending_review" as const, kind: "submission" as const, snapshot },
      { at: "2026-10-18T03:00:00.000Z", status: "verified" as const, kind: "review" as const },
      { at: "2026-10-18T05:00:00.000Z", status: "pending_review" as const, kind: "submission" as const, snapshot },
    ] };
    const before = JSON.stringify(fixture);
    const events = adminSubmissionActivity([fixture], [contribution]);
    expect(events.map((event) => event.at)).toEqual(["2026-10-18T05:00:00.000Z", "2026-10-18T04:00:00.000Z", "2026-10-17T01:00:00.000Z"]);
    expect(events[2]?.snapshot).toBe(snapshot);
    expect(events[1]?.contribution?.resources[0]?.quantity).toBe(3);
    expect(JSON.stringify(fixture)).toBe(before);
  });
});