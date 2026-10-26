"use client";

import { saveAppearance, useAppearance } from "@/components/customize/appearance";
import { THEME_ICONS } from "@/components/customize/customize-dialog";
import { nextTheme, themeLabel } from "@/components/customize/options";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * A 40px icon button for the app bar that cycles the theme: System -> Light
 * -> Dark. The icon shows the current setting; the name and tooltip say what
 * a press does next. Saves like the Customize dialog. On signed-out pages,
 * pass `persist={false}` so it only changes this page view.
 */
export function ThemeQuickToggle({ className, persist = true }: { className?: string; persist?: boolean }) {
  const { theme, resolved } = useAppearance();
  const next = nextTheme(theme);
  const Icon = THEME_ICONS[theme];
  const current = theme === "system" ? `System (${resolved})` : themeLabel(theme);
  const label = `Theme: ${current}. Switch to ${themeLabel(next).toLowerCase()}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          className={cn(className)}
          onClick={() => void saveAppearance({ theme: next }, { persist })}
        >
          <Icon className="size-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        Theme: {current}. Switch to {themeLabel(next).toLowerCase()}
      </TooltipContent>
    </Tooltip>
  );
}
