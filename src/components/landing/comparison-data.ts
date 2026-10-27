// The comparison behind the landing page's "For judges" section: Markwise next
// to six grading tools, one row per capability. Pure data, safe for tests.
//
// Ground rules (tests/judges.test.ts checks the mechanical ones):
// - Competitor statuses, notes and source links come from research of each
//   company's public pages as of CHECKED_ON. The research network blocked
//   most of these hosts, so many answers rest on search results for the
//   pages rather than the opened pages; the page copy says so. Before
//   relying on the table beyond the hackathon, open each sourceUrl and
//   confirm its status and note.
// - Never upgrade a competitor without a source that shows it. One standard
//   applies to every column: "yes" = documented and available; "partial" =
//   limited, or on some plans only; "no" = documented as absent, or ruled out
//   by the product's documented scope (a hosted service can't run on your
//   computer); anything unconfirmed is "unknown".
// - "unknown" (shown as "Not stated") means nothing was found either way. It
//   is not a "no".
// - Every competitor "yes", "partial" or "no" names the page it rests on,
//   which is the company's own page.
// - Markwise's own column follows the README's "What's real and what's
//   mocked" table, including where Markwise falls short.

export type Status = "yes" | "partial" | "no" | "unknown";

/** The word shown with each status icon. Color is never the only signal. */
export const STATUS_LABELS: Record<Status, string> = {
  yes: "Yes",
  partial: "Partial",
  no: "No",
  unknown: "Not stated",
};

/** What each status means, for the legend above the table. */
export const STATUS_MEANINGS: Record<Status, string> = {
  yes: "Documented and available",
  partial: "In part, or on some plans only",
  no: "Not offered, or ruled out by design",
  unknown: "Nothing found either way",
};

export const STATUSES: readonly Status[] = ["yes", "partial", "no", "unknown"];

/** The date the competitor research reflects. */
export const CHECKED_ON = "October 27, 2026";

export const REPO_URL = "https://github.com/NotMe22221/gradeflow";
/** The click path for judges in the README. */
export const DEMO_SCRIPT_URL = `${REPO_URL}#demo-script-about-3-minutes`;
/** Where Markwise's own column comes from. */
export const REAL_AND_MOCKED_URL = `${REPO_URL}#whats-real-and-whats-mocked`;

export const DIMENSION_KEYS = [
  "essayRubric",
  "handwritten",
  "answerKeyPhoto",
  "approvalGate",
  "evidence",
  "injection",
  "confidence",
  "insights",
  "conferenceBrief",
  "goalPlanner",
  "studyStreaks",
  "lmsSync",
  "freePlan",
  "openLocal",
  "privacyCerts",
] as const;

export type DimensionKey = (typeof DIMENSION_KEYS)[number];

export type Dimension = {
  key: DimensionKey;
  /** The row label in the table. */
  short: string;
  /** The full question each cell answers (shown with the notes). */
  label: string;
  /** A word or two for source links ("Source for handwriting, evidence"). */
  topic: string;
};

export const DIMENSIONS: readonly Dimension[] = [
  {
    key: "essayRubric",
    short: "Rubric scores on typed essays",
    label: "AI drafts rubric scores for typed essays",
    topic: "rubric scores",
  },
  {
    key: "handwritten",
    short: "Handwritten work from a phone photo",
    label: "Grades handwritten work from a phone photo",
    topic: "handwriting",
  },
  {
    key: "answerKeyPhoto",
    short: "Answer key from a photo",
    label: "Reads an answer key from a photo",
    topic: "answer keys",
  },
  {
    key: "approvalGate",
    short: "Teacher approves each grade, enforced",
    label: "Nothing reaches students until the teacher approves each grade (enforced, not just a setting)",
    topic: "teacher approval",
  },
  {
    key: "evidence",
    short: "Quotes the passage behind each score",
    label: "Each score quotes the passage in the student's paper behind it",
    topic: "quoted evidence",
  },
  {
    key: "injection",
    short: "Flags text aimed at the AI grader",
    label: "Flags text in student work that tries to instruct the AI grader (prompt injection)",
    topic: "prompt injection",
  },
  {
    key: "confidence",
    short: "AI confidence to order the review",
    label: "Shows how sure the AI is, to decide what to review first",
    topic: "confidence",
  },
  {
    key: "insights",
    short: "Most-missed questions or criteria",
    label: "Class-wide view of the most-missed questions or criteria",
    topic: "class insights",
  },
  {
    key: "conferenceBrief",
    short: "Parent-conference summary",
    label: "Parent-conference summary from approved grades",
    topic: "conference summaries",
  },
  {
    key: "goalPlanner",
    short: "Student goal-grade planner",
    label: "Students see the exact scores they need to reach a goal grade",
    topic: "goal planning",
  },
  {
    key: "studyStreaks",
    short: "Student study streaks or XP",
    label: "Student study streaks / XP",
    topic: "streaks",
  },
  {
    key: "lmsSync",
    short: "Direct LMS gradebook sync",
    label: "Direct sync with an LMS gradebook (Canvas, Classroom, Schoology, etc.)",
    topic: "LMS sync",
  },
  {
    key: "freePlan",
    short: "Free plan",
    label: "A free plan or free version to start with",
    topic: "free plan",
  },
  {
    key: "openLocal",
    short: "Open source, runs on your computer",
    label: "The source code is public and it runs on your own computer",
    topic: "open source",
  },
  {
    key: "privacyCerts",
    short: "Published student-privacy commitments",
    label: "Published student-privacy commitments or certifications (FERPA/COPPA, Student Privacy Pledge, SOC 2, etc.)",
    topic: "privacy",
  },
];

