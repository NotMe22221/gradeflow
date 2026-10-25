"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Toasts sit at the top, just under the 56px top bar, so they never cover the
 * review queue's sticky Approve / Send back bar at the bottom of the screen.
 */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="top-center"
      offset={{ top: 72 }}
      mobileOffset={{ top: 64, left: 16, right: 16 }}
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
