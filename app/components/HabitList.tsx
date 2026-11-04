"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Habit, HabitWithStatus } from "@/lib/types";
import { HABITS_WITH_ARCHIVES, isActiveOn, isArchived } from "@/lib/habitArchive";
import { useToday, formatDateLocal } from "@/lib/hooks/useToday";
import HabitCheckbox from "./HabitCheckbox";
import StepCounter from "./StepCounter";
import { Sparkles, Calendar, TrendingUp, Flame } from "lucide-react";

function formatDate(dateStr: string): { weekday: string; day: string; month: string } {
  const date = new Date(dateStr + "T00:00:00");
  return {
    weekday: date.toLocaleDateString("fr-FR", { weekday: "long" }),
    day: date.toLocaleDateString("fr-FR", { day: "numeric" }),
    month: date.toLocaleDateString("fr-FR", { month: "long" }),
  };
}

function getPreviousDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  date.setDate(date.getDate() - 1);
  return formatDateLocal(date);
}

interface HabitListProps {
  onOpenSettings: () => void;
  onHabitToggle?: () => void; // Callback quand une habitude est cochée/décochée
  stepCounterKey?: number; // Key pour forcer le refresh de StepCounter
}

export default function HabitList({ onOpenSettings, onHabitToggle, stepCounterKey }: HabitListProps) {
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const today = useToday();
  const supabase = createClient();

  const fetchHabitsWithStatus = useCallback(async () => {
    // Toutes les habitudes (archivées comprises) : une habitude archivée compte
    // encore pour les flammes sur les jours où elle était active.
    const { data: habitsData } = await supabase.from("habits").select(HABITS_WITH_ARCHIVES).order("order_index", { ascending: true });

    if (!habitsData || habitsData.length === 0) {
      setHabits([]);
      setStreak(0);
      setLongestStreak(0);
      setLoading(false);
      return;
    }

    const allHabits: Habit[] = habitsData;
    const habitIds = allHabits.map((h) => h.id);
    const activeHabits = allHabits.filter((h) => !isArchived(h));
    const activeHabitIds = activeHabits.map((h) => h.id);
    const { data: completions } = await supabase.from("habit_completions").select("habit_id").in("habit_id", activeHabitIds).eq("date", today);

    const completedHabitIds = new Set(completions?.map((c) => c.habit_id) || []);

    const habitsWithStatus: HabitWithStatus[] = activeHabits.map((habit) => ({
      ...habit,
      completed_today: completedHabitIds.has(habit.id),
    }));

    setHabits(habitsWithStatus);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const { data: allCompletions } = await supabase
      .from("habit_completions")
      .select("habit_id, date")
      .in("habit_id", habitIds)
      .gte("date", formatDateLocal(ninetyDaysAgo));

    const completionsByDate = new Map<string, Set<string>>();
    allCompletions?.forEach((c) => {
      if (!completionsByDate.has(c.date)) {
        completionsByDate.set(c.date, new Set());
      }
      completionsByDate.get(c.date)!.add(c.habit_id);
    });

    // Jour parfait = toutes les habitudes actives ce jour-là sont cochées
    const isPerfectDay = (date: string): boolean => {
      const required = allHabits.filter((h) => isActiveOn(h, date));
      const done = completionsByDate.get(date);
      return required.length > 0 && !!done && required.every((h) => done.has(h.id));
    };

    let currentStreak = 0;
    let checkDate = isPerfectDay(today) ? today : getPreviousDate(today);

    while (isPerfectDay(checkDate)) {
      currentStreak++;
      checkDate = getPreviousDate(checkDate);
    }

    let maxStreak = 0;
    const perfectDaysSet = new Set<string>();
    completionsByDate.forEach((_, date) => {
      if (isPerfectDay(date)) {
        perfectDaysSet.add(date);
      }
    });

    let currentMaxStreak = 0;
    let checkDateForMax = formatDateLocal(ninetyDaysAgo);

    while (checkDateForMax <= today) {
      if (perfectDaysSet.has(checkDateForMax)) {
        currentMaxStreak++;
        maxStreak = Math.max(maxStreak, currentMaxStreak);
      } else {
        currentMaxStreak = 0;
      }

      // Passer à la date suivante
      const nextDate = new Date(checkDateForMax + "T00:00:00");
      nextDate.setDate(nextDate.getDate() + 1);
      checkDateForMax = formatDateLocal(nextDate);
    }

    maxStreak = Math.max(maxStreak, currentStreak);

    setStreak(currentStreak);
    setLongestStreak(maxStreak);
    setLoading(false);
  }, [supabase, today]);

  useEffect(() => {
    fetchHabitsWithStatus();
  }, [fetchHabitsWithStatus]);

  const handleHabitToggle = useCallback(
    (habitId: string, newCompleted: boolean) => {
      setHabits((prev) => prev.map((h) => (h.id === habitId ? { ...h, completed_today: newCompleted } : h)));
      const updatedHabits = habits.map((h) => (h.id === habitId ? { ...h, completed_today: newCompleted } : h));
      const allCompleted = updatedHabits.every((h) => h.completed_today);
      const wasAllCompleted = habits.every((h) => h.completed_today);

      if (allCompleted && !wasAllCompleted) {
        setStreak((s) => s + 1);
      } else if (!allCompleted && wasAllCompleted) {
        setStreak((s) => Math.max(0, s - 1));
      }

      fetchHabitsWithStatus();
      onHabitToggle?.();
    },
    [habits, fetchHabitsWithStatus, onHabitToggle]
  );

  const completedCount = habits.filter((h) => h.completed_today).length;
  const totalCount = habits.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const dateInfo = formatDate(today);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-4">
          <div className="h-36 bg-slate-200/50 dark:bg-zinc-800/50 rounded-3xl animate-pulse" />
          <div className="h-28 bg-slate-200/50 dark:bg-zinc-800/50 rounded-3xl animate-pulse" />
          <div className="h-48 bg-slate-200/50 dark:bg-zinc-800/50 rounded-3xl animate-pulse" />
        </div>
        <div className="md:col-span-2 h-64 bg-slate-200/50 dark:bg-zinc-800/50 rounded-3xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="flex flex-col gap-4">
        <div className="bento-card bg-slate-50 dark:bg-zinc-900 p-5 rounded-3xl border border-slate-200 dark:border-zinc-800 relative overflow-hidden">
          <div className="absolute top-3 right-3 opacity-10">
            <Calendar size={40} strokeWidth={1.5} className="text-slate-800 dark:text-slate-200" />
          </div>
          <div className="relative z-10">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Aujourd'hui</p>
            <p className="text-4xl font-black leading-none mb-0.5 text-slate-800 dark:text-slate-100">{dateInfo.day}</p>
            <p className="text-lg font-semibold capitalize text-slate-700 dark:text-slate-300">{dateInfo.month}</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs capitalize mt-1">{dateInfo.weekday}</p>
          </div>
        </div>

        <div className="bento-card bg-amber-50 dark:bg-amber-950/30 p-5 rounded-3xl border border-amber-200 dark:border-amber-900/50 relative overflow-hidden">
          <div className={`absolute top-3 right-3 ${streak >= 1 ? "opacity-30" : "opacity-10"}`}>
            <Flame size={40} strokeWidth={1.5} className={streak >= 1 ? "text-orange-500" : "text-amber-800 dark:text-amber-200"} />
          </div>
          <div className="relative z-10">
            <p className="text-amber-600 dark:text-amber-400 text-xs font-medium uppercase tracking-wider mb-1">Streaks</p>
            <div className="space-y-3">
              <div>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-black leading-none text-slate-800 dark:text-slate-100">{streak}</p>
                  <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">jour{streak > 1 ? "s" : ""}</p>
                </div>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                  {streak === 0 ? "Complète tout pour démarrer !" : streak >= 7 ? "🔥 En feu !" : "Continue comme ça !"}
                </p>
              </div>

              <div className="pt-2 border-t border-amber-200 dark:border-amber-800/50">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Série la plus longue</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{longestStreak}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <StepCounter key={`steps-${stepCounterKey || 0}`} />
      </div>

      <div className="md:col-span-2 bento-card bg-emerald-50 dark:bg-emerald-950/30 p-6 rounded-3xl border border-emerald-200 dark:border-emerald-900/50">
        {totalCount > 0 ? (
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center">
                    <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Progression</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{completedCount}</span>
                  <span className="text-slate-400 dark:text-slate-500">/ {totalCount}</span>
                </div>
              </div>
              <div className="h-3 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              {habits.map((habit) => (
                <HabitCheckbox key={habit.id} habit={habit} date={today} onToggle={(newCompleted) => handleHabitToggle(habit.id, newCompleted)} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 px-4">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles size={24} className="text-emerald-500 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Pas encore d'habitudes</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">Commence par créer tes premières habitudes à suivre !</p>
            <button
              onClick={onOpenSettings}
              className="px-5 py-2.5 bg-slate-800 dark:bg-slate-100 hover:bg-slate-900 dark:hover:bg-white text-white dark:text-slate-900 font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Configurer mes habitudes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
