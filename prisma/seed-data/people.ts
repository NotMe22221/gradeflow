// The demo roster. Every person here is fictional.

import { DEMO_STUDENT_EMAIL, DEMO_TEACHER_EMAIL } from "../../src/lib/constants";
import { studentEmail } from "./helpers";

export const DEMO_TEACHER = {
  name: "Morgan Hale",
  email: DEMO_TEACHER_EMAIL,
} as const;

export type StudentKey =
  | "ava"
  | "milo"
  | "priya"
  | "theo"
  | "juniper"
  | "sasha"
  | "leo"
  | "nadia"
  | "rafael"
  | "iris";

export type SeedStudent = { key: StudentKey; name: string; email: string };

function student(key: StudentKey, name: string): SeedStudent {
  return { key, name, email: studentEmail(name) };
}

export const STUDENTS: SeedStudent[] = [
  student("ava", "Ava Quillon"),
  student("milo", "Milo Brightwater"),
  student("priya", "Priya Lanternfield"),
  student("theo", "Theo Marchwood"),
  student("juniper", "Juniper Fernsby"),
  student("sasha", "Sasha Wrenfield"),
  student("leo", "Leo Ashgrove"),
  student("nadia", "Nadia Stormwell"),
  student("rafael", "Rafael Copperleaf"),
  student("iris", "Iris Thistledown"),
];

// The landing page's "View as a student" button signs in by this email.
if (STUDENTS[0].email !== DEMO_STUDENT_EMAIL) {
  throw new Error(`The first demo student must use ${DEMO_STUDENT_EMAIL}, got ${STUDENTS[0].email}.`);
}

export type ClassKey = "english" | "envsci";

export type SeedClass = {
  key: ClassKey;
  name: string;
  section: string;
  subject: string;
  /** Roster in display order. Milo is enrolled in both classes. */
  studentKeys: StudentKey[];
};

export const CLASSES: SeedClass[] = [
  {
    key: "english",
    name: "English 10",
    section: "Period 2",
    subject: "English Language Arts",
    studentKeys: ["ava", "milo", "priya", "theo", "juniper", "sasha"],
  },
  {
    key: "envsci",
    name: "Environmental Science",
    section: "Period 4",
    subject: "Science",
    studentKeys: ["leo", "nadia", "rafael", "iris", "milo"],
  },
];
