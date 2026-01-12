import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HistoryTable from "../components/HistoryTable";
import HistoryUserBar from "../components/HistoryUserBar";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/login");

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Header */}
      <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">Historique</h1>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="p-2 sm:p-2.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors flex items-center gap-1.5 sm:gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <ArrowLeft className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              <span className="text-xs sm:text-sm font-medium">Retour</span>
            </Link>

            <HistoryUserBar userEmail={data.user.email ?? ""} />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <HistoryTable />
      </div>
    </main>
  );
}
