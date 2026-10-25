"use client";

import { ChevronDown, GraduationCap, LogOut, UserRound } from "lucide-react";

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

export type SwitchableStudent = { id: string; name: string };

export function UserMenu({
  user,
  students = [],
  demoLogin,
}: {
  user: { name: string; email: string; role: "TEACHER" | "STUDENT" };
  /** Teacher only: enrolled students the demo can switch to. */
  students?: SwitchableStudent[];
  demoLogin: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring"
        aria-label="Account menu"
      >
        <Avatar name={user.name} className="size-7" />
        <span className="hidden min-w-0 flex-col leading-tight sm:flex">
          <span className="truncate text-sm font-medium text-foreground">{user.name}</span>
          <span className="text-[11px] text-muted-foreground">
            {user.role === "TEACHER" ? "Teacher" : "Student"} · Demo account
          </span>
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="text-sm font-medium text-foreground">{user.name}</div>
          <div className="truncate text-xs text-muted-foreground">{user.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {demoLogin && user.role === "TEACHER" && students.length > 0 ? (
          <>
            <DropdownMenuLabel>Demo: view as a student</DropdownMenuLabel>
            <div className="max-h-56 overflow-y-auto">
              {students.map((student) => (
                <DropdownMenuItem key={student.id} onSelect={() => viewAsStudent(student.id)}>
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
            <DropdownMenuItem onSelect={() => signInAsDemoTeacher()}>
              <GraduationCap aria-hidden />
              Demo: back to teacher view
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem onSelect={() => signOut()}>
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
