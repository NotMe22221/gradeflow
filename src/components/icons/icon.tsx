import { forwardRef, type SVGProps } from "react";

import { cn } from "@/lib/utils";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "ref"> & {
  /** Pixel size; CSS size classes (size-4, size-5) win when present. */
  size?: number | string;
  /** The filled variant, for an active or selected state (Material practice). */
  filled?: boolean;
};

export type IconComponent = ReturnType<typeof createIcon>;

/**
 * One Material Symbol as an inline SVG that inherits the text color. Icons
 * are decorative unless a caller gives them an accessible name, so they
 * default to aria-hidden.
 */
export function createIcon(symbol: string, outline: string, filled: string) {
  const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
    { size = 24, filled: isFilled = false, className, strokeWidth: _strokeWidth, ...props },
    ref
  ) {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 -960 960 960"
        width={size}
        height={size}
        fill="currentColor"
        aria-hidden={props["aria-label"] ? undefined : true}
        focusable="false"
        data-icon={symbol}
        className={cn("shrink-0", className)}
        {...props}
      >
        <path d={isFilled ? filled : outline} />
      </svg>
    );
  });
  Icon.displayName = `Icon(${symbol})`;
  return Icon;
}
