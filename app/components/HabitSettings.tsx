"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Habit } from "@/lib/types";
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  // Icons pour le picker
  Check,
  Star,
  Heart,
  Zap,
  Target,
  Trophy,
  Flame,
  Sun,
  Moon,
  CloudSun,
  Sparkles,
  Dumbbell,
  Bike,
  PersonStanding,
  Footprints,
  Droplets,
  Apple,
  Coffee,
  Utensils,
  Cookie,
  Salad,
  BookOpen,
  PenLine,
  GraduationCap,
  Brain,
  Lightbulb,
  Pill,
  Stethoscope,
  BedDouble,
  Clock,
  AlarmClock,
  Music,
  Palette,
  Camera,
  Gamepad2,
  Home,
  Briefcase,
  Wallet,
  PiggyBank,
  Users,
  MessageCircle,
  Phone,
  Mail,
  Leaf,
  TreePine,
  Flower2,
  Dog,
  Cat,
  Smile,
  ThumbsUp,
  PartyPopper,
  Gift,
  type LucideIcon,
} from "lucide-react";

// Catégories d'icônes
const ICON_CATEGORIES: { name: string; icons: { name: string; icon: LucideIcon }[] }[] = [
  {
    name: "Général",
    icons: [
      { name: "Check", icon: Check },
      { name: "Star", icon: Star },
      { name: "Heart", icon: Heart },
      { name: "Zap", icon: Zap },
      { name: "Target", icon: Target },
      { name: "Trophy", icon: Trophy },
      { name: "Flame", icon: Flame },
      { name: "Sparkles", icon: Sparkles },
    ],
  },
  {
    name: "Sport",
    icons: [
      { name: "Dumbbell", icon: Dumbbell },
      { name: "Bike", icon: Bike },
      { name: "PersonStanding", icon: PersonStanding },
      { name: "Footprints", icon: Footprints },
    ],
  },
  {
    name: "Santé",
    icons: [
      { name: "Droplets", icon: Droplets },
      { name: "Apple", icon: Apple },
      { name: "Salad", icon: Salad },
      { name: "Pill", icon: Pill },
      { name: "Stethoscope", icon: Stethoscope },
      { name: "BedDouble", icon: BedDouble },
    ],
  },
  {
    name: "Travail",
    icons: [
      { name: "BookOpen", icon: BookOpen },
      { name: "PenLine", icon: PenLine },
      { name: "GraduationCap", icon: GraduationCap },
      { name: "Brain", icon: Brain },
      { name: "Lightbulb", icon: Lightbulb },
      { name: "Briefcase", icon: Briefcase },
    ],
  },
  {
    name: "Lifestyle",
    icons: [
      { name: "Coffee", icon: Coffee },
      { name: "Utensils", icon: Utensils },
      { name: "Sun", icon: Sun },
      { name: "Moon", icon: Moon },
      { name: "Clock", icon: Clock },
      { name: "AlarmClock", icon: AlarmClock },
      { name: "Music", icon: Music },
      { name: "Palette", icon: Palette },
    ],
  },
  {
    name: "Social",
    icons: [
      { name: "Users", icon: Users },
      { name: "MessageCircle", icon: MessageCircle },
      { name: "Phone", icon: Phone },
      { name: "Mail", icon: Mail },
      { name: "Home", icon: Home },
      { name: "Wallet", icon: Wallet },
    ],
  },
  {
    name: "Fun",
    icons: [
      { name: "Smile", icon: Smile },
      { name: "ThumbsUp", icon: ThumbsUp },
      { name: "PartyPopper", icon: PartyPopper },
      { name: "Gift", icon: Gift },
      { name: "Gamepad2", icon: Gamepad2 },
      { name: "Camera", icon: Camera },
      { name: "Dog", icon: Dog },
      { name: "Cat", icon: Cat },
    ],
  },
];

// Map pour récupérer l'icône par nom
const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(ICON_CATEGORIES.flatMap((cat) => cat.icons.map((i) => [i.name, i.icon])));

