"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Habit } from "@/lib/types";
import { X, Plus, Trash2, GripVertical, TrendingUp, Pencil, Save } from "lucide-react";
import { HabitIcon, ICON_CATEGORIES } from "@/lib/icons";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface HabitSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onHabitsChange: () => void;
}

interface SortableHabitItemProps {
  habit: Habit;
  isEditing: boolean;
  editingHabitName: string;
  editingIconFor: string | null;
  activeCategory: number;
  onStartEdit: (habit: Habit) => void;
  onCancelEdit: () => void;
  onSaveEdit: (habitId: string) => void;
  onDelete: (habitId: string) => void;
  onUpdateHabit: (habitId: string, updates: Partial<Habit>) => void;
  onEditingHabitNameChange: (name: string) => void;
  onEditingIconForChange: (id: string | null) => void;
  onActiveCategoryChange: (idx: number) => void;
  onShowIconPickerChange: (show: boolean) => void;
}

function SortableHabitItem({
  habit,
  isEditing,
  editingHabitName,
  editingIconFor,
  activeCategory,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onUpdateHabit,
  onEditingHabitNameChange,
  onEditingIconForChange,
  onActiveCategoryChange,
  onShowIconPickerChange,
}: SortableHabitItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-zinc-800 rounded-xl group">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical size={16} className="text-slate-300 dark:text-zinc-600" />
      </div>

      {/* Icône - cliquable directement sauf en mode édition */}
      <div className="relative">
        {isEditing ? (
          // En mode édition, l'icône n'est pas cliquable
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center">
            <HabitIcon name={habit.emoji} size={22} className="text-amber-600 dark:text-amber-400" />
          </div>
        ) : (
          // Hors mode édition, l'icône est cliquable
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditingIconForChange(editingIconFor === habit.id ? null : habit.id);
              onShowIconPickerChange(false);
            }}
            className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-800/50 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
            title="Changer l'icône"
          >
            <HabitIcon name={habit.emoji} size={22} className="text-amber-600 dark:text-amber-400" />
          </button>
        )}

        {/* Mini picker pour modifier l'icône - seulement si pas en mode édition */}
        {!isEditing && editingIconFor === habit.id && (
          <div
            className="absolute top-12 left-0 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-700 pt-6 pb-4 px-4 z-50 w-80 max-w-[calc(100vw-3rem)]"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Bouton de fermeture */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditingIconForChange(null);
              }}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              aria-label="Fermer le choix d'icône"
            >
              <X size={14} />
            </button>

            {/* Catégories */}
            <div className="flex gap-1 mb-3 overflow-x-auto pb-2 -mx-1 px-1 pr-6">
              {ICON_CATEGORIES.map((cat, idx) => (
                <button
                  key={cat.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    onActiveCategoryChange(idx);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                    activeCategory === idx
                      ? "bg-amber-500 text-white"
                      : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Icônes */}
            <div className="grid grid-cols-4 gap-2">
              {ICON_CATEGORIES[activeCategory].icons.map((item) => {
                const IconComp = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateHabit(habit.id, { emoji: item.name });
                      onEditingIconForChange(null);
                    }}
                    className={`w-12 h-12 flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
                      habit.emoji === item.name
                        ? "bg-amber-500 text-white"
                        : "bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 hover:text-amber-600 dark:hover:text-amber-400"
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

      {/* Nom - en mode édition ou affichage */}
      {isEditing ? (
        <input
          type="text"
          value={editingHabitName}
          onChange={(e) => onEditingHabitNameChange(e.target.value)}
          onBlur={() => onSaveEdit(habit.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSaveEdit(habit.id);
            } else if (e.key === "Escape") {
              onCancelEdit();
            }
          }}
          className="flex-1 min-w-0 px-3 py-2 bg-white dark:bg-zinc-900 border border-amber-500/30 rounded-xl text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
          placeholder="Nom de l'habitude"
          autoFocus
        />
      ) : (
        <p className="flex-1 min-w-0 text-slate-700 dark:text-slate-200 font-medium truncate">{habit.name}</p>
      )}

      {/* Boutons d'action */}
      <div className="flex items-center gap-1">
        {isEditing ? (
          <>
            <button
              onClick={() => onSaveEdit(habit.id)}
              className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors cursor-pointer"
              title="Sauvegarder"
            >
              <Save size={16} />
            </button>
            <button
              onClick={onCancelEdit}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
              title="Annuler"
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onStartEdit(habit)}
              className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors cursor-pointer"
              title="Modifier"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => onDelete(habit.id)}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer"
              title="Supprimer"
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function HabitSettings({ isOpen, onClose, onHabitsChange }: HabitSettingsProps) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitIcon, setNewHabitIcon] = useState("Check");
  const [loading, setLoading] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [editingIconFor, setEditingIconFor] = useState<string | null>(null); // ID de l'habitude en édition
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null); // ID de l'habitude en mode édition (nom + icône)
  const [editingHabitName, setEditingHabitName] = useState<string>(""); // Nom temporaire en cours d'édition
  const [activeCategory, setActiveCategory] = useState(0);
  const supabase = createClient();

  // Configuration des sensors pour le drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fermer les pickers avec la touche Échap
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowIconPicker(false);
        setEditingIconFor(null);
      }
    }

    if (showIconPicker || editingIconFor) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showIconPicker, editingIconFor]);

  // Fermer la modale avec la touche Échap
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !showIconPicker && !editingIconFor) {
        onClose();
      }
    }

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, showIconPicker, editingIconFor, onClose]);

  useEffect(() => {
    if (isOpen) {
      fetchHabits();
    }
  }, [isOpen]);

  async function fetchHabits() {
    const { data } = await supabase.from("habits").select("*").order("order_index", { ascending: true });

    if (data) setHabits(data);
  }

  async function addHabit() {
    if (!newHabitName.trim()) return;

    setLoading(true);
    const { data: userData, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error("Erreur auth:", authError);
      setLoading(false);
      return;
    }

    if (!userData.user) {
      console.error("Pas d'utilisateur connecté");
      setLoading(false);
      return;
    }

    console.log("Ajout habitude pour user:", userData.user.id);

    const { data, error } = await supabase
      .from("habits")
      .insert({
        user_id: userData.user.id,
        name: newHabitName.trim(),
        emoji: newHabitIcon, // On réutilise le champ emoji pour stocker le nom de l'icône
        order_index: habits.length,
      })
      .select();

    if (error) {
      console.error("Erreur insertion:", error);
    } else {
      console.log("Habitude ajoutée:", data);
      setNewHabitName("");
      setNewHabitIcon("Check");
      await fetchHabits();
      onHabitsChange();
    }
    setLoading(false);
  }

  async function deleteHabit(habitId: string) {
    const { error } = await supabase.from("habits").delete().eq("id", habitId);
    if (!error) {
      await fetchHabits();
      onHabitsChange();
    }
  }

  async function updateHabit(habitId: string, updates: Partial<Habit>) {
    const { error } = await supabase.from("habits").update(updates).eq("id", habitId);
    if (!error) {
      // Mise à jour optimiste du state local
      setHabits((prev) => prev.map((h) => (h.id === habitId ? { ...h, ...updates } : h)));
      onHabitsChange();
      // Recharger en arrière-plan sans bloquer
      fetchHabits();
    }
  }

  async function updateHabitsOrder(newOrder: Habit[]) {
    // Mise à jour optimiste de l'ordre local
    setHabits(newOrder);

    // Mettre à jour les order_index dans la base de données
    const updates = newOrder.map((habit, index) => ({
      id: habit.id,
      order_index: index,
    }));

    // Mettre à jour toutes les habitudes
    for (const update of updates) {
      const { error } = await supabase.from("habits").update({ order_index: update.order_index }).eq("id", update.id);
      if (error) {
        console.error("Erreur lors de la mise à jour de l'ordre:", error);
        // En cas d'erreur, recharger depuis la base de données
        await fetchHabits();
        return;
      }
    }

    // Notifier le changement (sans recharger car on a déjà mis à jour le state)
    onHabitsChange();
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = habits.findIndex((item) => item.id === active.id);
      const newIndex = habits.findIndex((item) => item.id === over.id);
      const newOrder = arrayMove(habits, oldIndex, newIndex);
      // Mettre à jour l'ordre dans la base de données
      await updateHabitsOrder(newOrder);
    }
  }

  function startEditHabit(habit: Habit) {
    setEditingHabitId(habit.id);
    setEditingHabitName(habit.name);
    setShowIconPicker(false); // Fermer le picker de nouvelle habitude
    setEditingIconFor(null); // Fermer le picker d'icône si ouvert
  }

  function cancelEditHabit() {
    setEditingHabitId(null);
    setEditingHabitName("");
    setEditingIconFor(null);
  }

  async function saveEditHabit(habitId: string) {
    if (!editingHabitName.trim()) return;

    await updateHabit(habitId, { name: editingHabitName.trim() });
    cancelEditHabit();
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        // Fermer seulement si on clique directement sur le backdrop (pas sur la modale)
        if (e.target === e.currentTarget && !showIconPicker && !editingIconFor) {
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm ${showIconPicker || editingIconFor ? "pointer-events-none" : ""}`} />

      {/* Modal */}
      <div
        className="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col overflow-hidden z-10"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center">
              <TrendingUp size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Mes habitudes</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer">
            <X size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-6">
          {/* Liste des habitudes existantes */}
          {habits.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={habits.map((h) => h.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3 mb-8">
                  {habits.map((habit) => {
                    const isEditing = editingHabitId === habit.id;
                    return (
                      <SortableHabitItem
                        key={habit.id}
                        habit={habit}
                        isEditing={isEditing}
                        editingHabitName={editingHabitName}
                        editingIconFor={editingIconFor}
                        activeCategory={activeCategory}
                        onStartEdit={startEditHabit}
                        onCancelEdit={cancelEditHabit}
                        onSaveEdit={saveEditHabit}
                        onDelete={deleteHabit}
                        onUpdateHabit={updateHabit}
                        onEditingHabitNameChange={setEditingHabitName}
                        onEditingIconForChange={setEditingIconFor}
                        onActiveCategoryChange={setActiveCategory}
                        onShowIconPickerChange={setShowIconPicker}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-12 mb-8">
              <div className="text-5xl mb-4">📝</div>
              <p className="text-slate-500 dark:text-slate-400 text-base">Aucune habitude pour l'instant</p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Ajoute ta première habitude ci-dessous !</p>
            </div>
          )}

          {/* Ajouter une habitude */}
          <div className="border-t border-slate-100 dark:border-zinc-800 pt-6">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Nouvelle habitude</p>
            <div className="flex gap-2 min-w-0">
              {/* Icon picker button */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowIconPicker(!showIconPicker);
                    setEditingIconFor(null); // Fermer le picker d'édition si ouvert
                  }}
                  className="w-12 h-12 flex items-center justify-center bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-800/50 rounded-xl transition-colors cursor-pointer"
                >
                  <HabitIcon name={newHabitIcon} size={24} className="text-amber-600 dark:text-amber-400" />
                </button>

                {showIconPicker && (
                  <div
                    className="absolute bottom-14 left-0 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-700 pt-6 pb-4 px-4 z-50 w-80 max-w-[calc(100vw-3rem)]"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {/* Bouton de fermeture */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowIconPicker(false);
                      }}
                      className="absolute top-2 right-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                      aria-label="Fermer le choix d'icône"
                    >
                      <X size={14} />
                    </button>

                    {/* Catégories */}
                    <div className="flex gap-1 mb-3 overflow-x-auto pb-2 -mx-1 px-1 pr-6">
                      {ICON_CATEGORIES.map((cat, idx) => (
                        <button
                          key={cat.name}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveCategory(idx);
                          }}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                            activeCategory === idx
                              ? "bg-amber-500 text-white"
                              : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-700"
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>

                    {/* Icônes de la catégorie active */}
                    <div className="grid grid-cols-4 gap-2">
                      {ICON_CATEGORIES[activeCategory].icons.map((item) => {
                        const IconComp = item.icon;
                        return (
                          <button
                            key={item.name}
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewHabitIcon(item.name);
                              setShowIconPicker(false);
                            }}
                            className={`w-12 h-12 flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
                              newHabitIcon === item.name
                                ? "bg-amber-500 text-white"
                                : "bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 hover:text-amber-600 dark:hover:text-amber-400"
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

              {/* Input */}
              <input
                type="text"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addHabit()}
                placeholder="Ex: Méditer 10 min"
                className="flex-1 min-w-0 px-4 py-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />

              {/* Add button */}
              <button
                onClick={addHabit}
                disabled={loading || !newHabitName.trim()}
                className="px-4 py-3 bg-slate-800 dark:bg-slate-100 hover:bg-slate-900 dark:hover:bg-white disabled:bg-slate-200 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed cursor-pointer text-white dark:text-slate-900 rounded-xl transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="h-4" /> {/* Espace en bas */}
          </div>
        </div>
      </div>
    </div>
  );
}
