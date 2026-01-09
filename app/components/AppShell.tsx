"use client";

import { useState, useRef } from "react";
import { User, ListChecks, LogOut, History, Target, Footprints, Menu, X } from "lucide-react";
import Link from "next/link";
import HabitList from "./HabitList";
import HabitSettings from "./HabitSettings";
import GoalSettings from "./GoalSettings";
import StepSettings from "./StepSettings";
import GoalsList, { GoalsListRef } from "./GoalsList";
import MoodPicker from "./MoodPicker";
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
    // Refresh les goals (dépendent des habitudes)
    goalsListRef.current?.refresh();
  }

  function refreshGoals() {
    goalsListRef.current?.refresh();
  }

  return (
    <>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-bold text-slate-800">Habit Tracker</h1>

          {/* Desktop menu */}
          <div className="hidden sm:flex items-center gap-2">
            {/* History button */}
            <Link href="/history" className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors" title="Historique">
              <History size={18} className="text-slate-600" />
            </Link>

            {/* Steps button */}
            <button
              onClick={() => setStepSettingsOpen(true)}
              className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Objectif de pas"
            >
              <Footprints size={18} className="text-slate-600" />
            </button>

            {/* Goals button */}
            <button
              onClick={() => setGoalsSettingsOpen(true)}
              className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Objectifs"
            >
              <Target size={18} className="text-slate-600" />
            </button>

            {/* Habits settings button */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Gérer mes habitudes"
            >
              <ListChecks size={18} className="text-slate-600" />
            </button>

            {/* User info */}
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl">
              <div className="w-7 h-7 bg-violet-100 rounded-full flex items-center justify-center">
                <User size={14} className="text-violet-600" />
              </div>
              <span className="text-sm text-slate-600 max-w-32 truncate">{userEmail}</span>
            </div>

            {/* Sign out */}
            <button onClick={handleSignOut} className="p-2.5 hover:bg-red-50 rounded-xl transition-colors cursor-pointer group" title="Déconnexion">
              <LogOut size={18} className="text-slate-400 group-hover:text-red-500" />
            </button>
          </div>

          {/* Mobile burger menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden p-2.5 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Menu"
          >
            {menuOpen ? <X size={20} className="text-slate-600" /> : <Menu size={20} className="text-slate-600" />}
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {menuOpen && (
          <div className="sm:hidden border-t border-slate-200 bg-white">
            <div className="max-w-2xl mx-auto px-4 py-3 space-y-2">
              {/* History button */}
              <Link
                href="/history"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 p-3 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <History size={20} className="text-slate-600" />
                <span className="text-slate-700 font-medium">Historique</span>
              </Link>

              {/* Steps button */}
              <button
                onClick={() => {
                  setStepSettingsOpen(true);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-left"
              >
                <Footprints size={20} className="text-slate-600" />
                <span className="text-slate-700 font-medium">Objectif de pas</span>
              </button>

              {/* Goals button */}
              <button
                onClick={() => {
                  setGoalsSettingsOpen(true);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-left"
              >
                <Target size={20} className="text-slate-600" />
                <span className="text-slate-700 font-medium">Objectifs</span>
              </button>

              {/* Habits settings button */}
              <button
                onClick={() => {
                  setSettingsOpen(true);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-left"
              >
                <ListChecks size={20} className="text-slate-600" />
                <span className="text-slate-700 font-medium">Gérer mes habitudes</span>
              </button>

              {/* Divider */}
              <div className="border-t border-slate-200 my-2"></div>

              {/* User info */}
              <div className="flex items-center gap-3 px-3 py-2 bg-slate-100 rounded-xl">
                <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center">
                  <User size={16} className="text-violet-600" />
                </div>
                <span className="text-sm text-slate-600 flex-1 truncate">{userEmail}</span>
              </div>

              {/* Sign out */}
              <button
                onClick={() => {
                  handleSignOut();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-red-50 rounded-xl transition-colors cursor-pointer text-left"
              >
                <LogOut size={20} className="text-red-500" />
                <span className="text-red-600 font-medium">Déconnexion</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Content - Bento Layout */}
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Section Mood */}
        <MoodPicker />

        <HabitList
          key={`habits-${habitsKey}`}
          onOpenSettings={() => setSettingsOpen(true)}
          onHabitToggle={refreshGoals}
          stepCounterKey={stepCounterKey}
        />

        {/* Section Objectifs */}
        <GoalsList ref={goalsListRef} onOpenSettings={() => setGoalsSettingsOpen(true)} />
      </div>

      {/* Settings Modal */}
      <HabitSettings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} onHabitsChange={handleHabitsChange} />

      {/* Goals Settings Modal */}
      <GoalSettings isOpen={goalsSettingsOpen} onClose={() => setGoalsSettingsOpen(false)} onGoalsChange={refreshGoals} />

      {/* Step Settings Modal */}
      <StepSettings isOpen={stepSettingsOpen} onClose={() => setStepSettingsOpen(false)} onStepGoalChange={() => setStepCounterKey((k) => k + 1)} />
    </>
  );
}
