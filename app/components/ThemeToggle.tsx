"use client";

import { useTheme } from "@/lib/hooks/useTheme";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  variant?: "icon" | "full";
  className?: string;
}

export default function ThemeToggle({ variant = "icon", className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === "dark";

  if (variant === "full") {
    return (
      <button
        onClick={toggleTheme}
        className={`flex items-center gap-3 p-3 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer ${className}`}
      >
        {isDark ? <Moon size={20} className="text-indigo-400" /> : <Sun size={20} className="text-amber-500" />}
        <span className="text-slate-700 dark:text-slate-300 font-medium">{isDark ? "Mode sombre" : "Mode clair"}</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`p-2.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer ${className}`}
      title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
    >
      {isDark ? <Moon size={18} className="text-indigo-400" /> : <Sun size={18} className="text-amber-500" />}
    </button>
  );
}
