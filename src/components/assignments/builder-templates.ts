// Templates offered by the rubric builder: the essay rubric templates from
// src/lib/demo/templates.ts plus handwritten-test templates. Pure data: safe
// for client components, server code, and unit tests.
//
// Every name, place, and question below is fictional.

import type { AssignmentKind } from "@/lib/constants";
import { RUBRIC_TEMPLATES, type RubricTemplateCriterion } from "@/lib/demo/templates";

export type BuilderTemplate = {
  id: string;
  kind: AssignmentKind;
  /** Short label shown in the template picker. */
  name: string;
  title: string;
  instructions: string;
  /** For a TEST, each criterion is a question and its description is the answer key. */
  criteria: RubricTemplateCriterion[];
};

export const TEST_TEMPLATES: BuilderTemplate[] = [
  {
    id: "test-water-cycle",
    kind: "TEST",
    name: "Short-answer quiz",
    title: "Unit 5 Quiz: Weather and the Water Cycle",
    instructions: [
      "Answer each question in the space below it. One or two complete sentences is enough unless the question asks for a list.",
      "Write clearly in pen or dark pencil so your answers scan well.",
    ].join("\n"),
    criteria: [
      {
        title: "Q1. Four stages of the water cycle",
        description: "Evaporation, condensation, precipitation, and collection (runoff or groundwater). 1 point each.",
        maxPoints: 4,
      },
      {
        title: "Q2. What makes a cloud form",
        description:
          "Warm, moist air rises and cools, and the water vapor condenses into tiny droplets around dust or other particles.",
        maxPoints: 2,
      },
      {
        title: "Q3. Weather vs. climate",
        description:
          "Weather is the conditions on a given day or week; climate is the average pattern of weather in a place over many years (30 or more).",
        maxPoints: 2,
      },
      {
        title: "Q4. Why the coast has milder winters",
        description:
          "Water heats up and cools down more slowly than land, so the ocean keeps nearby air warmer in winter and cooler in summer.",
        maxPoints: 3,
      },
      {
        title: "Q5. Read the barometer",
        description: "Falling air pressure, so stormy or rainy weather is likely on the way.",
        maxPoints: 2,
      },
    ],
  },
];

export const BUILDER_TEMPLATES: BuilderTemplate[] = [
  ...RUBRIC_TEMPLATES.map((template): BuilderTemplate => ({ ...template, kind: "ESSAY" })),
  ...TEST_TEMPLATES,
];

export function getBuilderTemplate(id: string): BuilderTemplate | undefined {
  return BUILDER_TEMPLATES.find((template) => template.id === id);
}
