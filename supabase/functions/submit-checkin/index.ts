import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) {
      return Response.json({ error: "Não autenticado" }, { status: 401, headers: cors });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const publishable = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const caller = createClient(url, publishable, {
      global: { headers: { Authorization: authorization } },
    });
    const service = createClient(url, serviceRole);
    const { data: { user }, error: userError } = await caller.auth.getUser();

    if (userError || !user) {
      return Response.json({ error: "Sessão inválida" }, { status: 401, headers: cors });
    }

    const { data: profile, error: profileError } = await caller.from("profiles").select("active,must_change_password").eq("id", user.id).single();
    if (profileError || !profile?.active || profile.must_change_password) {
      return Response.json({ error: "Acesso indisponível. Conclua a ativação da conta." }, { status: 403, headers: cors });
    }
    const { assignmentId, answers } = await request.json();
    if (!assignmentId || !Array.isArray(answers)) {
      return Response.json({ error: "Respostas inválidas" }, { status: 400, headers: cors });
    }

    const { data: assignment, error: assignmentError } = await caller.from("assignments")
      .select("id").eq("id", assignmentId).eq("patient_id", user.id).maybeSingle();
    if (assignmentError || !assignment) {
      return Response.json({ error: "Check-in indisponível para esta sessão." }, { status: 403, headers: cors });
    }

    const { data, error } = await service.rpc("submit_checkin_as_service", {
      p_user_id: user.id,
      p_assignment_id: assignmentId,
      p_answers: answers,
    });

    if (error) throw error;
    return Response.json({ responseId: data }, { status: 201, headers: cors });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 500, headers: cors },
    );
  }
});
