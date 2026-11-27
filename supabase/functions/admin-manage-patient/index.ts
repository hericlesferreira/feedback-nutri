import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { randomInt } from "node:crypto";

const origins = new Set(["https://feedback.nutrihericles.com.br", "https://feedback-nutri.nutri-hericles.workers.dev"]);

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (origin && origins.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  const reply = (status: number, value: object) => Response.json(value, { status, headers });
  if (origin && !origins.has(origin)) return reply(403, { error: "Origem não permitida." });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return reply(405, { error: "Método inválido." });

  try {
    const auth = request.headers.get("Authorization");
    if (!auth) return reply(401, { error: "Sessão inválida." });
    const url = Deno.env.get("SUPABASE_URL")!;
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return reply(401, { error: "Sessão inválida." });
    const { data: operator } = await admin.from("profiles")
      .select("role,active,must_change_password").eq("id", user.id).single();
    if (operator?.role !== "admin" || !operator.active || operator.must_change_password) {
      return reply(403, { error: "Ação exclusiva do administrador." });
    }
    const body = await request.json().catch(() => null);
    const id = body?.patientId;
    if (typeof id !== "string" || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id)) {
      return reply(400, { error: "Paciente inválido." });
    }
    const { data: patient } = await admin.from("profiles").select("id,email").eq("id", id).eq("role", "patient").maybeSingle();
    if (!patient) return reply(404, { error: "Paciente não encontrado." });

    if (body.action === "status" && typeof body.active === "boolean") {
      const { error } = await admin.from("profiles").update({ active: body.active, updated_at: new Date().toISOString() })
        .eq("id", id).eq("role", "patient").select("id").single();
      return error ? reply(500, { error: "Não foi possível alterar a situação." }) : reply(200, { ok: true });
    }
    if (body.action === "reset") {
      const temporaryPassword = String(randomInt(1_000_000)).padStart(6, "0");
      const { error } = await admin.auth.admin.updateUserById(id, {
        password: temporaryPassword, app_metadata: { portal_password_reset: crypto.randomUUID() },
      });
      return error ? reply(500, { error: "Não foi possível redefinir a senha." }) : reply(200, { temporaryPassword });
    }
    if (body.action === "edit") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const phone = typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : "";
      if (!name || name.length > 160 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{10,15}$/.test(phone)) {
        return reply(400, { error: "Confira o nome, e-mail e telefone do paciente." });
      }
      const { error } = await admin.auth.admin.updateUserById(id, {
        ...(email !== patient.email ? { email, email_confirm: true } : {}),
        user_metadata: { full_name: name, phone },
        app_metadata: { portal_profile_edit: crypto.randomUUID() },
      });
      if (error?.status === 422 || error?.status === 409) return reply(409, { error: "Confira se o e-mail já está cadastrado." });
      return error ? reply(500, { error: "Não foi possível salvar o cadastro." }) : reply(200, { ok: true });
    }
    return reply(400, { error: "Ação inválida." });
  } catch {
    return reply(500, { error: "Não foi possível concluir a ação." });
  }
});
