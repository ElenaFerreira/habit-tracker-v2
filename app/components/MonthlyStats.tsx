"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { StepEntry, Habit, HabitCompletion, MoodEntry, MoodType, MOOD_CONFIG } from "@/lib/types";
import { formatDateLocal } from "@/lib/hooks/useToday";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Calendar, Footprints, Target, CheckCircle, Sparkles, ListChecks, ChevronLeft, ChevronRight } from "lucide-react";
import { HabitIcon } from "@/lib/icons";

interface MonthlyData {
  month: string;
  total: number;
  average: number;
  daysWithData: number;
  dailyData: { date: string; steps: number }[];
}

interface HabitStats {
  habit: Habit;
  completions: number;
  totalDays: number;
  completionRate: number;
}

interface MoodStats {
  mood: MoodType;
  count: number;
  percentage: number;
}

// Obtient le premier et dernier jour d'un mois
function getMonthRange(monthOffset: number): { start: string; end: string; monthName: string } {
  const today = new Date();
  const targetMonth = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);

  const start = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
  const end = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);

  const monthNames = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

  return {
    start: formatDateLocal(start),
    end: formatDateLocal(end),
    monthName: monthNames[targetMonth.getMonth()],
  };
}

interface MonthlyStatsProps {
  refreshKey?: number; // Clé pour forcer le rafraîchissement
}

