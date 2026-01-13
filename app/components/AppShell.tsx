"use client";

import { useState, useRef } from "react";
import { User, TrendingUp, LogOut, History, Target, Footprints, Menu, X } from "lucide-react";
import Link from "next/link";
import HabitList from "./HabitList";
import HabitSettings from "./HabitSettings";
import GoalSettings from "./GoalSettings";
import StepSettings from "./StepSettings";
import GoalsList, { GoalsListRef } from "./GoalsList";
import MoodPicker from "./MoodPicker";
import ThemeToggle from "./ThemeToggle";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface AppShellProps {
  userEmail: string;
}

export default function AppShell({ userEmail }: AppShellProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [goalsSettingsOpen, setGoalsSettingsOpen] = useState(false);
  const [stepSettingsOpen, setStepSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [habitsKey, setHabitsKey] = useState(0);
  const [stepCounterKey, setStepCounterKey] = useState(0);
  const goalsListRef = useRef<GoalsListRef>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function handleHabitsChange() {
    setHabitsKey((k) => k + 1);
    goalsListRef.current?.refresh();
  }

  function refreshGoals() {
    goalsListRef.current?.refresh();
  }

  return (
    <>
      <header className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 sticky top-0 z-40 safe-top">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          {/* Titre - aligné à gauche */}
          <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 hidden sm:block flex-1">Habit Tracker</h1>
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 sm:hidden">Habit Tracker</h1>

          {/* Actions - centrées */}
          <div className="hidden sm:flex items-center gap-1 justify-center">
            <Link href="/history" className="p-2.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors" title="Historique">
              <History size={18} className="text-slate-600 dark:text-slate-400" />
            </Link>

            <button
              onClick={() => setStepSettingsOpen(true)}
              className="p-2.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              title="Objectif de pas"
            >
              <Footprints size={18} className="text-slate-600 dark:text-slate-400" />
            </button>

            <button
              onClick={() => setGoalsSettingsOpen(true)}
              className="p-2.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              title="Objectifs"
            >
              <Target size={18} className="text-slate-600 dark:text-slate-400" />
            </button>

            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              title="Gérer mes habitudes"
            >
              <TrendingUp size={18} className="text-slate-600 dark:text-slate-400" />
            </button>
          </div>

          {/* Compte & paramètres - alignés à droite */}
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

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden p-2.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            title="Menu"
          >
            {menuOpen ? (
              <X size={20} className="text-slate-600 dark:text-slate-400" />
            ) : (
              <Menu size={20} className="text-slate-600 dark:text-slate-400" />
            )}
          </button>
        </div>

        {menuOpen && (
          <div className="sm:hidden border-t border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
            <div className="max-w-5xl mx-auto px-4 py-3 space-y-2">
              <Link
                href="/history"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 p-3 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              >
                <History size={20} className="text-slate-600 dark:text-slate-400" />
                <span className="text-slate-700 dark:text-slate-300 font-medium">Historique</span>
              </Link>

              <button
                onClick={() => {
                  setStepSettingsOpen(true);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer text-left"
              >
                <Footprints size={20} className="text-slate-600 dark:text-slate-400" />
                <span className="text-slate-700 dark:text-slate-300 font-medium">Objectif de pas</span>
              </button>

              <button
                onClick={() => {
                  setGoalsSettingsOpen(true);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer text-left"
              >
                <Target size={20} className="text-slate-600 dark:text-slate-400" />
                <span className="text-slate-700 dark:text-slate-300 font-medium">Objectifs</span>
              </button>

              <button
                onClick={() => {
                  setSettingsOpen(true);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer text-left"
              >
                <TrendingUp size={20} className="text-slate-600 dark:text-slate-400" />
                <span className="text-slate-700 dark:text-slate-300 font-medium">Gérer mes habitudes</span>
              </button>

              <div className="border-t border-slate-200 dark:border-zinc-700 my-2"></div>

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

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <MoodPicker />

        <HabitList
          key={`habits-${habitsKey}`}
          onOpenSettings={() => setSettingsOpen(true)}
          onHabitToggle={refreshGoals}
          stepCounterKey={stepCounterKey}
        />

        <GoalsList ref={goalsListRef} onOpenSettings={() => setGoalsSettingsOpen(true)} />
      </div>

      <HabitSettings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} onHabitsChange={handleHabitsChange} />
      <GoalSettings isOpen={goalsSettingsOpen} onClose={() => setGoalsSettingsOpen(false)} onGoalsChange={refreshGoals} />
      <StepSettings isOpen={stepSettingsOpen} onClose={() => setStepSettingsOpen(false)} onStepGoalChange={() => setStepCounterKey((k) => k + 1)} />
    </>
  );
}
