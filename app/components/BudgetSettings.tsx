"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { BudgetItem, BudgetKind } from "@/lib/types";
import { X, Wallet, Pencil, Trash2, Plus, Save } from "lucide-react";
import { formatEuros } from "./BudgetTracker";

interface BudgetSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onBudgetChange: () => void;
}

interface FormState {
  kind: BudgetKind;
  name: string;
  amount: string;
  day: string;
  isVariable: boolean;
}

const EMPTY_FORM: FormState = { kind: "expense", name: "", amount: "", day: "", isVariable: false };

export default function BudgetSettings({ isOpen, onClose, onBudgetChange }: BudgetSettingsProps) {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const fetchItems = useCallback(async () => {
    const { data } = await supabase.from("budget_items").select("*").order("order_index", { ascending: true });
    setItems((data || []).map((i) => ({ ...i, amount: Number(i.amount) })));
  }, [supabase]);

  useEffect(() => {
    if (isOpen) fetchItems();
  }, [isOpen, fetchItems]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const amount = parseFloat(form.amount.replace(",", "."));
  const day = form.day.trim() === "" ? null : parseInt(form.day, 10);
  const isDayValid = day === null || (Number.isInteger(day) && day >= 1 && day <= 31);
  const isFormValid = form.name.trim() !== "" && !isNaN(amount) && amount >= 0 && isDayValid;

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  async function handleSubmit() {
    if (!isFormValid || saving) return;
    setSaving(true);

    const values = {
      kind: form.kind,
      name: form.name.trim(),
      amount,
      day_of_month: day,
      is_variable: form.isVariable,
    };

    const { error } = editingId
      ? await supabase.from("budget_items").update(values).eq("id", editingId)
      : await supabase.from("budget_items").insert({ ...values, order_index: items.length });

    if (!error) {
      resetForm();
      await fetchItems();
      onBudgetChange();
    }
    setSaving(false);
  }

  function startEdit(item: BudgetItem) {
    setEditingId(item.id);
    setForm({
      kind: item.kind,
      name: item.name,
      amount: String(item.amount),
      day: item.day_of_month ? String(item.day_of_month) : "",
      isVariable: item.is_variable,
    });
  }

  async function deleteItem(item: BudgetItem) {
    const confirmed = window.confirm(`Supprimer « ${item.name} » ?\n\nSon historique (les mois où elle a été cochée) sera aussi effacé.`);
    if (!confirmed) return;

    const { error } = await supabase.from("budget_items").delete().eq("id", item.id);
    if (!error) {
      if (editingId === item.id) resetForm();
      await fetchItems();
      onBudgetChange();
    }
  }

  if (!isOpen) return null;

  const groups: { kind: BudgetKind; label: string }[] = [
    { kind: "expense", label: "Dépenses" },
    { kind: "income", label: "Revenus" },
  ];

  const inputClass =
    "w-full min-w-0 px-4 py-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-none" />

      <div className="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col overflow-hidden z-10">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center">
              <Wallet size={20} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Mon budget</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer">
            <X size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {items.length === 0 && (
            <div className="text-center py-6 mb-6">
              <p className="text-slate-500 dark:text-slate-400">Aucune ligne pour l&apos;instant</p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Ajoute ton loyer, ton salaire... ci-dessous.</p>
            </div>
          )}

          {groups.map(({ kind, label }) => {
            const groupItems = items.filter((i) => i.kind === kind);
            if (groupItems.length === 0) return null;
            return (
              <div key={kind} className="mb-6">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{label}</p>
                <div className="space-y-2">
                  {groupItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-xl ${
                        editingId === item.id ? "bg-indigo-50 dark:bg-indigo-950/40 ring-2 ring-indigo-300 dark:ring-indigo-700" : "bg-slate-50 dark:bg-zinc-800"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-700 dark:text-slate-200 truncate">{item.name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {[item.day_of_month ? `le ${item.day_of_month === 1 ? "1er" : item.day_of_month}` : "sans date", item.is_variable ? "variable" : "fixe"].join(" · ")}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {item.is_variable ? "~ " : ""}
                        {formatEuros(item.amount)}
                      </span>
                      <button
                        onClick={() => startEdit(item)}
                        className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                        title="Modifier"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => deleteItem(item)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="border-t border-slate-100 dark:border-zinc-800 pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{editingId ? "Modifier la ligne" : "Nouvelle ligne"}</p>
              {editingId && (
                <button onClick={resetForm} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer">
                  Annuler
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(["expense", "income"] as BudgetKind[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setForm((f) => ({ ...f, kind: k }))}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                    form.kind === k
                      ? k === "expense"
                        ? "bg-indigo-500 text-white"
                        : "bg-emerald-500 text-white"
                      : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {k === "expense" ? "Dépense" : "Revenu"}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder={form.kind === "expense" ? "Ex : Loyer" : "Ex : Salaire"}
              className={inputClass}
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{form.isVariable ? "Montant estimé (€)" : "Montant (€)"}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="760"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Jour du mois (facultatif)</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={form.day}
                  onChange={(e) => setForm((f) => ({ ...f, day: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="1"
                  className={`${inputClass} ${isDayValid ? "" : "border-red-400 focus:border-red-500"}`}
                />
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isVariable}
                onChange={(e) => setForm((f) => ({ ...f, isVariable: e.target.checked }))}
                className="mt-0.5 w-4 h-4 accent-indigo-500 cursor-pointer"
              />
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Montant variable
                <span className="block text-xs text-slate-400 dark:text-slate-500">Tu saisiras le montant réel en cochant (électricité, essence...)</span>
              </span>
            </label>

            <button
              onClick={handleSubmit}
              disabled={!isFormValid || saving}
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 dark:bg-slate-100 hover:bg-slate-900 dark:hover:bg-white disabled:bg-slate-200 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed cursor-pointer text-white dark:text-slate-900 font-semibold rounded-xl transition-colors"
            >
              {editingId ? <Save size={18} /> : <Plus size={18} />}
              {editingId ? "Enregistrer" : "Ajouter"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
