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
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Historique</h1>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2 text-slate-600 hover:text-slate-800"
            >
              <ArrowLeft size={18} />
              <span className="text-sm font-medium">Retour</span>
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
