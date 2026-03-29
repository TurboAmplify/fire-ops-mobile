import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Incidents from "./pages/Incidents";
import IncidentCreate from "./pages/IncidentCreate";
import IncidentDetail from "./pages/IncidentDetail";
import ShiftCreate from "./pages/ShiftCreate";
import ShiftDetail from "./pages/ShiftDetail";
import Expenses from "./pages/Expenses";
import ExpenseEdit from "./pages/ExpenseEdit";
import ExpenseDetail from "./pages/ExpenseDetail";
import Settings from "./pages/Settings";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Support from "./pages/Support";
import Time from "./pages/Time";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected routes */}
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/incidents" element={<ProtectedRoute><Incidents /></ProtectedRoute>} />
            <Route path="/incidents/new" element={<ProtectedRoute><IncidentCreate /></ProtectedRoute>} />
            <Route path="/incidents/:incidentId" element={<ProtectedRoute><IncidentDetail /></ProtectedRoute>} />
            <Route path="/incidents/:incidentId/trucks/:incidentTruckId/shifts/new" element={<ProtectedRoute><ShiftCreate /></ProtectedRoute>} />
            <Route path="/incidents/:incidentId/trucks/:incidentTruckId/shifts/:shiftId" element={<ProtectedRoute><ShiftDetail /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
            <Route path="/expenses/new" element={<ProtectedRoute><ExpenseEdit /></ProtectedRoute>} />
            <Route path="/expenses/:id" element={<ProtectedRoute><ExpenseDetail /></ProtectedRoute>} />
            <Route path="/expenses/:id/edit" element={<ProtectedRoute><ExpenseEdit /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/privacy" element={<ProtectedRoute><Privacy /></ProtectedRoute>} />
            <Route path="/terms" element={<ProtectedRoute><Terms /></ProtectedRoute>} />
            <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
            <Route path="/time" element={<ProtectedRoute><Time /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
