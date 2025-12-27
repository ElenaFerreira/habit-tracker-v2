import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "./components/AppShell";

export default async function AppPage() {
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

      <AppShell userEmail={data.user.email || ""} />
    </main>
  );
}
