import { Link } from "@tanstack/react-router";
import { ClipboardList, Link2, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SchoolWorkspaceNav } from "./SchoolWorkspaceNav";
import { useStore } from "@/lib/store";
import { schoolResourceName, schoolResourceWorkspace } from "@/lib/school-resources";
import { REQUEST_STATUS_LABEL, requestAmount } from "@/lib/resource-requests";
import { MATCH_CATEGORY_LABEL } from "@/lib/matching";

export function SchoolResourcesPage({ view }: { view: "matches" | "tracker" }) {
  const { schools, organizations, demoSession, setDemoSession } = useStore();
  const workspace = schoolResourceWorkspace(schools, organizations, demoSession);
  const title = view === "matches" ? "Resource Matches" : "Resource Tracker";
  if (!workspace) return <section className="mx-auto max-w-3xl space-y-4">
    <h1 className="font-display text-3xl font-bold">{title}</h1>
    <p className="text-muted-foreground">Sign in to your school’s demo account to view its resources.</p>
    <Button asChild><Link to="/assess">School Sign In</Link></Button>
  </section>;
  const { school, requests, matches } = workspace;
  return <div className="mx-auto max-w-3xl space-y-6">
    <SchoolWorkspaceNav />
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-sm font-medium text-primary">{school.name} · {school.community}</p><h1 className="mt-1 font-display text-3xl font-bold">{title}</h1></div>
      <Button variant="ghost" onClick={() => setDemoSession(null)}>Sign Out</Button>
    </header>
    <p className="text-sm text-muted-foreground">{view === "matches" ? "Potential matches from recorded organization offers for your current submitted needs. Matches are subject to review; no resources are reserved or promised." : "Current submitted requests and recorded review updates. No school-specific allocation, shipment or delivery has been recorded."}</p>
    {!requests.length ? <section className="space-y-3 border-y py-8">
      <ClipboardList className="size-8 text-primary" aria-hidden="true" /><h2 className="font-display text-xl font-semibold">No submitted resource requests</h2>
      <Button asChild><Link to="/assess">Complete Needs Assessment</Link></Button>
    </section> : view === "matches" ? <>
      <div className="flex items-center gap-2 text-sm font-medium"><Link2 className="size-5 text-primary" />{matches.length} potential {matches.length === 1 ? "match" : "matches"}</div>
      {matches.length === 0 && <p role="status" className="border-y py-6 text-muted-foreground">No matching organization offers are currently recorded for your requests. Your needs remain submitted.</p>}
      <ul className="space-y-3">{matches.map((match) => <li key={`${match.request.id}-${match.org.id}-${match.offer.id}`} className="rounded-md border bg-card p-4">
        <div className="flex flex-wrap justify-between gap-2"><h2 className="font-display text-lg font-semibold">{schoolResourceName(match.request)}</h2><span className="text-sm text-primary">{MATCH_CATEGORY_LABEL[match.category]}</span></div>
        <p className="mt-1 text-sm">{match.org.orgName}</p>
        <p className="mt-2 text-sm text-muted-foreground">Requested: {requestAmount(match.request)}</p>
        <p className="text-sm text-muted-foreground">{match.recommendedQty === undefined ? "Capacity requires confirmation" : `Potential coverage: ${match.recommendedQty} ${match.unit}`}</p>
        <details className="mt-3 border-t pt-3 text-sm"><summary className="cursor-pointer font-medium text-primary">Review requirements</summary>
          <p className="mt-2 text-muted-foreground">Same catalogue resource; the organization’s service area covers {school.region}.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">{[...new Set([...match.prerequisites, ...match.warnings])].map((item) => <li key={item}>{item}</li>)}</ul>
        </details>
      </li>)}</ul>
    </> : <>
      <div className="flex items-center gap-2 text-sm font-medium"><PackageSearch className="size-5 text-primary" />{requests.length} current resource {requests.length === 1 ? "request" : "requests"}</div>
      <ul className="space-y-3">{requests.map((request) => <li key={request.id} className="rounded-md border bg-card p-4">
        <div className="flex flex-wrap justify-between gap-2"><h2 className="font-display text-lg font-semibold">{schoolResourceName(request)}</h2><span className="text-sm font-medium text-primary">{REQUEST_STATUS_LABEL[request.status]}</span></div>
        <p className="mt-2 text-sm">Requested: {requestAmount(request)}</p>
        <p className="mt-1 text-sm text-muted-foreground">{matches.filter((match) => match.request.id === request.id).length} potential matches · Not allocated</p>
        <details className="mt-3 border-t pt-3 text-sm"><summary className="cursor-pointer font-medium text-primary">Request history</summary>
          <ol className="mt-3 space-y-2 text-muted-foreground"><li>Submitted · {request.submittedAt ? new Date(request.submittedAt).toLocaleString() : "Date not recorded"}</li>
            {request.reviewHistory.map((event, index) => <li key={`${event.at}-${index}`}>{REQUEST_STATUS_LABEL[event.status]} · {new Date(event.at).toLocaleString()}{event.note && <p className="mt-1 break-words">{event.note}</p>}</li>)}
          </ol>
        </details>
      </li>)}</ul>
    </>}
  </div>;
}