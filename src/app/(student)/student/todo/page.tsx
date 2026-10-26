import type { Metadata } from "next";

import { isTodoTab, toTodoItem } from "@/components/student/todo-model";
import { TodoView } from "@/components/student/todo-view";
import { requireStudentPage } from "@/lib/auth/session";

import { loadStudentWork } from "../data";

export const metadata: Metadata = { title: "To-do" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Classroom's To-do: the signed-in student's own work across their classes. */
export default async function StudentTodoPage({ searchParams }: { searchParams: SearchParams }) {
  const student = await requireStudentPage();
  const now = new Date();
  const [{ classes, rows }, params] = await Promise.all([loadStudentWork(student.id, now), searchParams]);

  const tabParam = first(params.tab);
  const classParam = first(params.class);

  return (
    <TodoView
      items={rows.map((row) => toTodoItem(row, now))}
      classes={classes.map(({ id, name }) => ({ id, name }))}
      initialTab={isTodoTab(tabParam) ? tabParam : "assigned"}
      initialClassId={classes.some((klass) => klass.id === classParam) && classParam ? classParam : "all"}
    />
  );
}
