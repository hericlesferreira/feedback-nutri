"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Bell, Check, CheckCircle2, ClipboardCheck, Clock3, LayoutDashboard, LockKeyhole, LogOut, Mail, Menu, MessageCircle, Plus, Send, Settings, TrendingDown, Users, Weight, X } from "lucide-react";
import { changePassword, signIn, signOut, supabase } from "@/lib/supabase";
import { weeklyQuestions } from "@/lib/weekly-form";

type Role = "patient" | "admin";
type View = "checkin" | "evolution" | "overview" | "forms" | "feedback";
type Profile = { id: string; full_name: string; email: string; phone: string | null; role: Role; must_change_password: boolean; active: boolean };
type QuestionKind = "number" | "single_choice" | "scale" | "long_text";
type QuestionData = { id: string; title: string; help_text: string | null; kind: QuestionKind; required: boolean; position: number; config: Record<string, unknown> };
type FormData = { id: string; title: string; description: string | null; active: boolean; questions: QuestionData[] };
type AssignmentData = { id: string; week_start: string; due_at: string; status: "pending" | "completed" | "expired"; forms: FormData };

function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function formatDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(value)); }
function Brand() {
  return <div className="brand">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className="brandLogo" src="/logo-hericles.png" width={2000} height={500} alt="Nutri Hericles"/>
  </div>;
}

function Login({ onSuccess }: { onSuccess: (userId: string) => Promise<void> }) {
  const [email, setEmail] = useState(""), [phone, setPhone] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const result = await signIn(email.trim(), phone);
    if (result.error || !result.data?.user) { setError("E-mail ou senha temporária incorretos."); setBusy(false); return; }
    await onSuccess(result.data.user.id); setBusy(false);
  }
  return <main className="loginOnly">
    <form className="loginCard" aria-label="Login" onSubmit={submit}>
      <header className="loginIdentity"><Brand/><p>Acompanhamento semanal</p></header>
      <label>E-mail<div className="field"><Mail size={19} aria-hidden="true"/><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required/></div></label>
      <label>Senha<div className="field"><LockKeyhole size={19} aria-hidden="true"/><input type="password" autoComplete="current-password" value={phone} onChange={(event) => setPhone(event.target.value)} required/></div></label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary full" disabled={busy}>{busy ? "Entrando..." : "Entrar"}</button>
    </form>
  </main>;
}

function PasswordDialog({ profile, onDone, onClose }: { profile: Profile; onDone: () => void; onClose?: () => void }) {
  const [password, setPassword] = useState(""), [confirm, setConfirm] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (password.length < 8) return setError("Use pelo menos 8 caracteres."); if (password !== confirm) return setError("As senhas não coincidem.");
    setBusy(true); setError(""); const result = await changePassword(password);
    if (result.error || !supabase) { setError(result.error?.message ?? "Não foi possível alterar a senha."); setBusy(false); return; }
    const { error: profileError } = await supabase.from("profiles").update({ must_change_password: false, updated_at: new Date().toISOString() }).eq("id", profile.id);
    if (profileError) setError(profileError.message); else onDone(); setBusy(false);
  }
  return <div className="modalBackdrop"><form className="modalCard" onSubmit={submit}>{onClose && <button type="button" aria-label="Fechar" className="modalClose" disabled={busy} onClick={onClose}><X size={18}/></button>}<span className="miniMark"><LockKeyhole size={21}/></span><span className="eyebrow">Proteja seu acesso</span><h2>{onClose ? "Alterar senha" : "Crie sua senha pessoal"}</h2><p>{onClose ? "Use uma senha com pelo menos 8 caracteres." : "O telefone funciona apenas no primeiro acesso. Agora escolha uma senha que só você conhece."}</p><label>Nova senha<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required/></label><label>Confirmar senha<input type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required/></label>{error && <p className="error">{error}</p>}<button className="primary full" disabled={busy}>{busy ? "Salvando..." : "Salvar nova senha"}</button></form></div>;
}

