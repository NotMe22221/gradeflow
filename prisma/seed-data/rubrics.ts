// The demo assignments and their rubrics. Every district, survey, creek,
// author, and story here is fictional.
//
// ESSAY assignments are typed papers graded against rubric criteria. TEST
// assignments are handwritten paper quizzes for the camera grader: each
// criterion is one question, and its description is the answer key.

import type { AssignmentKind } from "../../src/lib/constants";
import { UNIT3_QUIZ_CRITERIA, UNIT3_QUIZ_TITLE } from "../../src/lib/scan/samples";
import type { ClassKey } from "./people";

export type AssignmentKey =
  | "fourDayWeek"
  | "willowCreek"
  | "lanternKeeper"
  | "grammarQuiz1"
  | "finalPortfolio"
  | "waterCycleQuiz"
  | "unit3Quiz";

export type SeedCriterion = {
  /** Stable key used by the published history to refer to this criterion. */
  key: string;
  title: string;
  /** What full credit looks like. */
  description: string;
  maxPoints: number;
};

export type SeedAssignment = {
  key: AssignmentKey;
  classKey: ClassKey;
  kind: AssignmentKind;
  title: string;
  instructions: string;
  /** Days from today; negative is in the past. */
  dueInDays: number;
  /** When the teacher created it, in whole days before the seed runs. */
  createdDaysAgo: number;
  criteria: SeedCriterion[];
};

