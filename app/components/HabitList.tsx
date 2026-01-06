"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { HabitWithStatus } from "@/lib/types";
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
    // Récupérer les habitudes
    const { data: habitsData } = await supabase.from("habits").select("*").order("order_index", { ascending: true });

    if (!habitsData || habitsData.length === 0) {
      setHabits([]);
      setStreak(0);
      setLongestStreak(0);
      setLoading(false);
      return;
    }

    // Récupérer les complétions du jour
    const habitIds = habitsData.map((h) => h.id);
    const { data: completions } = await supabase.from("habit_completions").select("habit_id").in("habit_id", habitIds).eq("date", today);

    const completedHabitIds = new Set(completions?.map((c) => c.habit_id) || []);

    // Combiner les données
    const habitsWithStatus: HabitWithStatus[] = habitsData.map((habit) => ({
      ...habit,
      completed_today: completedHabitIds.has(habit.id),
    }));

    setHabits(habitsWithStatus);

    // Calculer le streak
    const totalHabits = habitsData.length;
    const todayCompleted = completedHabitIds.size === totalHabits;

    // Récupérer les complétions des 90 derniers jours pour calculer le streak
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const { data: allCompletions } = await supabase
      .from("habit_completions")
      .select("habit_id, date")
      .in("habit_id", habitIds)
      .gte("date", formatDateLocal(ninetyDaysAgo));

    // Grouper les complétions par date
    const completionsByDate = new Map<string, Set<string>>();
    allCompletions?.forEach((c) => {
      if (!completionsByDate.has(c.date)) {
        completionsByDate.set(c.date, new Set());
      }
      completionsByDate.get(c.date)!.add(c.habit_id);
    });

    // Calculer le streak actuel en remontant dans le temps
    let currentStreak = 0;
    let checkDate = todayCompleted ? today : getPreviousDate(today);

    while (true) {
      const dateCompletions = completionsByDate.get(checkDate);
      if (dateCompletions && dateCompletions.size === totalHabits) {
        currentStreak++;
        checkDate = getPreviousDate(checkDate);
      } else {
        break;
      }
    }

    // Calculer la série la plus longue
    let maxStreak = 0;

    // Créer un Set des dates parfaites pour un accès rapide
    const perfectDaysSet = new Set<string>();
    completionsByDate.forEach((habitIds, date) => {
      if (habitIds.size === totalHabits) {
        perfectDaysSet.add(date);
      }
    });

    // Parcourir toutes les dates depuis 90 jours en arrière jusqu'à aujourd'hui
    // pour trouver la série la plus longue
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

    // Vérifier aussi le streak actuel qui pourrait être plus long
    maxStreak = Math.max(maxStreak, currentStreak);

    setStreak(currentStreak);
    setLongestStreak(maxStreak);
    setLoading(false);
  }, [supabase, today]);

  useEffect(() => {
    fetchHabitsWithStatus();
  }, [fetchHabitsWithStatus]);

  // Mise à jour optimiste quand une habitude est cochée
  const handleHabitToggle = useCallback(
    (habitId: string, newCompleted: boolean) => {
      // Mise à jour optimiste des habitudes
      setHabits((prev) => prev.map((h) => (h.id === habitId ? { ...h, completed_today: newCompleted } : h)));

      // Calcul optimiste du streak
      const updatedHabits = habits.map((h) => (h.id === habitId ? { ...h, completed_today: newCompleted } : h));
      const allCompleted = updatedHabits.every((h) => h.completed_today);
      const wasAllCompleted = habits.every((h) => h.completed_today);

      if (allCompleted && !wasAllCompleted) {
        // On vient de compléter toutes les habitudes -> +1 streak
        setStreak((s) => s + 1);
      } else if (!allCompleted && wasAllCompleted) {
        // On vient de décocher une habitude alors que tout était fait -> -1 streak (si > 0)
        setStreak((s) => Math.max(0, s - 1));
      }

      // Refresh en arrière-plan pour synchroniser
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
          <div className="h-36 bg-slate-200/50 rounded-3xl animate-pulse" />
          <div className="h-28 bg-slate-200/50 rounded-3xl animate-pulse" />
          <div className="h-48 bg-slate-200/50 rounded-3xl animate-pulse" />
        </div>
        <div className="md:col-span-2 h-64 bg-slate-200/50 rounded-3xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Colonne gauche : Date + Streak */}
      <div className="flex flex-col gap-4">
        {/* Bento Card: Date d'aujourd'hui */}
        <div className="bento-card bg-slate-50 p-5 rounded-3xl border border-slate-200 relative overflow-hidden">
          <div className="absolute top-3 right-3 opacity-10">
            <Calendar size={40} strokeWidth={1.5} className="text-slate-800" />
          </div>
          <div className="relative z-10">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Aujourd'hui</p>
            <p className="text-4xl font-black leading-none mb-0.5 text-slate-800">{dateInfo.day}</p>
            <p className="text-lg font-semibold capitalize text-slate-700">{dateInfo.month}</p>
            <p className="text-slate-400 text-xs capitalize mt-1">{dateInfo.weekday}</p>
          </div>
        </div>

        {/* Bento Card: Streak */}
        <div className="bento-card bg-amber-50 p-5 rounded-3xl border border-amber-200 relative overflow-hidden">
          <div className={`absolute top-3 right-3 ${streak >= 1 ? "opacity-30" : "opacity-10"}`}>
            <Flame size={40} strokeWidth={1.5} className={streak >= 1 ? "text-orange-500" : "text-amber-800"} />
          </div>
          <div className="relative z-10">
            <p className="text-amber-600 text-xs font-medium uppercase tracking-wider mb-1">Streaks</p>
            <div className="space-y-3">
              {/* Streak actuel */}
              <div>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-black leading-none text-slate-800">{streak}</p>
                  <p className="text-lg font-semibold text-slate-700">jour{streak > 1 ? "s" : ""}</p>
                </div>
                <p className="text-slate-400 text-xs mt-1">
                  {streak === 0 ? "Complète tout pour démarrer !" : streak >= 7 ? "🔥 En feu !" : "Continue comme ça !"}
                </p>
              </div>

              {/* Série la plus longue */}
              <div className="pt-2 border-t border-amber-200">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-amber-600 font-medium">Série la plus longue</p>
                  <p className="text-lg font-bold text-slate-800">{longestStreak}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bento Card: Compteur de pas */}
        <StepCounter key={`steps-${stepCounterKey || 0}`} />
      </div>

      {/* Bento Card: Progression + Habitudes */}
      <div className="md:col-span-2 bento-card bg-emerald-50 p-6 rounded-3xl border border-emerald-200">
        {totalCount > 0 ? (
          <div className="space-y-5">
            {/* Barre de progression */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <TrendingUp size={16} className="text-emerald-600" />
                  </div>
                  <span className="text-slate-600 font-medium">Progression</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-800">{completedCount}</span>
                  <span className="text-slate-400">/ {totalCount}</span>
                </div>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Liste des habitudes */}
            <div className="space-y-2.5 pt-2">
              {habits.map((habit) => (
                <HabitCheckbox key={habit.id} habit={habit} date={today} onToggle={(newCompleted) => handleHabitToggle(habit.id, newCompleted)} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 px-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles size={24} className="text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Pas encore d'habitudes</h3>
            <p className="text-slate-500 text-sm mb-5">Commence par créer tes premières habitudes à suivre !</p>
            <button
              onClick={onOpenSettings}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Configurer mes habitudes
            </button>
          </div>
        )}
      </div>

      {/* TODO: Bento Card félicitations - désactivée pour l'instant */}
    </div>
  );
}
