import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Flame, Phone, MessageCircle, ShieldAlert, Wind, Heart, MapPin, Wallet,
  BookOpen, Trophy, AlertTriangle, ArrowRight, Plus, Trash2,
  Check, X, Clock, Mic, Square, Play, RotateCcw, ChevronDown,
  Activity, Users, Droplet, Footprints, Image as ImageIcon, Sparkles
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell } from 'recharts';

/* ---------- persistência ---------- */
const safeGet = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch (e) { return fallback; }
};
const safeSet = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (e) { return false; }
};
const usePersist = (key, initial) => {
  const [val, setVal] = useState(() => safeGet(key, initial));
  useEffect(() => { safeSet(key, val); }, [key, val]);
  return [val, setVal];
};

/* ---------- dados ---------- */
const GATILHOS = [
  { id: 'ansiedade', label: 'Ansiedade', icon: Wind },
  { id: 'solidao', label: 'Solidão', icon: Users },
  { id: 'raiva', label: 'Raiva', icon: Flame },
  { id: 'tedio', label: 'Tédio', icon: Clock },
  { id: 'abstinencia', label: 'Abstinência física', icon: Activity },
  { id: 'culpa', label: 'Briga / culpa / vergonha', icon: Heart },
  { id: 'contato', label: 'Contato com parceiro de uso', icon: ShieldAlert },
  { id: 'dinheiro', label: 'Dinheiro no bolso', icon: Wallet },
];

const PROTOCOLOS = {
  ansiedade: {
    fisica: 'Respire 4 segundos puxando, 6 soltando, por 1 minuto. Depois beba um copo de água gelada.',
    social: 'Mande uma mensagem para alguém de confiança: "tô ansioso, me responde".',
    mental: 'Aterramento: nomeie em voz alta 5 coisas que você vê, 4 que ouve, 3 que toca. Ande 5 minutos.',
    atalho: { label: 'Abrir Quebra de Fissura', target: 'quebra' },
  },
  solidao: {
    fisica: 'Saia de casa e vá para um lugar com gente: padaria, praça, mercado. Não fique sozinho agora.',
    social: 'Ligue para um contato seguro agora. Falar com voz humana corta a fissura.',
    mental: 'A solidão diz que usar resolve. Não resolve. A vontade passa em minutos.',
    atalho: { label: 'Acionar SOS', target: 'sos' },
  },
  raiva: {
    fisica: 'Descarregue o corpo: 30 agachamentos, soco no travesseiro ou suba escada rápido.',
    social: 'Saia do ambiente ou de perto da pessoa que te tirou do sério. Agora.',
    mental: 'Escreva no diário o que te deu raiva. Não responda ninguém nos próximos 30 minutos.',
    atalho: { label: 'Registrar no diário', target: 'diario' },
  },
  tedio: {
    fisica: 'Faça uma tarefa brutalmente simples de 5 minutos: lavar a louça, arrumar uma gaveta, varrer.',
    social: 'Mande mensagem para alguém só para puxar conversa. Sair do vazio.',
    mental: 'O tédio é desconforto, não emergência. Você aguenta ficar entediado sem usar.',
    atalho: { label: 'Abrir Quebra de Fissura', target: 'quebra' },
  },
  abstinencia: {
    fisica: 'Beba água, coma algo, deite em lugar fresco. Sintoma físico forte pede atenção, não uso.',
    social: 'Avise alguém que você está com sintomas de abstinência e está sozinho.',
    mental: 'Abstinência de álcool, calmantes (clonazepam, alprazolam) ou opioides pode ser perigosa. Procure atendimento médico.',
    atalho: { label: 'Ver Rota de Emergência', target: 'emergencia' },
  },
  culpa: {
    fisica: 'Saia para caminhar 10 minutos. Tire o corpo do lugar onde a culpa apareceu.',
    social: 'Ligue para um contato seguro e diga em voz alta: "errei mas não vou piorar agora".',
    mental: 'Usar não paga a culpa, só adiciona mais. Não decida nada sobre você hoje.',
    atalho: { label: 'Reler meus motivos', target: 'motivos' },
  },
  contato: {
    fisica: 'Saia do local AGORA. Vá para a rua, casa de alguém, qualquer lugar seguro.',
    social: 'Bloqueie o contato dessa pessoa neste momento e acione o SOS.',
    mental: 'Você não está escolhendo. Quem está no comando é quem te oferece. Corte o contato.',
    atalho: { label: 'Acionar SOS', target: 'sos' },
  },
  dinheiro: {
    fisica: 'Vá para a casa de alguém de confiança. Não fique com dinheiro disponível e sozinho.',
    social: 'Passe o dinheiro ou o cartão para uma pessoa de confiança segurar hoje.',
    mental: 'Dinheiro no bolso vira oportunidade em minutos. Tira de você o meio, tira o ato.',
    atalho: { label: 'Abrir contenção', target: 'contencao' },
  },
};

const QUEBRAS = [
  { id: 'agua', label: 'Água gelada no rosto', icon: Droplet, seg: 60, instr: 'Molhe o rosto com água bem gelada por 30 segundos. Repita. O choque corta o automático.' },
  { id: 'banho', label: 'Banho gelado', icon: Droplet, seg: 180, instr: 'Entre no chuveiro frio. 3 minutos. Foque na respiração e na pele, não na vontade.' },
  { id: 'caminhar', label: 'Caminhar 10 minutos', icon: Footprints, seg: 600, instr: 'Calce o tênis e saia. Ande sem destino por 10 minutos. Volte só quando o timer apitar.' },
  { id: 'agacha', label: '30 agachamentos', icon: Activity, seg: 120, instr: 'Faça 30 agachamentos no seu ritmo. Cansar o corpo derruba o pico da fissura.' },
  { id: 'gelo', label: 'Gelo na mão / bala forte', icon: Sparkles, seg: 90, instr: 'Segure gelo na mão até começar a doer ou chupe uma bala bem forte. Estímulo intenso desvia o foco.' },
  { id: 'sair', label: 'Sair para local seguro', icon: MapPin, seg: 60, instr: 'Defina agora um lugar seguro e vá para lá. Mudar de ambiente muda o estado.' },
];

