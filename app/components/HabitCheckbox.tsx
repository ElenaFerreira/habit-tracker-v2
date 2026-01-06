"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { HabitWithStatus } from "@/lib/types";
import { Check } from "lucide-react";
import { HabitIcon } from "@/lib/icons";

interface HabitCheckboxProps {
  habit: HabitWithStatus;
  date: string; // format YYYY-MM-DD
  onToggle: (newCompleted: boolean) => void;
}

export default function HabitCheckbox({ habit, date, onToggle }: HabitCheckboxProps) {
  const [isCompleted, setIsCompleted] = useState(habit.completed_today);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  async function toggleCompletion() {
    setIsLoading(true);
    const newState = !isCompleted;
    setIsCompleted(newState); // Optimistic update

    if (newState) {
      // Ajouter la complétion
      const { error } = await supabase.from("habit_completions").upsert(
        {
          habit_id: habit.id,
          date: date,
          completed: true,
        },
        {
          onConflict: "habit_id,date",
        }
      );

      if (error) {
        setIsCompleted(!newState); // Rollback
      }
    } else {
      // Supprimer la complétion
      const { error } = await supabase.from("habit_completions").delete().eq("habit_id", habit.id).eq("date", date);

      if (error) {
        setIsCompleted(!newState); // Rollback
      }
    }

    setIsLoading(false);
    onToggle(newState);
  }

  return (
    <button
      onClick={toggleCompletion}
      disabled={isLoading}
      className={`
        group flex items-center gap-3 w-full p-4 rounded-2xl transition-all duration-200
        ${
          isCompleted
            ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25"
            : "bg-white border-2 border-slate-200 hover:border-amber-300 hover:shadow-md"
        }
        ${isLoading ? "opacity-70 cursor-wait" : "cursor-pointer"}
      `}
    >
      {/* Checkbox visuel */}
      <div
        className={`
        w-7 h-7 rounded-lg flex items-center justify-center transition-all
        ${isCompleted ? "bg-white/20" : "border-2 border-slate-300 group-hover:border-amber-400"}
      `}
      >
        {isCompleted && <Check size={18} className="text-white" strokeWidth={3} />}
      </div>

      {/* Icône */}
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isCompleted ? "bg-white/20" : "bg-amber-100"} ${
          isCompleted ? "scale-110" : ""
        }`}
      >
        <HabitIcon name={habit.emoji} size={20} className={isCompleted ? "text-white" : "text-amber-600"} />
      </div>

      {/* Nom */}
      <span
        className={`
        flex-1 text-left font-medium transition-colors
        ${isCompleted ? "text-white" : "text-slate-700"}
      `}
      >
        {habit.name}
      </span>

      {/* Badge completed */}
      {isCompleted && <span className="text-xs font-semibold text-white/80 bg-white/20 px-2 py-1 rounded-full">Fait !</span>}
    </button>
  );
}
