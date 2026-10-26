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
| Class colors | `--class-blue/green/purple/teal/orange/pink` | class banners and avatars only (`classTheme()` in `src/lib/ui/class-theme.ts`) |

- **Type:** Roboto for text. Figtree (an open stand-in for Google Sans) for
  headings: `h1`–`h3` and `.font-display` use it automatically. Page titles are
  26–28px medium; card titles 16px semibold; body 14–15px.
- **Shape:** cards `rounded-xl` (12px), large containers and banners
  `rounded-2xl` (16px), dialogs 28px, buttons and nav items fully rounded
  (pills), inputs 8px.
- **Elevation:** resting cards are flat with a border. Use `hover:shadow-hover`
  on clickable cards and `shadow-raised` for menus and dialogs.
- **Spacing:** 8pt rhythm (Tailwind 2/4/6/8/12/16). Content max width `max-w-6xl`.
- **Icons:** lucide, 18–20px, outline style (close to Material Symbols outlined).

## Components

- `Button` variants: `default` (filled, the one primary action per area),
  `tonal` (secondary emphasis), `outline`, `text` (primary-colored text
  button), `ghost` (neutral icon buttons), `destructive`. Sizes: default 40px,
  `sm` 32px, `lg` 48px, `icon` 40px.
- `src/components/classroom/`: `ClassBanner` (Stream header), `ClassCardBanner`
  (Home class cards), `ClassAvatar` (colored initial circle), `PageTabs`
  (underline link tabs), `ClassTabBar` + `TeacherClassTabs` / `StudentClassTabs`.
- App shell (`src/components/app-shell/`): 64px top app bar with menu button,
  logo, engine status, and account menu. The left drawer has pill items and the
  class list ("Teaching" / "Enrolled"). It collapses to an icon rail on desktop
  and becomes a sheet on phones.

## Page patterns

**Teacher**

| Route | Classroom equivalent | Content |
| --- | --- | --- |
| `/dashboard` (Home) | Home | Greeting, stat strip, teaching tools, class cards (banner, upcoming work, "N to review", footer actions) |
| `/classes` | Home class grid | Class cards + "Create class" |
| `/classes/[id]` | Stream | `ClassBanner`; left column "Upcoming" card; activity stream (assignments posted, grades returned, scans, AI drafts) |
| `/classes/[id]/classwork` | Classwork | "+ Create" menu (Assignment / Handwritten test); assignment rows with icon circle, title, due date; expandable details with Turned in / Assigned / Graded counts |
| `/classes/[id]/people` | People | Teachers and Students sections with primary-colored headings and underline; add student; rows link to student profiles |
| `/classes/[id]/grades` | Grades | Spreadsheet gradebook; AI drafts in *italic* as "Draft"; Missing in red; CSV export |
| `/classes/[id]/students/[sid]` | (student profile) | Stats, strengths, conference brief |
| `/assignments/[id]` | Assignment → Student work / Instructions | Big Turned in / Assigned / Graded counts, student list with statuses and grades, AI first pass, review links |
| `/review` (To review) | Grading tool | Student list rail, paper, grade panel; "Approve & return" publishes |
| `/scan`, `/insights`, `/gradebook` | — | Same visual language |

**Student**

| Route | Classroom equivalent | Content |
| --- | --- | --- |
| `/student` (Home) | Home | XP + streak strip at the top, class cards, the assignment inbox, the goal planner |
| `/student/todo` | To-do | Tabs Assigned / Missing / Done, grouped by due date |
| `/student/classes/[id]` | Stream | Banner, upcoming work, class activity |
| `/student/classes/[id]/classwork` | Classwork | Assignment list |
| `/student/classes/[id]/people` | People | Teacher and classmates |
| `/student/assignments/[id]` | Assignment | Details and instructions on the left. On the right, a **Your work** card: status, add work (paste / .txt), "Turn in", the returned grade |

## Words

Use Classroom's vocabulary where it fits: Stream, Classwork, People, Grades,
To review, To-do, Turned in, Assigned, Missing, Returned, Your work, Turn in,
Draft grade. Our approval action is **Approve & return**: the teacher approves
the grade and returns it to the student. It still publishes only through the
approval gate. **Send back** asks for a revision.
