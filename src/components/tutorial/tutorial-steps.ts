import {
  Flame,
  LayoutDashboard,
  Siren,
  ClipboardList,
  Users,
  Truck,
  Receipt,
  ListChecks,
  WifiOff,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

export interface TutorialStep {
  id: string;
  icon: LucideIcon;
  iconColor: string;
  title: string;
  body: string;
  route?: string;
  ctaLabel?: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    icon: Flame,
    iconColor: "text-destructive",
    title: "Welcome to FireOps HQ",
    body: "Your field-ready tool for running incidents, crews, trucks, and expenses — built for use during active wildfire operations.",
  },
  {
    id: "dashboard",
    icon: LayoutDashboard,
    iconColor: "text-primary",
    title: "Dashboard",
    body: "Your home base. See active incidents, crew on duty, fleet status, and jump straight into your most-used actions.",
    route: "/",
    ctaLabel: "Show me",
  },
  {
    id: "incidents",
    icon: Siren,
    iconColor: "text-destructive",
    title: "Incidents",
    body: "Create an incident, then assign trucks and crew. Everything else (shift tickets, expenses, time) ties back to it.",
    route: "/incidents",
    ctaLabel: "Open Incidents",
  },
  {
    id: "shift-tickets",
    icon: ClipboardList,
    iconColor: "text-amber-500",
    title: "Shift Tickets",
    body: "Daily OF-297 tickets per truck. Auto-fills from the incident, captures personnel hours, and supports digital signatures.",
    route: "/shift-tickets/log",
    ctaLabel: "View Ticket Log",
  },
  {
    id: "crew",
    icon: Users,
    iconColor: "text-violet-500",
    title: "Crew",
    body: "Manage your personnel, contacts, qualifications, and roles. Assign crew to trucks and incidents.",
    route: "/crew",
    ctaLabel: "Open Crew",
  },
  {
    id: "fleet",
    icon: Truck,
    iconColor: "text-blue-500",
    title: "Fleet",
    body: "Track every truck — photos, inspections, service history. Snap a photo of the VIN plate and AI fills in the details.",
    route: "/fleet",
    ctaLabel: "Open Fleet",
  },
  {
    id: "expenses",
    icon: Receipt,
    iconColor: "text-emerald-500",
    title: "Expenses",
    body: "Snap a receipt and AI categorizes it. Tag to an incident or truck. Submit, review, and approve from one place.",
    route: "/expenses",
    ctaLabel: "Open Expenses",
  },
  {
    id: "needs",
    icon: ListChecks,
    iconColor: "text-orange-500",
    title: "Needs List",
    body: "What does the crew need on the fire? Add it, mark it purchased when it arrives. Simple shared shopping list.",
    route: "/needs",
    ctaLabel: "Open Needs",
  },
  {
    id: "offline",
    icon: WifiOff,
    iconColor: "text-muted-foreground",
    title: "Works Offline",
    body: "Lost signal? Keep working. Your changes queue up locally and sync automatically when you're back online.",
  },
  {
    id: "replay",
    icon: HelpCircle,
    iconColor: "text-primary",
    title: "Replay Anytime",
    body: "Need a refresher? Tap the help icon on the Dashboard, or open Settings → Help → Replay Tutorial.",
  },
];
