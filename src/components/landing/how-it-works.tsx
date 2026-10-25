import { Check, ListChecks, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";

import { LandingContainer, SectionIntro } from "@/components/landing/section-intro";

type Step = {
  icon: LucideIcon;
  title: string;
  body: string;
  details: string[];
};

const STEPS: Step[] = [
  {
    icon: ListChecks,
    title: "Set the rubric or answer key",
    body: "Name each criterion, give it a point value, and describe what full credit looks like. For a paper test, photograph the answer key and each question becomes a criterion.",
    details: ["Criteria with max points", "Answer keys read from a photo", "Pasted text, .txt files, or test photos"],
  },
  {
    icon: Sparkles,
    title: "AI drafts the first pass",
    body: "Each paper or photographed test is read against your rubric. For every criterion, the AI returns a draft you can check in seconds.",
    details: [
      "A suggested score",
      "A one to two sentence justification",
      "A quote from the paper as evidence",
      "Its own confidence: high, medium, or low",
    ],
  },
  {
    icon: ShieldCheck,
    title: "You approve, it publishes",
    body: "See the paper, or the test photo and its transcription, beside the suggestion. Edit any score or comment, send it back with a note, or approve it.",
    details: [
      "Edit anything before it counts",
      "Send back with a note",
      "Nothing reaches the gradebook without you",
    ],
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="scroll-mt-16 border-y border-border bg-card py-20 sm:py-28"
    >
      <LandingContainer>
        <SectionIntro
          id="how-it-works-heading"
          eyebrow="How it works"
          title="From a stack of papers to published grades in three steps."
          description="GradeSmart AI does the slow first read. You keep every decision."
        />
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex flex-col rounded-xl border border-border bg-background p-6">
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-lg bg-card text-foreground shadow-card ring-1 ring-border">
                  <step.icon className="size-5" aria-hidden />
                </span>
                <span className="tabular text-sm font-medium text-muted-foreground">
                  <span className="sr-only">Step </span>
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-6 text-base font-semibold tracking-tight text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-pretty text-muted-foreground">{step.body}</p>
              <ul className="mt-5 space-y-2 border-t border-border pt-5">
                {step.details.map((detail) => (
                  <li key={detail} className="flex items-start gap-2 text-sm text-foreground/90">
                    <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                    {detail}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </LandingContainer>
    </section>
  );
}
