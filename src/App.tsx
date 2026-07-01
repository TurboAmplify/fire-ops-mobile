import { lazy, Suspense } from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { OrganizationProvider } from "@/hooks/useOrganization";
import { ImpersonationProvider } from "@/hooks/useImpersonation";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TutorialProvider } from "@/hooks/useTutorial";
import { TutorialOverlay } from "@/components/tutorial/TutorialOverlay";
import { TutorialMiniBar } from "@/components/tutorial/TutorialMiniBar";
import { queryClient, asyncPersister } from "@/lib/query-client";
import "@/lib/offline-queue";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteBoundary } from "@/components/RouteBoundary";
import { StuckLoading } from "@/components/StuckLoading";
import { installGlobalErrorHandlers } from "@/lib/error-tracking";

installGlobalErrorHandlers();

// Eagerly loaded — core hot paths used immediately after auth, plus auth screens.
// Keeping these in the main bundle avoids a Suspense flash on the most common entry points.
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import OrgSetup from "./pages/OrgSetup";
import AccountUnavailable from "./pages/AccountUnavailable";
import Dashboard from "./pages/Dashboard";
import Incidents from "./pages/Incidents";
import IncidentDetail from "./pages/IncidentDetail";
import More from "./pages/More";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { ModuleGate, AdminGate, EngineBossGate } from "@/components/ModuleGate";
import { PlatformAdminGate } from "@/components/PlatformAdminGate";

// Lazy-loaded — secondary flows, heavy PDF/xlsx pages, admin & super-admin surfaces.
// These ship as separate chunks so first paint stays fast.
const OrgSettings = lazy(() => import("./pages/OrgSettings"));
const SettingsTrash = lazy(() => import("./pages/SettingsTrash"));

