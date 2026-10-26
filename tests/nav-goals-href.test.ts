import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { STUDENT_NAV, TEACHER_NAV } from "@/components/app-shell/nav-items";
import {
  activeNavId,
  hashOf,
  hashTargetId,
  isInPageHref,
  isPlainClick,
  pathOf,
  searchOf,
} from "@/components/app-shell/nav-model";
import { createRevealRequests, REVEAL_REQUEST_TTL_MS } from "@/components/app-shell/reveal-request";
import { GOAL_PLANNER_HREF, GOAL_PLANNER_ID, pagesFor } from "@/lib/search/catalog";
import { modifierLabel, paletteShortcut, searchShortcutHint } from "@/lib/search/shortcut";

describe("href parts", () => {
  it("splits path, query and hash the way location reports them", () => {
    assert.equal(pathOf("/student#goal-planner"), "/student");
    assert.equal(pathOf("/dashboard?customize=1"), "/dashboard");
    assert.equal(pathOf("?x=1"), "/");
    assert.equal(searchOf("/dashboard?customize=1"), "?customize=1");
    assert.equal(searchOf("/review?assignment=a&s=b#top"), "?assignment=a&s=b");
    assert.equal(searchOf("/student#goal-planner"), "");
    assert.equal(searchOf("/student?"), "");
    // A "?" after the hash belongs to the hash.
    assert.equal(searchOf("/student#a?b"), "");
    assert.equal(hashOf("/student#goal-planner"), "#goal-planner");
    assert.equal(hashOf("/student"), "");
    assert.equal(hashOf("/student#"), "");
  });

  it("names the element a hash points at", () => {
    assert.equal(hashTargetId("#goal-planner"), "goal-planner");
    assert.equal(hashTargetId("#caf%C3%A9"), "café");
    assert.equal(hashTargetId("#%E0%A4%A"), "%E0%A4%A");
    assert.equal(hashTargetId("#"), "");
    assert.equal(hashTargetId(""), "");
  });
});

describe("in-page links", () => {
  const home = { pathname: "/student", search: "" };

  it("treat Home and Goals on student Home as the same page", () => {
    assert.ok(isInPageHref("/student", home));
    assert.ok(isInPageHref(GOAL_PLANNER_HREF, home));
    assert.ok(isInPageHref(GOAL_PLANNER_HREF, { pathname: "/student", search: "?" }));
  });

  it("send other pages, and other views of the same path, through the router", () => {
    assert.ok(!isInPageHref("/student/todo", home));
    assert.ok(!isInPageHref(GOAL_PLANNER_HREF, { pathname: "/student/todo", search: "" }));
    // The review queue opened on one paper is a different view from the queue.
    assert.ok(!isInPageHref("/review", { pathname: "/review", search: "?assignment=a1" }));
    // Arrange Home on Home changes the query, so the server sees ?customize=1.
    assert.ok(!isInPageHref("/dashboard?customize=1", { pathname: "/dashboard", search: "" }));
  });

  it("only take over plain clicks, never ones that open a new tab", () => {
    assert.ok(isPlainClick({ button: 0 }));
    assert.ok(isPlainClick({}));
    assert.ok(!isPlainClick({ button: 1 }));
    assert.ok(!isPlainClick({ button: 0, metaKey: true }));
    assert.ok(!isPlainClick({ button: 0, ctrlKey: true }));
    assert.ok(!isPlainClick({ button: 0, shiftKey: true }));
    assert.ok(!isPlainClick({ button: 0, altKey: true }));
    assert.ok(!isPlainClick({ button: 0, defaultPrevented: true }));
  });
});

describe("Goals destination", () => {
  it("is the goal planner's section on student Home, from the nav and from search", () => {
    assert.equal(GOAL_PLANNER_HREF, `/student#${GOAL_PLANNER_ID}`);
    assert.equal(STUDENT_NAV.find((item) => item.id === "goals")?.href, GOAL_PLANNER_HREF);
    assert.equal(pagesFor("STUDENT").find((page) => page.key === "page:goals")?.href, GOAL_PLANNER_HREF);
  });

  it("is current only while the URL names the planner (it drops the hash when scrolled away)", () => {
    assert.equal(activeNavId(STUDENT_NAV, "/student", `#${GOAL_PLANNER_ID}`), "goals");
    assert.equal(activeNavId(STUDENT_NAV, "/student", ""), "home");
    // Without Goals in the nav (planner hidden), Home is what the page is.
    const withoutGoals = STUDENT_NAV.filter((item) => item.id !== "goals");
    assert.equal(activeNavId(withoutGoals, "/student", `#${GOAL_PLANNER_ID}`), "home");
  });

  it("keeps the stable bottom-bar names", () => {
    assert.deepEqual(
      TEACHER_NAV.filter((item) => item.bottom).map((item) => item.label),
      ["Home", "Classes", "To review", "Gradebook"]
    );
    assert.deepEqual(
      STUDENT_NAV.filter((item) => item.bottom).map((item) => item.label),
      ["Home", "To-do", "Classes", "Goals"]
    );
  });
});

describe("reveal requests", () => {
  it("wait for their own section, once, and go stale", () => {
    let now = 1_000;
    const requests = createRevealRequests(() => now);
    requests.request(GOAL_PLANNER_ID);
    assert.ok(!requests.has("other"));
    assert.ok(!requests.take("other"));
    assert.ok(requests.has(GOAL_PLANNER_ID));
    assert.ok(requests.take(GOAL_PLANNER_ID));
    // Used up: a later remount (Home re-arranged) doesn't reveal again.
    assert.ok(!requests.take(GOAL_PLANNER_ID));

    requests.request(GOAL_PLANNER_ID);
    now += REVEAL_REQUEST_TTL_MS + 1;
    assert.ok(!requests.has(GOAL_PLANNER_ID));
    assert.ok(!requests.take(GOAL_PLANNER_ID));
  });

  it("are cleared by a navigation somewhere else", () => {
    const requests = createRevealRequests(() => 0);
    requests.request(GOAL_PLANNER_ID);
    requests.request("");
    assert.ok(!requests.has(GOAL_PLANNER_ID));
    requests.request(GOAL_PLANNER_ID);
    requests.clear();
    assert.ok(!requests.take(GOAL_PLANNER_ID));
  });
});

describe("search shortcut", () => {
  const body = { tagName: "BODY", getAttribute: () => null, closest: () => null };
  const closed = { paletteOpen: false, overlayOpen: false };

  it("is Ctrl/Cmd+K only: no single character key opens search", () => {
    for (const key of ["/", "k", "K", "s", "?"]) {
      assert.equal(paletteShortcut({ key, target: body }, closed), null, key);
    }
    assert.equal(paletteShortcut({ key: "k", ctrlKey: true, target: body }, closed), "open");
    assert.equal(paletteShortcut({ key: "k", metaKey: true, target: body }, closed), "open");
  });

  it("is hinted as Ctrl K or ⌘K", () => {
    assert.equal(searchShortcutHint(modifierLabel("Win32")), "Ctrl K");
    assert.equal(searchShortcutHint(modifierLabel("MacIntel")), "⌘K");
    assert.equal(searchShortcutHint(modifierLabel(undefined)), "Ctrl K");
  });
});
