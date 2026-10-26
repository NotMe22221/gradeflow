#!/usr/bin/env node
// Captures the real product screenshots shown on the landing page.
//
//   node scripts/capture-screenshots.mjs [baseUrl]      (default http://localhost:3100)
//
// Needs a running, seeded GradeSmart AI server and Playwright (it is not a
// project dependency; any global install that `require("playwright")` finds
// works). For each theme (light, dark) it signs in through the landing page's
// demo buttons, captures desktop (1280px) and phone (390px) screens at 2x, and
// encodes them as WebP under 380 KB each. Only when every capture has worked
// does it write public/landing/*.webp and their sizes and alt text to
// src/components/landing/screenshots.ts (so the page reserves the space and
// nothing shifts). Run it again after any UI change.
//
// Safe to re-run. The only thing it creates is its own assignment in English 10
// (ASSIGNMENT_TITLE): it loads the demo sample papers into it and runs the AI
// first pass so To review has drafts. It never approves, returns or edits a
// grade, and it reuses that assignment on later runs. Everything else it shows
// is read as is: the Paper Scanner with a sample photo loaded (not graded),
// Ava's home and a grade she already got back, and Milo's To-do and saved goal.

import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("Playwright is required: npm i -g playwright && npx playwright install chromium");
  process.exit(1);
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public/landing");
const MANIFEST = join(ROOT, "src/components/landing/screenshots.ts");
const BASE = (process.argv[2] ?? "http://localhost:3100").replace(/\/+$/, "");

const ASSIGNMENT_TITLE = "Persuasive Essay: Should Cedar Ridge Start the Day Later?";
const CLASS_NAME = "English 10";
const GOAL_STUDENT = "Milo Brightwater";
const VIEWPORT = { width: 1280, height: 800 };
const SCALE = 2;
/** Files stay under this size; quality steps down until they fit. */
const MAX_BYTES = 380 * 1024;
const THEMES = ["light", "dark"];

const log = (...args) => console.log("[capture]", ...args);

// ---------------------------------------------------------------------------
// Helpers

async function settle(page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  // Fonts and late images, then one more frame.
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForTimeout(400);
}

async function goto(page, path) {
  await page.goto(BASE + path);
  await settle(page);
}

/**
 * Pin the look for a capture: the theme being shot, and the default accent,
 * text size and density, whatever the demo account saved. Only this browser
 * tab changes; nothing is saved.
 */
async function pinAppearance(page, theme) {
  await page.evaluate((theme) => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-accent", "blue");
    root.setAttribute("data-text-size", "default");
    root.setAttribute("data-density", "comfortable");
    root.style.colorScheme = theme;
  }, theme);
  // Hide toasts, focus rings and the caret.
  await page.addStyleTag({
    content:
      "[data-sonner-toaster]{display:none!important} *{caret-color:transparent!important} :focus,:focus-visible{outline:none!important;box-shadow:none!important}",
  });
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null));
  await page.mouse.move(0, VIEWPORT.height - 1);
  await page.waitForTimeout(250);
}

async function signInAs(page, role) {
  await goto(page, "/");
  const name = role === "teacher" ? /^view the demo/i : /^see the student view/i;
  await page.getByRole("button", { name }).first().click();
  await page.waitForURL(role === "teacher" ? /\/dashboard/ : /\/student/, { timeout: 30_000 });
  await settle(page);
}

/** The teacher's account menu, "Demo: view as a student", then that student. */
async function viewAsStudent(page, studentName) {
  await page.getByRole("button", { name: /account menu/i }).first().click();
  await page.getByRole("menuitem", { name: new RegExp(studentName) }).first().click();
  await page.waitForURL(/\/student/, { timeout: 30_000 });
  await settle(page);
}

async function findClassPath(page, className) {
  await goto(page, "/classes");
  const hrefs = await page
    .locator("a[href^='/classes/']")
    .evaluateAll((links, name) =>
      links
        .filter((link) => (link.textContent ?? "").includes(name))
        .map((link) => link.getAttribute("href"))
        .filter((href) => /^\/classes\/[^/]+$/.test(href ?? "")),
      className
    );
  if (!hrefs[0]) throw new Error(`Could not find the class "${className}" on /classes.`);
  return hrefs[0];
}

async function isVisible(locator) {
  return locator.first().isVisible().catch(() => false);
}

/**
 * Our own assignment with AI drafts waiting in To review. Creates it on the
 * first run (template, title, sample papers, AI first pass) and reuses it
 * afterwards. Returns the To review URL for it.
 */
