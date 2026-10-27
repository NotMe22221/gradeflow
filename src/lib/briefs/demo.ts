// Demo conference brief (no OPENAI_API_KEY): a deterministic template over
// the same approved-grade data the AI brief uses. It is labelled "Demo brief"
// in the UI so it is never mistaken for AI output.
// Pure: safe for unit tests. Same input, same brief.

import type { BriefInput, ConferenceBrief } from "@/lib/briefs/types";
import { clipBriefText, finalizeBrief } from "@/lib/briefs/validate";
import { formatPoints, pluralize } from "@/lib/format";

const dayFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** "2026-10-20" -> "Oct 20". Formatted in UTC so the output never depends on the server's zone. */
function formatDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? day : dayFormatter.format(date);
}

/**
 * A criterion or question title in curly quotes. Question titles carry their
 * own punctuation ("Q2. What powers evaporation?"), so the template never
 * appends a period or colon straight after one.
 */
function quoted(title: string): string {
  return `“${title.trim()}”`;
}

/** Ends a sentence with a period, unless it already ends in . ? ! or … (also inside a closing quote or bracket). */
function sentence(text: string): string {
  const trimmed = text.trim();
  return /[.?!…][”"’')]*$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function listTitles(titles: readonly string[]): string {
  if (titles.length <= 1) return titles[0] ?? "";
  if (titles.length === 2) return `${titles[0]} and ${titles[1]}`;
  return `${titles.slice(0, -1).join(", ")}, and ${titles[titles.length - 1]}`;
}

function standing(average: number | null): string {
  if (average === null) return "is getting started";
  if (average >= 90) return "is doing excellent work";
  if (average >= 80) return "is doing solid work";
  if (average >= 70) return "is making steady progress";
  if (average >= 60) return "is building core skills";
  return "needs support to build core skills";
}

function trendClause(grades: BriefInput["grades"]): string {
  const percents = grades.map((grade) => grade.percent).filter((value): value is number => value !== null);
  if (percents.length < 2) return "based on the first approved grade";
  const change = percents[percents.length - 1] - percents[0];
  if (change >= 5) return "with scores trending up";
  if (change <= -5) return "with a dip on the latest assignment";
  return "with consistent results";
}

type CriterionPick = { title: string; assignment: string; percent: number; score: number; maxPoints: number; comment: string | null };

function allCriteria(grades: BriefInput["grades"]): CriterionPick[] {
  return grades.flatMap((grade) =>
    grade.criteria
      .filter((criterion) => criterion.percent !== null)
      .map((criterion) => ({
        title: criterion.title,
        assignment: grade.assignment,
        percent: criterion.percent as number,
        score: criterion.score,
        maxPoints: criterion.maxPoints,
        comment: criterion.teacherComment,
      }))
  );
}

/** The newest teacher comment on a criterion with this title, if any. */
function latestComment(grades: BriefInput["grades"], title: string): string | null {
  const key = title.trim().toLowerCase();
  for (let index = grades.length - 1; index >= 0; index--) {
    const match = grades[index].criteria.find((criterion) => criterion.title.trim().toLowerCase() === key);
    if (match?.teacherComment) return match.teacherComment;
  }
  return null;
}

function dueSuffix(dueOn: string | null): string {
  return dueOn ? ` (due ${formatDay(dueOn)})` : "";
}

/** Build the deterministic demo brief. Always passes finalizeBrief(). */
export function buildDemoBrief(input: BriefInput): ConferenceBrief {
  const first = input.student.firstName || input.student.name;
  const className = input.class.name;
  const count = input.basis.publishedCount;
  const average = input.basis.averagePercent === null ? null : Math.round(input.basis.averagePercent);
  const latest = input.grades[input.grades.length - 1] ?? null;
  const criteria = allCriteria(input.grades);
  const strongest = [...criteria].sort((a, b) => b.percent - a.percent)[0] ?? null;
  const weakest = [...criteria].sort((a, b) => a.percent - b.percent)[0] ?? null;
  const topStrength = input.strengths[0] ?? null;
  const topGrowth = input.growthAreas[0] ?? null;
  const nextUp = input.upcoming[0] ?? null;
  const streak = input.engagement.currentStreakDays;

  const headline = `${first} ${standing(average)} in ${className}, ${trendClause(input.grades)}.`;

  const summaryParts = [
    average === null
      ? `${first} has no approved grades in ${className} yet.`
      : `${first} has ${pluralize(count, "approved grade")} in ${className}, averaging ${average}%.`,
  ];
  if (latest) {
    // The assignment title goes last: titles can end in "?" ("…Adopt a Four-Day Week?").
    summaryParts.push(
      sentence(
        `The most recent grade, published ${formatDay(latest.publishedOn)}, is ` +
          `${formatPoints(latest.score)}/${formatPoints(latest.maxScore)}` +
          `${latest.percent === null ? "" : ` (${latest.percent}%)`} on ${latest.assignment}`
      )
    );
  }
  if (topStrength && topGrowth) {
    summaryParts.push(
      sentence(`The strongest area is ${quoted(topStrength.title)}, and the main area to grow is ${quoted(topGrowth.title)}`)
    );
  } else if (topStrength) {
    summaryParts.push(sentence(`The strongest area is ${quoted(topStrength.title)}`));
  } else if (topGrowth) {
    summaryParts.push(sentence(`The main area to grow is ${quoted(topGrowth.title)}`));
  }

  const strengths = input.strengths.map((skill) =>
    sentence(`${quoted(skill.title)}: ${skill.percent}% on ${listTitles(skill.assignments)}`)
  );
  // Fallbacks never name a criterion that is also listed as a growth area.
  const growthTitles = new Set(input.growthAreas.map((skill) => skill.title.trim().toLowerCase()));
  if (strengths.length === 0 && strongest && !growthTitles.has(strongest.title.trim().toLowerCase())) {
    strengths.push(
      sentence(
        `${quoted(strongest.title)} has the highest criterion score so far: ` +
          `${formatPoints(strongest.score)}/${formatPoints(strongest.maxPoints)} on ${strongest.assignment}`
      )
    );
  }
  const bestGrade = [...input.grades]
    .filter((grade) => grade.percent !== null)
    .sort((a, b) => (b.percent as number) - (a.percent as number))[0];
  if (strengths.length === 0 && bestGrade) {
    const earned = `${formatPoints(bestGrade.score)}/${formatPoints(bestGrade.maxScore)} (${bestGrade.percent}%) on ${bestGrade.assignment}`;
    strengths.push(
      sentence(input.grades.length > 1 ? `The highest approved score so far is ${earned}` : `Earned ${earned}`)
    );
  }
  if (strengths.length === 0) {
    strengths.push(`Completed ${pluralize(count, "approved assignment")} in ${className}.`);
  }

  const growthAreas = input.growthAreas.map((skill) => {
    const comment = latestComment(input.grades, skill.title);
    const base = sentence(`${quoted(skill.title)}: ${skill.percent}% on ${listTitles(skill.assignments)}`);
    return comment ? `${base} Your note: “${clipBriefText(comment, 200)}”` : base;
  });
  if (growthAreas.length === 0 && weakest && weakest.percent < 100) {
    growthAreas.push(
      `${sentence(`${quoted(weakest.title)} is the lowest area so far at ${weakest.percent}% on ${weakest.assignment}`)} ` +
        "Every criterion averages 80% or above, so this is about stretching further."
    );
  }
  if (growthAreas.length === 0) {
    growthAreas.push(
      latest
        ? `Keep the same level of care on the next assignment; ${latest.assignment} earned full marks on every criterion.`
        : `Approved grades will show where ${first} can grow next.`
    );
  }

  const talkingPoints: string[] = [];
  if (average !== null) {
    talkingPoints.push(`${first} averages ${average}% across ${pluralize(count, "approved grade")} in ${className}.`);
  }
  if (latest?.teacherFeedback) {
    talkingPoints.push(`From your feedback (${latest.assignment}): “${clipBriefText(latest.teacherFeedback, 220)}”`);
  }
  if (topStrength) talkingPoints.push(`Open with a strength: ${quoted(topStrength.title)} (${topStrength.percent}%).`);
  if (topGrowth) {
    talkingPoints.push(
      sentence(
        `Name one focus: ${quoted(topGrowth.title)} (${topGrowth.percent}%), with an example from ` +
          `${topGrowth.assignments[0] ?? "a recent assignment"}`
      )
    );
  }
  talkingPoints.push(
    streak > 0
      ? `${first} is on a ${streak}-day study streak in Markwise. This is engagement only, not part of the grade.`
      : `${first} has no active study streak in Markwise right now. This is engagement only, not part of the grade.`
  );

  const nextSteps: string[] = [];
  if (topGrowth) {
    const source = topGrowth.assignments[0] ?? "the latest assignment";
    const focus = sentence(`Focus area: ${quoted(topGrowth.title)}`);
    nextSteps.push(
      nextUp
        ? `${focus} ${sentence(`Revisit the rubric comments on ${source} before ${nextUp.assignment}${dueSuffix(nextUp.dueOn)}`)}`
        : `${focus} Revisit the rubric comments on ${source} and try one improvement on the next assignment.`
    );
  } else if (nextUp) {
    nextSteps.push(`Plan time for ${nextUp.assignment}${dueSuffix(nextUp.dueOn)} and keep the same level of care.`);
  }
  if (latest) nextSteps.push(`Read the rubric comments on ${latest.assignment} together at home.`);
  nextSteps.push(`Keep a short, regular study routine during the week.`);
  nextSteps.push(
    nextUp
      ? `Teacher: check in with the family again after ${nextUp.assignment} is graded.`
      : `Teacher: check in with the family again after the next assignment is graded.`
  );

  const questionsForFamily = [
    `What does ${first} say about ${className} at home?`,
    `When and where does ${first} usually study or do homework?`,
    topGrowth
      ? `What would help ${first} practice the skill behind ${quoted(topGrowth.title)} at home?`
      : `What kind of challenge would keep ${first} motivated?`,
    `Is there anything you would like me to know about how ${first} is doing this term?`,
  ];

  const checked = finalizeBrief({
    headline,
    summary: summaryParts.join(" "),
    strengths,
    growthAreas,
    talkingPoints,
    nextSteps,
    questionsForFamily,
  });
  if (!checked.ok) throw new Error("The demo brief template produced an incomplete brief.");
  return checked.brief;
}
