import { GradesSkeleton } from "@/components/gradebook/gradebook-skeleton";
import { PageContainer } from "@/components/page-header";

export default function ClassGradesLoading() {
  return (
    <PageContainer aria-busy="true" aria-label="Loading grades">
      <GradesSkeleton />
    </PageContainer>
  );
}