function Shell({ profile, view, setView, logout, openPassword, children }: { profile: Profile; view: View; setView: (view: View) => void; logout: () => void; openPassword: () => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const nav = profile.role === "admin" ? [["overview", "Visão geral", LayoutDashboard], ["feedback", "Retorno feedback", MessageCircle], ["forms", "Formulários", ClipboardCheck]] : [["checkin", "Check-in semanal", ClipboardCheck], ["evolution", "Minha evolução", BarChart3]];
  return <div className="shell"><header className="mobileHeader"><Brand/><button className="iconButton swap" onClick={() => setOpen(!open)} aria-label="Menu"><Menu className={!open ? "shown" : "hidden"}/><X className={open ? "shown" : "hidden"}/></button></header><aside className={`sidebar ${open ? "open" : ""}`}><Brand/><nav><span>{profile.role === "admin" ? "GESTÃO" : "SEU ACOMPANHAMENTO"}</span>{nav.map(([id, label, Icon]) => <button key={String(id)} className={view === id ? "active" : ""} onClick={() => { setView(id as View); setOpen(false); }}><Icon size={20} strokeWidth={view === id ? 2.5 : 2}/>{String(label)}</button>)}</nav><div className="sideBottom"><button onClick={() => { openPassword(); setOpen(false); }}><Settings size={20}/>Alterar senha</button><button onClick={logout}><LogOut size={20}/>Sair</button><div className="profile"><i>{initials(profile.full_name)}</i><div><b>{profile.full_name}</b><small>{profile.role === "admin" ? "Administrador" : "Paciente"}</small></div></div></div></aside><section className="content">{children}</section></div>;
}

function PageTitle({ eyebrow, title, text, action }: { eyebrow: string; title: string; text: string; action?: React.ReactNode }) { return <header className="pageTitle"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>{action}</header>; }
function Question({ n, title, text, children }: { n: string; title: string; text: string; children: React.ReactNode }) { return <section className="question"><header><span>{n}</span><div><h3>{title}</h3><p>{text}</p></div></header>{children}</section>; }
function Loading() { return <div className="loading"><Activity/><p>Carregando seu acompanhamento...</p></div>; }

function PatientCheckin({ profile }: { profile: Profile }) {
  const [step, setStep] = useState(0);
  const [previousGoal, setPreviousGoal] = useState("");
  const [assignment, setAssignment] = useState<AssignmentData | null>(null), [answers, setAnswers] = useState<Record<string, unknown>>({}), [loading, setLoading] = useState(true), [sent, setSent] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!supabase) return setLoading(false); setLoading(true);
    const { data, error: queryError } = await supabase.from("assignments").select("id,week_start,due_at,status,forms(id,title,description,active,questions(id,title,help_text,kind,required,position,config))").eq("patient_id", profile.id).eq("status", "pending").order("week_start", { ascending: false }).limit(1).maybeSingle();
    if (queryError) setError(queryError.message);
    const row = data as unknown as AssignmentData | null;
    if (row?.forms?.questions) {
      row.forms.questions.sort((a, b) => a.position - b.position);
      const priorWeek = new Date(row.week_start + "T00:00:00Z");
      priorWeek.setUTCDate(priorWeek.getUTCDate() - 7);
      const { data: prior, error: goalError } = await supabase.from("responses")
        .select("assignments!inner(week_start),answers(value,questions(config))")
        .eq("patient_id", profile.id)
        .eq("assignments.week_start", priorWeek.toISOString().slice(0, 10))
        .order("submitted_at", { ascending: false }).limit(1).maybeSingle();
      if (goalError) setError("Não foi possível recuperar a meta da semana anterior.");
      const records = (prior?.answers ?? []) as unknown as Array<{ value: unknown; questions: { config: { key?: string } } | null }>;
      const goal = records.find(({ questions, value }) =>
        ["nextChange", "keep"].includes(questions?.config.key ?? "") &&
        typeof value === "string" && value.trim());
      setPreviousGoal(typeof goal?.value === "string" ? goal.value.trim() : "");
    }
    setAssignment(row);
    setLoading(false);
  }, [profile.id]);
  useEffect(() => {
    // The async loader synchronizes this view with the authenticated database session.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  const visibleQuestions: QuestionData[] = [];
  for (const question of assignment?.forms.questions ?? []) {
    const rules = question.config.when as { key: string; values: unknown[] }[] | undefined;
    if (!rules || rules.some(({ key, values }) => {
      if (key === "previousGoal") return values.includes(Boolean(previousGoal));
      const parent = visibleQuestions.find((item) => item.config.key === key);
      const value = parent ? answers[parent.id] : undefined;
      if (values.length === 0) return typeof value === "string" && Boolean(value.trim());
      return Array.isArray(value) ? value.some((entry) => values.includes(entry)) : values.includes(value);
    })) visibleQuestions.push(question.config.key === "goalReview"
      ? { ...question, help_text: `Sua meta da semana passada: ${previousGoal}` }
      : question);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!supabase || !assignment) return; setError("");
    const payload = visibleQuestions.filter(({ id }) => {
      const value = answers[id];
      return value !== undefined && (Array.isArray(value) ? value.length > 0 : String(value).trim() !== "");
    }).map((question) => ({ question_id: question.id, value: answers[question.id] }));
    if (visibleQuestions.some((question) => question.required && !payload.some((answer) => answer.question_id === question.id))) {
      setError("Responda às perguntas obrigatórias antes de enviar.");
      return;
    }
    setBusy(true);
    const controller = new AbortController();
    let deadline: ReturnType<typeof setTimeout> | undefined;
    try {
      const request = supabase.functions.invoke("submit-checkin", {
        body: { assignmentId: assignment.id, answers: payload },
        signal: controller.signal,
      });
      const timeout = new Promise<never>((_, reject) => {
        deadline = setTimeout(() => {
          controller.abort();
          reject(new Error("Tempo de envio esgotado"));
        }, 15000);
      });
      const { error: invokeError } = await Promise.race([request, timeout]);
      if (invokeError) throw invokeError;
      setSent(true);
    } catch {
      setError("Não foi possível confirmar o envio. Suas respostas continuam nesta tela. Verifique a conexão e tente novamente.");
    } finally {
      clearTimeout(deadline);
      setBusy(false);
    }
  }
  if (loading) return <Loading/>;
  if (sent) return <div className="success"><span><Check size={34}/></span><i className="eyebrow">Check-in concluído</i><h1>Obrigado por compartilhar sua semana, {profile.full_name.split(" ")[0]}.</h1><p>Suas respostas já estão disponíveis para eu avaliar.</p></div>;
  if (!assignment) return <div className="success"><span><CheckCircle2 size={34}/></span><i className="eyebrow">Tudo em dia</i><h1>Você não tem check-ins pendentes.</h1><p>Quando o próximo formulário for liberado, ele aparecerá aqui automaticamente.</p></div>;
  const screens: QuestionData[][] = [];
  const screenByKey = new Map<string, QuestionData[]>();
  for (const question of visibleQuestions) {
    const rules = question.config.when as { key: string }[] | undefined;
    const screen = rules?.map(({ key }) => screenByKey.get(key)).filter(Boolean).at(-1);
    const group = screen ?? [];
    if (!screen) screens.push(group);
    group.push(question);
    if (typeof question.config.key === "string") screenByKey.set(question.config.key, group);
  }
  const current = screens[step] ?? [];
  function move(destination: number) {
    setError("");
    setStep(destination);
    window.scrollTo(0, 0);
  }

  return <div className="page narrow">
    <p className="eyebrow checkinStep">Pergunta {step + 1} de {screens.length}</p>
    <progress className="checkinProgress" aria-label="Progresso do check-in" value={step + 1} max={screens.length}/>
    <form className="formCard" onSubmit={(event) => {
      event.preventDefault();
      if (current.some(({ id, required }) => required && (Array.isArray(answers[id]) ? !(answers[id] as unknown[]).length : !String(answers[id] ?? "").trim()))) {
        setError("Responda à pergunta para continuar.");
        return;
      }
      if (step < screens.length - 1) move(step + 1);
      else void submit(event);
    }}>
      {current.map((question) => <DynamicQuestion key={question.id} question={question} number={step + 1} value={answers[question.id]}
        onChange={(value) => setAnswers((previous) => ({ ...previous, [question.id]: value }))}/>)}
      {error && <p className="formError" role="alert">{error}</p>}
      <footer className="formFooter">
        {step > 0 && <button type="button" className="secondary" disabled={busy} onClick={() => move(step - 1)}>Voltar</button>}
        <button className="primary" disabled={busy || !current.length}>{busy ? "Enviando..." : step < screens.length - 1 ? "Continuar" : "Enviar check-in"}</button>
      </footer>
    </form>
  </div>;
}