async function ensureDraftsToReview(page) {
  const classPath = await findClassPath(page, CLASS_NAME);
  await goto(page, `${classPath}/classwork`);
  // Rows are buttons named by the title (plus the date and counts).
  const row = page.getByRole("button", { name: ASSIGNMENT_TITLE });
  if (await isVisible(row)) {
    log("Reusing", ASSIGNMENT_TITLE);
    await row.first().click();
    await page.getByRole("link", { name: /view assignment/i }).first().click();
    await page.waitForURL(/\/assignments\/[^/]+$/);
    await settle(page);
  } else {
    log("Creating", ASSIGNMENT_TITLE);
    await goto(page, `${classPath}/assignments/new`);
    const named = page.getByRole("combobox", { name: /template/i });
    await ((await isVisible(named)) ? named : page.getByRole("combobox")).first().click();
    await page.getByRole("option", { name: /persuasive/i }).first().click();
    await page.waitForTimeout(300);
    await page.getByLabel("Title", { exact: true }).first().fill(ASSIGNMENT_TITLE);
    await page.getByRole("button", { name: /^create assignment/i }).first().click();
    await page.waitForURL((url) => /\/assignments\/[^/]+$/.test(url.pathname) && !url.pathname.endsWith("/new"), {
      timeout: 30_000,
    });
    await settle(page);
  }

  const reviewLink = page.getByRole("link", { name: /^review \d+ papers?/i });
  if (!(await isVisible(reviewLink))) {
    const run = page.getByRole("button", { name: /run ai first pass on/i });
    if (!(await isVisible(run))) {
      const load = page.getByRole("button", { name: /load sample papers/i });
      if (!(await isVisible(load))) {
        throw new Error("The capture assignment has nothing to review and no sample papers to load.");
      }
      await load.first().click();
      await run.first().waitFor({ timeout: 30_000 });
    }
    log("Running the AI first pass");
    await run.first().click();
    await reviewLink.first().waitFor({ timeout: 180_000 });
    await settle(page);
  }
  const href = await reviewLink.first().getAttribute("href");
  if (!href) throw new Error("The Review link has no href.");
  return href;
}

/**
 * Open To review on our assignment, on the paper that makes the clearest
 * picture: no "addressed to the grader" flag, high confidence if there is one.
 */
async function openCleanPaper(page, reviewPath) {
  await goto(page, reviewPath);
  const candidates = [];
  for (let index = 0; index < 6; index += 1) {
    const text = await page.locator("main").innerText();
    const flagged = /addressed to the grader/i.test(text);
    const high = /high confidence/i.test(text);
    candidates.push({ url: page.url(), score: (flagged ? 0 : 2) + (high ? 1 : 0) });
    const next = page.getByRole("button", { name: /^next paper/i });
    if (!(await isVisible(next)) || (await next.first().isDisabled())) break;
    const before = page.url();
    await next.first().click();
    await page.waitForURL((url) => url.href !== before, { timeout: 10_000 }).catch(() => {});
    await settle(page);
    if (candidates.some((candidate) => candidate.url === page.url())) break;
  }
  const best = candidates.reduce((a, b) => (b.score > a.score ? b : a), candidates[0]);
  if (best.url !== page.url()) {
    await page.goto(best.url);
    await settle(page);
  }
  return best.url;
}

/** Bottom of the sticky app bar (0 if there is none), in viewport pixels. */
async function appBarBottom(page) {
  return page.evaluate(() => {
    for (const header of document.querySelectorAll("header")) {
      const style = getComputedStyle(header);
      if (style.position === "sticky" || style.position === "fixed") {
        const rect = header.getBoundingClientRect();
        if (rect.top <= 0 && rect.width > window.innerWidth / 2) return rect.bottom;
      }
    }
    return 0;
  });
}

/**
 * The card around an element: the nearest ancestor that is rounded and has a
 * border or a fill of its own, so a crop shows whole cards whatever the markup.
 */
async function cardOf(locator) {
  const handle = await locator.first().evaluateHandle((element) => {
    let node = element;
    while (node && node !== document.body) {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      const rounded = (parseFloat(style.borderTopLeftRadius) || 0) >= 8;
      const bordered = (parseFloat(style.borderTopWidth) || 0) > 0 && style.borderTopStyle !== "none";
      const filled = style.backgroundColor !== "rgba(0, 0, 0, 0)" && style.backgroundColor !== "transparent";
      if (rounded && (bordered || filled) && rect.width >= 240 && rect.height >= 120) return node;
      node = node.parentElement;
    }
    return element;
  });
  return handle.asElement();
}

