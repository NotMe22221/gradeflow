"use client";

import { CheckIcon } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";

import {
  paperKey,
  type ScanAssignmentOption,
  type ScanClassOption,
  type ScanPaperState,
  type ScanStudentOption,
} from "@/components/scan/types";
import { Select, SelectContent, SelectGroup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pluralize } from "@/lib/format";

/** A select option with a second, muted line that is not shown in the trigger. */
function OptionItem({
  value,
  label,
  hint,
  disabled,
}: {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <SelectPrimitive.Item
      value={value}
      disabled={disabled}
      className="relative flex w-full cursor-default flex-col items-start gap-0.5 rounded-md py-1.5 pr-8 pl-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
    >
      <span className="absolute top-2 right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{label}</SelectPrimitive.ItemText>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </SelectPrimitive.Item>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <SelectPrimitive.Label className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
      {children}
    </SelectPrimitive.Label>
  );
}

/** The /scan picker lists handwritten tests only: the scanner grades against an answer key. */
export function assignmentHint(assignment: ScanAssignmentOption): string {
  if (assignment.questionCount === 0) return "No answer key yet";
  return `Handwritten test · ${pluralize(assignment.questionCount, "question")} · ${pluralize(assignment.totalPoints, "pt", "pts")}`;
}

type FieldA11y = { id: string; invalid?: boolean; describedBy?: string; disabled?: boolean };

export function AssignmentPicker({
  classes,
  assignments,
  value,
  onChange,
  id,
  invalid,
  describedBy,
  disabled,
}: FieldA11y & {
  classes: ScanClassOption[];
  /** Handwritten tests, newest first within each class. */
  assignments: ScanAssignmentOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const groups = classes
    .map((klass) => ({ klass, items: assignments.filter((assignment) => assignment.classId === klass.id) }))
    .filter((group) => group.items.length > 0);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        id={id}
        className="w-full min-w-0"
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
      >
        <SelectValue placeholder="Choose an assignment" />
      </SelectTrigger>
      <SelectContent className="max-w-[calc(100vw-2rem)]">
        {groups.map(({ klass, items }) => (
          <SelectGroup key={klass.id}>
            <GroupLabel>{klass.label}</GroupLabel>
            {items.map((assignment) => (
              <OptionItem
                key={assignment.id}
                value={assignment.id}
                label={assignment.title}
                hint={assignmentHint(assignment)}
                disabled={assignment.questionCount === 0}
              />
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

export function paperHint(paper: ScanPaperState | undefined): string | undefined {
  if (!paper) return undefined;
  return paper.replaceable ? `Has a paper (${paper.label.toLowerCase()}). A scan replaces it.` : `${paper.label}: can't be replaced`;
}

export function StudentPicker({
  students,
  assignmentId,
  papers,
  value,
  onChange,
  id,
  invalid,
  describedBy,
  disabled,
}: FieldA11y & {
  students: ScanStudentOption[];
  assignmentId: string;
  papers: Record<string, ScanPaperState>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || !assignmentId || students.length === 0}>
      <SelectTrigger
        id={id}
        className="w-full min-w-0"
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
      >
        <SelectValue
          placeholder={
            !assignmentId ? "Choose an assignment first" : students.length === 0 ? "No students enrolled" : "Choose a student"
          }
        />
      </SelectTrigger>
      <SelectContent className="max-w-[calc(100vw-2rem)]">
        {students.map((student) => {
          const paper = papers[paperKey(assignmentId, student.id)];
          return (
            <OptionItem
              key={student.id}
              value={student.id}
              label={student.name}
              hint={paperHint(paper)}
              disabled={paper ? !paper.replaceable : false}
            />
          );
        })}
      </SelectContent>
    </Select>
  );
}
