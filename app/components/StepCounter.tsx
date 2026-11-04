"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { StepEntry } from "@/lib/types";
import { useToday, formatDateLocal } from "@/lib/hooks/useToday";
import { Footprints, TrendingUp, Minus, Target, CheckCircle } from "lucide-react";

const DEFAULT_DAILY_GOAL = 15000;

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajuste si dimanche
  return new Date(d.setDate(diff));
}

function getDateString(date: Date): string {
  return formatDateLocal(date);
}

function getWeekDays(): { date: string; dayName: string; dayShort: string }[] {
  const today = new Date();
  const monday = getMondayOfWeek(today);
  const days: { date: string; dayName: string; dayShort: string }[] = [];
  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(monday);
    currentDay.setDate(monday.getDate() + i);
    if (currentDay > today) break;

    days.push({
      date: getDateString(currentDay),
      dayName: dayNames[i],
      dayShort: dayNames[i],
    });
  }

  return days;
}

export default function StepCounter() {
  const [weekSteps, setWeekSteps] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [dailyGoal, setDailyGoal] = useState<number>(DEFAULT_DAILY_GOAL);
  const today = useToday();
  const weekDays = getWeekDays();
  const supabase = createClient();

  const fetchUserSettings = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return DEFAULT_DAILY_GOAL;

    const { data } = await supabase.from("user_settings").select("daily_step_goal").eq("user_id", user.id).maybeSingle();

    if (data) {
      return data.daily_step_goal;
    } else {
      const { data: newSettings } = await supabase
        .from("user_settings")
        .insert({ user_id: user.id, daily_step_goal: DEFAULT_DAILY_GOAL })
        .select()
        .single();

      return newSettings?.daily_step_goal || DEFAULT_DAILY_GOAL;
    }
  }, [supabase]);

  const fetchWeekSteps = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const goal = await fetchUserSettings();
    setDailyGoal(goal);

    const monday = getMondayOfWeek(new Date());
    const mondayStr = getDateString(monday);

    const { data } = await supabase.from("step_entries").select("*").gte("date", mondayStr).lte("date", today).order("date", { ascending: true });

    const stepsMap = new Map<string, number>();
    data?.forEach((entry: StepEntry) => {
      stepsMap.set(entry.date, entry.steps);
    });

    setWeekSteps(stepsMap);
    setLoading(false);
  }, [supabase, today, fetchUserSettings]);

  useEffect(() => {
    fetchWeekSteps();
  }, [fetchWeekSteps]);

  // Les pas peuvent arriver en arrière-plan (Raccourci Apple Santé) : on recharge au retour sur l'app
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") fetchWeekSteps();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchWeekSteps]);

  const stepsValues = Array.from(weekSteps.values());
  const daysWithData = stepsValues.filter((v) => v > 0).length;
  const totalSteps = stepsValues.reduce((acc, val) => acc + val, 0);
  const average = daysWithData > 0 ? Math.round(totalSteps / daysWithData) : 0;
  const todayValue = weekSteps.get(today) || 0;

  const todayProgressPercent = Math.min(100, Math.round((todayValue / dailyGoal) * 100));
  const todayGoalReached = todayValue >= dailyGoal;

  if (loading) {
    return (
      <div className="bento-card h-full bg-blue-50 dark:bg-blue-950/30 rounded-3xl animate-pulse min-h-[200px] border border-blue-400 dark:border-blue-900/50" />
    );
  }

  return (
    <div className="bento-card bg-blue-50 dark:bg-blue-950/30 p-5 rounded-3xl border border-blue-400 dark:border-blue-900/50 relative overflow-hidden">
      <div className={`absolute top-3 right-3 ${todayGoalReached ? "opacity-30" : "opacity-10"}`}>
        <Footprints size={40} strokeWidth={1.5} className={todayGoalReached ? "text-blue-500" : "text-blue-800 dark:text-blue-200"} />
      </div>

      <div className="relative z-10 space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-blue-600 dark:text-blue-400 text-xs font-medium uppercase tracking-wider">steps</p>
          <p className="text-[10px] text-blue-400 dark:text-blue-500">via Apple Santé</p>
        </div>

        <div className="flex items-baseline gap-2">
          <p className="text-4xl font-black leading-none text-slate-800 dark:text-slate-100">{todayValue.toLocaleString("fr-FR")}</p>
          <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">pas</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Target size={12} />
              <span>Objectif : {dailyGoal.toLocaleString("fr-FR")}/jour</span>
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{todayProgressPercent}%</span>
          </div>
          <div className="h-2.5 bg-blue-100 dark:bg-blue-900/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 bg-linear-to-r from-emerald-400 to-teal-500`}
              style={{ width: `${todayProgressPercent}%` }}
            />
          </div>
          {todayGoalReached && (
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs">
              <CheckCircle size={12} />
              <span>Objectif du jour atteint ! 🎉</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between bg-blue-100/50 dark:bg-blue-900/30 rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs">
            <TrendingUp size={14} />
            <span>Moyenne</span>
          </div>
          <div className="text-right">
            <span
              className={`text-lg font-bold ${
                average >= dailyGoal ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"
              }`}
            >
              {average.toLocaleString("fr-FR")}
            </span>
            <span className="text-slate-400 dark:text-slate-500 text-xs ml-1">/ {dailyGoal.toLocaleString("fr-FR")}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-blue-100 dark:border-blue-900/50">
          <div className="grid grid-cols-7 gap-1">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day, idx) => {
              const dayData = weekDays[idx];
              const hasData = dayData && weekSteps.has(dayData.date);
              const steps = dayData ? weekSteps.get(dayData.date) || 0 : 0;
              const isToday = dayData?.date === today;
              const isFuture = !dayData;

              return (
                <div
                  key={day}
                  className={`flex flex-col items-center py-2 rounded-xl transition-all ${
                    isToday ? "bg-blue-100 dark:bg-blue-900/50" : isFuture ? "opacity-30" : hasData ? "bg-blue-100/50 dark:bg-blue-900/30" : ""
                  }`}
                >
                  <span className="text-[10px] text-blue-400 dark:text-blue-500 mb-1">{day}</span>
                  {isFuture ? (
                    <Minus size={12} className="text-blue-200 dark:text-blue-700" />
                  ) : hasData ? (
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {steps >= 1000 ? `${Math.round(steps / 1000)}k` : steps}
                    </span>
                  ) : (
                    <span className="text-xs text-blue-200 dark:text-blue-700">0</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
