"use client";

import { useState } from "react";
import { User, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

interface HistoryUserBarProps {
  userEmail: string;
}

export default function HistoryUserBar({ userEmail }: HistoryUserBarProps) {
  const [showEmail, setShowEmail] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />

      <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-zinc-800 rounded-xl">
        <button
          onClick={() => setShowEmail(!showEmail)}
          className="w-7 h-7 bg-violet-100 dark:bg-violet-900/50 rounded-full flex items-center justify-center hover:bg-violet-200 dark:hover:bg-violet-800/50 transition-colors cursor-pointer sm:cursor-default"
          title={showEmail ? "Masquer l'email" : "Afficher l'email"}
        >
          <User size={14} className="text-violet-600 dark:text-violet-400" />
        </button>
        <span className={`text-sm text-slate-600 dark:text-slate-400 max-w-32 truncate ${showEmail ? "inline" : "hidden sm:inline"}`}>
          {userEmail}
        </span>
      </div>

      <button
        onClick={handleSignOut}
        className="p-2.5 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-colors cursor-pointer group"
        title="Déconnexion"
      >
        <LogOut size={18} className="text-slate-400 group-hover:text-red-500" />
      </button>
    </div>
  );
}
