import { Button } from "@/components/ui/button";
import { signInAsDemoTeacher } from "@/lib/auth/actions";

export default function LandingPage() {
  return (
    <main className="p-10">
      <form action={signInAsDemoTeacher}>
        <Button type="submit">View the demo</Button>
      </form>
    </main>
  );
}
