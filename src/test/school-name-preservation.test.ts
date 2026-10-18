import { describe, expect, it } from "vitest";
import { normalizeSchool, SAMPLE_SCHOOLS, scoreSchool, simulate } from "@/lib/impact";
import { buildCommunities } from "@/lib/communities";
import { buildRecommendations, compareAllocations } from "@/lib/matching";
import { SAMPLE_ORGANIZATIONS } from "@/lib/partners";

describe("demo school display-name migration preserves records", () => {
  it.each(SAMPLE_SCHOOLS)("preserves assessment identity and data for $id", (sample) => {
    const legacy = {
      ...sample, name: "Previously saved school name", verification: "verified" as const,
      students: sample.students + 17,
      history: [{ at: "2026-10-01T09:00:00.000Z", kind: "submission" as const, status: "verified" as const,
        snapshot: { ...sample, name: "Historical school name" } }],
    };
    const renamed = normalizeSchool(legacy);
    const { name: _old, ...before } = legacy;
    const { name: _new, ...after } = renamed;
    expect(after).toEqual(before);
    expect(renamed.history).toBe(legacy.history);
    expect(scoreSchool(renamed)).toEqual(scoreSchool(legacy));
    expect(simulate(renamed, 10000)).toEqual(simulate(legacy, 10000));
    const beforeCommunity = buildCommunities([legacy])[0];
    const afterCommunity = buildCommunities([renamed])[0];
    expect(afterCommunity?.name).toBe(legacy.community);
    expect(afterCommunity?.coords).toEqual(beforeCommunity?.coords);
    expect(afterCommunity?.points).toEqual(beforeCommunity?.points);
  });

  it("preserves recommendation relationships and allocation quantities", () => {
    const legacy = SAMPLE_SCHOOLS.map((s) => ({ ...s, name: "Legacy display name" }));
    const renamed = legacy.map(normalizeSchool);
    const matchesBefore = buildRecommendations(legacy, SAMPLE_ORGANIZATIONS);
    const matchesAfter = buildRecommendations(renamed, SAMPLE_ORGANIZATIONS);
    // Replace only the school display object to compare every recommendation decision.
    expect(matchesAfter.map((m) => ({ ...m, school: { ...m.school, name: "Legacy display name" } }))).toEqual(matchesBefore);
    expect(compareAllocations(renamed, SAMPLE_ORGANIZATIONS, "LAPTOP")).toEqual(compareAllocations(legacy, SAMPLE_ORGANIZATIONS, "LAPTOP"));
    expect(new Set(renamed.map((s) => s.id)).size).toBe(5);
    expect(renamed.map((s) => s.registrationId)).toEqual(legacy.map((s) => s.registrationId));
  });
});