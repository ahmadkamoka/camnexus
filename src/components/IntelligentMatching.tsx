import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { CATEGORIES, REQUEST_STATUS_LABEL } from "@/lib/resource-requests";
import { REGIONS, scoreSchool } from "@/lib/impact";
import { levelOf } from "@/lib/communities";
import { catalogByCategory, catalogEntry } from "@/lib/catalog";
import { offerAmount, offerName, ORG_STATUS_LABEL } from "@/lib/partners";
import {
  buildRecommendations, comparableTypes, compareAllocations, MATCH_CATEGORY_LABEL,
  type MatchCategory, type Recommendation,
} from "@/lib/matching";

const CATEGORY_ORDER: MatchCategory[] = ["eligible", "needs_verification", "needs_infrastructure", "incompatible"];
const select = "rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

type Tab = "matches" | "allocation" | "readiness";

export function IntelligentMatching() {
  const { schools, organizations } = useStore();
  const all = useMemo(() => buildRecommendations(schools, organizations), [schools, organizations]);
  const [tab, setTab] = useState<Tab>("matches");
  const [fCategory, setFCategory] = useState("");
  const [fResource, setFResource] = useState("");
  const [fRegion, setFRegion] = useState("");
  const [fPriority, setFPriority] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fInfra, setFInfra] = useState("");
  const [fOrg, setFOrg] = useState("");
  const reset = () => { setFCategory(""); setFResource(""); setFRegion(""); setFPriority(""); setFStatus(""); setFInfra(""); setFOrg(""); };

  const filtered = all.filter((r) => {
    const entry = catalogEntry(r.offer.resourceTypeId);
    if (fCategory && entry?.category !== fCategory) return false;
    if (fResource && r.offer.resourceTypeId !== fResource) return false;
    if (fRegion && r.school.region !== fRegion) return false;
    if (fStatus && r.category !== fStatus) return false;
    if (fInfra === "ready" && r.warnings.length > 0) return false;
    if (fInfra === "warnings" && r.warnings.length === 0) return false;
    if (fOrg && r.org.id !== fOrg) return false;
    if (fPriority && levelOf(scoreSchool(r.school).total) !== fPriority) return false;
    return true;
  });

  const groups = CATEGORY_ORDER.map((c) => ({ c, items: filtered.filter((r) => r.category === c) }));

  return (
    <section className="space-y-4" aria-labelledby="intelligent-matching">
      <div>
        <h2 id="intelligent-matching" className="font-display text-xl font-semibold">Intelligent Resource Matching</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Explainable, rule-based recommendations built from the stored school requests and organization offers.
          Weights are illustrative and not scientifically validated. <strong>Recommendations only — final allocation decisions require PS43 and local partner approval.</strong>
        </p>
      </div>

      <div role="tablist" aria-label="Matching sections" className="flex flex-wrap gap-2">
        {([["matches", "Recommended Matches"], ["allocation", "Allocation Comparison"], ["readiness", "Verification & Readiness"]] as [Tab, string][]).map(([k, label]) => (
          <Button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            variant={tab === k ? "secondary" : "outline"}>{label}</Button>
        ))}
      </div>

      {tab === "matches" && <>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold">Resource
            <select aria-label="Resource" className={`${select} mt-0.5 block`} value={fResource} onChange={(e) => setFResource(e.target.value)}>
              <option value="">All resources</option>
              {(fCategory ? catalogByCategory(fCategory as (typeof CATEGORIES)[number]) : []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              {!fCategory && all.map((r) => r.offer.resourceTypeId).filter((v, i, a) => a.indexOf(v) === i).map((id) => <option key={id} value={id}>{catalogEntry(id)?.name ?? id}</option>)}
            </select></label>          <label className="text-xs font-semibold">Region
            <select aria-label="Region" className={`${select} mt-0.5 block`} value={fRegion} onChange={(e) => setFRegion(e.target.value)}>
              <option value="">All regions</option>
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select></label>          <label className="text-xs font-semibold">Match status
            <select aria-label="Match status" className={`${select} mt-0.5 block`} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option value="">All statuses</option>
              {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{MATCH_CATEGORY_LABEL[c]}</option>)}
            </select></label><details className="w-full"><summary className="cursor-pointer text-sm font-semibold text-primary">More Filters</summary><div className="mt-2 flex flex-wrap items-end gap-2">          <label className="text-xs font-semibold">Category
            <select aria-label="Category" className={`${select} mt-0.5 block`} value={fCategory} onChange={(e) => { setFCategory(e.target.value); setFResource(""); }}>
              <option value="">All categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select></label>          <label className="text-xs font-semibold">School priority
            <select aria-label="School priority" className={`${select} mt-0.5 block`} value={fPriority} onChange={(e) => setFPriority(e.target.value)}>
              <option value="">Any priority</option>
              {["critical", "high", "moderate", "low", "insufficient"].map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
            </select></label>          <label className="text-xs font-semibold">Infrastructure
            <select aria-label="Infrastructure" className={`${select} mt-0.5 block`} value={fInfra} onChange={(e) => setFInfra(e.target.value)}>
              <option value="">Any</option>
              <option value="ready">No warnings</option>
              <option value="warnings">Has warnings</option>
            </select></label>          <label className="text-xs font-semibold">Organization
            <select aria-label="Organization" className={`${select} mt-0.5 block`} value={fOrg} onChange={(e) => setFOrg(e.target.value)}>
              <option value="">All organizations</option>
              {organizations.map((o) => <option key={o.id} value={o.id}>{o.orgName}</option>)}
            </select></label></div></details>          <Button onClick={reset} className="rounded-md border px-3 py-1.5 text-sm font-semibold hover:bg-muted">Reset filters</Button>
        </div>

        {filtered.length === 0 ? <p role="status" className="border-y py-5 text-sm text-muted-foreground">No resource matches found. Check available school requests, organization offers, and verification requirements.</p> : groups.filter(({ items }) => items.length > 0).map(({ c, items }) => (
          <section key={c} className="space-y-2">
            <h3 className="text-sm font-semibold">{MATCH_CATEGORY_LABEL[c]} <span className="text-muted-foreground">({items.length})</span></h3>
            <ul className="space-y-2">{items.map((r) => <MatchCard key={`${r.offer.id}-${r.request.id}`} rec={r} />)}</ul>
          </section>
        ))}
      </>}

      {tab === "allocation" && <AllocationComparison schools={schools} organizations={organizations} />}
      {tab === "readiness" && <Readiness recs={all} />}
    </section>
  );
}

function MatchCard({ rec }: { rec: Recommendation }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-md border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        <div className="min-w-0 text-sm">
          <p className="break-words font-semibold">
            {rec.org.orgName} ({offerName(rec.offer)} · {offerAmount(rec.offer)}) → {rec.school.name}, {rec.school.region}
          </p>
          <p className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
            <span>Rank {rec.score}/100</span>
            {rec.recommendedQty !== undefined && <span>· could supply {rec.recommendedQty} of {rec.outstandingQty} {rec.unit}</span>}
            <span>· Org: {ORG_STATUS_LABEL[rec.org.status]} · Offer: {REQUEST_STATUS_LABEL[rec.offer.status]} · Need: {REQUEST_STATUS_LABEL[rec.request.status]}</span>
          </p>
          {rec.warnings.length > 0 && <p className="mt-0.5 text-xs text-accent-foreground">{rec.warnings[0]}{rec.warnings.length > 1 ? ` (+${rec.warnings.length - 1} more)` : ""}</p>}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>View Explanation<ChevronDown aria-hidden="true" className={open ? "rotate-180" : ""} /></Button>
      </div>
      {open && (
        <div className="space-y-3 border-t px-3 py-3 text-sm">
          <div>
            <p className="font-semibold">Why This Match?</p>
            <ul className="mt-1 list-disc pl-5 text-muted-foreground">{rec.reasons.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
          <div>
            <p className="font-semibold">What Needs to Happen Before Deployment?</p>
            <ul className="mt-1 list-disc pl-5 text-muted-foreground">{rec.prerequisites.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
          {rec.warnings.length > 0 && (
            <div>
              <p className="font-semibold">Limitations &amp; Warnings</p>
              <ul className="mt-1 list-disc pl-5 text-accent-foreground">{rec.warnings.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          )}
          {rec.remainingOfferQty !== undefined && (
            <p className="text-xs text-muted-foreground">Hypothetical allocation: {rec.recommendedQty} {rec.unit} to this school would leave {rec.remainingOfferQty} {rec.unit} from this offer. Suggested quantities are not commitments.</p>
          )}
        </div>
      )}
    </li>
  );
}

function AllocationComparison({ schools, organizations }: { schools: Parameters<typeof compareAllocations>[0]; organizations: Parameters<typeof compareAllocations>[1] }) {
  const types = useMemo(() => comparableTypes(schools, organizations), [schools, organizations]);
  const [typeId, setTypeId] = useState("");
  const chosen = typeId || types[0]?.id || "";
  const comparison = useMemo(() => (chosen ? compareAllocations(schools, organizations, chosen) : null), [schools, organizations, chosen]);
  return (
    <section className="space-y-3">
      <h3 className="font-semibold">Allocation Comparison</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Compares two deterministic distribution approaches for one resource type, using only fully verified matches; infrastructure warnings are shown per school.
        Neither approach is universally superior; no quantities are reserved or committed.
      </p>
      {types.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No fully eligible matches yet. Verify an organization, one of its offers, and a school's resource request (and resolve infrastructure warnings) to compare allocations.
        </p>
      ) : (
        <>
          <label className="mt-3 block text-xs font-semibold">Resource type
            <select className={`${select} mt-0.5 block`} value={chosen} onChange={(e) => setTypeId(e.target.value)}>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select></label>
          {comparison && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {comparison.scenarios.map((sc) => (
                <div key={sc.key} className="rounded-md border p-3">
                  <p className="font-semibold">{sc.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{sc.description}</p>
                  <p className="mt-2 text-sm">Stock: <strong>{comparison.stock} {comparison.unit}</strong> · Used: <strong>{sc.totalUsed}</strong> · Unallocated: <strong>{sc.unallocated}</strong></p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {sc.lines.map((l) => (
                      <li key={l.request.id} className="rounded bg-muted px-2 py-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate">{l.school.name} <span className="text-xs text-muted-foreground">(rank {l.score})</span></span>
                          <span className="shrink-0 font-semibold">{l.qty} {comparison.unit}</span>
                        </span>
                        {l.warnings.length > 0 && <span className="mt-0.5 block text-xs text-accent-foreground">{l.warnings[0]}</span>}
                      </li>
                    ))}
                  </ul>
                  {sc.unmet.length > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Remaining unmet: {sc.unmet.map((u) => `${u.school.name} (${u.qty} ${comparison.unit})`).join("; ")}.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Readiness({ recs }: { recs: Recommendation[] }) {
  const items = recs.filter((r) => r.category === "needs_verification" || r.category === "needs_infrastructure");
  return (
    <section className="space-y-3">
      <h3 className="font-semibold">Verification &amp; Readiness</h3>
      <p className="mt-1 text-sm text-muted-foreground">What must be reviewed before resources in potential matches can be deployed.</p>
      {items.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No pending verification or infrastructure items.</p> : (
        <ul className="mt-3 space-y-2">
          {items.map((r) => (
            <li key={`${r.offer.id}-${r.request.id}`} className="border-b py-2 text-sm">
              <p className="font-semibold">{offerName(r.offer)} → {r.school.name} <span className="font-normal text-muted-foreground">({MATCH_CATEGORY_LABEL[r.category]})</span></p>
              <details className="mt-1"><summary className="cursor-pointer text-primary">View Explanation</summary><ul className="mt-1 list-disc pl-5 text-muted-foreground">{r.prerequisites.map((p) => <li key={p}>{p}</li>)}</ul></details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
