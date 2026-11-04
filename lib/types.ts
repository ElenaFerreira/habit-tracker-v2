export interface Habit {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  created_at: string;
  order_index: number;
  habit_archives?: HabitArchive[]; // Périodes d'archive (présentes si chargées avec HABITS_WITH_ARCHIVES)
}

export interface HabitArchive {
  id: string;
  archived_on: string; // format YYYY-MM-DD, premier jour où l'habitude ne compte plus
  restored_on: string | null; // format YYYY-MM-DD, premier jour où elle compte de nouveau (null = toujours archivée)
}

export interface HabitCompletion {
  id: string;
  habit_id: string;
  date: string; // format YYYY-MM-DD
  completed: boolean;
  created_at: string;
}

export interface HabitWithStatus extends Habit {
  completed_today: boolean;
}

export interface StepEntry {
  id: string;
  user_id: string;
  date: string; // format YYYY-MM-DD
  steps: number;
  created_at: string;
}

export type GoalType = "quantitative" | "streak" | "one_time";
export type GoalPeriod = "week" | "month" | "year" | "custom";

export interface Goal {
  id: string;
  user_id: string;
  habit_id: string | null; // Optionnel - null pour les goals indépendants
  name: string;
  type: GoalType;
  target_value: number; // Ex: 20 séances, 14 jours de streak, 1 pour one_time
  period: GoalPeriod | null; // Pour quantitatif: période de référence
  start_date: string | null; // Date de début (pour custom ou streak)
  end_date: string | null; // Optionnel - date de fin
  completed_at: string | null; // Date où l'objectif a été accompli (pour one_time)
  icon: string | null; // Icône personnalisée pour les goals sans habitude
  reward: string | null; // Récompense optionnelle
  order_index: number; // Ordre d'affichage pour le drag and drop
  created_at: string;
}

export interface GoalWithProgress extends Goal {
  current_value: number;
  progress_percent: number;
  is_completed: boolean;
  habit_name: string | null; // null si pas d'habitude associée
  habit_emoji: string | null;
}

export type MoodType = "best_day" | "good" | "moody" | "bad" | "awful";

export interface MoodEntry {
  id: string;
  user_id: string;
  date: string; // format YYYY-MM-DD
  mood: MoodType;
  created_at: string;
}

export const MOOD_CONFIG: Record<MoodType, { label: string; emoji: string; color: string; bgColor: string }> = {
  best_day: { label: "Best day", emoji: "🤩", color: "text-green-600", bgColor: "bg-green-100" },
  good: { label: "Good", emoji: "😊", color: "text-blue-600", bgColor: "bg-blue-100" },
  moody: { label: "Moody", emoji: "😐", color: "text-slate-600", bgColor: "bg-slate-100" },
  bad: { label: "Bad", emoji: "😔", color: "text-yellow-600", bgColor: "bg-yellow-100" },
  awful: { label: "Awful", emoji: "😢", color: "text-red-600", bgColor: "bg-red-100" },
};

export type BudgetKind = "expense" | "income";

export interface BudgetItem {
  id: string;
  user_id: string;
  name: string;
  kind: BudgetKind;
  amount: number; // Montant prévu
  is_variable: boolean; // Montant réel saisi au moment de cocher
  day_of_month: number | null; // Jour du mois (facultatif)
  order_index: number;
  created_at: string;
}

export interface BudgetPayment {
  id: string;
  item_id: string;
  month: string; // format YYYY-MM-01
  amount: number; // Montant réel
  paid_on: string; // format YYYY-MM-DD
}

export interface UserSettings {
  id: string;
  user_id: string;
  daily_step_goal: number;
  step_sync_token: string | null; // Jeton du Raccourci iOS pour la synchro Apple Santé
  created_at: string;
  updated_at: string;
}
