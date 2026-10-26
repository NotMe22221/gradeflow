"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

import { useResolvedTheme } from "@/components/customize/appearance";

/**
 * Toasts sit bottom-left: over the sidebar and the read-only paper pane on
 * desktop, never over page titles, filters, or the review queue's Approve /
 * Send back bar on the right. On phones they float above the sticky action bar.
 * They follow the app's theme (data-theme on <html>, or the OS for "system")
 * and use the raised surface, so they read in light and dark.
 */
function Toaster(props: ToasterProps) {
  const theme = useResolvedTheme();
  return (
    <Sonner
      theme={theme}
      position="bottom-left"
      offset={{ bottom: 24, left: 24 }}
      mobileOffset={{ bottom: 112, left: 16, right: 16 }}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "!rounded-xl !border !border-border !bg-popover !text-popover-foreground !shadow-raised !font-sans !text-sm",
          description: "!text-muted-foreground",
          actionButton: "!h-8 !rounded-full !bg-primary !px-3 !font-medium !text-primary-foreground",
          cancelButton: "!h-8 !rounded-full !bg-transparent !px-3 !text-primary",
          closeButton: "!border-border !bg-popover !text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
