import type { School } from "./impact";
import { currentAssessment } from "./assessment-versions";
import { schoolInformationInfrastructure } from "./resource-requests";

/** Removed power inputs are retained as legacy data, never interpreted as new answers. */
export function schoolFormInfrastructure(previous: School | undefined, draft: Parameters<typeof schoolInformationInfrastructure>[1]) {
  return {
    ...schoolInformationInfrastructure(previous, draft),
    electricity: previous?.electricity ?? draft.electricity,
    reliableElectricity: previous ? previous.reliableElectricity : draft.reliableElectricity ? draft.reliableElectricity === "yes" : undefined,
    solarPowerRequested: previous ? previous.solarPowerRequested : draft.solarPower ? draft.solarPower === "yes" : undefined,
  };
}

/** Read-only earlier submission snapshots; reviews and the current version are not submissions. */
export function previousSchoolSubmissions(school: School | undefined, signedInSchoolId: string) {
  if (!school || school.id !== signedInSchoolId) return [];
  const current = currentAssessment(school);
  const submissions = (school.history ?? []).filter((event) => event.kind === "submission" && event.snapshot?.id === school.id && Number.isFinite(Date.parse(event.at)));
  const currentAt = current.assessmentSubmittedAt
    ?? current.requests?.map((request) => request.submittedAt).filter((at): at is string => !!at).sort((a, b) => Date.parse(b) - Date.parse(a))[0]
    ?? [...submissions].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0]?.at;
  if (!currentAt) return [];
  const seen = new Set<string>();
  return [...submissions].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).filter((event) => {
    if (Date.parse(event.at) >= Date.parse(currentAt) || seen.has(event.at)) return false;
    seen.add(event.at);
    return true;
  });
}