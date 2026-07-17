import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import FanPassport from "./pages/FanPassport";
import Earn from "./pages/Earn";
import Wallet from "./pages/Wallet";
import Predictions from "./pages/Predictions";
import Community from "./pages/Community";
import ClubProfile from "./pages/ClubProfile";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Auth */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />

            {/* Fan app — 3-tab navigation */}
            <Route path="/" element={<Home />} />
            <Route path="/earn" element={<Earn />} />
            <Route path="/passport" element={<FanPassport />} />
            <Route path="/wallet" element={<Wallet />} />

            {/* Feature pages */}
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/community/:slug" element={<Community />} />
            <Route path="/clubs/:slug" element={<ClubProfile />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:fanId" element={<Profile />} />
            <Route path="/leaderboard" element={<Leaderboard />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
