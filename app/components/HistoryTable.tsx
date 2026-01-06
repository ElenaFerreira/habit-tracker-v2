"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Habit, StepEntry, MoodType, MoodEntry, MOOD_CONFIG } from "@/lib/types";
import { formatDateLocal } from "@/lib/hooks/useToday";
import { HabitIcon } from "@/lib/icons";
import { Check, ChevronLeft, ChevronRight, Footprints, Calendar, Loader2, Sparkles, Home } from "lucide-react";
import MonthlyStats from "./MonthlyStats";

// Ordre des moods pour l'affichage dans le sélecteur
const MOOD_ORDER: MoodType[] = ["best_day", "good", "moody", "bad", "awful"];

// Génère les jours d'une semaine (lundi -> dimanche), weekOffset = 0 = semaine actuelle, 1 = semaine précédente, etc.
function getWeekDays(weekOffset: number = 0): { date: string; dayName: string; dayNum: string; monthName: string }[] {
  const days: { date: string; dayName: string; dayNum: string; monthName: string }[] = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Trouver le lundi de la semaine courante
  const currentWeekMonday = new Date(today);
  const day = currentWeekMonday.getDay(); // 0 = dimanche, 1 = lundi, ...
  const diffToMonday = (day + 6) % 7; // 0 si lundi, 1 si mardi, etc.
  currentWeekMonday.setDate(currentWeekMonday.getDate() - diffToMonday);

  // Appliquer l'offset de semaine (en arrière uniquement)
  const startOfWeek = new Date(currentWeekMonday);
  startOfWeek.setDate(startOfWeek.getDate() - weekOffset * 7);

  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const monthNames = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "août", "sep", "oct", "nov", "déc"];

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);

    // dayNames commence à Lundi = index 0
    const dayNameIndex = i % 7;

    days.push({
      date: formatDateLocal(date),
      dayName: dayNames[dayNameIndex],
      dayNum: date.getDate().toString(),
      monthName: monthNames[date.getMonth()],
    });
  }

  return days;
}

// Indique si une date (YYYY-MM-DD) est dans le futur par rapport à aujourd'hui (en se basant sur la date locale formatée)
function isFutureDate(dateStr: string): boolean {
  const todayStr = formatDateLocal(new Date()); // ex: "2026-01-06"
  return dateStr > todayStr;
}

