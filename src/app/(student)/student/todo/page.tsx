import type { Metadata } from "next";

import { toTodoItem } from "@/components/student/todo-model";
import { TodoView } from "@/components/student/todo-view";
import { requireStudentPage } from "@/lib/auth/session";
import { viewerTimeZone } from "@/lib/classroom/viewer-time-zone";

import { loadStudentWork } from "../data";

export const metadata: Metadata = { title: "To-do" };

/**
 * Classroom's To-do: the signed-in student's own work across their classes.
 * The tab and class filter come from the URL (?tab=…&class=…), which the
 * view reads itself so links and reloads land on the same view.
 */
export default async function StudentTodoPage() {
  const student = await requireStudentPage();
  const now = new Date();
  const timeZone = await viewerTimeZone();
  const { classes, rows } = await loadStudentWork(student.id, now, { timeZone });

  return (
    <TodoView
      items={rows.map((row) => toTodoItem(row, now, timeZone))}
      classes={classes.map(({ id, name }) => ({ id, name }))}
    />
  );
}
