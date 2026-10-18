import { z } from "zod";
import { adminActivity } from "./admin-activity";
import { contributionSchema, CONTRIBUTIONS_KEY } from "./partner-contributions";
import { activeRequests } from "./resource-requests";
import { criticalityOf } from "./criticality";
import type { School } from "./impact";

const savedContributionSchema = contributionSchema.extend({
  id: z.string().min(1),
  submittedAt: z.string().refine((at) => Number.isFinite(Date.parse(at))),
  status: z.literal("pending_review"),
  demo: z.literal(true),
  estimatedTotalCAD: z.number().finite().nonnegative(),
  unpricedItems: z.number().int().nonnegative(),
});
export type DemoContribution = z.infer<typeof savedContributionSchema>;

/** Read only: unreadable records remain in storage, never repaired or overwritten here. */
export function readAdminContributions(storage: Pick<Storage, "getItem">) {
  try {
    const raw = storage.getItem(CONTRIBUTIONS_KEY);
    const rows: unknown = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(rows)) return { contributions: [] as DemoContribution[], unreadable: true };
    const contributions: DemoContribution[] = [];
    let unreadable = false;
    for (const row of rows) {
      const parsed = savedContributionSchema.safeParse(row);
      if (parsed.success) contributions.push(parsed.data);
      else unreadable = true;
    }
    return { contributions: contributions.sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt)), unreadable };
  } catch {
    return { contributions: [] as DemoContribution[], unreadable: true };
  }
}

export function adminSchoolRequests(schools: School[]) {
  return schools.map((school) => ({ school, requests: activeRequests(school).filter((r) => r.submittedAt), criticality: criticalityOf(school) }))
    .filter((row) => row.requests.length > 0);
}

/** Current requests and historical submissions remain separate projections. */
export function adminSubmissionActivity(schools: School[], contributions: DemoContribution[]) {
  const schoolEvents = adminActivity(schools, []).filter((event) => event.kind === "school");
  const contributionEvents = contributions.map((record) => ({
    id: `contribution-${record.id}`, at: record.submittedAt, institution: record.organizationName,
    action: "Proposed contribution", snapshot: undefined, contribution: record,
  }));
  return [...schoolEvents.map((event) => ({ ...event, contribution: undefined as DemoContribution | undefined })), ...contributionEvents]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id));
}