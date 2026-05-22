import { Suspense, lazy } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import LoadingScreen from "@/components/common/LoadingScreen";

// ─── Lazy page imports ────────────────────────────────────────────────────────

// Onboarding
const Welcome = lazy(() => import("@/pages/onboarding/Welcome"));
const Auth = lazy(() => import("@/pages/onboarding/Auth"));
const Programs = lazy(() => import("@/pages/onboarding/Programs"));
const Tracking = lazy(() => import("@/pages/onboarding/Tracking"));
const Goals = lazy(() => import("@/pages/onboarding/Goals"));
const Spend = lazy(() => import("@/pages/onboarding/Spend"));
const Notifications = lazy(() => import("@/pages/onboarding/Notifications"));
const OnboardingComplete = lazy(() => import("@/pages/onboarding/OnboardingComplete"));

// Dashboard
const DashboardHome = lazy(() => import("@/pages/dashboard/DashboardHome"));
const ProgramsList = lazy(() => import("@/pages/dashboard/ProgramsList"));
const ProgramDetail = lazy(() => import("@/pages/dashboard/ProgramDetail"));
const RecommendFlow = lazy(() => import("@/pages/dashboard/RecommendFlow"));
const MerchantsBrowser = lazy(() => import("@/pages/dashboard/MerchantsBrowser"));
const MerchantDetail = lazy(() => import("@/pages/dashboard/MerchantDetail"));
const AddRule = lazy(() => import("@/pages/dashboard/AddRule"));
const VerifyRules = lazy(() => import("@/pages/dashboard/VerifyRules"));
const ExpiringCenter = lazy(() => import("@/pages/dashboard/ExpiringCenter"));
const Insights = lazy(() => import("@/pages/dashboard/Insights"));
const Community = lazy(() => import("@/pages/dashboard/Community"));
const Settings = lazy(() => import("@/pages/dashboard/Settings"));
const EmailSetup = lazy(() => import("@/pages/dashboard/EmailSetup"));
const ScreenshotUpload = lazy(() => import("@/pages/dashboard/ScreenshotUpload"));

// Admin
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminPrograms = lazy(() => import("@/pages/admin/AdminPrograms"));
const AdminMerchants = lazy(() => import("@/pages/admin/AdminMerchants"));
const AdminRules = lazy(() => import("@/pages/admin/AdminRules"));
const AdminReview = lazy(() => import("@/pages/admin/AdminReview"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminTemplates = lazy(() => import("@/pages/admin/AdminTemplates"));
const AdminAnalytics = lazy(() => import("@/pages/admin/AdminAnalytics"));

// Auth callback + NotFound
const AuthCallback = lazy(() => import("@/pages/AuthCallback"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// Layouts
const OnboardingLayout = lazy(() => import("@/components/layout/OnboardingLayout"));
const AppLayout = lazy(() => import("@/components/layout/AppLayout"));
const AdminLayout = lazy(() => import("@/components/layout/AdminLayout"));

// ─── Route guard components ───────────────────────────────────────────────────

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/onboarding/welcome" replace />;
  return <Navigate to="/dashboard" replace />;
}

function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/onboarding/auth" replace />;
  return <Outlet />;
}

function AdminRoute() {
  const { user, loading, appUser } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/onboarding/auth" replace />;
  if (!appUser?.is_admin) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<RootRedirect />} />

        {/* Auth callback (Supabase OAuth) */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* ── Onboarding ────────────────────────────────────────────── */}
        <Route path="/onboarding" element={<OnboardingLayout />}>
          <Route index element={<Navigate to="/onboarding/welcome" replace />} />
          <Route path="welcome" element={<Welcome />} />
          <Route path="auth" element={<Auth />} />
          <Route path="programs" element={<Programs />} />
          <Route path="tracking" element={<Tracking />} />
          <Route path="goals" element={<Goals />} />
          <Route path="spend" element={<Spend />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="complete" element={<OnboardingComplete />} />
        </Route>

        {/* ── Dashboard (protected) ─────────────────────────────────── */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<AppLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="programs" element={<ProgramsList />} />
            <Route path="programs/:id" element={<ProgramDetail />} />
            <Route path="recommend" element={<RecommendFlow />} />
            <Route path="merchants" element={<MerchantsBrowser />} />
            <Route path="merchants/:id" element={<MerchantDetail />} />
            <Route path="rules/add" element={<AddRule />} />
            <Route path="rules/verify" element={<VerifyRules />} />
            <Route path="expiring" element={<ExpiringCenter />} />
            <Route path="insights" element={<Insights />} />
            <Route path="community" element={<Community />} />
            <Route path="settings" element={<Settings />} />
            <Route path="email-setup" element={<EmailSetup />} />
            <Route path="screenshot" element={<ScreenshotUpload />} />
          </Route>
        </Route>

        {/* ── Admin (protected + is_admin) ──────────────────────────── */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="programs" element={<AdminPrograms />} />
            <Route path="merchants" element={<AdminMerchants />} />
            <Route path="rules" element={<AdminRules />} />
            <Route path="review" element={<AdminReview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="templates" element={<AdminTemplates />} />
            <Route path="analytics" element={<AdminAnalytics />} />
          </Route>
        </Route>

        {/* ── Catch-all ─────────────────────────────────────────────── */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
