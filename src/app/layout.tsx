import type { Metadata, Viewport } from "next";
import "@fontsource-variable/roboto";
import "@fontsource-variable/figtree";

import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

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
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
