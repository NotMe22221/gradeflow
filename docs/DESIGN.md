# GradeSmart AI design system

GradeSmart AI follows the look and structure of **Google Classroom** (Material 3)
so teachers and students feel at home on day one. We borrow the patterns, not
the branding: no Google logos, product names, or proprietary fonts.

## Foundations

| Token | Value | Use |
| --- | --- | --- |
| Canvas `bg-background` | `#f8fafd` | page background |
| Surface `bg-card` | white | cards, app bar, dialogs |
| Border `border-border` | `#dadce0` | 1px card and divider borders (cards have no resting shadow) |
| Primary `bg-primary` / `text-primary` | `#0b57d0` | filled buttons, links, active tab indicator |
| Secondary container `bg-primary-soft` | `#d3e3fd` on `#041e49` | active nav item, tonal buttons, selected chips |
| Tonal surface `bg-secondary` | `#eef2f8` | segmented controls, info panels |
| Text | `#1f1f1f`, muted `#444746` | |
| Status | success / warning / danger (+ `-soft`) | status only: confidence, flags, missing, published |
| Class colors | `--class-blue/green/purple/teal/orange/pink` | class banners and avatars only (`classTheme()` in `src/lib/ui/class-theme.ts`: `color` is the fill for white text, `accent` is for dots and text on ordinary surfaces) |
| Paper `bg-paper` | white in both themes (slightly dimmed in dark) | student work: papers and photos are never inverted |

These are the light values. `src/app/globals.css` documents every token, its
dark value (Material 3 surfaces: canvas `#131314`, cards `#1e1f20`, menus and
dialogs `#282a2c`, text `#e3e3e3`, primary `#a8c7fa`), the density utilities,
and the `dark:` / `compact:` variants. `tests/theme.test.ts` checks every text
pair at 4.5:1 and every ring and outline at 3:1, in light and dark, for all six
accents.

## Personalization

Every user can change how GradeSmart looks and how Home is arranged. Settings
are saved per user (`UserPreferences`, validated by
`src/lib/preferences/schema.ts`) and rendered on the server as `data-theme`,
`data-accent`, `data-text-size`, and `data-density` on `<html>`, so there is no
flash on load.

- **Theme:** System (default), Light, Dark.
- **Accent:** Blue (default), Teal, Green, Orange, Pink, Slate. Curated, so
  contrast always holds; no free color picker. Status and class colors never
  change with the accent.
- **Text size:** 87.5%, 100%, 112.5%, 125% of the root font size. All text is
  in `rem`.
- **Density:** Comfortable or Compact. Compact tightens list, table, and
  gradebook rows only, never dialogs or forms, and never shrinks a target below
  24px.
- **Arrange Home:** an explicit edit mode (the **Arrange** button on Home, or
  **Customize → Arrange Home** in the account menu). Sections sit in a main and a side column; each
  has a drag handle plus Move up / Move down / Move to the other column / Hide
  buttons (the single-pointer and keyboard path that WCAG 2.5.7 requires).
  Hidden sections wait in a tray with **Show**. Essential sections (the
  teacher's classes, the student's inbox) can move but never hide. **Done**
  saves, **Cancel** discards, **Reset to default** has Undo.
- **Class cards** reorder the same way (Move earlier / later / to start / to
  end), and the drawer's class list follows the order.
- **To review:** the paper can sit on the left or the right.

- **Type:** Roboto for text. Figtree (an open stand-in for Google Sans) for
  headings: `h1`–`h3` and `.font-display` use it automatically. Page titles are
  26–28px medium; card titles 16px semibold; body 14–15px.
- **Shape:** cards `rounded-xl` (12px), large containers and banners
  `rounded-2xl` (16px), dialogs 28px, buttons and nav items fully rounded
  (pills), inputs 8px.
- **Elevation:** resting cards are flat with a border. Use `hover:shadow-hover`
  on clickable cards and `shadow-raised` for menus and dialogs.
- **Spacing:** 8pt rhythm (Tailwind 2/4/6/8/12/16). Content max width `max-w-6xl`.
- **Icons:** Material Symbols Rounded (Apache-2.0), generated into `src/components/icons` by `scripts/build-icons.mjs`. Filled variant for the active state. No "AI" glyphs (sparkles, wands, robots): an icon says what a thing does.
- **Focus:** the `--ring` token is opaque primary (6.4:1 on white). Buttons use
  `ring-2` with a 2px offset; tabs, menu items, and anything inside a scroller
  use an inset ring so it is never clipped. Every page starts with a "Skip to
  main content" link.
- **Contrast:** every class color carries white text at 4.5:1 or better
  (orange is `#a35200`, teal `#00707a`; keep `globals.css` and
  `class-theme.ts` in sync). Banner art sits on the right behind a class-color
  scrim, so text never runs over line art.
- **Layout:** `<main>` is a container (`@container`), so page grids switch on
  the content width (`@3xl`, `@4xl`) rather than the viewport, and the open
  drawer never squeezes a two-column layout.