/** Scroll the page so `element` sits just under the app bar. */
async function scrollUnderAppBar(page, element, gap = 24) {
  const bar = await appBarBottom(page);
  await element.evaluate((node, offset) => {
    const top = node.getBoundingClientRect().top;
    window.scrollBy({ top: top - offset, behavior: "instant" });
  }, bar + gap);
  await page.waitForTimeout(200);
}

/** Scroll the card around `anchor` under the app bar; if the anchor is gone (a UI change), shoot from the top. */
async function scrollToCard(page, anchor) {
  if (!(await isVisible(anchor))) {
    log("Warning: anchor not found, capturing from the top:", anchor.toString());
    return;
  }
  await scrollUnderAppBar(page, await cardOf(anchor), 16);
}

/** Union of element boxes plus a margin, kept inside the viewport (CSS pixels). */
async function clipAround(page, elements, pad = 24) {
  const boxes = (await Promise.all(elements.map((element) => element.boundingBox()))).filter(Boolean);
  if (boxes.length === 0) throw new Error("Nothing to clip.");
  const viewport = page.viewportSize();
  const left = Math.max(0, Math.min(...boxes.map((b) => b.x)) - pad);
  const top = Math.max(0, Math.min(...boxes.map((b) => b.y)) - pad);
  const right = Math.min(viewport.width, Math.max(...boxes.map((b) => b.x + b.width)) + pad);
  const bottom = Math.min(viewport.height, Math.max(...boxes.map((b) => b.y + b.height)) + pad);
  return { x: Math.round(left), y: Math.round(top), width: Math.round(right - left), height: Math.round(bottom - top) };
}

/** The visible part of <main>, under the app bar. */
async function mainClip(page) {
  const bar = await appBarBottom(page);
  const box = await page.locator("main").first().boundingBox();
  const viewport = page.viewportSize();
  const x = Math.max(0, Math.round(box?.x ?? 0));
  const y = Math.max(Math.round(bar), Math.round(box?.y ?? 0));
  return { x, y, width: viewport.width - x, height: viewport.height - y };
}

// ---------------------------------------------------------------------------
// Encoding: Chromium's canvas writes WebP, so no image library is needed.

let encoderPage;
async function encodeWebp(png, cssWidth) {
  const src = `data:image/png;base64,${png.toString("base64")}`;
  for (const scale of [1, 0.85, 0.7]) {
    for (const quality of [0.86, 0.8, 0.72, 0.64]) {
      const result = await encoderPage.evaluate(
        async ({ src, scale, quality }) => {
          const image = new Image();
          image.src = src;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(image.naturalWidth * scale);
          canvas.height = Math.round(image.naturalHeight * scale);
          const context = canvas.getContext("2d");
          context.imageSmoothingQuality = "high";
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/webp", quality);
          return { base64: dataUrl.slice(dataUrl.indexOf(",") + 1), width: canvas.width, height: canvas.height };
        },
        { src, scale, quality }
      );
      const bytes = Buffer.from(result.base64, "base64");
      if (bytes.length <= MAX_BYTES) return { bytes, width: result.width, height: result.height, cssWidth };
    }
  }
  throw new Error(`Could not get a ${cssWidth}px screenshot under ${MAX_BYTES} bytes.`);
}

// ---------------------------------------------------------------------------
// Captures

const DESKTOP = { viewport: VIEWPORT, deviceScaleFactor: SCALE };
/** A phone, a little shorter than a full screen so the shots sit well on the page. */
const PHONE = { viewport: { width: 390, height: 720 }, deviceScaleFactor: SCALE, isMobile: true, hasTouch: true };

/** id -> { width, height, cssWidth } from the first theme, so every theme matches. */
const sizes = new Map();
/** id -> alt text, written to the manifest. */
const ALT = {
  review:
    "To review in GradeSmart AI: a student's persuasive essay with the quotes used as evidence highlighted, the suggested score, and the Send back and Approve & return buttons.",
  reviewPhone:
    "To review on a phone: a student's persuasive essay with highlighted evidence, the suggested score, and the Send back and Approve & return buttons.",
  collect:
    "The Paper Scanner on a phone: a photo of a handwritten quiz added as page 1, with buttons to use the camera or upload more pages.",
  firstPass:
    "The grade panel in To review: a suggested score for each rubric criterion, each backed by a quote from the paper, with the score boxes ready to edit.",
  returned:
    "A student's view of a returned quiz: the grade 14 out of 16, who approved it and when, and the teacher's private comment.",
  studentHome:
    "A student's home screen on a phone: a welcome line, a 4-day study streak, XP toward the next level, and their classes.",
  studentTodo:
    "A student's To-do on a phone: Assigned, Missing and Done tabs, with a lab report due this week and a reflection due later.",
  studentGoal:
    "The goal planner on a phone: the student wrote “I need a B” and the planner shows the score needed on each remaining assignment.",
  teacherHome: "The teacher Home screen on a phone: a greeting, this week's numbers and the classes.",
};

