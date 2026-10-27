import { LandingContainer } from "@/components/landing/section-intro";

/** What Markwise leaves to the tools a school already has. */
const SKIPS = ["Discussion boards", "Messaging", "Calendars", "Video", "Attendance", "Course marketplaces"];

/**
 * A short scope note after the teacher tools: it covers the stretch from a
 * paper on your desk to a returned grade, and nothing else.
 */
export function DeliberatelySmall() {
  return (
    <section aria-labelledby="scope-heading" className="bg-card pb-16 sm:pb-24">
      <LandingContainer>
        <div className="grid gap-6 border-t border-border pt-10 lg:grid-cols-12 lg:gap-12">
          <h2
            id="scope-heading"
            className="text-[1.25rem] leading-snug font-medium text-balance text-foreground lg:col-span-4"
          >
            Deliberately small, so there is less to learn
          </h2>
          <div className="lg:col-span-8">
            <p className="max-w-[65ch] text-base leading-7 text-pretty text-muted-foreground">
              Markwise covers the stretch from a paper on your desk to a grade back with the student. Everything
              else stays with the tools your school already uses, and approved grades export as CSV.
            </p>
            <p className="mt-5 text-[0.875rem] font-medium text-foreground" id="scope-skips">
              Not included, on purpose
            </p>
            <ul aria-labelledby="scope-skips" className="mt-3 flex flex-wrap gap-2">
              {SKIPS.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-border px-3 py-1.5 text-[0.875rem] text-muted-foreground"
                >
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
