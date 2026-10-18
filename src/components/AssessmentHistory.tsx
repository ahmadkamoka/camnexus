import { RequestSummary } from "./ResourceRequests";
import { REQUEST_STATUS_LABEL, type RequestStatus } from "@/lib/resource-requests";
import type { School } from "@/lib/impact";
import { VERIFICATION_LABEL } from "@/lib/impact";

export function AssessmentHistory({ school }: { school: School }) {
  return <section className="mt-5 border-t pt-4">
    <h3 className="font-semibold">Submission & review history</h3>
    {!school.history?.length && <p className="mt-2 text-sm text-muted-foreground">No submissions yet.</p>}
    <ol className="mt-2 space-y-3 text-sm">{[...(school.history ?? [])].reverse().map((event, i) => <li key={`${event.at}-${i}`} className="border-l-2 border-secondary pl-3">
      <p>{new Date(event.at).toLocaleString()} · {event.kind === "submission" ? "Submitted" : "Demo review"} · {VERIFICATION_LABEL[event.status]}</p>
      {event.requestId && <p className="break-all text-xs text-muted-foreground">Request: {event.requestId} · {REQUEST_STATUS_LABEL[event.requestStatus as RequestStatus] ?? event.requestStatus}</p>}
      {event.message && <p className="text-muted-foreground">{event.message}</p>}
      {event.snapshot && <details className="mt-1"><summary className="cursor-pointer text-primary">View assessment version</summary>
        {event.snapshot.requests && <RequestSummary requests={event.snapshot.requests} />}
        <dl className="mt-2 grid gap-1">
          <div>Students: {event.snapshot.students} · Teachers: {event.snapshot.teachers ?? "Unknown"} · Classrooms: {event.snapshot.classrooms ?? "Unknown"}</div>
          <div>Computers: {event.snapshot.workingComputers ?? event.snapshot.computers} working / {event.snapshot.computers} total</div>
          <div>Electricity: {event.snapshot.electricity} · Internet: {event.snapshot.internet}</div>
          <div>Needs: {event.snapshot.needs.join(", ")}</div>
          <div>Most urgent: {event.snapshot.urgentNeed ?? "Not specified"}</div>
          {event.snapshot.comments && <div>{event.snapshot.comments}</div>}
          {event.snapshot.evidence?.map((e) => <div key={e.id}>{e.preview && <img src={e.preview} alt={e.name} className="h-20 max-w-full object-contain" />}{e.name} (local thumbnail / filename only)</div>)}
        </dl>
      </details>}
    </li>)}</ol>
  </section>;
}