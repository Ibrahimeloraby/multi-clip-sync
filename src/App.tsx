import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import CameraScreen from "./pages/CameraScreen";
import LibraryScreen from "./pages/LibraryScreen";
import SessionView from "./pages/SessionView";
import QuickJoin from "./pages/QuickJoin";
import Install from "./pages/Install";
import SetupPage from "./pages/SetupPage";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import CRMDashboard from "./pages/CRMDashboard";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Main 2-screen app */}
            <Route path="/" element={<CameraScreen />} />
            <Route path="/videos" element={<LibraryScreen />} />

            {/* Redirect old routes */}
            <Route path="/feed" element={<Navigate to="/videos?tab=feed" replace />} />

            {/* Session routes */}
            <Route path="/session/:id" element={<SessionView />} />
            <Route path="/q/:code" element={<QuickJoin />} />

            {/* CRM module */}
            <Route path="/crm" element={<CRMDashboard />} />

            {/* Utility routes */}
            <Route path="/install" element={<Install />} />
            <Route path="/setup" element={<SetupPage />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
