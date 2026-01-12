"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { MoodType, MoodEntry, MOOD_CONFIG } from "@/lib/types";
import { useToday } from "@/lib/hooks/useToday";
import { Loader2, Sparkles } from "lucide-react";

// Ordre des moods pour l'affichage
const MOOD_ORDER: MoodType[] = ["best_day", "good", "moody", "bad", "awful"];

export default function MoodPicker() {
  const [todayMood, setTodayMood] = useState<MoodType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const today = useToday();

  const supabase = createClient();

  const fetchTodayMood = useCallback(
    async (currentDate: string) => {
      setLoading(true);
      setTodayMood(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data } = await supabase.from("mood_entries").select("*").eq("user_id", user.id).eq("date", currentDate).maybeSingle();

      if (data) {
        setTodayMood((data as MoodEntry).mood);
      }

      setLoading(false);
    },
    [supabase]
  );

  // Fetch initial et quand la date change
  useEffect(() => {
    fetchTodayMood(today);
  }, [fetchTodayMood, today]);

  async function selectMood(mood: MoodType) {
    if (!userId || saving) return;

    setSaving(true);

    // Si on clique sur le même mood, on le désélectionne
    if (todayMood === mood) {
      await supabase.from("mood_entries").delete().eq("user_id", userId).eq("date", today);
      setTodayMood(null);
    } else {
      // Upsert pour créer ou mettre à jour
      await supabase.from("mood_entries").upsert({ user_id: userId, date: today, mood }, { onConflict: "user_id,date" });
      setTodayMood(mood);
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="bento-card bg-violet-50 dark:bg-violet-950/30 p-6 rounded-3xl border border-violet-200 dark:border-violet-900/50">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="animate-spin text-violet-500 dark:text-violet-400" size={20} />
          <span className="text-violet-600 dark:text-violet-400">Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bento-card bg-violet-50 dark:bg-violet-950/30 p-6 rounded-3xl border border-violet-200 dark:border-violet-900/50">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900/50 rounded-xl flex items-center justify-center">
          <Sparkles size={16} className="text-violet-600 dark:text-violet-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Comment tu te sens aujourd'hui ?</h2>
      </div>

      {/* Mood buttons */}
      <div className="flex flex-wrap gap-2 justify-center">
        {MOOD_ORDER.map((mood) => {
          const config = MOOD_CONFIG[mood];
          const isSelected = todayMood === mood;

          return (
            <button
              key={mood}
              onClick={() => selectMood(mood)}
              disabled={saving}
              className={`
                flex flex-col items-center justify-center gap-1 w-[72px] h-[72px] rounded-2xl transition-all cursor-pointer
                ${
                  isSelected
                    ? `${config.bgColor} ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-500 dark:ring-offset-zinc-900 scale-105`
                    : "bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700"
                }
                ${saving ? "opacity-50 cursor-wait" : ""}
              `}
            >
              <span className="text-2xl">{config.emoji}</span>
              <span className={`text-xs font-medium ${isSelected ? config.color : "text-slate-500 dark:text-slate-400"}`}>{config.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
