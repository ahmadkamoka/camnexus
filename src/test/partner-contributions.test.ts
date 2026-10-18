import { beforeEach, describe, expect, it } from "vitest";
import { CONTRIBUTIONS_KEY, contributionSchema, DEMO_CONTRIBUTION_INFO, saveDemoContribution, selectedContributionResources } from "@/lib/partner-contributions";

const laptop = "digital-equipment:laptops";
const valid = { organizationName: "Demo Supporters", email: "support@example.com", resources: [{ resourceTypeId: laptop, quantity: 2 }] };

describe("demo contribution workflow", () => {
  beforeEach(() => localStorage.clear());
  it("requires at least one selected resource", () => {
    expect(() => selectedContributionResources({}, {})).toThrow();
  });
  it.each(["", "0", "-1", "1.5", "NaN", "Infinity"])("rejects invalid quantity %s", (quantity) => {
    expect(() => selectedContributionResources({ [laptop]: quantity }, {})).toThrow();
  });
  it("retains stable catalogue IDs and positive quantities", () => {
    expect(selectedContributionResources({ [laptop]: "2" }, {})).toEqual([{ resourceTypeId: laptop, quantity: 2 }]);
  });
  it("requires Organization Name", () => {
    expect(contributionSchema.safeParse({ ...valid, organizationName: " " }).success).toBe(false);
  });
  it("requires a valid Email Address", () => {
    for (const email of ["", "not-an-email"]) expect(contributionSchema.safeParse({ ...valid, email }).success).toBe(false);
  });
  it("validates at the save boundary without writing invalid input", () => {
    expect(() => saveDemoContribution({ ...valid, resources: [] }, localStorage)).toThrow();
    expect(localStorage.getItem(CONTRIBUTIONS_KEY)).toBeNull();
  });
  it("records an awaiting-review demo with the existing illustrative estimate", () => {
    const saved = saveDemoContribution(valid, localStorage);
    expect(saved.estimatedTotalCAD).toBe(800);
    expect(saved.status).toBe("pending_review");
    expect(saved.demo).toBe(true);
    expect(JSON.parse(localStorage.getItem(CONTRIBUTIONS_KEY) ?? "[]")).toEqual([saved]);
  });
  it("appends contributions without altering prior contributions, schools or organizations", () => {
    const legacy = { id: "previous", extra: { history: ["keep"] } };
    localStorage.setItem(CONTRIBUTIONS_KEY, JSON.stringify([legacy]));
    localStorage.setItem("edubridge-schools-v1", "school-history");
    localStorage.setItem("edubridge-partners-v1", "organization-history");
    saveDemoContribution(valid, localStorage);
    const saved = JSON.parse(localStorage.getItem(CONTRIBUTIONS_KEY) ?? "[]");
    expect(saved).toHaveLength(2);
    expect(saved[0]).toEqual(legacy);
    expect(localStorage.getItem("edubridge-schools-v1")).toBe("school-history");
    expect(localStorage.getItem("edubridge-partners-v1")).toBe("organization-history");
  });
  it("never resets unreadable storage", () => {
    localStorage.setItem(CONTRIBUTIONS_KEY, "broken");
    expect(() => saveDemoContribution(valid, localStorage)).toThrow();
    expect(localStorage.getItem(CONTRIBUTIONS_KEY)).toBe("broken");
  });
  it("offers demo partner details that pass the existing review validation", () => {
    expect(DEMO_CONTRIBUTION_INFO).toEqual({ organizationName: "CamNexus Demo Partner", email: "demo@camnexus.example" });
    expect(contributionSchema.safeParse({ ...DEMO_CONTRIBUTION_INFO, resources: [{ resourceTypeId: laptop, quantity: 1 }] }).success).toBe(true);
  });
});
