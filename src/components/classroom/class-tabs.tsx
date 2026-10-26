"use client";

import { PageTabs } from "@/components/classroom/page-tabs";

/** Teacher class tabs: Stream, Classwork, People, Grades. */
export function TeacherClassTabs({ classId }: { classId: string }) {
  const base = `/classes/${classId}`;
  return (
    <PageTabs
      label="Class sections"
      tabs={[
        { href: base, label: "Stream" },
        {
          href: `${base}/classwork`,
          label: "Classwork",
          match: (p) => p.startsWith(`${base}/classwork`) || p.startsWith(`${base}/assignments`),
        },
        { href: `${base}/people`, label: "People", match: (p) => p.startsWith(`${base}/people`) || p.startsWith(`${base}/students`) },
        { href: `${base}/grades`, label: "Grades" },
      ]}
    />
  );
}

/** Student class tabs: Stream, Classwork, People. */
export function StudentClassTabs({ classId }: { classId: string }) {
  const base = `/student/classes/${classId}`;
  return (
    <PageTabs
      label="Class sections"
      tabs={[
        { href: base, label: "Stream" },
        { href: `${base}/classwork`, label: "Classwork" },
        { href: `${base}/people`, label: "People" },
      ]}
    />
  );
}
