import { Check, FileSpreadsheet, Minus } from "lucide-react";

import { LandingContainer, SectionIntro } from "@/components/landing/section-intro";

const DOES = [
  "Rubrics with points and full-credit descriptions",
  "Submissions by pasted text or .txt upload",
  "An AI first pass with quoted evidence",
  "A review queue built for speed, with keyboard shortcuts",
  "A gradebook with CSV export",
  "A read-only student view of published grades",
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
          description="GradeSmart AI covers the stretch from submitted paper to published grade, and leaves everything else to the tools your school already uses."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6 shadow-card sm:p-8">
            <h3 className="text-base font-semibold tracking-tight text-foreground">What GradeSmart AI does</h3>
            <ul className="mt-6 space-y-4">
              {DOES.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                  <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                    <Check className="size-3" strokeWidth={3} aria-hidden />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-dashed border-border bg-background p-6 sm:p-8">
            <h3 className="text-base font-semibold tracking-tight text-muted-foreground">
              What it deliberately skips
            </h3>
            <ul className="mt-6 space-y-4">
              {SKIPS.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full ring-1 ring-border">
                    <Minus className="size-3" aria-hidden />
                  </span>
                  {item}
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