const optionIcons: Record<string, string[]> = {
  goalReview: ["✅", "🟡", "⏸️", "🔄"],
  adherence: ["✅", "🟡", "🧩", "⏸️"],
  barrier: ["⏰", "🍽️", "⚖️", "🧺", "🍴", "🍕", "💭", "🥗", "✍️"],
  situations: ["➖", "📍", "📌", "🌀"],
  reaction: ["🔁", "↩️", "🧩", "💭", "🌊", "✍️"],
  satisfaction: ["😌", "🍽️", "🍪", "⚖️", "🔁", "✅"],
  training: ["💪", "🟡", "⏸️", "📅", "🩹"],
  trainingBarrier: ["⏰", "😴", "🔋", "🔄", "🩹", "🌡️", "📍", "✍️"],
  sleep: ["😴", "🌙", "🥱"],
  energy: ["⚡", "〰️", "🪫"],
  stress: ["😌", "😐", "😣"],
  impact: ["✔️", "➖", "❔"],
  support: ["🗓️", "🍽️", "🧭", "💪", "🌙", "🥗", "✅", "✍️", "❔"],
};

function optionEmoji(question: QuestionData, index: number) {
  return optionIcons[String(question.config.key)]?.[index] ?? ["🔹", "🔸", "🔺", "🔶"][index % 4];
}

