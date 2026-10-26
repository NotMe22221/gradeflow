import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Users } from "lucide-react";

import { StreamComposer, StreamFeed, StreamToolsCard, StreamUpcomingCard } from "@/components/classes/class-stream";
import { ClassBanner } from "@/components/classroom/class-banner";
import { getOwnedClass } from "@/lib/access";
import { AuthError, requireTeacherPage } from "@/lib/auth/session";
import { upcomingWork } from "@/lib/classroom/due";
import { getClassStream } from "@/lib/classroom/stream";
import { viewerTimeZone } from "@/lib/classroom/viewer-time-zone";
import { pluralize } from "@/lib/format";
import { insightsHref } from "@/lib/insights/links";
import { classTheme } from "@/lib/ui/class-theme";

type Params = Promise<{ classId: string }>;

/** The teacher and their own class, or null. Cached so metadata and page share one lookup. */
const loadOwnedClass = cache(async (classId: string) => {
  const teacher = await requireTeacherPage();
  if (classId.length > 64) return null;
  try {
    return { teacher, klass: await getOwnedClass(teacher.id, classId) };
  } catch (error) {
    if (error instanceof AuthError) return null;
    throw error;
  }
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const owned = await loadOwnedClass((await params).classId);
  return { title: owned ? `${owned.klass.name} · Stream` : "Class" };
}

/** The class Stream: banner, Upcoming, teaching tools, and the activity feed. */
export default async function ClassStreamPage({ params }: { params: Params }) {
  const owned = await loadOwnedClass((await params).classId);
  if (!owned) notFound();
  const { teacher, klass } = owned;

  const now = new Date();
  const timeZone = await viewerTimeZone();
  const stream = await getClassStream(teacher.id, klass.id, { timeZone });
  const upcoming = upcomingWork(stream.assignments, now, { limit: 3, timeZone });
  // The newest handwritten test, so "Scan papers" opens the scanner ready for it.
  const latestTest = stream.assignments.find((assignment) => assignment.isTest);
  const scanHref = latestTest ? `/scan?assignment=${encodeURIComponent(latestTest.id)}` : "/scan";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <ClassBanner name={klass.name} section={klass.section} subject={klass.subject}>
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-4" aria-hidden />
          <span className="tabular">{pluralize(stream.studentCount, "student")}</span>
        </span>
      </ClassBanner>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[13.5rem_minmax(0,1fr)]">
        <aside aria-label="Class overview" className="grid min-w-0 grid-cols-1 content-start gap-4 sm:grid-cols-2 md:grid-cols-1">
          <StreamUpcomingCard classId={klass.id} items={upcoming} now={now} timeZone={timeZone} />
          <StreamToolsCard scanHref={scanHref} heatmapHref={insightsHref(klass.id)} />
        </aside>

        <div className="min-w-0 space-y-4">
          <StreamComposer classId={klass.id} teacherName={teacher.name} />
          <StreamFeed
            items={stream.items}
            teacherName={teacher.name}
            classColor={classTheme(klass).color}
            now={now}
            timeZone={timeZone}
          />
        </div>
      </div>
    </div>
  );
}
