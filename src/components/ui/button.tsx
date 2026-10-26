import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Material 3 buttons, as in Google Classroom: pill-shaped, 40px tall.
 * default = filled (primary actions), tonal = secondary container,
 * outline = outlined, ghost = icon/text button on neutral surfaces,
 * text = primary-colored text button.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium tracking-[0.01em] transition-[color,background-color,border-color,box-shadow] outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/92 hover:shadow-hover",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/92 hover:shadow-hover",
        tonal: "bg-primary-soft text-primary-soft-foreground hover:shadow-hover hover:bg-primary-soft/85",
        outline: "border border-input/60 bg-card text-primary hover:bg-primary/[0.06]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-primary/[0.08]",
        ghost: "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground",
        text: "text-primary hover:bg-primary/[0.08]",
        link: "rounded-md text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-6 has-[>svg]:pl-4 has-[>svg]:pr-5",
        sm: "h-8 gap-1.5 px-4 text-[13px] has-[>svg]:pl-3 has-[>svg]:pr-3.5",
        lg: "h-12 px-7 text-[15px] has-[>svg]:pl-5 has-[>svg]:pr-6",
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
