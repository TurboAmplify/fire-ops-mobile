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

export interface TutorialHighlight {
  /** Percent strings ("12%") for absolute positioning over the screenshot. */
  top: string;
  left: string;
  width: string;
  height: string;
  /** Caption rendered under the screenshot, e.g. "Tap here to create an incident". */
  label?: string;
}

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
  /** Optional screenshot path under /public, e.g. "/tutorial/incidents.png". */
  screenshot?: string;
  /** Optional highlight overlay drawn on top of the screenshot. */
  highlight?: TutorialHighlight;
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
    proTip: "The bottom nav is your fastest way around — tap and hold on More to see everything.",
    route: "/",
    ctaLabel: "Show me",
    screenshot: "/tutorial/dashboard.png",
    highlight: {
      // Quick Actions row
      top: "37%",
      left: "3%",
      width: "94%",
      height: "12%",
      label: "Quick actions sit front and center",
    },
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
    proTip: "Tap any incident to assign trucks and crew, then jump straight into shift tickets.",
    route: "/incidents",
    ctaLabel: "Open Incidents",
    screenshot: "/tutorial/incidents.png",
    highlight: {
      // "+ New" button top-right
      top: "1.5%",
      left: "76%",
      width: "22%",
      height: "5.5%",
      label: "Tap +New to start an incident",
    },
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
    screenshot: "/tutorial/shift-tickets.png",
    highlight: {
      // First ticket row
      top: "15%",
      left: "3%",
      width: "94%",
      height: "11%",
      label: "Tap any ticket to edit, sign, or export",
    },
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
    proTip: "Tap a crew member's phone number to call directly from the field.",
    route: "/crew",
    ctaLabel: "Open Crew",
    screenshot: "/tutorial/crew.png",
    highlight: {
      // "+ Add" button
      top: "1.5%",
      left: "76%",
      width: "22%",
      height: "5.5%",
      label: "Tap +Add to add a crew member",
    },
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
    proTip: "Tap a truck card to see inspections, service log, photos, and documents in one place.",
    route: "/fleet",
    ctaLabel: "Open Fleet",
    screenshot: "/tutorial/fleet.png",
    highlight: {
      // First truck card
      top: "15%",
      left: "3%",
      width: "94%",
      height: "14%",
      label: "Tap a truck to dive into details",
    },
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
    screenshot: "/tutorial/expenses.png",
    highlight: {
      // "Scan" button
      top: "1.5%",
      left: "55%",
      width: "20%",
      height: "5.5%",
      label: "Tap Scan to capture receipts with the camera",
    },
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
    proTip: "Tag items to a truck so the buyer knows where everything goes.",
    route: "/needs",
    ctaLabel: "Open Needs",
    screenshot: "/tutorial/needs.png",
    highlight: {
      // "+ Add" button
      top: "1.5%",
      left: "76%",
      width: "22%",
      height: "5.5%",
      label: "Tap +Add to put something on the list",
    },
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
