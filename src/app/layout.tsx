import type { Metadata, Viewport } from "next";
import { unstable_rethrow } from "next/navigation";
import "@fontsource-variable/roboto";
import "@fontsource-variable/figtree";

import "./globals.css";
import { SkipLink } from "@/components/app-shell/skip-link";
import { TimeZoneCookie } from "@/components/app-shell/time-zone-cookie";
import { THEME_COLOR } from "@/components/customize/options";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { serverTimeZone } from "@/lib/classroom/timezone";
import { DEFAULT_PREFERENCES, htmlAttributes, type Preferences } from "@/lib/preferences/schema";
import { getViewerPreferences } from "@/lib/preferences/server";

export const metadata: Metadata = {
  title: {
    default: "Markwise — AI drafts the first pass. You make the call.",
    template: "%s · Markwise",
  },
  description:
    "Markwise bridges paper classrooms and digital grading. AI drafts rubric scores for typed papers and photographed handwritten tests, and nothing publishes until a teacher approves it.",
};

/** The viewer's saved look, or the defaults (signed out, or before the database is set up). */
async function viewerPreferences(): Promise<Preferences> {
  try {
    return await getViewerPreferences();
  } catch (error) {
    // Let Next see dynamic-rendering signals (reading cookies); only data errors fall back.
    unstable_rethrow(error);
    return DEFAULT_PREFERENCES;
  }
}

/** The browser chrome follows the chosen theme; "system" gives one color per OS scheme. */
export async function generateViewport(): Promise<Viewport> {
  const { theme } = await viewerPreferences();
  if (theme === "system") {
    return {
      colorScheme: "light dark",
      themeColor: [
        { media: "(prefers-color-scheme: light)", color: THEME_COLOR.light },
        { media: "(prefers-color-scheme: dark)", color: THEME_COLOR.dark },
      ],
    };
  }
  return { colorScheme: theme, themeColor: THEME_COLOR[theme] };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const preferences = await viewerPreferences();
  return (
    // Theme, accent, text size and density render on the server as data-* attributes, so the
    // first paint is already right (no flash). "system" is resolved by CSS (prefers-color-scheme).
    // Client code may change these attributes for instant feedback, hence suppressHydrationWarning.
    <html lang="en" {...htmlAttributes(preferences)} suppressHydrationWarning>
      <body>
        {/* First tab stop on every page; each page's content is <main id="main">. */}
        <SkipLink />
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
        {/* Sends the browser's time zone to the server ("tz" cookie) so dates use the viewer's day. */}
        <TimeZoneCookie serverTimeZone={serverTimeZone()} />
      </body>
    </html>
  );
}
