import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "./pages/Dashboard";
import Incidents from "./pages/Incidents";
import IncidentCreate from "./pages/IncidentCreate";
import IncidentDetail from "./pages/IncidentDetail";
import ShiftCreate from "./pages/ShiftCreate";
import ShiftDetail from "./pages/ShiftDetail";
import Expenses from "./pages/Expenses";
import ExpenseEdit from "./pages/ExpenseEdit";
import ExpenseDetail from "./pages/ExpenseDetail";
import { PlaceholderPage } from "./pages/Placeholder";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/incidents/new" element={<IncidentCreate />} />
          <Route path="/incidents/:incidentId" element={<IncidentDetail />} />
          <Route path="/incidents/:incidentId/trucks/:incidentTruckId/shifts/new" element={<ShiftCreate />} />
          <Route path="/incidents/:incidentId/trucks/:incidentTruckId/shifts/:shiftId" element={<ShiftDetail />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/expenses/new" element={<ExpenseEdit />} />
          <Route path="/expenses/:id" element={<ExpenseDetail />} />
          <Route path="/expenses/:id/edit" element={<ExpenseEdit />} />
          <Route path="/time" element={<PlaceholderPage title="Time" />} />
          <Route path="/crew" element={<PlaceholderPage title="Crew" />} />
          <Route path="/fleet" element={<PlaceholderPage title="Fleet" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
