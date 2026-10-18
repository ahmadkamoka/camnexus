import { activeRequests, requestName, reportedNeeds } from "@/lib/resource-requests";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { School as SchoolIcon, Handshake, ArrowRight, SlidersHorizontal } from "lucide-react";
import { Card } from "@/components/Shell";
import { CameroonSilhouette } from "@/components/CameroonSilhouette";
import { CommunityMap } from "@/components/CommunityMap";
import { VerificationBadge } from "@/components/VerificationBadge";
import { useStore } from "@/lib/store";
import { NEEDS, REGIONS, VERIFICATION_LABEL, type Need, type Verification } from "@/lib/impact";
import { buildCommunities } from "@/lib/communities";
import { CRITICALITY_GROUP_LABELS, CRITICALITY_GROUP_POINTS, CRITICALITY_LEVELS, criticalityColor, criticalityLevelForScore, criticalityLevelLabel, criticalityOf, type CriticalityLevel } from "@/lib/criticality";
import { buildRecommendations, communityMatchSummary } from "@/lib/matching";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CamNexus — Plan school investments in Cameroon" },
      { name: "description", content: "Assess schools, map where educational needs concentrate across Cameroon, and compare illustrative investment options." },
      { property: "og:title", content: "CamNexus — Evidence before investment" },
      { property: "og:description", content: "Community needs map, priority scoring and investment simulation for PS43 Foundation planning." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const sel = "mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm";

function Index() {
  const { schools, setSelectedId, organizations } = useStore();
  const recommendations = useMemo(() => buildRecommendations(schools, organizations), [schools, organizations]);
  const all = useMemo(() => buildCommunities(schools), [schools]);
  const [region, setRegion] = useState("");
  const [level, setLevel] = useState<CriticalityLevel | "">("");
  const [need, setNeed] = useState<Need | "">("");
  const [ver, setVer] = useState<Verification | "">("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [explore, setExplore] = useState(false);
  const [more, setMore] = useState(false);
  const [howCriticality, setHowCriticality] = useState(false);
  const activeMore = Number(!!need) + Number(!!ver);

  const filtered = all.filter((c) =>
    (!region || c.schools.some((s) => s.region === region)) &&
    (!level || c.level === level) &&
    (!need || c.schools.some((s) => reportedNeeds(s).includes(need))) &&
    (!ver || c.schools.some((s) => (s.verification ?? "unverified") === ver)) &&
    (!q.trim() || c.name.toLowerCase().includes(q.trim().toLowerCase())));
  const mapped = filtered.filter((c) => c.coords);
  const unmapped = filtered.filter((c) => !c.coords);
  const current = all.find((c) => c.key === selected) ?? null;
  const resetFilters = () => { setRegion(""); setLevel(""); setNeed(""); setVer(""); setQ(""); };
  const pick = (k: string) => { setSelected(k); setExplore(false); };



  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl bg-primary px-8 py-7 text-primary-foreground md:px-12 md:py-9">
        <CameroonSilhouette className="pointer-events-none absolute -right-10 top-1/2 hidden h-[130%] -translate-y-1/2 text-primary-foreground sm:block md:right-4" />
        <div className="relative">
          <p className="text-sm font-semibold uppercase tracking-wider opacity-80">PS43 Foundation · Cameroon</p>
          <h1 className="mt-2 max-w-3xl font-display text-3xl font-bold md:text-5xl">Bridging Needs. Building Futures.</h1>
          <p className="mt-4 max-w-2xl text-lg opacity-90">Connecting schools and communities with trusted partners to identify educational needs, mobilize resources, and create lasting educational opportunities across Cameroon.</p>
          <a href="#needs-map" onClick={(e) => { e.preventDefault(); document.getElementById("needs-map")?.scrollIntoView({ behavior: "smooth" }); }}
            className="mt-5 inline-flex items-center gap-1 font-semibold text-accent underline-offset-4 hover:underline">Explore Community Needs <ArrowRight className="h-4 w-4" /></a>
        </div>
      </section>

      <section aria-labelledby="involve">
        <h2 id="involve" className="font-display text-2xl font-bold">How Would You Like to Get Involved?</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {[
            { icon: SchoolIcon, t: "Request Educational Support", d: "Are you representing a school or community in need of educational resources, equipment, or infrastructure improvements? Tell us what support is needed.", to: "/assess" as const, b: "Submit a Request" },
            { icon: Handshake, t: "Become a Resource Partner", d: "Representing an organization, business, or nonprofit? Help schools access funding, equipment, educational materials, expertise, or infrastructure support.", to: "/partners" as const, b: "Offer Resources" },
          ].map((c) => (
            <Card key={c.t} className="flex flex-col p-6 transition hover:border-primary hover:shadow-md">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-secondary text-secondary-foreground"><c.icon className="h-6 w-6" /></span>
              <h3 className="mt-4 font-display text-xl font-semibold">{c.t}</h3>
              <p className="mt-2 flex-1 text-muted-foreground">{c.d}</p>
              <Link to={c.to} className="mt-5 inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground hover:opacity-90">{c.b} <ArrowRight className="h-4 w-4" /></Link>
            </Card>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">New requests start as Unverified and offers as Pending Verification until reviewed.</p>
      </section>


      <section id="needs-map" className="space-y-4 scroll-mt-6">
        <div>
          <h2 className="font-display text-2xl font-bold">Cameroon Community Needs Map</h2>
          <p className="mt-1 text-sm text-muted-foreground">Shows <strong>where</strong> reported needs concentrate. Markers sit at approximate town centres, not school locations, and colours show the highest preliminary criticality level from actual submitted assessments. Use the Impact Simulator to explore <strong>how</strong> resources could be allocated.</p>
        </div>

        <Card className="p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[10rem] flex-1"><label className="text-xs font-medium" htmlFor="cq">Search community</label><input id="cq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Bertoua" className={sel} /></div>
            <div className="w-[calc(50%-0.25rem)] sm:w-40"><label className="text-xs font-medium" htmlFor="fr">Region</label><select id="fr" className={sel} value={region} onChange={(e) => setRegion(e.target.value)}><option value="">All</option>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select></div>
            <div className="w-[calc(50%-0.25rem)] sm:w-40"><label className="text-xs font-medium" htmlFor="fl">Criticality level</label><select id="fl" className={sel} value={level} onChange={(e) => setLevel(e.target.value as CriticalityLevel)}><option value="">All</option>{CRITICALITY_LEVELS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}</select></div>
            <button onClick={() => setMore((v) => !v)} aria-expanded={more} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
              <SlidersHorizontal className="h-4 w-4" /> More filters{activeMore ? ` (${activeMore})` : ""}
            </button>
            <button onClick={resetFilters} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground underline hover:text-foreground">Reset filters</button>
          </div>
          {more && (
            <div className="mt-2 grid gap-2 border-t pt-2 sm:grid-cols-2 lg:w-2/3">
              <div><label className="text-xs font-medium" htmlFor="fn">Educational need</label><select id="fn" className={sel} value={need} onChange={(e) => setNeed(e.target.value as Need)}><option value="">All</option>{NEEDS.map((n) => <option key={n}>{n}</option>)}</select></div>
              <div><label className="text-xs font-medium" htmlFor="fv">Verification</label><select id="fv" className={sel} value={ver} onChange={(e) => setVer(e.target.value as Verification)}><option value="">All</option>{(Object.keys(VERIFICATION_LABEL) as Verification[]).map((v) => <option key={v} value={v}>{VERIFICATION_LABEL[v]}</option>)}</select></div>
            </div>
          )}
        </Card>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
          <CommunityMap communities={mapped} selected={selected} onSelect={pick} />
          <Card className="p-0">
            <h3 className="border-b px-4 py-3 font-semibold">Community priority list ({filtered.length})</h3>
            <ul className="max-h-[420px] overflow-y-auto">
              {filtered.length === 0 && <li className="px-4 py-6 text-sm text-muted-foreground">No communities match these filters.</li>}
              {filtered.map((c) => (
                <li key={c.key}>
                  <button onClick={() => pick(c.key)} aria-pressed={c.key === selected}
                    className={`flex w-full items-center gap-3 border-b px-4 py-3 text-left hover:bg-muted ${c.key === selected ? "bg-secondary" : ""}`}>
                    <span className="h-4 w-4 shrink-0 rounded-full border" style={{ background: criticalityColor(c.level) }} aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{c.name}</span>
                      <span className="block text-xs text-muted-foreground">{c.region} · {criticalityLevelLabel(c.level)} · {c.assessed} of {c.schools.length} school(s) assessed{!c.coords && " · unmapped"}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="p-4">
          <button onClick={() => setHowCriticality((v) => !v)} aria-expanded={howCriticality} className="flex w-full items-center justify-between gap-2 text-left">
            <span className="font-display text-lg font-semibold">How Is Criticality Determined?</span>
            <span className="text-sm text-muted-foreground">{howCriticality ? "Hide" : "Show"}</span>
          </button>
          {howCriticality && (
            <div className="mt-3 space-y-3 border-t pt-3 text-sm">
              <p>Each school's preliminary criticality uses the <strong>highest-priority category in its current active submitted assessment</strong>. Category values are never added together; all requested resources and quantities remain saved:</p>
              <ul className="grid gap-1 sm:grid-cols-2">
                {(Object.keys(CRITICALITY_GROUP_POINTS) as (keyof typeof CRITICALITY_GROUP_POINTS)[]).map((g) => (
                  <li key={g} className="flex items-center justify-between rounded-md border px-3 py-1.5">
                    <span>{CRITICALITY_GROUP_LABELS[g]}</span>
                    <span className="font-semibold">{g === "other" ? "Unclassified" : `${CRITICALITY_GROUP_POINTS[g]} — ${criticalityLevelLabel(criticalityLevelForScore(CRITICALITY_GROUP_POINTS[g]))}`}</span>
                  </li>
                ))}
              </ul>
              <p>Schools without an active submission are <strong>Not Yet Assessed</strong>; submissions containing only "Other" requests show <strong>Unclassified Needs</strong>. Earlier assessments do not affect current criticality.</p>
            </div>
          )}
        </Card>

        {unmapped.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold">Unmapped communities</h3>
            <p className="text-sm text-muted-foreground">No approximate location is known for these, so they are not placed on the map.</p>
            <div className="mt-2 flex flex-wrap gap-2">{unmapped.map((c) => <button key={c.key} onClick={() => pick(c.key)} className="rounded-full border px-3 py-1 text-sm hover:bg-muted">{c.name}</button>)}</div>
          </Card>
        )}

        {current && (
          <Card className="border-primary" aria-live="polite">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{current.region} Region</p>
                <h3 className="font-display text-2xl font-bold">{current.name}</h3>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Highest preliminary criticality</p>
                <p className="flex items-center justify-end gap-2 font-display text-2xl font-bold">
                  <span className="h-4 w-4 rounded-full" style={{ background: criticalityColor(current.level) }} />{criticalityLevelLabel(current.level)}
                </p>
                <p className="text-sm font-semibold">{current.points ? `Category priority ${current.points} · ` : ""}{current.assessed} of {current.schools.length} school(s) assessed</p>
              </div>
            </div>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-muted-foreground">Assessed schools</dt><dd className="font-semibold">{current.schools.length}</dd></div>
              <div><dt className="text-muted-foreground">Students represented</dt><dd className="font-semibold">{current.students.toLocaleString("en-US")}</dd></div>
              <div><dt className="text-muted-foreground">Verification</dt><dd className="font-semibold">{current.verified} verified (demo) · {current.underReview} under review · {current.unverified} unverified</dd></div>
              <div><dt className="text-muted-foreground">Most reported needs</dt><dd className="font-semibold">{current.topNeeds.map((n) => `${n.need} (${n.count})`).join(", ") || "—"}</dd></div>
              <div className="sm:col-span-2 lg:col-span-4"><dt className="text-muted-foreground">Requested resources</dt><dd className="font-semibold">{current.resourceNeeds.join(", ") || "None recorded"}</dd></div>
              <div className="sm:col-span-2 lg:col-span-4"><dt className="text-muted-foreground">Common infrastructure challenges</dt><dd className="font-semibold">{current.challenges.join(" · ") || "None reported"}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">Illustrative: the highest school criticality is shown, not a validated community-wide ranking. Criticality is a preliminary assessment based on school-reported resource needs.</p>
            {(() => {
              const m = communityMatchSummary(recommendations, current.name);
              if (m.outstanding === 0 && m.offered === 0) return null;
              return (
                <div className="mt-4 rounded-md border bg-muted p-3 text-sm">
                  <p className="font-semibold">Potential resource matches (advisory)</p>
                  <dl className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <div><dt className="text-xs text-muted-foreground">Outstanding requested</dt><dd className="font-semibold">{m.outstanding} units</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Compatible offers</dt><dd className="font-semibold">{m.offered} units</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Potentially matched</dt><dd className="font-semibold">{m.potential} units</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Remaining unmet</dt><dd className="font-semibold">{m.unmet} units</dd></div>
                  </dl>
                  {m.orgs.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Matching organizations: {m.orgs.join(", ")}</p>}
                  {m.warnings.length > 0 && <p className="mt-1 text-xs text-accent-foreground">{m.warnings[0]}{m.warnings.length > 1 ? ` (+${m.warnings.length - 1} more warnings)` : ""}</p>}
                  <p className="mt-2 text-xs text-muted-foreground">Suggested matches are not approved donations; outstanding needs and available inventory are unchanged until PS43 and local partners decide.</p>
                  <Link to="/assessment-management" className="mt-2 inline-block text-sm font-semibold text-primary underline">View Potential Matches</Link>
                </div>
              );
            })()}
            <button onClick={() => setExplore((v) => !v)} aria-expanded={explore} className="mt-4 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:opacity-90">
              {explore ? "Hide assessments" : "Explore Community Needs"}
            </button>
            {explore && (
              <ul className="mt-4 space-y-2">
                {current.schools.map((s) => {
                  const cr = criticalityOf(s);
                  return (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium">{s.name}</p>
                        <p className="text-muted-foreground">{s.students} students · {activeRequests(s).map(requestName).join(", ") || s.needs.join(", ")}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <VerificationBadge status={s.verification} />
                        <span className="flex items-center gap-1.5 font-semibold"><span className="h-3 w-3 rounded-full" style={{ background: criticalityColor(cr.level) }} aria-hidden />{criticalityLevelLabel(cr.level)}</span>
                        <Link to="/simulator" onClick={() => setSelectedId(s.id)} className="text-primary underline">Simulate</Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}
      </section>

    </div>
  );
}