function DynamicQuestion({ question, number, value, onChange }: { question: QuestionData; number: number; value: unknown; onChange: (value: unknown) => void }) {
  const config = question.config ?? {}, help = question.help_text ?? (question.required ? "Resposta obrigatória." : "Resposta opcional.");
  if (question.kind === "scale" && Number(config.min) === 0 && Number(config.max) === 10) {
    return <Question n={String(number)} title={question.title} text={help}>
      <fieldset className="scoreScale">
        <legend className="srOnly">{question.title}</legend>
        <div className="scoreOptions">
          {Array.from({ length: 11 }, (_, score) => <label key={score}>
            <input className="srOnly" type="radio" name={question.id} value={score}
              checked={value === score} required={question.required} onChange={() => onChange(score)}/>
            <span>{score}</span>
          </label>)}
        </div>
        <div className="scoreLabels">
          <span>0 · {String(config.min_label ?? "Mínimo")}</span>
          <span>10 · {String(config.max_label ?? "Máximo")}</span>
        </div>
      </fieldset>
    </Question>;
  }
  if (config.multiple && Array.isArray(config.options)) {
    const selected = Array.isArray(value) ? value : [];
    return <Question n={String(number)} title={question.title} text="Marque todas as opções que se aplicam.">
      <div className="checkinOptions">{config.options.map(String).map((option, index) => <label key={option}>
        <input type="checkbox" checked={selected.includes(option)} onChange={(event) =>
          onChange(event.target.checked ? [...selected, option] : selected.filter((item) => item !== option))}/>
        <span aria-hidden="true">{optionEmoji(question, index)}</span>{option}
      </label>)}</div>
    </Question>;
  }
  if (question.kind === "number") return <Question n={String(number)} title={question.title} text={help}><div className="weightField"><input type="number" step={String(config.step ?? "0.1")} inputMode="decimal" value={String(value ?? "")} onChange={(event) => onChange(event.target.value === "" ? undefined : event.target.valueAsNumber)} required={question.required}/><span>{String(config.unit ?? "")}</span></div></Question>;
  if (question.kind === "single_choice") { const options = Array.isArray(config.options) ? config.options.map(String) : []; return <Question n={String(number)} title={question.title} text={help}><div className="feelings">{options.map((option, index) => <button type="button" key={option} className={value === option ? "selected" : ""} onClick={() => onChange(option)}><em aria-hidden="true">{optionEmoji(question, index)}</em>{option}<CheckCircle2 size={17}/></button>)}</div>{question.required && <input className="srOnly" required value={String(value ?? "")} onChange={() => undefined}/>}</Question>; }
  if (question.kind === "scale") { const min = Number(config.min ?? 1), max = Number(config.max ?? 10), current = Number(value ?? config.default ?? min); return <Question n={String(number)} title={question.title} text={help}><div className="range"><input type="range" min={min} max={max} value={current} onChange={(event) => onChange(Number(event.target.value))} style={{ "--p": `${((current - min) / (max - min)) * 100}%` } as React.CSSProperties}/><output>{current}{String(config.suffix ?? "")}</output></div><div className="rangeLabels"><span>{String(config.min_label ?? "Pouco")}</span><span>{String(config.max_label ?? "Muito")}</span></div></Question>; }
  return <Question n={String(number)} title={question.title} text={help}><textarea value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} maxLength={500} required={question.required} placeholder="Escreva aqui..."/><small className="count">{String(value ?? "").length}/500</small></Question>;
}

