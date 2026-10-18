import { VERIFICATION_LABEL, type Verification } from "@/lib/impact";

const style: Record<Verification, string> = {
  unverified: "border border-dashed border-muted-foreground/50 text-muted-foreground",
  pending_review: "bg-secondary text-secondary-foreground",
  under_review: "bg-accent text-accent-foreground",
  verified: "bg-primary text-primary-foreground",
};

export function VerificationBadge({ status }: { status?: Verification | undefined }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${style[status ?? "unverified"]}`}>
      {VERIFICATION_LABEL[status ?? "unverified"]}
    </span>
  );
}
