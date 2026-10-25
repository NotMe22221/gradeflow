import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageContainer } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function TeacherNotFound() {
  return (
    <PageContainer>
      <EmptyState
        icon={FileQuestion}
        title="We couldn't find that page."
        description="It may belong to another class, or the demo data was reset."
        action={
          <Button asChild>
            <Link href="/dashboard">Go to the dashboard</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
