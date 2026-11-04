import { Habit } from "./types";

/** Select Supabase qui ramène les habitudes avec leurs périodes d'archive */
export const HABITS_WITH_ARCHIVES = "*, habit_archives(id, archived_on, restored_on)";

/** L'habitude est-elle archivée en ce moment ? */
export function isArchived(habit: Habit): boolean {
  return (habit.habit_archives ?? []).some((p) => p.restored_on === null);
}

/**
 * L'habitude compte-t-elle ce jour-là ?
 * Elle est inactive sur chaque période [archived_on, restored_on[.
 * Dates au format YYYY-MM-DD (comparables en tant que chaînes).
 */
export function isActiveOn(habit: Habit, date: string): boolean {
  return !(habit.habit_archives ?? []).some((p) => date >= p.archived_on && (p.restored_on === null || date < p.restored_on));
}