export const ASSIGNMENTS: SeedAssignment[] = [
  {
    key: "fourDayWeek",
    kind: "ESSAY",
    classKey: "english",
    title: "Persuasive Essay: Should Our School Adopt a Four-Day Week?",
    instructions: [
      "The Maple Ridge School District is considering a four-day school week for next fall, with longer days Monday through Thursday and no classes on Fridays. Write a 400 to 600 word persuasive essay, addressed to the school board, that takes a clear position for or against the change. Support your position with at least two specific pieces of evidence from the fact sheet below, and explain how each one proves your point rather than just listing it. Then present the strongest argument on the other side fairly and respond to it. End with a conclusion that asks the board to take a specific action.",
      "Fact sheet (fictional): The proposed schedule runs from 7:50 a.m. to 3:55 p.m., adding 65 minutes to each school day. The district estimates it would save $410,000 per year on buses, utilities, and substitute teachers. In a 2023 survey by the Brookhaven Education Council, 72% of teachers in four-day districts said they were less likely to leave their jobs. Pinecrest County switched to a four-day week in 2021: student attendance rose from 91% to 94%, reading scores for grades 3 to 5 dipped by 2 points in the first year, and its elementary schools offered a $15-per-day Friday care program. In a district poll, 41% of Maple Ridge parents with children under 12 said Friday childcare would be a hardship.",
    ].join("\n\n"),
    dueInDays: 3,
    createdDaysAgo: 6,
    criteria: [
      {
        key: "position",
        title: "Clear position",
        description:
          "States a specific, arguable position on the four-day week in the introduction and keeps every paragraph tied to it, so the reader always knows what the writer wants the board to do.",
        maxPoints: 5,
      },
      {
        key: "evidence",
        title: "Evidence and reasoning",
        description:
          "Supports the position with at least two specific pieces of evidence, such as figures from the fact sheet, and explains how each one proves the claim instead of just listing it.",
        maxPoints: 10,
      },
      {
        key: "counterargument",
        title: "Counterargument",
        description:
          "Fairly states the strongest opposing argument, such as Friday childcare or longer school days, and rebuts it with a specific reason or piece of evidence.",
        maxPoints: 5,
      },
      {
        key: "organization",
        title: "Organization and style",
        description:
          "Moves logically from introduction to conclusion with focused paragraphs and clear transitions, keeps a formal and confident tone, and has few or no errors in grammar, spelling, or punctuation.",
        maxPoints: 5,
      },
    ],
  },
  {
    key: "willowCreek",
    kind: "ESSAY",
    classKey: "envsci",
    title: "Lab Report: Testing Water Quality in Willow Creek",
    instructions: [
      "Last week our class sampled Willow Creek at three sites: Site A upstream in the Hollis Nature Preserve, Site B at the Route 9 culvert beside the Fairview shopping center, and Site C downstream below the Larkin Farm pasture. Write a 300 to 500 word lab report on your group's results. State a testable question and a hypothesis, then describe your sampling method clearly enough that another group could repeat it. Report your pH, turbidity (NTU), and dissolved oxygen (mg/L) readings for all three sites with units. In your analysis, compare the sites using your actual numbers, explain what might cause the differences, say whether your hypothesis was supported, and name at least one limitation of the study.",
      "Use these section labels: Question and Hypothesis, Method, Data and Results, Analysis and Conclusion.",
    ].join("\n\n"),
    dueInDays: 5,
    createdDaysAgo: 5,
    criteria: [
      {
        key: "hypothesis",
        title: "Hypothesis and question",
        description:
          "Poses a focused, testable question about how water quality changes across the three sites and gives a hypothesis that predicts a specific direction of change with a scientific reason.",
        maxPoints: 4,
      },
      {
        key: "method",
        title: "Method",
        description:
          "Describes the sites, equipment, sampling time, and number of trials precisely enough that another group could repeat the test and get comparable results.",
        maxPoints: 5,
      },
      {
        key: "data",
        title: "Data and results",
        description:
          "Reports pH, turbidity (NTU), and dissolved oxygen (mg/L) for all three sites with units in an organized table or list, and points out the key patterns in the numbers.",
        maxPoints: 6,
      },
      {
        key: "analysis",
        title: "Analysis and conclusion",
        description:
          "Uses the actual numbers to compare sites, gives a plausible scientific explanation for the differences, states whether the hypothesis was supported, and names at least one limitation of the study.",
        maxPoints: 5,
      },
    ],
  },
  {
    key: "lanternKeeper",
    kind: "ESSAY",
    classKey: "english",
    title: "Literary Analysis: Symbolism in 'The Lantern Keeper'",
    instructions: [
      "In \"The Lantern Keeper,\" the short story by Elsa Marrow that we read in class, fourteen-year-old Wren Calloway lives with her father in the lighthouse on Gull Point. After her father dies in the autumn, a three-day storm strikes the coast, and Wren keeps the lantern lit alone so the fishing boats can find the harbor, recording each night in her father's logbook. The story ends when the boats return safely and Wren writes her own name in the logbook for the first time. Write a 300 to 500 word literary analysis that explains how Marrow uses one or more of the story's symbols (the lantern, the storm, or the logbook) to develop a theme. Support your interpretation with at least two short quotations from the story, and explain how each quotation supports your reading.",
    ].join("\n\n"),
    dueInDays: -6,
    createdDaysAgo: 16,
    criteria: [
      {
        key: "interpretation",
        title: "Interpretation of symbolism",
        description:
          "Makes an insightful claim about what at least one symbol (the lantern, the storm, or the logbook) represents and connects it to a clear theme of the story, going beyond plot summary.",
        maxPoints: 6,
      },
      {
        key: "evidence",
        title: "Textual evidence",
        description:
          "Supports the interpretation with at least two well-chosen, accurately quoted lines from the story and explains how each quotation supports the claim.",
        maxPoints: 5,
      },
      {
        key: "writing",
        title: "Writing and structure",
        description:
          "Organizes the analysis around a clear thesis with focused paragraphs and smooth transitions, written in a formal academic voice with few errors.",
        maxPoints: 4,
      },
    ],
  },

  // --- English 10: paper quiz (published history) and an upcoming essay ---------
  {
    key: "grammarQuiz1",
    kind: "TEST",
    classKey: "english",
    title: "Grammar and Vocabulary Quiz 1",
    instructions: [
      "Closed-book paper quiz on the Unit 1 grammar rules and vocabulary list, taken in class. For each item, write the complete corrected sentence, or the sentence or definition the item asks for. Points for each item are shown in parentheses on the quiz.",
      "Your teacher scans the paper quizzes. Grades appear here after your teacher reviews them.",
    ].join("\n\n"),
    dueInDays: -18,
    createdDaysAgo: 36,
    criteria: [
      {
        key: "q1",
        title: "Q1. Choose the correct homophone",
        description:
          'Expected: their ("The players left their jackets on the bench."). Full credit for their; no credit for there or they\'re.',
        maxPoints: 2,
      },
      {
        key: "q2",
        title: "Q2. Make the subject and verb agree",
        description:
          'Expected: is ("Neither of the twins is ready for the test."). Full credit for is; neither is singular, so are earns no credit.',
        maxPoints: 2,
      },
      {
        key: "q3",
        title: "Q3. Fix the comma splice",
        description:
          'Expected: "The bell rang; everyone hurried to class." Full credit for a semicolon, a period, or a comma plus a coordinating conjunction. One point if the splice is fixed but a new punctuation error is added.',
        maxPoints: 2,
      },
      {
        key: "q4",
        title: 'Q4. Define "meticulous" from context',
        description:
          "Expected: very careful and precise about small details. Full credit for careful plus attention to detail; one point for careful alone.",
        maxPoints: 2,
      },
      {
        key: "q5",
        title: "Q5. Choose the correct pronoun case",
        description:
          'Expected: me ("Ms. Hale gave the award to Jordan and me."). Full credit for Jordan and me. One point for me with the order changed (me and Jordan). No credit for Jordan and I or Jordan and myself, because the pronoun is the object of to.',
        maxPoints: 2,
      },
      {
        key: "q6",
        title: "Q6. Use its or it's correctly",
        description:
          'Expected: its ("The museum changed its hours for the summer."). Full credit for its; no credit for it\'s.',
        maxPoints: 1,
      },
      {
        key: "q7",
        title: 'Q7. Use "ambivalent" in an original sentence',
        description:
          "Expected: a sentence that shows mixed or conflicting feelings about one thing. Full credit when the context shows both feelings; one or two points when the word is used correctly with thin context; no credit when it is used to mean ambitious or uninterested.",
        maxPoints: 3,
      },
      {
        key: "q8",
        title: "Q8. Fix the misplaced modifier",
        description:
          'Expected: "Running to the bus, I felt my backpack fall open," or any revision where the person, not the backpack, is running. Full credit when the modifier attaches to the right subject; one point for a partial fix.',
        maxPoints: 2,
      },
    ],
  },
  {
    key: "finalPortfolio",
    kind: "ESSAY",
    classKey: "english",
    title: "Final Portfolio Reflection",
    instructions: [
      "Choose three pieces from your English 10 writing portfolio, including at least one from the first month of the semester. Write a 500 to 700 word reflection that explains how your writing has changed, using specific moments from those pieces as evidence, and set two goals for next semester.",
      "This reflection is the cover letter for your portfolio, so write it for a reader who has not seen your work before.",
    ].join("\n\n"),
    dueInDays: 14,
    createdDaysAgo: 5,
    criteria: [
      {
        key: "growth",
        title: "Reflection on growth",
        description:
          "Explains specifically how the writer's skills changed this semester, comparing an early piece with a later one and naming what changed in the writing itself, not just effort or grades.",
        maxPoints: 12,
      },
      {
        key: "evidence",
        title: "Evidence from the portfolio",
        description:
          "Quotes or closely describes at least three moments from portfolio pieces, such as a revised thesis or a cut paragraph, and explains what each one shows about the writer's choices.",
        maxPoints: 10,
      },
      {
        key: "goals",
        title: "Goals and voice",
        description:
          "Sets two concrete writing goals for next semester that follow from the evidence, written in a clear, honest first-person voice with few errors.",
        maxPoints: 8,
      },
    ],
  },

  // --- Environmental Science: paper quizzes -------------------------------------
  {
    key: "waterCycleQuiz",
    kind: "TEST",
    classKey: "envsci",
    title: "Unit 2 Quiz: The Water Cycle",
    instructions: [
      "Closed-book paper quiz on Unit 2, taken in class. Answer each question in one or two complete sentences. Points for each question are shown on the quiz.",
      "Your teacher scans the paper quizzes. Grades appear here after your teacher reviews them.",
    ].join("\n\n"),
    dueInDays: -12,
    createdDaysAgo: 19,
    criteria: [
      {
        key: "q1",
        title: "Q1. Name the process that turns water vapor into cloud droplets",
        description:
          "Expected: condensation. Full credit for condensation, with or without the explanation that vapor cools into liquid droplets. No credit for evaporation or precipitation.",
        maxPoints: 2,
      },
      {
        key: "q2",
        title: "Q2. What powers evaporation?",
        description:
          "Expected: energy from the sun (solar energy) heats surface water so it turns into water vapor. One point for heat without naming the sun.",
        maxPoints: 2,
      },
      {
        key: "q3",
        title: "Q3. Define transpiration",
        description:
          "Expected: plants release water vapor into the air through tiny pores (stomata) in their leaves. One point for plants releasing water without saying it leaves as vapor through the leaves.",
        maxPoints: 2,
      },
      {
        key: "q4",
        title: "Q4. Explain how an aquifer is recharged",
        description:
          "Expected: precipitation soaks into the ground (infiltration) and seeps down through soil and permeable rock until it reaches the saturated zone. Full credit names infiltration and the downward movement into the aquifer; partial credit for infiltration alone; no credit for runoff from rivers, lakes, or storm drains.",
        maxPoints: 3,
      },
      {
        key: "q5",
        title: "Q5. Give one way people change the water cycle and its effect",
        description:
          "Expected: a specific human change and its effect, for example pavement increases runoff and reduces infiltration, dams store water and increase evaporation, irrigation draws down groundwater, or clearing forests reduces transpiration. Two points for a change without its effect.",
        maxPoints: 3,
      },
      {
        key: "q6",
        title: "Q6. Why is so little of Earth's water usable fresh water?",
        description:
          "Expected: about 97% of Earth's water is salt water in the oceans, and most fresh water is frozen in ice caps and glaciers or deep underground, leaving roughly 1% easy to use. One point for each idea: salt water, frozen ice, and groundwater or the small remaining share.",
        maxPoints: 3,
      },
    ],
  },
  {
    // Scanned live in the demo: the criteria match the sample photos in
    // src/lib/scan/samples.ts (same title, same questions in order), and the
    // seed checks that before inserting anything. No submissions are seeded.
    key: "unit3Quiz",
    kind: "TEST",
    classKey: "envsci",
    title: UNIT3_QUIZ_TITLE,
    instructions: [
      "Closed-book paper quiz on Unit 3, taken in class. Answer each question in one or two complete sentences. Willow Creek is the stream we sampled in the water-quality lab.",
      "Your teacher scans the paper quizzes. Grades appear here after your teacher reviews them.",
    ].join("\n\n"),
    dueInDays: -1,
    createdDaysAgo: 8,
    criteria: UNIT3_QUIZ_CRITERIA,
  },
];
