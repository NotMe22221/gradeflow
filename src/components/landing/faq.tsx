import { ChevronDown } from "@/components/icons";

import { LandingContainer, SECTION_SPACING } from "@/components/landing/section-intro";

const QUESTIONS: { question: string; answer: React.ReactNode }[] = [
  {
    question: "How accurate are the suggested scores?",
    answer: (
      <>
        <p>
          Good enough to start from, not good enough to skip your check. Each score comes with the quote it rests on,
          so a wrong one is quick to spot. The confidence label is the model&apos;s own guess, not a measured accuracy.
        </p>
        <p>
          Your teacher Home shows how far, on average, the grades you approved landed from the suggestions, so you can
          see how much you change. We haven&apos;t run a formal accuracy study.
        </p>
      </>
    ),
  },
  {
    question: "Can it read handwriting?",
    answer: (
      <>
        <p>
          With an OpenAI API key set, the Paper Scanner sends a photo of each page to GPT-4o, which writes out the
          answers and drafts a score for each question. In To review you can switch between the photo and the
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
          are sent to the AI provider to draft the scores. In demo mode nothing leaves the server.
        </p>
        <p>
          GradeSmart AI is a hackathon project, not a reviewed product. Don&apos;t use it with real student data; the
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
        and OpenAI API use. There is no paid plan.
      </p>
    ),
  },
];

/** Plain answers to the questions teachers ask first. Native details/summary: works without JavaScript. */
export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className={SECTION_SPACING}>
      <LandingContainer className="grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <h2
            id="faq-heading"
            className="text-[1.75rem] leading-[1.2] font-medium tracking-[-0.015em] text-balance text-foreground sm:text-[2.25rem] sm:leading-[1.15]"
          >
            Questions teachers ask
          </h2>
          <p className="mt-4 max-w-[60ch] text-base leading-7 text-pretty text-muted-foreground">
            Straight answers, including the limits.
          </p>
        </div>
        <div className="border-b border-border lg:col-span-8">
          {QUESTIONS.map((item) => (
            <details key={item.question} className="group border-t border-border">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-lg py-4 text-left text-[1.0625rem] font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDown
                  className="size-6 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                  aria-hidden
                />
              </summary>
              <div className="max-w-[65ch] space-y-3 pb-6 text-base leading-7 text-pretty text-muted-foreground">
                {item.answer}
              </div>
            </details>
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}
