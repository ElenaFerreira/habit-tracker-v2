"use client";

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { createClient } from "@/lib/supabase/client";
import { Goal, GoalWithProgress, Habit } from "@/lib/types";
import { formatDateLocal } from "@/lib/hooks/useToday";
import GoalCard from "./GoalCard";
import { Target, Plus, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

interface GoalsListProps {
  onOpenSettings: () => void;
}

export interface GoalsListRef {
  refresh: () => void;
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lundi = début de semaine
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getStartOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

function getDateString(date: Date): string {
  return formatDateLocal(date);
}

const GoalsList = forwardRef<GoalsListRef, GoalsListProps>(function GoalsList({ onOpenSettings }, ref) {
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const supabase = createClient();

  const calculateGoalProgress = useCallback(async () => {
    const { data: goalsData } = await supabase.from("goals").select("*").order("order_index", { ascending: true });

    if (!goalsData || goalsData.length === 0) {
      setGoals([]);
      setLoading(false);
      return;
    }

    const habitIds = goalsData.filter((g) => g.habit_id).map((g) => g.habit_id);
    let habitsMap = new Map<string, Habit>();

    if (habitIds.length > 0) {
      const { data: habitsData } = await supabase.from("habits").select("*").in("id", habitIds);
      habitsMap = new Map(habitsData?.map((h) => [h.id, h]) || []);
    }

    const today = new Date();
    const todayStr = getDateString(today);

    const goalsWithProgress: GoalWithProgress[] = await Promise.all(
      goalsData.map(async (goal: Goal) => {
        const habit = goal.habit_id ? habitsMap.get(goal.habit_id) : null;

        let current_value = 0;
        let is_completed = false;

        if (goal.type === "one_time") {
          is_completed = !!goal.completed_at;
          current_value = is_completed ? 1 : 0;
        } else if (goal.type === "quantitative" && goal.habit_id) {
          let startDate: string;
          let endDate: string = todayStr;

          switch (goal.period) {
            case "week":
              startDate = getDateString(getStartOfWeek(today));
              break;
            case "month":
              startDate = getDateString(getStartOfMonth(today));
              break;
            case "year":
              startDate = getDateString(getStartOfYear(today));
              break;
            default:
              startDate = goal.start_date || todayStr;
          }

          if (goal.end_date) {
            endDate = goal.end_date;
          }

          const { count } = await supabase
            .from("habit_completions")
            .select("*", { count: "exact", head: true })
            .eq("habit_id", goal.habit_id)
            .gte("date", startDate)
            .lte("date", endDate);

          current_value = count || 0;
          is_completed = current_value >= goal.target_value;
        } else if (goal.type === "streak" && goal.habit_id) {
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

          const { data: completions } = await supabase
            .from("habit_completions")
            .select("date")
            .eq("habit_id", goal.habit_id)
            .gte("date", getDateString(ninetyDaysAgo))
            .order("date", { ascending: false });

          const completedDates = new Set(completions?.map((c) => c.date) || []);

          let checkDate = new Date(today);
          if (!completedDates.has(todayStr)) {
            checkDate.setDate(checkDate.getDate() - 1);
          }

          while (completedDates.has(getDateString(checkDate))) {
            current_value++;
            checkDate.setDate(checkDate.getDate() - 1);
          }

          is_completed = current_value >= goal.target_value;
        }

        const progress_percent = goal.target_value > 0 ? (current_value / goal.target_value) * 100 : 0;

        return {
          ...goal,
          current_value,
          progress_percent,
          is_completed,
          habit_name: habit?.name || null,
          habit_emoji: habit?.emoji || null,
        };
      })
    );

    setGoals(goalsWithProgress);
    setLoading(false);
  }, [supabase]);

  useImperativeHandle(
    ref,
    () => ({
      refresh: calculateGoalProgress,
    }),
    [calculateGoalProgress]
  );

  useEffect(() => {
    calculateGoalProgress();
  }, [calculateGoalProgress]);

  useEffect(() => {
    const interval = setInterval(calculateGoalProgress, 30000);
    return () => clearInterval(interval);
  }, [calculateGoalProgress]);

  if (loading) {
    return (
      <div className="bento-card bg-rose-50 dark:bg-rose-950/30 p-6 rounded-3xl border border-rose-200 dark:border-rose-900/50">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-rose-100 dark:bg-rose-900/50 rounded w-32" />
          <div className="h-24 bg-rose-100 dark:bg-rose-900/50 rounded-xl" />
          <div className="h-24 bg-rose-100 dark:bg-rose-900/50 rounded-xl" />
        </div>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="bento-card bg-rose-50 dark:bg-rose-950/30 p-6 rounded-3xl border border-rose-200 dark:border-rose-900/50">
        <div className="text-center py-6">
          <div className="w-14 h-14 bg-rose-100 dark:bg-rose-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Target size={24} className="text-rose-500 dark:text-rose-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Pas encore d'objectifs</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">Définis des objectifs pour te motiver !</p>
          <button
            onClick={onOpenSettings}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 dark:bg-slate-100 hover:bg-slate-900 dark:hover:bg-white text-white dark:text-slate-900 font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <Plus size={18} />
            Créer un objectif
          </button>
        </div>
      </div>
    );
  }

  const activeGoals = goals.filter((g) => !g.is_completed);
  const completedGoals = goals.filter((g) => g.is_completed);

  return (
    <div className="bento-card bg-rose-50 dark:bg-rose-950/30 p-6 rounded-3xl border border-rose-200 dark:border-rose-900/50">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/50 rounded-xl flex items-center justify-center">
            <Target size={20} className="text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Mes objectifs</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeGoals.length} en cours · {completedGoals.length} atteint{completedGoals.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <button
          onClick={onOpenSettings}
          className="p-2.5 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-xl transition-colors cursor-pointer text-rose-600 dark:text-rose-400"
          title="Gérer mes objectifs"
        >
          <Plus size={18} />
        </button>
      </div>

      {activeGoals.length > 0 && (
        <div className="space-y-3 mb-4">
          {activeGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onUpdate={calculateGoalProgress} />
          ))}
        </div>
      )}

      {completedGoals.length > 0 && (
        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-500 dark:text-emerald-400" />
            <span>Objectifs atteints ({completedGoals.length})</span>
          </p>
          <div className="space-y-3 opacity-70">
            {(showAllCompleted ? completedGoals : completedGoals.slice(0, 2)).map((goal) => (
              <GoalCard key={goal.id} goal={goal} onUpdate={calculateGoalProgress} />
            ))}
          </div>
          {completedGoals.length > 2 && (
            <button
              onClick={() => setShowAllCompleted(!showAllCompleted)}
              className="w-full mt-3 py-2 px-3 flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-rose-100/50 dark:hover:bg-rose-900/30 rounded-lg transition-colors cursor-pointer"
            >
              {showAllCompleted ? (
                <>
                  <ChevronUp size={14} />
                  <span>Voir moins</span>
                </>
              ) : (
                <>
                  <ChevronDown size={14} />
                  <span>+{completedGoals.length - 2} autres objectifs atteints</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
});

export default GoalsList;
