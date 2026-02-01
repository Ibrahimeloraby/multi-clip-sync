import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CameraScreen from "./pages/CameraScreen";
import VideosScreen from "./pages/VideosScreen";
import FeedScreen from "./pages/FeedScreen";
import SessionView from "./pages/SessionView";
import QuickJoin from "./pages/QuickJoin";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Main 3-screen app */}
          <Route path="/" element={<CameraScreen />} />
          <Route path="/videos" element={<VideosScreen />} />
          <Route path="/feed" element={<FeedScreen />} />
          
          {/* Session routes */}
          <Route path="/session/:id" element={<SessionView />} />
          <Route path="/q/:code" element={<QuickJoin />} />
          
          {/* Utility routes */}
          <Route path="/install" element={<Install />} />
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