function Metric({ icon, label, value, unit, note }: { icon: React.ReactNode; label: string; value: string; unit: string; note: string }) { return <article className="metric"><span>{icon}</span><small>{label}</small><b>{value} <i>{unit}</i></b><p><TrendingDown size={15}/>{note}</p></article>; }
function Evolution({ profile }: { profile: Profile }) {
  const [weights, setWeights] = useState<{ date: string; value: number }[]>([]), [loading, setLoading] = useState(true);
  useEffect(() => { async function load() { if (!supabase) return setLoading(false); const { data } = await supabase.from("responses").select("submitted_at,answers(value,questions(title,kind,config))").eq("patient_id", profile.id).order("submitted_at", { ascending: true }); const result: { date: string; value: number }[] = []; for (const response of data ?? []) for (const answer of (response.answers as unknown as Array<{ value: unknown; questions: { title: string; kind: string; config: Record<string, unknown> } }> ?? [])) { const question = answer.questions; if (question?.config?.metric === "weight" || /peso/i.test(question?.title ?? "")) result.push({ date: response.submitted_at, value: Number(answer.value) }); } setWeights(result.filter((point) => Number.isFinite(point.value)).slice(-8)); setLoading(false); } void load(); }, [profile.id]);
  if (loading) return <Loading/>; const values = weights.map((point) => point.value), min = values.length ? Math.min(...values) : 0, max = values.length ? Math.max(...values) : 1, range = Math.max(max - min, 1); const points = weights.map((point, index) => `${45 + index * (510 / Math.max(weights.length - 1, 1))},${40 + ((max - point.value) / range) * 145}`).join(" "), change = values.length > 1 ? values.at(-1)! - values[0] : 0;
  return <div className="page"><PageTitle eyebrow="Minha jornada" title="Sua evolução" text="O progresso fica mais claro quando olhamos para o caminho completo."/><div className="metrics"><Metric icon={<Weight/>} label="Peso atual" value={values.length ? values.at(-1)!.toFixed(1).replace(".", ",") : "—"} unit="kg" note={values.length > 1 ? `${Math.abs(change).toFixed(1).replace(".", ",")} kg no período` : "Aguardando respostas"}/><Metric icon={<ClipboardCheck/>} label="Registros de peso" value={String(values.length)} unit="semanas" note="Histórico protegido"/><Metric icon={<Activity/>} label="Tendência" value={change < 0 ? "Redução" : change > 0 ? "Aumento" : "Estável"} unit="" note="Baseada nos check-ins"/></div><article className="chartCard"><header><div><span>EVOLUÇÃO DO PESO</span><h2>Consistência que aparece</h2></div><p><i/>Peso em kg</p></header>{weights.length ? <div className="chart"><svg viewBox="0 0 600 245" role="img" aria-label="Gráfico de evolução do peso">{[45, 95, 145, 195].map((y) => <line key={y} x1="45" x2="555" y1={y} y2={y}/>)}<polyline points={points}/>{weights.map((point, index) => { const x = 45 + index * (510 / Math.max(weights.length - 1, 1)), y = 40 + ((max - point.value) / range) * 145; return <g key={`${point.date}-${index}`}><circle cx={x} cy={y} r="5"/><text x={x} y="220" textAnchor="middle">{formatDate(point.date)}</text><text className="valueLabel" x={x} y={y - 13} textAnchor="middle">{point.value.toFixed(1)}</text></g>; })}</svg></div> : <div className="emptyState">O gráfico aparecerá depois do primeiro check-in com peso.</div>}</article></div>;
}

function Stat({ label, value, note, icon }: { label: string; value: string; note: string; icon: React.ReactNode }) { return <article><header><span>{label}</span><i>{icon}</i></header><b>{value}</b><p>{note}</p></article>; }
type ReviewedResponse = {
  id: string;
  feedback_at: string | null;
  submitted_at: string;
  assignments: { forms: { title: string } | null } | null;
  answers: { value: unknown; questions: { title: string; position: number } | null }[];
};

