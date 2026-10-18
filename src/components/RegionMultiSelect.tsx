import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, X } from "lucide-react";
import { REGIONS } from "@/lib/impact";
import { NATIONWIDE } from "@/lib/partners";

export const REGION_OPTIONS = [NATIONWIDE, ...REGIONS] as const;

/**
 * Compact searchable multi-select for Cameroon service areas.
 * Selecting Nationwide covers all ten regions; picking an individual region
 * afterwards drops Nationwide so the selection stays consistent.
 */
export function RegionMultiSelect({
  value, onChange, legend, idPrefix,
}: {
  value: string[];
  onChange: (regions: string[]) => void;
  legend: string;
  idPrefix: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const inputId = `${idPrefix}-region-search`;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return REGION_OPTIONS.filter((r) => !value.includes(r) && (!q || r.toLowerCase().includes(q)));
  }, [query, value]);

  function add(region: string) {
    onChange(region === NATIONWIDE ? [NATIONWIDE] : [...value.filter((r) => r !== NATIONWIDE), region]);
    setQuery("");
  }
  function remove(region: string) {
    onChange(value.filter((r) => r !== region));
  }
  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && open && results[0]) {
      e.preventDefault();
      add(results[0]);
    } else if (e.key === "Escape") setOpen(false);
  }

  return (
    <fieldset>
      <legend className="block text-sm font-medium">{legend}</legend>
      {value.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Selected service areas">
          {value.map((r) => (
            <li key={r} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
              {r}
              <button type="button" onClick={() => remove(r)} aria-label={`Remove ${r}`}
                className="rounded-full p-0.5 hover:bg-background/40">
                <X size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div ref={box} className="relative mt-2">
        <div className="relative">
          <input
            id={inputId}
            role="combobox"
            aria-expanded={open}
            aria-controls={`${inputId}-list`}
            aria-autocomplete="list"
            autoComplete="off"
            className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Search regions or choose Nationwide…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            onBlur={(e) => { if (!box.current?.contains(e.relatedTarget as Node)) setOpen(false); }}
          />
          <ChevronDown aria-hidden="true" size={16}
            className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
        </div>
        {open && (
          results.length === 0 ? (
            <p role="status" className="absolute z-20 mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground shadow-md">
              No matching regions.
            </p>
          ) : (
            <ul id={`${inputId}-list`} role="listbox" aria-label="Cameroon regions"
              className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-md border bg-background p-1 shadow-md">
              {results.map((r) => (
                <li key={r} role="option" aria-selected={false}
                  onMouseDown={(e) => { e.preventDefault(); add(r); }}
                  className="cursor-pointer rounded-sm px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">
                  {r}{r === NATIONWIDE && <span className="block text-xs text-muted-foreground">Covers all ten regions</span>}
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </fieldset>
  );
}
