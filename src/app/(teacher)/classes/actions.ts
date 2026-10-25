"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getOwnedClass } from "@/lib/access";
import { AuthError, requireTeacher } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { assignmentInputSchema, parseDateOnly, type CreateAssignmentResult } from "@/lib/validation/assignment";
import { classInputSchema, studentInputSchema, type AddStudentResult, type FormFailure } from "@/lib/validation/class";
import { fieldErrorsFromIssues } from "@/lib/validation/form";
import { idSchema } from "@/lib/validation/id";

const STUDENT_EMAIL_DOMAIN = "students.gradesmart.example";

function failure(error: unknown, fallback: string): FormFailure {
  if (error instanceof AuthError) return { ok: false, error: error.message };
  console.error("[gradesmart] Class action failed", { type: error instanceof Error ? error.name : typeof error });
  return { ok: false, error: fallback };
}

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Create a class for the signed-in teacher, then open it. */
export async function createClass(formData: FormData): Promise<FormFailure> {
  let classId: string;
  try {
    const teacher = await requireTeacher();
    const parsed = classInputSchema.safeParse({
      name: formString(formData, "name"),
      section: formString(formData, "section"),
      subject: formString(formData, "subject"),
    });
    if (!parsed.success) {
      return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrorsFromIssues(parsed.error.issues) };
    }
    const created = await db.class.create({
      data: {
        name: parsed.data.name,
        section: parsed.data.section || null,
        subject: parsed.data.subject || null,
        teacherId: teacher.id,
      },
      select: { id: true },
    });
    classId = created.id;
  } catch (error) {
    return failure(error, "The class could not be created. Try again.");
  }
  revalidatePath("/", "layout");
  redirect(`/classes/${classId}`);
}

/** ASCII-only email slug: "Ana-María O'Neil" -> "anamaria", "oneil". */
function emailSlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function randomSuffix(length = 4): string {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < length; i++) out += letters[randomInt(letters.length)];
  return out;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}

/** Add a fictional demo student to one of the teacher's classes. */
export async function addStudent(classId: string, formData: FormData): Promise<AddStudentResult> {
  try {
    const teacher = await requireTeacher();
    const id = idSchema.safeParse(classId);
    if (!id.success) return { ok: false, error: "Class not found." };
    const klass = await getOwnedClass(teacher.id, id.data);

    const parsed = studentInputSchema.safeParse({
      firstName: formString(formData, "firstName"),
      lastName: formString(formData, "lastName"),
    });
    if (!parsed.success) {
      return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrorsFromIssues(parsed.error.issues) };
    }

    const { firstName, lastName } = parsed.data;
    const name = `${firstName} ${lastName}`;
    const local = [emailSlug(firstName) || "student", emailSlug(lastName) || "demo"].join(".");

    // The random suffix keeps demo emails unique; retry on the rare collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const email = `${local}.${randomSuffix()}@${STUDENT_EMAIL_DOMAIN}`;
      try {
        const student = await db.user.create({
          data: {
            email,
            name,
            role: "STUDENT",
            enrollments: { create: { classId: klass.id } },
          },
          select: { name: true, email: true },
        });
        revalidatePath("/", "layout");
        return { ok: true, student };
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
      }
    }
    return { ok: false, error: "Could not create a unique email for this student. Try again." };
  } catch (error) {
    return failure(error, "The student could not be added. Try again.");
  }
}

/** Create an assignment and its rubric, then open the assignment. */
export async function createAssignment(classId: string, input: unknown): Promise<CreateAssignmentResult> {
  let assignmentId: string;
  try {
    const teacher = await requireTeacher();
    const id = idSchema.safeParse(classId);
    if (!id.success) return { ok: false, error: "Class not found." };
    const klass = await getOwnedClass(teacher.id, id.data);

    const parsed = assignmentInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Some fields need attention before you can save.",
        fieldErrors: fieldErrorsFromIssues(parsed.error.issues),
      };
    }

    const { title, instructions, dueDate, criteria } = parsed.data;
    const created = await db.assignment.create({
      data: {
        classId: klass.id,
        title,
        instructions,
        dueDate: dueDate ? parseDateOnly(dueDate) : null,
        criteria: {
          create: criteria.map((criterion, position) => ({
            title: criterion.title,
            description: criterion.description,
            maxPoints: criterion.maxPoints,
            position,
          })),
        },
      },
      select: { id: true },
    });
    assignmentId = created.id;
  } catch (error) {
    return failure(error, "The assignment could not be created. Try again.");
  }
  revalidatePath("/", "layout");
  redirect(`/assignments/${assignmentId}`);
}
