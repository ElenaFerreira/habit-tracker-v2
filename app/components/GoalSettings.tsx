"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Goal, GoalType, GoalPeriod, Habit } from "@/lib/types";
import { formatDateLocal } from "@/lib/hooks/useToday";
import { X, Plus, Trash2, Target, Flame, Calendar, Star, Gift, Pencil, Save } from "lucide-react";
import { HabitIcon, ICON_CATEGORIES } from "./HabitSettings";

interface GoalSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onGoalsChange: () => void;
}

export default function GoalSettings({ isOpen, onClose, onGoalsChange }: GoalSettingsProps) {
  const [goals, setGoals] = useState<(Goal & { habit?: Habit })[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // Form state
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null); // null = création, sinon édition
  const [selectedHabit, setSelectedHabit] = useState<string>(""); // "" = pas d'habitude (goal indépendant)
  const [goalName, setGoalName] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("one_time");
  const [targetValue, setTargetValue] = useState<number>(10);
  const [period, setPeriod] = useState<GoalPeriod>("month");
  const [endDate, setEndDate] = useState<string>("");
  const [reward, setReward] = useState<string>("");
  const [selectedIcon, setSelectedIcon] = useState<string>("Star");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchGoals();
      fetchHabits();
    }
  }, [isOpen]);

  async function fetchHabits() {
    const { data } = await supabase.from("habits").select("*").order("order_index", { ascending: true });
    if (data) setHabits(data);
  }

  async function fetchGoals() {
    const { data: goalsData } = await supabase.from("goals").select("*").order("created_at", { ascending: false });

    if (goalsData) {
      // Récupérer les infos des habitudes associées (seulement celles qui ont un habit_id)
      const habitIds = goalsData.filter((g) => g.habit_id).map((g) => g.habit_id);
      let habitsMap = new Map<string, Habit>();

      if (habitIds.length > 0) {
        const { data: habitsData } = await supabase.from("habits").select("*").in("id", habitIds);
        habitsMap = new Map(habitsData?.map((h) => [h.id, h]) || []);
      }

      const goalsWithHabits = goalsData.map((goal) => ({
        ...goal,
        habit: goal.habit_id ? habitsMap.get(goal.habit_id) : undefined,
      }));

      setGoals(goalsWithHabits);
    }
  }

  async function addGoal() {
    if (!goalName.trim()) return;
    // Pour les goals liés à une habitude (quantitative/streak), on a besoin d'une habitude
    if ((goalType === "quantitative" || goalType === "streak") && !selectedHabit) return;
    if (goalType !== "one_time" && targetValue < 1) return;

    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setLoading(false);
      return;
    }

    const newGoal = {
      user_id: userData.user.id,
      habit_id: selectedHabit || null,
      name: goalName.trim(),
      type: goalType,
      target_value: goalType === "one_time" ? 1 : targetValue,
      period: goalType === "quantitative" ? period : null,
      start_date: formatDateLocal(new Date()),
      end_date: endDate || null,
      icon: !selectedHabit ? selectedIcon : null,
      reward: reward.trim() || null,
      completed_at: null,
    };

    const { error } = await supabase.from("goals").insert(newGoal);

    if (!error) {
      // Reset form
      setGoalName("");
      setSelectedHabit("");
      setTargetValue(10);
      setGoalType("one_time");
      setPeriod("month");
      setEndDate("");
      setReward("");
      setSelectedIcon("Star");
      await fetchGoals();
      onGoalsChange();
    }

    setLoading(false);
  }

  async function deleteGoal(goalId: string) {
    const { error } = await supabase.from("goals").delete().eq("id", goalId);
    if (!error) {
      await fetchGoals();
      onGoalsChange();
    }
  }

  // Pré-remplir le formulaire pour éditer un goal
  function startEdit(goal: Goal & { habit?: Habit }) {
    setEditingGoalId(goal.id);
    setGoalName(goal.name);
    setGoalType(goal.type);
    setSelectedHabit(goal.habit_id || "");
    setTargetValue(goal.target_value);
    setPeriod((goal.period as GoalPeriod) || "month");
    setEndDate(goal.end_date || "");
    setReward(goal.reward || "");
    setSelectedIcon(goal.icon || "Star");
  }

  // Annuler l'édition et reset le formulaire
  function cancelEdit() {
    setEditingGoalId(null);
    setGoalName("");
    setSelectedHabit("");
    setTargetValue(10);
    setGoalType("one_time");
    setPeriod("month");
    setEndDate("");
    setReward("");
    setSelectedIcon("Star");
  }

  // Mettre à jour un goal existant
  async function updateGoal() {
    if (!editingGoalId || !goalName.trim()) return;
    if ((goalType === "quantitative" || goalType === "streak") && !selectedHabit) return;

    setLoading(true);

    const updates = {
      name: goalName.trim(),
      type: goalType,
      habit_id: selectedHabit || null,
      target_value: goalType === "one_time" ? 1 : targetValue,
      period: goalType === "quantitative" ? period : null,
      end_date: endDate || null,
      icon: !selectedHabit ? selectedIcon : null,
      reward: reward.trim() || null,
    };

    const { error } = await supabase.from("goals").update(updates).eq("id", editingGoalId);

    if (!error) {
      cancelEdit();
      await fetchGoals();
      onGoalsChange();
    }

    setLoading(false);
  }

  // Détermine si on a besoin d'une habitude selon le type
  const needsHabit = goalType === "quantitative" || goalType === "streak";
  const isEditing = editingGoalId !== null;

  // Validation du formulaire
  const isFormValid = goalName.trim() && (!needsHabit || selectedHabit);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
              <Target size={20} className="text-rose-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Mes objectifs</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Liste des goals existants */}
          {goals.length > 0 ? (
            <div className="space-y-3 mb-8">
              {goals.map((goal) => (
                <div key={goal.id} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl group">
                  {/* Icône type */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      goal.type === "streak" ? "bg-violet-100" : goal.type === "one_time" ? "bg-amber-100" : "bg-emerald-100"
                    }`}
                  >
                    {goal.type === "streak" ? (
                      <Flame size={20} className="text-violet-600" />
                    ) : goal.type === "one_time" ? (
                      goal.icon ? (
                        <HabitIcon name={goal.icon} size={20} className="text-amber-600" />
                      ) : (
                        <Star size={20} className="text-amber-600" />
                      )
                    ) : (
                      <Target size={20} className="text-emerald-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800 truncate">{goal.name}</p>
                      {goal.habit && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 rounded-lg">
                          <HabitIcon name={goal.habit.emoji} size={12} className="text-amber-600" />
                          <span className="text-xs text-amber-700 truncate max-w-[80px]">{goal.habit.name}</span>
                        </div>
                      )}
                      {goal.completed_at && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 rounded-lg">
                          <span className="text-xs text-green-700">✓ Fait</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      {goal.type === "one_time" ? (
                        "Accomplissement unique"
                      ) : goal.type === "streak" ? (
                        <>
                          {goal.target_value} jour{goal.target_value > 1 ? "s" : ""} consécutif{goal.target_value > 1 ? "s" : ""}
                        </>
                      ) : (
                        <>
                          {goal.target_value} fois {goal.period === "week" ? "par semaine" : goal.period === "month" ? "par mois" : "par an"}
                        </>
                      )}
                      {goal.end_date && <span className="text-slate-400"> · jusqu'au {new Date(goal.end_date).toLocaleDateString("fr-FR")}</span>}
                    </p>
                    {goal.reward && (
                      <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                        <Gift size={10} />
                        {goal.reward}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(goal)}
                      className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      title="Modifier"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 mb-8">
              <div className="text-5xl mb-4">🎯</div>
              <p className="text-slate-500 text-base">Aucun objectif pour l'instant</p>
              <p className="text-slate-400 text-sm mt-1">Définis ton premier objectif ci-dessous !</p>
            </div>
          )}

          {/* Formulaire objectif */}
          <div className="border-t border-slate-100 pt-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-slate-700">{isEditing ? "Modifier l'objectif" : "Nouvel objectif"}</p>
              {isEditing && (
                <button onClick={cancelEdit} className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer">
                  Annuler
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* Type d'objectif */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Type d'objectif</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setGoalType("one_time")}
                    className={`flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-xl font-medium transition-all cursor-pointer ${
                      goalType === "one_time" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <Star size={18} />
                    <span className="text-xs">Unique</span>
                  </button>
                  <button
                    onClick={() => setGoalType("quantitative")}
                    className={`flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-xl font-medium transition-all cursor-pointer ${
                      goalType === "quantitative" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <Target size={18} />
                    <span className="text-xs">Quantité</span>
                  </button>
                  <button
                    onClick={() => setGoalType("streak")}
                    className={`flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-xl font-medium transition-all cursor-pointer ${
                      goalType === "streak" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <Flame size={18} />
                    <span className="text-xs">Streak</span>
                  </button>
                </div>
              </div>

              {/* Nom + Icône pour one_time sans habitude */}
              <div className="flex gap-2 items-end">
                {goalType === "one_time" && !selectedHabit && (
                  <div className="relative">
                    <label className="block text-xs font-medium text-slate-600 mb-2">Icône</label>
                    <button
                      onClick={() => setShowIconPicker(!showIconPicker)}
                      className="w-12 h-12 flex items-center justify-center bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors cursor-pointer"
                    >
                      <HabitIcon name={selectedIcon} size={24} className="text-amber-600" />
                    </button>

                    {showIconPicker && (
                      <div className="absolute bottom-14 left-0 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-20 w-72">
                        <div className="flex gap-1 mb-3 overflow-x-auto pb-2 -mx-1 px-1">
                          {ICON_CATEGORIES.map((cat, idx) => (
                            <button
                              key={cat.name}
                              onClick={() => setActiveCategory(idx)}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                                activeCategory === idx ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {cat.name}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {ICON_CATEGORIES[activeCategory].icons.map((item) => {
                            const IconComp = item.icon;
                            return (
                              <button
                                key={item.name}
                                onClick={() => {
                                  setSelectedIcon(item.name);
                                  setShowIconPicker(false);
                                }}
                                className={`w-12 h-12 flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
                                  selectedIcon === item.name
                                    ? "bg-amber-500 text-white"
                                    : "bg-slate-50 text-slate-600 hover:bg-amber-100 hover:text-amber-600"
                                }`}
                              >
                                <IconComp size={22} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-2">Nom de l'objectif</label>
                  <input
                    type="text"
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                    placeholder={
                      goalType === "one_time"
                        ? "Ex: Ma première traction"
                        : goalType === "streak"
                        ? "Ex: 14 jours de méditation"
                        : "Ex: 20 séances ce mois"
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400"
                  />
                </div>
              </div>

              {/* Sélection habitude (optionnel pour one_time, requis pour autres) */}
              {(needsHabit || (goalType === "one_time" && habits.length > 0)) && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    Habitude concernée {goalType === "one_time" && <span className="text-slate-400">(optionnel)</span>}
                  </label>
                  <select
                    value={selectedHabit}
                    onChange={(e) => setSelectedHabit(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 cursor-pointer"
                  >
                    <option value="">{goalType === "one_time" ? "Aucune (objectif personnel)" : "Choisir une habitude..."}</option>
                    {habits.map((habit) => (
                      <option key={habit.id} value={habit.id}>
                        {habit.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Configuration selon le type */}
              {goalType !== "one_time" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-2">
                      {goalType === "streak" ? "Jours consécutifs" : "Nombre de fois"}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={targetValue}
                      onChange={(e) => setTargetValue(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400"
                    />
                  </div>

                  {goalType === "quantitative" && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-2">Période</label>
                      <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value as GoalPeriod)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 cursor-pointer"
                      >
                        <option value="week">Par semaine</option>
                        <option value="month">Par mois</option>
                        <option value="year">Par an</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Date de fin optionnelle */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    Date limite (optionnel)
                  </span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400"
                />
              </div>

              {/* Récompense optionnelle */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  <span className="flex items-center gap-1">
                    <Gift size={12} />
                    Récompense (optionnel)
                  </span>
                </label>
                <input
                  type="text"
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                  placeholder="Ex: M'offrir un resto, Acheter un jeu..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400"
                />
              </div>

              {/* Bouton ajouter/modifier */}
              <button
                onClick={isEditing ? updateGoal : addGoal}
                disabled={loading || !isFormValid}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:cursor-not-allowed cursor-pointer text-white font-semibold rounded-xl transition-all"
              >
                {isEditing ? <Save size={18} /> : <Plus size={18} />}
                {isEditing ? "Enregistrer" : "Créer l'objectif"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
