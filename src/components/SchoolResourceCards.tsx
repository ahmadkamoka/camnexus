import { schoolResourceCards, createSchoolCardRequest } from "@/lib/school-resource-cards";
import { requestName, type ResourceRequest } from "@/lib/resource-requests";
import type { School } from "@/lib/impact";
import { resourceCardName, RESOURCE_CATEGORY_GROUPS, RESOURCE_SELECTION_OPTIONS } from "@/lib/catalog";
import { ResourceCategoryCard, ResourceRow, ResourceSelectionCard, RESOURCE_CARD_GRID } from "@/components/ResourceSelectionCard";

export function SchoolResourceCards({ requests, school, onChange }: {
  requests: ResourceRequest[];
  school: Pick<School, "id" | "registrationId" | "community" | "region">;
  onChange: (requests: ResourceRequest[]) => void;
}) {
  const update = (id: string, changes: Partial<ResourceRequest>) =>
    onChange(requests.map((request) => request.id === id ? { ...request, ...changes } : request));
  const cards = schoolResourceCards(requests);
  const rowFor = (entry: (typeof RESOURCE_SELECTION_OPTIONS)[number]) => {
    const card = cards.find((c) => c.key === entry.id);
    const request = card?.request;
    return <ResourceRow key={entry.id} entry={entry} id={request?.id ?? entry.id} selected={!!request} required
      name={entry.custom && request ? requestName(request) : resourceCardName(entry)} quantity={String(request?.quantity ?? "")} customName={request?.customResource ?? ""}
      onToggle={() => onChange(request ? requests.filter((r) => r.id !== request.id) : [...requests, createSchoolCardRequest(entry, school)])}
      onQuantityChange={(value) => { if (request) update(request.id, { quantity: value === "" ? undefined : Number(value) }); }}
      onCustomNameChange={(value) => { if (request) update(request.id, { customResource: value }); }} />;
  };
  const legacy = cards.filter((card) => card.key !== card.entry.id || !RESOURCE_SELECTION_OPTIONS.includes(card.entry));
  const renderLegacy = ({ key, entry, request }: typeof cards[number]) => <ResourceSelectionCard key={key} entry={entry} id={request?.id ?? key} selected={!!request}
    name={entry.custom && key !== entry.id && request ? requestName(request) : resourceCardName(entry)} quantity={String(request?.quantity ?? "")} customName={request?.customResource ?? ""} required
    onToggle={() => onChange(request ? requests.filter((r) => r.id !== request.id) : [...requests, createSchoolCardRequest(entry, school)])}
    onQuantityChange={(value) => { if (request) update(request.id, { quantity: value === "" ? undefined : Number(value) }); }}
    onCustomNameChange={(value) => { if (request) update(request.id, { customResource: value }); }} />;
  return <section className="border-t pt-5" aria-labelledby="school-resource-needs">
    <h2 id="school-resource-needs" className="mb-3 font-display text-xl font-semibold">What does your school need?</h2>
    <div className={RESOURCE_CARD_GRID}>
      {RESOURCE_CATEGORY_GROUPS.map((group) => <ResourceCategoryCard key={group.id} group={group} selectedCount={group.entries.filter((entry) => cards.find((c) => c.key === entry.id)?.request).length}>
        {group.entries.map(rowFor)}
      </ResourceCategoryCard>)}
    </div>
    {legacy.length > 0 && <div className="mt-4"><h3 className="mb-3 text-sm font-medium">Previously saved resources</h3><div className={RESOURCE_CARD_GRID}>{legacy.map(renderLegacy)}</div></div>}
  </section>;
}
