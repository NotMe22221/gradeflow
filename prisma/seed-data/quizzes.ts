// Published history for the two scanned paper quizzes, so the class heatmap,
// the "most missed" ranking, the conference brief, and the goal planner have
// real (synthetic) data on first load. Every student and answer is fictional.
//
// Each result represents a PAST TEACHER APPROVAL of a camera-graded test: the
// teacher scanned the paper quiz, the demo grader drafted a score per
// question (no API key in the demo), the teacher checked it, adjusted a score
// now and then, and approved it, which published the grade. In the running
// app, PublishedGrade is written only by src/lib/grades/publish.ts.
//
// The transcription (Submission.content) is built from the answers, one
// "Q1. ..." line per question, exactly as the camera grader stores it. Every
// answer doubles as the AI's quoted evidence, so the seed can verify each
// quote against the transcription. No photos are stored for history.
//
// The class pattern is deliberate: in Grammar and Vocabulary Quiz 1, Q5
// (pronoun case) and Q7 (vocabulary sentence) are commonly missed while Q1 and
// Q2 are mostly correct; in the Water Cycle quiz, Q4 (aquifer recharge) is the
// one most of the class missed. The seed checks these averages.

import type { Confidence } from "../../src/lib/constants";
import type { DaysAgoAt } from "./helpers";
import type { StudentKey } from "./people";
import type { AssignmentKey } from "./rubrics";

export type QuizAnswer = {
  /** What the student wrote, as transcribed. Also the AI's quoted evidence. */
  text: string;
  aiScore: number;
  aiJustification: string;
  /** The approved score when the teacher changed the AI's suggestion. */
  finalScore?: number;
  /** The teacher's comment when they changed the score. */
  finalComment?: string;
};

export type QuizResult = {
  assignmentKey: AssignmentKey;
  studentKey: StudentKey;
  /** When the teacher scanned the paper (the AI draft is written in the same request). */
  scannedAt: DaysAgoAt;
  /** When the teacher approved, which also published the grade. */
  approvedAt: DaysAgoAt;
  confidence: Confidence;
  overallComment: string;
  /** The teacher's overall note to the student. */
  feedback: string;
  /** One answer per question, in question order. */
  answers: QuizAnswer[];
};

function answer(text: string, aiScore: number, aiJustification: string): QuizAnswer {
  return { text, aiScore, aiJustification };
}

/** The teacher changed the AI's suggestion for this answer. */
function adjusted(base: QuizAnswer, finalScore: number, finalComment: string): QuizAnswer {
  return { ...base, finalScore, finalComment };
}

/** "Q1. ...\nQ2. ..." exactly as the camera grader stores a transcription. */
export function quizTranscription(result: Pick<QuizResult, "answers">): string {
  return result.answers.map((entry, index) => `Q${index + 1}. ${entry.text}`).join("\n");
}

// --- English 10: Grammar and Vocabulary Quiz 1 ----------------------------------

