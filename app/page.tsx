"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Bell, CalendarDays, Check, CheckCircle2, ChevronDown, ClipboardCheck, Clock3, LayoutDashboard, LockKeyhole, LogOut, Mail, Menu, MessageCircle, MoreHorizontal, Plus, Search, Send, Settings, Sparkles, TrendingDown, Users, Weight, X } from "lucide-react";
import { isSupabaseConfigured, signIn, signOut } from "@/lib/supabase";

type Role = "patient" | "admin";
type View = "checkin" | "evolution" | "overview" | "forms";

const weights = [84.2, 83.6, 82.9, 82.4, 81.8, 81.2];
const weekLabels = ["16 out", "23 out", "30 out", "06 nov", "13 nov", "20 nov"];
const patients = [
  ["MS", "Mariana Souza", "mariana@email.com", "Respondido", "Hoje, 08:42"],
  ["LC", "Lucas Costa", "lucas@email.com", "Pendente", "Enviado há 2h"],
  ["AF", "Ana Ferreira", "ana@email.com", "Respondido", "Hoje, 07:18"],
  ["RP", "Rafael Pereira", "rafael@email.com", "Pendente", "Enviado há 2h"],
  ["CM", "Carla Martins", "carla@email.com", "Respondido", "Ontem, 21:06"],
];

function Brand() {
  return <div className="brand"><span className="brandMark"><Activity size={21} strokeWidth={2.5}/></span><div><b>Feedback</b><small>por Nutri Hericles</small></div></div>;
}

function Login({ onLogin }: { onLogin: (role: Role) => void }) {
  const [email, setEmail] = useState("mariana@email.com");
  const [phone, setPhone] = useState("47999998888");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const result = await signIn(email, phone);
    if (result.error) { setError("E-mail ou senha temporária incorretos."); setBusy(false); return; }
    onLogin(email.toLowerCase().includes("admin") ? "admin" : "patient");
  }

  return <main className="loginPage">
    <section className="loginStory">
      <Brand/>
      <div className="storyCopy">
        <span className="eyebrow light"><Sparkles size={16}/> Acompanhamento próximo, toda semana</span>
        <h1>Seu progresso merece ser percebido.</h1>
        <p>Responda seu check-in em poucos minutos e acompanhe, junto com seu nutricionista, cada pequena evolução.</p>
        <div className="proof"><div><i>MS</i><i>AF</i><i>LC</i></div><p><b>Mais clareza no processo.</b><br/>Menos ansiedade com o resultado.</p></div>
      </div>
      <p className="privacy"><LockKeyhole size={16}/> Suas respostas são privadas e protegidas.</p>
    </section>
    <section className="loginPanel">
      <div className="mobileBrand"><Brand/></div>
      <form className="loginCard" onSubmit={submit}>
        <span className="miniMark"><Activity size={21}/></span>
        <h2>Que bom ter você aqui</h2><p>Use os dados cadastrados pelo seu nutricionista.</p>
        <label>E-mail<div className="field"><Mail size={19}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div></label>
        <label>Telefone <small>— sua senha inicial</small><div className="field"><MessageCircle size={19}/><input inputMode="numeric" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,""))} required/></div></label>
        {error && <p className="error">{error}</p>}
        <button className="primary full" disabled={busy}>{busy ? "Entrando..." : "Entrar na plataforma"}</button>
        <p className="hint">Primeiro acesso? Use seu telefone com DDD, somente números.</p>
        <button type="button" className="demoLink" onClick={()=>onLogin("admin")}>Visualizar demonstração do administrador</button>
        {!isSupabaseConfigured && <span className="demoBadge">Modo demonstração</span>}
      </form>
    </section>
  </main>;
}