/** The table's row groups, top to bottom. Together they hold every dimension once. */
export const DIMENSION_GROUPS: readonly { title: string; keys: readonly DimensionKey[] }[] = [
  { title: "Grading", keys: ["essayRubric", "handwritten", "answerKeyPhoto"] },
  { title: "Review and trust", keys: ["approvalGate", "evidence", "injection", "confidence"] },
  { title: "Classes and families", keys: ["insights", "conferenceBrief"] },
  { title: "Students", keys: ["goalPlanner", "studyStreaks"] },
  { title: "Fitting into a school", keys: ["lmsSync", "freePlan", "openLocal", "privacyCerts"] },
];

export type Cell = {
  status: Status;
  /** One short sentence or two: why this status. */
  note: string;
  /** The page the status rests on. Empty only for "unknown" (nothing found). */
  sourceUrl: string;
};

export type Product = {
  key: string;
  name: string;
  /** A shorter name for the column labels repeated inside the table; defaults to `name`. */
  shortName?: string;
  officialUrl: string;
  summary: string;
  cells: Record<DimensionKey, Cell>;
};

/** Markwise's own column, from the README's "What's real and what's mocked". */
export const MARKWISE: Product = {
  key: "markwise",
  name: "Markwise",
  officialUrl: REPO_URL,
  summary:
    "This hackathon project: an AI first pass on typed essays and photographed handwritten tests, where every grade waits for the teacher's approval, plus a student side for goals and study streaks.",
  cells: {
    essayRubric: {
      status: "yes",
      note: "With an API key, Claude drafts a score, a reason and a quote for each rubric criterion; without one, a labelled demo grader runs.",
      sourceUrl: REAL_AND_MOCKED_URL,
    },
    handwritten: {
      status: "yes",
      note: "With an API key, Claude (or GPT-4o) transcribes phone photos and scores each answer against the key; the keyless demo scanner reads only the sample photos.",
      sourceUrl: REAL_AND_MOCKED_URL,
    },
    answerKeyPhoto: {
      status: "yes",
      note: "With an API key, Claude (or GPT-4o) turns a photographed key into rubric lines with points; without one, only the sample key loads.",
      sourceUrl: REAL_AND_MOCKED_URL,
    },
    approvalGate: {
      status: "yes",
      note: "Only Approve & return publishes a grade, and the server checks the approval again. Students never see drafts.",
      sourceUrl: `${REPO_URL}#how-the-approval-gate-works`,
    },
    evidence: {
      status: "yes",
      note: "The AI is asked to quote the line behind each criterion score, highlighted on the paper; a missing quote or one not in the paper is flagged.",
      sourceUrl: REAL_AND_MOCKED_URL,
    },
    injection: {
      status: "yes",
      note: "A heuristic flags text addressed to the grader, and papers are sent as data, not instructions. Rewordings can slip past it.",
      sourceUrl: REAL_AND_MOCKED_URL,
    },
    confidence: {
      status: "partial",
      note: "A high, medium or low label sorts To review. It is the model's own guess, not a calibrated accuracy.",
      sourceUrl: REAL_AND_MOCKED_URL,
    },
    insights: {
      status: "yes",
      note: "A heatmap of each student against each question or criterion, plus Most missed, from approved grades only.",
      sourceUrl: REAL_AND_MOCKED_URL,
    },
    conferenceBrief: {
      status: "yes",
      note: "A one-page brief from approved grades only, marked as a draft to review before sharing; copy it as text to edit. A demo template runs without a key.",
      sourceUrl: REAL_AND_MOCKED_URL,
    },
    goalPlanner: {
      status: "yes",
      note: "A student types a goal like “I need a B”; the score needed on each remaining assignment is calculated in code from approved grades.",
      sourceUrl: REAL_AND_MOCKED_URL,
    },
    studyStreaks: {
      status: "yes",
      note: "Streaks count only the student's own study actions; XP also adds a bonus when a grade is returned. XP never changes a grade, and students can hide it.",
      sourceUrl: REAL_AND_MOCKED_URL,
    },
    lmsSync: {
      status: "no",
      note: "CSV export only. A GradebookExporter interface is ready for a Canvas or Classroom sync, but none is built yet.",
      sourceUrl: REAL_AND_MOCKED_URL,
    },
    freePlan: {
      status: "partial",
      note: "Free to run, but real AI grading uses your own Anthropic API key (OpenAI optional), billed by them. Without keys, labelled demo engines run.",
      sourceUrl: `${REPO_URL}#quick-start`,
    },
    openLocal: {
      status: "partial",
      note: "The code is public on GitHub and runs locally with one-click demo accounts, no sign-up. No open-source license yet.",
      sourceUrl: `${REPO_URL}#quick-start`,
    },
    privacyCerts: {
      status: "no",
      note: "A hackathon demo for synthetic data only. No FERPA or COPPA review, privacy pledge or SOC 2 report.",
      sourceUrl: REAL_AND_MOCKED_URL,
    },
  },
};

