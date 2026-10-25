import { PageContainer } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewAssignmentLoading() {
  return (
    <PageContainer aria-busy="true" aria-label="Loading the rubric builder">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-3.5 w-48" />
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="space-y-6">
          <Skeleton className="h-20 w-full rounded-xl" />
          <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-card">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-9 w-full sm:w-96" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-9 w-52" />
          </div>
          <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
        <div className="hidden space-y-4 rounded-xl border border-border bg-card p-6 shadow-card lg:block">
          <Skeleton className="h-5 w-24" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </PageContainer>
  );
}
