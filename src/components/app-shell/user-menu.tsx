"use client";

import { useRef } from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { toast } from "sonner";

import { saveAppearance, useAppearance } from "@/components/customize/appearance";
import { THEME_OPTIONS } from "@/components/customize/options";
import { Check, ChevronDown, GraduationCap, LogOut, Monitor, Moon, Palette, Sun, UserRound } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signInAsDemoTeacher, signOut, viewAsStudent } from "@/lib/auth/actions";
import type { Theme } from "@/lib/preferences/schema";
import { cn } from "@/lib/utils";

export type SwitchableStudent = { id: string; name: string };

const THEME_ICONS = { system: Monitor, light: Sun, dark: Moon } as const satisfies Record<Theme, unknown>;

/** Toasts belong to the account that triggered them; clear them on a switch. */
function switchAccount(action: () => Promise<unknown>) {
  toast.dismiss();
  void action();
}

/**
 * The account menu (avatar button, top right): who is signed in, Customize,
 * a quick theme switch (System / Light / Dark, applied at once and kept open
 * so the change shows behind it), the demo account switcher, and Sign out.
 */
export function UserMenu({
  user,
  students = [],
  demoLogin,
  onCustomize,
}: {
  user: { name: string; email: string; role: "TEACHER" | "STUDENT" };
  /** Teacher only: enrolled students the demo can switch to. */
  students?: SwitchableStudent[];
  demoLogin: boolean;
  /** Opens the Customize panel. */
  onCustomize: () => void;
}) {
  const { theme } = useAppearance();
  // Customize opens once the menu has closed and handed focus back to the
  // button, so closing Customize returns focus there too.
  const afterClose = useRef<(() => void) | null>(null);
  const roleLabel = user.role === "TEACHER" ? "Teacher" : "Student";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-10 items-center gap-2 rounded-full p-1 text-left transition-colors outline-none hover:bg-foreground/[0.06] focus-visible:ring-2 focus-visible:ring-ring min-[75rem]:pr-2"
        // Starts with the visible name (WCAG 2.5.3), so "click Morgan Hale" works.
        aria-label={`${user.name}, account menu`}
      >
        <Avatar name={user.name} className="size-8" />
        <span className="hidden min-w-0 flex-col leading-tight min-[75rem]:flex">
          <span className="truncate text-[0.875rem] font-medium text-foreground">{user.name}</span>
          <span className="text-[0.6875rem] text-muted-foreground">{roleLabel} · Demo account</span>
        </span>
        <ChevronDown className="hidden size-4 text-muted-foreground min-[75rem]:block" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-72 max-w-[calc(100vw-1rem)] overflow-y-auto [max-height:min(var(--radix-dropdown-menu-content-available-height),40rem)]"
        onCloseAutoFocus={() => {
          const next = afterClose.current;
          afterClose.current = null;
          if (next) window.setTimeout(next, 0);
        }}
      >
        <DropdownMenuLabel className="flex items-center gap-3 px-4 py-2 font-normal">
          <Avatar name={user.name} className="size-10 text-[0.8125rem]" />
          <span className="min-w-0">
            <span className="block truncate text-[0.875rem] font-medium text-foreground">{user.name}</span>
            <span className="block truncate text-[0.75rem] text-muted-foreground">{user.email}</span>
            <span className="block text-[0.75rem] text-muted-foreground">{roleLabel} · Demo account</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={() => {
            afterClose.current = onCustomize;
          }}
        >
          <Palette aria-hidden />
          Customize
        </DropdownMenuItem>

        <DropdownMenuLabel className="pt-2.5">Theme</DropdownMenuLabel>
        <DropdownMenuPrimitive.RadioGroup
          aria-label="Theme"
          value={theme}
          onValueChange={(value) => void saveAppearance({ theme: value as Theme })}
        >
          {THEME_OPTIONS.map((option) => {
            const Icon = THEME_ICONS[option.value];
            const checked = theme === option.value;
            return (
              <DropdownMenuPrimitive.RadioItem
                key={option.value}
                value={option.value}
                // Stay open: the page behind shows the new theme at once.
                onSelect={(event) => event.preventDefault()}
                className={cn(
                  "relative mx-1.5 flex min-h-10 cursor-default items-center gap-3 rounded-lg px-3 py-2 text-[0.875rem] outline-none select-none",
                  "data-[highlighted]:bg-primary-soft data-[highlighted]:text-primary-soft-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                  checked ? "font-medium text-foreground" : "text-foreground"
                )}
              >
                <Icon filled={checked} className={cn("size-4", checked ? "text-primary" : "text-muted-foreground")} aria-hidden />
                <span className="flex-1">{option.label}</span>
                <DropdownMenuPrimitive.ItemIndicator>
                  <Check className="size-4 text-primary" aria-hidden />
                </DropdownMenuPrimitive.ItemIndicator>
              </DropdownMenuPrimitive.RadioItem>
            );
          })}
        </DropdownMenuPrimitive.RadioGroup>
        <DropdownMenuSeparator />

        {demoLogin && user.role === "TEACHER" && students.length > 0 ? (
          <>
            <DropdownMenuLabel>Demo: view as a student</DropdownMenuLabel>
            <div className="max-h-[min(40dvh,15rem)] overflow-y-auto">
              {students.map((student) => (
                <DropdownMenuItem key={student.id} onSelect={() => switchAccount(() => viewAsStudent(student.id))}>
                  <UserRound aria-hidden />
                  {student.name}
                </DropdownMenuItem>
              ))}
            </div>
            <DropdownMenuSeparator />
          </>
        ) : null}
        {demoLogin && user.role === "STUDENT" ? (
          <>
            <DropdownMenuItem onSelect={() => switchAccount(signInAsDemoTeacher)}>
              <GraduationCap aria-hidden />
              Demo: back to teacher view
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem onSelect={() => switchAccount(signOut)}>
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
