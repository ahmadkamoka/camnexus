import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";

export interface SchoolOption {
  id: string;
  name: string;
  community: string;
  region: string;
  registrationId: string;
}

const field = "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring";
const LIST = "school-picker-list";

/** Case-insensitive partial match across school name, community, region and registration ID. */
export function matchesSchool(school: SchoolOption, query: string): boolean {
  const haystack = `${school.name} ${school.community} ${school.region} ${school.registrationId}`.toLowerCase();
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean).every((token) => haystack.includes(token));
}

/** An empty query lists every registered school; every typed word must match somewhere. */
export function filterSchools<T extends SchoolOption>(schools: T[], query: string): T[] {
  return query.trim() ? schools.filter((s) => matchesSchool(s, query)) : schools;
}

export function SchoolPicker({ schools, value, onChange }: { schools: SchoolOption[]; value: string; onChange: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [typing, setTyping] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const selected = schools.find((s) => s.id === value);
  // A chosen school shows its name; typing reopens the search and clears the choice until one is picked again.
  const shown = typing ? query : selected?.name ?? "";
  const results = useMemo(() => filterSchools(schools, typing ? query : ""), [schools, query, typing]);

  useEffect(() => {
    setActive((i) => (results.length ? Math.min(i, results.length - 1) : 0));
  }, [results.length]);

  function choose(school: SchoolOption) {
    setTyping(false);
    setQuery("");
    setActive(0);
    setOpen(false);
    onChange(school.id);
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
      <label className="block text-sm font-medium" htmlFor="school-search">
        Registered school
      </label>
      <div className="relative">
        <input
          id="school-search"
          role="combobox"
          aria-expanded={open}
          aria-controls={LIST}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${LIST}-${results[active].id}` : undefined}
          autoComplete="off"
          className={`${field} pr-10`}
          placeholder="Type a school name, community, region or registration ID"
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
              {results.length} registered {results.length === 1 ? "school" : "schools"} match
            </p>
          )}
          {results.length === 0 ? (
            <p
              role="status"
              className="absolute z-20 mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground shadow-md"
            >
              No registered schools found.
            </p>
          ) : (
            <ul
              id={LIST}
              role="listbox"
              aria-label="Registered schools"
              className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-background p-1 shadow-md"
            >
              {results.map((s, i) => (
                <li
                  key={s.id}
                  id={`${LIST}-${s.id}`}
                  role="option"
                  aria-selected={s.id === value}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(s);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`cursor-pointer rounded-sm px-3 py-2 text-sm ${i === active ? "bg-accent text-accent-foreground" : ""}`}
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {s.community} · {s.region}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
