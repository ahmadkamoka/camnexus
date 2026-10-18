import { RequestSummary } from "@/components/ResourceRequests";
import { SchoolResourceCards } from "@/components/SchoolResourceCards";
import { SchoolWorkspaceNav } from "@/components/SchoolWorkspaceNav";
import { compactSchoolRequests } from "@/lib/school-resource-cards";
import { SchoolPicker } from "@/components/SchoolPicker";
import { assessmentDraftSchema, requestsSchema, infrastructureSchema, migrateRequests, needsFromRequests, requestIssues, type ResourceRequest } from "@/lib/resource-requests";
import { schoolFormInfrastructure } from "@/lib/school-form-projection";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { PreviousSchoolSubmissions } from "@/components/PreviousSchoolSubmissions";
import { Button } from "@/components/ui/button";
import { SCHOOL_REGISTRY, DEMO_PASSWORD, demoLogin } from "@/lib/school-demo";
import { VerificationBadge } from "@/components/VerificationBadge";
import { useStore } from "@/lib/store";
import { type Electricity, type Evidence, type Internet, type Need, type School } from "@/lib/impact";

export const Route = createFileRoute("/assess")({
  head: () => ({
    meta: [
      { title: "School Assessment — CamNexus" },
      { name: "description", content: "Record school population, devices, infrastructure, needs and evidence." },
      { property: "og:title", content: "School Assessment — CamNexus" },
      { property: "og:description", content: "Record school population, devices, infrastructure and needs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Assess,
});

const input = "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring";
const label = "block text-sm font-medium";

const empty = {
  name: "", community: "", region: "Centre", students: "", computers: "", working: "",
  electricity: "unknown" as Electricity, internet: "unknown" as Internet,
  reliableElectricity: "" as "yes" | "no" | "", solarPower: "" as "yes" | "no" | "",
  requests: [] as ResourceRequest[], needs: [] as Need[], urgent: "" as Need | "", comments: "", evidence: [] as Evidence[],
};

function nonNeg(v: string, field: string, min = 0): number | string {
  if (v.trim() === "") return `${field} is required.`;
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return `${field} must be a whole number.`;
  if (n < min) return `${field} must be ${min} or more.`;
  return n;
}

function Assess() {
  const { schools, demoSession, setDemoSession, submitNeeds } = useStore();
  const [step, setStep] = useState(1);
  const [registryId, setRegistryId] = useState("");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [drafts, setDrafts] = useState<Record<string, typeof empty>>({});
  const [dirty, setDirty] = useState(false);
  const [confirmation, setConfirmation] = useState<{ name: string; reference: string; at: string } | null>(null);
  const registry = SCHOOL_REGISTRY.find((s) => s.id === registryId);
  const current = schools.find((s) => s.id === registryId);
  const [f, setF] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const set = <K extends keyof typeof empty>(k: K, v: (typeof empty)[K]) => { setDirty(true); setF((p) => ({ ...p, [k]: v })); };
  // Warn before navigating away with unsaved changes.
  const dirtyRef = useRef(dirty); dirtyRef.current = dirty;
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (dirtyRef.current) e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Return from school resource pages without losing the in-memory school session.
  useEffect(() => {
    if (demoSession?.role !== "school") return;
    const assigned = SCHOOL_REGISTRY.find((school) => school.id === demoSession.schoolId);
    const savedSchool = schools.find((school) => school.id === demoSession.schoolId);
    if (!assigned || !savedSchool) return;
    setRegistryId(assigned.id); startEdit(savedSchool); setStep(3);
    try {
      const saved = JSON.parse(localStorage.getItem("camnexus-assessment-drafts-v1") ?? "{}")[assigned.id];
      if (saved) setF({ ...empty, ...assessmentDraftSchema.parse(saved), name: assigned.name, community: assigned.community, region: assigned.region });
    } catch { setError("The saved draft could not be read. Your submitted assessment is still available."); }
  }, []);

  function startEdit(s: School) {
    setEditId(s.id); setError(""); setOk("");
    setF({
      name: s.name, community: s.community ?? "", region: s.region, students: s.students > 0 ? String(s.students) : "", computers: s.computers === undefined ? "" : String(s.computers),
      working: s.workingComputers === undefined ? "" : String(s.workingComputers), electricity: s.electricity, internet: s.internet,
      reliableElectricity: s.reliableElectricity !== undefined ? s.reliableElectricity ? "yes" : "no" : "",
      solarPower: s.solarPowerRequested === undefined ? "" : s.solarPowerRequested ? "yes" : "no",
      requests: migrateRequests(s), needs: s.needs, urgent: s.urgentNeed ?? "", comments: s.comments ?? "", evidence: s.evidence ?? [],
    });

  }
  function back(to: number) {
    if (registryId && step >= 3) setDrafts((p) => ({ ...p, [registryId]: f }));
    setError(""); setStep(to);
  }
  function signIn(useDemo = false) {
    const session = demoLogin(registryId, useDemo ? registry?.accountId ?? "" : account, useDemo ? DEMO_PASSWORD : password);
    if (!session || !registry) return setError("Incorrect school-account combination or demo password. Use the account assigned to this school.");
    setDemoSession(session); setPassword(""); setError("");
    const school = current ?? { ...registry, students: 0, electricity: "unknown" as Electricity, internet: "unknown" as Internet, needs: [] };
    startEdit(school);
    setDirty(false);
    try {
      const stored = JSON.parse(localStorage.getItem("camnexus-assessment-drafts-v1") ?? "{}");
      const saved = drafts[registryId] ?? stored[registryId];
      if (saved) {
        const validated = assessmentDraftSchema.parse(saved);
        setF({ ...empty, ...validated, name: registry.name, community: registry.community, region: registry.region }); setOk("Saved draft restored.");
      }
    } catch { setError("The saved draft could not be read. Your submitted assessment is still available."); }
    setStep(3);
  }

  function saveDraft() {
    if (!registry || demoSession?.role !== "school" || demoSession.schoolId !== registryId) return;
    try {
      assessmentDraftSchema.parse(f);
      const stored = JSON.parse(localStorage.getItem("camnexus-assessment-drafts-v1") ?? "{}");
      localStorage.setItem("camnexus-assessment-drafts-v1", JSON.stringify({ ...stored, [registryId]: f }));
      setDrafts((p) => ({ ...p, [registryId]: f })); setDirty(false); setError(""); setOk("Draft saved in this browser. Drafts are stored only on this device and may be cleared with browser data; there is no cloud synchronization.");
    } catch { setError("Unable to save the draft. Your entries are still on this page."); }
  }
  function discardDraft() {
    try {
      const stored = JSON.parse(localStorage.getItem("camnexus-assessment-drafts-v1") ?? "{}"); delete stored[registryId];
      localStorage.setItem("camnexus-assessment-drafts-v1", JSON.stringify(stored));
    } catch {}
    setDrafts((p) => { const next = { ...p }; delete next[registryId]; return next; });
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) return setError("Please enter a school name.");
    if (f.name.trim().length > 120) return setError("School name must be under 120 characters.");
    const st = nonNeg(f.students, "Student population", 1);
    if (typeof st === "string") return setError(st);
    const validated = requestsSchema.safeParse(compactSchoolRequests(f.requests));
    if (!validated.success) {
      // Scroll to the first incomplete selected resource.
      const first = f.requests.find((r) => requestIssues({ ...r, assessmentFormat: "compact" }).length > 0) ?? f.requests[0];
      if (first) { document.getElementById(`request-${first.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }
      return setError(validated.error.issues[0]?.message ?? "Check the resource requests.");
    }
    if (f.comments.length > 1000) return setError("Comments must be under 1000 characters.");
    const existing = editId ? schools.find((s) => s.id === editId) : undefined;
    if (!registry || demoSession?.role !== "school" || demoSession.schoolId !== registryId) return setError("Sign in with the demo account assigned to this school before submitting.");
    const school: School = {
      id: registry.id, name: registry.name, community: registry.community, region: registry.region, registrationId: registry.registrationId,
      students: st, ...schoolFormInfrastructure(existing, f),
      requests: validated.data, needs: needsFromRequests(validated.data), urgentNeed: needsFromRequests(validated.data.filter((r) => r.primary))[0],
      comments: f.comments.trim() || undefined, evidence: f.evidence,
      verification: "pending_review", sample: existing?.sample,
    };
    const infrastructure = infrastructureSchema.safeParse(school);
    if (!infrastructure.success) return setError(infrastructure.error.issues[0]?.message ?? "Check the school information.");
    try {
      const at = new Date().toISOString();
      submitNeeds(school); discardDraft(); setDirty(false); setError("");
      setConfirmation({ name: school.name, reference: `${registry.registrationId}-${at.slice(0, 10).replaceAll("-", "")}-${at.slice(11, 19).replaceAll(":", "")}`, at });
      setOk(`${school.name}: needs submitted for review.`); setStep(4);
    } catch { setError("Unable to save this submission in your browser. Check available storage and try again; your entries are retained."); }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {demoSession?.role === "school" && <SchoolWorkspaceNav />}
      <ol aria-label="Submission progress" className="grid grid-cols-4 gap-2 text-center text-xs sm:text-sm">
        {["Select school", "School login", "Needs assessment", "Confirmation"].map((name, i) => <li key={name} aria-current={step === i + 1 ? "step" : undefined} className={`border-b-2 pb-3 ${step === i + 1 ? "border-primary font-semibold text-primary" : "border-border text-muted-foreground"}`}>{i + 1}. {name}</li>)}
      </ol>
      <details className="rounded-md border p-3 text-sm">
        <summary className="cursor-pointer font-semibold">About This Demo</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>No real government school registry integration.</li>
          <li>No real PS43 approval or partnership implied.</li>
          <li>Browser-based demo authentication is not secure and not production-ready.</li>
          <li>No real funding commitments or deliveries.</li>
          <li>Do not submit real sensitive information or real credentials.</li>
          <li>Data and drafts are stored only in this browser and may be cleared; there is no cloud synchronization.</li>
        </ul>
      </details>
      {step === 1 && <section className="space-y-4">
        <h1 className="font-display text-2xl font-bold">Select Your School</h1>
        <p className="text-sm text-muted-foreground">Illustrative registry: five fictional schools simulate pre-verified institutions. None is government-verified or officially approved.</p>
        <SchoolPicker schools={SCHOOL_REGISTRY} value={registryId} onChange={(id) => { setRegistryId(id); setDemoSession(null); setAccount(""); setPassword(""); }} />
        {registry && <p className="text-sm">{registry.community} · {registry.region} · {registry.registrationId}</p>}
        <Button disabled={!registry} onClick={() => { setStep(2); setError(""); }}>Continue to School Login</Button>
      </section>}
      {step === 2 && registry && <section className="space-y-4">
        <h1 className="font-display text-2xl font-bold">Sign In to Your School Account</h1>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); signIn(); }}>
          <div><label className={label} htmlFor="login-school">School name</label><input id="login-school" className={input} value={registry.name} readOnly /></div>
          <p className="text-sm text-muted-foreground">{registry.registrationId} · Authentication is simulated and not production-secure.</p>
          <div><label className={label} htmlFor="account">Email or school account ID</label><input id="account" className={input} value={account} autoComplete="off" onChange={(e) => setAccount(e.target.value)} /></div>
          <div><label className={label} htmlFor="password">Demo password</label><input id="password" type="password" className={input} value={password} autoComplete="off" onChange={(e) => setPassword(e.target.value)} /></div>
          <div className="flex flex-wrap gap-2"><Button type="submit">Sign In</Button><Button type="button" variant="secondary" onClick={() => signIn(true)}>Use Demo Account</Button><Button type="button" variant="outline" onClick={() => back(1)}>Back</Button></div>
        </form>
      </section>}
      {step === 3 && registry && demoSession?.role === "school" && demoSession.schoolId === registryId && <section>
        <h1 id="assess-form" className="font-display text-2xl font-bold">Tell Us What Your School Needs</h1>
        <p className="mt-2 text-sm text-muted-foreground">Help us understand what resources your school needs.</p>
        {current?.reviewMessage && <p className="mt-3 rounded-md bg-accent p-3 text-sm text-accent-foreground">Additional information requested: {current.reviewMessage}</p>}
        <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
          <h2 className="border-t pt-5 font-display text-xl font-semibold">School Information</h2>
          <div><label className={label} htmlFor="n">School name</label><input id="n" maxLength={120} className={input} value={registry.name} readOnly /></div>
          <div><label className={label} htmlFor="cmty">Community / town</label><input id="cmty" maxLength={80} className={input} value={registry.community} readOnly /></div>
          <div><label className={label} htmlFor="st">Number of Students</label><input id="st" type="number" inputMode="numeric" min={1} step={1} required className={input} value={f.students} onChange={(e) => set("students", e.target.value)} /></div>
          <SchoolResourceCards requests={f.requests} school={registry} onChange={(requests) => set("requests", requests)} />
          <div><label className={label} htmlFor="cm">Why does your school need these resources? <span className="font-normal text-muted-foreground">(optional)</span></label>
            <textarea id="cm" rows={3} maxLength={1000} className={input} value={f.comments} onChange={(e) => set("comments", e.target.value)} /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {ok && !error && <p role="status" className="text-sm text-primary">{ok}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="w-full sm:w-auto">Submit Request</Button>
            <Button type="button" variant="secondary" onClick={saveDraft}>Save Draft</Button>
            <Button type="button" variant="outline" onClick={() => back(2)}>Back to Login</Button>
            <Button type="button" variant="ghost" onClick={() => { back(1); setDemoSession(null); }}>Sign Out / Change School</Button>
          </div>
        </form>
        <PreviousSchoolSubmissions school={current} signedInSchoolId={demoSession.schoolId} />
      </section>}
      {step === 4 && <section className="space-y-4" aria-live="polite">
        <h1 className="font-display text-2xl font-bold">Needs Submitted for Review</h1>
        <p role="status">{ok}</p>
        {confirmation && <dl className="rounded-md border p-4 text-sm">
          <div className="flex justify-between gap-4"><dt className="font-semibold">School</dt><dd>{confirmation.name}</dd></div>
          <div className="flex justify-between gap-4"><dt className="font-semibold">Submission reference</dt><dd className="break-all">{confirmation.reference}</dd></div>
          <div className="flex justify-between gap-4"><dt className="font-semibold">Submission date</dt><dd>{new Date(confirmation.at).toLocaleString()}</dd></div>
          <div className="flex items-center justify-between gap-4"><dt className="font-semibold">Review status</dt><dd><VerificationBadge status={current?.verification ?? "pending_review"} /></dd></div>
        </dl>}
        <p className="text-sm text-muted-foreground">Priority scores remain provisional. This is not funding approval or verification of reported needs.</p>
        <div className="flex flex-wrap gap-2"><Button onClick={() => { if (current) startEdit(current); setStep(3); }}>Update Assessment</Button><Button variant="outline" asChild><Link to="/">Back to Home</Link></Button><Button variant="ghost" onClick={() => { back(1); setDemoSession(null); }}>Sign Out</Button></div>
        {current && <>
          <details className="mt-5 border-t pt-4"><summary className="cursor-pointer font-semibold">View Current Assessment</summary><RequestSummary requests={current.requests ?? []} /></details>
          {demoSession?.role === "school" && demoSession.schoolId === registryId && <PreviousSchoolSubmissions school={current} signedInSchoolId={demoSession.schoolId} />}
        </>}
      </section>}
      {error && step !== 3 && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
