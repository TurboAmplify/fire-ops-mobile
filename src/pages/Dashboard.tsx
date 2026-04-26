import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  Flame, Plus, ScanLine, ChevronRight, Settings,
  Truck, Users, ClipboardList, CheckCircle2, ShieldCheck, HelpCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useIncidents } from "@/hooks/useIncidents";
import { useTrucks } from "@/hooks/useFleet";
import { useCrewMembers } from "@/hooks/useCrewMembers";
import { useNeedsList } from "@/hooks/useNeedsList";
import { ShiftTicketQuickAccess } from "@/components/shift-tickets/ShiftTicketQuickAccess";
import { InspectionDueBanner } from "@/components/fleet/InspectionDueBanner";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useTutorial } from "@/hooks/useTutorial";
import type { LucideIcon } from "lucide-react";

export default function Dashboard() {
  const [showTickets, setShowTickets] = useState(false);
  const navigate = useNavigate();
  const { data: incidents, isLoading: loadingIncidents, error: incidentsError } = useIncidents();
  const { data: trucks, isLoading: loadingTrucks, error: trucksError } = useTrucks();
  const { data: crew, isLoading: loadingCrew, error: crewError } = useCrewMembers();
  const { data: needsItems, isLoading: loadingNeeds } = useNeedsList();
  const { isPlatformAdmin } = usePlatformAdmin();
  const { start: startTutorial } = useTutorial();

  const activeIncidents = incidents?.filter((i) => i.status === "active") ?? [];
  const activeCount = activeIncidents.length;
  const truckCount = trucks?.length ?? 0;
  const crewCount = crew?.filter((c) => c.active).length ?? 0;

  const overviewError = incidentsError || trucksError || crewError;

  const unpurchasedNeeds = (needsItems ?? []).filter((n: any) => !n.is_purchased);

  return (
    <AppShell title="FireOps HQ" headerRight={
      <>
        {isPlatformAdmin && (
          <button
            onClick={() => navigate("/super-admin")}
            className="flex items-center gap-1 h-9 min-w-[44px] px-3 rounded-full bg-primary/15 text-primary text-[11px] font-semibold active:bg-primary/25 transition-colors"
            aria-label="Open Super Admin"
          >
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            <span>Super</span>
          </button>
        )}
        <button
          onClick={startTutorial}
          className="flex items-center justify-center h-11 w-11 rounded-full active:bg-secondary transition-colors"
          aria-label="Replay tutorial"
        >
          <HelpCircle className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
        </button>
        <button
          onClick={() => navigate("/settings")}
          className="flex items-center justify-center h-11 w-11 rounded-full active:bg-secondary transition-colors"
          aria-label="Open settings"
        >
          <Settings className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </>
    }>
      {/* Subtle mesh gradient background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[hsl(8_85%_52%/0.04)] blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] rounded-full bg-[hsl(220_80%_55%/0.03)] blur-[100px]" />
      </div>

      <div className="px-4 pt-4 space-y-3 pb-6">
        {/* Inspection alerts */}
        <InspectionDueBanner />


        <section>
          <h2 className="mb-3 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-[0.15em] px-0.5">
            Overview
          </h2>
          {overviewError ? (
            <div className="rounded-2xl glass-tile p-4 text-center">
              <p className="text-xs text-destructive font-medium">Couldn't load overview.</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Pull to refresh or check your connection.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <StatCard icon={Flame} label="Active" value={activeCount} loading={loadingIncidents} iconColor="text-destructive" onClick={() => navigate("/incidents")} />
              <StatCard icon={Users} label="Crew" value={crewCount} loading={loadingCrew} iconColor="text-violet-500" onClick={() => navigate("/crew")} />
              <StatCard icon={Truck} label="Fleet" value={truckCount} loading={loadingTrucks} iconColor="text-blue-500" onClick={() => navigate("/fleet")} />
            </div>
          )}
        </section>

        {/* Active Incidents - vertical stacked list */}
        <section>
          <div className="flex items-center justify-between mb-3 px-0.5">
            <h2 className="text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-[0.15em]">
              Active Incidents
            </h2>
            {incidents && incidents.length > 0 && (
              <Link to="/incidents" className="text-xs font-semibold text-primary flex items-center gap-0.5">
                See All <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>

          {loadingIncidents ? (
            <div className="rounded-2xl glass-tile p-5">
              <div className="h-3 w-32 bg-muted/60 rounded animate-pulse mx-auto" />
            </div>
          ) : activeIncidents.length === 0 ? (
            <div className="rounded-2xl glass-tile p-5 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 mx-auto mb-2">
                <Flame className="h-5 w-5 text-emerald-500" strokeWidth={1.75} />
              </div>
              <p className="text-sm font-semibold">All Clear</p>
              <p className="text-xs text-muted-foreground mt-0.5">No active incidents</p>
            </div>
          ) : (
            <div className="rounded-2xl glass-tile divide-y divide-border/30">
              {activeIncidents.map((inc) => (
                <Link
                  key={inc.id}
                  to={`/incidents/${inc.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 transition-all duration-150 active:bg-secondary/50 first:rounded-t-2xl last:rounded-b-2xl"
                >
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
                  </span>
                  <p className="flex-1 min-w-0 font-semibold text-[13px] truncate">
                    {inc.name}
                    <span className="text-muted-foreground font-normal mx-1.5">·</span>
                    <span className="text-muted-foreground font-normal text-[12px]">{inc.location}</span>
                  </p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Glow divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent shadow-[0_0_8px_hsl(8_85%_52%/0.08)]" />

        {/* Quick Actions */}
        <section>
          <h2 className="mb-3 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-[0.15em] px-0.5">
            Quick Actions
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <QuickAction icon={ClipboardList} label="Shift Ticket" iconBg="bg-blue-500/15" iconColor="text-blue-500" onClick={() => setShowTickets(true)} />
            <QuickAction icon={ScanLine} label="Scan Receipt" iconBg="bg-emerald-500/15" iconColor="text-emerald-500" onClick={() => navigate("/expenses/batch-scan")} />
            <QuickAction icon={Plus} label="New Incident" iconBg="bg-destructive/15" iconColor="text-destructive" onClick={() => navigate("/incidents/new")} />
          </div>
        </section>

        {/* Needs List Preview */}
        <section>
          <div className="flex items-center justify-between mb-3 px-0.5">
            <h2 className="text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-[0.15em]">
              Needs List
            </h2>
            <Link to="/needs" className="text-xs font-semibold text-primary flex items-center gap-0.5">
              View All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {loadingNeeds ? (
            <div className="rounded-2xl glass-tile p-5">
              <div className="h-3 w-24 bg-muted/60 rounded animate-pulse mx-auto" />
            </div>
          ) : unpurchasedNeeds.length === 0 ? (
            <div className="rounded-2xl glass-tile p-5 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 mx-auto mb-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" strokeWidth={1.75} />
              </div>
              <p className="text-sm font-semibold">All Stocked</p>
              <p className="text-xs text-muted-foreground mt-0.5">Nothing on the list</p>
            </div>
          ) : (
            <div className="rounded-2xl glass-tile divide-y divide-border/30">
              {unpurchasedNeeds.slice(0, 3).map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/15 shrink-0">
                    <ClipboardList className="h-3.5 w-3.5 text-amber-500" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">{item.title}</p>
                  </div>
                </div>
              ))}
              {unpurchasedNeeds.length > 3 && (
                <Link to="/needs" className="flex items-center justify-center py-2.5 text-xs font-semibold text-primary">
                  +{unpurchasedNeeds.length - 3} more items
                </Link>
              )}
            </div>
          )}
        </section>
      </div>
      <ShiftTicketQuickAccess open={showTickets} onOpenChange={setShowTickets} />
    </AppShell>
  );
}

function QuickAction({ icon: Icon, label, iconBg, iconColor, onClick }: { icon: LucideIcon; label: string; iconBg: string; iconColor: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1 rounded-2xl glass-tile p-3 transition-all duration-150 active:scale-[0.97] active:opacity-80 touch-target"
    >
      <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} strokeWidth={1.75} />
      </div>
      <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
    </button>
  );
}

function StatCard({ icon: Icon, label, value, loading, iconColor, onClick }: { icon: LucideIcon; label: string; value: number; loading?: boolean; iconColor: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl glass-tile p-2.5 flex flex-col items-center gap-0.5 transition-all duration-150 active:scale-[0.97] active:opacity-80 touch-target"
    >
      <Icon className={`h-3.5 w-3.5 ${iconColor}`} strokeWidth={1.75} />
      {loading ? (
        <span className="h-5 w-6 my-0.5 rounded bg-muted/60 animate-pulse" />
      ) : (
        <span className="text-base font-bold leading-tight">{value}</span>
      )}
      <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
    </button>
  );
}
