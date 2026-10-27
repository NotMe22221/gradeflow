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
//
// The pattern across the four papers feeds "Worth rechecking" and the "AI vs
// your grades" card: the demo grader counts quotations but cannot check them
// against the story or tell whether they are explained, so the teacher
// changed its "Textual evidence" score on three of the four papers (by 1.5
// points on average, mostly down). Milo's draft of the same essay waits in To
// review (submissions.ts), where that history is the reason it is worth
// rechecking. The seed checks this pattern.

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
  {
    assignmentKey: "lanternKeeper",
    studentKey: "priya",
    paperKey: "priyaLanternKeeper",
    submittedAt: { daysAgo: 7, hour: 22, minute: 48 },
    fileName: null,
    aiGradedAt: { daysAgo: 5, hour: 7, minute: 12 },
    approvedAt: { daysAgo: 4, hour: 16, minute: 20 },
    confidence: "medium",
    overallComment:
      "A short response that reads the lantern as a symbol of love and memory and quotes a line for each of the three symbols. The quotations are accurate, but the paper explains them only briefly.",
    feedback:
      "Priya, you found good lines: all three quotations are accurate and well chosen. The next step is explaining them. After each quotation, write two or three sentences about what it shows about Wren and the lantern, and leave words like \"basically\" out of formal writing.",
    scores: {
      interpretation: {
        aiScore: 3,
        aiJustification:
          "Reads the lantern as a symbol of love and memory and states a theme about carrying on after a loss. The reading is asserted more than developed, and the storm and the logbook are named without being interpreted.",
        aiEvidence:
          "I think the lantern means love because her dad took care of it for so long and then Wren takes care of it after he dies.",
        finalScore: 3,
      },
      evidence: {
        aiScore: 3.5,
        aiJustification:
          "Includes three accurate quotations, one for each symbol, which ties the interpretation to the text. Each quotation is introduced, though the explanations that follow are short.",
        aiEvidence: 'Her father "had kept the light for thirty-one years, and it had never once gone dark."',
        finalScore: 2,
        finalComment:
          "All three quotations are accurate, but they come one after another, and the only explanation is that they are \"really important.\" The rubric asks you to explain how each one supports your reading, so this is a 2 for now.",
      },
      writing: {
        aiScore: 2.5,
        aiJustification:
          "Has an introduction, body, and conclusion, but the thesis is general, some sentences run on, and the tone is informal in places (\"Basically\", \"a lot of quotes\").",
        aiEvidence:
          "In conclusion the lantern is a symbol of love and remembering people, and that is what the story is about.",
        finalScore: 2.5,
      },
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
    confidence: "high",
    overallComment:
      "A clear reading of the storm as the challenges Wren faces, supported by two direct quotations and examples from the plot. The conclusion restates the thesis without extending it.",
    feedback:
      "Theo, reading the storm as the problems Wren has to face is a fair interpretation, and your essay stays focused on it. Check every quotation against the story before you hand it in: your first one doesn't match the text. Then push your analysis further: what does Marrow's comparison of the storm to grief tell us?",
    scores: {
      interpretation: {
        aiScore: 3.5,
        aiJustification:
          "Makes a clear claim that the storm stands for the problems Wren faces after her father dies and follows it through the story. The link to grief that the story itself makes is quoted but not developed.",
        aiEvidence:
          "The storm stands for all the problems Wren has to face after her father dies, and the story shows that you have to face your problems instead of hiding from them.",
        finalScore: 3.5,
      },
      evidence: {
        aiScore: 4.5,
        aiJustification:
          "Supports the reading with two direct quotations, one for the calm before the storm and one for the storm itself, and adds specific examples from the plot.",
        aiEvidence: 'Marrow writes that the storm "arrived the way grief had, a little at a time, until it was everywhere."',
        finalScore: 2.5,
        finalComment:
          "Your first quotation doesn't match the story: Marrow writes that he \"had kept the light for thirty-one years, and it had never once gone dark.\" The storm quotation is accurate, but \"This shows the storm is really bad\" doesn't explain it. Quote exactly, and explain each line.",
      },
      writing: {
        aiScore: 3,
        aiJustification:
          "Organized around one symbol with a clear introduction and conclusion, and each paragraph stays on topic. Some phrasing is informal (\"really bad\"), and the conclusion mostly repeats the thesis.",
        aiEvidence: "The storm is a symbol of problems, and Wren beats it by being brave.",
        finalScore: 3,
      },
    },
  },
];