export default function HistoryTable() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<Map<string, Set<string>>>(new Map());
  const [steps, setSteps] = useState<Map<string, number>>(new Map());
  const [moods, setMoods] = useState<Map<string, MoodType>>(new Map());
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [editingMood, setEditingMood] = useState<string | null>(null);
  const [stepValue, setStepValue] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  const [pageOffset, setPageOffset] = useState(0); // 0 = semaine actuelle (lundi -> dimanche), 1 = semaine précédente, etc.
  const [userId, setUserId] = useState<string | null>(null);

  const days = getWeekDays(pageOffset);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Récupérer l'utilisateur
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);

    const pastDays = getWeekDays(pageOffset);
    const startDate = pastDays[0]?.date;
    const endDate = pastDays[pastDays.length - 1]?.date;

    if (!startDate || !endDate) {
      setLoading(false);
      return;
    }

    // Récupérer les habitudes
    const { data: habitsData } = await supabase.from("habits").select("*").order("order_index", { ascending: true });

    setHabits(habitsData || []);

    // Récupérer les complétions
    if (habitsData && habitsData.length > 0) {
      const habitIds = habitsData.map((h) => h.id);
      const { data: completionsData } = await supabase
        .from("habit_completions")
        .select("habit_id, date")
        .in("habit_id", habitIds)
        .gte("date", startDate)
        .lte("date", endDate);

      const completionsMap = new Map<string, Set<string>>();
      completionsData?.forEach((c) => {
        if (!completionsMap.has(c.date)) {
          completionsMap.set(c.date, new Set());
        }
        completionsMap.get(c.date)!.add(c.habit_id);
      });
      setCompletions(completionsMap);
    }

    // Récupérer les pas
    const { data: stepsData } = await supabase.from("step_entries").select("*").gte("date", startDate).lte("date", endDate);

    const stepsMap = new Map<string, number>();
    stepsData?.forEach((s: StepEntry) => {
      stepsMap.set(s.date, s.steps);
    });
    setSteps(stepsMap);

    // Récupérer les moods
    const { data: moodsData } = await supabase.from("mood_entries").select("*").gte("date", startDate).lte("date", endDate);

    const moodsMap = new Map<string, MoodType>();
    moodsData?.forEach((m: MoodEntry) => {
      moodsMap.set(m.date, m.mood);
    });
    setMoods(moodsMap);

    setLoading(false);
  }, [supabase, pageOffset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle une habitude
  async function toggleHabit(habitId: string, date: string) {
    const cellKey = `${habitId}-${date}`;
    setSavingCells((prev) => new Set(prev).add(cellKey));

    const dateCompletions = completions.get(date) || new Set();
    const isCompleted = dateCompletions.has(habitId);

    // Optimistic update
    const newCompletions = new Map(completions);
    const newDateCompletions = new Set(dateCompletions);

    if (isCompleted) {
      newDateCompletions.delete(habitId);
      // Supprimer dans la DB
      await supabase.from("habit_completions").delete().eq("habit_id", habitId).eq("date", date);
    } else {
      newDateCompletions.add(habitId);
      // Ajouter dans la DB
      await supabase.from("habit_completions").upsert({ habit_id: habitId, date, completed: true }, { onConflict: "habit_id,date" });
    }

    newCompletions.set(date, newDateCompletions);
    setCompletions(newCompletions);

    setSavingCells((prev) => {
      const newSet = new Set(prev);
      newSet.delete(cellKey);
      return newSet;
    });
  }

  // Sauvegarder les pas
  async function saveSteps(date: string) {
    if (!userId) return;

    const stepsNum = parseInt(stepValue) || 0;
    const cellKey = `steps-${date}`;
    setSavingCells((prev) => new Set(prev).add(cellKey));

    // Vérifier si une entrée existe (maybeSingle pour éviter erreur 406 si pas de résultat)
    const { data: existing } = await supabase.from("step_entries").select("id").eq("user_id", userId).eq("date", date).maybeSingle();

    if (existing) {
      await supabase.from("step_entries").update({ steps: stepsNum }).eq("id", existing.id);
    } else if (stepsNum > 0) {
      await supabase.from("step_entries").insert({ user_id: userId, date, steps: stepsNum });
    }

    const newSteps = new Map(steps);
    if (stepsNum > 0) {
      newSteps.set(date, stepsNum);
    } else {
      newSteps.delete(date);
    }
    setSteps(newSteps);

    setSavingCells((prev) => {
      const newSet = new Set(prev);
      newSet.delete(cellKey);
      return newSet;
    });

    setEditingStep(null);
  }

  function startEditingStep(date: string) {
    setEditingStep(date);
    setStepValue(steps.get(date)?.toString() || "");
  }

  // Sauvegarder le mood
  async function saveMood(date: string, mood: MoodType | null) {
    if (!userId) return;

    const cellKey = `mood-${date}`;
    setSavingCells((prev) => new Set(prev).add(cellKey));

    const newMoods = new Map(moods);

    if (mood === null) {
      // Supprimer le mood
      await supabase.from("mood_entries").delete().eq("user_id", userId).eq("date", date);
      newMoods.delete(date);
    } else {
      // Upsert le mood
      await supabase.from("mood_entries").upsert({ user_id: userId, date, mood }, { onConflict: "user_id,date" });
      newMoods.set(date, mood);
    }

    setMoods(newMoods);
    setEditingMood(null);

    setSavingCells((prev) => {
      const newSet = new Set(prev);
      newSet.delete(cellKey);
      return newSet;
    });
  }

  if (loading) {
    return (
      <div className="bento-card bg-slate-50 p-8 rounded-3xl border border-slate-200">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="animate-spin text-slate-500" size={24} />
          <span className="text-slate-600">Chargement de l'historique...</span>
        </div>
      </div>
    );
  }

  if (habits.length === 0) {
    return (
      <div className="bento-card bg-slate-50 p-8 rounded-3xl border border-slate-200 text-center">
        <Calendar className="mx-auto text-slate-400 mb-4" size={48} />
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Pas encore d'historique</h2>
        <p className="text-slate-500">Commence par créer des habitudes pour voir ton historique ici.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Semaine précédente */}
        <button
          onClick={() => setPageOffset((p) => p + 1)}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-xs sm:text-sm sm:px-4 sm:py-2.5 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer"
        >
          <ChevronLeft size={16} />
          <span className="font-medium">Semaine précédente</span>
        </button>

        {/* Période affichée + retour aujourd'hui */}
        <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-3">
          <div className="flex items-center justify-center gap-2 text-slate-500 text-xs sm:text-sm">
            <Calendar size={16} />
            <span>
              {days[0]?.dayNum} {days[0]?.monthName} - {days[days.length - 1]?.dayNum} {days[days.length - 1]?.monthName}
            </span>
          </div>
          {pageOffset > 0 && (
            <button
              onClick={() => setPageOffset(0)}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded-lg border border-slate-200 text-xs font-medium transition-all cursor-pointer"
              title="Retour à aujourd'hui"
            >
              <Home size={14} />
              <span>Aujourd'hui</span>
            </button>
          )}
        </div>

        {/* Semaine suivante */}
        <button
          onClick={() => setPageOffset((p) => Math.max(0, p - 1))}
          disabled={pageOffset === 0}
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm sm:px-4 sm:py-2.5 transition-all ${
            pageOffset === 0
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 cursor-pointer"
          }`}
        >
          <span className="font-medium">Semaine suivante</span>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Tableau */}
      <div className="bento-card bg-white rounded-3xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-4 px-5 text-slate-600 font-semibold text-sm sticky left-0 bg-slate-50 z-10">Habitude</th>
                {days.map((day) => (
                  <th key={day.date} className="py-4 px-3 text-center min-w-[70px]">
                    <div className="text-xs text-slate-400 font-medium">{day.dayName}</div>
                    <div className="text-lg font-bold text-slate-700">{day.dayNum}</div>
                    <div className="text-[10px] text-slate-400 uppercase">{day.monthName}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Ligne pour le mood */}
              <tr className="border-b border-slate-100 bg-violet-50/50">
                <td className="py-4 px-5 sticky left-0 bg-violet-50/80 z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
                      <Sparkles size={18} className="text-violet-600" />
                    </div>
                    <span className="font-medium text-slate-700">Humeur</span>
                  </div>
                </td>
                {days.map((day) => {
                  const isFuture = isFutureDate(day.date);
                  const dayMood = moods.get(day.date);
                  const isEditing = editingMood === day.date;
                  const isSaving = savingCells.has(`mood-${day.date}`);

                  return (
                    <td key={day.date} className="py-3 px-2 text-center">
                      {isEditing ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex flex-wrap justify-center gap-1">
                            {MOOD_ORDER.map((mood) => {
                              const config = MOOD_CONFIG[mood];
                              const isSelected = dayMood === mood;
                              return (
                                <button
                                  key={mood}
                                  onClick={() => saveMood(day.date, isSelected ? null : mood)}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                    isSelected ? `${config.bgColor} ring-2 ring-violet-400` : "bg-white/80 hover:bg-white border border-slate-200"
                                  }`}
                                  title={config.label}
                                >
                                  <span className="text-base">{config.emoji}</span>
                                </button>
                              );
                            })}
                          </div>
                          <button
                            onClick={() => setEditingMood(null)}
                            className="text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
                          >
                            Fermer
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingMood(day.date)}
                          disabled={isSaving || isFuture}
                          className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto transition-all ${
                            dayMood
                              ? `${MOOD_CONFIG[dayMood].bgColor} hover:opacity-80`
                              : "bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-200 hover:border-slate-300"
                          } ${isSaving || isFuture ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          {isSaving ? (
                            <Loader2 size={16} className="animate-spin text-slate-400" />
                          ) : dayMood ? (
                            <span className="text-xl">{MOOD_CONFIG[dayMood].emoji}</span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Ligne pour les pas */}
              <tr className="border-b border-slate-100 bg-blue-50/50">
                <td className="py-4 px-5 sticky left-0 bg-blue-50/80 z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Footprints size={18} className="text-blue-600" />
                    </div>
                    <span className="font-medium text-slate-700">Pas</span>
                  </div>
                </td>
                {days.map((day) => {
                  const isFuture = isFutureDate(day.date);
                  const daySteps = steps.get(day.date) || 0;
                  const isEditing = editingStep === day.date;
                  const isSaving = savingCells.has(`steps-${day.date}`);

                  return (
                    <td key={day.date} className="py-3 px-2 text-center">
                      {isEditing ? (
                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="number"
                            value={stepValue}
                            onChange={(e) => setStepValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveSteps(day.date);
                              if (e.key === "Escape") setEditingStep(null);
                            }}
                            className="w-16 px-2 py-1.5 text-center text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            autoFocus
                          />
                          <button
                            onClick={() => saveSteps(day.date)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                          >
                            OK
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditingStep(day.date)}
                          disabled={isSaving || isFuture}
                          className={`w-16 py-2 rounded-xl text-sm font-semibold transition-all ${
                            daySteps > 0 ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                          } ${isSaving || isFuture ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          {isSaving ? "..." : daySteps > 0 ? daySteps.toLocaleString("fr-FR") : "—"}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Lignes pour chaque habitude */}
              {habits.map((habit, idx) => (
                <tr key={habit.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? "bg-emerald-50/30" : "bg-emerald-50/50"}`}>
                  <td className={`py-4 px-5 sticky left-0 z-10 ${idx % 2 === 0 ? "bg-emerald-50/50" : "bg-emerald-50/70"}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <HabitIcon name={habit.emoji} size={18} className="text-emerald-600" />
                      </div>
                      <span className="font-medium text-slate-700">{habit.name}</span>
                    </div>
                  </td>
                  {days.map((day) => {
                    const isFuture = isFutureDate(day.date);
                    const isCompleted = completions.get(day.date)?.has(habit.id) || false;
                    const isSaving = savingCells.has(`${habit.id}-${day.date}`);

                    return (
                      <td key={day.date} className="py-3 px-2 text-center">
                        <button
                          onClick={() => toggleHabit(habit.id, day.date)}
                          disabled={isSaving || isFuture}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto transition-all ${
                            isCompleted
                              ? "bg-linear-to-br from-emerald-400 to-teal-500 shadow-md shadow-emerald-500/30"
                              : "bg-slate-100 hover:bg-slate-200 border-2 border-dashed border-slate-200 hover:border-slate-300"
                          } ${isSaving || isFuture ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          {isSaving ? (
                            <Loader2 size={16} className="animate-spin text-slate-400" />
                          ) : isCompleted ? (
                            <Check size={18} className="text-white" strokeWidth={3} />
                          ) : null}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note d'info */}
      <p className="text-center text-slate-400 text-sm">Clique sur une case pour modifier l'état d'une habitude ou éditer tes pas.</p>

      {/* Statistiques mensuelles */}
      <MonthlyStats />
    </div>
  );
}
