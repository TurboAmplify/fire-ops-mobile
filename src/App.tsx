import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { OrganizationProvider } from "@/hooks/useOrganization";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { queryClient, asyncPersister } from "@/lib/query-client";
import "@/lib/offline-queue";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import OrgSetup from "./pages/OrgSetup";
import OrgSettings from "./pages/OrgSettings";
import Dashboard from "./pages/Dashboard";
import Incidents from "./pages/Incidents";
import IncidentCreate from "./pages/IncidentCreate";
import IncidentFromAgreement from "./pages/IncidentFromAgreement";
import IncidentDetail from "./pages/IncidentDetail";
import IncidentEdit from "./pages/IncidentEdit";
import ShiftCreate from "./pages/ShiftCreate";
import ShiftDetail from "./pages/ShiftDetail";
import ShiftTicketCreate from "./pages/ShiftTicketCreate";
import ShiftTicketEdit from "./pages/ShiftTicketEdit";
import Crew from "./pages/Crew";
import Fleet from "./pages/Fleet";
import FleetTruckCreate from "./pages/FleetTruckCreate";
import FleetTruckDetail from "./pages/FleetTruckDetail";
import FleetTruckEdit from "./pages/FleetTruckEdit";
import Expenses from "./pages/Expenses";
import ExpenseEdit from "./pages/ExpenseEdit";
import ExpenseDetail from "./pages/ExpenseDetail";
import ExpenseReview from "./pages/ExpenseReview";
import BatchReceiptScan from "./pages/BatchReceiptScan";
import Settings from "./pages/Settings";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Support from "./pages/Support";
import Payroll from "./pages/Payroll";
import More from "./pages/More";
import NeedsList from "./pages/NeedsList";
import AdminLogs from "./pages/AdminLogs";
import NotFound from "./pages/NotFound";

const App = () => (
  <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncPersister, maxAge: 1000 * 60 * 60 * 24 }}>
    <AuthProvider>
      <OrganizationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/org-setup" element={<OrgSetup />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/incidents" element={<ProtectedRoute><Incidents /></ProtectedRoute>} />
              <Route path="/incidents/new" element={<ProtectedRoute><IncidentCreate /></ProtectedRoute>} />
              <Route path="/incidents/from-agreement" element={<ProtectedRoute><IncidentFromAgreement /></ProtectedRoute>} />
              <Route path="/incidents/:incidentId" element={<ProtectedRoute><IncidentDetail /></ProtectedRoute>} />
              <Route path="/incidents/:incidentId/edit" element={<ProtectedRoute><IncidentEdit /></ProtectedRoute>} />
              <Route path="/incidents/:incidentId/trucks/:incidentTruckId/shifts/new" element={<ProtectedRoute><ShiftCreate /></ProtectedRoute>} />
              <Route path="/incidents/:incidentId/trucks/:incidentTruckId/shifts/:shiftId" element={<ProtectedRoute><ShiftDetail /></ProtectedRoute>} />
              <Route path="/incidents/:incidentId/trucks/:incidentTruckId/shift-ticket/new" element={<ProtectedRoute><ShiftTicketCreate /></ProtectedRoute>} />
              <Route path="/incidents/:incidentId/trucks/:incidentTruckId/shift-ticket/:ticketId" element={<ProtectedRoute><ShiftTicketEdit /></ProtectedRoute>} />
              <Route path="/crew" element={<ProtectedRoute><Crew /></ProtectedRoute>} />
              <Route path="/fleet" element={<ProtectedRoute><Fleet /></ProtectedRoute>} />
              <Route path="/fleet/new" element={<ProtectedRoute><FleetTruckCreate /></ProtectedRoute>} />
              <Route path="/fleet/:truckId" element={<ProtectedRoute><FleetTruckDetail /></ProtectedRoute>} />
              <Route path="/fleet/:truckId/edit" element={<ProtectedRoute><FleetTruckEdit /></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
              <Route path="/expenses/new" element={<ProtectedRoute><ExpenseEdit /></ProtectedRoute>} />
              <Route path="/expenses/review" element={<ProtectedRoute><ExpenseReview /></ProtectedRoute>} />
              <Route path="/expenses/:id" element={<ProtectedRoute><ExpenseDetail /></ProtectedRoute>} />
              <Route path="/expenses/:id/edit" element={<ProtectedRoute><ExpenseEdit /></ProtectedRoute>} />
              <Route path="/expenses/batch-scan" element={<ProtectedRoute><BatchReceiptScan /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/settings/organization" element={<ProtectedRoute><OrgSettings /></ProtectedRoute>} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
              <Route path="/payroll" element={<ProtectedRoute><Payroll /></ProtectedRoute>} />
              <Route path="/more" element={<ProtectedRoute><More /></ProtectedRoute>} />
              <Route path="/needs" element={<ProtectedRoute><NeedsList /></ProtectedRoute>} />
              <Route path="/admin/logs" element={<ProtectedRoute><AdminLogs /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </OrganizationProvider>
    </AuthProvider>
  </PersistQueryClientProvider>
);

export default App;
