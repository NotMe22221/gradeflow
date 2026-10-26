"use client";

import Link from "next/link";
import { FileText, Plus, ScanLine } from "@/components/icons";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Classroom's "+ Create" button on the Classwork page: a filled pill that
 * opens a menu of what you can make. The items keep the accessible names
 * "New assignment" and "New handwritten test".
 */
export function CreateMenu({ classId, className }: { classId: string; className?: string }) {
  const base = `/classes/${encodeURIComponent(classId)}/assignments/new`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className={cn("h-12 gap-2.5 pr-7 pl-5 text-[0.9375rem]", className)}>
          <Plus className="size-5" aria-hidden />
          Create
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-1.5">
        <DropdownMenuItem asChild className="min-h-12 gap-3 px-3">
          <Link href={base} aria-label="New assignment">
            <FileText className="size-5" aria-hidden />
            <span className="grid gap-0.5">
              <span className="font-medium text-foreground">Assignment</span>
              <span className="text-xs text-muted-foreground">Typed papers graded against a rubric</span>
            </span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="min-h-12 gap-3 px-3">
          <Link href={`${base}?kind=TEST`} aria-label="New handwritten test">
            <ScanLine className="size-5" aria-hidden />
            <span className="grid gap-0.5">
              <span className="font-medium text-foreground">Handwritten test</span>
              <span className="text-xs text-muted-foreground">Paper tests you photograph and scan</span>
            </span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
