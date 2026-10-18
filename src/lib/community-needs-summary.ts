import { buildCommunities } from "./communities";
import { RESOURCE_SELECTION_OPTIONS, requestTypeId, resourceCardName } from "./catalog";
import type { School } from "./impact";
import { activeRequests, requestName } from "./resource-requests";

export const COMMUNITY_SUMMARY_LEVELS = ["critical", "high", "moderate", "low"] as const;

/** Read-only page summaries: no drafts, historic needs, or inferred quantities. */
export function communityNeedsSummary(schools: School[]) {
  const communities = buildCommunities(schools);
  const counts = { critical: 0, high: 0, moderate: 0, low: 0 };
  for (const community of communities) {
    if (community.level in counts) counts[community.level as keyof typeof counts] += 1;
  }
  const totals = new Map<string, { id: string; name: string; quantity: number }>();
  for (const school of schools) {
    for (const request of activeRequests(school)) {
      if (!request.submittedAt) continue;
      const quantity = request.quantity;
      if (quantity === undefined || !Number.isFinite(quantity) || quantity <= 0) continue;
      const typeId = requestTypeId(request.category, request.resource);
      const entry = RESOURCE_SELECTION_OPTIONS.find((option) => option.id === typeId);
      const custom = request.resource === "Other";
      // Resource types outside the current catalogue remain stored as history but are not charted.
      if (!custom && !entry) continue;
      const name = !custom && entry ? resourceCardName(entry) : requestName(request);
      const id = custom ? `${typeId}:${name.trim()}` : typeId;
      const previous = totals.get(id);
      totals.set(id, { id, name: previous?.name ?? name, quantity: (previous?.quantity ?? 0) + quantity });
    }
  }
  const resources = [...totals.values()]
    .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name))
    .slice(0, 5);
  return { communities, counts, resources };
}