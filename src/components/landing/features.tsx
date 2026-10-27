import {
  ChartColumn,
  FileSpreadsheet,
  KeyRound,
  Keyboard,
  ScanLine,
  ScrollText,
  type IconComponent,
} from "@/components/icons";

import { Blob, XGrid } from "@/components/decor/decor";
import { BAND_BG, Period, type BandTone } from "@/components/landing/bold-section";
import { LandingContainer, SectionIntro } from "@/components/landing/section-intro";
import { cn } from "@/lib/utils";

type Tool = { icon: IconComponent; title: string; body: string; tone: BandTone };

const TOOLS: Tool[] = [
  {
    icon: ScanLine,
    title: "Paper Scanner",
    tone: "coral",
    body: "Photograph a handwritten test. It is transcribed and scored against your answer key, and the draft waits in To review with the photo beside it.",
  },
  {
    icon: KeyRound,
    title: "Answer keys from a photo",
    tone: "mint",
    body: "Snap the key you already wrote. Each question becomes a line on the rubric, with its points.",
  },
  {
    icon: Keyboard,
    title: "Review from the keyboard",
    tone: "yellow",
    body: "J and K move between papers, A approves, S sends back. Press ? for the full list. Shortcuts never fire while you type.",
  },
  {
    icon: FileSpreadsheet,
    title: "Gradebook with CSV export",
    tone: "lilac",
    body: "Only approved grades show up. Missing work is marked. Export a class to CSV in one click.",
  },
  {
    icon: ChartColumn,
    title: "Class insights",
    tone: "pink",
    body: "See each class by rubric criterion, and the questions most students missed, so you know what to reteach.",
  },
  {
    icon: ScrollText,
    title: "Conference briefs",
    tone: "coral",
    body: "A one-page summary of a student's approved grades for a family meeting. It is a draft for you to read and edit first.",
  },
];

/**
 * The teacher tools beyond the three steps, and which engines do the reading.
 * The first half of the sky band; the scope note below finishes it.
 */
export function Features() {
  return (
    <section
      id="tools"
      aria-labelledby="tools-heading"
      className="relative isolate overflow-hidden bg-band-sky pt-20 pb-6 text-band-foreground sm:pt-28 sm:pb-10"
    >
      {/* Kept above the heading on phones and tablets, beside it from lg. */}
      <Blob
        shape={2}
        tone="coral"
        className="-top-24 -right-20 w-40 sm:-top-28 sm:-right-16 sm:w-56 lg:-top-40 lg:-right-28 lg:w-[26rem]"
      />
      <XGrid cols={6} rows={4} className="top-20 right-[7%] hidden w-44 stroke-pop-ink-on xl:block" />
      <LandingContainer>
        <SectionIntro
          tone="band"
          id="tools-heading"
          title={
            <>
              The rest of the grading week
              <Period onBand />
            </>
          }
          description="Everything around the first pass, built for the same job: getting papers graded well and back to students."
        />
        <ul className="mt-12 grid gap-4 sm:mt-16 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <li key={tool.title} className="flex gap-4 rounded-3xl bg-card p-5 sm:block sm:p-7">
              <span
                aria-hidden
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-2xl text-band-foreground",
                  BAND_BG[tool.tone]
                )}
              >
                <tool.icon className="size-6" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="pt-2.5 font-display text-[1.25rem] leading-snug font-extrabold tracking-[-0.02em] text-foreground sm:mt-5 sm:pt-0">
                  {tool.title}
                </h3>
                <p className="mt-1.5 max-w-[60ch] text-[0.9375rem] leading-6 text-pretty text-muted-foreground sm:mt-2">
                  {tool.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-[75ch] border-l-4 border-band-foreground py-1 pl-5 text-[0.9375rem] leading-6 text-pretty sm:mt-10 sm:text-base sm:leading-7">
          <span className="font-semibold">Which AI does the reading?</span> Uses Claude for essays, handwriting, briefs and
          goals when an Anthropic API key is set. If an OpenAI key is also set, GPT-4o reads photos and GPT-4o mini
          drafts briefs and reads goals. Without keys, labelled demo engines run locally.
        </p>
      </LandingContainer>
    </section>
  );
}
