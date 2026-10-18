import type { Community } from "./communities";
import { criticalityOf, criticalityLevelLabel } from "./criticality";
import { activeRequests, requestName } from "./resource-requests";
import { catalogEntry, requestTypeId, resourceCardName } from "./catalog";

/** Read-only sponsor details from the same current assessment projection as the maps. */
export function sponsorCommunityDetails(community: Community) {
  return {
    name: community.name,
    region: community.region,
    level: criticalityLevelLabel(community.level),
    schools: community.schools.map((school) => ({
      id: school.id,
      name: school.name,
      level: criticalityLevelLabel(criticalityOf(school).level),
      requests: activeRequests(school).filter((request) => request.submittedAt).map((request) => {
        const entry = catalogEntry(requestTypeId(request.category, request.resource));
        return {
          id: request.id,
          name: entry?.name === "Solar power system" ? resourceCardName(entry) : requestName(request),
          quantity: request.quantity,
        };
      }),
    })),
  };
}

/** Called by Leaflet in the browser only; textContent never interprets saved names as HTML. */
export function createSponsorPopup(community: Community): HTMLElement {
  const details = sponsorCommunityDetails(community);
  const root = document.createElement("div");
  root.className = "space-y-2 text-xs text-foreground";
  root.setAttribute("aria-label", `${details.name} active school requests`);
  const line = (parent: HTMLElement, text: string, className: string) => {
    const element = document.createElement("div");
    element.className = className;
    element.textContent = text;
    parent.append(element);
  };
  line(root, `${details.name} · ${details.region}`, "break-words pr-2 text-sm font-semibold");
  line(root, details.level, "text-muted-foreground");
  for (const school of details.schools) {
    const section = document.createElement("section");
    section.className = "space-y-1 border-t border-border pt-2";
    line(section, school.name, "break-words font-semibold");
    if (!school.requests.length) line(section, "No active resource requests", "text-muted-foreground");
    for (const request of school.requests) {
      line(section, `${request.name}${request.quantity === undefined ? "" : ` — ${request.quantity.toLocaleString("en-CA")}`}`, "break-words");
    }
    root.append(section);
  }
  return root;
}