const GRAMMAR = {
  q1Their: answer(
    "The players left their jackets on the bench.",
    2,
    "Writes their, the possessive the sentence needs, and copies the rest of the sentence correctly."
  ),
  q2Is: answer("Neither of the twins is ready for the test.", 2, "Uses the singular verb is, which agrees with neither."),
  q2Are: answer(
    "Neither of the twins are ready for the test.",
    0,
    "Uses are, but neither is singular, so the verb should be is."
  ),
  q3Semicolon: answer(
    "The bell rang; everyone hurried to class.",
    2,
    "Replaces the comma with a semicolon, which correctly joins the two independent clauses."
  ),
  q3CommaAnd: answer(
    "The bell rang, and everyone hurried to class.",
    2,
    "Adds the coordinating conjunction and after the comma, which fixes the splice."
  ),
  q3Period: answer("The bell rang. Everyone hurried to class.", 2, "Splits the splice into two complete sentences."),
  q3So: answer("The bell rang so everyone hurried to class.", 2, "Fixes the comma splice by joining the clauses with so."),
  q3When: answer(
    "When the bell rang everyone hurried to class.",
    1,
    "Rewrites the sentence with when, which fixes the splice, but the introductory clause needs a comma after rang."
  ),
  q3SemicolonAnd: answer(
    "The bell rang; and everyone hurried to class.",
    1,
    "Fixes the splice, but a semicolon followed by and adds a new punctuation error."
  ),
  q4Full: answer(
    "Meticulous means very careful and precise about small details.",
    2,
    "Matches the answer key: very careful and precise about details."
  ),
  q4Attentive: answer(
    "Extremely careful and paying attention to every detail.",
    2,
    "Gives both parts of the meaning: careful and attentive to detail."
  ),
  q4Attention: answer(
    "Meticulous means showing great attention to detail; very careful.",
    2,
    "Gives both parts of the meaning: attention to detail and great care."
  ),
  q4Details: answer("Being very careful with all the details.", 2, "Matches the key: very careful about details."),
  q4Careful: answer(
    "Meticulous means careful.",
    1,
    "Says careful but leaves out the attention to small details, so this earns partial credit."
  ),
  q4Neat: answer(
    "It means careful and neat.",
    1,
    "Careful is right, but neat is not part of the meaning and the attention to detail is missing."
  ),
  q5JordanAndMe: answer(
    "Ms. Hale gave the award to Jordan and me.",
    2,
    "Uses me, the object form, after the preposition to."
  ),
  q5MeAndJordan: answer(
    "Ms. Hale gave the award to me and Jordan.",
    1,
    "Chooses the correct object pronoun, me, but the key asks for the other person first (Jordan and me)."
  ),
  q5JordanAndI: answer(
    "Ms. Hale gave the award to Jordan and I.",
    0,
    "Uses I, the subject form. The pronoun is the object of to, so the sentence needs me."
  ),
  q5Myself: answer(
    "Ms. Hale gave the award to Jordan and myself.",
    0,
    "Myself is reflexive and has nothing to refer back to here; the sentence needs me."
  ),
  q6Its: answer("The museum changed its hours for the summer.", 1, "Uses its, the possessive, with no apostrophe."),
  q6ItIs: answer(
    "The museum changed it's hours for the summer.",
    0,
    "It's means it is; the possessive its has no apostrophe."
  ),
  q8Felt: answer(
    "Running to the bus, I felt my backpack fall open.",
    2,
    "Makes I the subject, so the person, not the backpack, is running."
  ),
  q8While: answer(
    "My backpack fell open while running to the bus.",
    1,
    "Moves the phrase, but the backpack is still the one running. A partial fix."
  ),
  q8WhileIWas: answer(
    "While I was running to the bus, my backpack fell open.",
    1.5,
    "Adds a subject to the opening phrase, which fixes most of the problem."
  ),
  q8Unchanged: answer(
    "Running to the bus, my backpack fell open.",
    0,
    "The sentence is copied unchanged, so the backpack is still the one running."
  ),
  q8AsIWas: answer(
    "As I was running to the bus, my backpack fell open.",
    2,
    "Turns the phrase into a clause with I as its subject, which fixes the modifier."
  ),
  q8WhileIRan: answer(
    "While I ran to the bus, my backpack fell open.",
    2,
    "Gives the opening clause its own subject, I, which fixes the modifier."
  ),
} as const;

