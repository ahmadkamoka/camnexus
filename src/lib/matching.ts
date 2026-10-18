// Intelligent, rule-based resource matching for the CamNexus demo administrator.
// Advisory decision support only: nothing here approves, reserves, allocates or delivers
// anything, and no factor uses data outside the stored school/organization records.
import { scoreSchool, type School } from "./impact";
import { levelOf } from "./communities";
import { activeRequests, requestName, type ResourceRequest } from "./resource-requests";
import { catalogEntry, requestTypeId } from "./catalog";
import { availableQty, needsRepair, type Organization, type ResourceOffer } from "./partners";

export type MatchCategory = "eligible" | "needs_verification" | "needs_infrastructure" | "incompatible";
export const MATCH_CATEGORY_LABEL: Record<MatchCategory, string> = {
  eligible: "Eligible for Allocation Review",
  needs_verification: "Potential Matches Requiring Verification",
  needs_infrastructure: "Matches Requiring Infrastructure Improvements",
  incompatible: "Currently Incompatible",
};

/** Illustrative ranking weights (sum to 1). Not scientifically validated. */
export const RANK_WEIGHTS = { priority: 0.3, urgency: 0.2, shortage: 0.2, infrastructure: 0.15, quantityFit: 0.15 } as const;

const URGENCY_SCORE: Record<string, number> = { Critical: 1, High: 0.75, Medium: 0.5, Low: 0.25 };
const POWER_CATEGORIES = new Set(["Digital equipment", "Internet and connectivity"]);
const CONNECTIVITY_CATEGORIES = new Set(["Digital equipment"]);

export interface Recommendation {
  school: School;
  request: ResourceRequest;
  org: Organization;
  offer: ResourceOffer;
  category: MatchCategory;
  /** 0–100 rule-based rank; higher = stronger recommendation. Illustrative, not validated. */
  score: number;
  /** "Why This Match?" — only factors supported by the stored records. */
  reasons: string[];
  /** "What Needs to Happen Before Deployment?" — only relevant items. */
  prerequisites: string[];
  warnings: string[];
  unit: string;
  outstandingQty?: number | undefined;
  recommendedQty?: number | undefined;
  remainingOfferQty?: number | undefined;
}

function infrastructureWarnings(school: School, category: string): string[] {
  const w: string[] = [];
  if (POWER_CATEGORIES.has(category)) {
    if (school.electricity === "none") w.push("No electricity — power infrastructure (for example solar equipment) is a prerequisite before this equipment can be used.");
    else if (school.electricity === "intermittent") w.push("Electricity is intermittent — plan for backup power or charging schedules.");
    else if (school.electricity === "unknown") w.push("Electricity availability is unknown — confirm on site before deployment.");
  }
  if (CONNECTIVITY_CATEGORIES.has(category)) {
    if (school.internet === "none") w.push("No internet — plan for offline content or connectivity support.");
    else if (school.internet === "unknown") w.push("Internet availability is unknown — confirm on site.");
  }
  return w;
}

/** Deterministic 0–100 rank from five normalized factors; no single factor can dominate. */
export function rankScore(school: School, request: ResourceRequest, offer: ResourceOffer, infra: string[]): number {
  const s = scoreSchool(school);
  const priority = (s.insufficient ? 50 : s.total) / 100; // insufficient information → neutral 0.5, never boosted
  const urgency = request.urgency ? (URGENCY_SCORE[request.urgency] ?? 0.5) : 0.5;
  const existing = request.existingQuantity ?? 0;
  const shortage = request.quantity !== undefined ? Math.min(1, request.quantity / (request.quantity + existing)) : 0.5;
  const infrastructure = infra.length === 0 ? 1 : 0.4;
  const avail = availableQty(offer);
  const quantityFit = request.quantity !== undefined && avail !== undefined ? Math.min(1, avail / Math.max(1, request.quantity)) : 0.7;
  const total = RANK_WEIGHTS.priority * priority + RANK_WEIGHTS.urgency * urgency + RANK_WEIGHTS.shortage * shortage
    + RANK_WEIGHTS.infrastructure * infrastructure + RANK_WEIGHTS.quantityFit * quantityFit;
  return Math.round(total * 100);
}

