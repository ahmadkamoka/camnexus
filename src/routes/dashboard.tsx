import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { COMMUNITY_SUMMARY_LEVELS, communityNeedsSummary } from "@/lib/community-needs-summary";
import { activeRequests, requestName } from "@/lib/resource-requests";
import { CRITICALITY_GROUP_LABELS, CRITICALITY_GROUP_POINTS, criticalityColor, criticalityLevelForScore, criticalityLevelLabel, criticalityOf } from "@/lib/criticality";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Community Needs — CamNexus" },
      { name: "description", content: "Preliminary criticality levels for assessed schools, based on submitted resource requests." },
      { property: "og:title", content: "Community Needs — CamNexus" },
      { property: "og:description", content: "Preliminary criticality levels for assessed schools." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const LEVEL_STYLES = {
  critical: { surface: "border-priority-critical/25 bg-priority-critical/10", dot: "bg-priority-critical" },
  high: { surface: "border-priority-high/30 bg-priority-high/10", dot: "bg-priority-high" },
  moderate: { surface: "border-priority-moderate/40 bg-priority-moderate/15", dot: "bg-priority-moderate" },
  low: { surface: "border-priority-low/25 bg-priority-low/10", dot: "bg-priority-low" },
  unclassified: { surface: "border-priority-unknown/25 bg-priority-unknown/10", dot: "bg-priority-unknown" },
  not_assessed: { surface: "border-priority-unknown/25 bg-priority-unknown/10", dot: "bg-priority-unknown" },
};

function LevelBadge({ level }: { level: Parameters<typeof criticalityColor>[0] }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold ${LEVEL_STYLES[level].surface}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${LEVEL_STYLES[level].dot}`} aria-hidden />
      {criticalityLevelLabel(level)}
    </span>
  );
}

function Dashboard() {
  const { schools } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const [rubricOpen, setRubricOpen] = useState(false);
  const { communities, counts, resources } = communityNeedsSummary(schools);
  const largestQuantity = resources[0]?.quantity ?? 1;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Community Needs</h1>
      <section aria-label="Community criticality overview" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {COMMUNITY_SUMMARY_LEVELS.map((level) => (
          <div key={level} className={`rounded-lg border px-3 py-2.5 ${LEVEL_STYLES[level].surface}`}>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className={`h-2 w-2 rounded-full ${LEVEL_STYLES[level].dot}`} aria-hidden />
              {criticalityLevelLabel(level)}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-semibold tabular-nums" data-community-count={level}>{counts[level]}</span>
              <span className="text-xs text-muted-foreground">{counts[level] === 1 ? "community" : "communities"}</span>
            </div>
          </div>
        ))}
      </section>

      <section aria-labelledby="resource-summary-title" className="py-1">
        <h2 id="resource-summary-title" className="mb-3 font-display text-base font-semibold">Most Requested Resources</h2>
        {resources.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active resource quantities recorded yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {resources.map((resource) => (
              <li key={resource.id} data-resource-total={resource.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_4rem]">
                <span className="break-words text-sm">{resource.name}</span>
                <div className="col-span-2 row-start-2 h-2 overflow-hidden rounded-full bg-secondary sm:col-span-1 sm:col-start-2 sm:row-start-1" aria-hidden>
                  <div className="h-full rounded-full bg-primary" style={{ width: `${resource.quantity / largestQuantity * 100}%` }} />
                </div>
                <span className="col-start-2 row-start-1 text-right text-sm font-semibold tabular-nums sm:col-start-3">{resource.quantity.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ul aria-label="Communities" className="space-y-1.5">
        {communities.map((c) => {
          const show = open === c.key;
          return (
            <li key={c.key} className="overflow-hidden rounded-lg border bg-card">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(show ? null : c.key)}
                aria-expanded={show}
                className="h-auto w-full justify-start gap-x-3 gap-y-1 whitespace-normal rounded-none px-3 py-2 text-left hover:bg-muted/50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{c.name}</span>
                  <span className="block text-xs text-muted-foreground">{c.region}</span>
                </span>
                <LevelBadge level={c.level} />
                <ChevronDown aria-hidden className={`shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${show ? "rotate-180" : ""}`} />
              </Button>
              {show && (
                <div className="border-t px-4 py-3">
                  {c.assessed === 0 ? (
                    <p className="text-sm text-muted-foreground">No schools in this community have submitted an assessment yet.</p>
                  ) : (
                    <ul className="divide-y">
                      {c.schools.map((s) => {
                        const cr = criticalityOf(s);
                        if (cr.points === null) return null;
                        const reqs = activeRequests(s);
                        return (
                          <li key={s.id} className="py-2 first:pt-0 last:pb-0">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-medium">{s.name}</p>
                              <LevelBadge level={cr.level} />
                            </div>
                            {reqs.length > 0 && (
                              <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                                {reqs.map((r, i) => (
                                  <li key={i}>{requestName(r)}{r.quantity ? ` — ${r.quantity}` : ""}</li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="border-t pt-1">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setRubricOpen(!rubricOpen)}
          aria-expanded={rubricOpen}
          className="h-auto w-full items-center justify-between gap-3 whitespace-normal px-0 py-3 text-left hover:bg-transparent"
        >
          <span className="font-display text-base font-semibold">How Is Criticality Determined?</span>
          <ChevronDown aria-hidden className={`shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${rubricOpen ? "rotate-180" : ""}`} />
        </Button>
        {rubricOpen && (
          <div className="border-t px-4 py-3">
            <p className="text-sm">Use the highest-priority category in each school's current active submitted assessment. Category values are never added together; all requested resources and quantities remain saved.</p>
            <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              {(Object.keys(CRITICALITY_GROUP_POINTS) as (keyof typeof CRITICALITY_GROUP_POINTS)[]).map((g) => (
                <li key={g}>{CRITICALITY_GROUP_LABELS[g]}: {g === "other" ? "Unclassified" : `${CRITICALITY_GROUP_POINTS[g]} — ${criticalityLevelLabel(criticalityLevelForScore(CRITICALITY_GROUP_POINTS[g]))}`}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm">Schools without an active submission are Not Yet Assessed; only-"Other" submissions show Unclassified Needs. Earlier assessments do not affect current criticality.</p>
            <p className="mt-3 text-sm text-muted-foreground">Classifications are based on school-reported needs and have not been independently verified.</p>
          </div>
        )}
      </div>
    </div>
  );
}