const IncidentCreate = lazy(() => import("./pages/IncidentCreate"));
const IncidentFromAgreement = lazy(() => import("./pages/IncidentFromAgreement"));
const IncidentEdit = lazy(() => import("./pages/IncidentEdit"));
const ShiftTicketCreate = lazy(() => import("./pages/ShiftTicketCreate"));
const ShiftTicketEdit = lazy(() => import("./pages/ShiftTicketEdit"));
const ShiftTicketLog = lazy(() => import("./pages/ShiftTicketLog"));
const Crew = lazy(() => import("./pages/Crew"));
const Crews = lazy(() => import("./pages/Crews"));
const CrewDetail = lazy(() => import("./pages/CrewDetail"));
const Fleet = lazy(() => import("./pages/Fleet"));
const FleetTruckCreate = lazy(() => import("./pages/FleetTruckCreate"));
const FleetTruckDetail = lazy(() => import("./pages/FleetTruckDetail"));
const FleetTruckEdit = lazy(() => import("./pages/FleetTruckEdit"));
const FleetTruckRates = lazy(() => import("./pages/FleetTruckRates"));
const Expenses = lazy(() => import("./pages/Expenses"));
const ExpenseEdit = lazy(() => import("./pages/ExpenseEdit"));
const ExpenseDetail = lazy(() => import("./pages/ExpenseDetail"));
const ExpenseReview = lazy(() => import("./pages/ExpenseReview"));
const BatchReceiptScan = lazy(() => import("./pages/BatchReceiptScan"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Support = lazy(() => import("./pages/Support"));
const Payroll = lazy(() => import("./pages/Payroll"));
const FactoringDashboard = lazy(() => import("./pages/FactoringDashboard"));
const NeedsList = lazy(() => import("./pages/NeedsList"));
const Training = lazy(() => import("./pages/Training"));
const AdminLogs = lazy(() => import("./pages/AdminLogs"));
const AdminReports = lazy(() => import("./pages/AdminReports"));
const AccountsPayable = lazy(() => import("./pages/AccountsPayable"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const SuperAdminOrgs = lazy(() => import("./pages/SuperAdminOrgs"));
const SuperAdminOrgDetail = lazy(() => import("./pages/SuperAdminOrgDetail"));
const SuperAdminUsers = lazy(() => import("./pages/SuperAdminUsers"));
const SuperAdminActivity = lazy(() => import("./pages/SuperAdminActivity"));
const SuperAdminAudit = lazy(() => import("./pages/SuperAdminAudit"));
const SuperAdminErrors = lazy(() => import("./pages/SuperAdminErrors"));
const MessagesInbox = lazy(() => import("./pages/MessagesInbox"));
const ThreadView = lazy(() => import("./pages/ThreadView"));
const MyRedCard = lazy(() => import("./pages/MyRedCard"));

const App = () => (
  <ErrorBoundary scope="root">
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncPersister, maxAge: 1000 * 60 * 60 * 24 }}>
      <AuthProvider>
        <ImpersonationProvider>
          <OrganizationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <TutorialProvider>
              <ImpersonationBanner />
              <TutorialOverlay />
              <TutorialMiniBar />
              <RouteBoundary>
                <Suspense
                  fallback={
                    <StuckLoading
                      label="Loading page…"
                      onRetry={() => {
                        void queryClient.invalidateQueries();
                        window.dispatchEvent(new Event("chunk-retry"));
                      }}
                    />
                  }
                >
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/org-setup" element={<OrgSetup />} />
                    <Route path="/account-unavailable" element={<AccountUnavailable />} />
                    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/incidents" element={<ProtectedRoute><Incidents /></ProtectedRoute>} />
                    <Route path="/incidents/new" element={<ProtectedRoute><EngineBossGate><IncidentCreate /></EngineBossGate></ProtectedRoute>} />
                    <Route path="/incidents/from-agreement" element={<ProtectedRoute><EngineBossGate><IncidentFromAgreement /></EngineBossGate></ProtectedRoute>} />
                    <Route path="/incidents/:incidentId" element={<ProtectedRoute><IncidentDetail /></ProtectedRoute>} />
                    <Route path="/incidents/:incidentId/edit" element={<ProtectedRoute><EngineBossGate><IncidentEdit /></EngineBossGate></ProtectedRoute>} />
                    <Route path="/incidents/:incidentId/trucks/:incidentTruckId/shift-ticket/new" element={<ProtectedRoute><ShiftTicketCreate /></ProtectedRoute>} />
                    <Route path="/incidents/:incidentId/trucks/:incidentTruckId/shift-ticket/:ticketId" element={<ProtectedRoute><ShiftTicketEdit /></ProtectedRoute>} />
                    <Route path="/shift-tickets/log" element={<ProtectedRoute><ShiftTicketLog /></ProtectedRoute>} />
                    <Route path="/crew" element={<ProtectedRoute><Crew /></ProtectedRoute>} />
                    <Route path="/crews" element={<ProtectedRoute><Crews /></ProtectedRoute>} />
                    <Route path="/crews/:crewId" element={<ProtectedRoute><CrewDetail /></ProtectedRoute>} />
                    <Route path="/fleet" element={<ProtectedRoute><Fleet /></ProtectedRoute>} />
                    <Route path="/fleet/rates" element={<ProtectedRoute><AdminGate><ModuleGate module="payroll"><FleetTruckRates /></ModuleGate></AdminGate></ProtectedRoute>} />
                    <Route path="/fleet/new" element={<ProtectedRoute><EngineBossGate><FleetTruckCreate /></EngineBossGate></ProtectedRoute>} />
                    <Route path="/fleet/:truckId" element={<ProtectedRoute><FleetTruckDetail /></ProtectedRoute>} />
                    <Route path="/fleet/:truckId/edit" element={<ProtectedRoute><EngineBossGate><FleetTruckEdit /></EngineBossGate></ProtectedRoute>} />
                    <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
                    <Route path="/expenses/new" element={<ProtectedRoute><ExpenseEdit /></ProtectedRoute>} />
                    <Route path="/expenses/review" element={<ProtectedRoute><EngineBossGate><ExpenseReview /></EngineBossGate></ProtectedRoute>} />
                    <Route path="/expenses/:id" element={<ProtectedRoute><ExpenseDetail /></ProtectedRoute>} />
                    <Route path="/expenses/:id/edit" element={<ProtectedRoute><ExpenseEdit /></ProtectedRoute>} />
                    <Route path="/expenses/batch-scan" element={<ProtectedRoute><BatchReceiptScan /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                    <Route path="/settings/organization" element={<ProtectedRoute><OrgSettings /></ProtectedRoute>} />
                    <Route path="/settings/trash" element={<ProtectedRoute><SettingsTrash /></ProtectedRoute>} />

                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
                    <Route path="/payroll" element={<ProtectedRoute><AdminGate><ModuleGate module="payroll"><Payroll /></ModuleGate></AdminGate></ProtectedRoute>} />
                    <Route path="/factoring" element={<ProtectedRoute><AdminGate><FactoringDashboard /></AdminGate></ProtectedRoute>} />
                    <Route path="/more" element={<ProtectedRoute><More /></ProtectedRoute>} />
                    <Route path="/messages" element={<ProtectedRoute><MessagesInbox /></ProtectedRoute>} />
                    <Route path="/messages/:threadId" element={<ProtectedRoute><ThreadView /></ProtectedRoute>} />
                    <Route path="/needs" element={<ProtectedRoute><NeedsList /></ProtectedRoute>} />
                    <Route path="/my-red-card" element={<ProtectedRoute><MyRedCard /></ProtectedRoute>} />
                    <Route path="/training" element={<ProtectedRoute><ModuleGate module="training"><Training /></ModuleGate></ProtectedRoute>} />
                    <Route path="/admin/logs" element={<ProtectedRoute><AdminGate><AdminLogs /></AdminGate></ProtectedRoute>} />
                    <Route path="/admin/reports" element={<ProtectedRoute><AdminGate><AdminReports /></AdminGate></ProtectedRoute>} />
                    <Route path="/admin/accounts-payable" element={<ProtectedRoute><AdminGate><AccountsPayable /></AdminGate></ProtectedRoute>} />
                    <Route path="/super-admin" element={<PlatformAdminGate><SuperAdmin /></PlatformAdminGate>} />
                    <Route path="/super-admin/organizations" element={<PlatformAdminGate><SuperAdminOrgs /></PlatformAdminGate>} />
                    <Route path="/super-admin/organizations/:orgId" element={<PlatformAdminGate><SuperAdminOrgDetail /></PlatformAdminGate>} />
                    <Route path="/super-admin/users" element={<PlatformAdminGate><SuperAdminUsers /></PlatformAdminGate>} />
                    <Route path="/super-admin/activity" element={<PlatformAdminGate><SuperAdminActivity /></PlatformAdminGate>} />
                    <Route path="/super-admin/audit" element={<PlatformAdminGate><SuperAdminAudit /></PlatformAdminGate>} />
                    <Route path="/super-admin/errors" element={<PlatformAdminGate><SuperAdminErrors /></PlatformAdminGate>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </RouteBoundary>
              </TutorialProvider>
            </BrowserRouter>
          </TooltipProvider>
          </OrganizationProvider>
        </ImpersonationProvider>
      </AuthProvider>
    </PersistQueryClientProvider>
  </ErrorBoundary>
);

export default App;
