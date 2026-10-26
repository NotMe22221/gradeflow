// Due-date helpers shared by Classwork, Grades, and the assignment page.
// Pure: safe for server and client components and unit tests.
//
// The past-due rule lives in one place (src/lib/classroom/due.ts): work is
// past due once the viewer's today is after its due calendar day, the same
// day boundary the "Due today" / "Due tomorrow" labels use.
export { isPastDueDay } from "@/lib/classroom/due";
