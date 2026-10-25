// The three demo assignments and their rubrics. Every district, survey,
// creek, author, and story here is fictional.

import type { ClassKey } from "./people";

export type AssignmentKey = "fourDayWeek" | "willowCreek" | "lanternKeeper";

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
];
