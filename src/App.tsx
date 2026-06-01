import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import AppLayout from "./components/hub/AppLayout";
import Dashboard from "./pages/hub/Dashboard";
import ChatPage from "./pages/hub/ChatPage";
import FeedPage from "./pages/hub/FeedPage";
import SourcesPage from "./pages/hub/SourcesPage";
import DepartmentPage from "./pages/hub/DepartmentPage";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/hub" replace />} />
            <Route path="/hub" element={<AppLayout><Dashboard /></AppLayout>} />
            <Route path="/hub/chat" element={<AppLayout><ChatPage /></AppLayout>} />
            <Route path="/hub/feed" element={<AppLayout><FeedPage /></AppLayout>} />
            <Route path="/hub/sources" element={<AppLayout><SourcesPage /></AppLayout>} />
            <Route path="/hub/dept/:dept" element={<AppLayout><DepartmentPage /></AppLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
