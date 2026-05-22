import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import LoadingScreen from "@/components/common/LoadingScreen";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/onboarding/auth", { replace: true });
      }
    });
  }, [navigate]);

  return <LoadingScreen />;
}
