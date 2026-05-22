import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";
import { toast } from "sonner";
import { Award, ArrowLeft, Phone, Mail, Eye, EyeOff } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language, isRTL } = useAppContext();
  const initialMode = searchParams.get("mode") === "signin" ? "signin" : "signup";

  const [mode, setMode] = useState<"signup" | "signin" | "magic">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [showPhoneStep, setShowPhoneStep] = useState(false);

  const t = {
    en: {
      title: mode === "signup" ? "Create your account" : mode === "signin" ? "Welcome back" : "Magic link",
      subtitle: mode === "signup" ? "Join thousands of UAE loyalty members" : mode === "signin" ? "Sign in to your account" : "We'll email you a sign-in link",
      email: "Email address",
      password: "Password",
      phone: "Phone number",
      phoneNote: "We need your phone for community features",
      signUp: "Create Account",
      signIn: "Sign In",
      sendLink: "Send Magic Link",
      orContinueWith: "or continue with",
      haveAccount: "Already have an account?",
      noAccount: "Don't have an account?",
      useMagic: "Use magic link instead",
      usePassword: "Use password instead",
      disclaimer: "Not affiliated with any loyalty program. We provide recommendations based on publicly available data.",
      otpTitle: "Verify your phone",
      otpDesc: "Enter the 6-digit code sent to your phone",
      verify: "Verify",
      sendOtp: "Send OTP",
      skip: "Skip for now",
    },
    ar: {
      title: mode === "signup" ? "إنشاء حساب" : mode === "signin" ? "مرحباً بعودتك" : "رابط سحري",
      subtitle: mode === "signup" ? "انضم إلى آلاف أعضاء الولاء في الإمارات" : mode === "signin" ? "سجل دخولك" : "سنرسل لك رابط تسجيل الدخول",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      phone: "رقم الهاتف",
      phoneNote: "نحتاج هاتفك لميزات المجتمع",
      signUp: "إنشاء حساب",
      signIn: "تسجيل الدخول",
      sendLink: "إرسال الرابط",
      orContinueWith: "أو تابع بواسطة",
      haveAccount: "لديك حساب بالفعل؟",
      noAccount: "ليس لديك حساب؟",
      useMagic: "استخدم الرابط السحري",
      usePassword: "استخدم كلمة المرور",
      disclaimer: "لسنا تابعين لأي برنامج ولاء. نقدم توصيات بناءً على البيانات المتاحة للعموم.",
      otpTitle: "تحقق من هاتفك",
      otpDesc: "أدخل الرمز المكون من 6 أرقام المرسل إلى هاتفك",
      verify: "تحقق",
      sendOtp: "إرسال الرمز",
      skip: "تخطي الآن",
    },
  };

  const copy = t[language];

  const handleEmailAuth = async () => {
    if (!email) { toast.error("Please enter your email"); return; }
    setLoading(true);
    try {
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/onboarding/programs` } });
        if (error) throw error;
        toast.success("Magic link sent! Check your email.");
      } else if (mode === "signup") {
        if (!password) { toast.error("Please enter a password"); setLoading(false); return; }
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/onboarding/programs` } });
        if (error) throw error;
        if (data.user) {
          toast.success("Account created!");
          setShowPhoneStep(true);
        }
      } else {
        if (!password) { toast.error("Please enter a password"); setLoading(false); return; }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/onboarding/programs");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/onboarding/programs` },
    });
    if (error) toast.error(error.message);
  };

  const handleAppleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: `${window.location.origin}/onboarding/programs` },
    });
    if (error) toast.error(error.message);
  };

  const handleSendOtp = async () => {
    if (!phone) { toast.error("Please enter your phone number"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      setShowOtpDialog(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
      if (error) throw error;
      setShowOtpDialog(false);
      navigate("/onboarding/programs");
    } catch (err: any) {
      toast.error(err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  if (showPhoneStep) {
    return (
      <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen flex flex-col bg-white px-6 py-8">
        <button onClick={() => setShowPhoneStep(false)} className="flex items-center gap-2 text-gray-500 mb-8">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>
        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-6">
            <Phone className="w-7 h-7 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{copy.phone}</h2>
          <p className="text-gray-500 text-sm mb-8">{copy.phoneNote}</p>
          <div className="space-y-4">
            <Input
              type="tel"
              placeholder="+971 50 000 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-14 text-base rounded-xl"
            />
            <Button onClick={handleSendOtp} disabled={loading} className="w-full h-14 rounded-xl text-base font-semibold bg-blue-600 hover:bg-blue-700">
              {copy.sendOtp}
            </Button>
            <Button variant="ghost" onClick={() => navigate("/onboarding/programs")} className="w-full h-12 text-gray-400 hover:text-gray-600">
              {copy.skip}
            </Button>
          </div>
        </div>
        <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>{copy.otpTitle}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-500 mb-4">{copy.otpDesc}</p>
            <Input
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              className="h-14 text-center text-2xl tracking-widest rounded-xl"
            />
            <Button onClick={handleVerifyOtp} disabled={loading || otp.length < 6} className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 mt-2">
              {copy.verify}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen flex flex-col bg-white">
      {/* Top gradient banner */}
      <div className="bg-gradient-to-b from-blue-600 to-indigo-700 px-6 pt-12 pb-10 text-white text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Award className="w-7 h-7" />
          <span className="text-xl font-extrabold">LoyaltyOne</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">{copy.title}</h1>
        <p className="text-blue-100 text-sm">{copy.subtitle}</p>
      </div>

      <div className="flex-1 px-6 py-8 flex flex-col gap-4 max-w-sm mx-auto w-full">
        {/* Social sign-in */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleGoogleSignIn}
            className="flex items-center justify-center gap-3 w-full h-13 py-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>
          <button
            onClick={handleAppleSignIn}
            className="flex items-center justify-center gap-3 w-full h-13 py-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.37c1.29.07 2.18.74 2.93.8 1.11-.21 2.18-.91 3.38-.83 1.44.12 2.52.72 3.22 1.82-2.95 1.77-2.25 5.67.5 6.71-.58 1.56-1.34 3.09-2.03 4.41zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Continue with Apple
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">{copy.orContinueWith}</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Email/password form */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-1.5 block">{copy.email}</Label>
            <div className="relative">
              <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="ps-10 h-12 rounded-xl"
              />
            </div>
          </div>
          {mode !== "magic" && (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">{copy.password}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pe-10 h-12 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
          <Button
            onClick={handleEmailAuth}
            disabled={loading}
            className="w-full h-12 rounded-xl text-base font-semibold bg-blue-600 hover:bg-blue-700"
          >
            {loading ? "Please wait..." : mode === "signup" ? copy.signUp : mode === "signin" ? copy.signIn : copy.sendLink}
          </Button>
        </div>

        {/* Mode toggles */}
        <div className="flex flex-col items-center gap-2 text-sm">
          <button
            onClick={() => setMode(mode === "magic" ? (initialMode === "signup" ? "signup" : "signin") : "magic")}
            className="text-blue-600 hover:underline"
          >
            {mode === "magic" ? copy.usePassword : copy.useMagic}
          </button>
          <button
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            className="text-gray-500 hover:text-gray-700"
          >
            {mode === "signup" ? copy.haveAccount : copy.noAccount}{" "}
            <span className="text-blue-600 font-medium">
              {mode === "signup" ? copy.signIn : copy.signUp}
            </span>
          </button>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-gray-400 text-center leading-relaxed mt-4">
          {copy.disclaimer}
        </p>
      </div>
    </div>
  );
}