const GRAMMAR_QUIZ: QuizResult[] = [
  {
    assignmentKey: "grammarQuiz1",
    studentKey: "ava",
    scannedAt: { daysAgo: 18, hour: 15, minute: 32 },
    approvedAt: { daysAgo: 16, hour: 16, minute: 5 },
    confidence: "high",
    overallComment:
      "Strong across the quiz: every grammar item matches the answer key. Q7 uses ambivalent correctly but without context that shows mixed feelings.",
    feedback:
      "Great work, Ava. You were the only student to get full credit on the pronoun case item. On vocabulary sentences, add context that proves you know the meaning, like the two feelings behind ambivalent.",
    answers: [
      GRAMMAR.q1Their,
      GRAMMAR.q2Is,
      GRAMMAR.q3Semicolon,
      GRAMMAR.q4Full,
      GRAMMAR.q5JordanAndMe,
      GRAMMAR.q6Its,
      answer(
        "I felt ambivalent about the test.",
        1,
        "Uses ambivalent correctly, but the sentence does not show the two conflicting feelings."
      ),
      GRAMMAR.q8Felt,
    ],
  },
  {
    assignmentKey: "grammarQuiz1",
    studentKey: "milo",
    scannedAt: { daysAgo: 18, hour: 15, minute: 35 },
    approvedAt: { daysAgo: 17, hour: 19, minute: 40 },
    confidence: "medium",
    overallComment:
      "Solid on the homophone, agreement, and its items. Q4, Q5, Q7, and Q8 earn partial credit; each needs one more step to be fully correct.",
    feedback:
      "Good effort, Milo. You know the rules but often stop one step short. Before you turn in a quiz, reread each sentence once just for punctuation and word order.",
    answers: [
      GRAMMAR.q1Their,
      GRAMMAR.q2Is,
      adjusted(
        GRAMMAR.q3So,
        1,
        "The splice is fixed, but you need a comma before so when it joins two complete sentences."
      ),
      GRAMMAR.q4Careful,
      GRAMMAR.q5MeAndJordan,
      GRAMMAR.q6Its,
      answer(
        "My brother is ambivalent about which college to pick.",
        1,
        "The word fits loosely, but being unsure which college to pick is indecision, not two mixed feelings about one thing."
      ),
      GRAMMAR.q8While,
    ],
  },
  {
    assignmentKey: "grammarQuiz1",
    studentKey: "priya",
    scannedAt: { daysAgo: 18, hour: 15, minute: 38 },
    approvedAt: { daysAgo: 16, hour: 16, minute: 12 },
    confidence: "high",
    overallComment:
      "Most answers match the key. Q5 uses I where the object form me is needed, and Q7 shows mixed feelings with brief context.",
    feedback:
      "Nice work, Priya. Watch for \"Jordan and I\" after a preposition: say the sentence with just the pronoun (\"gave the award to me\") to check the case.",
    answers: [
      GRAMMAR.q1Their,
      GRAMMAR.q2Is,
      GRAMMAR.q3CommaAnd,
      GRAMMAR.q4Attentive,
      GRAMMAR.q5JordanAndI,
      GRAMMAR.q6Its,
      answer(
        "I feel ambivalent about summer break because it is fun but it gets boring.",
        2,
        "Shows two feelings about one thing, though the context is brief."
      ),
      adjusted(GRAMMAR.q8WhileIWas, 2, "Adding I to the opening clause fixes the modifier completely. Full credit."),
    ],
  },
  {
    assignmentKey: "grammarQuiz1",
    studentKey: "theo",
    scannedAt: { daysAgo: 18, hour: 15, minute: 41 },
    approvedAt: { daysAgo: 17, hour: 19, minute: 52 },
    confidence: "low",
    overallComment:
      "Mixed results: Q1 and Q2 match the key, Q3 and Q4 earn partial credit, and Q5 through Q8 earn little or no credit. Several answers look rushed.",
    feedback:
      "Theo, the first half of this quiz shows you know the basics. Let's go over its and it's, pronoun case, and the vocabulary list together before Quiz 2. Come see me at lunch this week.",
    answers: [
      GRAMMAR.q1Their,
      GRAMMAR.q2Is,
      GRAMMAR.q3When,
      GRAMMAR.q4Neat,
      GRAMMAR.q5Myself,
      GRAMMAR.q6ItIs,
      adjusted(
        answer(
          "She is very ambivalent and wants to be class president.",
          1,
          "Uses the word in a complete sentence, but the context suggests ambition rather than mixed feelings."
        ),
        0,
        "Ambivalent means having mixed feelings, not ambitious. Look at the vocabulary list again and try a new sentence."
      ),
      GRAMMAR.q8Unchanged,
    ],
  },
  {
    assignmentKey: "grammarQuiz1",
    studentKey: "juniper",
    scannedAt: { daysAgo: 18, hour: 15, minute: 44 },
    approvedAt: { daysAgo: 16, hour: 16, minute: 20 },
    confidence: "high",
    overallComment:
      "Strong quiz with full credit on most items. Q5 uses I after a preposition, and Q7 shows clear, conflicting feelings.",
    feedback:
      "Excellent work, Juniper. Your ambivalent sentence was the best in the class. Remember that a pronoun after to or for takes the object form: Jordan and me.",
    answers: [
      GRAMMAR.q1Their,
      GRAMMAR.q2Is,
      GRAMMAR.q3Period,
      GRAMMAR.q4Attention,
      GRAMMAR.q5JordanAndI,
      GRAMMAR.q6Its,
      adjusted(
        answer(
          "I felt ambivalent about moving to Harborview: I was excited for a fresh start but sad to leave my best friend.",
          2.5,
          "Shows two clear, conflicting feelings about the move, and the colon is used correctly."
        ),
        3,
        "This is exactly what the word means: both feelings are clear and about one thing. Full credit."
      ),
      GRAMMAR.q8AsIWas,
    ],
  },
  {
    assignmentKey: "grammarQuiz1",
    studentKey: "sasha",
    scannedAt: { daysAgo: 18, hour: 15, minute: 47 },
    approvedAt: { daysAgo: 17, hour: 20, minute: 4 },
    confidence: "medium",
    overallComment:
      "Correct on Q1, Q4, Q6, and Q8. Q2 uses are with neither, Q5 uses the subject form I, and Q7 treats ambivalent as uninterested.",
    feedback:
      "Sasha, you fixed the modifier on Q8 better than most of the class. Review subject-verb agreement with neither and either, and the vocabulary definitions, before Quiz 2.",
    answers: [
      GRAMMAR.q1Their,
      GRAMMAR.q2Are,
      GRAMMAR.q3SemicolonAnd,
      GRAMMAR.q4Details,
      GRAMMAR.q5JordanAndI,
      GRAMMAR.q6Its,
      answer(
        "He was ambivalent and did not care about the game at all.",
        0,
        "Uses ambivalent to mean uninterested. It means having mixed feelings, so this earns no credit."
      ),
      GRAMMAR.q8WhileIRan,
    ],
  },
];

