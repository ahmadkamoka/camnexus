import { describe, expect, it } from "vitest";
import { SAMPLE_SCHOOLS } from "@/lib/impact";
import { requestTypeId, RESOURCE_SELECTION_OPTIONS } from "@/lib/catalog";
import { SCHOOL_RESOURCE_OPTIONS } from "@/lib/school-resource-cards";
import { estimatePartnerValue, ILLUSTRATIVE_CAD_PRICES, PARTNER_RESOURCE_OPTIONS, requestedPartnerResources } from "@/lib/partner-preferences";

const sample = SAMPLE_SCHOOLS[0];
const request = sample?.requests?.[0];
if (!sample || !request) throw new Error("Missing sample request");
const laptopId = requestTypeId("Digital equipment", "Laptops");
const textbookId = requestTypeId("Books and educational materials", "Textbooks");

describe("Resource Partner preferences", () => {
  it("shares all sixteen school resource IDs including canonical Other", () => {
    expect(PARTNER_RESOURCE_OPTIONS.map((r) => r.id)).toEqual(SCHOOL_RESOURCE_OPTIONS.map((r) => r.id));
    expect(SCHOOL_RESOURCE_OPTIONS).toBe(RESOURCE_SELECTION_OPTIONS);
    expect(PARTNER_RESOURCE_OPTIONS).toHaveLength(16);
    expect(PARTNER_RESOURCE_OPTIONS.find((r) => r.entry.custom)?.id).toBe("other:other");
    expect(new Set(PARTNER_RESOURCE_OPTIONS.map((r) => r.id)).size).toBe(16);
  });
  it("never invents prices for repairs, toilets or custom resources", () => {
    for (const id of ["classroom-construction-or-repairs:roof-repairs", "classroom-construction-or-repairs:classroom-renovation", "water-and-sanitation:toilets", "other:other"])
      expect(PARTNER_RESOURCE_OPTIONS.find((r) => r.id === id)?.unitPrice).toBeUndefined();
    expect(estimatePartnerValue(PARTNER_RESOURCE_OPTIONS, { "water-and-sanitation:toilets": "4", "classroom-construction-or-repairs:roof-repairs": "1" })).toEqual({ total: 0, unavailable: 2 });
    expect(estimatePartnerValue(PARTNER_RESOURCE_OPTIONS, { "water-and-sanitation:water-tanks": "2" })).toEqual({ total: 1800, unavailable: 0 });
  });
  it("prices laboratory kits and solar using existing catalogue IDs and the illustrative price list", () => {
    const kits = requestTypeId("STEM and laboratory equipment", "Science laboratory kits");
    const solar = requestTypeId("Electricity and energy infrastructure", "Solar power system");
    expect(PARTNER_RESOURCE_OPTIONS.find((r) => r.id === kits)?.unitPrice).toBe(100);
    expect(PARTNER_RESOURCE_OPTIONS.find((r) => r.id === solar)?.unitPrice).toBe(6500);
    expect(estimatePartnerValue(PARTNER_RESOURCE_OPTIONS, { [kits]: "3", [solar]: "2" })).toEqual({ total: 13300, unavailable: 0 });
    expect(estimatePartnerValue(PARTNER_RESOURCE_OPTIONS, { "other:other": "3" })).toEqual({ total: 0, unavailable: 1 });
  });
  it("shows only submitted current catalogue requests, never draft, rejected or inferred needs", () => {
    const schools = [{ ...sample, requests: [request, { ...request, id: "draft", resource: "Tablets", submittedAt: undefined }, { ...request, id: "rejected", resource: "Desktop computers", status: "rejected" as const }, { ...request, id: "bad-date", resource: "Projectors", submittedAt: "invalid" }, { ...request, id: "unknown", resource: "Solar panels" }] }];
    expect(requestedPartnerResources(schools).map((r) => r.name)).toEqual(["Laptops"]);
    expect(requestedPartnerResources([{ ...sample, requests: undefined }])).toEqual([]);
  });
  it("deduplicates requested resources across schools without changing any records", () => {
    const before = JSON.stringify(SAMPLE_SCHOOLS);
    const resources = requestedPartnerResources(SAMPLE_SCHOOLS);
    expect(resources.filter((r) => r.id === laptopId)).toHaveLength(1);
    expect(resources.some((r) => r.name === "Solar power system")).toBe(false);
    expect(JSON.stringify(SAMPLE_SCHOOLS)).toBe(before);
  });
  it("keeps actually requested custom names and never invents their prices", () => {
    const resources = requestedPartnerResources([{ ...sample, requests: [{ ...request, resource: "Other", customResource: "Braille readers" }] }]);
    expect(resources[0]?.name).toBe("Braille readers");
    expect(resources[0]?.unitPrice).toBeUndefined();
    expect(estimatePartnerValue(resources, { [resources[0]?.id ?? "missing"]: "3" })).toEqual({ total: 0, unavailable: 1 });
  });
  it("calculates immediately from one consistent illustrative CAD list and selected quantities", () => {
    const resources = requestedPartnerResources(SAMPLE_SCHOOLS);
    expect(ILLUSTRATIVE_CAD_PRICES[laptopId]).toBe(400);
    expect(ILLUSTRATIVE_CAD_PRICES[textbookId]).toBe(15);
    expect(estimatePartnerValue(resources, { [laptopId]: "2", [textbookId]: "10" }).total).toBe(950);
    expect(estimatePartnerValue(resources, { [laptopId]: "3", [textbookId]: "10" }).total).toBe(1350);
    expect(estimatePartnerValue(resources, { [textbookId]: "10" }).total).toBe(150);
  });
  it("excludes undefined prices instead of estimating custom resources", () => {
    const resources = requestedPartnerResources(SAMPLE_SCHOOLS);
    expect(estimatePartnerValue(resources, { [laptopId]: "2", "custom-other": "5" })).toEqual({ total: 800, unavailable: 1 });
  });
  it("does not calculate negative, fractional or invalid quantities", () => {
    const resources = requestedPartnerResources(SAMPLE_SCHOOLS);
    for (const quantity of ["", "-2", "1.5", "NaN", "Infinity", "9007199254740992"]) expect(estimatePartnerValue(resources, { [laptopId]: quantity }).total).toBe(0);
  });
});