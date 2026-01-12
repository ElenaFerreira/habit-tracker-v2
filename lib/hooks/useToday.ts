"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Formate une date en chaîne YYYY-MM-DD en utilisant l'heure LOCALE (pas UTC)
 */
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayDate(): string {
  return formatDateLocal(new Date());
}

/**
 * Hook pour avoir toujours la date du jour à jour.
 * Se met à jour automatiquement:
 * - Au montage du composant
 * - Toutes les 10 secondes
 * - Quand l'onglet reprend le focus
 * - Quand la fenêtre reprend le focus
 */
export function useToday() {
  const [today, setToday] = useState(getTodayDate);
  const lastChecked = useRef(today);

  useEffect(() => {
    const currentDate = getTodayDate();
    if (currentDate !== lastChecked.current) {
      lastChecked.current = currentDate;
      setToday(currentDate);
    }

    const interval = setInterval(() => {
      const newDate = getTodayDate();
      if (newDate !== lastChecked.current) {
        lastChecked.current = newDate;
        setToday(newDate);
      }
    }, 10000);

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        const newDate = getTodayDate();
        if (newDate !== lastChecked.current) {
          lastChecked.current = newDate;
          setToday(newDate);
        }
      }
    }

    function handleFocus() {
      const newDate = getTodayDate();
      if (newDate !== lastChecked.current) {
        lastChecked.current = newDate;
        setToday(newDate);
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return today;
}
