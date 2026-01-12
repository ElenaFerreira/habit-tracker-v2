import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "./components/AppShell";

export default async function AppPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/login");

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950">
      <AppShell userEmail={data.user.email || ""} />
    </main>
  );
}