// Composant pour afficher une icône par son nom
export function HabitIcon({ name, size = 20, className = "" }: { name: string; size?: number; className?: string }) {
  const IconComponent = ICON_MAP[name] || Check;
  return <IconComponent size={size} className={className} />;
}

interface HabitSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onHabitsChange: () => void;
}

export default function HabitSettings({ isOpen, onClose, onHabitsChange }: HabitSettingsProps) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitIcon, setNewHabitIcon] = useState("Check");
  const [loading, setLoading] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [editingIconFor, setEditingIconFor] = useState<string | null>(null); // ID de l'habitude en édition
  const [activeCategory, setActiveCategory] = useState(0);
  const supabase = createClient();

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
      await fetchHabits();
      onHabitsChange();
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">Mes habitudes</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Liste des habitudes existantes */}
          {habits.length > 0 ? (
            <div className="space-y-3 mb-8">
              {habits.map((habit) => (
                <div key={habit.id} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl group">
                  <GripVertical size={16} className="text-slate-300 cursor-grab" />

                  {/* Icône cliquable */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setEditingIconFor(editingIconFor === habit.id ? null : habit.id);
                        setShowIconPicker(false); // Fermer le picker de nouvelle habitude
                      }}
                      className="w-10 h-10 bg-amber-100 hover:bg-amber-200 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                      title="Changer l'icône"
                    >
                      <HabitIcon name={habit.emoji} size={22} className="text-amber-600" />
                    </button>

                    {/* Mini picker pour modifier l'icône */}
                    {editingIconFor === habit.id && (
                      <div className="absolute top-12 left-0 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-30 w-72">
                        {/* Catégories */}
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

                        {/* Icônes */}
                        <div className="grid grid-cols-4 gap-2">
                          {ICON_CATEGORIES[activeCategory].icons.map((item) => {
                            const IconComp = item.icon;
                            return (
                              <button
                                key={item.name}
                                onClick={() => {
                                  updateHabit(habit.id, { emoji: item.name });
                                  setEditingIconFor(null);
                                }}
                                className={`w-12 h-12 flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
                                  habit.emoji === item.name
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

                  <input
                    type="text"
                    value={habit.name}
                    onChange={(e) => updateHabit(habit.id, { name: e.target.value })}
                    className="flex-1 bg-transparent text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 rounded-lg px-2 py-1"
                  />
                  <button
                    onClick={() => deleteHabit(habit.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 mb-8">
              <div className="text-5xl mb-4">📝</div>
              <p className="text-slate-500 text-base">Aucune habitude pour l'instant</p>
              <p className="text-slate-400 text-sm mt-1">Ajoute ta première habitude ci-dessous !</p>
            </div>
          )}

          {/* Ajouter une habitude */}
          <div className="border-t border-slate-100 pt-6">
            <p className="text-sm font-semibold text-slate-700 mb-4">Nouvelle habitude</p>
            <div className="flex gap-2">
              {/* Icon picker button */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowIconPicker(!showIconPicker);
                    setEditingIconFor(null); // Fermer le picker d'édition si ouvert
                  }}
                  className="w-12 h-12 flex items-center justify-center bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors cursor-pointer"
                >
                  <HabitIcon name={newHabitIcon} size={24} className="text-amber-600" />
                </button>

                {showIconPicker && (
                  <div className="absolute bottom-14 left-0 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-20 w-72">
                    {/* Catégories */}
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

                    {/* Icônes de la catégorie active */}
                    <div className="grid grid-cols-4 gap-2">
                      {ICON_CATEGORIES[activeCategory].icons.map((item) => {
                        const IconComp = item.icon;
                        return (
                          <button
                            key={item.name}
                            onClick={() => {
                              setNewHabitIcon(item.name);
                              setShowIconPicker(false);
                            }}
                            className={`w-12 h-12 flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
                              newHabitIcon === item.name
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

              {/* Input */}
              <input
                type="text"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addHabit()}
                placeholder="Ex: Méditer 10 min"
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />

              {/* Add button */}
              <button
                onClick={addHabit}
                disabled={loading || !newHabitName.trim()}
                className="px-4 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:cursor-not-allowed cursor-pointer text-white rounded-xl transition-colors"
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