export default function MonthlyStats({ refreshKey }: MonthlyStatsProps = {}) {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [habitStats, setHabitStats] = useState<HabitStats[]>([]);
  const [moodStats, setMoodStats] = useState<MoodStats[]>([]);
  const [moodDailyData, setMoodDailyData] = useState<{ date: string; mood: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [dailyGoal, setDailyGoal] = useState<number>(15000);
  const [monthOffset, setMonthOffset] = useState<number>(0); // 0 = mois actuel, 1 = mois précédent, etc.
  const supabase = createClient();

  const fetchUserSettings = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 15000;

    const { data } = await supabase.from("user_settings").select("daily_step_goal").eq("user_id", user.id).maybeSingle();
    return data?.daily_step_goal || 15000;
  }, [supabase]);

  const fetchMonthlyData = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);

    const goal = await fetchUserSettings();
    setDailyGoal(goal);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDateLocal(today);

    // Récupérer les données pour le mois sélectionné uniquement
    const { start, end, monthName } = getMonthRange(monthOffset);

    // Pour le mois actuel (offset 0), limiter à aujourd'hui, sinon utiliser la fin du mois
    const isCurrentMonth = monthOffset === 0;
    const queryEndDate = isCurrentMonth ? todayStr : end;

    const { data: stepsData } = await supabase
      .from("step_entries")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", start)
      .lte("date", queryEndDate)
      .order("date", { ascending: true });

    const stepsMap = new Map<string, number>();
    stepsData?.forEach((entry: StepEntry) => {
      stepsMap.set(entry.date, entry.steps);
    });

    // Créer un tableau avec tous les jours du mois (ou jusqu'à aujourd'hui pour le mois actuel)
    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    const endDateForLoop = isCurrentMonth ? today : new Date(end);
    endDateForLoop.setHours(23, 59, 59, 999); // Inclure toute la journée
    const dailyData: { date: string; steps: number }[] = [];

    for (let d = new Date(startDate); d <= endDateForLoop; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDateLocal(d);
      const day = d.getDate();
      const steps = stepsMap.get(dateStr) || 0;

      dailyData.push({ date: `${day}`, steps });
    }

    const total = Array.from(stepsMap.values()).reduce((acc, val) => acc + val, 0);
    const daysWithData = stepsMap.size;
    const average = daysWithData > 0 ? Math.round(total / daysWithData) : 0;

    setMonthlyData([
      {
        month: monthName,
        total,
        average,
        daysWithData,
        dailyData,
      },
    ]);

    // Récupérer les données des habitudes pour le mois sélectionné
    const { start: monthStart } = getMonthRange(monthOffset);
    const habitQueryEndDate = isCurrentMonth ? todayStr : end;

    // Récupérer les habitudes
    const { data: habitsData } = await supabase.from("habits").select("*").order("order_index", { ascending: true });

    if (habitsData && habitsData.length > 0) {
      const habitIds = habitsData.map((h) => h.id);
      const { data: completionsData } = await supabase
        .from("habit_completions")
        .select("habit_id, date")
        .in("habit_id", habitIds)
        .gte("date", monthStart)
        .lte("date", habitQueryEndDate);

      // Calculer les stats par habitude
      const stats: HabitStats[] = [];
      const habitStartDate = new Date(monthStart);
      habitStartDate.setHours(0, 0, 0, 0);
      const habitEndDate = isCurrentMonth ? new Date(today) : new Date(end);
      habitEndDate.setHours(23, 59, 59, 999);
      // Calculer le nombre de jours inclus (de startDate à endDate inclus)
      // Pour le mois actuel, on compte du 1er du mois jusqu'à aujourd'hui inclus
      const totalDays = Math.floor((habitEndDate.getTime() - habitStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      habitsData.forEach((habit) => {
        const completions = completionsData?.filter((c) => c.habit_id === habit.id).length || 0;
        const completionRate = totalDays > 0 ? Math.round((completions / totalDays) * 100) : 0;

        stats.push({
          habit,
          completions,
          totalDays,
          completionRate,
        });
      });

      // Trier par taux de complétion décroissant
      stats.sort((a, b) => b.completionRate - a.completionRate);
      setHabitStats(stats);
    }

    // Récupérer les données de l'humeur pour le mois sélectionné
    const { data: moodsData } = await supabase
      .from("mood_entries")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", monthStart)
      .lte("date", habitQueryEndDate)
      .order("date", { ascending: true });

    if (moodsData && moodsData.length > 0) {
      // Calculer la répartition des humeurs
      const moodCounts = new Map<MoodType, number>();
      moodsData.forEach((entry: MoodEntry) => {
        const count = moodCounts.get(entry.mood) || 0;
        moodCounts.set(entry.mood, count + 1);
      });

      const totalMoods = moodsData.length;
      const stats: MoodStats[] = [];
      moodCounts.forEach((count, mood) => {
        stats.push({
          mood,
          count,
          percentage: Math.round((count / totalMoods) * 100),
        });
      });

      // Trier par ordre de préférence (best_day en premier)
      const moodOrder: MoodType[] = ["best_day", "good", "moody", "bad", "awful"];
      stats.sort((a, b) => moodOrder.indexOf(a.mood) - moodOrder.indexOf(b.mood));
      setMoodStats(stats);

      // Préparer les données pour le graphique quotidien
      const moodStartDate = new Date(monthStart);
      const moodEndDate = isCurrentMonth ? today : new Date(end);
      const dailyMoodData: { date: string; mood: string }[] = [];
      for (let d = new Date(moodStartDate); d <= moodEndDate; d.setDate(d.getDate() + 1)) {
        const dateStr = formatDateLocal(d);
        const day = d.getDate();
        const moodEntry = moodsData.find((m: MoodEntry) => m.date === dateStr);
        const moodType = moodEntry?.mood as MoodType | undefined;
        dailyMoodData.push({
          date: `${day}`,
          mood: moodType ? MOOD_CONFIG[moodType].label : "",
        });
      }
      setMoodDailyData(dailyMoodData);
    }

    setLoading(false);
  }, [supabase, fetchUserSettings, monthOffset, refreshKey]);

  useEffect(() => {
    fetchMonthlyData();
  }, [fetchMonthlyData]);

  if (loading) {
    return (
      <div className="bento-card bg-slate-50 p-8 rounded-3xl border border-slate-200">
        <div className="flex items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-500"></div>
          <span className="text-slate-600">Chargement des statistiques...</span>
        </div>
      </div>
    );
  }

  if (monthlyData.length === 0) {
    return (
      <div className="bento-card bg-slate-50 p-8 rounded-3xl border border-slate-200 text-center">
        <Calendar className="mx-auto text-slate-400 mb-4" size={48} />
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Pas encore de données mensuelles</h2>
        <p className="text-slate-500">Commence à enregistrer tes pas pour voir les statistiques ici.</p>
      </div>
    );
  }

  // Données pour le graphique journalier du mois sélectionné
  const currentMonthData = monthlyData[0]?.dailyData || [];
  const selectedMonth = monthlyData[0]?.month || "";
  const isCurrentMonth = monthOffset === 0;

  // Couleurs pour le graphique en camembert des humeurs
  const MOOD_COLORS: Record<MoodType, string> = {
    best_day: "#10b981", // emerald
    good: "#3b82f6", // blue
    moody: "#64748b", // slate
    bad: "#f59e0b", // amber
    awful: "#ef4444", // red
  };

  const pieData = moodStats.map((stat) => ({
    name: MOOD_CONFIG[stat.mood].label,
    value: stat.count,
    color: MOOD_COLORS[stat.mood],
  }));

  return (
    <div className="space-y-6 mt-8">
      {/* Titre */}
      <div className="flex items-center gap-2">
        <TrendingUp className="text-slate-600" size={20} />
        <h2 className="text-lg sm:text-xl font-bold text-slate-800">Statistiques mensuelles</h2>
      </div>

      {/* Navigation entre les mois */}
      <div className="flex items-center justify-between gap-2">
        {/* Mois précédent */}
        <button
          onClick={() => setMonthOffset((prev) => prev + 1)}
          className="flex items-center justify-center gap-1.5 px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer"
          title="Mois précédent"
        >
          <ChevronLeft size={16} />
          <span className="font-medium text-xs sm:text-sm hidden sm:inline">Mois précédent</span>
        </button>

        {/* Mois affiché */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-center">
          <div className="flex items-center justify-center gap-2 text-slate-500 text-xs sm:text-sm">
            <Calendar size={16} />
            <span className="capitalize">
              {selectedMonth}
              {isCurrentMonth && <span className="text-slate-400"> (en cours)</span>}
            </span>
          </div>
        </div>

        {/* Mois suivant */}
        <button
          onClick={() => setMonthOffset((prev) => Math.max(0, prev - 1))}
          disabled={isCurrentMonth}
          className={`flex items-center justify-center gap-1.5 px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200 transition-all ${
            isCurrentMonth
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 cursor-pointer"
          }`}
          title="Mois suivant"
        >
          <span className="font-medium text-xs sm:text-sm hidden sm:inline">Mois suivant</span>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Statistiques du mois sélectionné */}
      {monthlyData[0] && (
        <div className="bento-card bg-blue-50 p-4 sm:p-6 rounded-3xl border border-blue-200">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-blue-600 w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            <h3 className="text-base sm:text-lg font-semibold text-slate-800 capitalize">
              {monthlyData[0].month}
              {isCurrentMonth && <span className="text-xs sm:text-sm font-normal text-slate-500 ml-1 sm:ml-2">(en cours)</span>}
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
            <div className="bg-white/60 rounded-xl p-2 sm:p-4">
              <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600 text-[10px] sm:text-xs mb-1">
                <Footprints size={12} className="sm:w-3.5 sm:h-3.5" />
                <span>Total</span>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-slate-800">{monthlyData[0].total.toLocaleString("fr-FR")}</p>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-1">pas ce mois</p>
            </div>

            <div className="bg-white/60 rounded-xl p-2 sm:p-4">
              <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600 text-[10px] sm:text-xs mb-1">
                <TrendingUp size={12} className="sm:w-3.5 sm:h-3.5" />
                <span>Moyenne</span>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-slate-800">{monthlyData[0].average.toLocaleString("fr-FR")}</p>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-1">pas/jour</p>
            </div>

            <div className="bg-white/60 rounded-xl p-2 sm:p-4">
              <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600 text-[10px] sm:text-xs mb-1">
                <Target size={12} className="sm:w-3.5 sm:h-3.5" />
                <span>Jours</span>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-slate-800">{monthlyData[0].daysWithData}</p>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-1">avec données</p>
            </div>
          </div>

          {/* Graphique journalier du mois actuel */}
          {currentMonthData.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Évolution quotidienne</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={currentMonthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number | undefined) => [`${(value || 0).toLocaleString("fr-FR")} pas`, "Pas"]}
                  />
                  <Line type="monotone" dataKey="steps" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Statistiques des habitudes */}
      {habitStats.length > 0 && (
        <div className="bento-card bg-emerald-50 p-6 rounded-3xl border border-emerald-200">
          <div className="flex items-center gap-2 mb-4">
            <ListChecks className="text-emerald-600" size={18} />
            <h3 className="text-lg font-semibold text-slate-800">Habitudes</h3>
          </div>

          <div className="space-y-3 mb-6">
            {habitStats.map((stat) => (
              <div key={stat.habit.id} className="bg-white/60 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <HabitIcon name={stat.habit.emoji} size={18} className="text-emerald-600" />
                    </div>
                    <span className="font-medium text-slate-800">{stat.habit.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-slate-800">{stat.completionRate}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <CheckCircle size={12} />
                  <span>
                    {stat.completions} jour{stat.completions > 1 ? "s" : ""} sur {stat.totalDays}
                  </span>
                </div>
                <div className="mt-2 h-2 bg-emerald-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-emerald-400 to-teal-500 transition-all duration-500"
                    style={{ width: `${stat.completionRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistiques de l'humeur */}
      {moodStats.length > 0 && (
        <div className="bento-card bg-violet-50 p-6 rounded-3xl border border-violet-200">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-violet-600" size={18} />
            <h3 className="text-lg font-semibold text-slate-800">Humeur</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Graphique en camembert */}
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Répartition</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number | undefined) => [`${value} jour${(value || 0) > 1 ? "s" : ""}`, "Humeur"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Liste des humeurs */}
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Détails</h4>
              <div className="space-y-2">
                {moodStats.map((stat) => (
                  <div key={stat.mood} className="flex items-center justify-between bg-white/60 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{MOOD_CONFIG[stat.mood].emoji}</span>
                      <span className="text-sm font-medium text-slate-700">{MOOD_CONFIG[stat.mood].label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-800">{stat.count}</span>
                      <span className="text-xs text-slate-400 ml-1">({stat.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Graphique quotidien de l'humeur */}
          {moodDailyData.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Évolution quotidienne</h4>
              <div className="flex flex-wrap gap-1">
                {moodDailyData.map((item, idx) => {
                  const moodStat = moodStats.find((s) => MOOD_CONFIG[s.mood].label === item.mood);
                  const bgColor = moodStat ? MOOD_CONFIG[moodStat.mood].bgColor : "bg-slate-100";
                  const emoji = moodStat ? MOOD_CONFIG[moodStat.mood].emoji : "—";
                  return (
                    <div
                      key={idx}
                      className={`${bgColor} rounded-lg p-2 min-w-[32px] text-center text-xs flex flex-col items-center justify-center`}
                      title={item.mood || "Non renseigné"}
                    >
                      <span className="text-sm">{emoji}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">{item.date}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
