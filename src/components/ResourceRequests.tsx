import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORIES, CATEGORY_LABELS, RESOURCE_CATALOG, URGENCIES, REQUEST_STATUS_LABEL, isScopeRequest, requestIssues, unitsFor, requestName, requestAmount, newRequest, type ResourceRequest } from "@/lib/resource-requests";
import type { Evidence, School } from "@/lib/impact";

const input = "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-base focus:ring-2 focus:ring-ring";
export async function localEvidence(files: File[]): Promise<Evidence[]> {
  return Promise.all(files.slice(0, 5).map(async (file) => {
    let preview: string | undefined;
    if (file.type.startsWith("image/") && file.size <= 10_000_000) {
      preview = await new Promise<string | undefined>((resolve) => {
        const image = new Image(), url = URL.createObjectURL(file);
        image.onload = () => {
          const scale = Math.min(1, 160 / Math.max(image.width, image.height)), canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
          canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url); resolve(canvas.toDataURL("image/jpeg", 0.6));
        };
        image.onerror = () => { URL.revokeObjectURL(url); resolve(undefined); }; image.src = url;
      });
    }
    return { id: crypto.randomUUID(), name: file.name.slice(0, 120), type: (file.type || "file").slice(0, 100), size: file.size, preview };
  }));
}
export function EvidenceList({ evidence, remove }: { evidence: Evidence[]; remove?: (id: string) => void }) {
  return <ul className="mt-2 flex flex-wrap gap-3">{evidence.map((e) => <li key={e.id} className="max-w-40 break-words text-xs">
    {e.preview && <img src={e.preview} alt={e.name} className="h-20 max-w-full object-contain" />}{e.name}
    {remove && <Button type="button" variant="link" size="sm" onClick={() => remove(e.id)}>Remove</Button>}
  </li>)}</ul>;
}
export function RequestSummary({ requests, edit, schoolTeachers }: { requests: ResourceRequest[]; edit?: (id: string) => void; schoolTeachers?: number | undefined }) {
  return <ul className="mt-3 divide-y">{requests.map((r) => {
    const issues = requestIssues(r, schoolTeachers);
    return <li key={r.id} className="py-3 text-sm">
      <p className="font-semibold">{requestName(r)}{r.primary && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">Highest Priority Need</span>}</p>
      <p>{r.category} · {requestAmount(r)} · {r.urgency ? `${r.urgency} urgency (self-reported)` : "Urgency not recorded"}</p>
      <p className="text-muted-foreground">Existing usable: {r.existingQuantity ?? "Not recorded"} · {REQUEST_STATUS_LABEL[r.status]}</p>
      <p className="mt-1 whitespace-pre-wrap break-words">{r.reason || "Reason not yet recorded"}</p>
      {issues.length > 0 && <p className="mt-1 text-sm font-medium text-destructive">Missing required information: {issues.join(" ")}</p>}
      <p className="mt-1 break-all text-xs text-muted-foreground">Request ID: {r.id}{r.submittedAt ? ` · Submitted ${new Date(r.submittedAt).toLocaleString()}` : ""}</p>
      <EvidenceList evidence={r.evidence} />
      {edit && <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => edit(r.id)}><Pencil className="mr-1 h-3 w-3" />Edit this request</Button>}
      {r.reviewHistory.length > 0 && <ol className="mt-2 border-l pl-3 text-xs">{r.reviewHistory.map((event, i) => <li key={`${event.at}-${i}`}>{new Date(event.at).toLocaleString()} · {REQUEST_STATUS_LABEL[event.status]}{event.note ? ` — ${event.note}` : ""}</li>)}</ol>}
    </li>;
  })}</ul>;
}
export function ResourceRequestsEditor({ requests, school, onChange }: { requests: ResourceRequest[]; school: Pick<School, "id" | "registrationId" | "community" | "region"> & { teachers?: number | undefined }; onChange: (requests: ResourceRequest[]) => void }) {
  // Newly added and incomplete requests start expanded; completed ones stay collapsed.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const isOpen = (r: ResourceRequest) => collapsed[r.id] !== undefined ? !collapsed[r.id] : requestIssues(r, school.teachers).length > 0;
  const toggle = (id: string) => setCollapsed((p) => ({ ...p, [id]: isOpen(requests.find((r) => r.id === id)!) }));
  const update = (id: string, changes: Partial<ResourceRequest>) => onChange(requests.map((r) => r.id === id ? { ...r, ...changes, legacyNeed: undefined } : r));
  const markPrimary = (id: string) => onChange(requests.map((x) => ({ ...x, primary: x.id === id })));
  return <section aria-labelledby="resource-needs" className="space-y-4 border-t pt-5">
    <h2 className="font-display text-xl font-semibold">3. Educational Needs and Resource Requests</h2>
    <h3 id="resource-needs" className="font-semibold">What Does Your School Need?</h3>
    <p className="text-sm text-muted-foreground">Urgency: Critical — learning or safety severely disrupted; High — major disruption; Medium — important improvement; Low — useful but can wait. All urgency is self-reported until reviewed. Exactly one request must be marked as the highest-priority need before submitting; this is the school's reported primary need and is subject to PS43 review.</p>
    {requests.map((r, i) => {
      const open = isOpen(r);
      const issues = requestIssues(r, school.teachers);
      const labels = CATEGORY_LABELS[r.category];
      return <fieldset key={r.id} id={`request-${r.id}`} className="min-w-0 rounded-md border p-4">
        <legend className="sr-only">Need {i + 1}: {requestName(r)}</legend>
        <div className="flex items-start justify-between gap-2">
          <button type="button" aria-expanded={open} aria-controls={`request-body-${r.id}`} onClick={() => toggle(r.id)} className="flex min-w-0 flex-1 items-start gap-2 text-left">
            {open ? <ChevronDown className="mt-1 h-4 w-4 shrink-0" /> : <ChevronRight className="mt-1 h-4 w-4 shrink-0" />}
            <span className="min-w-0">
              <span className="block break-words font-semibold">Need {i + 1}: {requestName(r)}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{requestAmount(r)} · {r.urgency ? `${r.urgency} urgency (self-reported)` : "Urgency not recorded"} · {REQUEST_STATUS_LABEL[r.status]}</span>
              <span className="mt-1 flex flex-wrap gap-1">
                {r.primary && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">Highest Priority Need</span>}
                {issues.length > 0 && <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">Incomplete</span>}
              </span>
            </span>
          </button>
          <Button type="button" variant="ghost" size="icon" aria-label={`Remove need ${i + 1}`} title="Remove need" onClick={() => onChange(requests.filter((x) => x.id !== r.id))}><Trash2 className="h-4 w-4" /></Button>
        </div>
        {open && <div id={`request-body-${r.id}`} className="mt-3 space-y-3 border-t pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Resource Category<select aria-label={`Resource category ${i + 1}`} className={input} value={r.category} onChange={(e) => {
              const category = e.target.value as ResourceRequest["category"];
              update(r.id, { category, resource: RESOURCE_CATALOG[category][0], customResource: undefined, units: unitsFor(category), quantity: undefined, scope: undefined, existingQuantity: undefined, affectedCount: undefined, quantityExplanation: undefined });
            }}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="text-sm font-medium">Specific Resource Needed<select aria-label={`Specific resource ${i + 1}`} className={input} value={r.resource} onChange={(e) => update(r.id, { resource: e.target.value, customResource: undefined })}>{RESOURCE_CATALOG[r.category].map((name) => <option key={name}>{name}</option>)}</select></label>
          </div>
          {r.resource === "Other" && <label className="block text-sm font-medium">Custom resource<input aria-label={`Custom resource ${i + 1}`} className={input} maxLength={120} value={r.customResource ?? ""} onChange={(e) => update(r.id, { customResource: e.target.value })} /></label>}
          {isScopeRequest(r.category) ? <>
            <label className="block text-sm font-medium">Description of the work and estimated scope<textarea aria-label={`Scope ${i + 1}`} className={input} maxLength={1000} value={r.scope ?? ""} onChange={(e) => update(r.id, { scope: e.target.value })} /></label>
            <label className="block text-sm font-medium">{labels.quantity}<input aria-label={`Affected facilities ${i + 1}`} className={input} type="number" min={0} max={1000000} step={1} value={r.affectedCount ?? ""} onChange={(e) => update(r.id, { affectedCount: e.target.value === "" ? undefined : Number(e.target.value) })} /></label>
          </> : <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">{labels.quantity} ({r.units})<input aria-label={`Quantity needed ${i + 1}`} className={input} type="number" min={1} max={1000000} step={1} value={r.quantity ?? ""} onChange={(e) => update(r.id, { quantity: e.target.value === "" ? undefined : Number(e.target.value) })} /></label>
            <label className="block text-sm font-medium">{labels.existing} (optional)<input aria-label={`Existing usable quantity ${i + 1}`} className={input} type="number" min={0} max={1000000} step={1} value={r.existingQuantity ?? ""} onChange={(e) => update(r.id, { existingQuantity: e.target.value === "" ? undefined : Number(e.target.value) })} /></label>
          </div>}
          {r.category === "Teacher training" && school.teachers !== undefined && r.quantity !== undefined && r.quantity > school.teachers &&
            <label className="block text-sm font-medium">Requested teachers exceed the school's total of {school.teachers} — explain why<textarea aria-label={`Teacher count explanation ${i + 1}`} className={input} maxLength={1000} value={r.quantityExplanation ?? ""} onChange={(e) => update(r.id, { quantityExplanation: e.target.value })} /></label>}
          <label className="block text-sm font-medium">Urgency Level{r.urgency === undefined && <span className="ml-1 text-xs text-destructive">(not recorded in the legacy assessment — please select)</span>}<select aria-label={`Urgency ${i + 1}`} className={input} value={r.urgency ?? ""} onChange={(e) => update(r.id, { urgency: (e.target.value || undefined) as ResourceRequest["urgency"] })}><option value="">Not recorded — select an urgency</option>{URGENCIES.map((u) => <option key={u}>{u}</option>)}</select></label>
          <label className="block text-sm font-medium">Reason for Request<textarea aria-label={`Reason for request ${i + 1}`} className={input} rows={3} maxLength={1000} value={r.reason} onChange={(e) => update(r.id, { reason: e.target.value })} placeholder={labels.reason} /></label>
          <label className="block text-sm font-medium">Supporting evidence for this need (optional)<input aria-label={`Evidence for need ${i + 1}`} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv" className="mt-1 block w-full text-sm" onChange={async (e) => {
            const files = Array.from(e.target.files ?? []); e.target.value = "";
            const evidence = await localEvidence(files.slice(0, Math.max(0, 5 - r.evidence.length))); update(r.id, { evidence: [...r.evidence, ...evidence] });
          }} /></label>
          <EvidenceList evidence={r.evidence} remove={(id) => update(r.id, { evidence: r.evidence.filter((e) => e.id !== id) })} />
          {r.primary
            ? <p className="rounded-md bg-primary/10 p-2 text-sm font-semibold text-primary">Highest Priority Need — the school's reported primary need, subject to PS43 review.</p>
            : <Button type="button" variant="outline" onClick={() => markPrimary(r.id)}>Mark as Highest Priority Need</Button>}
        </div>}
      </fieldset>;
    })}
    <Button type="button" variant="outline" disabled={requests.length >= 50} onClick={() => { const r = newRequest(school); onChange([...requests, r]); setCollapsed((p) => ({ ...p, [r.id]: false })); }}><Plus className="mr-2 h-4 w-4" />Add Another Need</Button>
  </section>;
}
