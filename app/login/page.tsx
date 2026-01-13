"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, Eye, EyeOff, Check, X, Loader2 } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordChecks = useMemo(
    () => ({
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
    }),
    [password]
  );

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const signInWithGoogle = async () => {
    setMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
    if (error) setMsg({ text: error.message, type: "error" });
  };

  const signWithEmail = async () => {
    setMsg(null);

    if (!email || !password) {
      setMsg({ text: "Email et mot de passe requis.", type: "error" });
      return;
    }

    if (mode === "signup") {
      if (!isPasswordValid) {
        setMsg({ text: "Le mot de passe ne respecte pas les critères.", type: "error" });
        return;
      }
      if (!passwordsMatch) {
        setMsg({ text: "Les mots de passe ne correspondent pas.", type: "error" });
        return;
      }
    }

    setLoading(true);

    const { error } =
      mode === "login" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (error) {
      setMsg({ text: error.message, type: "error" });
    } else if (mode === "login") {
      router.push("/");
    } else {
      setMsg({ text: "Compte créé ! Vérifie tes emails pour confirmer ton inscription.", type: "success" });
    }
  };

  const PasswordCheck = ({ valid, label }: { valid: boolean; label: string }) => (
    <div className={`flex items-center gap-2 text-sm ${valid ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-gray-500"}`}>
      {valid ? <Check size={14} strokeWidth={3} /> : <X size={14} />}
      <span>{label}</span>
    </div>
  );

  return (
    <main className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 dark:from-zinc-950 dark:to-zinc-900 p-6">
      <div className="fixed right-4 z-50" style={{ top: "max(1rem, env(safe-area-inset-top))" }}>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Habit Tracker</h1>
          <p className="text-slate-500 dark:text-slate-400">{mode === "login" ? "Connecte-toi pour continuer" : "Crée ton compte gratuitement"}</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/30 border border-slate-200 dark:border-zinc-800 p-8 space-y-6">
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 rounded-xl border-2 border-slate-200 dark:border-zinc-700 px-4 py-3.5 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:border-slate-300 dark:hover:border-zinc-600 transition-all cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuer avec Google
          </button>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200 dark:bg-zinc-700" />
            <span className="text-sm text-slate-400 dark:text-slate-500 font-medium">ou par email</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-zinc-700" />
          </div>

          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                mode === "login"
                  ? "bg-white dark:bg-zinc-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              Connexion
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                mode === "signup"
                  ? "bg-white dark:bg-zinc-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              Inscription
            </button>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
              <input
                className="w-full rounded-xl border-2 border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-12 pr-4 py-3.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-900 dark:focus:border-slate-500 focus:outline-none transition-colors"
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
              <input
                className="w-full rounded-xl border-2 border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-12 pr-12 py-3.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-900 dark:focus:border-slate-500 focus:outline-none transition-colors"
                placeholder="Mot de passe"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {mode === "signup" && (
              <>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
                  <input
                    className={`w-full rounded-xl border-2 bg-white dark:bg-zinc-800 pl-12 pr-12 py-3.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition-colors ${
                      confirmPassword.length > 0
                        ? passwordsMatch
                          ? "border-emerald-500 focus:border-emerald-500"
                          : "border-red-300 dark:border-red-500 focus:border-red-500"
                        : "border-slate-200 dark:border-zinc-700 focus:border-slate-900 dark:focus:border-slate-500"
                    }`}
                    placeholder="Confirmer le mot de passe"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                <div className="bg-slate-50 dark:bg-zinc-800 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Critères du mot de passe :</p>
                  <PasswordCheck valid={passwordChecks.minLength} label="Au moins 8 caractères" />
                  <PasswordCheck valid={passwordChecks.hasUppercase} label="Une majuscule" />
                  <PasswordCheck valid={passwordChecks.hasLowercase} label="Une minuscule" />
                  <PasswordCheck valid={passwordChecks.hasNumber} label="Un chiffre" />
                </div>
              </>
            )}

            <button
              onClick={signWithEmail}
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-3.5 font-semibold hover:bg-slate-800 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading && <Loader2 size={20} className="animate-spin" />}
              {mode === "login" ? "Se connecter" : "Créer mon compte"}
            </button>
          </div>

          {msg && (
            <div
              className={`rounded-xl p-4 text-sm ${
                msg.type === "error"
                  ? "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900"
                  : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900"
              }`}
            >
              {msg.text}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
