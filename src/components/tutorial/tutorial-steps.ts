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
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

export interface TutorialStep {
  id: string;
  icon: LucideIcon;
  iconColor: string;
  /** Tailwind gradient classes for the hero illustration tile (e.g. "from-destructive/20 to-destructive/5"). */
  gradient: string;
  title: string;
  /** Short intro paragraph. */
  body: string;
  /** Scannable bullets — "What you can do here". */
  bullets?: string[];
  /** Optional callout shown in a highlighted box. */
  proTip?: string;
  /** Route for "Take me there" CTA. Tutorial minimizes when tapped. */
  route?: string;
  ctaLabel?: string;
  /** True for steps that only matter to admins/owners. */
  adminOnly?: boolean;
  /** Marker for the special interactive checklist step. */
  kind?: "checklist";
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    icon: Flame,
    iconColor: "text-destructive",
    gradient: "from-destructive/25 via-destructive/10 to-transparent",
    title: "Welcome to FireOps HQ",
    body: "Your field-ready tool for running incidents, crews, trucks, and expenses — built for use during active wildfire operations.",
    bullets: [
      "Designed for one-handed use in the field",
      "Works offline — syncs when you reconnect",
      "Take 60 seconds to learn the layout",
    ],
  },
  {
    id: "dashboard",
    icon: LayoutDashboard,
    iconColor: "text-primary",
    gradient: "from-primary/25 via-primary/10 to-transparent",
    title: "Dashboard",
    body: "Your home base. Active incidents, crew on duty, fleet status — all in one glance.",
    bullets: [
      "Tap any stat to drill in",
      "Quick actions for the most common tasks",
      "Shopping needs surface here too",
    ],
    route: "/",
    ctaLabel: "Show me",
  },
  {
    id: "incidents",
    icon: Siren,
    iconColor: "text-destructive",
    gradient: "from-destructive/25 via-orange-500/10 to-transparent",
    title: "Incidents",
    body: "Create an incident, then assign trucks and crew. Everything else ties back to it.",
    bullets: [
      "Track location, acres, containment",
      "Assign multiple trucks per incident",
      "Drives shift tickets and expenses",
    ],
    proTip: "Got an Emergency Equipment Rental Agreement PDF? Upload it and we'll auto-create the incident.",
    route: "/incidents",
    ctaLabel: "Open Incidents",
  },
  {
    id: "shift-tickets",
    icon: ClipboardList,
    iconColor: "text-amber-500",
    gradient: "from-amber-500/25 via-amber-500/10 to-transparent",
    title: "Shift Tickets",
    body: "Daily OF-297 tickets per truck. Auto-fills from the incident and supports digital signatures.",
    bullets: [
      "Personnel hours auto-calculated",
      "Sign on-screen with finger or stylus",
      "Generate official OF-297 PDF",
    ],
    proTip: "Drafts save automatically — you won't lose work if you lose signal mid-ticket.",
    route: "/shift-tickets/log",
    ctaLabel: "View Ticket Log",
  },
  {
    id: "crew",
    icon: Users,
    iconColor: "text-violet-500",
    gradient: "from-violet-500/25 via-violet-500/10 to-transparent",
    title: "Crew",
    body: "Manage personnel, contacts, qualifications, and roles. Assign crew to trucks and incidents.",
    bullets: [
      "Store quals (FFT2, ENGB, etc.)",
      "Track training and certifications",
      "Quick contact by tap-to-call",
    ],
    route: "/crew",
    ctaLabel: "Open Crew",
  },
  {
    id: "fleet",
    icon: Truck,
    iconColor: "text-blue-500",
    gradient: "from-blue-500/25 via-blue-500/10 to-transparent",
    title: "Fleet",
    body: "Track every truck — photos, inspections, service history, all in one place.",
    bullets: [
      "Daily inspections with templates",
      "Service log with mileage tracking",
      "Document storage (registration, insurance)",
    ],
    proTip: "Snap a photo of the VIN plate and AI fills in make, model, and year automatically.",
    route: "/fleet",
    ctaLabel: "Open Fleet",
  },
  {
    id: "expenses",
    icon: Receipt,
    iconColor: "text-emerald-500",
    gradient: "from-emerald-500/25 via-emerald-500/10 to-transparent",
    title: "Expenses",
    body: "Snap a receipt and AI categorizes it. Tag to an incident or truck. Submit and approve from one place.",
    bullets: [
      "Batch-scan a stack of receipts at once",
      "Auto-categorize fuel, meals, supplies",
      "Submit for review and approval",
    ],
    proTip: "Use Batch Scan after a long shift — drop in 20 receipts and let the AI do the data entry.",
    route: "/expenses",
    ctaLabel: "Open Expenses",
  },
  {
    id: "needs",
    icon: ListChecks,
    iconColor: "text-orange-500",
    gradient: "from-orange-500/25 via-orange-500/10 to-transparent",
    title: "Needs List",
    body: "What does the crew need on the fire? Add it, mark it purchased when it arrives.",
    bullets: [
      "Shared shopping list everyone sees",
      "Tag to a specific truck or person",
      "Check off as items are bought",
    ],
    route: "/needs",
    ctaLabel: "Open Needs",
  },
  {
    id: "offline",
    icon: WifiOff,
    iconColor: "text-muted-foreground",
    gradient: "from-muted via-muted/40 to-transparent",
    title: "Works Offline",
    body: "Lost signal? Keep working. Your changes queue locally and sync automatically when you're back online.",
    bullets: [
      "Create incidents, tickets, expenses offline",
      "Photos upload once you reconnect",
      "Banner shows pending sync count",
    ],
  },
  {
    id: "checklist",
    kind: "checklist",
    icon: CheckCircle2,
    iconColor: "text-primary",
    gradient: "from-primary/25 via-emerald-500/10 to-transparent",
    title: "You're ready",
    body: "Knock out these three to get the most out of FireOps HQ. We'll check them off as you go.",
  },
];

/**
 * Returns the step list filtered for the user's role.
 * Members get the same 10 steps for now (no admin-only steps yet),
 * but this hook gives us a single place to evolve role-based ordering.
 */
export function getStepsForRole(role: string | null | undefined): TutorialStep[] {
  const isAdmin = role === "admin" || role === "owner";
  if (isAdmin) return TUTORIAL_STEPS;
  // Members: drop steps explicitly flagged adminOnly (none today, future-proof).
  return TUTORIAL_STEPS.filter((s) => !s.adminOnly);
}
