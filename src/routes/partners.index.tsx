import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, HandHeart, Home, MapPin, Wallet } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { contributionSchema, DEMO_CONTRIBUTION_INFO, saveDemoContribution, selectedContributionResources } from "@/lib/partner-contributions";
import { estimatePartnerValue, PARTNER_RESOURCE_OPTIONS } from "@/lib/partner-preferences";
import { RESOURCE_CATEGORY_GROUPS } from "@/lib/catalog";
import { ResourceCategoryCard, ResourceRow, RESOURCE_CARD_GRID } from "@/components/ResourceSelectionCard";
import { CommunityMap } from "@/components/CommunityMap";
import { buildCommunities } from "@/lib/communities";
import { criticalityColor, criticalityLevelLabel } from "@/lib/criticality";
import { useStore } from "@/lib/store";
import { REGIONS } from "@/lib/impact";
import { createSponsorPopup } from "@/lib/sponsor-map-details";

export const Route = createFileRoute("/partners/")({
  head: () => ({
    meta: [
      { title: "Become a Resource Partner — CamNexus" },
      { name: "description", content: "Select resources requested by schools in Cameroon and view illustrative CAD estimates." },
      { property: "og:title", content: "Become a Resource Partner — CamNexus" },
      { property: "og:description", content: "Choose resources to provide to Cameroonian schools and see where they go." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FindSchool,
});

const cad = (value: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(value);

function FindSchool() {
  const { schools } = useStore();
  const communities = useMemo(() => buildCommunities(schools), [schools]);
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [preferredLocation, setPreferredLocation] = useState("anywhere");
  const [preferredRegion, setPreferredRegion] = useState("");
  const community = communities.find((item) => item.key === selectedCommunity);
  const resources = PARTNER_RESOURCE_OPTIONS;
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"select" | "review" | "success">("select");
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ organizationName?: string; email?: string }>({});
  const saving = useRef(false);
  const estimate = estimatePartnerValue(resources, quantities);
  function changeStep(next: typeof step) {
    setError("");
    setFieldErrors({});
    setStep(next);
    window.scrollTo({ top: 0 });
  }
  function continueContribution() {
    try {
      selectedContributionResources(quantities, customNames);
      changeStep("review");
    } catch (cause) {
      setError(cause instanceof z.ZodError ? cause.issues[0]?.message ?? "Check your resource selections." : "Check your resource selections.");
    }
  }
  function finishContribution(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    setError("");
    setFieldErrors({});
    try {
      const input = contributionSchema.safeParse({ organizationName, email, resources: selectedContributionResources(quantities, customNames) });
      if (!input.success) {
        setFieldErrors(Object.fromEntries(input.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
        return;
      }
      saving.current = true;
      saveDemoContribution(input.data, window.localStorage);
      changeStep("success");
    } catch {
      setError("Your contribution could not be saved on this browser. Please try again; existing data has not been changed.");
    } finally {
      saving.current = false;
    }
  }
  function useDemoInformation() {
    setOrganizationName(DEMO_CONTRIBUTION_INFO.organizationName);
    setEmail(DEMO_CONTRIBUTION_INFO.email);
    setFieldErrors({});
  }
  function toggle(id: string) {
    setQuantities((previous) => {
      const next = { ...previous };
      if (id in next) delete next[id]; else next[id] = "1";
      return next;
    });
  }


  const successScreen = (
    <section className="mx-auto max-w-2xl py-10 text-center" aria-labelledby="contribution-success">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary"><Check className="h-9 w-9" aria-hidden="true" /></div>
      <h1 id="contribution-success" className="mt-5 font-display text-2xl font-bold">Your contribution has been recorded successfully!</h1>
      <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">Thank you for supporting education in Cameroon. Your proposed contribution is awaiting review.</p>
      <Button asChild size="lg" className="mt-6"><Link to="/"><Home aria-hidden="true" />Back to Home</Link></Button>
    </section>
  );

  const reviewScreen = (
    <section className="mx-auto max-w-2xl py-4" aria-labelledby="contribution-review">
      <Button variant="ghost" size="sm" onClick={() => changeStep("select")} className="mb-3"><ArrowLeft aria-hidden="true" />Back</Button>
      <h1 id="contribution-review" className="font-display text-2xl font-bold">Review Your Contribution</h1>
      <ul className="mt-5 divide-y divide-border rounded-md border border-border">
        {resources.filter((resource) => resource.id in quantities).map((resource) => (
          <li key={resource.id} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
            <span className="min-w-0 break-words font-medium">{resource.entry.custom ? customNames[resource.id]?.trim() : resource.name}</span>
            <span className="shrink-0 text-muted-foreground">{Number(quantities[resource.id]).toLocaleString("en-CA")} {resource.entry.unit}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 border-y border-border bg-secondary/40 px-4 py-4">
        <h2 className="flex items-center gap-2 text-sm font-medium"><Wallet className="h-4 w-4 text-primary" aria-hidden="true" />Estimated Total Value (CAD)</h2>
        <p className="mt-1 font-display text-3xl font-bold text-primary">{cad(estimate.total)} <span className="text-sm font-medium">CAD</span></p>
        <p className="mt-1 text-xs text-muted-foreground">Illustrative prices only · not a quote{estimate.unavailable > 0 ? " · Unpriced items excluded" : ""}</p>
      </div>
      <form className="mt-5 space-y-4" onSubmit={finishContribution} noValidate>
        <Button type="button" variant="outline" size="sm" onClick={useDemoInformation} className="h-8 px-3 text-xs">Use Demo Information</Button>
        <div className="space-y-2">

          <Label htmlFor="contribution-organization">Organization Name <span className="text-destructive">*</span></Label>
          <Input id="contribution-organization" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} required maxLength={120} autoComplete="organization" aria-invalid={Boolean(fieldErrors.organizationName)} aria-describedby={fieldErrors.organizationName ? "organization-error" : undefined} />
          {fieldErrors.organizationName && <p id="organization-error" role="alert" className="text-sm text-destructive">{fieldErrors.organizationName}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="contribution-email">Email Address <span className="text-destructive">*</span></Label>
          <Input id="contribution-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={255} autoComplete="email" aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "email-error" : undefined} />
          {fieldErrors.email && <p id="email-error" role="alert" className="text-sm text-destructive">{fieldErrors.email}</p>}
        </div>
        <p className="text-xs text-muted-foreground">Demo contribution only · saved in this browser. No payment, delivery or distribution is initiated.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" className="w-full"><Check aria-hidden="true" />Finish Contribution</Button>
      </form>
    </section>
  );

  return (
    <>
    {step === "success" && successScreen}
    {step === "review" && reviewScreen}
    <div hidden={step !== "select"} className="mx-auto max-w-2xl py-4">
      <h1 className="text-center font-display text-2xl font-bold">Become a Resource Partner</h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">Select what you would like to provide to schools in Cameroon.</p>

      <section className="mt-6" aria-labelledby="schools-need">
        <h2 id="schools-need" className="mb-3 flex items-center gap-2 font-display text-lg font-semibold"><HandHeart className="h-5 w-5 text-primary" aria-hidden="true" />Resources</h2>
        <div className={RESOURCE_CARD_GRID}>
          {RESOURCE_CATEGORY_GROUPS.map((group) => {
            const groupResources = group.entries.map((entry) => resources.find((r) => r.id === entry.id)).filter((r) => r !== undefined);
            return <ResourceCategoryCard key={group.id} group={group} selectedCount={groupResources.filter((r) => r.id in quantities).length}>
              {groupResources.map((resource) => {
                const selected = resource.id in quantities;
                return <ResourceRow key={resource.id} entry={resource.entry} id={resource.id} selected={selected} quantity={quantities[resource.id] ?? ""} customName={customNames[resource.id] ?? ""}
                  onToggle={() => toggle(resource.id)} onCustomNameChange={(value) => setCustomNames((previous) => ({ ...previous, [resource.id]: value }))}
                  onQuantityChange={(value) => setQuantities((previous) => ({ ...previous, [resource.id]: value }))}>
                  <p className="text-xs text-muted-foreground">{resource.unitPrice === undefined ? "Estimate unavailable" : `${cad(resource.unitPrice)} CAD / unit · estimate`}</p>
                </ResourceRow>;
              })}
            </ResourceCategoryCard>;
          })}
        </div>
      </section>

      <section className="mt-5 border-y border-border bg-secondary/40 px-4 py-4" aria-labelledby="estimated-value">
        <h2 id="estimated-value" className="flex items-center gap-2 text-sm font-medium"><Wallet className="h-4 w-4 text-primary" aria-hidden="true" />Estimated Value</h2>
        <p role="status" aria-live="polite" className="mt-1 font-display text-3xl font-bold text-primary">{cad(estimate.total)} <span className="text-sm font-medium">CAD</span></p>
        <p className="mt-1 text-xs text-muted-foreground">Illustrative prices only · not a quote{estimate.unavailable > 0 ? " · Unpriced items excluded" : ""}</p>
      </section>

      <section className="mt-5 space-y-3" aria-labelledby="preferred-location">
        <h2 id="preferred-location" className="flex items-center gap-2 text-sm font-medium"><MapPin className="h-4 w-4 text-primary" aria-hidden="true" />Preferred Location</h2>
        <RadioGroup aria-labelledby="preferred-location" value={preferredLocation} onValueChange={setPreferredLocation} className="flex flex-wrap gap-x-5 gap-y-2">
          <div className="flex items-center gap-2"><RadioGroupItem id="location-anywhere" value="anywhere" /><Label htmlFor="location-anywhere">Anywhere in Cameroon</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem id="location-region" value="region" /><Label htmlFor="location-region">Specific Region</Label></div>
        </RadioGroup>
        {preferredLocation === "region" && <Select value={preferredRegion} onValueChange={setPreferredRegion}>
          <SelectTrigger aria-label="Preferred region"><SelectValue placeholder="Select a region" /></SelectTrigger>
          <SelectContent position="popper" side="bottom" collisionPadding={12}>{REGIONS.map((region) => <SelectItem key={region} value={region}>{region}</SelectItem>)}</SelectContent>
        </Select>}
      </section>

      <section className="relative isolate z-0 mt-6" aria-labelledby="contribution-map">
        <h2 id="contribution-map" className="mb-3 flex items-center gap-2 font-display text-lg font-semibold"><MapPin className="h-5 w-5 text-primary" aria-hidden="true" />Where Your Contribution Goes</h2>
        <CommunityMap communities={communities} selected={selectedCommunity} onSelect={setSelectedCommunity} compact createPopup={createSponsorPopup} />
        <div className="mt-2 flex min-h-7 flex-wrap items-center gap-2 text-sm" role="status" aria-live="polite">
          {community && <><span className="font-medium">{community.name}</span><span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs"><span className="h-2 w-2 rounded-full" style={{ background: criticalityColor(community.level) }} aria-hidden="true" />{criticalityLevelLabel(community.level)}</span></>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">CamNexus automatically prioritizes schools with the greatest reported needs that match your selected resources. Proposed distributions are subject to review.</p>
        <p className="mt-1 text-xs text-muted-foreground">Criticality is based on school-reported needs and has not been independently verified.</p>
      </section>
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      <Button size="lg" onClick={continueContribution} className="mt-5 w-full">Continue<ArrowRight aria-hidden="true" /></Button>
    </div>
    </>
  );
}