function Shell({ role, view, setView, logout, children }: { role: Role; view: View; setView: (v: View)=>void; logout: ()=>void; children: React.ReactNode }) {
  const [open,setOpen]=useState(false);
  const nav = role === "admin" ? [["overview","Visão geral",LayoutDashboard],["forms","Formulários",ClipboardCheck],["evolution","Evolução",BarChart3]] : [["checkin","Check-in semanal",ClipboardCheck],["evolution","Minha evolução",BarChart3]];
  return <div className="shell">
    <header className="mobileHeader"><Brand/><button className="iconButton swap" onClick={()=>setOpen(!open)} aria-label="Menu"><Menu className={!open?"shown":"hidden"}/><X className={open?"shown":"hidden"}/></button></header>
    <aside className={`sidebar ${open?"open":""}`}><Brand/><nav><span>{role === "admin" ? "GESTÃO" : "SEU ACOMPANHAMENTO"}</span>{nav.map(([id,label,Icon])=><button key={String(id)} className={view===id?"active":""} onClick={()=>{setView(id as View);setOpen(false)}}><Icon size={20} strokeWidth={view===id?2.5:2}/>{String(label)}</button>)}{role==="admin"&&<button><Users size={20}/>Pacientes</button>}</nav><div className="sideBottom"><button><Settings size={20}/>Configurações</button><button onClick={logout}><LogOut size={20}/>Sair</button><div className="profile"><i>{role==="admin"?"HF":"MS"}</i><div><b>{role==="admin"?"Hericles Ferreira":"Mariana Souza"}</b><small>{role==="admin"?"Administrador":"Paciente"}</small></div><MoreHorizontal size={18}/></div></div></aside>
    <section className="content">{children}</section>
  </div>;
}

function PageTitle({ eyebrow,title,text,action }: { eyebrow:string;title:string;text:string;action?:React.ReactNode }) {
  return <header className="pageTitle"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>{action}</header>;
}

function Question({ n,title,text,children }: { n:string;title:string;text:string;children:React.ReactNode }) {
  return <section className="question"><header><span>{n}</span><div><h3>{title}</h3><p>{text}</p></div></header>{children}</section>;
}

function Scale({ n,title,value,onChange,end,suffix="" }: { n:string;title:string;value:number;onChange:(v:number)=>void;end:string;suffix?:string }) {
  return <Question n={n} title={title} text="Arraste o controle para indicar sua resposta."><div className="range"><input type="range" min="1" max="10" value={value} onChange={e=>onChange(Number(e.target.value))} style={{"--p":`${(value-1)/9*100}%`} as React.CSSProperties}/><output>{value}{suffix}</output></div><div className="rangeLabels"><span>Pouco</span><span>{end}</span></div></Question>;
}

function Checkin({ sent,onSend }: { sent:boolean;onSend:()=>void }) {
  const [feeling,setFeeling]=useState("Bem"), [adherence,setAdherence]=useState(8), [sleep,setSleep]=useState(7), [notes,setNotes]=useState("");
  if(sent) return <div className="success"><span><Check size={34}/></span><i className="eyebrow">Check-in concluído</i><h1>Obrigado por compartilhar sua semana, Mariana.</h1><p>Suas respostas já estão disponíveis para o Hericles. Você pode acompanhar sua evolução enquanto aguarda o próximo retorno.</p><div><CalendarDays size={22}/><p>Próximo check-in<b>Sexta-feira, 27 de novembro</b></p></div></div>;
  return <div className="page narrow"><PageTitle eyebrow="Semana de 16 a 22 de novembro" title="Como foi a sua semana?" text="Leva cerca de 2 minutos. Responda com tranquilidade e sinceridade."/>
    <form className="formCard" onSubmit={e=>{e.preventDefault();onSend()}}>
      <Question n="1" title="Qual é o seu peso atual?" text="Use a mesma balança e, se possível, o mesmo horário."><div className="weightField"><input defaultValue="81,2" inputMode="decimal"/><span>kg</span></div></Question>
      <Question n="2" title="Como você se sentiu esta semana?" text="Escolha a opção mais próxima da sua percepção geral."><div className="feelings">{[["Muito bem","🌟"],["Bem","🙂"],["Regular","😐"],["Difícil","😔"]].map(([x,e])=><button type="button" key={x} className={feeling===x?"selected":""} onClick={()=>setFeeling(x)}><em>{e}</em>{x}<CheckCircle2 size={17}/></button>)}</div></Question>
      <Scale n="3" title="Como foi sua adesão ao plano alimentar?" value={adherence} onChange={setAdherence} end="Segui muito bem"/>
      <Scale n="4" title="Quantas horas você dormiu, em média?" value={sleep} onChange={setSleep} end="Sono adequado" suffix="h"/>
      <Question n="5" title="Quer contar algo importante?" text="Dificuldades, conquistas, dúvidas ou qualquer observação."><textarea value={notes} onChange={e=>setNotes(e.target.value)} maxLength={500} placeholder="Escreva aqui (opcional)..."/><small className="count">{notes.length}/500</small></Question>
      <footer className="formFooter"><p><LockKeyhole size={16}/> Apenas você e seu nutricionista podem ver suas respostas.</p><button className="primary"><Send size={18}/>Enviar check-in</button></footer>
    </form>
  </div>;
}

