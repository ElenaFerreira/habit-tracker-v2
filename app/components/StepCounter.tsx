"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { StepEntry } from "@/lib/types";
import { Footprints, TrendingUp, Minus, Target, AlertTriangle, CheckCircle } from "lucide-react";

const WEEKLY_GOAL = 15000;

// Récupère le lundi de la semaine courante
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajuste si dimanche
  return new Date(d.setDate(diff));
}

function getDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

// Génère les jours de la semaine depuis lundi jusqu'à aujourd'hui
function getWeekDays(): { date: string; dayName: string; dayShort: string }[] {
  const today = new Date();
  const monday = getMondayOfWeek(today);
  const days: { date: string; dayName: string; dayShort: string }[] = [];
  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(monday);
    currentDay.setDate(monday.getDate() + i);

    // On s'arrête si on dépasse aujourd'hui
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
  const [todaySteps, setTodaySteps] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const today = getTodayDate();
  const weekDays = getWeekDays();
  const supabase = createClient();

  const fetchWeekSteps = useCallback(async () => {
    // Récupérer l'utilisateur connecté
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);

    const monday = getMondayOfWeek(new Date());
    const mondayStr = getDateString(monday);

    const { data } = await supabase.from("step_entries").select("*").gte("date", mondayStr).lte("date", today).order("date", { ascending: true });

    const stepsMap = new Map<string, number>();
    data?.forEach((entry: StepEntry) => {
      stepsMap.set(entry.date, entry.steps);
    });

    setWeekSteps(stepsMap);
    setTodaySteps(stepsMap.get(today)?.toString() || "");
    setLoading(false);
  }, [supabase, today]);

  useEffect(() => {
    fetchWeekSteps();
  }, [fetchWeekSteps]);

  const handleSaveSteps = async () => {
    if (!userId) return;

    const steps = parseInt(todaySteps) || 0;
    setSaving(true);

    // Vérifier si une entrée existe déjà pour aujourd'hui
    const { data: existing } = await supabase.from("step_entries").select("id").eq("user_id", userId).eq("date", today).single();

    let error;
    if (existing) {
      // Mettre à jour l'entrée existante
      const result = await supabase.from("step_entries").update({ steps }).eq("id", existing.id);
      error = result.error;
    } else {
      // Créer une nouvelle entrée
      const result = await supabase.from("step_entries").insert({ user_id: userId, date: today, steps });
      error = result.error;
    }

    if (!error) {
      const newMap = new Map(weekSteps);
      newMap.set(today, steps);
      setWeekSteps(newMap);
    }

    setSaving(false);
    setIsEditing(false);
  };

  // Calcul de la moyenne (seulement les jours avec des données)
  const stepsValues = Array.from(weekSteps.values());
  const totalSteps = stepsValues.reduce((acc, val) => acc + val, 0);
  const daysWithData = stepsValues.filter((v) => v > 0).length;
  const average = daysWithData > 0 ? Math.round(totalSteps / daysWithData) : 0;
  const todayValue = weekSteps.get(today) || 0;

  // Calcul de l'objectif et du rattrapage
  const daysPassed = weekDays.length; // Jours écoulés (lundi à aujourd'hui inclus)
  const hasEnteredToday = todayValue > 0;
  // Si on a déjà rentré ses pas aujourd'hui, il reste les jours APRÈS aujourd'hui
  // Sinon, aujourd'hui compte encore comme un jour pour faire des pas
  const daysRemaining = hasEnteredToday ? 7 - daysPassed : 7 - daysPassed + 1;
  const stepsRemaining = WEEKLY_GOAL - totalSteps;
  const stepsNeededPerDay = daysRemaining > 0 ? Math.round(stepsRemaining / daysRemaining) : stepsRemaining;
  const isOnTrack = stepsRemaining <= 0 || stepsNeededPerDay <= Math.round(WEEKLY_GOAL / 7);
  const progressPercent = Math.min(100, Math.round((totalSteps / WEEKLY_GOAL) * 100));

  if (loading) {
    return <div className="bento-card h-full bg-slate-200/50 rounded-3xl animate-pulse min-h-[200px]" />;
  }

  return (
    <div className="bento-card bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 p-5 rounded-3xl text-white relative overflow-hidden">
      <div className="absolute top-3 right-3 opacity-20">
        <Footprints size={40} strokeWidth={1.5} />
      </div>

      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-white/80 text-xs font-medium uppercase tracking-wider">Pas du jour</p>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              Modifier
            </button>
          )}
        </div>

        {/* Input ou affichage */}
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={todaySteps}
              onChange={(e) => setTodaySteps(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-white placeholder-white/50 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-white/30"
              autoFocus
            />
            <button
              onClick={handleSaveSteps}
              disabled={saving}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? "..." : "OK"}
            </button>
          </div>
        ) : (
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-black leading-none">{todayValue.toLocaleString("fr-FR")}</p>
            <p className="text-lg font-semibold">pas</p>
          </div>
        )}

        {/* Objectif hebdo */}
        <div className="space-y-2">
          {/* Barre de progression vers l'objectif */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Target size={12} />
              <span>Objectif : {WEEKLY_GOAL.toLocaleString("fr-FR")}/sem</span>
            </div>
            <span className="font-semibold">
              {totalSteps.toLocaleString("fr-FR")} ({progressPercent}%)
            </span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isOnTrack ? "bg-white" : "bg-amber-300"}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Message de rattrapage */}
          {stepsRemaining <= 0 ? (
            <div className="flex items-center gap-2 text-white/90 text-xs">
              <CheckCircle size={12} />
              <span>Objectif atteint ! Bravo 🎉</span>
            </div>
          ) : isOnTrack ? (
            <div className="flex items-center gap-2 text-white/90 text-xs">
              <CheckCircle size={12} />
              <span>En rythme ! Reste {stepsRemaining.toLocaleString("fr-FR")} pas à faire 👍</span>
            </div>
          ) : (
            <div className="flex items-start gap-2 bg-white/10 rounded-lg px-2.5 py-2 text-xs">
              <AlertTriangle size={14} className="text-amber-300 shrink-0 mt-0.5" />
              <div>
                <span className="text-white/80">Reste </span>
                <span className="text-amber-200 font-semibold">{stepsRemaining.toLocaleString("fr-FR")} pas</span>
                <span className="text-white/80"> à faire{daysRemaining > 0 ? ` en ${daysRemaining} jour${daysRemaining > 1 ? "s" : ""}` : ""}</span>
                {daysRemaining > 0 && (
                  <>
                    <span className="text-white/80"> → </span>
                    <span className="font-bold text-white">{stepsNeededPerDay.toLocaleString("fr-FR")}</span>
                    <span className="text-white/80"> pas/jour</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Moyenne */}
        <div className="flex items-center gap-2 text-white/70 text-xs">
          <TrendingUp size={12} />
          <span>
            Moyenne : <span className="font-semibold">{average.toLocaleString("fr-FR")}</span> pas/jour
          </span>
        </div>

        {/* Barre des jours de la semaine */}
        <div className="pt-2 border-t border-white/20">
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
                    isToday ? "bg-white/25" : isFuture ? "opacity-30" : hasData ? "bg-white/10" : ""
                  }`}
                >
                  <span className="text-[10px] text-white/70 mb-1">{day}</span>
                  {isFuture ? (
                    <Minus size={12} className="text-white/40" />
                  ) : hasData ? (
                    <span className="text-xs font-bold">{steps >= 1000 ? `${Math.round(steps / 1000)}k` : steps}</span>
                  ) : (
                    <span className="text-xs text-white/50">0</span>
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