/** "firstPass", "dark" -> "first-pass-dark.webp" */
function fileNameFor(id, theme) {
  return `${id.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}-${theme}.webp`;
}

async function shoot(page, id, theme, clip) {
  const png = await page.screenshot({ type: "png", clip, animations: "disabled" });
  const cssWidth = clip ? clip.width : page.viewportSize().width;
  const encoded = await encodeWebp(png, cssWidth);
  const fileName = fileNameFor(id, theme);
  files.set(fileName, encoded.bytes);
  if (!sizes.has(id)) sizes.set(id, { width: encoded.width, height: encoded.height, cssWidth });
  log(`${fileName} ${encoded.width}x${encoded.height} ${(encoded.bytes.length / 1024).toFixed(0)} KB`);
}

/** Encoded files, written only once every capture has worked, so a failed run changes nothing. */
const files = new Map();

/** Crop rectangles from the first theme; later themes reuse them so light and dark match exactly. */
const clips = new Map();
function sameClip(id, clip) {
  if (!clip) return clip;
  if (!clips.has(id)) clips.set(id, clip);
  const first = clips.get(id);
  return { ...clip, width: first.width, height: first.height };
}

async function newContext(browser, theme, device) {
  return browser.newContext({
    ...device,
    colorScheme: theme,
    reducedMotion: "reduce",
    locale: "en-US",
    timezoneId: "America/New_York",
  });
}

async function captureTeacher(browser, theme, reviewPath) {
  const context = await newContext(browser, theme, DESKTOP);
  const page = await context.newPage();
  try {
    await signInAs(page, "teacher");

    // Hero: To review, the whole window.
    const paperUrl = await openCleanPaper(page, reviewPath);
    await pinAppearance(page, theme);
    await shoot(page, "review", theme);

    // Step 2: the grade panel, scrolled to the first criterion, a little taller.
    await page.setViewportSize({ width: VIEWPORT.width, height: 880 });
    await settle(page);
    await pinAppearance(page, theme);
    // Anchor on the first score box: scroll its criterion near the top of the
    // panel's scroller (keeping the rubric heading just above it in view), and crop
    // the whole panel, sticky header and footer included.
    const score = await cardOf(page.getByRole("spinbutton"));
    const panel = await score.evaluateHandle((card) => {
      let node = card.parentElement;
      while (node && node !== document.body) {
        const style = getComputedStyle(node);
        if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) {
          // A sticky header inside the scroller (the grade summary) covers its top edge.
          const top = node.getBoundingClientRect().top;
          const covered = [...node.querySelectorAll("*")]
            .filter((el) => getComputedStyle(el).position === "sticky" && el.getBoundingClientRect().top <= top + 4)
            .reduce((bottom, el) => Math.max(bottom, el.getBoundingClientRect().bottom), top);
          node.scrollTop += card.getBoundingClientRect().top - covered - 52;
          const parent = node.parentElement;
          return parent && Math.abs(parent.getBoundingClientRect().width - node.getBoundingClientRect().width) < 4
            ? parent
            : node;
        }
        node = node.parentElement;
      }
      return card;
    });
    await page.waitForTimeout(200);
    const panelClip = await clipAround(page, [panel.asElement()], 0);
    await shoot(page, "firstPass", theme, sameClip("firstPass", panelClip));
    await page.setViewportSize(VIEWPORT);
    return paperUrl;
  } finally {
    await context.close();
  }
}

