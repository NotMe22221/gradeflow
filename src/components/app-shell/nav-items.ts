import { BookOpen, Camera, ChartColumn, Inbox, LayoutDashboard, Table2, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Key for a live count badge supplied by the layout. */
  countKey?: "review";
};

export const TEACHER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/classes", label: "Classes", icon: BookOpen },
  { href: "/scan", label: "Paper Scanner", icon: Camera },
  { href: "/review", label: "Review Queue", icon: Inbox, countKey: "review" },
  { href: "/gradebook", label: "Gradebook", icon: Table2 },
  { href: "/insights", label: "Insights", icon: ChartColumn },
];
