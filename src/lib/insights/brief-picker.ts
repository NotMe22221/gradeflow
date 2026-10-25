// The dashboard's conference-brief picker: which students can get a brief,
// grouped by class. Pure: safe for client components and unit tests. The
// database loader is listBriefStudents() in ./query.ts (server only).

export type BriefPickerStudent = {
  id: string;
  name: string;
  /** Approved grades in this class. A brief needs at least one. */
  publishedCount: number;
};

export type BriefPickerClass = {
  id: string;
  /** "English 10 · Period 2" */
  label: string;
  /** Sorted by name. Only students with at least one approved grade. */
  students: BriefPickerStudent[];
};

export type BriefPickerSource = {
  /** The teacher's classes in display order, with their enrolled students. */
  classes: { id: string; name: string; section: string | null; students: { id: string; name: string }[] }[];
  /** One entry per PublishedGrade in those classes. */
  published: { classId: string; studentId: string }[];
};

/**
 * Students a conference brief can be drafted for (briefs use approved grades
 * only), grouped by class. Classes with nobody to pick are left out, and a
 * student who left the class is never listed.
 */
export function buildBriefPicker(source: BriefPickerSource): BriefPickerClass[] {
  const counts = new Map<string, number>();
  for (const grade of source.published) {
    const key = `${grade.classId}:${grade.studentId}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return source.classes
    .map((klass) => ({
      id: klass.id,
      label: [klass.name, klass.section].filter(Boolean).join(" · "),
      students: klass.students
        .map((student) => ({
          id: student.id,
          name: student.name,
          publishedCount: counts.get(`${klass.id}:${student.id}`) ?? 0,
        }))
        .filter((student) => student.publishedCount > 0)
        .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || a.id.localeCompare(b.id)),
    }))
    .filter((klass) => klass.students.length > 0);
}
