import { X } from "@/components/icons";

import { Blob, DotGrid } from "@/components/decor/decor";
import { Period } from "@/components/landing/bold-section";
import { LandingContainer } from "@/components/landing/section-intro";

/** What Markwise leaves to the tools a school already has. */
const SKIPS = ["Discussion boards", "Messaging", "Calendars", "Video", "Attendance", "Course marketplaces"];

/**
 * A short scope note after the teacher tools: it covers the stretch from a
 * paper on your desk to a returned grade, and nothing else. It finishes the
 * tools' sky band.
 */
export function DeliberatelySmall() {
  return (
    <section
      aria-labelledby="scope-heading"
      className="relative isolate overflow-hidden bg-band-sky pb-20 text-band-foreground sm:pb-28"
    >
      <Blob shape={4} tone="yellow" className="-bottom-28 -left-24 hidden w-72 lg:block" />
      <DotGrid cols={8} rows={4} className="right-[5%] bottom-8 hidden w-40 fill-pop-ink-on lg:block" />
      <LandingContainer>
        <div className="grid gap-6 border-t-2 border-band-foreground pt-10 sm:pt-12 lg:grid-cols-12 lg:gap-12">
          <h2 id="scope-heading" className="display-title text-band-foreground lg:col-span-4">
            Deliberately small, so there is less to learn
            <Period onBand />
          </h2>
          <div className="lg:col-span-8">
            <p className="max-w-[65ch] text-[1.0625rem] leading-8 text-pretty">
              Markwise covers the stretch from a paper on your desk to a grade back with the student. Everything
              else stays with the tools your school already uses, and approved grades export as CSV.
            </p>
            <p className="mt-6 text-[0.9375rem] font-semibold" id="scope-skips">
              Not included, on purpose
            </p>
            <ul aria-labelledby="scope-skips" className="mt-3 flex flex-wrap gap-2.5">
              {SKIPS.map((item) => (
                <li
                  key={item}
                  className="inline-flex items-center gap-1.5 rounded-full border-2 border-band-foreground py-1.5 pr-4 pl-3 text-[0.9375rem] font-semibold"
                >
                  <X aria-hidden className="size-4" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </LandingContainer>
    </section>
  );
}
