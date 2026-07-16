import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Auth() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === "signin") {
        const { error } = await signIn(email, password);
        if (error) toast.error(error.message);
      } else {
        if (!username.trim()) return toast.error("Username required");
        const { error } = await signUp(email, password, username);
        if (error) toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-black text-white tracking-tight">
          Fan<span className="text-[#00FF87]">Zone</span>
        </h1>
        <p className="text-white/40 text-sm mt-2">Your fandom has value. Start earning.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6 w-full max-w-sm">
        {(["signin", "signup"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === t ? "bg-[#00FF87] text-[#0A0A0F]" : "text-white/40 hover:text-white/60"
            }`}
          >
            {t === "signin" ? "Sign In" : "Join Free"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3">
        {tab === "signup" && (
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-[#00FF87]/50 text-sm"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-[#00FF87]/50 text-sm"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-[#00FF87]/50 text-sm"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-[#00FF87] text-[#0A0A0F] font-bold rounded-xl text-sm hover:bg-[#00FF87]/90 disabled:opacity-50 transition-colors mt-2"
        >
          {loading ? "..." : tab === "signin" ? "Sign In" : "Create Account"}
        </button>
      </form>

      <p className="text-white/20 text-xs mt-8 text-center max-w-xs">
        By joining you agree to our Terms of Service. Your data is used to build your Fan Commercial Profile.
      </p>
    </div>
  );
}
