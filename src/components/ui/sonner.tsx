"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Toasts sit bottom-left: over the sidebar and the read-only paper pane on
 * desktop, never over page titles, filters, or the review queue's Approve /
 * Send back bar on the right. On phones they float above the sticky action bar.
 */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="bottom-left"
      offset={{ bottom: 24, left: 24 }}
      mobileOffset={{ bottom: 112, left: 16, right: 16 }}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "!rounded-lg !border !border-border !bg-card !text-foreground !shadow-raised !font-sans",
          description: "!text-muted-foreground",
          actionButton: "!bg-primary !text-primary-foreground",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
