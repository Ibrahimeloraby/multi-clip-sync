import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-6 p-4">
      <div className="text-blue-700 font-bold text-2xl">LoyaltyOne</div>
      <h1 className="text-6xl font-bold text-slate-300">404</h1>
      <p className="text-slate-600 text-center">Page not found</p>
      <Button onClick={() => navigate("/dashboard")}>
        <Home className="w-4 h-4 me-2" />
        Back to Dashboard
      </Button>
    </div>
  );
}