function ResponseReview() {
  const [patientId, setPatientId] = useState("");
  const [saving, setSaving] = useState(false);
  const [patients, setPatients] = useState<Profile[]>([]);
  const [responses, setResponses] = useState<ReviewedResponse[]>([]);
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase?.from("profiles").select("*").eq("role", "patient").order("full_name")
      .then(({ data, error }) => {
        if (error) setStatus("Não foi possível carregar os pacientes.");
        else setPatients(data as Profile[]);
      });
  }, []);

  async function findResponses(patientId: string) {
    setPatientId(patientId);
    setResponses([]);
    setSelected("");
    setStatus("");
    if (!supabase || !patientId) return;
    setBusy(true);
    const { data, error } = await supabase.from("responses")
      .select("id,submitted_at,feedback_at,assignments(forms(title)),answers(value,questions(title,position))")
      .eq("patient_id", patientId).order("submitted_at", { ascending: false });
    if (error) setStatus("Não foi possível carregar as respostas.");
    else {
      const rows = data as unknown as ReviewedResponse[];
      setResponses(rows);
      setSelected(rows[0]?.id ?? "");
      if (!rows.length) setStatus("Esse paciente ainda não respondeu a um check-in.");
    }
    setBusy(false);
  }

  const response = responses.find((row) => row.id === selected);
  const patientIndex = patients.findIndex((patient) => patient.id === patientId);
  const orderedAnswers = [...(response?.answers ?? [])].sort((a, b) =>
    (a.questions?.position ?? 0) - (b.questions?.position ?? 0));
  const label = (row: ReviewedResponse) =>
    `${row.assignments?.forms?.title ?? "Check-in"} · ${new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo",
    }).format(new Date(row.submitted_at))}`;
  const answerText = response ? [label(response), "", ...orderedAnswers
    .map(({ questions, value }) => `${questions?.title ?? "Pergunta"}: ${String(value ?? "Sem resposta")}`)].join("\n") : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(answerText);
      setStatus("Respostas copiadas.");
    } catch {
      setStatus("Não foi possível copiar automaticamente. Abra “Texto para copiar” e selecione o texto.");
    }
  }

  async function markFeedback(done: boolean) {
    if (!response || !supabase) return;
    setSaving(true);
    const feedbackAt = done ? new Date().toISOString() : null;
    const { error } = await supabase.from("responses").update({ feedback_at: feedbackAt })
      .eq("id", response.id).select("id").single();
    if (error) setStatus("Não foi possível salvar o retorno. Tente novamente.");
    else {
      setResponses((rows) => rows.map((row) => row.id === response.id ? { ...row, feedback_at: feedbackAt } : row));
      setStatus(done ? "Retorno marcado como feito." : "Retorno desmarcado.");
    }
    setSaving(false);
  }

  return <section className="page narrow responseReview" aria-labelledby="response-review-title">
    <div className="formCard">
      <h2 id="response-review-title">Retorno feedback</h2>
      <label>Paciente<select value={patientId} disabled={busy || saving} onChange={(event) => void findResponses(event.target.value)}>
        <option value="">Selecione um paciente</option>
        {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.full_name} · {patient.email}</option>)}
      </select></label>
      <div className="reviewNavigation">
        <button type="button" className="secondary" disabled={busy || saving || patientIndex <= 0} onClick={() => void findResponses(patients[patientIndex - 1].id)}>Anterior</button>
        <span>{patientIndex < 0 ? patients.length + " pacientes" : `${patientIndex + 1} de ${patients.length}`}</span>
        <button type="button" className="secondary" disabled={busy || saving || patientIndex + 1 >= patients.length} onClick={() => void findResponses(patients[patientIndex + 1].id)}>{patientIndex < 0 ? "Começar" : "Próximo"}</button>
      </div>
      {response && <>
        <label>Check-in<select disabled={saving} value={selected} onChange={(event) => { setSelected(event.target.value); setStatus(""); }}>
          {responses.map((row) => <option key={row.id} value={row.id}>{label(row)} · {row.feedback_at ? "Retorno feito" : "Retorno pendente"}</option>)}
        </select></label>
        <label><input type="checkbox" checked={Boolean(response.feedback_at)} disabled={saving} onChange={(event) => void markFeedback(event.target.checked)}/> Retorno feito</label>
        <dl className="reviewAnswers">{orderedAnswers.map(({ questions, value }, index) => <div key={index}>
          <dt>{questions?.title ?? "Pergunta"}</dt>
          <dd>{Array.isArray(value) ? value.join(" · ") : String(value ?? "Sem resposta")}</dd>
        </div>)}</dl>
        <button type="button" className="primary" onClick={() => void copy()}>Copiar respostas</button>
        <details><summary>Texto para copiar</summary><textarea aria-label="Respostas do check-in" readOnly value={answerText}/></details>
      </>}
      <p role="status">{busy ? "Carregando respostas..." : status}</p>
    </div>
  </section>;
}

