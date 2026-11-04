"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Footprints, Save, Heart, Copy, Check, RefreshCw } from "lucide-react";

interface StepSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onStepGoalChange: () => void;
}

const DEFAULT_STEP_GOAL = 15000;

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export default function StepSettings({ isOpen, onClose, onStepGoalChange }: StepSettingsProps) {
  const [dailyStepGoal, setDailyStepGoal] = useState<number>(DEFAULT_STEP_GOAL);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncToken, setSyncToken] = useState<string | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [copied, setCopied] = useState<"url" | "token" | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

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
      setSyncToken(data.step_sync_token ?? null);
    } else {
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

  async function regenerateSyncToken() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (syncToken && !confirm("Générer un nouveau jeton ? L'ancien ne fonctionnera plus, il faudra mettre à jour ton Raccourci.")) return;

    setGeneratingToken(true);
    const token = generateToken();
    const { error } = await supabase.from("user_settings").update({ step_sync_token: token }).eq("user_id", user.id);
    if (!error) setSyncToken(token);
    setGeneratingToken(false);
  }

  async function copy(value: string, kind: "url" | "token") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  }

  async function saveSettings() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || dailyStepGoal < 1) return;

    setSaving(true);

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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer" onClick={onClose} />

      <div className="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center">
              <Footprints size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Objectif de pas</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer">
            <X size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse text-slate-400 dark:text-slate-500">Chargement...</div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                    Objectif journalier (pas) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      value={dailyStepGoal}
                      onChange={(e) => setDailyStepGoal(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-700 dark:text-slate-200 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-600 focus:border-blue-400 dark:focus:border-blue-500"
                      placeholder="15000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Suggestions rapides</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[5000, 10000, 15000, 20000, 25000, 30000].map((goal) => (
                      <button
                        key={goal}
                        onClick={() => setDailyStepGoal(goal)}
                        className={`px-4 py-2.5 rounded-xl font-medium transition-all cursor-pointer ${
                          dailyStepGoal === goal
                            ? "bg-blue-600 dark:bg-blue-500 text-white"
                            : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-700"
                        }`}
                      >
                        {goal.toLocaleString("fr-FR")}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={saveSettings}
                  disabled={saving || dailyStepGoal < 1}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 dark:bg-slate-100 hover:bg-slate-900 dark:hover:bg-white disabled:bg-slate-200 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed cursor-pointer text-white dark:text-slate-900 font-semibold rounded-xl transition-all"
                >
                  <Save size={18} />
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-zinc-800 space-y-4">
                <div className="flex items-center gap-2">
                  <Heart size={16} className="text-rose-500" />
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">Synchro Apple Santé</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Une app web ne peut pas lire Apple Santé directement. Un Raccourci iOS lit tes pas et les envoie ici automatiquement.
                </p>

                {syncToken ? (
                  <>
                    {[
                      { kind: "url" as const, label: "URL", value: typeof window !== "undefined" ? `${window.location.origin}/api/steps/sync` : "" },
                      { kind: "token" as const, label: "Jeton (secret)", value: syncToken },
                    ].map(({ kind, label, value }) => (
                      <div key={kind}>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 min-w-0 truncate px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-700 dark:text-slate-300">
                            {value}
                          </code>
                          <button
                            onClick={() => copy(value, kind)}
                            className="p-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer"
                            aria-label={`Copier ${label}`}
                          >
                            {copied === kind ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-slate-500" />}
                          </button>
                        </div>
                      </div>
                    ))}

                    <ol className="list-decimal pl-5 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <li>App <b>Raccourcis</b> → nouveau raccourci.</li>
                      <li>
                        Action <b>Rechercher des échantillons de santé</b> : type <i>Nombre de pas</i>, date <i>Aujourd&apos;hui</i>, regrouper par{" "}
                        <i>Jour</i>, sans limite.
                      </li>
                      <li>
                        Action <b>Calculer les statistiques</b> : <i>Somme</i> des échantillons.
                      </li>
                      <li>
                        Action <b>Obtenir le contenu de l&apos;URL</b> : l&apos;URL ci-dessus, méthode <i>POST</i>, en-tête{" "}
                        <code>Authorization</code> = <code>Bearer &lt;jeton&gt;</code>, corps <i>JSON</i> avec <code>steps</code> = la Somme.
                      </li>
                      <li>
                        Onglet <b>Automatisation</b> → <i>Heure de la journée</i> (ex. toutes les heures ou 23h30) → lancer ce raccourci,{" "}
                        <i>Exécuter immédiatement</i>.
                      </li>
                    </ol>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">Génère un jeton pour configurer ton Raccourci.</p>
                )}

                <button
                  onClick={regenerateSyncToken}
                  disabled={generatingToken}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 font-medium rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={16} className={generatingToken ? "animate-spin" : ""} />
                  {syncToken ? "Régénérer le jeton" : "Activer la synchro Apple Santé"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