- **Dates:** due dates are calendar days. "Today", "Due tomorrow", week groups,
  and Missing all use the viewer's time zone (a `tz` cookie set by the
  browser), with one shared past-due rule.

## Components

- `Button` variants: `default` (filled, the one primary action per area),
  `tonal` (secondary emphasis), `outline`, `text` (primary-colored text
  button), `ghost` (neutral icon buttons), `destructive`. Sizes: default 40px,
  `sm` 32px, `lg` 48px, `icon` 40px.
- `src/components/classroom/`: `ClassBanner` (Stream header), `ClassCardBanner`
  (Home class cards), `ClassAvatar` (colored initial circle), `PageTabs`
  (underline link tabs), `ClassTabBar` + `TeacherClassTabs` / `StudentClassTabs`.
- App shell (`src/components/app-shell/`): 64px top app bar with menu button,
  logo, search, engine status, and account menu (with **Customize**).
  Navigation adapts to the width: a bottom bar with 4 labelled destinations
  under 600px, a rail from 600px, and the collapsible drawer with the class
  list from 840px. The active destination has a filled icon, a tonal pill, and
  `aria-current`.
- Search (`src/components/command-palette/`): Ctrl/⌘ K (no single-key
  shortcut, per WCAG 2.1.4). Results are grouped as Classes, Assignments, Students (teachers
  only), Pages, and Actions, built on the server for the signed-in user only.
- Layout editor (`src/components/layout-editor/`): `CustomizableSections` and
  `ArrangeableClassGrid` (dnd-kit with pointer, touch, and keyboard sensors and
  spoken announcements, plus move buttons).
- Customize panel (`src/components/customize/`): a side sheet (bottom sheet on
  phones) with native radio groups; every change previews live.

## Page patterns

**Teacher**

| Route | Classroom equivalent | Content |
| --- | --- | --- |
| `/dashboard` (Home) | Home | Greeting and a "what needs you" notice (fixed), then arrangeable sections: This week, Teaching tools, Your classes (essential), Recently returned, Most missed |
| `/classes` | Home class grid | Class cards (arrangeable order) + "Create class" |
| `/classes/[id]` | Stream | `ClassBanner`; left column "Upcoming" card; activity stream (assignments posted, grades returned, scans, AI drafts) |
| `/classes/[id]/classwork` | Classwork | "+ Create" menu (Assignment / Handwritten test); assignment rows with icon circle, title, due date; expandable details with Turned in / Assigned / Graded counts |
| `/classes/[id]/people` | People | Teachers and Students sections with primary-colored headings and underline; add student; rows link to student profiles |
| `/classes/[id]/grades` | Grades | Spreadsheet gradebook of approved grades only (an AI draft never shows a score: the cell reads "Needs review" and links to To review); Missing in red; CSV export |
| `/classes/[id]/students/[sid]` | (student profile) | Stats, strengths, conference brief |
| `/assignments/[id]` | Assignment → Student work / Instructions | Big Turned in / Assigned / Graded counts, student list with statuses and grades, AI first pass, review links |
| `/review` (To review) | Grading tool | Student list rail, paper (left or right, saved), grade panel with "Suggested score" and "Draft feedback"; "Approve & return" publishes after confirmation; in dark mode the paper stays white with "Dim page" |
| `/scan`, `/insights`, `/gradebook` | — | Same visual language |

**Student**

| Route | Classroom equivalent | Content |
| --- | --- | --- |
| `/student` (Home) | Home | Greeting (fixed), then arrangeable sections: Streak and XP (top by default, can be hidden), Your classes, Assignment inbox (essential), Goal planner |
| `/student/classes` | Class grid | The student's class cards (arrangeable order) |
| `/student/todo` | To-do | Tabs Assigned / Missing / Done, grouped by due date |
| `/student/classes/[id]` | Stream | Banner, upcoming work, class activity |
| `/student/classes/[id]/classwork` | Classwork | Assignment list |
| `/student/classes/[id]/people` | People | Teacher and classmates |
| `/student/assignments/[id]` | Assignment | Details and instructions on the left. On the right, a **Your work** card: status, add work (paste / .txt), "Turn in", the returned grade |

## Words

AI output is named for what it is: "Suggested score", "Draft feedback",
"Draft", with the `edit_note` icon where one is needed; demo engines say
"Demo". Use Classroom's vocabulary where it fits: Stream, Classwork, People, Grades,
To review, To-do, Turned in, Assigned, Missing, Returned, Your work, Turn in.
An AI draft shows its score only inside To review and on the Paper Scanner's
result card right after a scan (both teacher-only, both labelled as a draft).
Every other page shows "Needs review", and students never see it.
Our approval action is **Approve & return**: the teacher approves the grade and
returns it to the student. It still publishes only through the approval gate.
**Send back** asks for a revision.
