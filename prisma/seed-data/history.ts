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
// Every aiEvidence quote must appear verbatim in the paper. The seed verifies
// each one with findEvidenceSpan before inserting anything.

import type { Confidence } from "../../src/lib/constants";
import type { DaysAgoAt } from "./helpers";
import type { SeedSubmission } from "./submissions";

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

export type PublishedHistoryEntry = SeedSubmission & {
  /** When the AI first pass ran. */
  aiGradedAt: DaysAgoAt;
  /** When the teacher approved, which also published the grade. */
  approvedAt: DaysAgoAt;
  confidence: Confidence;
  overallComment: string;
  /** The teacher's overall note to the student. */
  feedback: string;
  /** Keyed by SeedCriterion.key; must cover every criterion of the rubric. */
  scores: Record<string, HistoryScore>;
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
    confidence: "high",
    overallComment:
      "A focused, well-supported analysis that connects all three symbols to one theme about grief and purpose. The conclusion states the theme clearly but could develop it further.",
    feedback:
      "Excellent work, Juniper. Reading the logbook signature as Wren claiming her own identity was one of the most original arguments in the class. Next time, take your conclusion one step further and explain what the story suggests about grief in general.",
    scores: {
      interpretation: {
        aiScore: 5,
        aiJustification:
          "Makes a clear claim that the lantern stands for the love and responsibility Wren inherits, and ties the storm and the logbook to the same theme of turning grief into purpose. The final paragraph states the theme but does not extend it much beyond the thesis.",
        aiEvidence: "Keeping it burning becomes her way of keeping a part of him alive.",
        finalScore: 5,
      },
      evidence: {
        aiScore: 4,
        aiJustification:
          "Uses three accurate quotations, and the storm comparison is analyzed closely. The logbook quotation is explained more briefly than the other two.",
        aiEvidence:
          "This comparison makes the connection direct: the storm is not just weather but the sorrow that surrounds Wren after the funeral.",
        finalScore: 5,
        finalComment:
          "All three quotations are well chosen, and each one is followed by a real explanation. Your reading of the logbook signature is fully supported by the text, so this earns full credit.",
      },
      writing: {
        aiScore: 4,
        aiJustification:
          "A clear thesis, one focused paragraph per symbol, and transitions such as \"however\" and \"together\" guide the reader. The voice is formal and there are no noticeable errors.",
        aiEvidence:
          "Together, the lantern, the storm, and the logbook show that grief does not have to end in darkness.",
        finalScore: 4,
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
    confidence: "medium",
    overallComment:
      "A clear, readable response with a sensible reading of the lantern as hope. It relies heavily on plot summary and includes only one quotation.",
    feedback:
      "Good start, Sasha. You picked a meaningful symbol and your writing is easy to follow. For the next analysis, cut most of the plot summary and follow each quotation with two or three sentences explaining what it shows about the theme.",
    scores: {
      interpretation: {
        aiScore: 4,
        aiJustification:
          "Identifies the lantern as a symbol of hope and links it to both the boats and Wren's growing confidence. Much of the essay retells the plot, which limits how far the interpretation goes.",
        aiEvidence:
          "The lantern is hope because it helps the boats get home safely and it also gives Wren hope that she can do it on her own.",
        finalScore: 3,
        finalComment:
          "You chose a strong symbol, but about half of the essay retells the plot. To earn more credit, explain how the lantern's meaning changes after her father dies instead of summarizing events.",
      },
      evidence: {
        aiScore: 3.5,
        aiJustification:
          "Includes one accurate, well-chosen quotation and briefly explains it. The rubric asks for at least two, and the logbook scene is described without being quoted.",
        aiEvidence:
          "she trimmed the wick the way he had shown her, and for a moment she could almost feel his hands over hers.",
        finalScore: 3,
        finalComment:
          "One well-chosen quotation, but the assignment asks for at least two. Your explanation (\"she misses her dad a lot\") stays on the surface; push further into what this moment shows about the lantern.",
      },
      writing: {
        aiScore: 3,
        aiJustification:
          "Organized from introduction to conclusion and easy to follow, but the thesis is general and a few long sentences need commas. The tone is mostly formal.",
        aiEvidence: "In conclusion the lantern is a symbol of hope in The Lantern Keeper.",
        finalScore: 3,
      },
    },
  },
];
