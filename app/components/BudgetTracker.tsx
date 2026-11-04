"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { BudgetItem, BudgetPayment } from "@/lib/types";
import { useToday } from "@/lib/hooks/useToday";
import { Wallet, Settings2, Check, Loader2, X, ArrowDownLeft, ArrowUpRight } from "lucide-react";

const MONTH_NAMES = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2, minimumFractionDigits: 0 });

export function formatEuros(n: number): string {
  return euros.format(n);
}

function formatDay(day: number): string {
  return day === 1 ? "le 1er" : `le ${day}`;
}

interface BudgetTrackerProps {
  onOpenSettings: () => void;
}

export default function BudgetTracker({ onOpenSettings }: BudgetTrackerProps) {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [payments, setPayments] = useState<Map<string, BudgetPayment>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [pendingItemId, setPendingItemId] = useState<string | null>(null); // Montant variable en cours de saisie
  const [pendingAmount, setPendingAmount] = useState("");
  const today = useToday(); // YYYY-MM-DD
  const supabase = createClient();

  const month = today.slice(0, 7) + "-01";
  const todayDay = Number(today.slice(8, 10));
  const year = Number(today.slice(0, 4));
  const monthIndex = Number(today.slice(5, 7)) - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const fetchData = useCallback(async () => {
    const [{ data: itemsData }, { data: paymentsData }] = await Promise.all([
      supabase.from("budget_items").select("*").order("order_index", { ascending: true }),
      supabase.from("budget_payments").select("id, item_id, month, amount, paid_on").eq("month", month),
    ]);

    setItems((itemsData || []).map((i) => ({ ...i, amount: Number(i.amount) })));
    setPayments(new Map((paymentsData || []).map((p) => [p.item_id, { ...p, amount: Number(p.amount) }])));
    setLoading(false);
  }, [supabase, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function setItemSaving(itemId: string, value: boolean) {
    setSaving((prev) => {
      const next = new Set(prev);
      if (value) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  }

  async function markPaid(item: BudgetItem, amount: number) {
    setItemSaving(item.id, true);
    const { data, error } = await supabase
      .from("budget_payments")
      .insert({ item_id: item.id, month, amount, paid_on: today })
      .select("id, item_id, month, amount, paid_on")
      .single();

    if (error || !data) {
      await fetchData();
    } else {
      setPayments((prev) => new Map(prev).set(item.id, { ...data, amount: Number(data.amount) }));
    }
    setItemSaving(item.id, false);
  }

  async function markUnpaid(item: BudgetItem) {
    const payment = payments.get(item.id);
    if (!payment) return;

    setItemSaving(item.id, true);
    const { error } = await supabase.from("budget_payments").delete().eq("id", payment.id);
    if (error) {
      await fetchData();
    } else {
      setPayments((prev) => {
        const next = new Map(prev);
        next.delete(item.id);
        return next;
      });
    }
    setItemSaving(item.id, false);
  }

  function handleToggle(item: BudgetItem) {
    if (saving.has(item.id)) return;
    if (payments.has(item.id)) {
      markUnpaid(item);
    } else if (item.is_variable) {
      setPendingItemId(item.id);
      setPendingAmount(String(item.amount));
    } else {
      markPaid(item, item.amount);
    }
  }

  async function confirmPending(item: BudgetItem) {
    const amount = parseFloat(pendingAmount.replace(",", "."));
    if (isNaN(amount) || amount < 0) return;
    setPendingItemId(null);
    await markPaid(item, amount);
  }

  if (loading) {
    return <div className="bento-card bg-indigo-50 dark:bg-indigo-950/20 rounded-3xl animate-pulse min-h-[200px] border border-indigo-200 dark:border-indigo-900/50" />;
  }

  const byDay = (a: BudgetItem, b: BudgetItem) => (a.day_of_month ?? 99) - (b.day_of_month ?? 99) || a.order_index - b.order_index;
  const expenses = items.filter((i) => i.kind === "expense").sort(byDay);
  const incomes = items.filter((i) => i.kind === "income").sort(byDay);

  // Montant réel si payé, sinon montant prévu
  const effective = (i: BudgetItem) => payments.get(i.id)?.amount ?? i.amount;
  const plannedExpenses = expenses.reduce((s, i) => s + effective(i), 0);
  const spent = expenses.filter((i) => payments.has(i.id)).reduce((s, i) => s + effective(i), 0);
  const leftToPay = plannedExpenses - spent;
  const plannedIncome = incomes.reduce((s, i) => s + effective(i), 0);
  const balance = plannedIncome - plannedExpenses;
  const spentPercent = plannedExpenses > 0 ? Math.min(100, Math.round((spent / plannedExpenses) * 100)) : 0;

  function renderRow(item: BudgetItem) {
    const payment = payments.get(item.id);
    const isPaid = !!payment;
    const isSaving = saving.has(item.id);
    const isIncome = item.kind === "income";
    const dueDay = item.day_of_month ? Math.min(item.day_of_month, daysInMonth) : null;
    const isLate = !isPaid && dueDay !== null && dueDay < todayDay;

    if (pendingItemId === item.id) {
      return (
        <div key={item.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 ring-2 ring-indigo-300 dark:ring-indigo-700">
          <span className="flex-1 min-w-0 truncate text-sm font-medium text-slate-700 dark:text-slate-200">{item.name}</span>
          <input
            type="text"
            inputMode="decimal"
            value={pendingAmount}
            onChange={(e) => setPendingAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmPending(item);
              if (e.key === "Escape") setPendingItemId(null);
            }}
            autoFocus
            className="w-24 px-2 py-1.5 text-right text-sm bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
            aria-label={`Montant réel de ${item.name}`}
          />
          <span className="text-sm text-slate-500">€</span>
          <button
            onClick={() => confirmPending(item)}
            className="p-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white cursor-pointer"
            title="Valider"
          >
            <Check size={14} strokeWidth={3} />
          </button>
          <button
            onClick={() => setPendingItemId(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-700 cursor-pointer"
            title="Annuler"
          >
            <X size={14} />
          </button>
        </div>
      );
    }

    return (
      <button
        key={item.id}
        onClick={() => handleToggle(item)}
        disabled={isSaving}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer disabled:cursor-wait ${
          isPaid ? "bg-indigo-100/60 dark:bg-indigo-900/20" : "bg-white/70 dark:bg-zinc-800/60 hover:bg-white dark:hover:bg-zinc-800"
        }`}
      >
        <span
          className={`w-6 h-6 shrink-0 rounded-lg flex items-center justify-center ${
            isPaid ? "bg-indigo-500" : "border-2 border-dashed border-slate-300 dark:border-zinc-600"
          }`}
        >
          {isSaving ? <Loader2 size={12} className="animate-spin text-slate-400" /> : isPaid ? <Check size={14} strokeWidth={3} className="text-white" /> : null}
        </span>
        <span className="flex-1 min-w-0">
          <span className={`block truncate text-sm font-medium ${isPaid ? "text-slate-500 dark:text-slate-400 line-through" : "text-slate-700 dark:text-slate-200"}`}>
            {item.name}
          </span>
          {(dueDay !== null || item.is_variable) && (
            <span className={`block text-xs ${isLate ? "text-amber-600 dark:text-amber-400 font-medium" : "text-slate-400 dark:text-slate-500"}`}>
              {[dueDay !== null ? formatDay(dueDay) : null, isLate ? (isIncome ? "en attente" : "en retard") : null, item.is_variable && !isPaid ? "montant variable" : null]
                .filter(Boolean)
                .join(" · ")}
            </span>
          )}
        </span>
        <span className={`text-sm font-semibold whitespace-nowrap ${isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200"}`}>
          {item.is_variable && !isPaid ? "~ " : ""}
          {isIncome ? "+ " : ""}
          {formatEuros(effective(item))}
        </span>
      </button>
    );
  }

  return (
    <div className="bento-card bg-indigo-50 dark:bg-indigo-950/20 p-6 rounded-3xl border border-indigo-200 dark:border-indigo-900/50">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center">
            <Wallet size={20} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Budget</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 first-letter:uppercase">
              {MONTH_NAMES[monthIndex]} {year}
            </p>
          </div>
        </div>
        <button
          onClick={onOpenSettings}
          className="p-2.5 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl transition-colors cursor-pointer text-indigo-600 dark:text-indigo-400"
          title="Gérer mes dépenses et revenus"
        >
          <Settings2 size={18} />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">Ajoute tes dépenses et revenus mensuels (loyer, électricité, salaire...)</p>
          <button
            onClick={onOpenSettings}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Configurer mon budget
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-white/70 dark:bg-zinc-800/60 rounded-xl p-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Dépensé</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{formatEuros(spent)}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">sur {formatEuros(plannedExpenses)}</p>
            </div>
            <div className="bg-white/70 dark:bg-zinc-800/60 rounded-xl p-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Reste à payer</p>
              <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{formatEuros(leftToPay)}</p>
            </div>
            <div className="bg-white/70 dark:bg-zinc-800/60 rounded-xl p-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Solde prévu</p>
              <p className={`text-lg font-bold ${balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {balance >= 0 ? "+ " : ""}
                {formatEuros(balance)}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">revenus − dépenses</p>
            </div>
          </div>

          <div className="h-2 bg-white/70 dark:bg-zinc-800 rounded-full overflow-hidden mb-5">
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${spentPercent}%` }} />
          </div>

          {expenses.length > 0 && (
            <div className="mb-4">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                <ArrowUpRight size={12} /> Dépenses
              </p>
              <div className="space-y-1.5">{expenses.map(renderRow)}</div>
            </div>
          )}

          {incomes.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                <ArrowDownLeft size={12} /> Revenus
              </p>
              <div className="space-y-1.5">{incomes.map(renderRow)}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
