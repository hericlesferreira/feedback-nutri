import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = request.headers.get("Authorization");
    if (!auth) return Response.json({ error: "Não autenticado" }, { status: 401, headers: cors });

    const url = Deno.env.get("SUPABASE_URL")!;
    const publishable = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const caller = createClient(url, publishable, { global: { headers: { Authorization: auth } } });
    const admin = createClient(url, serviceRole);
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return Response.json({ error: "Sessão inválida" }, { status: 401, headers: cors });

    const { data: profile } = await admin.from("profiles").select("role, active").eq("id", user.id).single();
    if (profile?.role !== "admin" || !profile.active) return Response.json({ error: "Sem permissão" }, { status: 403, headers: cors });

    const { email, phone, fullName } = await request.json();
    if (!email || !phone || !fullName) return Response.json({ error: "Dados obrigatórios ausentes" }, { status: 400, headers: cors });
    const temporaryPassword = String(phone).replace(/\D/g, "");
    if (temporaryPassword.length < 10) return Response.json({ error: "Telefone inválido" }, { status: 400, headers: cors });

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone, must_change_password: true },
    });
    if (error) throw error;
    return Response.json({ id: data.user.id, email: data.user.email }, { status: 201, headers: cors });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Erro inesperado" }, { status: 500, headers: cors });
  }
});

