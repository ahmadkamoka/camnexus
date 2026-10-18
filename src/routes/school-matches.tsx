import { createFileRoute } from "@tanstack/react-router";
import { SchoolResourcesPage } from "@/components/SchoolResourcesPage";

export const Route = createFileRoute("/school-matches")({
  head: () => ({ meta: [
    { title: "School Resource Matches — CamNexus" },
    { name: "description", content: "Review potential resource matches for your school’s current submitted needs." },
    { property: "og:title", content: "School Resource Matches — CamNexus" },
    { property: "og:description", content: "School-specific potential resource matches, subject to review." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <SchoolResourcesPage view="matches" />,
});