import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import Dashboard from "@/pages/Dashboard";
import Customers from "@/pages/Customers";
import JourneyMap from "@/pages/JourneyMap";
import Segments from "@/pages/Segments";
import Predictions from "@/pages/Predictions";
import AIAgent from "@/pages/AIAgent";
import Connections from "@/pages/Connections";
import Alerts from "@/pages/Alerts";
import Settings from "@/pages/Settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/journey" element={<JourneyMap />} />
            <Route path="/segments" element={<Segments />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/agent" element={<AIAgent />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