const SO_POR_HOJE = [
  'Só por hoje você não precisa parar para sempre. Só não usa agora.',
  'A fissura é uma onda: sobe, chega no topo e desce. Você só precisa esperar ela descer.',
  'Você já passou por isso antes sem usar. Hoje também dá.',
  'Seu cérebro está mentindo que é só dessa vez. Nunca é só dessa vez.',
  'Você não quer usar. Você quer parar de sentir o que está sentindo. Existe outro jeito.',
  'Ninguém precisa decidir o resto da vida agora. Decide só as próximas duas horas.',
  'A vontade mais forte que você já teve também acabou passando.',
  'Adia. Só adia. Se daqui a uma hora ainda quiser, você decide de novo.',
  'Não use hoje. Amanhã você acorda com uma vitória, não com um arrependimento.',
  'Atravessar a fissura sem usar é treino. Cada vez que você aguenta, fica mais fácil.',
];

const CONTENCAO_ITENS = [
  { id: 'bloquear', label: 'Bloquear o contato do fornecedor / parceiro de uso' },
  { id: 'cartao', label: 'Passar cartões e dinheiro para uma pessoa de confiança' },
  { id: 'pix', label: 'Reduzir limite do Pix / cartão no app do banco' },
  { id: 'apps', label: 'Remover apps que facilitam recaída (entrega, marketplace, contatos)' },
  { id: 'contato', label: 'Avisar um contato de segurança que hoje é dia de risco' },
  { id: 'local', label: 'Combinar de passar a noite na casa de alguém' },
];

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const SECTIONS = [
  { id: 'inicio', label: 'Início' },
  { id: 'plano', label: 'Plano' },
  { id: 'motivos', label: 'Motivos' },
  { id: 'quebra', label: 'Quebra de Fissura' },
  { id: 'radar', label: 'Radar' },
  { id: 'contencao', label: 'Contenção' },
  { id: 'diario', label: 'Diário' },
  { id: 'vitorias', label: 'Vitórias' },
  { id: 'sos', label: 'SOS' },
  { id: 'emergencia', label: 'Emergência' },
];

/* ---------- utilidades ---------- */
const fmtElapsed = (ms) => {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}min`;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${sec}s`;
  return `${sec}s`;
};
const scrollToId = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/* ---------- componentes base ---------- */
function Reveal({ children, className = '' }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { setVis(true); obs.unobserve(el); } });
    }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return <div ref={ref} className={`reveal ${vis ? 'is-visible' : ''} ${className}`}>{children}</div>;
}

function Section({ id, title, kicker, children }) {
  return (
    <section id={id} className="scroll-mt-24 py-10 border-t border-slate-200/70">
      <Reveal>
        {kicker && <p className="text-xs font-bold uppercase tracking-widest text-teal-700 mb-2">{kicker}</p>}
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-5 leading-tight">{title}</h2>
        {children}
      </Reveal>
    </section>
  );
}

function TextInput({ value, onChange, placeholder, label }) {
  return (
    <label className="block mb-3">
      {label && <span className="block text-sm font-semibold text-slate-600 mb-1">{label}</span>}
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none text-sm" />
    </label>
  );
}
function TextArea({ value, onChange, placeholder, label, rows = 3 }) {
  return (
    <label className="block mb-3">
      {label && <span className="block text-sm font-semibold text-slate-600 mb-1">{label}</span>}
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none text-sm resize-y" />
    </label>
  );
}

function EditableList({ items, setItems, placeholder }) {
  const [draft, setDraft] = useState('');
  const add = () => { const v = draft.trim(); if (!v) return; setItems([...items, v]); setDraft(''); };
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-teal-600 outline-none text-sm" />
        <button onClick={add} className="px-3 py-2 rounded-xl bg-teal-700 text-white text-sm font-semibold flex items-center gap-1"><Plus size={16} />Add</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((it, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-white border border-slate-300 rounded-full pl-3 pr-1.5 py-1 text-sm">
            {it}
            <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-600"><X size={14} /></button>
          </span>
        ))}
        {items.length === 0 && <span className="text-sm text-slate-400">Nada adicionado ainda.</span>}
      </div>
    </div>
  );
}