function Metric({ icon,label,value,unit,note }: { icon:React.ReactNode;label:string;value:string;unit:string;note:string }) {
  return <article className="metric"><span>{icon}</span><small>{label}</small><b>{value} <i>{unit}</i></b><p><TrendingDown size={15}/>{note}</p></article>;
}

function Evolution() {
  const points=weights.map((v,i)=>`${45+i*102},${30+(85-v)/4.5*165}`).join(" ");
  return <div className="page"><PageTitle eyebrow="Minha jornada" title="Sua evolução" text="O progresso fica mais claro quando olhamos para o caminho completo." action={<button className="secondary"><CalendarDays size={18}/>Últimas 6 semanas<ChevronDown size={16}/></button>}/>
    <div className="metrics"><Metric icon={<Weight/>} label="Peso atual" value="81,2" unit="kg" note="3,0 kg desde o início"/><Metric icon={<ClipboardCheck/>} label="Check-ins concluídos" value="6" unit="semanas" note="100% de participação"/><Metric icon={<Activity/>} label="Adesão média" value="8,3" unit="/ 10" note="Seu melhor mês até agora"/></div>
    <article className="chartCard"><header><div><span>EVOLUÇÃO DO PESO</span><h2>Consistência que aparece</h2></div><p><i/>Peso em kg</p></header><div className="chart"><svg viewBox="0 0 600 245" role="img" aria-label="Peso caiu de 84,2 para 81,2 quilos"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="oklch(58% .11 158)" stopOpacity=".25"/><stop offset="1" stopColor="oklch(58% .11 158)" stopOpacity="0"/></linearGradient></defs>{[45,95,145,195].map(y=><line key={y} x1="45" x2="555" y1={y} y2={y}/>) }<polygon points={`45,215 ${points} 555,215`} fill="url(#area)"/><polyline points={points}/>{weights.map((v,i)=>{const x=45+i*102,y=30+(85-v)/4.5*165;return <g key={i}><circle cx={x} cy={y} r="5"/><text x={x} y="237" textAnchor="middle">{weekLabels[i]}</text>{i===5&&<><rect x={x-25} y={y-34} width="50" height="23" rx="7"/><text className="tip" x={x} y={y-18} textAnchor="middle">81,2</text></>}</g>})}</svg></div></article>
    <article className="insight"><span><Sparkles/></span><div><small>DESTAQUE DA SEMANA</small><h2>Você manteve uma evolução consistente</h2><p>Seu peso reduziu gradualmente nas últimas seis semanas, sem oscilações bruscas. Esse ritmo costuma indicar mudanças sustentáveis na rotina.</p></div></article>
  </div>;
}

function Stat({ label,value,note,icon }: { label:string;value:string;note:string;icon:React.ReactNode }) {
  return <article><header><span>{label}</span><i>{icon}</i></header><b>{value}</b><p>{note}</p></article>;
}

