"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface MonthPickerProps {
  currentMonth: Date;
  onMonthSelect: (month: Date) => void;
}

const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const SHORT_MONTH_NAMES = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

function isSameMonth(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
}

function isFutureMonth(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const targetMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  return targetMonth > startOfCurrentMonth;
}

export default function MonthPicker({ currentMonth, onMonthSelect }: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(currentMonth.getFullYear());
  const containerRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Mettre à jour la vue quand le mois courant change
  useEffect(() => {
    setViewYear(currentMonth.getFullYear());
  }, [currentMonth]);

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

  function handleMonthClick(monthIndex: number) {
    const selectedDate = new Date(viewYear, monthIndex, 1);
    if (!isFutureMonth(selectedDate)) {
      onMonthSelect(selectedDate);
      setIsOpen(false);
    }
  }

  // Formater l'affichage du mois
  const monthLabel = `${MONTH_NAMES[currentMonth.getMonth()].toLowerCase()}`;
  const isCurrentMonth = isSameMonth(currentMonth, today);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 text-xs sm:text-sm hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
      >
        <Calendar size={16} />
        <span className="font-medium capitalize">
          {monthLabel}
          {isCurrentMonth && <span className="text-slate-400 dark:text-slate-500 ml-1">(en cours)</span>}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-zinc-950/50 p-4 animate-scale-in min-w-[280px]">
          {/* Header avec navigation d'année */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setViewYear(viewYear - 1)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronLeft size={18} className="text-slate-500 dark:text-slate-400" />
            </button>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{viewYear}</span>
            <button
              onClick={() => setViewYear(viewYear + 1)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronRight size={18} className="text-slate-500 dark:text-slate-400" />
            </button>
          </div>

          {/* Grille des mois */}
          <div className="grid grid-cols-3 gap-2">
            {SHORT_MONTH_NAMES.map((monthName, idx) => {
              const monthDate = new Date(viewYear, idx, 1);
              const isSelected = isSameMonth(monthDate, currentMonth);
              const isFuture = isFutureMonth(monthDate);
              const isThisMonth = isSameMonth(monthDate, today);

              return (
                <button
                  key={idx}
                  onClick={() => handleMonthClick(idx)}
                  disabled={isFuture}
                  className={`py-2.5 px-2 rounded-xl text-sm font-medium transition-all ${
                    isFuture
                      ? "text-slate-300 dark:text-slate-600 cursor-not-allowed"
                      : isSelected
                      ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                      : isThisMonth
                      ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/50 cursor-pointer"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                  }`}
                >
                  {monthName}
                </button>
              );
            })}
          </div>

          {/* Bouton pour aller au mois en cours */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <button
              onClick={() => {
                const now = new Date();
                onMonthSelect(new Date(now.getFullYear(), now.getMonth(), 1));
                setIsOpen(false);
              }}
              className="w-full text-xs text-center py-2 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 rounded-lg font-medium transition-colors cursor-pointer"
            >
              Aller au mois en cours
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
