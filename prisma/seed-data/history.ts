// Published grade history for "Literary Analysis: Symbolism in 'The Lantern
// Keeper'", so the dashboard, gradebook, and student view are not empty on
// first load.
//
// Each entry represents a PAST TEACHER APPROVAL: the demo grader drafted a
// suggestion, the teacher (Morgan Hale) reviewed it, changed at least one
// score, and approved it, which published the grade in the same step (as
// approveAndPublish does in the app). The seed writes the resulting rows
// directly only because it is recreating history; in the running app,
// PublishedGrade is written exclusively by src/lib/grades/publish.ts after a
// teacher approval.
//
// Only the teacher's side is written here: her final scores, her comments,
// and her note to the student. The AI side (scores, justifications, quotes,
// confidence, overall comment) is the demo grader's real, validated output
// for each paper, computed by dataset.ts (demoDraft) exactly as for the draft
// waiting in To review, so it is what the first pass would have stored. A
// criterion without a finalComment kept the AI justification, which is what
// the review screen pre-fills.
//
// The pattern across the four papers feeds "Worth rechecking" and the "AI vs
// your grades" card: the demo grader counts quotations but cannot check them
// against the story or tell whether they are explained, so the teacher
// lowered its "Textual evidence" score by a point or more on three of the
// four papers (by 1.5 points on average). Elsewhere she mostly agreed: on
// each other criterion she changed the score by a point or more on one paper
// only. Milo's draft of the same essay waits in To review (submissions.ts),
// where that history is the reason it is worth rechecking. The seed checks
// this pattern (validate.ts).

import type { DaysAgoAt } from "./helpers";
import type { SeedSubmission } from "./submissions";

/** One criterion of a past approval, AI side and teacher side, as stored. */
export type HistoryScore = {
  aiScore: number;
  aiJustification: string;
  aiEvidence: string;
  /** The approved score. */
  finalScore: number;
  /**
   * The teacher's comment for this criterion. Omitted when the teacher kept
   * the AI justification, which is what the review screen pre-fills.
   */
  finalComment?: string;
};

/** What the teacher approved for one criterion. */
export type TeacherScore = Pick<HistoryScore, "finalScore" | "finalComment">;

export type PublishedHistoryEntry = SeedSubmission & {
  /** When the AI first pass ran. */
  aiGradedAt: DaysAgoAt;
  /** When the teacher approved, which also published the grade. */
  approvedAt: DaysAgoAt;
  /** The teacher's overall note to the student. */
  feedback: string;
  /** Keyed by SeedCriterion.key; must cover every criterion of the rubric. */
  scores: Record<string, TeacherScore>;
};

export const PUBLISHED_HISTORY: PublishedHistoryEntry[] = [
  {
    assignmentKey: "lanternKeeper",
    studentKey: "juniper",
    paperKey: "juniperLanternKeeper",
    submittedAt: { daysAgo: 8, hour: 20, minute: 14 },
    fileName: "fernsby-lantern-keeper.txt",
    aiGradedAt: { daysAgo: 5, hour: 7, minute: 10 },
    approvedAt: { daysAgo: 2, hour: 16, minute: 15 },
    feedback:
      "Excellent work, Juniper. Reading the logbook signature as Wren claiming her own identity was one of the most original arguments in the class. Next time, take your conclusion one step further and explain what the story suggests about grief in general.",
    scores: {
      interpretation: { finalScore: 5 },
      evidence: {
        finalScore: 5,
        finalComment:
          "All three quotations are well chosen, and each one is followed by a real explanation. Your reading of the logbook signature is fully supported by the text, so this earns full credit.",
      },
      writing: {
        finalScore: 4,
        finalComment:
          "A clear thesis, one focused paragraph per symbol, and transitions such as \"however\" and \"together\" that guide the reader. The voice is formal and I found no errors, so this earns full credit.",
      },
    },
  },
  {
    assignmentKey: "lanternKeeper",
    studentKey: "sasha",
    paperKey: "sashaLanternKeeper",
    submittedAt: { daysAgo: 7, hour: 21, minute: 37 },
    fileName: null,
    aiGradedAt: { daysAgo: 5, hour: 7, minute: 11 },
    approvedAt: { daysAgo: 4, hour: 15, minute: 42 },
    feedback:
      "Good start, Sasha. You picked a meaningful symbol and your writing is easy to follow. For the next analysis, cut most of the plot summary and follow each quotation with two or three sentences explaining what it shows about the theme.",
    scores: {
      interpretation: {
        finalScore: 3,
        finalComment:
          "You chose a strong symbol, but about half of the essay retells the plot. To earn more credit, explain how the lantern's meaning changes after her father dies instead of summarizing events.",
      },
      evidence: {
        finalScore: 3,
        finalComment:
          "One well-chosen quotation, but the assignment asks for at least two. Your explanation (\"she misses her dad a lot\") stays on the surface; push further into what this moment shows about the lantern.",
      },
      writing: { finalScore: 3 },
    },
  },
  {
    assignmentKey: "lanternKeeper",
    studentKey: "priya",
    paperKey: "priyaLanternKeeper",
    submittedAt: { daysAgo: 7, hour: 22, minute: 48 },
    fileName: null,
    aiGradedAt: { daysAgo: 5, hour: 7, minute: 12 },
    approvedAt: { daysAgo: 4, hour: 16, minute: 20 },
    feedback:
      "Priya, you found good lines: all three quotations are accurate and well chosen. The next step is explaining them. After each quotation, write two or three sentences about what it shows about Wren and the lantern, and leave words like \"basically\" out of formal writing.",
    scores: {
      interpretation: {
        finalScore: 4,
        finalComment:
          "You read the lantern as love and memory and give a reason for it, but the storm and the logbook are only named. Explain what each one adds to your reading to reach the top band.",
      },
      evidence: {
        finalScore: 2,
        finalComment:
          "All three quotations are accurate, but they come one after another, and the only explanation is that they are \"really important.\" The rubric asks you to explain how each one supports your reading, so this is a 2 for now.",
      },
      writing: { finalScore: 2.5 },
    },
  },
  {
    assignmentKey: "lanternKeeper",
    studentKey: "theo",
    paperKey: "theoLanternKeeper",
    submittedAt: { daysAgo: 7, hour: 21, minute: 5 },
    fileName: null,
    aiGradedAt: { daysAgo: 5, hour: 7, minute: 13 },
    approvedAt: { daysAgo: 3, hour: 15, minute: 55 },
    feedback:
      "Theo, reading the storm as the problems Wren has to face is a fair interpretation, and your essay stays focused on it. Check every quotation against the story before you hand it in: your first one doesn't match the text. Then push your analysis further: what does Marrow's comparison of the storm to grief tell us?",
    scores: {
      interpretation: {
        finalScore: 4.5,
        finalComment:
          "A clear reading of the storm that you follow through the whole essay. To reach the top band, develop the link to grief that Marrow's own comparison makes.",
      },
      evidence: {
        finalScore: 2.5,
        finalComment:
          "Your first quotation doesn't match the story: Marrow writes that he \"had kept the light for thirty-one years, and it had never once gone dark.\" The storm quotation is accurate, but \"This shows the storm is really bad\" doesn't explain it. Quote exactly, and explain each line.",
      },
      writing: { finalScore: 2.5 },
    },
  },
];
