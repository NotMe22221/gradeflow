// Rubric templates for the assignment builder. Pure data: safe for client
// components, server code, and unit tests.
//
// Every name, place, survey, and story below is fictional. The topics are
// deliberately different from the seeded assignments, so an assignment created
// from a template gets its own set of sample papers (see sample-papers.ts).

export const TEMPLATE_IDS = ["persuasive", "lab", "literary"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export type RubricTemplateCriterion = {
  title: string;
  /** What full credit looks like. */
  description: string;
  maxPoints: number;
};

export type RubricTemplate = {
  id: TemplateId;
  /** Short label shown in the template picker. */
  name: string;
  title: string;
  instructions: string;
  criteria: RubricTemplateCriterion[];
};

export const RUBRIC_TEMPLATES: RubricTemplate[] = [
  {
    id: "persuasive",
    name: "Persuasive essay",
    title: "Persuasive Essay: Should Our School Start the Day Later?",
    instructions: [
      "The Cedar Ridge school board is deciding whether to move the first bell from 7:30 a.m. to 8:30 a.m. next fall. Write a 400 to 600 word persuasive essay that takes a clear position on the change.",
      "",
      "Your essay should:",
      "- State your position in the introduction.",
      "- Support it with at least two specific pieces of evidence. You may use the Cedar Ridge Student Sleep Survey below.",
      "- Explain the strongest argument on the other side and respond to it.",
      "- End with a conclusion that asks the board to take a specific action.",
      "",
      "Cedar Ridge Student Sleep Survey (fictional, spring 2025): 412 students responded. Students reported an average of 6.6 hours of sleep on school nights. 71% said they feel tired or very tired during first period. First-period tardies averaged 38 per day last spring. The bus contractor estimates a later start would add $40,000 per year in costs. 58% of student athletes worry that practices would end after dark in winter.",
    ].join("\n"),
    criteria: [
      {
        title: "Thesis and position",
        description:
          "States a clear, arguable position on the later start time in the introduction and keeps every body paragraph tied to that position.",
        maxPoints: 5,
      },
      {
        title: "Evidence and reasoning",
        description:
          "Supports the position with at least two specific pieces of evidence, such as figures from the sleep survey, and explains how each one proves the point instead of just listing it.",
        maxPoints: 10,
      },
      {
        title: "Counterargument",
        description:
          "Names the strongest opposing argument (bus costs, after-school jobs, or practice schedules) fairly and rebuts it with a reason or evidence.",
        maxPoints: 5,
      },
      {
        title: "Organization and conventions",
        description:
          "Uses logical paragraphs with clear transitions and a conclusion that calls for a specific action. Sentences are varied and nearly free of errors in grammar, spelling, and punctuation.",
        maxPoints: 5,
      },
    ],
  },
  {
    id: "lab",
    name: "Lab report",
    title: "Lab Report: Does Water Temperature Change How Fast Yeast Produces Gas?",
    instructions: [
      "In class, each group mixed one packet of dry yeast and one tablespoon of sugar into 200 mL of water at four temperatures: 10°C, 25°C, 40°C, and 55°C. You stretched a balloon over each flask and measured the balloon's circumference every 5 minutes for 20 minutes.",
      "",
      "Write a 400 to 600 word lab report with these sections: hypothesis, method, results, analysis, and conclusion.",
      "- Name your independent, dependent, and controlled variables.",
      "- Report your group's measurements for every temperature, with units.",
      "- Explain the pattern in your data using what you know about enzymes in yeast.",
      "- State whether your data support your hypothesis, name sources of error, and suggest one improvement.",
    ].join("\n"),
    criteria: [
      {
        title: "Hypothesis and variables",
        description:
          "States a testable if-then hypothesis about water temperature and gas production, and correctly identifies the independent, dependent, and at least two controlled variables.",
        maxPoints: 5,
      },
      {
        title: "Method and data",
        description:
          "Describes the procedure clearly enough for another student to repeat it, and reports balloon measurements for all four temperatures with units.",
        maxPoints: 5,
      },
      {
        title: "Analysis",
        description:
          "Describes the trend in the data with specific numbers and explains it using enzyme activity, including why the 55°C flask slowed down or stopped producing gas.",
        maxPoints: 10,
      },
      {
        title: "Conclusion and sources of error",
        description:
          "States whether the data support the hypothesis, names at least two specific sources of error, and suggests a concrete improvement to the experiment.",
        maxPoints: 5,
      },
    ],
  },
  {
    id: "literary",
    name: "Literary analysis",
    title: "Literary Analysis: Clocks and Gardens in \"The Clockmaker's Garden\"",
    instructions: [
      "\"The Clockmaker's Garden\" (a short story we read in class) follows Elias Penhallow, an aging clockmaker in the seaside town of Wrenmouth. Since his wife Marigold died, Elias has kept every clock in his shop wound tight and set five minutes fast, while her garden behind the shop grows wild. When Tamsin, a twelve-year-old neighbor, starts sneaking in to water the overgrown roses, Elias chases her away, then slowly begins to help her. Over the seasons he stops winding the clocks one by one. In the final scene a sunflower blooms taller than the shop window, Elias lets the largest clock run down, and he goes outside to sit with Tamsin in the garden.",
      "",
      "Key passages:",
      "- \"A clock only measures what you have lost.\"",
      "- \"Roses don't care what time it is,\" Tamsin said.",
      "- \"He let the big clock run down, and for the first time in years the shop was quiet enough to hear the bees.\"",
      "",
      "Write a 400 to 600 word literary analysis explaining how the author uses the clocks and the garden as symbols to develop a theme about grief and time. Make a clear claim, support it with at least two short quotations from the story, and explain how each quotation supports your claim.",
    ].join("\n"),
    criteria: [
      {
        title: "Interpretive claim",
        description:
          "Opens with a specific, arguable claim about what the clocks and the garden reveal about grief and time, not a plot summary or a general statement about the story.",
        maxPoints: 5,
      },
      {
        title: "Textual evidence",
        description:
          "Supports the claim with at least two short, accurate quotations from the story, each introduced with context so the reader knows who is speaking and when.",
        maxPoints: 10,
      },
      {
        title: "Analysis of symbolism",
        description:
          "Explains how each quotation develops the symbols and the theme, traces how the symbols change from the beginning of the story to the end, and avoids simply retelling events.",
        maxPoints: 10,
      },
    ],
  },
];

export function getRubricTemplate(id: string): RubricTemplate | undefined {
  return RUBRIC_TEMPLATES.find((template) => template.id === id);
}
