import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { markerRadius, type Community } from "@/lib/communities";
import { CRITICALITY_LEVELS, criticalityColor, criticalityLevelLabel } from "@/lib/criticality";

interface Props {
  communities: Community[];
  selected: string | null;
  onSelect: (key: string) => void;
  compact?: boolean;
  createPopup?: (community: Community) => HTMLElement;
}

/** Leaflet map — Leaflet is imported dynamically so it never runs during SSR. */
export function CommunityMap({ communities, selected, onSelect, compact = false, createPopup }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<import("leaflet").Map | null>(null);
  const layer = useRef<import("leaflet").LayerGroup | null>(null);
  const L = useRef<typeof import("leaflet") | null>(null);
  const onSel = useRef(onSelect);
  onSel.current = onSelect;
  const drawCurrent = useRef(draw);
  drawCurrent.current = draw;

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      const Lf = (mod as unknown as { default?: typeof import("leaflet") }).default ?? mod;
      if (cancelled || !el.current || map.current) return;
      L.current = Lf;
      map.current = Lf.map(el.current, { scrollWheelZoom: false, zoomSnap: 0.25 }).fitBounds([[2.0, 8.8], [12.6, 16.0]]);
      map.current.setMaxBounds([[0.5, 6.5], [14.5, 18.5]]);
      Lf.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 12, minZoom: 5,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map.current);
      layer.current = Lf.layerGroup().addTo(map.current);
      const fit = () => { map.current?.invalidateSize(); map.current?.fitBounds([[2.0, 8.8], [12.6, 16.0]]); };
      requestAnimationFrame(fit); setTimeout(fit, 300);
      drawCurrent.current();
    });
    return () => { cancelled = true; map.current?.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw() {
    const Lf = L.current, lg = layer.current;
    if (!Lf || !lg) return;
    lg.clearLayers();
    const css = getComputedStyle(document.documentElement);
    const resolve = (v: string) => css.getPropertyValue(v.slice(4, -1)).trim() || "gray";
    for (const c of communities) {
      if (!c.coords) continue;
      const isSel = c.key === selected;
      const m = Lf.circleMarker(c.coords, {
        radius: markerRadius(c.students), color: isSel ? resolve("var(--foreground)") : "white",
        weight: isSel ? 4 : 2, fillColor: resolve(criticalityColor(c.level)), fillOpacity: 0.85,
      });
      m.bindTooltip(`${c.name} · ${criticalityLevelLabel(c.level)} · ${c.assessed} of ${c.schools.length} school(s) assessed`, { direction: "top" });
      const openSponsorPopup = () => {
        if (!createPopup || !map.current || !c.coords) return;
        Lf.popup({ className: "sponsor-community-popup", minWidth: 220, maxWidth: 280, maxHeight: 210 })
          .setLatLng(c.coords).setContent(createPopup(c)).openOn(map.current);
      };
      m.on("click", () => { onSel.current(c.key); if (isSel) openSponsorPopup(); });
      m.addTo(lg);
      if (createPopup) {
        const marker = m.getElement();
        marker?.setAttribute("role", "button");
        marker?.setAttribute("tabindex", "0");
        marker?.setAttribute("aria-label", `View ${c.name} active requests`);
        marker?.addEventListener("keydown", (event) => {
          if (!(event instanceof KeyboardEvent)) return;
          if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSel.current(c.key); if (isSel) openSponsorPopup(); }
        });
      }
      if (isSel) { m.bringToFront(); map.current?.panTo(c.coords, { animate: true }); }
      if (isSel && createPopup) openSponsorPopup();
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(draw, [communities, selected, createPopup]);

  return (
    <div className={createPopup ? "relative [&:has(.sponsor-community-popup)>.community-map-legend]:hidden [&_.sponsor-community-popup_.leaflet-popup-content-wrapper]:rounded-lg [&_.sponsor-community-popup_.leaflet-popup-content-wrapper]:bg-card [&_.sponsor-community-popup_.leaflet-popup-content-wrapper]:text-card-foreground [&_.sponsor-community-popup_.leaflet-popup-tip]:bg-card" : "relative"}>
      <div ref={el} className={compact ? "h-[320px] w-full overflow-hidden rounded-lg border" : "h-[370px] w-full overflow-hidden rounded-xl border md:h-[500px]"} role="region" aria-label="Map of assessed communities in Cameroon" />
      <div className="community-map-legend pointer-events-none absolute bottom-3 left-3 z-[400] rounded-lg border bg-card/95 p-2 text-xs shadow">
        <p className="mb-1 font-semibold">{createPopup ? "Highest criticality" : "Highest preliminary criticality"}</p>
        <ul className="space-y-0.5">
          {CRITICALITY_LEVELS.map((l) => (
            <li key={l.key} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border" style={{ background: criticalityColor(l.key) }} />
              {l.label} {l.range !== "—" && <span className="text-muted-foreground">({l.range})</span>}
            </li>
          ))}
        </ul>
        <p className="mt-1 text-muted-foreground">Size = students represented</p>
      </div>
    </div>
  );
}
