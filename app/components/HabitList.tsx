"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { HabitWithStatus } from "@/lib/types";
import HabitCheckbox from "./HabitCheckbox";
import StepCounter from "./StepCounter";
import { Sparkles, Calendar, TrendingUp, Flame } from "lucide-react";

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDate(dateStr: string): { weekday: string; day: string; month: string } {
  const date = new Date(dateStr + "T00:00:00");
  return {
    weekday: date.toLocaleDateString("fr-FR", { weekday: "long" }),
    day: date.toLocaleDateString("fr-FR", { day: "numeric" }),
    month: date.toLocaleDateString("fr-FR", { month: "long" }),
  };
}

function getDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getPreviousDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  date.setDate(date.getDate() - 1);
  return getDateString(date);
}

interface HabitListProps {
  onOpenSettings: () => void;
}

export default function HabitList({ onOpenSettings }: HabitListProps) {
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [today] = useState(getTodayDate());
  const supabase = createClient();

  const fetchHabitsWithStatus = useCallback(async () => {
    // Récupérer les habitudes
    const { data: habitsData } = await supabase.from("habits").select("*").order("order_index", { ascending: true });

    if (!habitsData || habitsData.length === 0) {
      setHabits([]);
      setStreak(0);
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
      .gte("date", getDateString(ninetyDaysAgo));

    // Grouper les complétions par date
    const completionsByDate = new Map<string, Set<string>>();
    allCompletions?.forEach((c) => {
      if (!completionsByDate.has(c.date)) {
        completionsByDate.set(c.date, new Set());
      }
      completionsByDate.get(c.date)!.add(c.habit_id);
    });

    // Calculer le streak en remontant dans le temps
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

    setStreak(currentStreak);
    setLoading(false);
  }, [supabase, today]);

  useEffect(() => {
    fetchHabitsWithStatus();
  }, [fetchHabitsWithStatus]);

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
        <div className="bento-card bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 p-5 rounded-3xl text-white relative overflow-hidden">
          <div className="absolute top-3 right-3 opacity-20">
            <Calendar size={40} strokeWidth={1.5} />
          </div>
          <div className="relative z-10">
            <p className="text-white/80 text-xs font-medium uppercase tracking-wider mb-1">Aujourd'hui</p>
            <p className="text-4xl font-black leading-none mb-0.5">{dateInfo.day}</p>
            <p className="text-lg font-semibold capitalize">{dateInfo.month}</p>
            <p className="text-white/70 text-xs capitalize mt-1">{dateInfo.weekday}</p>
          </div>
        </div>

        {/* Bento Card: Streak */}
        <div className="bento-card bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-5 rounded-3xl text-white relative overflow-hidden">
          <div className="absolute top-3 right-3 opacity-20">
            <Flame size={40} strokeWidth={1.5} />
          </div>
          <div className="relative z-10">
            <p className="text-white/80 text-xs font-medium uppercase tracking-wider mb-1">Série</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-black leading-none">{streak}</p>
              <p className="text-lg font-semibold">jour{streak > 1 ? "s" : ""}</p>
            </div>
            <p className="text-white/70 text-xs mt-1">
              {streak === 0 ? "Complète tout pour démarrer !" : streak >= 7 ? "🔥 En feu !" : "Continue comme ça !"}
            </p>
          </div>
        </div>

        {/* Bento Card: Compteur de pas */}
        <StepCounter />
      </div>

      {/* Bento Card: Progression + Habitudes */}
      <div className="md:col-span-2 bento-card bg-white/70 backdrop-blur-sm p-6 rounded-3xl border border-white/50 shadow-lg shadow-orange-900/5">
        {totalCount > 0 ? (
          <div className="space-y-5">
            {/* Barre de progression */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
                    <TrendingUp size={16} className="text-amber-600" />
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
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Liste des habitudes */}
            <div className="space-y-2.5 pt-2">
              {habits.map((habit) => (
                <HabitCheckbox key={habit.id} habit={habit} date={today} onToggle={fetchHabitsWithStatus} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 px-4">
            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles size={24} className="text-amber-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Pas encore d'habitudes</h3>
            <p className="text-slate-500 text-sm mb-5">Commence par créer tes premières habitudes à suivre !</p>
            <button
              onClick={onOpenSettings}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors cursor-pointer"
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
