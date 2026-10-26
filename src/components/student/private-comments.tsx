import { Avatar } from "@/components/ui/avatar";
import { formatDate } from "@/lib/format";

export type PrivateComment = {
  key: string;
  author: string;
  at: Date | null;
  text: string;
  /** e.g. "Sent back for revision" or "With your grade". */
  context?: string;
};

/**
 * The teacher's notes to this student, shown like Classroom's private
 * comments: a send-back note, or the overall feedback approved with a grade.
 * Read-only: there is no messaging in GradeSmart.
 */
export function PrivateComments({ comments, timeZone }: { comments: PrivateComment[]; timeZone?: string }) {
  if (comments.length === 0) return null;
  return (
    <section aria-labelledby="private-comments-heading" className="rounded-xl border border-border bg-card p-5">
      <h2 id="private-comments-heading" className="text-[0.9375rem] font-medium text-foreground">
        Private comments
      </h2>
      <ul className="mt-4 space-y-5">
        {comments.map((comment) => (
          <li key={comment.key} className="flex gap-3">
            <Avatar name={comment.author} className="size-8 bg-primary-soft text-primary-soft-foreground ring-0" />
            <figure className="min-w-0 flex-1">
              <figcaption className="text-[0.8125rem] leading-5">
                <span className="font-medium text-foreground">{comment.author}</span>
                {comment.at ? <span className="tabular text-muted-foreground"> · {formatDate(comment.at, timeZone)}</span> : null}
                {comment.context ? (
                  <span className="block text-[0.75rem] text-muted-foreground">{comment.context}</span>
                ) : null}
              </figcaption>
              <blockquote className="mt-1 text-[0.9375rem] leading-6 break-words whitespace-pre-line text-foreground">
                {comment.text}
              </blockquote>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
