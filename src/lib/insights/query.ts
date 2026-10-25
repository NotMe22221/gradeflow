import "server-only";

import { getOwnedClass } from "@/lib/access";
import { db } from "@/lib/db";
import { buildBriefPicker, type BriefPickerClass } from "@/lib/insights/brief-picker";
import {
  buildHeatmap,
  MOST_MISSED_MIN_SAMPLE,
  rankMostMissed,
  type ClassHeatmap,
  type HeatmapSource,
  type MostMissedItem,
} from "@/lib/insights/heatmap";

/*
 * Insights queries. Scores are read ONLY from PublishedGrade (teacher-approved
 * snapshots). The selects below never touch AiGrade or CriterionScore, so an
 * AI draft waiting in the review queue can never shape the heatmap.
 */

const assignmentSelect = {
  id: true,
  title: true,
  criteria: { select: { id: true, title: true, maxPoints: true, position: true } },
} as const;

const gradeSelect = {
  totalScore: true,
  maxScore: true,
  breakdown: true,
  submission: { select: { assignmentId: true, studentId: true } },
} as const;

type GradeRow = {
  totalScore: number;
  maxScore: number;
  breakdown: string;
  submission: { assignmentId: string; studentId: string };
};

function toSourceGrades(rows: GradeRow[]): HeatmapSource["grades"] {
  return rows.map((row) => ({
    assignmentId: row.submission.assignmentId,
    studentId: row.submission.studentId,
    totalScore: row.totalScore,
    maxScore: row.maxScore,
    breakdown: row.breakdown,
  }));
}

/**
 * The heatmap for one class the teacher owns. Throws AuthError(404) for a
 * class that does not exist or belongs to someone else.
 */
export async function getClassHeatmap(teacherId: string, classId: string): Promise<ClassHeatmap> {
  const klass = await getOwnedClass(teacherId, classId);

  const [assignments, enrollments, grades] = await Promise.all([
    db.assignment.findMany({
      where: { classId: klass.id },
      orderBy: [{ createdAt: "asc" }, { title: "asc" }],
      select: assignmentSelect,
    }),
    db.enrollment.findMany({
      where: { classId: klass.id },
      select: { student: { select: { id: true, name: true, email: true } } },
    }),
    db.publishedGrade.findMany({
      where: { submission: { assignment: { classId: klass.id } } },
      select: gradeSelect,
    }),
  ]);

  return buildHeatmap({
    class: { id: klass.id, name: klass.name, section: klass.section },
    assignments,
    students: enrollments.map((enrollment) => enrollment.student),
    grades: toSourceGrades(grades),
  });
}

/**
 * The most-missed criteria across every class the teacher owns, for the
 * dashboard card. Same rules as the class heatmap (approved grades only,
 * enrolled students only, at least MOST_MISSED_MIN_SAMPLE graded students).
 */
export async function getMostMissedForTeacher(teacherId: string, limit = 3): Promise<MostMissedItem[]> {
  const [classes, grades] = await Promise.all([
    db.class.findMany({
      where: { teacherId },
      orderBy: [{ createdAt: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        section: true,
        assignments: { orderBy: [{ createdAt: "asc" }, { title: "asc" }], select: assignmentSelect },
        enrollments: { select: { student: { select: { id: true, name: true, email: true } } } },
      },
    }),
    db.publishedGrade.findMany({
      where: { submission: { assignment: { class: { teacherId } } } },
      select: { ...gradeSelect, submission: { select: { assignmentId: true, studentId: true, assignment: { select: { classId: true } } } } },
    }),
  ]);
  if (grades.length === 0) return [];

  const gradesByClass = new Map<string, GradeRow[]>();
  for (const grade of grades) {
    const classId = grade.submission.assignment.classId;
    const list = gradesByClass.get(classId) ?? [];
    list.push(grade);
    gradesByClass.set(classId, list);
  }

  const columns = classes.flatMap((klass) => {
    const classGrades = gradesByClass.get(klass.id);
    if (!classGrades) return [];
    const heatmap = buildHeatmap({
      class: { id: klass.id, name: klass.name, section: klass.section },
      assignments: klass.assignments,
      students: klass.enrollments.map((enrollment) => enrollment.student),
      grades: toSourceGrades(classGrades),
    });
    return heatmap.columns.map((column) => ({ ...column, classId: klass.id, className: klass.name }));
  });

  return rankMostMissed(columns, { minSample: MOST_MISSED_MIN_SAMPLE, limit });
}

/**
 * Students the teacher can draft a conference brief for (at least one
 * approved grade), grouped by class, for the dashboard's brief picker.
 */
export async function listBriefStudents(teacherId: string): Promise<BriefPickerClass[]> {
  const [classes, published] = await Promise.all([
    db.class.findMany({
      where: { teacherId },
      orderBy: [{ createdAt: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        section: true,
        enrollments: { select: { student: { select: { id: true, name: true, role: true } } } },
      },
    }),
    db.publishedGrade.findMany({
      where: { submission: { assignment: { class: { teacherId } } } },
      select: { submission: { select: { studentId: true, assignment: { select: { classId: true } } } } },
    }),
  ]);

  return buildBriefPicker({
    classes: classes.map((klass) => ({
      id: klass.id,
      name: klass.name,
      section: klass.section,
      students: klass.enrollments
        .map((enrollment) => enrollment.student)
        .filter((student) => student.role === "STUDENT")
        .map((student) => ({ id: student.id, name: student.name })),
    })),
    published: published.map((grade) => ({
      classId: grade.submission.assignment.classId,
      studentId: grade.submission.studentId,
    })),
  });
}
