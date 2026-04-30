import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import NotFound from "./pages/NotFound";

// B2B Platform
import B2BLayout from "./components/b2b/Layout";
import Dashboard from "./pages/b2b/Dashboard";
import Deals from "./pages/b2b/Deals";
import Proposals from "./pages/b2b/Proposals";
import Approvals from "./pages/b2b/Approvals";
import Outreach from "./pages/b2b/Outreach";
import Catalog from "./pages/b2b/Catalog";
import Companies from "./pages/b2b/Companies";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Redirect root to B2B platform */}
            <Route path="/" element={<Navigate to="/b2b" replace />} />

            {/* B2B Platform */}
            <Route path="/b2b" element={<B2BLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="deals" element={<Deals />} />
              <Route path="proposals" element={<Proposals />} />
              <Route path="approvals" element={<Approvals />} />
              <Route path="outreach" element={<Outreach />} />
              <Route path="catalog" element={<Catalog />} />
              <Route path="companies" element={<Companies />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
