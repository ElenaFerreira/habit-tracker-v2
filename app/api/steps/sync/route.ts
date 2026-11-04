import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Reçoit les pas envoyés par le Raccourci iOS « Apple Santé → Habit Tracker ».
 *
 * POST /api/steps/sync
 * Headers : Authorization: Bearer <jeton de synchro>
 * Body    : { "steps": 8432, "date": "2026-11-04" }   (date optionnelle, défaut = aujourd'hui, heure de Paris)
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return NextResponse.json({ error: "Jeton manquant" }, { status: 401 });
  }

  let body: { steps?: unknown; date?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  // Raccourcis peut envoyer le nombre en texte, avec décimales ou séparateurs (« 8 432 », « 8432,0 »)
  const steps = Math.round(Number(String(body.steps ?? "").replace(/[\s  ]/g, "").replace(",", ".")));
  if (!Number.isFinite(steps) || steps < 0) {
    return NextResponse.json({ error: "Nombre de pas invalide" }, { status: 400 });
  }

  const date =
    typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? body.date
      : new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.rpc("sync_steps_with_token", { p_token: token, p_date: date, p_steps: steps });

  if (error) {
    if (error.message.includes("invalid_token")) {
      return NextResponse.json({ error: "Jeton invalide" }, { status: 401 });
    }
    if (error.message.includes("invalid_steps")) {
      return NextResponse.json({ error: "Nombre de pas invalide" }, { status: 400 });
    }
    console.error("[steps/sync]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, date, steps });
}