/* ============================================================= */
/* CRISE OVERLAY                                                 */
/* ============================================================= */
function CriseOverlay({ open, onClose, onGoto, onRegistrar, plano }) {
  const [step, setStep] = useState(1);
  const [secs, setSecs] = useState(180);
  const [intensidade, setIntensidade] = useState(7);
  const [gatilho, setGatilho] = useState(null);
  const [usou, setUsou] = useState(null);
  const [ajudou, setAjudou] = useState('');
  const tickRef = useRef(null);

  useEffect(() => {
    if (open) { setStep(1); setSecs(180); setIntensidade(7); setGatilho(null); setUsou(null); setAjudou(''); }
  }, [open]);

  useEffect(() => {
    if (open && step === 1) {
      tickRef.current = setInterval(() => {
        setSecs(s => { if (s <= 1) { clearInterval(tickRef.current); setStep(2); return 0; } return s - 1; });
      }, 1000);
      return () => clearInterval(tickRef.current);
    }
  }, [open, step]);

  if (!open) return null;

  const proto = gatilho ? PROTOCOLOS[gatilho] : null;
  const mins = Math.floor(secs / 60);
  const ss = String(secs % 60).padStart(2, '0');
  const pct = ((180 - secs) / 180) * 100;

  const finish = () => onRegistrar({ ts: Date.now(), intensidade, gatilho, usou, ajudou: ajudou.trim() });

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900 text-white overflow-y-auto">
      <div className="max-w-[640px] mx-auto px-5 py-6 min-h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-bold uppercase tracking-widest text-red-300 flex items-center gap-1.5"><Flame size={14} /> Modo Crise</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 -mr-2"><X size={22} /></button>
        </div>

        {step === 1 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <h2 className="text-2xl font-extrabold mb-1">Não decide nada por 3 minutos.</h2>
            <p className="text-slate-300 text-sm mb-8 max-w-sm">A vontade é uma onda. Você só precisa esperar ela começar a descer. Respire junto com o círculo.</p>
            <div className="relative flex items-center justify-center mb-8" style={{ height: 220, width: 220 }}>
              <div className="absolute rounded-full bg-teal-500/20 breathe" style={{ height: 200, width: 200 }}></div>
              <div className="absolute rounded-full border-2 border-teal-400/40 breathe" style={{ height: 200, width: 200 }}></div>
              <div className="relative text-5xl font-extrabold tabular-nums">{mins}:{ss}</div>
            </div>
            <p className="text-teal-300 text-sm font-semibold mb-6">Puxa o ar... segura... solta devagar.</p>
            <div className="w-full max-w-xs h-2 bg-white/10 rounded-full overflow-hidden mb-8">
              <div className="h-full bg-teal-400 transition-all duration-1000" style={{ width: `${pct}%` }}></div>
            </div>
            <button onClick={() => setStep(2)} className="text-xs text-slate-400 underline hover:text-slate-200">Já respirei, ir para a ação</button>
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-2xl font-extrabold mb-2 text-center">Quão forte está a vontade?</h2>
            <p className="text-slate-300 text-sm mb-8 text-center">Só marca. Isso vira padrão no seu diário depois.</p>
            <div className="text-center text-7xl font-extrabold mb-6 tabular-nums" style={{ color: intensidade >= 7 ? '#fca5a5' : intensidade >= 4 ? '#fcd34d' : '#5eead4' }}>{intensidade}</div>
            <input type="range" min="0" max="10" value={intensidade} onChange={e => setIntensidade(Number(e.target.value))} className="w-full mb-2" />
            <div className="flex justify-between text-xs text-slate-400 mb-10"><span>0 — tranquilo</span><span>10 — quase usando</span></div>
            <button onClick={() => setStep(3)} className="w-full py-4 rounded-2xl bg-teal-600 hover:bg-teal-500 font-bold text-lg flex items-center justify-center gap-2">Continuar <ArrowRight size={20} /></button>
          </div>
        )}

        {step === 3 && (
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-2xl font-extrabold mb-2 text-center">O que disparou agora?</h2>
            <p className="text-slate-300 text-sm mb-6 text-center">Toca no que mais combina. Você recebe ações feitas pra isso.</p>
            <div className="grid grid-cols-2 gap-3">
              {GATILHOS.map(g => {
                const Ic = g.icon;
                return (
                  <button key={g.id} onClick={() => { setGatilho(g.id); setStep(4); }}
                    className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left flex flex-col gap-2">
                    <Ic size={22} className="text-teal-300" />
                    <span className="font-semibold text-sm leading-tight">{g.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && proto && (
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-2xl font-extrabold mb-1 text-center">Faça estas 3 coisas agora</h2>
            <p className="text-slate-300 text-sm mb-6 text-center">Não precisa querer. Só faz.</p>
            <div className="space-y-3 mb-5">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-xs font-bold uppercase tracking-wide text-teal-300 mb-1 flex items-center gap-1.5"><Activity size={13} /> Ação física</p>
                <p className="text-sm">{proto.fisica}</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-xs font-bold uppercase tracking-wide text-teal-300 mb-1 flex items-center gap-1.5"><Users size={13} /> Ação social</p>
                <p className="text-sm">{proto.social}</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-xs font-bold uppercase tracking-wide text-teal-300 mb-1 flex items-center gap-1.5"><Heart size={13} /> Ação mental</p>
                <p className="text-sm">{proto.mental}</p>
              </div>
            </div>
            {plano && plano.motivosParar && (
              <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-300/30 mb-5">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-200 mb-1">Por que você decidiu parar</p>
                <p className="text-sm text-amber-50 whitespace-pre-line">{plano.motivosParar}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button onClick={() => { onClose(); onGoto('sos'); }} className="py-3 rounded-2xl bg-red-600 hover:bg-red-500 font-bold flex items-center justify-center gap-2"><Phone size={18} /> SOS</button>
              {proto.atalho && (
                <button onClick={() => { onClose(); onGoto(proto.atalho.target); }} className="py-3 rounded-2xl bg-white/10 hover:bg-white/20 font-semibold text-sm">{proto.atalho.label}</button>
              )}
            </div>
            <button onClick={() => setStep(5)} className="w-full py-4 rounded-2xl bg-teal-600 hover:bg-teal-500 font-bold text-lg">Já fiz — registrar</button>
          </div>
        )}

        {step === 5 && (
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-2xl font-extrabold mb-2 text-center">Como você saiu dessa?</h2>
            <p className="text-slate-300 text-sm mb-6 text-center">Sem julgamento. Só registro.</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button onClick={() => setUsou(false)} className={`py-5 rounded-2xl font-bold border ${usou === false ? 'bg-teal-600 border-teal-400' : 'bg-white/5 border-white/10'}`}>Atravessei sem usar</button>
              <button onClick={() => setUsou(true)} className={`py-5 rounded-2xl font-bold border ${usou === true ? 'bg-red-600 border-red-400' : 'bg-white/5 border-white/10'}`}>Acabei usando</button>
            </div>
            <label className="block mb-6">
              <span className="block text-sm font-semibold text-slate-300 mb-1">O que ajudou (ou faltou)?</span>
              <input value={ajudou} onChange={e => setAjudou(e.target.value)} placeholder="ex: liguei pro João, saí de casa"
                className="w-full px-3 py-3 rounded-xl bg-white/10 border border-white/15 outline-none text-sm placeholder:text-slate-500" />
            </label>
            {usou === true && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-5 text-sm">
                Recaída não apaga o que você já fez. Não fique sozinho agora.
                <button onClick={() => { finish(); onClose(); onGoto('emergencia'); }} className="mt-3 w-full py-3 rounded-xl bg-amber-500 text-slate-900 font-bold">Abrir Rota de Emergência</button>
              </div>
            )}
            <button disabled={usou === null} onClick={() => { finish(); onClose(); }}
              className={`w-full py-4 rounded-2xl font-bold text-lg ${usou === null ? 'bg-white/10 text-slate-500' : 'bg-teal-600 hover:bg-teal-500'}`}>
              Salvar e fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================= */
/* SEÇÕES                                                        */
/* ============================================================= */

function SoPorHoje() {
  const dayIdx = Math.floor(Date.now() / 86400000) % SO_POR_HOJE.length;
  const [i, setI] = useState(dayIdx);
  return (
    <div className="rounded-2xl bg-teal-700 text-white p-5 sm:p-6 flex items-start gap-4">
      <Sparkles size={22} className="text-teal-200 shrink-0 mt-1" />
      <div className="flex-1">
        <p className="text-xs font-bold uppercase tracking-widest text-teal-200 mb-1">Só por hoje</p>
        <p className="text-lg font-semibold leading-snug">{SO_POR_HOJE[i]}</p>
        <button onClick={() => setI((i + 1) % SO_POR_HOJE.length)} className="mt-3 text-sm text-teal-200 underline hover:text-white flex items-center gap-1"><RotateCcw size={14} /> Outra</button>
      </div>
    </div>
  );
}

function PlanoSection({ plano, setPlano }) {
  const set = (k, v) => setPlano({ ...plano, [k]: v });
  return (
    <Section id="plano" kicker="Feito sóbrio, usado na crise" title="Plano Anti-Recaída">
      <p className="text-slate-600 mb-6 text-sm">Preencha isto em um momento calmo. Na crise, o cérebro não inventa estratégia. Ele só executa o que já estava pronto. Salva sozinho neste aparelho.</p>
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <TextArea label="Por que eu decidi parar" value={plano.motivosParar || ''} onChange={v => set('motivosParar', v)} placeholder="A verdade nua. Você vai reler isso em fissura." rows={3} />
        <div>
          <span className="block text-sm font-semibold text-slate-600 mb-1">Meus gatilhos</span>
          <EditableList items={plano.gatilhos || []} setItems={v => set('gatilhos', v)} placeholder="ex: discussão em casa" />
        </div>
        <div className="mt-2">
          <span className="block text-sm font-semibold text-slate-600 mb-1">Lugares de risco</span>
          <EditableList items={plano.lugares || []} setItems={v => set('lugares', v)} placeholder="ex: rua do antigo ponto" />
        </div>
        <div className="mt-2">
          <span className="block text-sm font-semibold text-slate-600 mb-1">Pessoas de risco</span>
          <EditableList items={plano.pessoas || []} setItems={v => set('pessoas', v)} placeholder="ex: parceiro de uso" />
        </div>
        <TextArea label="Meus sinais de alerta (como sei que a crise vem)" value={plano.sinais || ''} onChange={v => set('sinais', v)} placeholder="ex: começo a ficar irritado e a evitar gente" rows={2} />
        <TextArea label="O que me acalma de verdade" value={plano.acalma || ''} onChange={v => set('acalma', v)} placeholder="ex: banho, andar, ligar pra minha irmã" rows={2} />
        <TextArea label="O que piora (evitar)" value={plano.piora || ''} onChange={v => set('piora', v)} placeholder="ex: ficar sozinho com dinheiro, beber 'só um pouco'" rows={2} />
        <TextArea label="Quem eu devo chamar" value={plano.quemChamar || ''} onChange={v => set('quemChamar', v)} placeholder="ex: João (irmão), padrinho do grupo" rows={2} />
      </div>
    </Section>
  );
}

function MotivosSection({ motivos, setMotivos }) {
  const set = (k, v) => setMotivos({ ...motivos, [k]: v });
  const [recording, setRecording] = useState(false);
  const [recError, setRecError] = useState('');
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  const startRec = async () => {
    setRecError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          if (!safeSet('mc_motivos', { ...motivos, audioData: reader.result })) {
            setRecError('O áudio ficou grande demais para salvar. Grave algo mais curto.');
            return;
          }
          set('audioData', reader.result);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch (e) { setRecError('Não consegui acessar o microfone neste aparelho.'); }
  };
  const stopRec = () => { if (mediaRef.current) mediaRef.current.stop(); setRecording(false); };

  const onPhoto = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const max = 600;
        let width = img.width, height = img.height;
        if (width > height && width > max) { height = height * max / width; width = max; }
        else if (height > max) { width = width * max / height; height = max; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        const data = canvas.toDataURL('image/jpeg', 0.7);
        if (!safeSet('mc_motivos', { ...motivos, fotoData: data })) {
          alert('A foto ficou grande demais para salvar. Tente outra.');
          return;
        }
        set('fotoData', data);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <Section id="motivos" kicker="A fissura mente. Isto é a verdade." title="Meus Motivos pra Não Usar">
      <p className="text-slate-600 mb-6 text-sm">Nada de frase pronta. Escreva com as suas palavras, grave a sua voz e coloque a sua foto. Na crise, o app joga isso na sua frente.</p>
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <TextArea label="Se eu usar hoje, eu perco..." value={motivos.perco || ''} onChange={v => set('perco', v)} rows={2} placeholder="ex: a confiança dos meus filhos de novo" />
        <TextArea label="Se eu não usar, amanhã eu acordo com..." value={motivos.acordo || ''} onChange={v => set('acordo', v)} rows={2} placeholder="ex: mais um dia limpo e a cabeça no lugar" />
        <TextArea label="Já aconteceu isto quando usei:" value={motivos.jaAconteceu || ''} onChange={v => set('jaAconteceu', v)} rows={2} placeholder="ex: gastei o dinheiro do mês e briguei feio" />

        <div className="pt-2">
          <span className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-1.5"><Mic size={15} /> Áudio seu, sóbrio, falando com você em crise</span>
          <div className="flex items-center gap-3 flex-wrap mt-2">
            {!recording ? (
              <button onClick={startRec} className="px-4 py-2 rounded-xl bg-teal-700 text-white text-sm font-semibold flex items-center gap-2"><Mic size={16} /> Gravar</button>
            ) : (
              <button onClick={stopRec} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold flex items-center gap-2 animate-pulse"><Square size={16} /> Parar gravação</button>
            )}
            {motivos.audioData && <audio controls src={motivos.audioData} className="h-9" />}
            {motivos.audioData && <button onClick={() => set('audioData', null)} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>}
          </div>
          {recError && <p className="text-xs text-red-600 mt-2">{recError}</p>}
        </div>

        <div className="pt-2">
          <span className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-1.5"><ImageIcon size={15} /> Foto que te lembra do que importa</span>
          <div className="flex items-center gap-4 flex-wrap mt-2">
            <label className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-300 text-sm font-semibold cursor-pointer hover:bg-slate-200">
              Escolher foto
              <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
            </label>
            {motivos.fotoData && (
              <div className="relative">
                <img src={motivos.fotoData} alt="lembrete" className="h-24 rounded-xl object-cover border border-slate-200" />
                <button onClick={() => set('fotoData', null)} className="absolute -top-2 -right-2 bg-white border border-slate-300 rounded-full p-1 text-slate-500 hover:text-red-600"><X size={14} /></button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}

function QuebraTimer({ q }) {
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(q.seg);
  const ref = useRef(null);
  useEffect(() => () => clearInterval(ref.current), []);
  const start = () => {
    setRunning(true);
    ref.current = setInterval(() => setLeft(l => { if (l <= 1) { clearInterval(ref.current); setRunning(false); return 0; } return l - 1; }), 1000);
  };
  const reset = () => { clearInterval(ref.current); setRunning(false); setLeft(q.seg); };
  const m = Math.floor(left / 60), s = String(left % 60).padStart(2, '0');
  return (
    <div className="flex items-center gap-3">
      <span className="tabular-nums font-bold text-lg text-slate-700 w-16 text-center">{m}:{s}</span>
      {!running ? (
        <button onClick={start} className="px-3 py-1.5 rounded-lg bg-teal-700 text-white text-sm font-semibold flex items-center gap-1"><Play size={14} /> Começar</button>
      ) : (
        <button onClick={reset} className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-sm font-semibold flex items-center gap-1"><RotateCcw size={14} /> Zerar</button>
      )}
    </div>
  );
}

function QuebraSection() {
  const [aberto, setAberto] = useState(null);
  return (
    <Section id="quebra" kicker="Tira o corpo do automático" title="Quebra de Fissura em 5 Minutos">
      <p className="text-slate-600 mb-6 text-sm">Escolha uma. Aperte começar. Só volte a decidir qualquer coisa quando o timer apitar. Ação física corta o pico melhor que pensar.</p>
      <div className="space-y-3">
        {QUEBRAS.map(q => {
          const Ic = q.icon;
          const open = aberto === q.id;
          return (
            <div key={q.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <button onClick={() => setAberto(open ? null : q.id)} className="w-full flex items-center gap-3 p-4 text-left">
                <span className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0"><Ic size={20} /></span>
                <span className="flex-1 font-semibold text-sm">{q.label}</span>
                <ChevronDown size={18} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              <div className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <div className="px-4 pb-4 sm:pl-[68px]">
                    <p className="text-sm text-slate-600 mb-3">{q.instr}</p>
                    <QuebraTimer q={q} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function RadarSection({ radar, setRadar }) {
  const set = (k, v) => setRadar({ ...radar, [k]: v });
  const toggleDia = (i) => { const d = radar.dias || []; set('dias', d.includes(i) ? d.filter(x => x !== i) : [...d, i]); };

  const agora = new Date();
  const wd = agora.getDay();
  const hora = agora.getHours();
  const config = (radar.dias && radar.dias.length) || (radar.horaInicio !== undefined && radar.horaInicio !== '');

  const motivos = [];
  let pontos = 0;
  if ((radar.dias || []).includes(wd)) { pontos += 2; motivos.push(`Hoje é ${DIAS[wd]}, um dia que você marcou como de risco.`); }
  const hi = radar.horaInicio, hf = radar.horaFim;
  if (hi !== undefined && hf !== undefined && hi !== '' && hf !== '') {
    const dentro = Number(hi) <= Number(hf) ? (hora >= hi && hora < hf) : (hora >= hi || hora < hf);
    if (dentro) { pontos += 2; motivos.push(`Agora são ${hora}h, dentro da sua faixa de horário de risco (${hi}h–${hf}h).`); }
  }
  if (radar.pagamento) { pontos += 1; motivos.push('Você marcou dia de pagamento como gatilho. Se recebeu hoje, ative a contenção.'); }
  const nivel = pontos >= 4 ? 'Alto' : pontos >= 2 ? 'Médio' : 'Baixo';
  const cor = nivel === 'Alto' ? 'bg-red-600' : nivel === 'Médio' ? 'bg-amber-500' : 'bg-teal-600';

  return (
    <Section id="radar" kicker="Antecipa o risco antes da crise" title="Radar de Gatilhos">
      <p className="text-slate-600 mb-6 text-sm">Configure quando, onde e com quem o risco sobe. O app calcula o seu nível de risco para o momento atual sempre que você abre.</p>

      {config && (
        <div className={`rounded-2xl ${cor} text-white p-5 mb-6`}>
          <p className="text-xs font-bold uppercase tracking-widest text-white/80 mb-1">Risco agora</p>
          <p className="text-3xl font-extrabold mb-2">{nivel}</p>
          {motivos.length > 0 ? (
            <ul className="text-sm space-y-1 text-white/90 list-disc pl-5">{motivos.map((m, i) => <li key={i}>{m}</li>)}</ul>
          ) : <p className="text-sm text-white/90">Nenhum gatilho de tempo ativo neste momento. Bom momento para se manter na rotina segura.</p>}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
        <div>
          <span className="block text-sm font-semibold text-slate-600 mb-2">Dias da semana de maior risco</span>
          <div className="flex flex-wrap gap-2">
            {DIAS.map((d, i) => (
              <button key={i} onClick={() => toggleDia(i)} className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${(radar.dias || []).includes(i) ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-600 border-slate-300'}`}>{d}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-sm font-semibold text-slate-600 mb-1">Hora início do risco</span>
            <input type="number" min="0" max="23" value={radar.horaInicio ?? ''} onChange={e => set('horaInicio', e.target.value === '' ? '' : Number(e.target.value))} placeholder="ex: 18" className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none text-sm" />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-slate-600 mb-1">Hora fim do risco</span>
            <input type="number" min="0" max="23" value={radar.horaFim ?? ''} onChange={e => set('horaFim', e.target.value === '' ? '' : Number(e.target.value))} placeholder="ex: 23" className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none text-sm" />
          </label>
        </div>
        <div>
          <span className="block text-sm font-semibold text-slate-600 mb-1">Lugares para não passar</span>
          <EditableList items={radar.lugares || []} setItems={v => set('lugares', v)} placeholder="ex: bairro X, rua do ponto" />
        </div>
        <div>
          <span className="block text-sm font-semibold text-slate-600 mb-1">Pessoas gatilho</span>
          <EditableList items={radar.pessoas || []} setItems={v => set('pessoas', v)} placeholder="ex: fulano" />
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={!!radar.pagamento} onChange={e => set('pagamento', e.target.checked)} className="w-5 h-5 accent-teal-700" />
          <span className="text-sm text-slate-700">Dia de pagamento é um gatilho para mim</span>
        </label>
      </div>
    </Section>
  );
}

function ContencaoSection({ contencao, setContencao }) {
  const toggle = (id) => setContencao({ ...contencao, [id]: !contencao[id] });
  const feitos = CONTENCAO_ITENS.filter(i => contencao[i.id]).length;
  return (
    <Section id="contencao" kicker="Tira de você o meio, tira o ato" title="Sem Dinheiro, Sem Contato">
      <p className="text-slate-600 mb-4 text-sm">Quando o risco está alto, reduza o acesso. Marque cada barreira que você já colocou no lugar. Fica salvo.</p>
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-teal-600 transition-all" style={{ width: `${(feitos / CONTENCAO_ITENS.length) * 100}%` }}></div></div>
        <span className="text-sm font-semibold text-slate-600">{feitos}/{CONTENCAO_ITENS.length}</span>
      </div>
      <div className="space-y-2">
        {CONTENCAO_ITENS.map(it => (
          <button key={it.id} onClick={() => toggle(it.id)} className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-colors ${contencao[it.id] ? 'bg-teal-50 border-teal-300' : 'bg-white border-slate-200'}`}>
            <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${contencao[it.id] ? 'bg-teal-600 text-white' : 'border-2 border-slate-300'}`}>{contencao[it.id] && <Check size={16} />}</span>
            <span className={`text-sm ${contencao[it.id] ? 'text-teal-900 line-through' : 'text-slate-700'}`}>{it.label}</span>
          </button>
        ))}
      </div>
    </Section>
  );
}

function DiarioSection({ diario, setDiario }) {
  const [intensidade, setIntensidade] = useState(5);
  const [antes, setAntes] = useState('');
  const [usou, setUsou] = useState(false);
  const [ajudou, setAjudou] = useState('');

  const add = () => {
    setDiario([{ ts: Date.now(), intensidade, antes: antes.trim(), gatilho: null, usou, ajudou: ajudou.trim() }, ...diario]);
    setAntes(''); setAjudou(''); setIntensidade(5); setUsou(false);
  };

  const padroes = useMemo(() => {
    const out = [];
    if (diario.length < 3) return out;
    const total = diario.length;
    const venceu = diario.filter(d => d.usou === false).length;
    out.push(`Você registrou ${total} crises. Atravessou sem usar em ${venceu} delas (${Math.round(venceu / total * 100)}%).`);
    const porDia = {};
    diario.forEach(d => { const w = new Date(d.ts).getDay(); porDia[w] = (porDia[w] || 0) + 1; });
    const topDia = Object.entries(porDia).sort((a, b) => b[1] - a[1])[0];
    if (topDia && topDia[1] >= 2) out.push(`Seus registros se concentram em ${DIAS[topDia[0]]}. É seu ponto crítico da semana.`);
    const ctx = {};
    diario.forEach(d => { const g = (d.gatilho || d.antes || '').toLowerCase().trim(); if (g) ctx[g] = (ctx[g] || 0) + 1; });
    const topCtx = Object.entries(ctx).sort((a, b) => b[1] - a[1])[0];
    if (topCtx && topCtx[1] >= 2) out.push(`O contexto que mais aparece antes da crise: "${topCtx[0]}".`);
    const aj = {};
    diario.filter(d => d.usou === false && d.ajudou).forEach(d => { const a = d.ajudou.toLowerCase().trim(); aj[a] = (aj[a] || 0) + 1; });
    const topAj = Object.entries(aj).sort((a, b) => b[1] - a[1])[0];
    if (topAj && topAj[1] >= 2) out.push(`"${topAj[0]}" foi o que mais te ajudou a não usar. Use isso primeiro.`);
    const media = (diario.reduce((s, d) => s + (d.intensidade || 0), 0) / total).toFixed(1);
    out.push(`Intensidade média das suas fissuras: ${media}/10.`);
    return out;
  }, [diario]);

  const chartData = useMemo(() => [...diario].slice(0, 12).reverse().map(d => ({
    name: new Date(d.ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    intensidade: d.intensidade || 0,
    usou: d.usou,
  })), [diario]);

  return (
    <Section id="diario" kicker="Vira informação, não só desabafo" title="Diário de Fissura">
      <p className="text-slate-600 mb-6 text-sm">Registro mínimo, em segundos. Com o tempo o app mostra os seus padrões reais: que dia, que contexto e o que funciona pra você.</p>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <div className="text-center text-5xl font-extrabold mb-3 tabular-nums" style={{ color: intensidade >= 7 ? '#dc2626' : intensidade >= 4 ? '#d97706' : '#0f766e' }}>{intensidade}</div>
        <input type="range" min="0" max="10" value={intensidade} onChange={e => setIntensidade(Number(e.target.value))} className="w-full mb-1" />
        <div className="flex justify-between text-xs text-slate-400 mb-4"><span>0</span><span>intensidade da vontade</span><span>10</span></div>
        <TextInput value={antes} onChange={setAntes} placeholder="O que aconteceu antes? ex: briga, dia de pagamento" />
        <div className="flex gap-2 mb-3">
          <button onClick={() => setUsou(false)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border ${!usou ? 'bg-teal-600 text-white border-teal-600' : 'bg-white border-slate-300 text-slate-600'}`}>Não usei</button>
          <button onClick={() => setUsou(true)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border ${usou ? 'bg-red-600 text-white border-red-600' : 'bg-white border-slate-300 text-slate-600'}`}>Usei</button>
        </div>
        <TextInput value={ajudou} onChange={setAjudou} placeholder="O que ajudou? ex: liguei pra alguém" />
        <button onClick={add} className="w-full py-3 rounded-xl bg-teal-700 text-white font-bold mt-1">Registrar</button>
      </div>

      {padroes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-2 flex items-center gap-1.5"><Activity size={14} /> Seus padrões</p>
          <ul className="space-y-1.5 text-sm text-amber-900 list-disc pl-5">{padroes.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </div>
      )}

      {chartData.length > 1 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
          <p className="text-sm font-semibold text-slate-600 mb-3">Intensidade ao longo do tempo</p>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="intensidade" radius={[4, 4, 0, 0]}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.usou ? '#dc2626' : '#0f766e'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-400 mt-2">Verde = atravessou sem usar. Vermelho = usou.</p>
        </div>
      )}

      {diario.length > 0 && (
        <div className="space-y-2">
          {diario.slice(0, 8).map((d, i) => (
            <div key={i} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 text-sm">
              <span className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white shrink-0 ${d.intensidade >= 7 ? 'bg-red-500' : d.intensidade >= 4 ? 'bg-amber-500' : 'bg-teal-600'}`}>{d.intensidade}</span>
              <div className="flex-1 min-w-0">
                <p className="text-slate-700 truncate">{d.antes || d.gatilho || 'sem contexto'}{d.ajudou && <span className="text-slate-400"> · ajudou: {d.ajudou}</span>}</p>
                <p className="text-xs text-slate-400">{new Date(d.ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · {d.usou ? 'usou' : 'não usou'}</p>
              </div>
              <button onClick={() => setDiario(diario.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-600"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function VitoriasSection({ vitorias, setVitorias }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const desde = vitorias.limpoDesde || null;
  const elapsed = desde ? now - desde : 0;
  const marcos = [
    { ms: 600000, label: '10 minutos' },
    { ms: 3600000, label: '1 hora' },
    { ms: 28800000, label: '1 noite' },
    { ms: 86400000, label: '24 horas' },
  ];
  const recomecar = () => {
    const rec = Math.max(vitorias.recorde || 0, elapsed);
    setVitorias({ ...vitorias, limpoDesde: Date.now(), recorde: rec });
  };
  return (
    <Section id="vitorias" kicker="Vence agora, não no mês 8" title="Vitórias">
      <p className="text-slate-600 mb-6 text-sm">Na crise ninguém vence um ano. Vence dez minutos. Cada bloco acende quando você chega lá. Sem culpa se precisar recomeçar.</p>

      <div className="bg-slate-900 text-white rounded-2xl p-6 mb-5 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-teal-300 mb-1">Limpo há</p>
        {desde ? <p className="text-4xl font-extrabold mb-3 tabular-nums">{fmtElapsed(elapsed)}</p>
               : <p className="text-2xl font-bold mb-3 text-slate-400">Toque em começar</p>}
        <div className="flex gap-2 justify-center">
          {!desde ? (
            <button onClick={() => setVitorias({ ...vitorias, limpoDesde: Date.now() })} className="px-5 py-2.5 rounded-xl bg-teal-600 font-bold">Começar contagem</button>
          ) : (
            <button onClick={recomecar} className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-semibold text-sm flex items-center gap-2"><RotateCcw size={16} /> Recomeçar (sem culpa)</button>
          )}
        </div>
        {vitorias.recorde > 0 && <p className="text-xs text-slate-400 mt-3">Seu recorde: {fmtElapsed(vitorias.recorde)}</p>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {marcos.map(m => {
          const ok = desde && elapsed >= m.ms;
          return (
            <div key={m.ms} className={`rounded-2xl p-4 text-center border ${ok ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-400 border-slate-200'}`}>
              <Trophy size={22} className="mx-auto mb-2" />
              <p className="text-sm font-bold">{m.label}</p>
              <p className="text-xs mt-0.5">{ok ? 'conquistado' : 'a caminho'}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Crises atravessadas sem usar</p>
          <p className="text-3xl font-extrabold text-teal-700">{vitorias.totalVencidas || 0}</p>
        </div>
        <Sparkles size={28} className="text-teal-300" />
      </div>
    </Section>
  );
}

function SosSection({ contatos, setContatos }) {
  const [nome, setNome] = useState('');
  const [tel, setTel] = useState('');
  const msg = encodeURIComponent('Estou em risco de usar agora. Me liga.');
  const add = () => {
    const t = tel.replace(/[^0-9+]/g, '');
    if (!nome.trim() || !t || contatos.length >= 2) return;
    setContatos([...contatos, { nome: nome.trim(), tel: t }]);
    setNome(''); setTel('');
  };
  return (
    <Section id="sos" kicker="Na crise, digitar é luxo" title="SOS de 1 Toque">
      <p className="text-slate-600 mb-6 text-sm">Cadastre até duas pessoas agora, com calma. Na crise, um toque liga ou manda a mensagem pronta. Não fique sozinho.</p>

      {contatos.length > 0 && (
        <div className="space-y-3 mb-6">
          {contatos.map((c, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div><p className="font-bold">{c.nome}</p><p className="text-sm text-slate-500">{c.tel}</p></div>
                <button onClick={() => setContatos(contatos.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-600"><Trash2 size={18} /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a href={`tel:${c.tel}`} className="py-3 rounded-xl bg-red-600 text-white font-bold text-center flex items-center justify-center gap-2"><Phone size={18} /> Ligar</a>
                <a href={`sms:${c.tel}?body=${msg}`} className="py-3 rounded-xl bg-teal-700 text-white font-bold text-center flex items-center justify-center gap-2"><MessageCircle size={18} /> Mensagem</a>
              </div>
            </div>
          ))}
        </div>
      )}

      {contatos.length < 2 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-sm font-semibold text-slate-600 mb-3">Adicionar contato de segurança</p>
          <TextInput value={nome} onChange={setNome} placeholder="Nome (ex: João - irmão)" />
          <TextInput value={tel} onChange={setTel} placeholder="Telefone com DDD (ex: 11999998888)" />
          <button onClick={add} className="w-full py-3 rounded-xl bg-teal-700 text-white font-bold mt-1">Salvar contato</button>
          <p className="text-xs text-slate-400 mt-2">Mensagem automática: "Estou em risco de usar agora. Me liga."</p>
        </div>
      )}
    </Section>
  );
}

function EmergenciaSection() {
  const [estado, setEstado] = useState(null);
  const opcoes = [
    { id: 'prestes', label: 'Estou prestes a usar' },
    { id: 'usei', label: 'Acabei de usar' },
    { id: 'perigo', label: 'Estou em perigo agora' },
  ];
  const fluxos = {
    prestes: ['Saia do ambiente onde está agora.', 'Ligue para um contato de segurança pelo SOS e diga onde você está.', 'Vá para um local seguro com outra pessoa.', 'Se a vontade não ceder, ligue para o CVV (188), atendimento 24h e gratuito.'],
    usei: ['Não fique sozinho. Avise alguém de confiança agora.', 'Não dirija e não tome mais nada por cima.', 'Se sentir falta de ar, dor no peito, confusão forte ou sonolência intensa, ligue 192 (SAMU).', 'Quando passar, registre no diário sem se punir. Recaída não apaga o seu progresso.'],
    perigo: ['Se há risco de vida ou violência, ligue 190 (Polícia) ou 192 (SAMU) agora.', 'Saia do local de risco se for possível.', 'Acione um contato de segurança pelo SOS.', 'Procure a emergência mais próxima ou um CAPS AD da sua cidade.'],
  };
  return (
    <Section id="emergencia" kicker="Contenção, sem moralismo" title="Rota de Emergência">
      <p className="text-slate-600 mb-6 text-sm">Marque o que está acontecendo. O app abre o caminho de dano mínimo. O objetivo é só te manter seguro agora.</p>
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        {opcoes.map(o => (
          <button key={o.id} onClick={() => setEstado(o.id)} className={`py-4 rounded-2xl font-bold text-sm border ${estado === o.id ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-700 border-slate-200'}`}>{o.label}</button>
        ))}
      </div>
      {estado && (
        <div className="bg-white border border-red-200 rounded-2xl p-5 mb-6">
          <ol className="space-y-3">
            {fluxos[estado].map((f, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center font-bold shrink-0 text-xs">{i + 1}</span>
                <span className="text-slate-700 pt-0.5">{f}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          { n: 'SAMU', t: '192', d: 'Emergência médica, 24h' },
          { n: 'CVV', t: '188', d: 'Apoio emocional, 24h, gratuito' },
          { n: 'Polícia', t: '190', d: 'Violência ou risco imediato' },
          { n: 'CAPS AD', t: null, d: 'Centro de atenção a álcool e drogas da sua cidade' },
        ].map((r, i) => (
          <div key={i} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
            <div><p className="font-bold">{r.n}</p><p className="text-xs text-slate-500">{r.d}</p></div>
            {r.t && <a href={`tel:${r.t}`} className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center gap-1.5"><Phone size={15} /> {r.t}</a>}
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ============================================================= */
/* NAV                                                           */
/* ============================================================= */
function Nav({ active, onOpenCrise }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    const el = scrollRef.current && scrollRef.current.querySelector(`[data-nav="${active}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [active]);
  return (
    <header className="sticky top-0 z-50 bg-[#FDFAF5]/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-[860px] mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <button onClick={() => scrollToId('inicio')} className="flex items-center gap-2 font-extrabold text-slate-900">
            <span className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center"><Flame size={16} /></span>
            Modo Crise
          </button>
          <button onClick={onOpenCrise} className="px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-bold hidden sm:flex items-center gap-1.5">Tô com vontade agora</button>
        </div>
        <nav ref={scrollRef} className="flex gap-1 overflow-x-auto no-scrollbar pb-2 -mb-px">
          {SECTIONS.map(s => (
            <button key={s.id} data-nav={s.id} onClick={() => scrollToId(s.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${active === s.id ? 'bg-teal-700 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              {s.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

/* ============================================================= */
/* APP                                                           */
/* ============================================================= */
function App() {
  const [criseOpen, setCriseOpen] = useState(false);
  const [active, setActive] = useState('inicio');

  const [plano, setPlano] = usePersist('mc_plano', {});
  const [motivos, setMotivos] = usePersist('mc_motivos', {});
  const [radar, setRadar] = usePersist('mc_radar', {});
  const [contencao, setContencao] = usePersist('mc_contencao', {});
  const [diario, setDiario] = usePersist('mc_diario', []);
  const [contatos, setContatos] = usePersist('mc_contatos', []);
  const [vitorias, setVitorias] = usePersist('mc_vitorias', { totalVencidas: 0, recorde: 0 });

  useEffect(() => {
    const onScroll = () => {
      let cur = 'inicio';
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= 120) cur = s.id;
      }
      setActive(cur);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const onRegistrar = (entry) => {
    setDiario(d => [entry, ...d]);
    if (entry.usou === false) {
      setVitorias(v => ({ ...v, totalVencidas: (v.totalVencidas || 0) + 1, limpoDesde: v.limpoDesde || Date.now() }));
    } else if (entry.usou === true) {
      setVitorias(v => {
        const rec = Math.max(v.recorde || 0, v.limpoDesde ? Date.now() - v.limpoDesde : 0);
        return { ...v, recorde: rec, limpoDesde: Date.now() };
      });
    }
  };

  return (
    <>
      <Nav active={active} onOpenCrise={() => setCriseOpen(true)} />

      <CriseOverlay open={criseOpen} onClose={() => setCriseOpen(false)} onGoto={(t) => setTimeout(() => scrollToId(t), 80)} onRegistrar={onRegistrar} plano={plano} />

      <main className="max-w-[860px] mx-auto px-4">
        <section id="inicio" className="scroll-mt-24 pt-8 pb-4">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700 mb-2">Suporte para atravessar a fissura</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-3">Não decide nada agora.<br />Primeiro você atravessa.</h1>
            <p className="text-slate-600 mb-6 text-sm sm:text-base max-w-xl">Um toque, uma ação, um próximo passo. Este app não vai te dar sermão. Ele te segura nos minutos em que a vontade é mais forte.</p>

            <button onClick={() => setCriseOpen(true)} className="w-full py-7 rounded-3xl bg-red-600 hover:bg-red-500 text-white text-2xl font-extrabold shadow-lg shadow-red-600/20 flex items-center justify-center gap-3 mb-3 active:scale-[0.99] transition-transform">
              <Flame size={28} /> Tô com vontade agora
            </button>
            <button onClick={() => scrollToId('plano')} className="w-full py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-semibold flex items-center justify-center gap-2 mb-6">
              <BookOpen size={18} /> Ver meu plano
            </button>

            <SoPorHoje />

            <div className="grid grid-cols-2 gap-3 mt-3">
              <button onClick={() => scrollToId('vitorias')} className="bg-white border border-slate-200 rounded-2xl p-4 text-left">
                <Trophy size={20} className="text-teal-600 mb-1" />
                <p className="text-sm font-bold">{vitorias.totalVencidas || 0} crises vencidas</p>
                <p className="text-xs text-slate-400">ver vitórias</p>
              </button>
              <button onClick={() => scrollToId('radar')} className="bg-white border border-slate-200 rounded-2xl p-4 text-left">
                <MapPin size={20} className="text-teal-600 mb-1" />
                <p className="text-sm font-bold">Radar de risco</p>
                <p className="text-xs text-slate-400">ver risco de hoje</p>
              </button>
            </div>
          </Reveal>
        </section>

        <PlanoSection plano={plano} setPlano={setPlano} />
        <MotivosSection motivos={motivos} setMotivos={setMotivos} />
        <QuebraSection />
        <RadarSection radar={radar} setRadar={setRadar} />
        <ContencaoSection contencao={contencao} setContencao={setContencao} />
        <DiarioSection diario={diario} setDiario={setDiario} />
        <VitoriasSection vitorias={vitorias} setVitorias={setVitorias} />
        <SosSection contatos={contatos} setContatos={setContatos} />
        <EmergenciaSection />

        <section className="py-10 border-t border-slate-200">
          <Reveal>
            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-5 text-sm text-slate-600 space-y-3">
              <p className="font-bold text-slate-800 flex items-center gap-2"><AlertTriangle size={16} /> Aviso importante</p>
              <p>Este app é uma ferramenta de suporte para atravessar a fissura e momentos de risco. Ele não é tratamento médico nem substitui acompanhamento profissional, terapia ou grupos de apoio.</p>
              <p>Largar álcool, calmantes (clonazepam, alprazolam e similares) ou opioides pode causar abstinência física grave e perigosa. Se você tem sintomas físicos fortes (tremores, convulsão, confusão, alucinação, dor no peito), procure atendimento médico urgente.</p>
              <p>Em emergência ligue 192 (SAMU) ou 190 (Polícia). Para apoio emocional 24h, CVV 188. Procure também o CAPS AD da sua cidade. Seus dados ficam salvos apenas neste aparelho, no navegador.</p>
            </div>
            <p className="text-center text-xs text-slate-400 mt-6">Modo Crise · suporte para atravessar a fissura</p>
          </Reveal>
        </section>
      </main>

      <button onClick={() => setCriseOpen(true)} className="fixed bottom-5 right-5 z-40 sm:hidden w-16 h-16 rounded-full bg-red-600 text-white shadow-xl shadow-red-600/30 flex items-center justify-center active:scale-95 transition-transform">
        <Flame size={28} />
      </button>
    </>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
