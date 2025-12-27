import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HistoryTable from "../components/HistoryTable";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/login");

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      {/* Fond décoratif */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-20 w-72 h-72 bg-orange-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 right-1/4 w-80 h-80 bg-rose-200/30 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-amber-200/50 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="p-2.5 hover:bg-amber-100 rounded-xl transition-colors flex items-center gap-2 text-slate-600 hover:text-slate-800"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Retour</span>
          </Link>
          <h1 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Historique</h1>
        </div>
      </header>

      {/* Content */}
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <HistoryTable />
      </div>
    </main>
  );
}
