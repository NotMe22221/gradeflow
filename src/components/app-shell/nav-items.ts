import {
  Camera,
  ChartColumn,
  FactCheck,
  Flag,
  GraduationCap,
  House,
  ListChecks,
  Table2,
  type IconComponent,
} from "@/components/icons";

import type { NavMatchable } from "@/components/app-shell/nav-model";
import { GOAL_PLANNER_HREF } from "@/lib/search/catalog";

export type NavCountKey = "review" | "todo";

export type NavItem = NavMatchable & {
  label: string;
  /** For the rail, where labels sit under icons in 80px ("Scanner"). */
  shortLabel?: string;
  icon: IconComponent;
  /** Key for a live count badge supplied by the layout. */
  countKey?: NavCountKey;
  /** One of the 3-5 destinations in the phone bottom bar. */
  bottom?: boolean;
};

/** What a badge count means, for screen readers ("To review, 3 waiting"). */
export const COUNT_LABELS: Record<NavCountKey, (count: number) => string> = {
  review: (count) => `${count} waiting`,
  todo: (count) => `${count} to do`,
};

/**
 * Teacher destinations. The phone bar keeps the four daily ones (Home,
 * Classes, To review, Gradebook); Paper Scanner and Insights stay one tap
 * away in the menu, the rail and the drawer. An assignment page belongs to
 * Classes.
 */
export const TEACHER_NAV: NavItem[] = [
  { id: "home", href: "/dashboard", label: "Home", icon: House, bottom: true },
  { id: "classes", href: "/classes", label: "Classes", icon: GraduationCap, matches: ["/assignments/"], bottom: true },
  { id: "review", href: "/review", label: "To review", icon: FactCheck, countKey: "review", bottom: true },
  { id: "scan", href: "/scan", label: "Paper Scanner", shortLabel: "Scanner", icon: Camera },
  { id: "gradebook", href: "/gradebook", label: "Gradebook", icon: Table2, bottom: true },
  { id: "insights", href: "/insights", label: "Insights", icon: ChartColumn },
];

/** Student destinations: Home, To-do, Classes and Goals (the goal planner on Home). */
export const STUDENT_NAV: NavItem[] = [
  { id: "home", href: "/student", label: "Home", icon: House, exact: true, bottom: true },
  { id: "todo", href: "/student/todo", label: "To-do", icon: ListChecks, countKey: "todo", bottom: true },
  {
    id: "classes",
    href: "/student/classes",
    label: "Classes",
    icon: GraduationCap,
    matches: ["/student/assignments/"],
    bottom: true,
  },
  { id: "goals", href: GOAL_PLANNER_HREF, label: "Goals", icon: Flag, bottom: true },
];

export type DrawerClass = { id: string; name: string; section: string | null };
