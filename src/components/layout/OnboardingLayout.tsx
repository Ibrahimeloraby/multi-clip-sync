import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";

const STEPS = [
  "welcome",
  "auth",
  "programs",
  "tracking",
  "goals",
  "spend",
  "notifications",
  "complete",
];

export default function OnboardingLayout() {
  const { isRTL, setLanguage, language } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine current step from path segment
  const pathSegment = location.pathname.split("/").pop() ?? "welcome";
  const currentStepIndex = STEPS.indexOf(pathSegment);
  const isWelcome = pathSegment === "welcome";
  const totalSteps = STEPS.length - 1; // exclude welcome from progress count
  // Progress is computed excluding the welcome step
  const progressIndex = currentStepIndex > 0 ? currentStepIndex : 0;
  const progressPct = currentStepIndex > 0 ? (progressIndex / totalSteps) * 100 : 0;

  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen bg-white flex flex-col"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-safe-top pt-4 pb-2">
        {/* Back button */}
        {!isWelcome ? (
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
            aria-label="Go back"
          >
            <BackIcon className="w-5 h-5 text-slate-600" />
          </button>
        ) : (
          <div className="w-9" />
        )}

        {/* Logo */}
        <span className="text-blue-700 font-bold text-lg tracking-tight">LoyaltyOne</span>

        {/* Language toggle */}
        <button
          onClick={() => setLanguage(isRTL ? "en" : "ar")}
          className="text-xs font-medium px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 transition-colors"
        >
          {isRTL ? "EN" : "عربي"}
        </button>
      </div>

      {/* Progress bar (hidden on welcome) */}
      {!isWelcome && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-400">
              {language === "ar"
                ? `${progressIndex} من ${totalSteps}`
                : `${progressIndex} of ${totalSteps}`}
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Page content */}
      <main className="flex-1 flex flex-col items-center justify-start w-full max-w-md mx-auto px-4 pt-2 pb-8">
        <div className="w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
