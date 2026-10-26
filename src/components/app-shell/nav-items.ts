import {
  Camera,
  ChartColumn,
  ClipboardCheck,
  House,
  ListTodo,
  Table2,
  type IconComponent,
} from "@/components/icons";

export type NavItem = {
  href: string;
  label: string;
  icon: IconComponent;
  /** Key for a live count badge supplied by the layout. */
  countKey?: "review" | "todo";
  /** Extra paths that also mark this item active. */
  matches?: string[];
};

/** Teacher drawer, in Google Classroom's order: Home, To review, tools. */
export const TEACHER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/review", label: "To review", icon: ClipboardCheck, countKey: "review" },
  { href: "/scan", label: "Paper Scanner", icon: Camera },
  { href: "/gradebook", label: "Gradebook", icon: Table2 },
  { href: "/insights", label: "Insights", icon: ChartColumn },
];

/** Student drawer: Home and To-do, then enrolled classes. */
export const STUDENT_NAV: NavItem[] = [
  { href: "/student", label: "Home", icon: House },
  { href: "/student/todo", label: "To-do", icon: ListTodo, countKey: "todo" },
];

export type DrawerClass = { id: string; name: string; section: string | null };
