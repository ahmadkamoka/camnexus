import { CATALOG, RESOURCE_SELECTION_OPTIONS, resourceCardName, requestTypeId, type CatalogEntry } from "./catalog";
import type { School } from "./impact";

/** Illustrative CAD prices, not supplier quotes; kept separate from allocation logic. */
export const ILLUSTRATIVE_CAD_PRICES: Readonly<Record<string, number>> = {
  [requestTypeId("Digital equipment", "Laptops")]: 400,
  [requestTypeId("Digital equipment", "Desktop computers")]: 350,
  [requestTypeId("Digital equipment", "Tablets")]: 200,
  [requestTypeId("Books and educational materials", "Textbooks")]: 15,
  [requestTypeId("Books and educational materials", "Reading books")]: 8,
  [requestTypeId("Classroom furniture", "Student desks")]: 80,
  [requestTypeId("Classroom furniture", "Chairs")]: 35,
  [requestTypeId("Classroom furniture", "Whiteboards")]: 150,
  [requestTypeId("Books and educational materials", "Stationery")]: 5,
  [requestTypeId("Water and sanitation", "Water fountains")]: 1200,
  [requestTypeId("Water and sanitation", "Water tanks")]: 900,
  [requestTypeId("Electricity and energy infrastructure", "Solar power system")]: 6500,
  [requestTypeId("STEM and laboratory equipment", "Science laboratory kits")]: 100,
  [requestTypeId("Teacher training", "Digital literacy training")]: 150,
};

export interface RequestedResource {
  id: string;
  entry: CatalogEntry;
  name: string;
  unitPrice?: number | undefined;
}

/** Preferences share school selection IDs, without asserting any school has requested them. */
export const PARTNER_RESOURCE_OPTIONS: RequestedResource[] = RESOURCE_SELECTION_OPTIONS.map((entry) => ({
  id: entry.id, entry, name: resourceCardName(entry), unitPrice: entry.custom ? undefined : ILLUSTRATIVE_CAD_PRICES[entry.id],
}));

/** Read-only projection of timestamped current requests, never inferred legacy needs. */
export function requestedPartnerResources(schools: School[]): RequestedResource[] {
  const resources = new Map<string, RequestedResource>();
  for (const school of schools) {
    for (const request of school.requests ?? []) {
      if (!request.submittedAt || !Number.isFinite(Date.parse(request.submittedAt)) || request.status === "rejected") continue;
      const typeId = requestTypeId(request.category, request.resource);
      const entry = CATALOG.find((item) => item.id === typeId);
      if (!entry) continue;
      const customName = request.customResource?.trim();
      if (entry.custom && !customName) continue;
      const name = entry.custom ? customName ?? entry.name : entry.name;
      const id = entry.custom ? `${entry.id}:${name.toLowerCase()}` : entry.id;
      resources.set(id, { id, entry, name, unitPrice: entry.custom ? undefined : ILLUSTRATIVE_CAD_PRICES[entry.id] });
    }
  }
  return [...resources.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function estimatePartnerValue(resources: RequestedResource[], quantities: Record<string, string>) {
  let total = 0;
  let unavailable = 0;
  for (const [id, raw] of Object.entries(quantities)) {
    const price = resources.find((r) => r.id === id)?.unitPrice;
    if (price === undefined) { unavailable++; continue; }
    const quantity = Number(raw);
    if (Number.isSafeInteger(quantity) && quantity > 0 && Number.isFinite(quantity * price + total)) total += quantity * price;
  }
  return { total, unavailable };
}