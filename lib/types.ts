// Types pour le Habit Tracker

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  created_at: string;
  order_index: number;
}

export interface HabitCompletion {
  id: string;
  habit_id: string;
  date: string; // format YYYY-MM-DD
  completed: boolean;
  created_at: string;
}

// Type pour l'affichage d'une habitude avec son état du jour
export interface HabitWithStatus extends Habit {
  completed_today: boolean;
}
