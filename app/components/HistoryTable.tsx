"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Habit, StepEntry, MoodType, MoodEntry, MOOD_CONFIG } from "@/lib/types";
import { formatDateLocal } from "@/lib/hooks/useToday";
import { HabitIcon } from "@/lib/icons";
import { HABITS_WITH_ARCHIVES, isActiveOn } from "@/lib/habitArchive";
import { Check, ChevronLeft, ChevronRight, Footprints, Loader2, Sparkles, Home, Calendar } from "lucide-react";
import MonthlyStats from "./MonthlyStats";
import WeekPicker from "./WeekPicker";

const MOOD_ORDER: MoodType[] = ["best_day", "good", "moody", "bad", "awful"];

function getWeekDays(weekOffset: number = 0): { date: string; dayName: string; dayNum: string; monthName: string }[] {
  const days: { date: string; dayName: string; dayNum: string; monthName: string }[] = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentWeekMonday = new Date(today);
  const day = currentWeekMonday.getDay(); // 0 = dimanche, 1 = lundi, ...
  const diffToMonday = (day + 6) % 7; // 0 si lundi, 1 si mardi, etc.
  currentWeekMonday.setDate(currentWeekMonday.getDate() - diffToMonday);
  const startOfWeek = new Date(currentWeekMonday);
  startOfWeek.setDate(startOfWeek.getDate() - weekOffset * 7);

  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const monthNames = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "août", "sep", "oct", "nov", "déc"];

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
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

function isFutureDate(dateStr: string): boolean {
  const todayStr = formatDateLocal(new Date()); // ex: "2026-01-06"
  return dateStr > todayStr;
}

function getCurrentWeekMonday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = today.getDay();
  const diff = (day + 6) % 7;
  today.setDate(today.getDate() - diff);
  return today;
}

function getWeekStartFromOffset(offset: number): Date {
  const monday = getCurrentWeekMonday();
  monday.setDate(monday.getDate() - offset * 7);
  return monday;
}

