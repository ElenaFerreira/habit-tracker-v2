"use client";

import { GoalWithProgress } from "@/lib/types";
import { Target, Flame, Trophy, Calendar, TrendingUp, Star, Check, Gift } from "lucide-react";
import { HabitIcon } from "@/lib/icons";
import { createClient } from "@/lib/supabase/client";

interface GoalCardProps {
  goal: GoalWithProgress;
  onUpdate?: () => void;
}

function getPeriodLabel(period: string | null): string {
  switch (period) {
    case "week":
      return "cette semaine";
    case "month":
      return "ce mois";
    case "year":
      return "cette année";
    default:
      return "";
  }
}

export default function GoalCard({ goal, onUpdate }: GoalCardProps) {
  const supabase = createClient();
  const isStreak = goal.type === "streak";
  const isOneTime = goal.type === "one_time";
  const isQuantitative = goal.type === "quantitative";
  const progressClamp = Math.min(goal.progress_percent, 100);

  // Couleurs selon le type - plus sobre
  const getColors = () => {
    return {
      bgLight: "bg-slate-100",
      textAccent: "text-slate-600",
      progressGradient: "from-emerald-400 to-teal-500",
      badgeBg: "bg-slate-100",
      badgeText: "text-slate-600",
    };
  };

  const colors = getColors();

  // Marquer un goal one_time comme complété
  async function markAsCompleted() {
    const { error } = await supabase.from("goals").update({ completed_at: new Date().toISOString() }).eq("id", goal.id);

    if (!error && onUpdate) {
      onUpdate();
    }
  }

  // Icône à afficher
  const getIcon = () => {
    if (goal.habit_emoji) {
      return <HabitIcon name={goal.habit_emoji} size={20} className={colors.textAccent} />;
    }
    if (goal.icon) {
      return <HabitIcon name={goal.icon} size={20} className={colors.textAccent} />;
    }
    if (isOneTime) return <Star size={20} className={colors.textAccent} />;
    if (isStreak) return <Flame size={20} className={colors.textAccent} />;
    return <Target size={20} className={colors.textAccent} />;
  };

  // Badge type
  const getBadge = () => {
    if (isOneTime) return { icon: <Star size={12} />, label: "Accomplissement" };
    if (isStreak) return { icon: <Flame size={12} />, label: "Streak" };
    return { icon: <Target size={12} />, label: "Quantité" };
  };

  const badge = getBadge();

  return (
    <div className="bg-white rounded-2xl border border-rose-200 p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${colors.bgLight} rounded-xl flex items-center justify-center`}>{getIcon()}</div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{goal.name}</p>
            {goal.habit_name ? (
              <p className="text-xs text-slate-500">{goal.habit_name}</p>
            ) : (
              <p className="text-xs text-slate-400 italic">Objectif personnel</p>
            )}
          </div>
        </div>

        {/* Badge type */}
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${colors.badgeBg} ${colors.badgeText}`}>
          {badge.icon}
          {badge.label}
        </div>
      </div>

      {/* Contenu selon le type */}
      {isOneTime ? (
        // Goal one-time : bouton pour marquer comme fait
        <div className="space-y-3">
          {goal.is_completed ? (
            <div className="flex items-center justify-center gap-2 py-4 bg-emerald-50 rounded-xl">
              <Trophy size={24} className="text-emerald-500" />
              <div>
                <p className="font-semibold text-emerald-700">Objectif atteint !</p>
                {goal.completed_at && <p className="text-xs text-emerald-600">Le {new Date(goal.completed_at).toLocaleDateString("fr-FR")}</p>}
              </div>
            </div>
          ) : (
            <button
              onClick={markAsCompleted}
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl transition-all cursor-pointer"
            >
              <Check size={18} />
              Marquer comme accompli
            </button>
          )}

          {/* Date de fin si définie */}
          {goal.end_date && !goal.is_completed && (
            <div className="flex items-center justify-center gap-1 text-xs text-slate-400">
              <Calendar size={11} />
              <span>Objectif: {new Date(goal.end_date).toLocaleDateString("fr-FR")}</span>
            </div>
          )}
        </div>
      ) : (
        // Goals quantitatifs et streak : barre de progression
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-800">{goal.current_value}</span>
              <span className="text-slate-400 text-sm">/ {goal.target_value}</span>
            </div>

            {goal.is_completed && (
              <div className="flex items-center gap-1 text-emerald-500">
                <Trophy size={16} />
                <span className="text-xs font-semibold">Objectif atteint !</span>
              </div>
            )}
          </div>

          {/* Barre de progression */}
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full bg-linear-to-r ${colors.progressGradient} rounded-full transition-all duration-500`}
              style={{ width: `${progressClamp}%` }}
            />
          </div>

          {/* Footer infos */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <div className="flex items-center gap-1">
              {isStreak ? (
                <>
                  <TrendingUp size={12} />
                  <span>
                    {goal.target_value} jour{goal.target_value > 1 ? "s" : ""} consécutif{goal.target_value > 1 ? "s" : ""}
                  </span>
                </>
              ) : (
                <>
                  <Calendar size={12} />
                  <span>
                    {goal.target_value} fois {getPeriodLabel(goal.period)}
                  </span>
                </>
              )}
            </div>

            <span className="font-medium text-slate-600">{Math.round(progressClamp)}%</span>
          </div>

          {/* Date de fin si définie */}
          {goal.end_date && (
            <div className="flex items-center gap-1 text-xs text-slate-400 pt-1">
              <Calendar size={11} />
              <span>Fin: {new Date(goal.end_date).toLocaleDateString("fr-FR")}</span>
            </div>
          )}
        </div>
      )}

      {/* Récompense si définie */}
      {goal.reward && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs">
            <Gift size={14} className="text-slate-500" />
            <span className="text-slate-600">
              <span className="font-medium text-slate-700">Récompense :</span> {goal.reward}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