function AdminOverview({ goForms }: { goForms: () => void }) {
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<Profile[]>([]), [assignments, setAssignments] = useState<Array<{ patient_id: string; status: string; completed_at: string | null }>>([]), [showPatient, setShowPatient] = useState(false), [refresh, setRefresh] = useState(0);
  useEffect(() => { async function load() { if (!supabase) return; const [{ data: profiles }, { data: weekly }] = await Promise.all([supabase.from("profiles").select("id,full_name,email,phone,role,must_change_password,active").eq("role", "patient").order("full_name"), supabase.from("assignments").select("patient_id,status,completed_at").order("created_at", { ascending: false })]); setPatients((profiles ?? []) as Profile[]); const latest = new Map<string, { patient_id: string; status: string; completed_at: string | null }>(); for (const item of weekly ?? []) if (!latest.has(item.patient_id)) latest.set(item.patient_id, item); setAssignments([...latest.values()]); } void load(); }, [refresh]);
  const completed = assignments.filter((item) => item.status === "completed").length, rate = assignments.length ? Math.round((completed / assignments.length) * 100) : 0;
  return <div className="page admin"><header className="adminTop"><div><span>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(new Date())}</span><h1>Bom dia, Hericles</h1></div><div><button className="primary" onClick={() => setShowPatient(true)}><Plus size={18}/>Novo paciente</button></div></header><section className="adminHero"><div><span className="eyebrow light">Check-in mais recente</span><h2>{completed} de {assignments.length} pacientes já responderam</h2><p>O painel passa a refletir os envios reais assim que os formulários são liberados.</p><button onClick={goForms}><Send size={17}/>Gerenciar envio</button></div><div className="circle"><b>{rate}%</b><small>respondido</small></div></section><div className="stats"><Stat label="Pacientes ativos" value={String(patients.filter((patient) => patient.active).length)} note="cadastrados" icon={<Users/>}/><Stat label="Respostas recentes" value={String(completed)} note={`de ${assignments.length} envios`} icon={<ClipboardCheck/>}/><Stat label="Taxa de resposta" value={`${rate}%`} note="último formulário" icon={<BarChart3/>}/><Stat label="Pendentes" value={String(Math.max(assignments.length - completed, 0))} note="aguardando check-in" icon={<Bell/>}/></div><article className="tableCard"><header><div><h2>Pacientes</h2><p>Cadastros e situação do check-in mais recente.</p></div><label><input aria-label="Buscar paciente" placeholder="Buscar paciente" value={search} onChange={(event) => setSearch(event.target.value)}/></label></header><div className="table labels"><span>Paciente</span><span>Status</span><span>Contato</span><span/></div>{patients.filter(({ full_name, email }) => `${full_name} ${email}`.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().includes(search.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase())).map((patient, index) => { const assignment = assignments.find((item) => item.patient_id === patient.id), done = assignment?.status === "completed"; return <div className="table" key={patient.id}><div className="patient"><i className={`tone${index % 5}`}>{initials(patient.full_name)}</i><p><b>{patient.full_name}</b><small>{patient.email}</small></p></div><span className={`pill ${done ? "done" : "pending"}`}>{done && <Check size={13}/>} {done ? "Respondido" : assignment ? "Pendente" : "Sem envio"}</span><span className="time">{patient.phone ?? "—"}</span></div>; })}</article>{showPatient && <PatientDialog onClose={() => setShowPatient(false)} onCreated={() => { setShowPatient(false); setRefresh((value) => value + 1); }}/>}</div>;
}

function PatientDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [fullName, setFullName] = useState(""), [email, setEmail] = useState(""), [phone, setPhone] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(event: React.FormEvent) { event.preventDefault(); if (!supabase) return; setBusy(true); setError(""); const { error: invokeError } = await supabase.functions.invoke("admin-create-patient", { body: { fullName, email, phone: phone.replace(/\D/g, "") } }); if (invokeError) setError(invokeError.message); else onCreated(); setBusy(false); }
  return <div className="modalBackdrop"><form className="modalCard" onSubmit={submit}><button type="button" className="modalClose" onClick={onClose}><X/></button><span className="eyebrow">Novo paciente</span><h2>Criar acesso</h2><p>O telefone com DDD será a senha temporária do primeiro login.</p><label>Nome completo<input value={fullName} onChange={(event) => setFullName(event.target.value)} required/></label><label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required/></label><label>Telefone com DDD<input inputMode="numeric" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))} required/></label>{error && <p className="error">{error}</p>}<button className="primary full" disabled={busy}>{busy ? "Criando..." : "Cadastrar paciente"}</button></form></div>;
}