export function buildRecommendations(schools: School[], orgs: Organization[]): Recommendation[] {
  const out: Recommendation[] = [];
  for (const school of schools) {
    const s = scoreSchool(school);
    for (const request of activeRequests(school)) {
      const typeId = requestTypeId(request.category, request.resource);
      const entry = catalogEntry(typeId);
      if (!entry || entry.custom) continue; // custom "Other" entries never auto-match
      for (const org of orgs) {
        for (const offer of org.offers) {
          if (offer.status === "rejected" || offer.resourceTypeId !== typeId) continue;
          const avail = availableQty(offer);
          const physical = entry.classification === "physical_goods";
          const regionOk = offer.serviceAreas.includes("Nationwide") || offer.serviceAreas.includes(school.region);
          const qtyOk = !physical || (avail !== undefined && avail > 0);
          const orgVerified = org.status === "verified";
          const offerVerified = offer.status === "verified";
          const requestVerified = request.status === "verified";
          const repair = needsRepair(offer);
          const infra = infrastructureWarnings(school, entry.category);

          let category: MatchCategory;
          if (!regionOk || !qtyOk) category = "incompatible";
          else if (!orgVerified || !offerVerified || !requestVerified) category = "needs_verification";
          else if (repair || infra.length > 0) category = "needs_infrastructure";
          else category = "eligible";

          const outstanding = request.quantity;
          const recommendedQty = physical && outstanding !== undefined && avail !== undefined && regionOk
            ? Math.min(outstanding, avail) : undefined;

          const reasons: string[] = [
            `Both records reference the same shared-catalogue resource type (${entry.name}).`,
            `School priority score ${s.insufficient ? "insufficient data" : s.total}/100${s.insufficient ? "" : ` (${levelOf(s.total)} priority)`}.`,
            regionOk ? (offer.serviceAreas.includes("Nationwide") ? "The organization serves schools nationwide." : `The organization's service area covers the ${school.region} region.`) : `The organization's service area does not cover the ${school.region} region.`,
          ];
          if (request.urgency) reasons.push(`Self-reported urgency: ${request.urgency}${requestVerified ? "" : " (provisional until the request is verified)"}.`);
          if (recommendedQty !== undefined && outstanding !== undefined && avail !== undefined)
            reasons.push(avail >= outstanding
              ? `Sufficient available inventory: ${avail} ${offer.unit} available for ${outstanding} requested.`
              : `Partial coverage: ${avail} of ${outstanding} requested ${request.units} available.`);
          if (entry.classification !== "physical_goods") reasons.push("Service/training resource — capacity and scope are compared instead of unit counts.");

          const prerequisites: string[] = [];
          if (!requestVerified) prerequisites.push("Verify the school's reported need.");
          if (!orgVerified) prerequisites.push("Complete organization verification.");
          if (!offerVerified) prerequisites.push("Verify the organization's offer and confirm inventory.");
          if (repair) prerequisites.push("Inspect and repair equipment before deployment.");
          else if (offer.condition === "used_working") prerequisites.push("Inspect used equipment condition on delivery.");
          if (POWER_CATEGORIES.has(entry.category) && school.electricity !== "reliable") prerequisites.push("Confirm electricity availability or provide power infrastructure.");
          if (CONNECTIVITY_CATEGORIES.has(entry.category) && school.internet !== "reliable") prerequisites.push("Confirm internet connectivity or plan offline content.");
          if (offer.delivery === "logistics_partner") prerequisites.push("Coordinate transportation with a local logistics partner.");
          if (offer.delivery === "digital") prerequisites.push("Confirm the school can receive digital or remote delivery.");
          if (prerequisites.length === 0) prerequisites.push("Confirm organization inventory and coordinate delivery with PS43 and local partners.");

          const warnings = [...infra];
          if (repair) warnings.push("Equipment requires repair — not immediately deployable until the condition is resolved.");
          if (!qtyOk) warnings.push("No remaining available quantity.");
          if (!regionOk) warnings.push(`School region (${school.region}) is outside the organization's service area.`);

          out.push({
            school, request, org, offer, category, score: rankScore(school, request, offer, infra),
            reasons, prerequisites, warnings, unit: offer.unit,
            outstandingQty: outstanding, recommendedQty,
            remainingOfferQty: recommendedQty !== undefined && avail !== undefined ? avail - recommendedQty : undefined,
          });
        }
      }
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

// ---------- Allocation comparison ----------

export interface AllocationLine { school: School; request: ResourceRequest; qty: number; score: number; warnings: string[]; }
export interface AllocationScenario {
  key: "priority_first" | "balanced";
  label: string;
  description: string;
  lines: AllocationLine[];
  totalUsed: number;
  unallocated: number;
  unmet: { school: School; request: ResourceRequest; qty: number }[];
}
export interface AllocationComparison { typeId: string; name: string; unit: string; stock: number; scenarios: AllocationScenario[]; }

const MIN_DEPLOYMENT = 5; // minimum practical deployment size for divisible physical resources

/**
 * Compares "Priority First" and "Balanced Distribution" for one resource type.
 * Deterministic; eligible recommendations only; each offer's stock is drawn down
 * so the same units are never counted twice within a scenario.
 */
export function compareAllocations(schools: School[], orgs: Organization[], typeId: string): AllocationComparison | null {
  const entry = catalogEntry(typeId);
  if (!entry || entry.custom || entry.classification !== "physical_goods") return null;
  // Verified matches may participate even with infrastructure warnings; the warnings are shown per line.
  const recs = buildRecommendations(schools, orgs).filter((r) => (r.category === "eligible" || r.category === "needs_infrastructure") && r.offer.resourceTypeId === typeId);
  if (recs.length === 0) return null;

  // Unique eligible requests (a request matched by several offers appears once).
  const needs = new Map<string, { school: School; request: ResourceRequest; score: number; qty: number; warnings: string[] }>();
  for (const r of recs) {
    if (r.outstandingQty === undefined || r.outstandingQty < 1) continue;
    if (!needs.has(r.request.id)) needs.set(r.request.id, { school: r.school, request: r.request, score: r.score, qty: r.outstandingQty, warnings: r.warnings });
  }
  // Stock pool per offer, only offers that pass verification.
  const pool = new Map<string, { offer: ResourceOffer; areas: string[]; left: number }>();
  for (const r of recs) {
    const avail = availableQty(r.offer) ?? 0;
    if (avail > 0 && !pool.has(r.offer.id)) pool.set(r.offer.id, { offer: r.offer, areas: r.offer.serviceAreas, left: avail });
  }
  const stock = [...pool.values()].reduce((a, p) => a + p.left, 0);
  if (needs.size === 0 || stock === 0) return null;

  const draw = (need: { school: School; qty: number }, amount: number, left: Map<string, number>): number => {
    let taken = 0;
    for (const [id, p] of pool) {
      if (taken >= amount) break;
      if (!p.areas.includes("Nationwide") && !p.areas.includes(need.school.region)) continue;
      const use = Math.min(amount - taken, left.get(id) ?? 0);
      taken += use;
      left.set(id, (left.get(id) ?? 0) - use);
    }
    return taken;
  };

  const ranked = [...needs.values()].sort((a, b) => b.score - a.score || a.request.id.localeCompare(b.request.id));

  // Priority First: highest-priority eligible schools first, up to their verified need.
  const leftA = new Map([...pool.entries()].map(([id, p]) => [id, p.left]));
  const linesA: AllocationLine[] = [];
  for (const n of ranked) {
    const qty = draw(n, n.qty, leftA);
    if (qty > 0) linesA.push({ school: n.school, request: n.request, qty, score: n.score, warnings: n.warnings });
  }

  // Balanced: every eligible school gets at least a practical minimum, then leftovers by priority.
  const leftB = new Map([...pool.entries()].map(([id, p]) => [id, p.left]));
  const linesB: AllocationLine[] = [];
  const fair = Math.floor(stock / ranked.length);
  for (const n of ranked) {
    const target = Math.min(n.qty, Math.max(Math.min(MIN_DEPLOYMENT, n.qty), fair));
    const qty = draw(n, target, leftB);
    if (qty > 0) linesB.push({ school: n.school, request: n.request, qty, score: n.score, warnings: n.warnings });
  }
  for (const n of ranked) { // second pass: remaining stock by priority
    const have = linesB.find((l) => l.request.id === n.request.id)?.qty ?? 0;
    const extra = draw(n, n.qty - have, leftB);
    if (extra > 0) {
      const line = linesB.find((l) => l.request.id === n.request.id);
      if (line) line.qty += extra; else linesB.push({ school: n.school, request: n.request, qty: extra, score: n.score, warnings: n.warnings });
    }
  }

  const finish = (key: AllocationScenario["key"], label: string, description: string, lines: AllocationLine[]): AllocationScenario => {
    const totalUsed = lines.reduce((a, l) => a + l.qty, 0);
    const unmet = ranked
      .map((n) => ({ school: n.school, request: n.request, qty: n.qty - (lines.find((l) => l.request.id === n.request.id)?.qty ?? 0) }))
      .filter((u) => u.qty > 0);
    return { key, label, description, lines, totalUsed, unallocated: stock - totalUsed, unmet };
  };

  return {
    typeId, name: entry.name, unit: entry.unit, stock,
    scenarios: [
      finish("priority_first", "Priority First", "Allocate to the highest-priority eligible schools first, up to each verified need.", linesA),
      finish("balanced", "Balanced Distribution", "Give every eligible school at least a practical minimum, then distribute the remainder by priority.", linesB),
    ],
  };
}

/** Resource types with at least one eligible recommendation, for the comparison picker. */
export function comparableTypes(schools: School[], orgs: Organization[]): { id: string; name: string }[] {
  const ids = new Set(buildRecommendations(schools, orgs).filter((r) => r.category === "eligible" || r.category === "needs_infrastructure").map((r) => r.offer.resourceTypeId));
  return [...ids].map((id) => ({ id, name: catalogEntry(id)?.name ?? id })).sort((a, b) => a.name.localeCompare(b.name));
}

// ---------- Community-level aggregation for the map (no school-level detail) ----------

export interface CommunityMatchSummary {
  outstanding: number;
  offered: number;
  potential: number;
  unmet: number;
  orgs: string[];
  warnings: string[];
}

/** Aggregated, community-level matching info. Requests and offers are each counted once. */
export function communityMatchSummary(recs: Recommendation[], community: string): CommunityMatchSummary {
  const mine = recs.filter((r) => r.school.community === community && r.category !== "incompatible");
  const reqs = new Map<string, { qty: number; matched: number }>();
  const offers = new Map<string, number>();
  const orgs = new Set<string>();
  const warnings = new Set<string>();
  for (const r of mine) {
    if (r.outstandingQty !== undefined && !reqs.has(r.request.id)) reqs.set(r.request.id, { qty: r.outstandingQty, matched: 0 });
    const avail = availableQty(r.offer);
    if (avail !== undefined && avail > 0 && !offers.has(r.offer.id)) offers.set(r.offer.id, avail);
    if (r.org.status === "verified") orgs.add(r.org.orgName);
    for (const w of r.warnings) warnings.add(w);
  }
  // Distribute offered stock across requests without double counting.
  const pool = new Map(offers);
  for (const [reqId, req] of reqs) {
    for (const r of mine.filter((x) => x.request.id === reqId)) {
      const left = pool.get(r.offer.id) ?? 0;
      const use = Math.min(left, req.qty - req.matched);
      req.matched += use;
      pool.set(r.offer.id, left - use);
    }
  }
  const outstanding = [...reqs.values()].reduce((a, r) => a + r.qty, 0);
  const offered = [...offers.values()].reduce((a, q) => a + q, 0);
  const potential = [...reqs.values()].reduce((a, r) => a + r.matched, 0);
  return { outstanding, offered, potential, unmet: outstanding - potential, orgs: [...orgs], warnings: [...warnings] };
}
