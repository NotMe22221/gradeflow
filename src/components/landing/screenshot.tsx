import { SCREENSHOTS, type ScreenshotId } from "@/components/landing/screenshots";
import type { Theme } from "@/lib/preferences/schema";
import { cn } from "@/lib/utils";

/** Below Tailwind's `sm` (40rem): where a phone-sized shot replaces a desktop one. */
const SMALL_SCREEN = "(max-width: 39.99rem)";
const DARK = "(prefers-color-scheme: dark)";

type Source = { media: string; id: ScreenshotId; variant: "light" | "dark" };

/**
 * A real screenshot of the app (captured by scripts/capture-screenshots.mjs)
 * in the viewer's theme. With "system" the browser picks the light or dark
 * file through <picture> and prefers-color-scheme; with a saved light or dark
 * theme the server picks it. `variant` pins one file (for a side-by-side
 * light and dark comparison). `small` swaps in a phone-sized shot on small
 * screens, so a phone never gets a desktop screen shrunk past reading.
 *
 * Width and height reserve the space before the file loads (each <source>
 * carries its own, so the swap doesn't shift anything). Images below the fold
 * load lazily.
 */
export function Screenshot({
  id,
  theme,
  variant,
  small,
  priority = false,
  alt,
  className,
}: {
  id: ScreenshotId;
  theme: Theme;
  variant?: "light" | "dark";
  small?: ScreenshotId;
  priority?: boolean;
  /** Overrides the manifest's alt text (say which theme a pinned variant shows). */
  alt?: string;
  className?: string;
}) {
  const shot = SCREENSHOTS[id];
  const pinned = variant ?? (theme === "system" ? null : theme);

  const sources: Source[] = [];
  if (small) {
    if (pinned) sources.push({ media: SMALL_SCREEN, id: small, variant: pinned });
    else {
      sources.push({ media: `${SMALL_SCREEN} and ${DARK}`, id: small, variant: "dark" });
      sources.push({ media: SMALL_SCREEN, id: small, variant: "light" });
    }
  }
  if (!pinned) sources.push({ media: DARK, id, variant: "dark" });

  const img = (
    // Plain <img>: pre-sized WebP files from /public; next/image would need sharp at runtime.
    <img
      src={shot[pinned ?? "light"]}
      alt={alt ?? shot.alt}
      width={shot.width}
      height={shot.height}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      className={cn("block h-auto w-full", className)}
    />
  );
  if (sources.length === 0) return img;
  return (
    <picture>
      {sources.map((source) => {
        const file = SCREENSHOTS[source.id];
        return (
          <source
            key={source.media}
            media={source.media}
            srcSet={file[source.variant]}
            width={file.width}
            height={file.height}
          />
        );
      })}
      {img}
    </picture>
  );
}

/**
 * A flat frame for a screenshot: a hairline border and rounded corners, no
 * device chrome, no tilt, no shadow. It never grows past the size the shot was
 * taken at, so text in it is never upscaled. With `small`, the frame narrows
 * to the phone shot's width on small screens. To cap it further, pass both
 * `max-w-*` and `sm:max-w-*`.
 */
export function ScreenshotFrame({
  id,
  theme,
  variant,
  small,
  priority,
  alt,
  shape = "window",
  className,
}: {
  id: ScreenshotId;
  theme: Theme;
  variant?: "light" | "dark";
  small?: ScreenshotId;
  priority?: boolean;
  alt?: string;
  /** "phone" uses the larger corner radius of a phone screen. */
  shape?: "window" | "phone";
  className?: string;
}) {
  const style = {
    "--shot-width": `${SCREENSHOTS[id].cssWidth}px`,
    "--shot-width-small": `${SCREENSHOTS[small ?? id].cssWidth}px`,
  } as React.CSSProperties;
  return (
    <div
      className={cn(
        "w-full max-w-(--shot-width-small) overflow-hidden border border-border bg-card sm:max-w-(--shot-width)",
        shape === "phone" ? "rounded-[1.75rem]" : "rounded-xl",
        className
      )}
      style={style}
    >
      <Screenshot id={id} theme={theme} variant={variant} small={small} priority={priority} alt={alt} />
    </div>
  );
}
