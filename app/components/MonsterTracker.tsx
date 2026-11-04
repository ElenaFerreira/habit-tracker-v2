"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToday, formatDateLocal } from "@/lib/hooks/useToday";
import { CupSoda, Pause, Check, Loader2 } from "lucide-react";

const HISTORY_DAYS = 120; // Fenêtre chargée pour calculer les périodes
const STRIP_DAYS = 14; // Jours affichés dans la frise
const MAX_PERIODS = 5; // Périodes affichées dans la liste

interface Period {
  drank: boolean;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  length: number;
  truncated: boolean; // Commence au bord de la fenêtre chargée : peut être plus longue
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return formatDateLocal(d);
}

function formatShort(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatRange(p: Period): string {
  return p.start === p.end ? formatShort(p.start) : `${formatShort(p.start)} → ${formatShort(p.end)}`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n > 1 ? "s" : ""}`;
}

/**
 * Découpe les jours en périodes alternées « bu » / « pause », de la première
 * Monster de la fenêtre jusqu'à aujourd'hui.
 * Aujourd'hui ne compte que s'il est coché : tant que la journée n'est pas
 * finie, ne pas avoir coché ne veut pas dire « pause ».
 */
function computePeriods(drankDays: Set<string>, today: string, windowStart: string): Period[] {
  const sorted = [...drankDays].filter((d) => d >= windowStart && d <= today).sort();
  if (sorted.length === 0) return [];

  const lastDay = drankDays.has(today) ? today : addDays(today, -1);
  const periods: Period[] = [];

  for (let d = sorted[0]; d <= lastDay; d = addDays(d, 1)) {
    const drank = drankDays.has(d);
    const current = periods[periods.length - 1];
    if (current && current.drank === drank) {
      current.end = d;
      current.length++;
    } else {
      periods.push({ drank, start: d, end: d, length: 1, truncated: d === windowStart });
    }
  }

  return periods;
}

export default function MonsterTracker() {
  const [drankDays, setDrankDays] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const today = useToday();
  const supabase = createClient();
  const windowStart = addDays(today, -HISTORY_DAYS);

  const fetchEntries = useCallback(async () => {
    const { data } = await supabase.from("monster_entries").select("date").gte("date", windowStart).lte("date", today);
    setDrankDays(new Set(data?.map((e) => e.date) || []));
    setLoading(false);
  }, [supabase, today, windowStart]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  async function toggleDay(date: string) {
    if (saving.has(date)) return;
    const drank = drankDays.has(date);

    setSaving((prev) => new Set(prev).add(date));
    setDrankDays((prev) => {
      const next = new Set(prev);
      if (drank) next.delete(date);
      else next.add(date);
      return next;
    });

    const { error } = drank
      ? await supabase.from("monster_entries").delete().eq("date", date)
      : await supabase.from("monster_entries").upsert({ date }, { onConflict: "user_id,date", ignoreDuplicates: true });

    if (error) await fetchEntries();

    setSaving((prev) => {
      const next = new Set(prev);
      next.delete(date);
      return next;
    });
  }

  if (loading) {
    return <div className="bento-card bg-lime-50 dark:bg-lime-950/20 rounded-3xl animate-pulse min-h-[160px] border border-lime-300 dark:border-lime-900/50" />;
  }

  const periods = computePeriods(drankDays, today, windowStart);
  const current = periods[periods.length - 1];
  const previous = periods[periods.length - 2];
  const recentPeriods = periods.slice(-MAX_PERIODS).reverse();
  const drankToday = drankDays.has(today);
  const stripDays = Array.from({ length: STRIP_DAYS }, (_, i) => addDays(today, i - STRIP_DAYS + 1));

  let headline: string;
  let subline: string;
  if (!current) {
    headline = "Aucune Monster";
    subline = "Coche les jours où tu en bois pour suivre tes séries.";
  } else if (current.drank) {
    headline = `${plural(current.length, "jour")} d'affilée`;
    subline = drankToday ? "Série en cours, aujourd'hui compris" : "Série en cours jusqu'à hier";
    if (previous) subline += ` · après ${plural(previous.length, "jour")} de pause`;
  } else {
    headline = `Pause : ${plural(current.length, "jour")}`;
    subline = "Sans compter aujourd'hui";
    if (previous) subline += ` · après ${plural(previous.length, "jour")} de Monster`;
  }

  return (
    <div className="bento-card bg-lime-50 dark:bg-lime-950/20 p-6 rounded-3xl border border-lime-300 dark:border-lime-900/50">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 bg-lime-100 dark:bg-lime-900/50 rounded-xl flex items-center justify-center">
            <CupSoda size={20} className="text-lime-700 dark:text-lime-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Monster</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Bu aujourd&apos;hui ?</p>
          </div>
        </div>

        <button
          onClick={() => toggleDay(today)}
          disabled={saving.has(today)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer disabled:cursor-wait ${
            drankToday
              ? "bg-lime-500 text-white shadow-md shadow-lime-500/30 hover:bg-lime-600"
              : "bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border-2 border-dashed border-lime-300 dark:border-lime-800 hover:border-lime-400"
          }`}
        >
          {saving.has(today) ? <Loader2 size={16} className="animate-spin" /> : drankToday ? <Check size={16} strokeWidth={3} /> : <CupSoda size={16} />}
          {drankToday ? "Oui" : "Non"}
        </button>
      </div>

      <div className="mb-5">
        <p className={`text-3xl font-black leading-tight ${current?.drank ? "text-lime-700 dark:text-lime-400" : "text-slate-800 dark:text-slate-100"}`}>
          {headline}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subline}</p>
      </div>

      {/* Frise des derniers jours, cliquable pour rattraper un oubli */}
      <div className="mb-5">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">{STRIP_DAYS} derniers jours</p>
        <div className="grid grid-cols-14 gap-1">
          {stripDays.map((date) => {
            const drank = drankDays.has(date);
            const isToday = date === today;
            return (
              <button
                key={date}
                onClick={() => toggleDay(date)}
                disabled={saving.has(date)}
                title={`${new Date(date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} : ${drank ? "Monster" : "pas de Monster"}`}
                className={`aspect-square rounded-md transition-colors cursor-pointer ${
                  drank ? "bg-lime-500 hover:bg-lime-600" : "bg-slate-200/70 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700"
                } ${isToday ? "ring-2 ring-offset-1 ring-lime-400 ring-offset-lime-50 dark:ring-offset-zinc-950" : ""}`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1">
          <span>{formatShort(stripDays[0])}</span>
          <span>aujourd&apos;hui</span>
        </div>
      </div>

      {recentPeriods.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Dernières périodes</p>
          <div className="space-y-1.5">
            {recentPeriods.map((p, i) => (
              <div
                key={p.start}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${
                  p.drank ? "bg-lime-100/70 dark:bg-lime-900/30" : "bg-white/60 dark:bg-zinc-800/60"
                }`}
              >
                {p.drank ? (
                  <CupSoda size={14} className="shrink-0 text-lime-700 dark:text-lime-400" />
                ) : (
                  <Pause size={14} className="shrink-0 text-slate-400" />
                )}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {p.truncated ? "+ de " : ""}
                  {plural(p.length, "jour")} {p.drank ? "de Monster" : "de pause"}
                </span>
                <span className="ml-auto text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {i === 0 ? `depuis le ${formatShort(p.start)}` : formatRange(p)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
