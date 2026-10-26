import type { Metadata, Viewport } from "next";
import "@fontsource-variable/roboto";
import "@fontsource-variable/figtree";

import "./globals.css";
import { SkipLink } from "@/components/app-shell/skip-link";
import { TimeZoneCookie } from "@/components/app-shell/time-zone-cookie";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { serverTimeZone } from "@/lib/classroom/timezone";

export const metadata: Metadata = {
  title: {
    default: "GradeSmart AI — AI drafts the first pass. You make the call.",
    template: "%s · GradeSmart AI",
  },
  description:
    "GradeSmart AI bridges paper classrooms and digital grading. AI drafts rubric scores for typed papers and photographed handwritten tests, and nothing publishes until a teacher approves it.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