async function captureStudent(browser, theme, paperUrl) {
  // Desktop: a grade Ava already got back (step 3).
  const context = await newContext(browser, theme, DESKTOP);
  const page = await context.newPage();
  try {
    await signInAs(page, "student");
    await goto(page, "/student/todo?tab=done");
    const quiz = page.getByRole("link", { name: /Grammar and Vocabulary Quiz 1/ });
    if (!(await isVisible(quiz))) {
      await page.getByRole("tab", { name: /^Done/ }).or(page.getByRole("link", { name: /^Done/ })).first().click();
      await settle(page);
    }
    await quiz.first().click();
    await page.waitForURL(/\/student\/assignments\//);
    await settle(page);
    await pinAppearance(page, theme);
    const yourWorkHeading = page.getByText(/^Your work$/);
    let clip;
    if (await isVisible(yourWorkHeading)) {
      // The Your work card (grade, who approved it) and the teacher's comment under it.
      const yourWork = await cardOf(yourWorkHeading);
      const comments = page.getByText(/^Private comments$/);
      const cards = [yourWork];
      if (await isVisible(comments)) cards.push(await cardOf(comments));
      await scrollUnderAppBar(page, yourWork);
      clip = await clipAround(page, cards);
    } else {
      log("Warning: no Your work card, capturing the page");
      clip = await mainClip(page);
    }
    await shoot(page, "returned", theme, sameClip("returned", clip));
  } finally {
    await context.close();
  }

  // Phone: Ava's home (streak); the teacher's Home and the Paper Scanner; Milo's To-do and goal.
  const phone = await newContext(browser, theme, PHONE);
  const mobile = await phone.newPage();
  try {
    await signInAs(mobile, "student");
    await goto(mobile, "/student");
    await pinAppearance(mobile, theme);
    await shoot(mobile, "studentHome", theme);

    // The teacher's Home (shown in light and dark side by side).
    await signInAs(mobile, "teacher");
    await pinAppearance(mobile, theme);
    await shoot(mobile, "teacherHome", theme);

    // The hero on phones: the same paper in To review.
    await mobile.goto(paperUrl);
    await settle(mobile);
    await pinAppearance(mobile, theme);
    await shoot(mobile, "reviewPhone", theme);

    // Step 1: the Paper Scanner with a sample photo added. Nothing is graded.
    await goto(mobile, "/scan");
    await mobile.getByRole("button", { name: /use a sample photo/i }).first().click();
    await mobile.getByRole("menuitem", { name: /Iris Thistledown/ }).first().click();
    await mobile
      .locator("main img")
      .first()
      .waitFor({ timeout: 15_000 })
      .catch(() => {});
    await settle(mobile);
    await scrollToCard(mobile, mobile.getByText(/^Test pages$/));
    await pinAppearance(mobile, theme);
    await shoot(mobile, "collect", theme);

    // Milo (seeded): work due this week and later, and his saved goal.
    await viewAsStudent(mobile, GOAL_STUDENT);
    await goto(mobile, "/student/todo");
    await pinAppearance(mobile, theme);
    await shoot(mobile, "studentTodo", theme);

    await goto(mobile, "/student");
    await scrollToCard(mobile, mobile.getByRole("heading", { name: /goal planner/i }));
    await pinAppearance(mobile, theme);
    await shoot(mobile, "studentGoal", theme);
  } finally {
    await phone.close();
  }
}

function manifestSource() {
  const entries = [...sizes.entries()]
    .map(([id, size]) =>
      [
        `  ${id}: {`,
        `    light: "/landing/${fileNameFor(id, "light")}",`,
        `    dark: "/landing/${fileNameFor(id, "dark")}",`,
        `    width: ${size.width},`,
        `    height: ${size.height},`,
        `    cssWidth: ${size.cssWidth},`,
        `    alt: ${JSON.stringify(ALT[id])},`,
        `  },`,
      ].join("\n")
    )
    .join("\n");
  return `// Generated by scripts/capture-screenshots.mjs from the running app. Do not edit by hand:
// re-run the script after a UI change (it rewrites the images and these sizes).

export type Screenshot = {
  /** WebP for each theme, in /public. */
  light: string;
  dark: string;
  /** Pixel size of the file (the frame reserves this aspect ratio). */
  width: number;
  height: number;
  /** Width it was taken at, in CSS pixels: shown no larger, so it is never upscaled. */
  cssWidth: number;
  alt: string;
};

export const SCREENSHOTS = {
${entries}
} as const satisfies Record<string, Screenshot>;

export type ScreenshotId = keyof typeof SCREENSHOTS;
`;
}

// ---------------------------------------------------------------------------

const browser = await chromium.launch();
try {
  encoderPage = await (await browser.newContext()).newPage();

  const prepContext = await newContext(browser, "light", DESKTOP);
  const prepPage = await prepContext.newPage();
  await signInAs(prepPage, "teacher");
  const reviewPath = await ensureDraftsToReview(prepPage);
  await prepContext.close();
  log("Drafts to review at", reviewPath);

  for (const theme of THEMES) {
    log(`--- ${theme}`);
    const paperUrl = await captureTeacher(browser, theme, reviewPath);
    await captureStudent(browser, theme, paperUrl);
  }

  await mkdir(OUT_DIR, { recursive: true });
  for (const [fileName, bytes] of files) await writeFile(join(OUT_DIR, fileName), bytes);
  await writeFile(MANIFEST, manifestSource());
  log(`Wrote ${files.size} files to ${OUT_DIR} and their sizes to ${MANIFEST}`);
} finally {
  await browser.close();
}