function Forms({ profile }: { profile: Profile }) {
  const [forms, setForms] = useState<FormData[]>([]), [patients, setPatients] = useState<Profile[]>([]), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const load = useCallback(async () => { if (!supabase) return; const [{ data: formRows }, { data: patientRows }] = await Promise.all([supabase.from("forms").select("id,title,description,active,questions(id,title,help_text,kind,required,position,config)").order("created_at", { ascending: false }), supabase.from("profiles").select("id,full_name,email,phone,role,must_change_password,active").eq("role", "patient").eq("active", true)]); const normalized = (formRows ?? []) as unknown as FormData[]; normalized.forEach((form) => form.questions.sort((a, b) => a.position - b.position)); setForms(normalized); setPatients((patientRows ?? []) as Profile[]); }, []);
  useEffect(() => {
    // The async loader synchronizes the form builder with Supabase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  async function createStarter() {
    if (!supabase) return; setBusy(true); setMessage(""); const { data: form, error } = await supabase.from("forms").insert({ title: "Como foi a sua semana?", description: "Leva cerca de 2 minutos. Responda com tranquilidade e sinceridade.", created_by: profile.id }).select("id").single(); if (error || !form) { setMessage(error?.message ?? "Não foi possível criar."); setBusy(false); return; }
    const questions = weeklyQuestions;
    const { error: questionError } = await supabase.from("questions").insert(questions.map((question) => ({ ...question, form_id: form.id }))); setMessage(questionError ? questionError.message : "Formulário criado com sucesso."); await load(); setBusy(false);
  }
  async function sendNow(formId: string) { if (!supabase || !patients.length) return setMessage("Cadastre pelo menos um paciente ativo antes do envio."); setBusy(true); setMessage(""); const now = new Date(), day = now.getDay(), monday = new Date(now); monday.setDate(now.getDate() - ((day + 6) % 7)); monday.setHours(0, 0, 0, 0); const due = new Date(monday); due.setDate(monday.getDate() + 6); due.setHours(23, 59, 59, 999); const rows = patients.map((patient) => ({ form_id: formId, patient_id: patient.id, week_start: monday.toISOString().slice(0, 10), due_at: due.toISOString(), sent_at: new Date().toISOString() })); const { error } = await supabase.from("assignments").upsert(rows, { onConflict: "patient_id,form_id,week_start", ignoreDuplicates: true }); setMessage(error ? error.message : `Formulário liberado para ${patients.length} paciente${patients.length === 1 ? "" : "s"}.`); setBusy(false); }
  const active = forms[0];
  return <div className="page"><PageTitle eyebrow="Gestão de formulários" title="Check-in semanal" text="Crie as perguntas e libere o formulário para seus pacientes." action={active ? <button className="primary" disabled={busy} onClick={() => sendNow(active.id)}><Send size={18}/>Enviar agora</button> : <button className="primary" disabled={busy} onClick={createStarter}><Plus size={18}/>Criar formulário inicial</button>}/>{message && <div className="notice"><CheckCircle2/>{message}</div>}<div className="builder">{active ? <article className="formBuilder"><header><div><span>FORMULÁRIO ATIVO</span><h2>{active.title}</h2></div><i className="pill done"><Check size={13}/>Ativo</i></header>{active.questions.map((question, index) => <div className="builderRow" key={question.id}><span>{index + 1}</span><p><b>{question.title}</b><small>{question.kind === "number" ? "Resposta numérica" : question.kind === "single_choice" ? "Escolha única" : question.kind === "scale" ? "Escala" : "Texto longo"}{question.required ? " · obrigatória" : " · opcional"}</small></p></div>)}</article> : <article className="formBuilder emptyBuilder"><ClipboardCheck/><h2>Nenhum formulário criado</h2><p>Use o botão acima para criar o modelo inicial do check-in semanal.</p></article>}<aside className="schedule"><span><Clock3/></span><h2>Envio semanal</h2><p>O botão “Enviar agora” libera o formulário da semana para todos os pacientes ativos.</p><dl><div><dt>Dia recomendado</dt><dd>Sexta-feira</dd></div><div><dt>Pacientes ativos</dt><dd>{patients.length}</dd></div></dl><small>A automação por e-mail ou WhatsApp pode ser conectada em uma próxima etapa.</small></aside></div></div>;
}

export default function Home() {
  const [editingPassword, setEditingPassword] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null), [view, setView] = useState<View>("checkin"), [booting, setBooting] = useState(true), [error, setError] = useState("");
  const hydrate = useCallback(async (userId: string) => { if (!supabase) return; const { data, error: profileError } = await supabase.from("profiles").select("id,full_name,email,phone,role,must_change_password,active").eq("id", userId).single(); if (profileError || !data) { setError("Seu perfil ainda não foi configurado."); return; } const next = data as Profile; setProfile(next); setView(next.role === "admin" ? "overview" : "checkin"); }, []);
  useEffect(() => { async function start() { if (!supabase) { setBooting(false); return; } const { data } = await supabase.auth.getSession(); if (data.session?.user) await hydrate(data.session.user.id); setBooting(false); } void start(); }, [hydrate]);
  async function logout() { await signOut(); setProfile(null); setError(""); }
  const content = useMemo(() => { if (!profile) return null; if (view === "evolution") return <Evolution profile={profile}/>; if (profile.role === "admin") return view === "forms" ? <Forms profile={profile}/> : view === "feedback" ? <ResponseReview/> : <AdminOverview goForms={() => setView("forms")}/>; return <PatientCheckin profile={profile}/>; }, [profile, view]);
  if (booting) return <Loading/>; if (!profile) return <><Login onSuccess={hydrate}/>{error && <div className="globalError">{error}</div>}</>; return <Shell profile={profile} view={view} setView={setView} logout={logout} openPassword={() => setEditingPassword(true)}>{content}{(profile.must_change_password || editingPassword) && <PasswordDialog profile={profile} onClose={profile.must_change_password ? undefined : () => setEditingPassword(false)} onDone={() => { setProfile({ ...profile, must_change_password: false }); setEditingPassword(false); }}/>}</Shell>;
}
