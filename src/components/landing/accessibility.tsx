import { Blob, XGrid } from "@/components/decor/decor";
import { BOLD_SECTION_Y } from "@/components/landing/bold-section";
import { ScreenshotFrame } from "@/components/landing/screenshot";
import { SCREENSHOTS } from "@/components/landing/screenshots";
import { LandingContainer, SectionIntro } from "@/components/landing/section-intro";
import type { Theme } from "@/lib/preferences/schema";
import { cn } from "@/lib/utils";

const SETTINGS: { title: string; body: string }[] = [
  {
    title: "Light, dark, or match your device",
    body: "Dark mode uses soft grays, not pure black. Student work stays on a light page, so it still reads like paper. Pick an accent color too.",
  },
  {
    title: "Text as big as you need",
    body: "Four text sizes, from 87.5% to 125%. The whole app grows with it, menus and tables included.",
  },
  {
    title: "Your home page, your order",
    body: "Move sections up, down or to the other column, and hide the ones you don't use. Teachers and students each get their own layout.",
  },
  {
    title: "Compact when you want more on screen",
    body: "Lists and tables tighten up. Buttons stay just as easy to hit.",
  },
  {
    title: "Keyboard all the way",
    body: "Every action works from the keyboard, with a visible focus ring. In To review, press ? to see the shortcuts.",
  },
  {
    title: "Never color alone",
    body: "Status always comes with a word, like Missing, Late or Returned, so it reads the same for everyone.",
  },
];

/**
 * Accessibility and personal settings, shown as features (they are). The
 * settings and the light/dark pair sit side by side only from xl: in a
 * narrower two-column layout the pair would shrink to thumbnails (about 140px
 * a phone at 1024), so below xl the pair goes under the settings at a
 * readable size.
 */
export function Accessibility({ theme }: { theme: Theme }) {
  return (
    <section
      id="accessibility"
      aria-labelledby="accessibility-heading"
      className={cn("relative isolate overflow-x-clip", BOLD_SECTION_Y)}
    >
      <LandingContainer className="grid gap-12 xl:grid-cols-12 xl:gap-16">
        <div className="xl:col-span-7">
          <SectionIntro
            id="accessibility-heading"
            title="Easy on the eyes, easy to get around"
            description="Everyone sets the app up the way they read best. Settings are saved to your account, so they follow you to any device."
          />
          <dl className="mt-10 grid gap-x-10 sm:grid-cols-2">
            {SETTINGS.map((setting) => (
              <div key={setting.title} className="border-t-2 border-foreground py-5">
                <dt className="font-display text-[1.125rem] leading-snug font-extrabold tracking-[-0.015em] text-foreground">
                  {setting.title}
                </dt>
                <dd className="mt-1.5 max-w-[60ch] text-[0.9375rem] leading-6 text-pretty text-muted-foreground">
                  {setting.body}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <figure className="relative isolate w-full max-w-2xl xl:col-span-5 xl:max-w-none xl:pt-2">
          {/* Paint around the panel's top corners: in the gap above it, never over the settings. */}
          <Blob
            shape={2}
            tone="yellow"
            className="-top-10 -right-14 w-44 sm:-top-14 sm:-right-20 sm:w-64 xl:-top-16 xl:-right-24 xl:w-72"
          />
          <XGrid cols={4} rows={2} className="-top-9 -left-6 hidden w-28 sm:block" />
          <div className="grid grid-cols-2 gap-3 rounded-[2rem] bg-band-pink p-3 sm:gap-6 sm:rounded-[2.5rem] sm:p-6">
            {(["light", "dark"] as const).map((variant) => (
              <div key={variant} className="flex min-w-0 flex-col items-center gap-3">
                <ScreenshotFrame
                  id="teacherHome"
                  theme={theme}
                  variant={variant}
                  alt={`${SCREENSHOTS.teacherHome.alt} ${variant === "light" ? "Light" : "Dark"} theme.`}
                  shape="phone"
                  className="rounded-[1rem] sm:rounded-[1.5rem]"
                />
                <span className="text-[0.9375rem] font-semibold text-band-foreground">
                  {variant === "light" ? "Light" : "Dark"}
                </span>
              </div>
            ))}
          </div>
          <figcaption className="mt-3 text-[0.875rem] text-muted-foreground">
            The same teacher Home on a phone, in light and dark.
          </figcaption>
        </figure>
      </LandingContainer>
    </section>
  );
}
