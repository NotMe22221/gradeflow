import { UserMenu } from "@/components/app-shell/user-menu";
import { Logo } from "@/components/brand/logo";
import { requireStudentPage } from "@/lib/auth/session";
import { demoLoginEnabled } from "@/lib/constants";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStudentPage();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/75">
        <Logo href="/student" />
        <span className="hidden rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground sm:inline">
          Student
        </span>
        <div className="ml-auto">
          <UserMenu user={user} demoLogin={demoLoginEnabled()} />
        </div>
      </header>
      <main id="main" className="min-w-0 flex-1">
        {children}
      </main>
    </div>
  );
}
