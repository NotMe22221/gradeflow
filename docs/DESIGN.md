# Markwise design system

Markwise follows the structure of **Google Classroom** (class cards, Stream /
Classwork / People / Grades, To review, To-do) so teachers and students feel at
home on day one. We borrow the patterns, not the branding: no Google logos,
product names, or proprietary fonts.

The look is **Bold**: bright and maximalist, after flat "paint and pattern"
poster art. A warm cream canvas, big organic paint blobs in sunshine yellow,
coral, mint, sky, pink and lilac bleeding off the edges, X-mark and dot grids,
heavy display type ending in a pink period, full-width color bands, and
**Liquid Glass** buttons and bars. The rule that keeps it usable: **loud frame,
calm content.** Decoration lives at the edges (heroes, page headers, greeting
bands, empty states, marketing sections); papers, rubrics, grades, tables and
forms always sit on plain surfaces. The **Calm** look (Customize → Look) keeps
the colors and glass but drops every shape and turns bands plain.

## Foundations

| Token | Value | Use |
| --- | --- | --- |
| Canvas `bg-background` | `#fbf7ef` (warm cream) | page background |
| Surface `bg-card` | white | cards, dialogs |
| Border `border-border` | `#e6dccb` | 1px card and divider borders |
| Primary `bg-primary` / `text-primary` | `#c2166b` (pink, the default accent) | the one primary action, links, active nav |
| Secondary container `bg-primary-soft` | `#ffd9e4` on `#3f0020` | tonal buttons, selected chips |
| Tonal surface `bg-secondary` | `#f3ece0` | segmented controls, info panels, Calm bands |
| Text | `#1b1814`, muted `#5d564c` | |
| Pop colors `fill-pop-*` / `bg-pop-*` | yellow, coral, mint, sky, pink, lilac | decoration only; marks in `pop-ink`, text on a pop fill in `pop-ink-on` |
| Bands `bg-band-*` | a pop color (Bold), `secondary` (Calm) | full-width sections and greeting bands; text in `text-band-foreground` |
| Status | success / warning / danger (+ `-soft`) | status only: confidence, flags, missing, published |
| Class colors | `--class-blue/green/purple/teal/orange/pink` | class banners and avatars only (`classTheme()` in `src/lib/ui/class-theme.ts`: `color` is the fill for white text, `accent` is for dots and text on ordinary surfaces) |
| Paper `bg-paper` | white in both themes (slightly dimmed in dark) | student work: papers and photos are never inverted |

These are the light values. `src/app/globals.css` documents every token, its
dark value (an ink canvas `#131116`, cards `#1d1a21`, menus and dialogs
`#27232c`, text `#f1ece4`, primary `#ffb0cd`, pop colors toned down a step),
the density utilities, and the `dark:` / `compact:` / `calm:` variants.
`tests/theme.test.ts` checks every text pair at 4.5:1 and every ring and
outline at 3:1, in light and dark, for all six accents, including ink on every
pop color and band.

## Liquid Glass

Glass comes from three utilities in `globals.css`, never hand-rolled (and never
`backdrop-blur` directly):

- `liquid`: tinted glass. `--liquid` (default `--primary`) at 90% over a
  blurred, saturated backdrop, a light rim, a specular sheen on the top half,
  and a soft shadow in its own color. Text stays the token that pairs with the
  tint, so contrast holds whatever is behind it.
- `glass`: frosted card glass (`--glass-frost`, 78% light / 70% dark) for
  outline buttons and floating panels. On a color band, raise the frost
  (`[--glass-frost:92%]`) so the pill doesn't turn muddy.
- `glass-bar`: the sticky app and site bars.

Every `Button` variant uses them: `default` (accent glass), `destructive`,
`tonal`, `secondary`, `outline` (frosted). Without `backdrop-filter`, with
*prefers-reduced-transparency*, or with *prefers-contrast: more*, all three
become solid fills; in forced colors they get a system border.

## Decor

`src/components/decor/`: `Blob` (six organic paint shapes, any pop tone, an
optional slow float), `XGrid`, `DotGrid`, `Squiggle`, `Ring`, and `Period` (a
heading's pink period: type on the canvas, a paint dot on a band). Decor is
`aria-hidden`, ignores the pointer, never prints, stops moving under reduced
motion, and disappears in Calm (`[data-decor]`). Place it inside a
`relative isolate` parent, absolutely, with `-z-10`, clipped so phones never
scroll sideways, and never under text. `PageHeader` takes a `decor` slot
(`HeaderDecor` with two tones) that stays inside the header's box. On a band
with focusable controls, set `[--ring:var(--band-foreground)]` and
`[--background:var(--band-*)]` so focus rings stay visible.

## Personalization

Every user can change how Markwise looks and how Home is arranged. Settings
are saved per user (`UserPreferences`, validated by
`src/lib/preferences/schema.ts`) and rendered on the server as `data-theme`,
`data-accent`, `data-text-size`, `data-density`, and `data-look` on `<html>`,
so there is no flash on load.

- **Theme:** System (default), Light, Dark.
- **Accent:** Pink (default), Blue, Teal, Green, Orange, Slate. Bright but
  curated, so contrast always holds; no free color picker. Status and class
  colors never change with the accent.
- **Look:** Bold (default: shapes, patterns, color bands) or Calm (the same
  colors on plain backgrounds).
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
- **To review:** the paper can sit on the left or the right, and the single-letter
  shortcuts (J, K, A, S, ?) can be turned off in **Keyboard shortcuts** (WCAG
  2.1.4); the arrow keys and buttons always work.

- **Type:** Roboto for text. Figtree (an open stand-in for Google Sans) for
  headings: `h1`–`h3` and `.font-display` use it automatically. Big headings
  use the display utilities (Figtree 800, tight tracking, rem-based clamp):
  `display-hero` (landing heroes), `display-section` (landing sections),
  `display-title` (app page titles, with a pink `Period`). Card titles 16px
  semibold; body 14–15px.
- **Shape:** cards and class cards `rounded-3xl`, bands `rounded-[2rem]`,
  dialogs 28px, buttons and nav items fully rounded (glass pills), inputs 8px.
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
  `class-theme.ts` in sync). Banner line art and paint stay in a right-hand
  box, clear of the class name, so text never runs over art.
- **Layout:** `<main>` is a container (`@container`), so page grids switch on
  the content width (`@3xl`, `@4xl`) rather than the viewport, and the open
  drawer never squeezes a two-column layout.
- **Dates:** due dates are calendar days. "Today", "Due tomorrow", week groups,
  and Missing all use the viewer's time zone (a `tz` cookie set by the
  browser), with one shared past-due rule.

## Components

- `Button` variants (Liquid Glass): `default` (accent glass, the one primary
  action per area), `tonal` (secondary emphasis), `outline` (frosted),
  `secondary`, `text` (primary-colored text button), `ghost` (neutral icon
  buttons), `destructive`. Sizes: default 40px, `sm` 32px, `lg` 48px, `icon`
  40px.
- `src/components/classroom/`: `ClassBanner` (Stream header), `ClassCardBanner`
  (Home class cards), `ClassAvatar` (colored initials circle), `PageTabs`
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
