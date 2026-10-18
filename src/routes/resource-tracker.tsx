import { createFileRoute } from "@tanstack/react-router";
import { SchoolResourcesPage } from "@/components/SchoolResourcesPage";

export const Route = createFileRoute("/resource-tracker")({
  head: () => ({ meta: [
    { title: "School Resource Tracker — CamNexus" },
    { name: "description", content: "Follow your school’s current resource requests and recorded review updates." },
    { property: "og:title", content: "School Resource Tracker — CamNexus" },
    { property: "og:description", content: "Track current school requests without implying allocation or delivery." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <SchoolResourcesPage view="tracker" />,
});