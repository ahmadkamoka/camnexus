import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Building2, ChevronDown, History, LogOut, School as SchoolIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmissionDetails } from "@/components/admin/AdminActivityHistory";
import { useStore } from "@/lib/store";
import { adminSchoolRequests, adminSubmissionActivity, readAdminContributions, type DemoContribution } from "@/lib/admin-dashboard";
import { criticalityColor, criticalityLevelLabel, type CriticalityLevel } from "@/lib/criticality";
import { requestName, requestAmount } from "@/lib/resource-requests";
import { catalogEntry, resourceCardName } from "@/lib/catalog";

export const Route = createFileRoute("/assessment-management")({
  head: () => ({ meta: [
    { title: "CamNexus Administrator" },
    { name: "description", content: "View school requests, proposed contributions and submission history in the CamNexus administrator demo." },
    { property: "og:title", content: "CamNexus Administrator" },
    { property: "og:description", content: "A compact overview of current school needs and proposed resource contributions in the CamNexus demo." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Management,
});

const sections = [
  { id: "schools", label: "School Requests", icon: SchoolIcon },
  { id: "contributions", label: "Contributions", icon: Building2 },
  { id: "history", label: "Activity History", icon: History },
] as const;
type Section = typeof sections[number]["id"];
const cad = (value: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 }).format(value);
const dateLabel = (at: string) => new Date(at).toLocaleString();

function LevelBadge({ level }: { level: CriticalityLevel }) {
  return <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-background px-2 py-0.5 text-xs font-medium"><span className="h-2 w-2 rounded-full" style={{ background: criticalityColor(level) }} aria-hidden />{criticalityLevelLabel(level)}</span>;
}

function ContributionDetails({ contribution }: { contribution: DemoContribution }) {
  return <div className="space-y-2 text-sm">
    <p className="font-semibold">{contribution.organizationName}</p>
    <ul className="space-y-1">{contribution.resources.map((resource) => {
      const entry = catalogEntry(resource.resourceTypeId);
      const name = resource.customName || (entry ? resourceCardName(entry) : resource.resourceTypeId);
      return <li key={resource.resourceTypeId} className="flex justify-between gap-4"><span className="break-words">{name}</span><span className="shrink-0 font-medium">× {resource.quantity}</span></li>;
    })}</ul>
    <div className="flex flex-wrap justify-between gap-2 border-t pt-2"><span className="text-muted-foreground">Estimated value (CAD)</span><span className="font-semibold">{cad(contribution.estimatedTotalCAD)}</span></div>
    <p className="text-xs text-muted-foreground">Illustrative estimate{contribution.unpricedItems > 0 ? ` · ${contribution.unpricedItems} resource type(s) without an estimate` : ""}. Proposed, not delivered.</p>
  </div>;
}

function Management() {
  const { schools, demoSession, setDemoSession } = useStore();
  const [section, setSection] = useState<Section>("schools");
  const [openId, setOpenId] = useState("");
  const [journal, setJournal] = useState<{ contributions: DemoContribution[]; unreadable: boolean }>({ contributions: [], unreadable: false });
  useEffect(() => {
    const read = () => setJournal(readAdminContributions(window.localStorage));
    read();
    window.addEventListener("storage", read);
    window.addEventListener("focus", read);
    return () => { window.removeEventListener("storage", read); window.removeEventListener("focus", read); };
  }, []);
  const requests = useMemo(() => adminSchoolRequests(schools), [schools]);
  const activity = useMemo(() => adminSubmissionActivity(schools, journal.contributions), [schools, journal.contributions]);
  const choose = (id: Section) => { setSection(id); setOpenId(""); };
  const toggle = (id: string) => setOpenId((current) => current === id ? "" : id);
  const counts = { schools: requests.length, contributions: journal.contributions.length, history: activity.length };
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-2xl font-bold">CamNexus Administrator</h1>
      {demoSession?.role === "admin" && <Button variant="outline" onClick={() => { setDemoSession(null); choose("schools"); }}><LogOut />Exit CamNexus Administrator</Button>}
    </div>
    {demoSession?.role !== "admin" ? <div className="space-y-3"><p>Enter the fictional administrator demonstration to review local assessments. This ends any school demo session.</p><div className="flex flex-wrap gap-2"><Button onClick={() => { choose("schools"); setDemoSession({ role: "admin" }); }}>Enter CamNexus Administrator</Button><Button variant="link" asChild><Link to="/">Back to Home</Link></Button></div></div> : <>
      <nav aria-label="Administrator sections" className="grid grid-cols-3 gap-2 sm:gap-3">{sections.map(({ id, label, icon: Icon }) => <Button key={id} variant={section === id ? "secondary" : "outline"} aria-current={section === id ? "page" : undefined} onClick={() => choose(id)} className="h-auto min-h-24 flex-col gap-2 whitespace-normal rounded-md px-2 py-3 sm:flex-row sm:justify-start sm:gap-3 sm:px-4"><Icon className="size-5 shrink-0 text-primary" /><span className="min-w-0 text-center sm:text-left"><span className="block text-xs font-semibold sm:text-sm">{label}</span><span className="block text-lg font-semibold">{counts[id]}</span></span></Button>)}</nav>
      <section aria-label={sections.find((item) => item.id === section)?.label} className="min-h-0">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-base font-semibold">{sections.find((item) => item.id === section)?.label}</h2><span className="text-xs text-muted-foreground">{section === "schools" ? "Current submitted assessments" : section === "contributions" ? "Proposed · awaiting review" : "Most recent first"}</span></div>
        {journal.unreadable && section !== "schools" && <p role="status" className="mb-2 text-xs text-muted-foreground">Some contribution records could not be displayed. Saved data is unchanged.</p>}
        <div className="max-h-[calc(100dvh-30rem)] min-h-40 overflow-y-auto overscroll-contain pr-1 sm:max-h-[calc(100dvh-35rem)]">
          {section === "schools" && <div className="space-y-2">{requests.map(({ school, requests: resources, criticality }) => <div key={school.id} className="overflow-hidden rounded-md border bg-card">
            <Button variant="ghost" className="h-auto w-full justify-start gap-3 whitespace-normal rounded-none p-3 text-left" aria-expanded={openId === school.id} aria-controls={`school-${school.id}`} onClick={() => toggle(school.id)}><span className="min-w-0 flex-1"><span className="block font-semibold">{school.name}</span><span className="block text-xs font-normal text-muted-foreground">{school.community} · {school.region}</span></span><LevelBadge level={criticality.level} /><ChevronDown className={`size-4 shrink-0 ${openId === school.id ? "rotate-180" : ""}`} /></Button>
            {openId === school.id && <div id={`school-${school.id}`} className="border-t px-3 py-3"><ul className="space-y-1.5 text-sm">{resources.map((resource) => <li key={resource.id} className="flex justify-between gap-4"><span className="break-words">{requestName(resource)}</span><span className="shrink-0 text-muted-foreground">{requestAmount(resource)}</span></li>)}</ul></div>}
          </div>)}{requests.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No current submitted school requests.</p>}</div>}
          {section === "contributions" && <div className="space-y-2">{journal.contributions.map((contribution) => <div key={contribution.id} className="overflow-hidden rounded-md border bg-card"><Button variant="ghost" className="h-auto w-full justify-start gap-3 whitespace-normal rounded-none p-3 text-left" aria-expanded={openId === contribution.id} aria-controls={`contribution-${contribution.id}`} onClick={() => toggle(contribution.id)}><span className="min-w-0 flex-1"><span className="block font-semibold">{contribution.organizationName}</span><time className="block text-xs font-normal text-muted-foreground" dateTime={contribution.submittedAt}>{dateLabel(contribution.submittedAt)}</time></span><span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">Proposed</span><ChevronDown className={`size-4 shrink-0 ${openId === contribution.id ? "rotate-180" : ""}`} /></Button>{openId === contribution.id && <div id={`contribution-${contribution.id}`} className="border-t p-3"><ContributionDetails contribution={contribution} /></div>}</div>)}{journal.contributions.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No proposed contributions recorded.</p>}</div>}
          {section === "history" && <ol className="space-y-2">{activity.map((event) => <li key={event.id} className="overflow-hidden rounded-md border bg-card"><Button variant="ghost" className="h-auto w-full justify-start gap-3 whitespace-normal rounded-none p-3 text-left" aria-expanded={openId === event.id} aria-controls={`activity-${event.id}`} onClick={() => toggle(event.id)}><span className="min-w-0 flex-1"><span className="block font-semibold">{event.institution}</span><span className="block text-xs font-normal text-muted-foreground">{event.action}</span><time className="block text-xs font-normal text-muted-foreground" dateTime={event.at}>{dateLabel(event.at)}</time></span><ChevronDown className={`size-4 shrink-0 ${openId === event.id ? "rotate-180" : ""}`} /></Button>{openId === event.id && <div id={`activity-${event.id}`} className="border-t p-3">{event.contribution ? <ContributionDetails contribution={event.contribution} /> : <SubmissionDetails snapshot={event.snapshot} />}</div>}</li>)}{activity.length === 0 && <li className="py-8 text-center text-sm text-muted-foreground">No submission activity recorded.</li>}</ol>}
        </div>
      </section>
      <p className="text-xs text-muted-foreground">Criticality is a preliminary assessment based on school-reported resource needs. It has not been independently verified.</p>
    </>}
    <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">About This Demo</summary><p className="mt-2">Administrator access and verification are simulated, not production-secure or actual PS43 authorization. Reviews do not approve funding or commit resources.</p></details>
  </div>;
}
