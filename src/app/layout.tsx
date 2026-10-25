import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";

import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: {
    default: "GradeSmart AI — AI drafts the first pass. You make the call.",
    template: "%s · GradeSmart AI",
  },
  description:
    "GradeSmart AI takes student papers from submission to published grades. AI drafts rubric scores with evidence; nothing publishes until a teacher approves it.",
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
