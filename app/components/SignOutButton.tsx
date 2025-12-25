"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-2 rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
    >
      <LogOut size={18} />
      Déconnexion
    </button>
  );
}
