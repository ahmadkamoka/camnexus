import { useState, type ReactNode } from "react";
import { Armchair, BookOpen, BookText, Check, ChevronDown, Droplets, FlaskConical, HardHat, Laptop, Package, Sun, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resourceCardName, type CatalogEntry, type ResourceCategoryGroup } from "@/lib/catalog";

export const RESOURCE_CARD_GRID = "grid grid-cols-2 items-start gap-3";
const input = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring";

export function ResourceSelectionCard({ entry, id, selected, quantity, customName, name = resourceCardName(entry), onToggle, onQuantityChange, onCustomNameChange, required = false, children }: {
  entry: CatalogEntry;
  id: string;
  selected: boolean;
  quantity: string;
  customName?: string;
  name?: string;
  onToggle: () => void;
  onQuantityChange: (value: string) => void;
  onCustomNameChange?: (value: string) => void;
  required?: boolean;
  children?: ReactNode;
}) {
  const Icon = entry.name === "Laptops" ? Laptop : entry.name === "Textbooks" ? BookText : entry.name === "Reading books" ? BookOpen : entry.category === "Classroom furniture" ? Armchair : entry.category === "STEM and laboratory equipment" ? FlaskConical : entry.category === "Electricity and energy infrastructure" ? Sun : Package;
  return <div id={selected ? `request-${id}` : undefined} data-resource-type={entry.id} className={`min-w-0 rounded-lg border shadow-sm transition-colors ${selected ? "border-primary bg-secondary/60" : "border-border bg-card"}`}>
    <Button type="button" variant="ghost" aria-pressed={selected} aria-label={name} onClick={onToggle} className={`h-auto min-h-28 w-full flex-col items-start gap-3 whitespace-normal p-3 text-left sm:p-4 ${selected ? "hover:bg-secondary/60" : ""}`}>
      <span className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-primary"><Icon className="h-5 w-5 shrink-0" aria-hidden="true" />{selected && <Check className="h-5 w-5 shrink-0" aria-hidden="true" />}</span>
      <span className="w-full min-w-0 break-words font-semibold">{name}</span>
    </Button>
    {selected && <div className="space-y-2 border-t border-border px-3 pb-3 pt-2">
      {entry.custom && onCustomNameChange && <div><label htmlFor={`custom-${id}`} className="text-xs font-medium">Resource name</label><input id={`custom-${id}`} aria-label={`Resource name for ${name}`} maxLength={120} className={input} value={customName ?? ""} onChange={(e) => onCustomNameChange(e.target.value)} /></div>}
      <div><label htmlFor={`quantity-${id}`} className="text-xs font-medium">Quantity</label><input id={`quantity-${id}`} aria-label={`Quantity for ${name}`} type="number" inputMode="numeric" min={1} max={1000000} step={1} required={required} className={input} value={quantity} onChange={(e) => onQuantityChange(e.target.value)} /></div>
      {children}
    </div>}
  </div>;
}

export const CATEGORY_GROUP_ICONS: Record<string, typeof HardHat> = {
  "building-safety": HardHat,
  "water-sanitation": Droplets,
  electricity: Zap,
  "classroom-furniture": Armchair,
  "learning-materials": BookOpen,
  technology: Laptop,
  other: Package,
};

/** One selectable resource row inside an expanded category card, with its quantity input directly below. */
export function ResourceRow({ entry, id, selected, quantity, customName, name = resourceCardName(entry), onToggle, onQuantityChange, onCustomNameChange, required = false, children }: {
  entry: CatalogEntry;
  id: string;
  selected: boolean;
  quantity: string;
  customName?: string;
  name?: string;
  onToggle: () => void;
  onQuantityChange: (value: string) => void;
  onCustomNameChange?: (value: string) => void;
  required?: boolean;
  children?: ReactNode;
}) {
  return <div data-resource-type={entry.id} className={`rounded-lg border transition-colors ${selected ? "border-primary bg-secondary/60" : "border-border bg-card"}`}>
    <Button type="button" variant="ghost" aria-pressed={selected} aria-label={name} onClick={onToggle} className="h-auto w-full justify-start gap-2 whitespace-normal px-3 py-2 text-left">
      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>{selected && <Check className="h-3 w-3" aria-hidden="true" />}</span>
      <span className="min-w-0 break-words text-sm font-medium">{name}</span>
    </Button>
    {selected && <div className="space-y-2 px-3 pb-3 pt-1">
      {entry.custom && onCustomNameChange && <div><label htmlFor={`custom-${id}`} className="text-xs font-medium">Resource name</label><input id={`custom-${id}`} aria-label={`Resource name for ${name}`} maxLength={120} className={input} value={customName ?? ""} onChange={(e) => onCustomNameChange(e.target.value)} /></div>}
      <div><label htmlFor={`quantity-${id}`} className="text-xs font-medium">Quantity</label><input id={`quantity-${id}`} aria-label={`Quantity for ${name}`} type="number" inputMode="numeric" min={1} max={1000000} step={1} required={required} className={input} value={quantity} onChange={(e) => onQuantityChange(e.target.value)} /></div>
      {children}
    </div>}
  </div>;
}

/** Expandable category card shared by the school and partner pages; expands to reveal its resources. */
export function ResourceCategoryCard({ group, selectedCount, children }: {
  group: ResourceCategoryGroup;
  selectedCount: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(selectedCount > 0);
  const Icon = CATEGORY_GROUP_ICONS[group.id] ?? Package;
  const selected = selectedCount > 0;
  return <div data-category-group={group.id} className={`min-w-0 rounded-lg border shadow-sm transition-colors ${selected ? "border-primary bg-secondary/60" : "border-border bg-card"}`}>
    <Button type="button" variant="ghost" aria-expanded={open} aria-label={group.label} onClick={() => setOpen((value) => !value)} className={`h-auto min-h-28 w-full flex-col items-start gap-3 whitespace-normal p-3 text-left sm:p-4 ${selected ? "hover:bg-secondary/60" : ""}`}>
      <span className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-primary">
        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="flex items-center gap-1">
          {selected && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">{selectedCount}</span>}
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </span>
      </span>
      <span className="w-full min-w-0 break-words font-semibold">{group.label}</span>
    </Button>
    {open && <div className="space-y-2 border-t border-border p-3">{children}</div>}
  </div>;
}
