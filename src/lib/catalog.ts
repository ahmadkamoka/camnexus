import { CATEGORIES, RESOURCE_CATALOG, unitsFor, type ResourceCategory } from "./resource-requests";

export type ResourceClass = "physical_goods" | "service" | "training" | "infrastructure";
export interface CatalogEntry {
  /** Stable resource type ID shared by school requests and organization offers. */
  id: string;
  category: ResourceCategory;
  name: string;
  unit: string;
  classification: ResourceClass;
  /** "Other" entries carry a free-text description and never auto-match each other. */
  custom: boolean;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const CLASSIFICATION: Record<ResourceCategory, ResourceClass> = {
  "Digital equipment": "physical_goods",
  "Books and educational materials": "physical_goods",
  "Classroom furniture": "physical_goods",
  "Classroom construction or repairs": "infrastructure",
  "Water and sanitation": "infrastructure",
  "Electricity and energy infrastructure": "infrastructure",
  "Internet and connectivity": "infrastructure",
  "Teacher training": "training",
  "STEM and laboratory equipment": "physical_goods",
  Other: "service",
};

/** One shared catalogue: school assessments and organization offers reference the same stable IDs. */
export const CATALOG: CatalogEntry[] = CATEGORIES.flatMap((category) =>
  (RESOURCE_CATALOG[category] as readonly string[]).map((name) => ({
    id: `${slug(category)}:${slug(name)}`,
    category,
    name,
    unit: unitsFor(category),
    classification: CLASSIFICATION[category],
    custom: name === "Other",
  })),
);

export const catalogEntry = (id: string) => CATALOG.find((e) => e.id === id);
export const catalogByCategory = (category: ResourceCategory) => CATALOG.filter((e) => e.category === category);
/** The catalog ID a school request refers to, so offers and requests can be matched by ID. */
export const requestTypeId = (category: ResourceCategory, resource: string) => `${slug(category)}:${slug(resource)}`;

/** Presentation aliases preserve canonical resource names and IDs in saved records. */
const RESOURCE_CARD_NAMES: Readonly<Record<string, string>> = {
  "Reading books": "Reading Books",
  "Student desks": "Student Desks",
  "Science laboratory kits": "Science Laboratory Kits",
  "Solar power system": "Solar Panels",
  "Roof repairs": "Roof Repairs",
  "Classroom renovation": "Classroom Repairs",
  "Water fountains": "Water Fountains",
  "Water tanks": "Water Tanks",
  Chairs: "Student Chairs",
  Whiteboards: "Classroom Boards",
  "Desktop computers": "Desktop Computers",
};
export const resourceCardName = (entry: CatalogEntry) => RESOURCE_CARD_NAMES[entry.name] ?? entry.name;

export interface ResourceCategoryGroup {
  id: string;
  label: string;
  entries: CatalogEntry[];
}

const entry = (category: ResourceCategory, name: string) => {
  const found = catalogEntry(requestTypeId(category, name));
  if (!found) throw new Error(`Missing selection catalogue entry: ${category}/${name}`);
  return found;
};

/** Ordered, shared category cards; both selection pages expand the same groups and resource IDs. */
export const RESOURCE_CATEGORY_GROUPS: ResourceCategoryGroup[] = [
  { id: "building-safety", label: "Building & Safety", entries: [entry("Classroom construction or repairs", "Roof repairs"), entry("Classroom construction or repairs", "Classroom renovation")] },
  { id: "water-sanitation", label: "Water & Sanitation", entries: [entry("Water and sanitation", "Toilets"), entry("Water and sanitation", "Water fountains"), entry("Water and sanitation", "Water tanks")] },
  { id: "electricity", label: "Electricity", entries: [entry("Electricity and energy infrastructure", "Solar power system")] },
  { id: "classroom-furniture", label: "Classroom Furniture", entries: [entry("Classroom furniture", "Student desks"), entry("Classroom furniture", "Chairs"), entry("Classroom furniture", "Whiteboards")] },
  { id: "learning-materials", label: "Learning Materials", entries: [entry("Books and educational materials", "Textbooks"), entry("Books and educational materials", "Reading books"), entry("Books and educational materials", "Stationery"), entry("STEM and laboratory equipment", "Science laboratory kits")] },
  { id: "technology", label: "Technology", entries: [entry("Digital equipment", "Laptops"), entry("Digital equipment", "Desktop computers")] },
  { id: "other", label: "Other", entries: [entry("Other", "Other")] },
];

/** Flat ordered selection view; legacy catalogue types remain available to saved records. */
export const RESOURCE_SELECTION_OPTIONS: CatalogEntry[] = RESOURCE_CATEGORY_GROUPS.flatMap((group) => group.entries);
