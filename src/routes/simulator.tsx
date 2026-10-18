import { RequestSummary } from "@/components/ResourceRequests";
import { activeRequests, requestName } from "@/lib/resource-requests";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/Shell";
import { useStore } from "@/lib/store";
import { recommend, scoreSchool, simulate } from "@/lib/impact";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [
      { title: "Impact Simulator — CamNexus" },
      { name: "description", content: "Compare equipment, infrastructure and low-tech options against a budget." },
      { property: "og:title", content: "Impact Simulator — CamNexus" },
      { property: "og:description", content: "Compare hypothetical investment options for a school." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Simulator,
});

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

function Simulator() {
  const { schools, selectedId, setSelectedId } = useStore();
  const [budget, setBudget] = useState(8000);
  const school = schools.find((s) => s.id === selectedId) ?? schools[0];
  if (!school) return <p>Add a school in the assessment section first.</p>;
  const opts = simulate(school, budget);
  const rec = recommend(school, opts);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Impact Simulator</h1>
      <Card className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="sch" className="block text-sm font-medium">School</label>
          <select id="sch" value={school.id} onChange={(e) => setSelectedId(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2">
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <p className="mt-2 text-sm text-muted-foreground">{school.students} students · {school.workingComputers ?? school.computers}/{school.computers} computers working · power {school.electricity} · internet {school.internet} · {scoreSchool(school).insufficient ? "score withheld: additional assessment required" : `${scoreSchool(school).provisional ? "provisional priority score" : "priority score (demo-verified)"} ${scoreSchool(school).total}`}</p>
        </div>
        <div>
          <label htmlFor="b" className="block text-sm font-medium">Budget: <span className="font-display text-xl font-bold text-primary">{usd(budget)}</span> (hypothetical)</label>
          <input id="b" type="range" min={1000} max={20000} step={500} value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="mt-3 w-full accent-primary" />
        </div>
      </Card>

      <section aria-labelledby="requested-resources">
        <h2 id="requested-resources" className="font-display text-xl font-semibold">School resource requests</h2>
        <RequestSummary requests={activeRequests(school)} />
        {activeRequests(school).filter((r) => !["Books and educational materials", "Teacher training", "Electricity and energy infrastructure", "Internet and connectivity"].includes(r.category) && !(r.category === "Digital equipment" && ["Laptops", "Desktop computers"].includes(r.resource))).map((r) => <p key={r.id} className="mt-2 text-sm text-accent-foreground"><strong>{requestName(r)}:</strong> additional planning required — no supported request-specific cost or outcome model.</p>)}
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        {opts.map((o) => (
          <Card key={o.key} className={rec.option?.key === o.key ? "border-primary ring-2 ring-primary" : ""}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">{o.title}</h2>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${o.fits ? "bg-secondary text-secondary-foreground" : "bg-destructive/15 text-destructive"}`}>{o.fits ? "Fits budget" : "Over budget"}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{o.description}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div><dt className="text-muted-foreground">Est. cost</dt><dd className="font-semibold">{usd(o.cost)}</dd></div>
              <div><dt className="text-muted-foreground">Est. students reached</dt><dd className="font-semibold">{o.relevant === false ? "Not applicable" : `~${o.students}`}</dd></div>
            </dl>
            <h3 className="mt-3 text-sm font-semibold">Prerequisites</h3>
            <ul className="list-disc pl-5 text-sm">{o.prerequisites.map((p) => <li key={p}>{p}</li>)}</ul>
            {o.warnings.length > 0 && (
              <div className="mt-3 rounded-md bg-accent p-2 text-sm text-accent-foreground">
                <p className="font-semibold">Suitability warnings</p>
                <ul className="list-disc pl-5">{o.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="border-primary">
        <h2 className="font-display text-lg font-semibold">Recommendation (for discussion)</h2>
        <p className="mt-1">{rec.option ? <><strong>{rec.option.title}</strong> may be preferable. </> : null}{rec.reason}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Costs and student numbers are hypothetical illustrations, not predictions. PS43 staff and local partners must validate any final decision with the school community.
        </p>
      </Card>
    </div>
  );
}
