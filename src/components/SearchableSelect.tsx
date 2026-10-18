import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  id: string;
  /** Primary line shown in the result and in the field once chosen. */
  label: string;
  /** Secondary line shown under the label in results. */
  sublabel?: string;
  /** Extra text searched but not displayed (type, IDs, email…). */
  keywords?: string;
}

const field = "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring";

/** Case-insensitive partial match: every typed word must appear somewhere. */
export function matchesOption(option: SelectOption, query: string): boolean {
  const haystack = `${option.label} ${option.sublabel ?? ""} ${option.keywords ?? ""}`.toLowerCase();
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean).every((token) => haystack.includes(token));
}

/** An empty query lists every option; every typed word must match somewhere. */
export function filterOptions<T extends SelectOption>(options: T[], query: string): T[] {
  return query.trim() ? options.filter((o) => matchesOption(o, query)) : options;
}

let counter = 0;

export function SearchableSelect<T extends SelectOption>({
  options, value, onChange, label, placeholder, emptyText, listLabel,
}: {
  options: T[];
  value: string;
  onChange: (id: string) => void;
  label: ReactNode;
  placeholder: string;
  emptyText: string;
  listLabel: string;
}) {
  const [query, setQuery] = useState("");
  const [typing, setTyping] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const [uid] = useState(() => `searchable-select-${++counter}`);
  const selected = options.find((o) => o.id === value);
  const shown = typing ? query : selected?.label ?? "";
  const results = useMemo(() => filterOptions(options, typing ? query : ""), [options, query, typing]);

  useEffect(() => {
    setActive((i) => (results.length ? Math.min(i, results.length - 1) : 0));
  }, [results.length]);

  function choose(option: T) {
    setTyping(false);
    setQuery("");
    setActive(0);
    setOpen(false);
    onChange(option.id);
  }
  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return setOpen(true);
      setActive((i) => (results.length ? (i + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      if (open && results[active]) {
        e.preventDefault();
        choose(results[active]);
      }
    } else if (e.key === "Escape") setOpen(false);
  }

  return (
    <div ref={box} className="relative">
      <label className="block text-sm font-medium" htmlFor={uid}>{label}</label>
      <div className="relative">
        <input
          id={uid}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${uid}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${uid}-list-${results[active].id}` : undefined}
          autoComplete="off"
          className={`${field} pr-10`}
          placeholder={placeholder}
          value={shown}
          onChange={(e) => {
            setQuery(e.target.value);
            setTyping(true);
            setActive(0);
            setOpen(true);
            onChange("");
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          onBlur={(e) => {
            if (!box.current?.contains(e.relatedTarget as Node)) setOpen(false);
          }}
        />
        <ChevronDown
          aria-hidden="true"
          size={18}
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </div>
      {open && (
        <>
          {results.length > 0 && (
            <p aria-live="polite" className="sr-only">
              {results.length} {results.length === 1 ? "result" : "results"}
            </p>
          )}
          {results.length === 0 ? (
            <p role="status" className="absolute z-20 mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground shadow-md">
              {emptyText}
            </p>
          ) : (
            <ul
              id={`${uid}-list`}
              role="listbox"
              aria-label={listLabel}
              className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-background p-1 shadow-md"
            >
              {results.map((o, i) => (
                <li
                  key={o.id}
                  id={`${uid}-list-${o.id}`}
                  role="option"
                  aria-selected={o.id === value}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(o);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`cursor-pointer rounded-sm px-3 py-2 text-sm ${i === active ? "bg-accent text-accent-foreground" : ""}`}
                >
                  <span className="font-medium">{o.label}</span>
                  {o.sublabel && <span className="block text-xs text-muted-foreground">{o.sublabel}</span>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
