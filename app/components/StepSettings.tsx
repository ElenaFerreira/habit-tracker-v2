"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserSettings } from "@/lib/types";
import { X, Footprints, Save } from "lucide-react";

interface StepSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onStepGoalChange: () => void;
}

const DEFAULT_STEP_GOAL = 15000;

export default function StepSettings({ isOpen, onClose, onStepGoalChange }: StepSettingsProps) {
  const [dailyStepGoal, setDailyStepGoal] = useState<number>(DEFAULT_STEP_GOAL);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  // Fermer la modale avec la touche Échap
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  async function fetchSettings() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle();

    if (data) {
      setDailyStepGoal(data.daily_step_goal);
    } else {
      // Créer les paramètres par défaut si ils n'existent pas
      const { data: newSettings } = await supabase
        .from("user_settings")
        .insert({ user_id: user.id, daily_step_goal: DEFAULT_STEP_GOAL })
        .select()
        .single();

      if (newSettings) {
        setDailyStepGoal(newSettings.daily_step_goal);
      }
    }

    setLoading(false);
  }

  async function saveSettings() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || dailyStepGoal < 1) return;

    setSaving(true);

    // Upsert pour créer ou mettre à jour
    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        daily_step_goal: dailyStepGoal,
      },
      { onConflict: "user_id" }
    );

    if (!error) {
      onStepGoalChange();
      onClose();
    }

    setSaving(false);
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Footprints size={20} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Objectif de pas</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse text-slate-400">Chargement...</div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Formulaire */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    Objectif journalier (pas) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      value={dailyStepGoal}
                      onChange={(e) => setDailyStepGoal(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                      placeholder="15000"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">pas</div>
                  </div>
                </div>

                {/* Suggestions rapides */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">Suggestions rapides</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[5000, 10000, 15000, 20000, 25000, 30000].map((goal) => (
                      <button
                        key={goal}
                        onClick={() => setDailyStepGoal(goal)}
                        className={`px-4 py-2.5 rounded-xl font-medium transition-all cursor-pointer ${
                          dailyStepGoal === goal ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {goal.toLocaleString("fr-FR")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bouton sauvegarder */}
                <button
                  onClick={saveSettings}
                  disabled={saving || dailyStepGoal < 1}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:cursor-not-allowed cursor-pointer text-white font-semibold rounded-xl transition-all"
                >
                  <Save size={18} />
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
