import type { School } from "@/lib/impact";
import { previousSchoolSubmissions } from "@/lib/school-form-projection";
import { requestName } from "@/lib/resource-requests";

export function PreviousSchoolSubmissions({ school, signedInSchoolId }: { school: School | undefined; signedInSchoolId: string }) {
  const submissions = previousSchoolSubmissions(school, signedInSchoolId);
  return <details className="mt-5 border-t pt-4">
    <summary className="cursor-pointer font-semibold">Previous Submissions</summary>
    {!submissions.length ? <p className="mt-2 text-sm text-muted-foreground">No previous submissions.</p> :
      <ol className="mt-2 divide-y text-sm">{submissions.map((event) => <li key={event.at} className="grid gap-2 py-3 sm:grid-cols-[12rem_1fr]">
        <time dateTime={event.at} className="text-muted-foreground">{new Date(event.at).toLocaleString()}</time>
        <ul className="space-y-1">{event.snapshot?.requests?.map((request) => <li key={request.id} className="flex justify-between gap-3">
          <span className="min-w-0 break-words">{requestName(request)}</span>
          <span className="shrink-0 tabular-nums">{request.quantity ?? "Quantity not recorded"}</span>
        </li>)}</ul>
      </li>)}</ol>}
  </details>;
}