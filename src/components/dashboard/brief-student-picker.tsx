"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { Select as SelectPrimitive } from "radix-ui";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BriefPickerClass } from "@/lib/insights/brief-picker";
import { studentProfileHref } from "@/lib/insights/links";

function optionValue(classId: string, studentId: string): string {
  return `${classId}/${studentId}`;
}

/**
 * Pick a student and open their profile, where the conference brief card sits
 * right under the stats and one click drafts it. Only students with an
 * approved grade are listed: a brief is built from approved grades only. The
 * first student is preselected, so "Open brief" works straight away.
 */
export function BriefStudentPicker({ classes }: { classes: BriefPickerClass[] }) {
  const selectId = useId();
  const first = classes[0]?.students[0];
  const [value, setValue] = useState(first && classes[0] ? optionValue(classes[0].id, first.id) : "");

  // A name that appears in more than one class gets its class in the label.
  const nameCounts = new Map<string, number>();
  for (const klass of classes) {
    for (const student of klass.students) nameCounts.set(student.name, (nameCounts.get(student.name) ?? 0) + 1);
  }

  const [classId, studentId] = value.split("/");
  const selected = classes.find((klass) => klass.id === classId)?.students.find((student) => student.id === studentId);
  const href = classId && selected ? studentProfileHref(classId, selected.id) : null;

  return (
    // Wraps to two lines in a narrow card (768-1100px), one line from 1280 up and on phones.
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <label htmlFor={selectId} className="sr-only">
        Student for the conference brief
      </label>
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger id={selectId} className="w-auto min-w-36 flex-1">
          <SelectValue placeholder="Choose a student" />
        </SelectTrigger>
        <SelectContent className="max-w-[calc(100vw-2rem)]">
          {classes.map((klass) => (
            <SelectGroup key={klass.id}>
              <SelectPrimitive.Label className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                {klass.label}
              </SelectPrimitive.Label>
              {klass.students.map((student) => (
                <SelectItem key={student.id} value={optionValue(klass.id, student.id)}>
                  {(nameCounts.get(student.name) ?? 0) > 1 ? `${student.name} (${klass.label})` : student.name}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      {href ? (
        <Button asChild variant="tonal" className="shrink-0 has-[>svg]:pl-5 has-[>svg]:pr-4">
          <Link href={href} aria-label={`Open brief for ${selected?.name ?? "this student"}`}>
            Open brief
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      ) : (
        <Button variant="tonal" className="shrink-0" disabled>
          Open brief
        </Button>
      )}
    </div>
  );
}
