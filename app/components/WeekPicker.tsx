"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface WeekPickerProps {
  currentWeekStart: Date;
  onWeekSelect: (weekStart: Date) => void;
}

const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const SHORT_MONTH_NAMES = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "août", "sep", "oct", "nov", "déc"];
const DAY_NAMES = ["L", "M", "M", "J", "V", "S", "D"];

function getMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function isSameWeek(d1: Date, d2: Date): boolean {
  const m1 = getMonday(d1);
  const m2 = getMonday(d2);
  return isSameDay(m1, m2);
}

function isFutureWeek(weekStart: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentWeekStart = getMonday(today);
  return weekStart > currentWeekStart;
}

function getCalendarWeeks(year: number, month: number): Date[][] {
  const weeks: Date[][] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Trouver le lundi de la première semaine qui contient des jours du mois
  const firstMonday = getMonday(firstDay);

  let current = new Date(firstMonday);

  while (current <= lastDay || current.getMonth() === month || weeks.length < 6) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);

    // Arrêter si on a dépassé le mois et qu'on a au moins 4 semaines
    if (current.getMonth() > month && weeks.length >= 4) {
      // Vérifier si la dernière semaine ajoutée a des jours du mois courant
      const lastWeek = weeks[weeks.length - 1];
      const hasCurrentMonthDays = lastWeek.some((d) => d.getMonth() === month);
      if (!hasCurrentMonthDays && current.getMonth() !== month) {
        break;
      }
    }

    if (weeks.length >= 6) break;
  }

  return weeks;
}

export default function WeekPicker({ currentWeekStart, onWeekSelect }: WeekPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(currentWeekStart.getFullYear());
  const [viewMonth, setViewMonth] = useState(currentWeekStart.getMonth());
  const containerRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Mettre à jour la vue quand la semaine courante change
  useEffect(() => {
    setViewYear(currentWeekStart.getFullYear());
    setViewMonth(currentWeekStart.getMonth());
  }, [currentWeekStart]);

  // Fermer le picker quand on clique en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const weeks = getCalendarWeeks(viewYear, viewMonth);

  function goToPrevMonth() {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function goToNextMonth() {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  function handleWeekClick(weekStart: Date) {
    if (!isFutureWeek(weekStart)) {
      onWeekSelect(weekStart);
      setIsOpen(false);
    }
  }

  // Formater l'affichage de la plage de dates
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const startDay = currentWeekStart.getDate();
  const endDay = weekEnd.getDate();
  const startMonth = SHORT_MONTH_NAMES[currentWeekStart.getMonth()];
  const endMonth = SHORT_MONTH_NAMES[weekEnd.getMonth()];

  const dateLabel =
    currentWeekStart.getMonth() === weekEnd.getMonth() ? `${startDay} - ${endDay} ${endMonth}` : `${startDay} ${startMonth} - ${endDay} ${endMonth}`;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 text-xs sm:text-sm hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
      >
        <Calendar size={16} />
        <span className="font-medium">{dateLabel}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-zinc-950/50 p-3 animate-scale-in min-w-[280px]">
          {/* Header avec navigation */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={goToPrevMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer">
              <ChevronLeft size={18} className="text-slate-500 dark:text-slate-400" />
            </button>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button onClick={goToNextMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer">
              <ChevronRight size={18} className="text-slate-500 dark:text-slate-400" />
            </button>
          </div>

          {/* Jours de la semaine */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_NAMES.map((day, i) => (
              <div key={i} className="text-center text-[10px] font-medium text-slate-400 dark:text-slate-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Grille des semaines */}
          <div className="space-y-1">
            {weeks.map((week, weekIdx) => {
              const weekStart = getMonday(week[0]);
              const isCurrentWeek = isSameWeek(weekStart, currentWeekStart);
              const isFuture = isFutureWeek(weekStart);
              const isThisWeek = isSameWeek(weekStart, today);

              return (
                <button
                  key={weekIdx}
                  onClick={() => handleWeekClick(weekStart)}
                  disabled={isFuture}
                  className={`w-full grid grid-cols-7 gap-1 py-1 px-0.5 rounded-lg transition-all ${
                    isFuture
                      ? "opacity-40 cursor-not-allowed"
                      : isCurrentWeek
                      ? "bg-emerald-100 dark:bg-emerald-900/40"
                      : "hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                  }`}
                >
                  {week.map((day, dayIdx) => {
                    const isCurrentMonth = day.getMonth() === viewMonth;
                    const isToday = isSameDay(day, today);

                    return (
                      <div
                        key={dayIdx}
                        className={`text-center text-xs py-1 rounded-md ${
                          isToday
                            ? "bg-violet-500 text-white font-bold"
                            : isCurrentMonth
                            ? isCurrentWeek
                              ? "text-emerald-700 dark:text-emerald-300 font-medium"
                              : "text-slate-700 dark:text-slate-300"
                            : "text-slate-300 dark:text-slate-600"
                        }`}
                      >
                        {day.getDate()}
                      </div>
                    );
                  })}
                </button>
              );
            })}
          </div>

          {/* Bouton pour aller à cette semaine */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <button
              onClick={() => {
                const todayMonday = getMonday(new Date());
                onWeekSelect(todayMonday);
                setIsOpen(false);
              }}
              className="w-full text-xs text-center py-2 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 rounded-lg font-medium transition-colors cursor-pointer"
            >
              Aller à cette semaine
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
