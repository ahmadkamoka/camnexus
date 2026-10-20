import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ClipboardList, Handshake, HeartHandshake, ListFilter } from "lucide-react";
import classroomImage from "@/assets/about-classroom.jpg";
import logoAsset from "@/assets/camnexus-logo.png.asset.json";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [
    { title: "About Us — CamNexus" },
    { name: "description", content: "Discover CamNexus's mission to make school-reported educational needs visible across Cameroon, and meet the story behind this hackathon prototype." },
    { property: "og:title", content: "About Us — CamNexus" },
    { property: "og:description", content: "Bridging needs and building futures: the mission, approach and team behind the CamNexus prototype." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: AboutUs,
});

const steps = [
  { icon: ClipboardList, title: "Schools Report Their Needs", description: "Schools submit educational resource requests and quantities." },
  { icon: ListFilter, title: "CamNexus Identifies Priorities", description: "Reported needs are categorized and displayed through community criticality mapping, helping PS43 understand where support may be needed most." },
  { icon: Handshake, title: "Resource Partners Contribute", description: "Potential partners propose resources that could help address the needs identified across Cameroon." },
];


function AboutUs() {
  return (
    <div className="space-y-6">
      <section aria-labelledby="about-heading" className="relative -mx-4 -mt-8 overflow-hidden bg-primary text-primary-foreground">
        <img src={classroomImage} alt="Illustrative classroom with wooden desks and a green chalkboard; not a participating school" width={1536} height={768} className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-about-overlay" aria-hidden />
        <div className="relative px-6 py-12 sm:px-10 md:py-16">
          <p className="text-xs font-semibold uppercase tracking-widest">About CamNexus</p>
          <h1 id="about-heading" className="mt-4 max-w-xl font-display text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">Bridging Needs.<br />Building Futures.</h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed">CamNexus connects schools in Cameroon with resource partners, helping educational needs become visible and directing attention toward communities that need support most.</p>
        </div>
      </section>

      <section aria-labelledby="challenge-heading" className="rounded-xl border bg-card p-6 sm:p-8">
        <h2 id="challenge-heading" className="font-display text-2xl font-semibold">The Challenge</h2>
        <div className="mt-4 max-w-3xl space-y-4 leading-relaxed text-muted-foreground">
          <p>PS43 Foundation works to expand educational opportunities for young people and underserved communities. As the foundation explores educational infrastructure initiatives across Cameroon, identifying which schools need support, understanding resource shortages, and coordinating potential partners present important challenges.</p>
          <p>CamNexus responds to PS43 Foundation's challenge by bringing school-reported needs, community criticality, and potential resource contributions into one accessible platform.</p>
        </div>
      </section>

      <section aria-labelledby="mission-heading" className="grid gap-5 md:grid-cols-[1fr_2fr] md:gap-12">
        <div>
          <HeartHandshake className="mb-3 h-7 w-7 text-primary" aria-hidden />
          <h2 id="mission-heading" className="font-display text-2xl font-semibold">Our Mission</h2>
        </div>
        <div>
          <p className="max-w-2xl border-l-2 border-primary/30 pl-5 text-lg leading-relaxed">Our mission is to help PS43 Foundation identify educational needs across Cameroon and connect those needs with potential resource partners. Through a transparent criticality system and interactive community mapping, CamNexus helps highlight where educational support may be needed most.</p>
          <p className="mt-4 max-w-2xl pl-5 text-sm italic leading-relaxed text-muted-foreground">CamNexus combines Cameroon and Nexus, meaning connection — reflecting our goal of linking educational needs with opportunities for support.</p>
        </div>
      </section>

      <section aria-labelledby="how-it-works" className="border-t pt-6">
        <h2 id="how-it-works" className="font-display text-2xl font-semibold">How CamNexus Works</h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-3 md:gap-6">
          {steps.map((step, index) => (
            <li key={step.title} className="relative rounded-lg border bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-secondary-foreground"><step.icon className="h-5 w-5" aria-hidden /></span>
                <span className="font-display text-sm font-semibold text-muted-foreground">0{index + 1}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              {index < steps.length - 1 && <ArrowRight aria-hidden className="absolute -right-5 top-10 z-10 hidden h-4 w-4 text-primary md:block" />}
            </li>
          ))}
        </ol>
      </section>

      <div className="border-t pt-6 text-center">
        <img src={logoAsset.url} alt="CamNexus" className="mx-auto h-8 w-auto max-w-[150px] object-contain" />
        <p className="mt-2 text-sm text-muted-foreground">Bridging Needs. Building Futures.</p>
      </div>
    </div>
  );
}