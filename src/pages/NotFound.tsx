import { Link } from "react-router-dom";
import { Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-950">
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 flex items-center justify-center mx-auto mb-6">
        <Brain className="w-8 h-8 text-indigo-400" />
      </div>
      <h1 className="text-6xl font-bold text-white mb-4">404</h1>
      <p className="text-slate-400 text-lg mb-6">Page not found</p>
      <Button asChild className="bg-indigo-600 hover:bg-indigo-500">
        <Link to="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  </div>
);

export default NotFound;
