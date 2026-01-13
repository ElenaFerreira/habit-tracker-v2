"use client";

import { useState } from "react";
import { Home, User, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface HistoryHeaderProps {
  userEmail: string;
}

export default function HistoryHeader({ userEmail }: HistoryHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 sticky top-0 z-40 safe-top">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        {/* Titre - aligné à gauche */}
        <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 hidden sm:block flex-1">Historique</h1>
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 sm:hidden">Historique</h1>

        {/* Action centrale - Desktop */}
        <div className="hidden sm:flex items-center justify-center">
          <Link href="/" className="p-2.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors" title="Accueil">
            <Home size={18} className="text-slate-600 dark:text-slate-400" />
          </Link>
        </div>

        {/* Compte & paramètres - Desktop */}
        <div className="hidden sm:flex items-center gap-2 justify-end flex-1">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-zinc-800 rounded-xl">
            <div className="w-7 h-7 bg-violet-100 dark:bg-violet-900/50 rounded-full flex items-center justify-center">
              <User size={14} className="text-violet-600 dark:text-violet-400" />
            </div>
            <span className="text-sm text-slate-600 dark:text-slate-400 max-w-32 truncate">{userEmail}</span>
          </div>

          <ThemeToggle />

          <button
            onClick={handleSignOut}
            className="p-2.5 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-colors cursor-pointer group"
            title="Déconnexion"
          >
            <LogOut size={18} className="text-slate-400 group-hover:text-red-500" />
          </button>
        </div>

        {/* Mobile - Maison + Menu burger */}
        <div className="flex sm:hidden items-center gap-2">
          <Link href="/" className="p-2.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors" title="Accueil">
            <Home size={18} className="text-slate-600 dark:text-slate-400" />
          </Link>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            title="Menu"
          >
            {menuOpen ? (
              <X size={20} className="text-slate-600 dark:text-slate-400" />
            ) : (
              <Menu size={20} className="text-slate-600 dark:text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {/* Menu mobile déroulant */}
      {menuOpen && (
        <div className="sm:hidden border-t border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-4 py-3 space-y-2">
            <div className="flex items-center gap-3 px-3 py-2 bg-slate-100 dark:bg-zinc-800 rounded-xl">
              <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900/50 rounded-full flex items-center justify-center">
                <User size={16} className="text-violet-600 dark:text-violet-400" />
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-400 flex-1 truncate">{userEmail}</span>
            </div>

            <ThemeToggle variant="full" className="w-full" />

            <button
              onClick={() => {
                handleSignOut();
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 p-3 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-colors cursor-pointer text-left"
            >
              <LogOut size={20} className="text-red-500" />
              <span className="text-red-600 dark:text-red-400 font-medium">Déconnexion</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
