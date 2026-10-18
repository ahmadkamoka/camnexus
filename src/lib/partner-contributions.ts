import { z } from "zod";
import { PARTNER_RESOURCE_OPTIONS, estimatePartnerValue } from "./partner-preferences";

/** Separate demo journal: never feeds organization offers, matching or school data. */
export const CONTRIBUTIONS_KEY = "camnexus-contributions-v1";

/** Demo autofill values for the review screen; fields stay editable and nothing is sent anywhere. */
export const DEMO_CONTRIBUTION_INFO = { organizationName: "CamNexus Demo Partner", email: "demo@camnexus.example" } as const;


const resourceSchema = z.object({
  resourceTypeId: z.string().refine((id) => PARTNER_RESOURCE_OPTIONS.some((resource) => resource.id === id), "Choose a resource from the catalogue."),
  quantity: z.number().int("Enter a positive whole-number quantity.").positive("Enter a positive whole-number quantity.").max(Number.MAX_SAFE_INTEGER),
  customName: z.string().trim().max(120, "Custom resource names must be 120 characters or fewer.").optional(),
}).superRefine((resource, context) => {
  if (PARTNER_RESOURCE_OPTIONS.find((item) => item.id === resource.resourceTypeId)?.entry.custom && !resource.customName) {
    context.addIssue({ code: "custom", path: ["customName"], message: "Enter a name for your Other resource." });
  }
});

export const contributionResourcesSchema = z.array(resourceSchema).min(1, "Select at least one resource with a positive quantity.")
  .max(PARTNER_RESOURCE_OPTIONS.length).refine((resources) => new Set(resources.map((resource) => resource.resourceTypeId)).size === resources.length, "Select each resource only once.");

export const contributionSchema = z.object({
  organizationName: z.string().trim().min(1, "Organization Name is required.").max(120, "Organization Name must be 120 characters or fewer."),
  email: z.string().trim().min(1, "Email Address is required.").email("Enter a valid Email Address.").max(255, "Email Address must be 255 characters or fewer."),
  resources: contributionResourcesSchema,
});

export function selectedContributionResources(quantities: Record<string, string>, customNames: Record<string, string>) {
  return contributionResourcesSchema.parse(Object.entries(quantities).map(([resourceTypeId, quantity]) => ({
    resourceTypeId, quantity: quantity.trim() ? Number(quantity) : NaN, customName: customNames[resourceTypeId],
  })));
}

export function saveDemoContribution(input: unknown, storage: Pick<Storage, "getItem" | "setItem">) {
  // Validate again at the persistence boundary; no server or external service is involved.
  const parsed = contributionSchema.parse(input);
  const quantities = Object.fromEntries(parsed.resources.map((resource) => [resource.resourceTypeId, String(resource.quantity)]));
  const estimate = estimatePartnerValue(PARTNER_RESOURCE_OPTIONS, quantities);
  const record = { ...parsed, id: crypto.randomUUID(), submittedAt: new Date().toISOString(),
    status: "pending_review" as const, demo: true as const, estimatedTotalCAD: estimate.total, unpricedItems: estimate.unavailable };
  const raw = storage.getItem(CONTRIBUTIONS_KEY);
  const previous: unknown = raw === null ? [] : JSON.parse(raw);
  if (!Array.isArray(previous)) throw new Error("Saved contributions could not be read. Existing data has not been changed.");
  storage.setItem(CONTRIBUTIONS_KEY, JSON.stringify([...previous, record]));
  return record;
}