function getOffsetFromWeekStart(weekStart: Date): number {
  const currentMonday = getCurrentWeekMonday();
  const diff = currentMonday.getTime() - weekStart.getTime();
  return Math.round(diff / (7 * 24 * 60 * 60 * 1000));
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
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);

  const days = getWeekDays(pageOffset);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);

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

    const { data: allHabitsData } = await supabase.from("habits").select(HABITS_WITH_ARCHIVES).order("order_index", { ascending: true });

    // On garde les habitudes actives au moins un jour de la semaine affichée
    const habitsData = (allHabitsData as Habit[] | null)?.filter((h) => pastDays.some((d) => isActiveOn(h, d.date))) ?? [];
    setHabits(habitsData);

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

    const { data: stepsData } = await supabase.from("step_entries").select("*").gte("date", startDate).lte("date", endDate);

    const stepsMap = new Map<string, number>();
    stepsData?.forEach((s: StepEntry) => {
      stepsMap.set(s.date, s.steps);
    });
    setSteps(stepsMap);

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

  async function toggleHabit(habitId: string, date: string) {
    const cellKey = `${habitId}-${date}`;
    setSavingCells((prev) => new Set(prev).add(cellKey));

    const dateCompletions = completions.get(date) || new Set();
    const isCompleted = dateCompletions.has(habitId);
    const newCompletions = new Map(completions);
    const newDateCompletions = new Set(dateCompletions);

    if (isCompleted) {
      newDateCompletions.delete(habitId);
      await supabase.from("habit_completions").delete().eq("habit_id", habitId).eq("date", date);
    } else {
      newDateCompletions.add(habitId);
      await supabase.from("habit_completions").upsert({ habit_id: habitId, date, completed: true }, { onConflict: "habit_id,date" });
    }

    newCompletions.set(date, newDateCompletions);
    setCompletions(newCompletions);

    // Rafraîchir les stats mensuelles
    setStatsRefreshKey((prev) => prev + 1);

    setSavingCells((prev) => {
      const newSet = new Set(prev);
      newSet.delete(cellKey);
      return newSet;
    });
  }

  async function saveSteps(date: string) {
    if (!userId) return;

    const stepsNum = parseInt(stepValue) || 0;
    const cellKey = `steps-${date}`;
    setSavingCells((prev) => new Set(prev).add(cellKey));

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
    setStatsRefreshKey((prev) => prev + 1);
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

  async function saveMood(date: string, mood: MoodType | null) {
    if (!userId) return;

    const cellKey = `mood-${date}`;
    setSavingCells((prev) => new Set(prev).add(cellKey));

    const newMoods = new Map(moods);

    if (mood === null) {
      await supabase.from("mood_entries").delete().eq("user_id", userId).eq("date", date);
      newMoods.delete(date);
    } else {
      await supabase.from("mood_entries").upsert({ user_id: userId, date, mood }, { onConflict: "user_id,date" });
      newMoods.set(date, mood);
    }

    setMoods(newMoods);
    setEditingMood(null);
    setStatsRefreshKey((prev) => prev + 1);
    setSavingCells((prev) => {
      const newSet = new Set(prev);
      newSet.delete(cellKey);
      return newSet;
    });
  }

  if (loading) {
    return (
      <div className="bento-card bg-slate-50 dark:bg-zinc-900 p-8 rounded-3xl border border-slate-200 dark:border-zinc-800">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="animate-spin text-slate-500 dark:text-slate-400" size={24} />
          <span className="text-slate-600 dark:text-slate-400">Chargement de l'historique...</span>
        </div>
      </div>
    );
  }

  if (habits.length === 0) {
    return (
      <div className="bento-card bg-slate-50 dark:bg-zinc-900 p-8 rounded-3xl border border-slate-200 dark:border-zinc-800 text-center">
        <Calendar className="mx-auto text-slate-400 mb-4" size={48} />
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Pas encore d'historique</h2>
        <p className="text-slate-500 dark:text-slate-400">Commence par créer des habitudes pour voir ton historique ici.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setPageOffset((p) => p + 1)}
          className="flex items-center justify-center gap-1.5 px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-700 hover:text-slate-800 dark:hover:text-slate-100 transition-all cursor-pointer"
        >
          <ChevronLeft size={16} />
          <span className="font-medium text-xs sm:text-sm hidden sm:inline">Semaine précédente</span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-center">
          <WeekPicker
            currentWeekStart={getWeekStartFromOffset(pageOffset)}
            onWeekSelect={(weekStart) => setPageOffset(getOffsetFromWeekStart(weekStart))}
          />
          {pageOffset > 0 && (
            <button
              onClick={() => setPageOffset(0)}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 sm:px-3 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs font-medium transition-all cursor-pointer"
              title="Retour à aujourd'hui"
            >
              <Home size={14} />
              <span className="hidden sm:inline">Aujourd'hui</span>
            </button>
          )}
        </div>

        <button
          onClick={() => setPageOffset((p) => Math.max(0, p - 1))}
          disabled={pageOffset === 0}
          className={`flex items-center justify-center gap-1.5 px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 transition-all ${
            pageOffset === 0
              ? "bg-slate-100 dark:bg-zinc-900 text-slate-400 dark:text-zinc-600 cursor-not-allowed"
              : "bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 cursor-pointer"
          }`}
        >
          <span className="font-medium text-xs sm:text-sm hidden sm:inline">Semaine suivante</span>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="bento-card bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">
                <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-300 font-semibold text-sm sticky left-0 bg-slate-50 dark:bg-zinc-800 z-10">
                  Habitude
                </th>
                {days.map((day) => (
                  <th key={day.date} className="py-4 px-3 text-center min-w-[70px]">
                    <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">{day.dayName}</div>
                    <div className="text-lg font-bold text-slate-700 dark:text-slate-200">{day.dayNum}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">{day.monthName}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 dark:border-zinc-800 bg-violet-50/50 dark:bg-violet-950/20">
                <td className="py-4 px-5 sticky left-0 bg-violet-50/80 dark:bg-violet-950/30 z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-violet-100 dark:bg-violet-900/50 rounded-xl flex items-center justify-center">
                      <Sparkles size={18} className="text-violet-600 dark:text-violet-400" />
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Humeur</span>
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
                                    isSelected
                                      ? `${config.bgColor} ring-2 ring-violet-400`
                                      : "bg-white/80 dark:bg-zinc-800 hover:bg-white dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700"
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
                            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium cursor-pointer"
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
                              : "bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border-2 border-dashed border-slate-200 dark:border-zinc-600 hover:border-slate-300 dark:hover:border-zinc-500"
                          } ${isSaving || isFuture ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          {isSaving ? (
                            <Loader2 size={16} className="animate-spin text-slate-400" />
                          ) : dayMood ? (
                            <span className="text-xl">{MOOD_CONFIG[dayMood].emoji}</span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>
                          )}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>

              <tr className="border-b border-slate-100 dark:border-zinc-800 bg-blue-50/50 dark:bg-blue-950/20">
                <td className="py-4 px-5 sticky left-0 bg-blue-50/80 dark:bg-blue-950/30 z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center">
                      <Footprints size={18} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Pas</span>
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
                            className="w-16 px-2 py-1.5 text-center text-sm border border-blue-300 dark:border-blue-600 bg-white dark:bg-zinc-800 text-slate-800 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500"
                            autoFocus
                          />
                          <button
                            onClick={() => saveSteps(day.date)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium cursor-pointer"
                          >
                            OK
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditingStep(day.date)}
                          disabled={isSaving || isFuture}
                          className={`w-16 py-2 rounded-xl text-sm font-semibold transition-all ${
                            daySteps > 0
                              ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50"
                              : "bg-slate-50 dark:bg-zinc-800 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-700"
                          } ${isSaving || isFuture ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          {isSaving ? "..." : daySteps > 0 ? daySteps.toLocaleString("fr-FR") : "—"}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>

              {habits.map((habit, idx) => (
                <tr
                  key={habit.id}
                  className={`border-b border-slate-100 dark:border-zinc-800 ${
                    idx % 2 === 0 ? "bg-emerald-50/30 dark:bg-emerald-950/10" : "bg-emerald-50/50 dark:bg-emerald-950/20"
                  }`}
                >
                  <td
                    className={`py-4 px-5 sticky left-0 z-10 ${
                      idx % 2 === 0 ? "bg-emerald-50/50 dark:bg-emerald-950/20" : "bg-emerald-50/70 dark:bg-emerald-950/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center">
                        <HabitIcon name={habit.emoji} size={18} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{habit.name}</span>
                    </div>
                  </td>
                  {days.map((day) => {
                    const isFuture = isFutureDate(day.date);
                    const isCompleted = completions.get(day.date)?.has(habit.id) || false;
                    const isSaving = savingCells.has(`${habit.id}-${day.date}`);

                    if (!isActiveOn(habit, day.date)) {
                      return (
                        <td key={day.date} className="py-3 px-2 text-center">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto text-slate-300 dark:text-zinc-600"
                            title="Habitude archivée ce jour-là"
                          >
                            —
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td key={day.date} className="py-3 px-2 text-center">
                        <button
                          onClick={() => toggleHabit(habit.id, day.date)}
                          disabled={isSaving || isFuture}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto transition-all ${
                            isCompleted
                              ? "bg-linear-to-br from-emerald-400 to-teal-500 shadow-md shadow-emerald-500/30 dark:shadow-emerald-500/20"
                              : "bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border-2 border-dashed border-slate-200 dark:border-zinc-600 hover:border-slate-300 dark:hover:border-zinc-500"
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

      <p className="text-center text-slate-400 dark:text-slate-500 text-sm">
        Clique sur une case pour modifier l'état d'une habitude ou éditer tes pas.
      </p>

      <MonthlyStats refreshKey={statsRefreshKey} />
    </div>
  );
}
