import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./components/SignOutButton";
import { User } from "lucide-react";

export default async function AppPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/login");

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">Habit Tracker</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <User size={18} />
              <span>{data.user.email}</span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Bienvenue ! 👋</h2>
          <p className="text-slate-500">Prochaine étape : construire la one-page (New day, habits, steps, goals, streaks).</p>
        </div>
      </div>
    </main>
  );
}