function Admin({ goForms }: { goForms:()=>void }) {
  return <div className="page admin"><header className="adminTop"><div><span>Sábado, 22 de novembro</span><h1>Bom dia, Hericles</h1></div><div><button className="iconButton"><Bell size={20}/></button><button className="primary" onClick={goForms}><Plus size={18}/>Novo formulário</button></div></header><section className="adminHero"><div><span className="eyebrow light">Check-in da semana</span><h2>18 de 24 pacientes já responderam</h2><p>Você está com 75% de participação. Seis pacientes ainda precisam de um lembrete.</p><button><Send size={17}/>Enviar lembrete</button></div><div className="circle"><b>75%</b><small>respondido</small></div></section><div className="stats"><Stat label="Pacientes ativos" value="24" note="+3 neste mês" icon={<Users/>}/><Stat label="Respostas na semana" value="18" note="de 24 envios" icon={<ClipboardCheck/>}/><Stat label="Taxa média" value="87%" note="+5% no mês" icon={<BarChart3/>}/><Stat label="Precisam de atenção" value="3" note="respostas sinalizadas" icon={<Bell/>}/></div><article className="tableCard"><header><div><h2>Respostas recentes</h2><p>Acompanhe quem concluiu o check-in desta semana.</p></div><label><Search size={17}/><input placeholder="Buscar paciente"/></label></header><div className="table labels"><span>Paciente</span><span>Status</span><span>Última atividade</span><span/></div>{patients.map((p,i)=><div className="table" key={p[2]}><div className="patient"><i className={`tone${i}`}>{p[0]}</i><p><b>{p[1]}</b><small>{p[2]}</small></p></div><span className={`pill ${p[3]==="Respondido"?"done":"pending"}`}>{p[3]==="Respondido"&&<Check size={13}/>} {p[3]}</span><span className="time">{p[4]}</span><button className="iconButton"><MoreHorizontal size={18}/></button></div>)}</article></div>;
}

function Forms() {
  const [sent,setSent]=useState(false);
  return <div className="page"><PageTitle eyebrow="Gestão de formulários" title="Check-in semanal" text="Personalize as perguntas enviadas toda sexta-feira." action={<button className="primary" onClick={()=>setSent(true)}><Send size={18}/>Enviar agora</button>}/>{sent&&<div className="toast"><CheckCircle2/>Formulário enviado para 24 pacientes.<button onClick={()=>setSent(false)}><X/></button></div>}<div className="builder"><article className="formBuilder"><header><div><span>FORMULÁRIO ATIVO</span><h2>Acompanhamento semanal</h2></div><i className="pill done"><Check size={13}/>Ativo</i></header>{["Peso atual","Percepção da semana","Adesão ao plano alimentar","Média de horas de sono","Observações e dificuldades"].map((q,i)=><div className="builderRow" key={q}><span>{i+1}</span><p><b>{q}</b><small>{i===0?"Resposta numérica · kg":i===1?"Escolha única":i<4?"Escala de 1 a 10":"Texto longo · opcional"}</small></p><button className="iconButton"><MoreHorizontal/></button></div>)}<button className="add"><Plus/>Adicionar pergunta</button></article><aside className="schedule"><span><Clock3/></span><h2>Envio automático</h2><p>Programado para chegar semanalmente aos pacientes.</p><dl><div><dt>Dia do envio</dt><dd>Sexta-feira</dd></div><div><dt>Horário</dt><dd>08:00</dd></div><div><dt>Próximo envio</dt><dd>27 de novembro</dd></div></dl><button className="secondary full">Editar programação</button><small>Ativaremos depois de conectar o canal de e-mail ou WhatsApp.</small></aside></div></div>;
}

export default function Home() {
  const [role,setRole]=useState<Role|null>(null), [view,setView]=useState<View>("checkin"), [sent,setSent]=useState(false);
  useEffect(()=>{const r=localStorage.getItem("feedback-role") as Role|null;if(r){setRole(r);setView(r==="admin"?"overview":"checkin")}setSent(localStorage.getItem("checkin-sent")==="1")},[]);
  function login(r:Role){localStorage.setItem("feedback-role",r);setRole(r);setView(r==="admin"?"overview":"checkin")}
  async function logout(){await signOut();localStorage.removeItem("feedback-role");setRole(null)}
  const content=useMemo(()=>view==="evolution"?<Evolution/>:role==="admin"?(view==="forms"?<Forms/>:<Admin goForms={()=>setView("forms")}/>):<Checkin sent={sent} onSend={()=>{setSent(true);localStorage.setItem("checkin-sent","1")}}/>,[role,view,sent]);
  if(!role)return <Login onLogin={login}/>;
  return <Shell role={role} view={view} setView={setView} logout={logout}>{content}<button className="roleSwitch" onClick={()=>login(role==="admin"?"patient":"admin")}>{role==="admin"?"Ver como paciente":"Ver como administrador"}</button></Shell>;
}
