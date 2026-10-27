import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Liquid Glass buttons: pill-shaped, 40px tall, on the glass utilities in
 * globals.css (solid fills when transparency is reduced or unsupported).
 * default = accent glass (the one primary action), destructive = danger
 * glass, tonal = soft accent glass, secondary = neutral glass, outline =
 * frosted card glass with accent text, ghost = icon/text button on neutral
 * surfaces, text = accent text button, link = underlined link.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium tracking-[0.01em] transition-[color,background-color,border-color,box-shadow,filter,scale] duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default: "liquid font-semibold text-primary-foreground hover:brightness-[1.07] active:scale-[0.98] motion-reduce:active:scale-100",
        destructive:
          "liquid font-semibold text-destructive-foreground [--liquid:var(--destructive)] hover:brightness-[1.07] active:scale-[0.98] motion-reduce:active:scale-100",
        tonal:
          "liquid text-primary-soft-foreground [--liquid:var(--primary-soft)] hover:brightness-[0.97] active:scale-[0.98] motion-reduce:active:scale-100 dark:hover:brightness-[1.12]",
        outline:
          "glass text-primary hover:[--glass-frost:94%] active:scale-[0.98] motion-reduce:active:scale-100",
        secondary:
          "liquid text-secondary-foreground [--liquid:var(--secondary)] hover:brightness-[0.97] active:scale-[0.98] motion-reduce:active:scale-100 dark:hover:brightness-[1.12]",
        ghost: "text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground",
        text: "text-primary hover:bg-primary/[0.08]",
        link: "rounded-md text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-6 has-[>svg]:pl-4 has-[>svg]:pr-5",
        sm: "h-8 gap-1.5 px-4 text-[0.8125rem] has-[>svg]:pl-3 has-[>svg]:pr-3.5",
        lg: "h-12 px-7 text-[0.9375rem] has-[>svg]:pl-5 has-[>svg]:pr-6",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