/**
 * The six tools compared, from each company's public pages (checked on
 * CHECKED_ON). Statuses, notes and links are verbatim from that research.
 */
export const COMPETITORS: readonly Product[] = [
  {
    key: "gradescope",
    name: "Gradescope",
    officialUrl: "https://www.gradescope.com",
    summary:
      "Gradescope, owned by Turnitin, is an online grading and assessment platform for paper-based, online, bubble-sheet and programming assignments. It offers rubric-based grading and AI-assisted answer grouping.",
    cells: {
      essayRubric: {
        status: "no",
        note: "Documented AI groups multiple-choice and fill-in-the-blank answers on fixed-template PDFs for instructor grading; no score drafting.",
        sourceUrl:
          "https://guides.gradescope.com/hc/en-us/articles/24838908062093-AI-assisted-grading-and-answer-groups",
      },
      handwritten: {
        status: "partial",
        note: "Students submit phone scans; instructors grade them, with AI handwriting grouping on the Institutional license.",
        sourceUrl:
          "https://guides.gradescope.com/hc/en-us/articles/24838908062093-AI-assisted-grading-and-answer-groups",
      },
      answerKeyPhoto: {
        status: "unknown",
        note: "Bubble-sheet keys are entered on an Answer Key page; we found no photo-based key reading.",
        sourceUrl: "https://guides.gradescope.com/hc/en-us/articles/22246010755853",
      },
      approvalGate: {
        status: "partial",
        note: "Grades appear once the instructor publishes the whole assignment; autograder test results show to students by default.",
        sourceUrl: "https://guides.gradescope.com/hc/en-us/articles/22067099093517",
      },
      evidence: {
        status: "unknown",
        note: "Graders score each question beside its region of the scan; we found no passage-quoting feature.",
        sourceUrl:
          "https://guides.gradescope.com/hc/en-us/articles/24838908062093-AI-assisted-grading-and-answer-groups",
      },
      injection: {
        status: "unknown",
        note: "We found no public documentation on flagging instruction-like text in student submissions.",
        sourceUrl:
          "https://guides.gradescope.com/hc/en-us/articles/24838908062093-AI-assisted-grading-and-answer-groups",
      },
      confidence: {
        status: "unknown",
        note: "Instructors review and confirm suggested answer groups. We found no per-group confidence score in the documentation.",
        sourceUrl:
          "https://guides.gradescope.com/hc/en-us/articles/24838908062093-AI-assisted-grading-and-answer-groups",
      },
      insights: {
        status: "yes",
        note: "The Statistics page shows each question's average and how often each rubric item was applied.",
        sourceUrl: "https://guides.gradescope.com/hc/en-us/articles/22059823947917",
      },
      conferenceBrief: {
        status: "unknown",
        note: "We found no parent-conference summary feature in the documentation reviewed.",
        sourceUrl: "https://www.turnitin.com/products/gradescope/",
      },
      goalPlanner: {
        status: "unknown",
        note: "We found no goal-grade planner in Gradescope's documentation.",
        sourceUrl: "",
      },
      studyStreaks: {
        status: "unknown",
        note: "We found no study streaks or XP features in the documentation reviewed.",
        sourceUrl: "",
      },
      lmsSync: {
        status: "partial",
        note: "Canvas, Blackboard, Brightspace, Moodle and Sakai grade sync requires an Institutional license; otherwise grades export as spreadsheets.",
        sourceUrl: "https://guides.gradescope.com/hc/en-us/articles/21589414628493-Do-you-integrate-with-my-school-LMS",
      },
      freePlan: {
        status: "yes",
        note: "The Basic plan is free; features such as LMS grade sync need an Institutional license.",
        sourceUrl: "https://www.gradescope.com/pricing",
      },
      openLocal: {
        status: "no",
        note: "A hosted service used with an account. We found no open-source or self-hosted version.",
        sourceUrl: "https://www.gradescope.com/pricing",
      },
      privacyCerts: {
        status: "yes",
        note: "Gradescope publishes a FERPA compliance statement describing how it handles student education records.",
        sourceUrl: "https://guides.gradescope.com/hc/en-us/articles/21551911210509-Is-Gradescope-FERPA-compliant",
      },
    },
  },
  {
    key: "cograder",
    name: "CoGrader",
    officialUrl: "https://cograder.com/",
    summary:
      "CoGrader is a web-based AI grading assistant for K-12 teachers that drafts rubric scores and feedback on typed and handwritten writing, which teachers review and approve before exporting to their LMS.",
    cells: {
      essayRubric: {
        status: "yes",
        note: "Scores each rubric criterion separately and drafts feedback, using the teacher's rubric or built-in state/AP rubrics.",
        sourceUrl: "https://cograder.com/ai-grading-feedback/",
      },
      handwritten: {
        status: "yes",
        note: "Phone photos (browser QR capture) or copier scans are transcribed and graded against a rubric.",
        sourceUrl: "https://cograder.com/ai-handwritten-grading/",
      },
      answerKeyPhoto: {
        status: "yes",
        note: "Quiz Grader accepts an answer key as an image, PDF, DOCX, or CSV; teacher reviews the extracted key.",
        sourceUrl: "https://intercom.help/cograder/en/articles/12038152-how-to-use-the-quiz-grader-in-cograder",
      },
      approvalGate: {
        status: "yes",
        note: "Vendor states no bulk approval; each submission needs teacher sign-off before feedback reaches students.",
        sourceUrl: "https://cograder.com/content/best-automated-grading-software/",
      },
      evidence: {
        status: "yes",
        note: "Vendor says each criterion score points to quoted lines or passages from the student's writing.",
        sourceUrl: "https://cograder.com/ai-grading-feedback/",
      },
      injection: {
        status: "unknown",
        note: "No public documentation found on prompt-injection flagging. Separate originality checks flag possible AI-generated writing.",
        sourceUrl: "https://intercom.help/cograder/en/articles/11428885-cograder-originality-and-grammar-checks",
      },
      confidence: {
        status: "unknown",
        note: "Not found on CoGrader's own pages; one third-party tutorial mentions a confidence score. Unreadable handwritten names get flagged.",
        sourceUrl: "https://cograder.com/ai-handwritten-grading/",
      },
      insights: {
        status: "yes",
        note: "Insights dashboard shows class average, score distribution, per-criterion breakdown, and an Areas for Growth tab.",
        sourceUrl:
          "https://intercom.help/cograder/en/articles/12260411-trends-and-patterns-cograder-s-insights-and-analytics-dashboard",
      },
      conferenceBrief: {
        status: "unknown",
        note: "No parent-conference summary found. Analytics can generate next-lesson suggestions and a class PowerPoint.",
        sourceUrl:
          "https://intercom.help/cograder/en/articles/12260411-trends-and-patterns-cograder-s-insights-and-analytics-dashboard",
      },
      goalPlanner: {
        status: "unknown",
        note: "No student goal-grade planner found. Product is teacher-focused; a separate free student essay-feedback tool exists.",
        sourceUrl: "https://cograder.com/grade-my-essay/",
      },
      studyStreaks: {
        status: "unknown",
        note: "No streaks, XP, or gamification features found in public materials.",
        sourceUrl: "https://cograder.com/content/online-grading-software/",
      },
      lmsSync: {
        status: "yes",
        note: "Google Classroom import and export on all plans. Full Canvas and Schoology integration on school/district plans.",
        sourceUrl: "https://cograder.com/pricing/",
      },
      freePlan: {
        status: "yes",
        note: "Free Starter plan, limited to 150 submissions a month.",
        sourceUrl: "https://cograder.com/",
      },
      openLocal: {
        status: "no",
        note: "A hosted service used with an account. We found no open-source or self-hosted version.",
        sourceUrl: "https://cograder.com/",
      },
      privacyCerts: {
        status: "yes",
        note: "States FERPA, COPPA, SOPIPA, and NY Ed Law 2-d compliance, SOC 2 attestation, and DPA signing.",
        sourceUrl: "https://cograder.com/ai-transparency-note/",
      },
    },
  },
  {
    key: "brisk",
    name: "Brisk Teaching",
    officialUrl: "https://www.briskteaching.com",
    summary:
      "Brisk Teaching is a Chrome and Edge extension with a web app that adds AI tools for creating lesson materials, drafting feedback on student writing, and reviewing how student work was written, inside Google Docs, Classroom, Canvas and Microsoft apps.",
    cells: {
      essayRubric: {
        status: "partial",
        note: "Opt-in rubric scoring on School/District plans, including Canvas SpeedGrader; most feedback is rubric-aligned comments.",
        sourceUrl: "https://www.briskteaching.com/plans",
      },
      handwritten: {
        status: "partial",
        note: "Accepts uploaded photos of handwritten work for AI feedback; found no documented photo-based scoring workflow.",
        sourceUrl: "https://www.briskteaching.com/post/upload-photos-to-create-lesson-content-and-generate-feedback",
      },
      answerKeyPhoto: {
        status: "unknown",
        note: "Found no documentation on reading an answer key from a photo. The quiz generator creates answer keys.",
        sourceUrl: "https://www.briskteaching.com/ai-tools/quiz-generator",
      },
      approvalGate: {
        status: "partial",
        note: "Feedback stays as drafts until the teacher posts it; Boost student activities give students AI feedback directly.",
        sourceUrl: "https://help.briskteaching.com/hc/en-us/articles/39310182411412",
      },
      evidence: {
        status: "partial",
        note: "Targeted Feedback places draft comments throughout the student's Google Doc. Found no documentation of scores quoting passages.",
        sourceUrl: "https://help.briskteaching.com/hc/en-us/articles/39310182411412",
      },
      injection: {
        status: "unknown",
        note: "Found no documentation. Inspect Writing replays how a document was written, which is a different integrity feature.",
        sourceUrl: "https://www.briskteaching.com/ai-tool/inspect-writing",
      },
      confidence: {
        status: "unknown",
        note: "Found no confidence indicator in the docs. Brisk guidance asks teachers to review all generated feedback.",
        sourceUrl:
          "https://www.briskteaching.com/post/brisk-the-best-ai-essay-grader-for-teachers-to-save-time-this-school-year",
      },
      insights: {
        status: "partial",
        note: "Batch Feedback Insights summarizes class strengths, growth areas and rubric trends; School and District accounts only.",
        sourceUrl: "https://www.briskteaching.com/whats-new",
      },
      conferenceBrief: {
        status: "partial",
        note: "Drafts progress report templates from teacher prompts; found no conference summary built from approved grades.",
        sourceUrl: "https://help.briskteaching.com/hc/en-us/articles/39310176720148-How-To-Create-with-classic-Brisk",
      },
      goalPlanner: {
        status: "unknown",
        note: "Found no grade-goal calculator. Boost has a student Goal Setting writing activity.",
        sourceUrl:
          "https://www.briskteaching.com/post/give-every-student-a-personal-writing-coach-with-boost-writing-activities",
      },
      studyStreaks: {
        status: "unknown",
        note: "Brisk streaks were removed from the new teacher extension. Found no student streak or XP feature in Boost.",
        sourceUrl: "https://help.briskteaching.com/hc/en-us/articles/50804266814356-What-s-changed-in-the-new-Brisk",
      },
      lmsSync: {
        status: "partial",
        note: "Can send rubric scores to Canvas SpeedGrader; elsewhere it works inside Google Docs opened from LMS platforms.",
        sourceUrl:
          "https://help.briskteaching.com/hc/en-us/articles/40443517533588--How-does-Brisk-integrate-with-Canvas",
      },
      freePlan: {
        status: "yes",
        note: "Free teacher plan, with no API key needed.",
        sourceUrl: "https://www.briskteaching.com/faq",
      },
      openLocal: {
        status: "no",
        note: "A hosted service used with an account. We found no open-source or self-hosted version.",
        sourceUrl: "https://www.briskteaching.com/faq",
      },
      privacyCerts: {
        status: "yes",
        note: "States FERPA/COPPA compliance, Student Privacy Pledge, SOC 2, a Common Sense privacy rating and 1EdTech TrustEd Apps.",
        sourceUrl: "https://www.briskteaching.com/privacy",
      },
    },
  },
  {
    key: "magicschool",
    name: "MagicSchool",
    officialUrl: "https://www.magicschool.ai/",
    summary:
      "MagicSchool is a hosted AI platform with 80+ teacher tools (including rubric and writing-feedback generators) and student-facing MagicStudent tools and rooms, sold as Free, Plus and Enterprise plans.",
    cells: {
      essayRubric: {
        status: "yes",
        note: "Class Writing Feedback scores whole-class essays against a teacher rubric, with a score breakdown; free tier is limited.",
        sourceUrl: "https://help.magicschool.ai/en/articles/13540423-class-writing-feedback",
      },
      handwritten: {
        status: "unknown",
        note: "Tools accept image and PDF uploads, but no official documentation found on grading handwritten work from photos.",
        sourceUrl:
          "https://help.magicschool.ai/en/articles/15451993-tips-for-getting-the-best-results-when-uploading-documents",
      },
      answerKeyPhoto: {
        status: "unknown",
        note: "No public documentation found on reading an answer key from a photo for grading.",
        sourceUrl: "",
      },
      approvalGate: {
        status: "partial",
        note: "Class Writing Feedback lets teachers review and edit before sharing; MagicStudent rooms give students AI feedback directly.",
        sourceUrl: "https://help.magicschool.ai/en/articles/13540423-class-writing-feedback",
      },
      evidence: {
        status: "unknown",
        note: "Class Writing Feedback lists 'evidence supporting the scoring'; whether it quotes the student's text is unconfirmed.",
        sourceUrl: "https://help.magicschool.ai/en/articles/13540423-class-writing-feedback",
      },
      injection: {
        status: "unknown",
        note: "A moderation panel flags concerning student inputs; no documentation found on detecting instructions aimed at the grader.",
        sourceUrl: "",
      },
      confidence: {
        status: "unknown",
        note: "No public documentation found of AI confidence indicators on suggested scores or feedback.",
        sourceUrl: "",
      },
      insights: {
        status: "yes",
        note: "Quiz insights show class average and most-missed question; Class Writing Feedback has class-level strengths and growth insights.",
        sourceUrl: "https://www.magicschool.ai/tools/multiple-choice-quiz-assessment",
      },
      conferenceBrief: {
        status: "partial",
        note: "Report Card Comments and family email/newsletter tools draft parent communication from teacher input, not from approved grades.",
        sourceUrl: "https://www.magicschool.ai/tools/report-card-comments",
      },
      goalPlanner: {
        status: "unknown",
        note: "No public documentation found of a student tool showing scores needed to reach a goal grade.",
        sourceUrl: "",
      },
      studyStreaks: {
        status: "unknown",
        note: "A 'Bonus Points for Work Completion' room template exists; no documented streaks or XP system found.",
        sourceUrl: "https://help.magicschool.ai/en/articles/12977657-bonus-points-for-work-completion",
      },
      lmsSync: {
        status: "partial",
        note: "Enterprise Canvas integration supports rooms and SpeedGrader review; Class Writing Feedback imports from Canvas/Schoology; write-back not confirmed.",
        sourceUrl: "https://www.magicschool.ai/integrations",
      },
      freePlan: {
        status: "yes",
        note: "A free plan with limits; paid Plus and Enterprise plans add more.",
        sourceUrl: "https://www.magicschool.ai/pricing",
      },
      openLocal: {
        status: "no",
        note: "A hosted service used with an account. We found no open-source or self-hosted version.",
        sourceUrl: "https://www.magicschool.ai/pricing",
      },
      privacyCerts: {
        status: "yes",
        note: "SOC 2 Type II, iKeepSafe FERPA and COPPA certifications, and Common Sense privacy rating published.",
        sourceUrl: "https://www.magicschool.ai/privacy/trust",
      },
    },
  },
  {
    key: "classroom",
    name: "Google Classroom (with Gemini)",
    shortName: "Google Classroom",
    officialUrl: "https://edu.google.com/workspace-for-education/products/classroom/",
    summary:
      "Google's learning management system for schools, with built-in Gemini tools that help teachers draft rubrics, written feedback, quizzes and class materials.",
    cells: {
      essayRubric: {
        status: "partial",
        note: "Gemini drafts rubrics and essay feedback for teacher review; Google doesn't describe it suggesting scores.",
        sourceUrl:
          "https://workspaceupdates.googleblog.com/2026/02/educators-now-get-help-drafting-personalized-guidance-on-written-assignments-with-AI.html",
      },
      handwritten: {
        status: "no",
        note: "Gemini feedback works only on Google Docs or Word attachments, not photo uploads.",
        sourceUrl: "https://support.google.com/edu/classroom/answer/9093530",
      },
      answerKeyPhoto: {
        status: "unknown",
        note: "Gemini converts rubric photos into Classroom rubrics; no source found for reading answer keys from photos.",
        sourceUrl:
          "https://workspaceupdates.googleblog.com/2026/06/convert-rubric-files-and-images-into-Google-Classroom-rubrics-with-help-from-Gemini.html",
      },
      approvalGate: {
        status: "partial",
        note: "Classroom grades stay teacher-only drafts until returned. Linked Forms quizzes release scores immediately by default.",
        sourceUrl: "https://developers.google.com/workspace/classroom/guides/classroom-api/manage-grades",
      },
      evidence: {
        status: "unknown",
        note: "Gemini drafts feedback text, not scores. No source describes it quoting student passages.",
        sourceUrl:
          "https://workspaceupdates.googleblog.com/2026/02/educators-now-get-help-drafting-personalized-guidance-on-written-assignments-with-AI.html",
      },
      injection: {
        status: "unknown",
        note: "No public documentation found on flagging instructions embedded in student work.",
        sourceUrl: "https://support.google.com/edu/classroom/answer/9093530",
      },
      confidence: {
        status: "unknown",
        note: "No public documentation found of AI confidence indicators in Classroom's Gemini feedback tools.",
        sourceUrl: "https://support.google.com/edu/classroom/answer/9093530",
      },
      insights: {
        status: "yes",
        note: "Google Forms quizzes, used for Classroom quiz assignments, summarize frequently missed questions across the class.",
        sourceUrl: "https://support.google.com/docs/answer/7032287",
      },
      conferenceBrief: {
        status: "partial",
        note: "Gemini's Classroom app (June 2026, users 18+) can summarize students' assignment performance on request; not conference-specific.",
        sourceUrl: "https://workspaceupdates.googleblog.com/2026/06/classroom-app-in-gemini.html",
      },
      goalPlanner: {
        status: "unknown",
        note: "No source found describing a student goal-grade planner in Classroom.",
        sourceUrl: "https://support.google.com/edu/classroom/answer/9582544",
      },
      studyStreaks: {
        status: "unknown",
        note: "No built-in streaks or XP found in Google's Classroom documentation.",
        sourceUrl: "",
      },
      lmsSync: {
        status: "yes",
        note: "Classroom is itself an LMS gradebook. Exporting grades to an SIS requires Education Plus or Teaching & Learning.",
        sourceUrl: "https://support.google.com/edu/classroom/answer/9356369",
      },
      freePlan: {
        status: "yes",
        note: "Core Classroom is free for schools.",
        sourceUrl: "https://support.google.com/edu/classroom/answer/6072460",
      },
      openLocal: {
        status: "no",
        note: "A hosted service used with an account. We found no open-source or self-hosted version.",
        sourceUrl: "https://support.google.com/edu/classroom/answer/6072460",
      },
      privacyCerts: {
        status: "yes",
        note: "Google says Workspace for Education can be used in compliance with FERPA, a commitment in its agreements, and links its COPPA commitments.",
        sourceUrl: "https://cloud.google.com/security/compliance/ferpa",
      },
    },
  },
  {
    key: "essaygrader",
    name: "EssayGrader",
    officialUrl: "https://www.essaygrader.ai/",
    summary:
      "EssayGrader is a hosted AI grading platform for teachers. It drafts rubric-based scores and feedback on student writing, and teachers review the results before sharing them through their LMS.",
    cells: {
      essayRubric: {
        status: "yes",
        note: "Drafts scores and criterion-level feedback on typed essays using custom or library rubrics.",
        sourceUrl: "https://www.essaygrader.ai/tools/paper-grader",
      },
      handwritten: {
        status: "yes",
        note: "Accepts phone photos or scans of handwritten essays, transcribes them, then grades against the rubric.",
        sourceUrl: "https://www.essaygrader.ai/tools/ai-grader",
      },
      answerKeyPhoto: {
        status: "unknown",
        note: "Grading is rubric-based. No documented way to upload a photographed answer key.",
        sourceUrl: "https://www.essaygrader.ai/tools/ai-grader",
      },
      approvalGate: {
        status: "partial",
        note: "Teacher-only accounts; results reach students only when teachers share, export or sync. Per-grade approval enforcement not confirmed.",
        sourceUrl: "https://www.essaygrader.ai/features/feedback-reports",
      },
      evidence: {
        status: "unknown",
        note: "A vendor explainer page mentions quoted evidence in feedback; per-score quoting not confirmed in product documentation.",
        sourceUrl: "https://www.essaygrader.ai/tools/paper-grader",
      },
      injection: {
        status: "unknown",
        note: "Offers AI-writing and plagiarism detection. No documented flagging of text that tries to instruct the AI grader.",
        sourceUrl: "https://www.essaygrader.ai/features/ai-content-detector",
      },
      confidence: {
        status: "unknown",
        note: "We found no documented grading-confidence score for ordering reviews.",
        sourceUrl: "",
      },
      insights: {
        status: "yes",
        note: "Per-assignment table of class scores by rubric criterion, plus score distribution (release notes, May 2026).",
        sourceUrl: "https://www.essaygrader.ai/feature-updates",
      },
      conferenceBrief: {
        status: "unknown",
        note: "No parent-conference summary feature found in public documentation.",
        sourceUrl: "https://www.essaygrader.ai/",
      },
      goalPlanner: {
        status: "no",
        note: "No student accounts, so there is no student-facing goal-grade planner.",
        sourceUrl: "https://www.essaygrader.ai/features/feedback-reports",
      },
      studyStreaks: {
        status: "no",
        note: "No student accounts, so there are no student streaks or XP.",
        sourceUrl: "https://www.essaygrader.ai/features/feedback-reports",
      },
      lmsSync: {
        status: "partial",
        note: "Integrates with Google Classroom, Canvas (grade sync to SpeedGrader) and Schoology; LMS sync may be limited to paid plans.",
        sourceUrl: "https://www.essaygrader.ai/features/canvas-lms-integration",
      },
      freePlan: {
        status: "yes",
        note: "A free Basic tier with a monthly essay limit.",
        sourceUrl: "https://www.essaygrader.ai/pricing",
      },
      openLocal: {
        status: "no",
        note: "A hosted service used with an account. We found no open-source or self-hosted version.",
        sourceUrl: "https://www.essaygrader.ai/pricing",
      },
      privacyCerts: {
        status: "yes",
        note: "Vendor states FERPA and COPPA compliance and signs data privacy agreements (DPAs) with schools and districts.",
        sourceUrl: "https://help.essaygrader.ai/en-us/article/privacy-security-overview-h67oig/",
      },
    },
  },
];

/** Markwise first, then the competitors: the table's columns. */
export const PRODUCTS: readonly Product[] = [MARKWISE, ...COMPETITORS];

/** A product's source pages, each with the dimensions it backs, in row order. */
export function sourcesFor(product: Product): { url: string; keys: DimensionKey[] }[] {
  const byUrl = new Map<string, DimensionKey[]>();
  for (const key of DIMENSION_KEYS) {
    const url = product.cells[key].sourceUrl;
    if (!url) continue;
    const keys = byUrl.get(url);
    if (keys) keys.push(key);
    else byUrl.set(url, [key]);
  }
  return [...byUrl].map(([url, keys]) => ({ url, keys }));
}

/** "Rubric scores, handwriting, quoted evidence": what one source page backs. */
export function topicsOf(keys: readonly DimensionKey[]): string {
  const text = keys.map((key) => DIMENSIONS.find((dimension) => dimension.key === key)?.topic ?? key).join(", ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The host of a source link, without "www.", for display next to the link. */
export function hostOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}
