import { Check, FileSpreadsheet, Minus } from "@/components/icons";

import { LandingContainer, SectionIntro } from "@/components/landing/section-intro";

const DOES = [
  "Rubrics with points, or answer keys for paper tests",
  "Papers by pasted text or .txt, and handwritten tests by photo",
  "An AI first pass with quoted evidence",
  "A review queue built for speed, with keyboard shortcuts",
  "A gradebook with CSV export and a class heatmap",
  "Conference briefs written from approved grades",
  "A student inbox with a goal planner, streaks, and XP",
];

const SKIPS = ["Discussion boards", "Messaging", "Calendars", "Video", "Attendance", "Course marketplaces"];

export function DeliberatelySmall() {
  return (
    <section aria-labelledby="small-heading" className="border-y border-border bg-card py-20 sm:py-28">
      <LandingContainer>
        <SectionIntro
          id="small-heading"
          eyebrow="Deliberately small"
          title="Easier than an LMS because it does less."
          description="GradeSmart AI covers the stretch from a paper on your desk to a published grade, plus the insight that comes from it. Everything else stays with the tools your school already uses."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <h3 className="text-lg font-medium text-foreground">What GradeSmart AI does</h3>
            <ul className="mt-6 space-y-4">
              {DOES.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3.5" strokeWidth={3} aria-hidden />
                  </span>
                  <span className="pt-0.5">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-dashed border-input/50 bg-background p-6 sm:p-8">
            <h3 className="text-lg font-medium text-muted-foreground">What it deliberately skips</h3>
            <ul className="mt-6 space-y-4">
              {SKIPS.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <Minus className="size-3.5" aria-hidden />
                  </span>
                  <span className="pt-0.5">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <FileSpreadsheet className="size-4 shrink-0" aria-hidden />
          Works alongside your LMS via CSV export.
        </p>
      </LandingContainer>
    </section>
  );
}