// --- Environmental Science: Unit 2 Quiz: The Water Cycle -----------------------

const WATER_CYCLE_QUIZ: QuizResult[] = [
  {
    assignmentKey: "waterCycleQuiz",
    studentKey: "leo",
    scannedAt: { daysAgo: 12, hour: 15, minute: 20 },
    approvedAt: { daysAgo: 11, hour: 18, minute: 25 },
    confidence: "high",
    overallComment:
      "Strong quiz. Q4 describes infiltration but not how the water reaches the aquifer, and Q6 leaves out the small share of usable water.",
    feedback:
      "Strong work, Leo. Your pavement answer on Q5 was exactly right. For Q4, trace the water all the way down: soil, permeable rock, then the saturated zone.",
    answers: [
      answer(
        "Condensation, when water vapor cools into droplets.",
        2,
        "Names condensation and explains that the vapor cools into droplets."
      ),
      answer(
        "Energy from the sun heats the water so it evaporates.",
        2,
        "Names energy from the sun as the source of the heat that drives evaporation."
      ),
      answer(
        "Plants give off water vapor through their leaves.",
        2,
        "Says plants release water vapor through their leaves, as the key expects."
      ),
      adjusted(
        answer(
          "Rain soaks into the ground and fills it.",
          2,
          "Describes rain soaking into the ground, which is infiltration, and says it refills the aquifer, though not how the water gets there."
        ),
        1,
        "Soaking into the ground is the right start. For full credit, explain how the water moves down through soil and rock to reach the aquifer."
      ),
      answer(
        "Paving parking lots makes more runoff because water cannot soak into the ground.",
        3,
        "Names a specific change (pavement) and its effect (more runoff, less infiltration)."
      ),
      answer(
        "Most of the water is salt water in the ocean and some is frozen.",
        2,
        "Gives two of the three ideas, salt water and frozen water. The small usable share is missing."
      ),
    ],
  },
  {
    assignmentKey: "waterCycleQuiz",
    studentKey: "nadia",
    scannedAt: { daysAgo: 12, hour: 15, minute: 23 },
    approvedAt: { daysAgo: 10, hour: 16, minute: 40 },
    confidence: "medium",
    overallComment:
      "Full credit on Q1, Q2, and Q6. Q3 and Q5 need one more detail, and Q4 does not explain how the aquifer is recharged.",
    feedback:
      "Nice work on the freshwater question, Nadia. On two-part questions like Q5, always finish with the effect: what happens to the water because of the change?",
    answers: [
      answer("It is called condensation.", 2, "Names condensation, the process in the answer key."),
      answer("Solar energy heats up oceans and lakes.", 2, "Names solar energy heating surface water, which matches the key."),
      answer(
        "When plants release water.",
        1,
        "Says plants release water but not that it leaves as vapor through the leaves."
      ),
      answer(
        "Water from lakes and rain goes into it.",
        1,
        "Mentions rain, but does not explain infiltration or how the water moves down into the aquifer."
      ),
      answer("Building dams on rivers.", 2, "Names a specific change but not its effect on the water cycle."),
      answer(
        "97% is salty ocean water, most of the fresh water is frozen in glaciers, so only about 1% is easy to use.",
        3,
        "Gives all three ideas with accurate figures."
      ),
    ],
  },
  {
    assignmentKey: "waterCycleQuiz",
    studentKey: "rafael",
    scannedAt: { daysAgo: 12, hour: 15, minute: 26 },
    approvedAt: { daysAgo: 11, hour: 18, minute: 37 },
    confidence: "low",
    overallComment:
      "Partial credit on Q2, Q3, Q5, and Q6. Q1 names evaporation instead of condensation, and Q4 describes surface water instead of infiltration.",
    feedback:
      "Rafael, you have some of the right ideas but stop short. Let's review the water cycle diagram together before the Unit 3 quiz, especially condensation and how groundwater is recharged.",
    answers: [
      answer(
        "Evaporation makes the clouds.",
        0,
        "Names evaporation, which turns liquid water into vapor. The key expects condensation."
      ),
      answer(
        "Heat makes the water go up.",
        1,
        "Mentions heat but does not name the sun as its source, so this earns partial credit."
      ),
      answer(
        "Plants drink water and let it out.",
        1,
        "Gets the idea that plants release water, but leaves out vapor and the leaves."
      ),
      answer(
        "Rivers flow into the aquifer and fill it back up.",
        0,
        "Describes surface water flowing in. The key expects infiltration and downward movement through soil and rock."
      ),
      adjusted(
        answer("Cutting down forests.", 1, "Names a human activity without explaining how it changes the water cycle."),
        2,
        "Cutting down forests is a real change to the water cycle, so this earns the two points for a change. Add the effect, less transpiration, for full credit."
      ),
      answer(
        "Because the ocean is salty.",
        1,
        "Gives one idea, salt water, but nothing about frozen or underground water."
      ),
    ],
  },
  {
    assignmentKey: "waterCycleQuiz",
    studentKey: "iris",
    scannedAt: { daysAgo: 12, hour: 15, minute: 29 },
    approvedAt: { daysAgo: 10, hour: 16, minute: 48 },
    confidence: "high",
    overallComment:
      "Excellent quiz. Every answer matches the key except Q4, which names infiltration but not the path down to the aquifer.",
    feedback:
      "Excellent work, Iris. Your irrigation example was specific and accurate. On Q4, finish the path: the water seeps down through soil and rock until it reaches the aquifer.",
    answers: [
      answer(
        "Condensation. The vapor cools and turns back into tiny drops of liquid.",
        2,
        "Names condensation and explains it accurately."
      ),
      answer(
        "The sun's energy heats surface water until it turns into vapor.",
        2,
        "Matches the key: the sun's energy heats surface water into vapor."
      ),
      answer(
        "Water vapor leaves plants through the stomata in their leaves.",
        2,
        "Matches the key, including the stomata."
      ),
      answer(
        "Rain infiltrates into the soil after a storm.",
        1.5,
        "Names infiltration but does not describe the water moving down through soil and rock into the aquifer."
      ),
      answer(
        "Farms pump groundwater for irrigation, so the water table drops.",
        3,
        "Names irrigation and its effect on groundwater, as the key expects."
      ),
      answer(
        "About 97% is salt water and most fresh water is locked in ice caps or deep underground.",
        3,
        "Gives all three ideas: salt water, ice caps, and groundwater."
      ),
    ],
  },
  {
    assignmentKey: "waterCycleQuiz",
    studentKey: "milo",
    scannedAt: { daysAgo: 12, hour: 15, minute: 32 },
    approvedAt: { daysAgo: 10, hour: 16, minute: 55 },
    confidence: "medium",
    overallComment:
      "Full credit on Q1 and Q3. Q4 describes runoff instead of infiltration, and Q2, Q5, and Q6 earn partial credit.",
    feedback:
      "Milo, you are close on most of these. The big one to review is Q4: groundwater is recharged by water soaking down, not by runoff.",
    answers: [
      answer("Condensation happens when the vapor cools.", 2, "Names condensation and links it to cooling vapor."),
      answer(
        "Hot weather makes water dry up.",
        1,
        "Points toward heat, but does not name the sun or say the water becomes vapor."
      ),
      answer(
        "Water evaporating out of plant leaves.",
        2,
        "Describes water leaving the leaves as vapor, which matches the key."
      ),
      answer(
        "Runoff from the storm drains goes into it.",
        0,
        "Describes runoff, which flows over the surface. The key expects water soaking down into the ground."
      ),
      answer(
        "Cities with lots of concrete.",
        2,
        "Points to pavement, a change in the key, but does not say what it does to the water."
      ),
      answer("Oceans are salt water and lots of it is ice.", 2, "Gives two ideas: salt water and ice."),
    ],
  },
];

export const QUIZ_RESULTS: QuizResult[] = [...GRAMMAR_QUIZ, ...WATER_CYCLE_QUIZ];
