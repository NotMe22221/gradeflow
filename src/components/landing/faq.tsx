import Link from "next/link";

import { ChevronDown } from "@/components/icons";

import { Blob, XGrid } from "@/components/decor/decor";
import { BOLD_SECTION_Y } from "@/components/landing/bold-section";
import { LandingContainer, SectionIntro } from "@/components/landing/section-intro";
import { cn } from "@/lib/utils";

const QUESTIONS: { question: string; answer: React.ReactNode }[] = [
  {
    question: "How accurate are the suggested scores?",
    answer: (
      <>
        <p>
          Not measured yet, so always check. Each score comes with the quote it rests on, so a wrong one is quick to
          spot. The confidence label is the model&apos;s own guess, not a measured accuracy.
        </p>
        <p>
          Your teacher Home shows how far, on average, the grades you approved landed from the suggestions, so you can
          see how much you change. Beyond that, the only check so far is of the keyless demo grader (a keyword
          heuristic, not AI) on 30 public essays, and it does no better than always answering 3. The live Claude
          evaluation hasn&apos;t been run yet; see the{" "}
          <Link
            href="/evidence"
            className="rounded-sm text-primary underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            evidence page
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    question: "Can it read handwriting?",
    answer: (
      <>
        <p>
          With an Anthropic or OpenAI API key set, the Paper Scanner sends a photo of each page to Claude (or to
          GPT-4o, when an OpenAI key is set), which writes out the answers and drafts a score for each question. In To review you can switch between the photo and the
          transcription to check one against the other.
        </p>
        <p>
          Messy writing, faint pencil and crossed-out work can cause mistakes, so look closely at those papers. Without
          a key, the demo scanner only reads the sample photos that come with the demo; for other photos, you type the
          answers in.
        </p>
      </>
    ),
  },
  {
    question: "Does it work with our LMS?",
    answer: (
      <p>
        Not directly yet. You can export a class&apos;s approved grades as a CSV file and import it into your gradebook.
        There is no roster sync or single sign-on.
      </p>
    ),
  },
  {
    question: "What happens to student work?",
    answer: (
      <>
        <p>
          Papers and grades are stored in the app&apos;s own database. When API keys are set, a paper&apos;s text or photos
          are sent to Anthropic (or, for everything but essays, to OpenAI when its key is set) to draft the scores. So
          are answer-key photos; a student&apos;s first name, class, approved grades with your feedback, and study
          streak and XP when you draft a conference brief; and a student&apos;s goal text and their classes (name,
          section, subject and weakest rubric criteria) when they use the goal planner. In demo mode nothing leaves the
          server.
        </p>
        <p>
          Markwise is a hackathon project, not a reviewed product. Don&apos;t use it with real student data; the
          demo runs on made-up students and papers.
        </p>
      </>
    ),
  },
  {
    question: "What does it cost?",
    answer: (
      <p>
        Nothing to try: the demo runs without any API keys. Running it with real AI means paying for your own Anthropic
        API use (and OpenAI, if you add that key). There is no paid plan.
      </p>
    ),
  },
];

/**
 * Plain answers to the questions teachers ask first. Native details/summary:
 * works without JavaScript. The answers sit on a plain card; the paint stays
 * under the heading and behind the card's edge.
 */
export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className={cn("relative isolate overflow-hidden", BOLD_SECTION_Y)}>
      <XGrid cols={3} rows={2} className="top-4 right-4 w-16 sm:top-8 sm:right-[6%] sm:w-24 lg:hidden" />
      <LandingContainer className="grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <SectionIntro
            id="faq-heading"
            title="Questions teachers ask"
            description="Straight answers, including the limits."
          />
          {/* In the flow under the lede, so it can never land on the text. */}
          <XGrid cols={4} rows={3} className="relative mt-10 hidden w-28 lg:block" />
        </div>
        <div className="relative isolate lg:col-span-8">
          {/* Peeks out from behind the card's right edge, into the page margin. Lilac, not coral: the final
              call to action's coral blob sits right below it on the same edge. */}
          <Blob shape={3} tone="lilac" className="top-12 -right-28 hidden w-64 xl:block" />
          <div className="rounded-[2rem] border border-border bg-card px-5 sm:rounded-[2.5rem] sm:px-8">
            {QUESTIONS.map((item) => (
              <details key={item.question} className="group border-t border-border first:border-t-0">
                <summary className="-mx-3 flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-3 py-5 text-left font-display text-[1.125rem] leading-snug font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:text-[1.1875rem] [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span
                    aria-hidden
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                  >
                    <ChevronDown className="size-6" aria-hidden />
                  </span>
                </summary>
                <div className="max-w-[65ch] space-y-3 pb-6 text-base leading-7 text-pretty text-muted-foreground">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </LandingContainer>
    </section>
  );
}
