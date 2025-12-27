"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { HabitWithStatus } from "@/lib/types";
import HabitCheckbox from "./HabitCheckbox";
import { Sparkles } from "lucide-react";

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

interface HabitListProps {
  onOpenSettings: () => void;
}

export default function HabitList({ onOpenSettings }: HabitListProps) {
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [today] = useState(getTodayDate());
  const supabase = createClient();

  const fetchHabitsWithStatus = useCallback(async () => {
    // Récupérer les habitudes
    const { data: habitsData } = await supabase.from("habits").select("*").order("order_index", { ascending: true });

    if (!habitsData || habitsData.length === 0) {
      setHabits([]);
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
    setLoading(false);
  }, [supabase, today]);

  useEffect(() => {
    fetchHabitsWithStatus();
  }, [fetchHabitsWithStatus]);

  const completedCount = habits.filter((h) => h.completed_today).length;
  const totalCount = habits.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-slate-200 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec date */}
      <div>
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Aujourd'hui</p>
        <h2 className="text-2xl font-bold text-slate-900 capitalize">{formatDate(today)}</h2>
      </div>

      {/* Barre de progression */}
      {totalCount > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Progression</span>
            <span className="font-semibold text-slate-700">
              {completedCount}/{totalCount}
            </span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Liste des habitudes */}
      {habits.length > 0 ? (
        <div className="space-y-3">
          {habits.map((habit) => (
            <HabitCheckbox key={habit.id} habit={habit} date={today} onToggle={fetchHabitsWithStatus} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 px-6">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles size={28} className="text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Pas encore d'habitudes</h3>
          <p className="text-slate-500 text-sm mb-6">Commence par créer tes premières habitudes à suivre !</p>
          <button
            onClick={onOpenSettings}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Configurer mes habitudes
          </button>
        </div>
      )}

      {/* Message de félicitations */}
      {completedCount === totalCount && totalCount > 0 && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-center text-white">
          <span className="text-4xl mb-2 block">🎉</span>
          <p className="font-bold text-lg">Toutes les habitudes complétées !</p>
          <p className="text-white/80 text-sm mt-1">Continue comme ça, tu gères !</p>
        </div>
      )}
    </div>
  );
}
