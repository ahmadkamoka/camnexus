import { describe, expect, it } from "vitest";
import { adminActivity } from "@/lib/admin-activity";
import { SAMPLE_SCHOOLS } from "@/lib/impact";
import { SAMPLE_ORGANIZATIONS } from "@/lib/partners";
const first = SAMPLE_SCHOOLS[0];
const org = SAMPLE_ORGANIZATIONS[0];
if (!first || !org) throw new Error("Missing demo data");
describe("Stored administrator activity", () => {
  it("returns no fabricated events for records without history or submission dates", () => { expect(adminActivity([{ ...first, history: [], requests: [] }], [{ ...org, offers: [], reviewHistory: [] }])).toEqual([]); });
  it("sorts actual school events newest first and retains snapshot identity", () => { const events = adminActivity([{ ...first, requests: [], history: [{ at: "2026-10-01T00:00:00.000Z", status: "pending_review", kind: "submission", snapshot: first }, { at: "2026-10-02T00:00:00.000Z", status: "under_review", kind: "review" }] }], []); expect(events.map((e) => e.at)).toEqual(["2026-10-02T00:00:00.000Z", "2026-10-01T00:00:00.000Z"]); expect(events[1]?.snapshot).toBe(first); expect(events[1]?.institutionId).toBe("s1"); });
  it("skips invalid timestamps", () => { expect(adminActivity([{ ...first, requests: [], history: [{ at: "invalid", status: "verified", kind: "review" }] }], [])).toEqual([]); });
  it("keeps organization and offer reviews distinct without changing records", () => { const before = JSON.stringify(org); const events = adminActivity([], [org]); expect(events.some((e) => e.action === "Organization reviewed")).toBe(true); expect(events.some((e) => e.action.includes("offer reviewed"))).toBe(true); expect(JSON.stringify(org)).toBe(before); });
});
