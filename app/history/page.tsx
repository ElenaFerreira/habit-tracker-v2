import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HistoryTable from "../components/HistoryTable";
import HistoryHeader from "../components/HistoryHeader";

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/login");

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950">
      <HistoryHeader userEmail={data.user.email ?? ""} />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <HistoryTable />
      </div>
    </main>
  );
}
