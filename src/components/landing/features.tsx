import {
  ChartColumn,
  FileSpreadsheet,
  KeyRound,
  Keyboard,
  ScanLine,
  ScrollText,
  type IconComponent,
} from "@/components/icons";

import { LandingContainer, SectionIntro } from "@/components/landing/section-intro";

type Tool = { icon: IconComponent; title: string; body: string };

const TOOLS: Tool[] = [
  {
    icon: ScanLine,
    title: "Paper Scanner",
    body: "Photograph a handwritten test. It is transcribed and scored against your answer key, and the draft waits in To review with the photo beside it.",
  },
  {
    icon: KeyRound,
    title: "Answer keys from a photo",
    body: "Snap the key you already wrote. Each question becomes a line on the rubric, with its points.",
  },
  {
    icon: Keyboard,
    title: "Review from the keyboard",
    body: "J and K move between papers, A approves, S sends back. Press ? for the full list. Shortcuts never fire while you type.",
  },
  {
    icon: FileSpreadsheet,
    title: "Gradebook with CSV export",
    body: "Only approved grades show up. Missing work is marked. Export a class to CSV in one click.",
  },
  {
    icon: ChartColumn,
    title: "Class insights",
    body: "See each class by rubric criterion, and the questions most students missed, so you know what to reteach.",
  },
  {
    icon: ScrollText,
    title: "Conference briefs",
    body: "A one-page summary of a student's approved grades for a family meeting. It is a draft for you to read and edit first.",
  },
];

/** The teacher tools beyond the three steps, and which engines do the reading. */
export function Features() {
  return (
    <section id="tools" aria-labelledby="tools-heading" className="border-t border-border bg-card py-16 sm:py-24">
      <LandingContainer>
        <SectionIntro
          id="tools-heading"
          title="The rest of the grading week"
          description="Everything around the first pass, built for the same job: getting papers graded well and back to students."
        />
        <ul className="mt-12 grid gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <li key={tool.title} className="flex gap-4 border-t border-border py-6">
              <tool.icon className="mt-0.5 size-6 text-primary" aria-hidden />
              <div className="min-w-0">
                <h3 className="text-base font-medium text-foreground">{tool.title}</h3>
                <p className="mt-1.5 max-w-[60ch] text-[0.9375rem] leading-6 text-pretty text-muted-foreground">
                  {tool.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-[75ch] rounded-xl bg-secondary px-5 py-4 text-[0.9375rem] leading-6 text-pretty text-secondary-foreground">
          <span className="font-medium">Which AI does the reading?</span> Uses Claude for essays, handwriting, briefs and
          goals when an Anthropic API key is set (GPT-4o reads photos instead if an OpenAI key is set); without keys,
          labelled demo engines run locally.
        </p>
      </LandingContainer>
    </section>
  );
}
