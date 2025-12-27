"use client";

import { useState } from "react";
import { User, Settings, LogOut } from "lucide-react";
import HabitList from "./HabitList";
import HabitSettings from "./HabitSettings";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface AppShellProps {
  userEmail: string;
}

export default function AppShell({ userEmail }: AppShellProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [habitsKey, setHabitsKey] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function handleHabitsChange() {
    setHabitsKey((k) => k + 1);
  }

  return (
    <>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-amber-200/50 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Habit Tracker</h1>

          <div className="flex items-center gap-2">
            {/* Settings button */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2.5 hover:bg-amber-100 rounded-xl transition-colors cursor-pointer"
              title="Paramètres"
            >
              <Settings size={18} className="text-slate-600" />
            </button>

            {/* User info */}
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl">
              <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center">
                <User size={14} className="text-amber-600" />
              </div>
              <span className="text-sm text-slate-600 hidden sm:inline max-w-32 truncate">{userEmail}</span>
            </div>

            {/* Sign out */}
            <button onClick={handleSignOut} className="p-2.5 hover:bg-red-50 rounded-xl transition-colors cursor-pointer group" title="Déconnexion">
              <LogOut size={18} className="text-slate-400 group-hover:text-red-500" />
            </button>
          </div>
        </div>
      </header>

      {/* Content - Bento Layout */}
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <HabitList key={habitsKey} onOpenSettings={() => setSettingsOpen(true)} />
      </div>

      {/* Settings Modal */}
      <HabitSettings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} onHabitsChange={handleHabitsChange} />
    </>
  );
}
