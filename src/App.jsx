import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Calendar, Clock, BookOpen, CheckCircle, AlertTriangle, ArrowRight, ArrowLeft,
  Trash2, RefreshCw, Compass, ListTodo, Check, Copy, Printer, Target, BatteryCharging
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const safeGet = (key, fallback) => {
  try { const saved = localStorage.getItem(key); return saved ? JSON.parse(saved) : fallback; }
  catch (e) { return fallback; }
};
const safeSet = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) {}
};

const TASK_TIME_MAP = {
  'Escrita': 2.5,
  'Revisão': 1.5,
  'Formatação': 1.0,
  'Coleta de Dados': 3.0,
  'Análise de Dados': 3.5,
  'Outro': 1.0
};

function App() {
  const [step, setStep] = useState(0);
  const [perfil, setPerfil] = useState(() => safeGet('acad_perfil', { nivel: 'Mestrado', objetivo: 'TCC', prazo: '2026-12-31' }));
  const [horas, setHoras] = useState(() => safeGet('acad_horas', { sono: 56, trabalho: 40, deslocamento: 10, familia: 15, compromissos: 10, lazer: 15 }));
  const [turnos, setTurnos] = useState(() => safeGet('acad_turnos', {
    Segunda: { manha: 0, tarde: 0, noite: 2 },
    Terca: { manha: 0, tarde: 0, noite: 0 },
    Quarta: { manha: 0, tarde: 0, noite: 2 },
    Quinta: { manha: 0, tarde: 0, noite: 0 },
    Sexta: { manha: 0, tarde: 0, noite: 0 },
    Sabado: { manha: 3, tarde: 0, noite: 0 },
    Domingo: { manha: 0, tarde: 2, noite: 0 }
  }));
  const [tarefas, setTarefas] = useState(() => safeGet('acad_tarefas', []));
  const [leituras, setLeituras] = useState(() => safeGet('acad_leituras', []));
  const [novaTarefa, setNovaTarefa] = useState({ nome: '', categoria: 'Escrita', urgencia: 3, importancia: 3 });
  const [novaLeitura, setNovaLeitura] = useState({ titulo: '', paginas: 15, relevancia: 'Media' });
  const [destravarTema, setDestravarTema] = useState('');
  const [destravarDica, setDestravarDica] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => safeSet('acad_perfil', perfil), [perfil]);
  useEffect(() => safeSet('acad_horas', horas), [horas]);
  useEffect(() => safeSet('acad_turnos', turnos), [turnos]);
  useEffect(() => safeSet('acad_tarefas', tarefas), [tarefas]);
  useEffect(() => safeSet('acad_leituras', leituras), [leituras]);

  const totalOcupado = useMemo(() =>
    horas.sono + Number(horas.trabalho) + Number(horas.deslocamento) + Number(horas.familia) + Number(horas.compromissos) + Number(horas.lazer),
    [horas]);
  const horasLivres = useMemo(() => Math.max(0, 168 - totalOcupado), [totalOcupado]);
  const capacidadeRecomendada = useMemo(() => {
    const cap = Math.round(horasLivres * 0.3);
    return cap > 25 ? 25 : (cap < 2 ? 2 : cap);
  }, [horasLivres]);
  const totalHorasMapeadas = useMemo(() => {
    let total = 0;
    Object.values(turnos).forEach(d => { total += (d.manha + d.tarde + d.noite); });
    return total;
  }, [turnos]);
  const tarefasOrdenadas = useMemo(() =>
    [...tarefas].map(t => ({
      ...t,
      score: (Number(t.importancia) * 1.5) + (Number(t.urgencia) * 1.2),
      tempoEstimado: TASK_TIME_MAP[t.categoria] || 1.0,
      tipoItem: 'Tarefa'
    })).sort((a, b) => b.score - a.score),
    [tarefas]);
  const leiturasOrdenadas = useMemo(() => {
    const relevanceWeight = { Alta: 3, Media: 2, Baixa: 1 };
    return [...leituras].map(l => ({
      ...l,
      nome: `Ler: ${l.titulo}`,
      categoria: 'Leitura',
      tempoEstimado: Math.round((l.paginas / 20) * 10) / 10,
      tipoItem: 'Leitura',
      scoreWeight: relevanceWeight[l.relevancia]
    })).sort((a, b) => {
      if (b.scoreWeight !== a.scoreWeight) return b.scoreWeight - a.scoreWeight;
      return a.paginas - b.paginas;
    });
  }, [leituras]);
  const tempoEstimadoTarefas = useMemo(() => {
    const t = tarefasOrdenadas.reduce((acc, t) => acc + t.tempoEstimado, 0);
    const l = leiturasOrdenadas.reduce((acc, l) => acc + l.tempoEstimado, 0);
    return Math.round((t + l) * 10) / 10;
  }, [tarefasOrdenadas, leiturasOrdenadas]);
  const isSobrecarga = tempoEstimadoTarefas > capacidadeRecomendada || tempoEstimadoTarefas > totalHorasMapeadas;

  const cronogramaGerado = useMemo(() => {
    const diasSemana = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];
    const turnosDisponiveis = [];
    diasSemana.forEach(dia => {
      if (turnos[dia].manha > 0) turnosDisponiveis.push({ dia, turno: 'Manhã', horas: turnos[dia].manha, key: `${dia}-manha` });
      if (turnos[dia].tarde > 0) turnosDisponiveis.push({ dia, turno: 'Tarde', horas: turnos[dia].tarde, key: `${dia}-tarde` });
      if (turnos[dia].noite > 0) turnosDisponiveis.push({ dia, turno: 'Noite', horas: turnos[dia].noite, key: `${dia}-noite` });
    });
    const pipeline = [...tarefasOrdenadas, ...leiturasOrdenadas].sort((a, b) => {
      const scoreA = a.tipoItem === 'Tarefa' ? a.score : (a.scoreWeight * 4);
      const scoreB = b.tipoItem === 'Tarefa' ? b.score : (b.scoreWeight * 4);
      return scoreB - scoreA;
    });
    const cronograma = {};
    turnosDisponiveis.forEach(t => { cronograma[t.key] = { horasTurno: t.horas, itens: [] }; });
    let pipelineIndex = 0;
    turnosDisponiveis.forEach(slot => {
      let horasRestantes = slot.horas;
      while (horasRestantes >= 0.5 && pipelineIndex < pipeline.length) {
        const item = pipeline[pipelineIndex];
        cronograma[slot.key].itens.push(item);
        horasRestantes -= item.tempoEstimado;
        pipelineIndex++;
      }
    });
    return { cronograma, turnosDisponiveis, itensExcedentes: pipeline.slice(pipelineIndex) };
  }, [turnos, tarefasOrdenadas, leiturasOrdenadas]);

  const metaMinima = useMemo(() => {
    if (perfil.nivel === 'Doutorado' || perfil.nivel === 'Mestrado') {
      return { escrita: "Escrever 400 palavras fundamentadas", leitura: "Fichamento rápido de 1 artigo chave" };
    }
    return { escrita: "Escrever 250 palavras (1 página)", leitura: "Ler 10 páginas do texto principal" };
  }, [perfil.nivel]);

  const handleAddTarefa = (e) => {
    e.preventDefault();
    if (!novaTarefa.nome.trim()) return;
    setTarefas([...tarefas, { ...novaTarefa, id: Date.now(), concluida: false }]);
    setNovaTarefa({ nome: '', categoria: 'Escrita', urgencia: 3, importancia: 3 });
  };
  const handleAddLeitura = (e) => {
    e.preventDefault();
    if (!novaLeitura.titulo.trim()) return;
    setLeituras([...leituras, { ...novaLeitura, id: Date.now() }]);
    setNovaLeitura({ titulo: '', paginas: 15, relevancia: 'Media' });
  };
  const handleRemoveTarefa = (id) => setTarefas(tarefas.filter(t => t.id !== id));
  const handleRemoveLeitura = (id) => setLeituras(leituras.filter(l => l.id !== id));
  const handleDestravar = (secao) => {
    setDestravarTema(secao);
    const dicas = {
      'Introdução': "Responda numa frase direta: 'Por que este tema merece ser pesquisado e qual dor ele resolve?'. Escreva sem apagar por 10 minutos.",
      'Metodologia': "Liste o passo a passo como uma receita de bolo: 1º Como coletou os dados, 2º Como organizou, 3º Que autores dão suporte.",
      'Referencial': "Escreva 3 ideias soltas de autores que leu recentemente. Em seguida, crie uma frase sua que conecte as três opiniões.",
      'Conclusao': "Retome o seu objetivo geral. Escreva: 'Esta pesquisa alcançou seu objetivo porque...'. Seja direto e depois liste as limitações."
    };
    setDestravarDica(dicas[secao] || "Lembre-se: O primeiro rascunho tem apenas uma missão - existir.");
  };
  const handleReset = () => {
    if (confirm("Deseja redefinir o organizador e começar do zero?")) {
      localStorage.clear(); window.location.reload();
    }
  };
  const handleCopyPlan = () => {
    let texto = `*MEU PLANO ACADÊMICO SEMANAL*\nFoco: ${perfil.objetivo} (${perfil.nivel})\n\n*CRONOGRAMA:*\n`;
    ['Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo'].forEach(dia => {
      const slots = [];
      ['manha','tarde','noite'].forEach(turno => {
        const ct = cronogramaGerado.cronograma[`${dia}-${turno}`];
        if (ct && ct.horasTurno > 0) {
          const itensNomes = ct.itens.length > 0 ? ct.itens.map(i => i.nome).join(' + ') : 'Estudo Autônomo';
          slots.push(`${turno.toUpperCase()} (${ct.horasTurno}h): ${itensNomes}`);
        }
      });
      if (slots.length > 0) texto += `- ${dia === 'Terca'?'Terça':dia==='Sabado'?'Sábado':dia}:\n  ${slots.join('\n  ')}\n`;
    });
    texto += `\n*META MÍNIMA:*\n- ${metaMinima.escrita}\n- ${metaMinima.leitura}`;
    const ta = document.createElement("textarea");
    ta.value = texto; ta.style.position = "fixed"; ta.style.left = "-9999px";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); setCopiado(true); setTimeout(() => setCopiado(false), 3000); } catch (e) {}
    finally { document.body.removeChild(ta); }
  };

  const pieData = [
    { name: 'Sono', value: Number(horas.sono), color: '#3B82F6' },
    { name: 'Trabalho', value: Number(horas.trabalho), color: '#10B981' },
    { name: 'Deslocamento', value: Number(horas.deslocamento), color: '#F59E0B' },
    { name: 'Família', value: Number(horas.familia), color: '#EC4899' },
    { name: 'Compromissos', value: Number(horas.compromissos), color: '#8B5CF6' },
    { name: 'Lazer', value: Number(horas.lazer), color: '#64748B' },
    { name: 'Disponível', value: horasLivres, color: '#22C55E' }
  ].filter(item => item.value > 0);

  return (
    <div className="w-full">
      <header className="flex items-center justify-between border-b border-slate-200/60 pb-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Compass className="w-6 h-6" /></div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Organizador Acadêmico</h1>
            <p className="text-xs text-slate-500">Desenhe um plano de estudos blindado contra a realidade</p>
          </div>
        </div>
        {step > 0 && <button onClick={handleReset} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"><RefreshCw className="w-3.5 h-3.5" /><span>Resetar</span></button>}
      </header>

      {step > 0 && (
        <div className="mb-6 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span>Progresso Estratégico</span><span className="text-indigo-600">{step}/5 Concluído</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${(step / 5) * 100}%` }}></div>
          </div>
        </div>
      )}

      {/* TELA 0 */}
      {step === 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm text-center max-w-[680px] mx-auto mt-8">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6"><Calendar className="w-8 h-8" /></div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-4">Organizador Acadêmico Semanal</h2>
          <p className="text-slate-600 text-lg mb-6 leading-relaxed">Você não precisa de mais motivação. Você precisa de um planeamento honesto com as horas que realmente possui nos próximos 7 dias.</p>
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-sm text-left mb-8 flex gap-3">
            <Target className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div><strong className="font-semibold block mb-1">Seja Realista.</strong>O mínimo bem feito é mil vezes melhor do que o plano perfeito que nunca sai do papel.</div>
          </div>
          <button onClick={() => setStep(1)} className="w-full md:w-auto inline-flex items-center justify-center px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md gap-2">
            <span>Criar o meu plano real em 5 min</span><ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ETAPA 1 */}
      {step === 1 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 md:p-8 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-6">1. Defina o seu Alvo</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Qual seu nível acadêmico?</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['Graduação', 'Especialização', 'Mestrado', 'Doutorado'].map(nv => (
                  <button key={nv} type="button" onClick={() => setPerfil({ ...perfil, nivel: nv })}
                    className={`py-3 px-4 border rounded-xl text-sm font-medium transition-all ${perfil.nivel === nv ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-600'}`}>{nv}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Foco da Produção:</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['TCC', 'Artigo', 'Dissertação', 'Tese', 'Projeto', 'Defesa'].map(obj => (
                  <button key={obj} type="button" onClick={() => setPerfil({ ...perfil, objetivo: obj })}
                    className={`py-2.5 px-3 border rounded-xl text-xs font-medium transition-all ${perfil.objetivo === obj ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-600'}`}>{obj}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Próximo Prazo Oficial:</label>
              <input type="date" value={perfil.prazo} onChange={(e) => setPerfil({ ...perfil, prazo: e.target.value })}
                className="w-full max-w-xs px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="flex justify-end mt-8 pt-4 border-t">
            <button onClick={() => setStep(2)} className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl flex items-center gap-2">Calcular meu tempo livre <ArrowRight className="w-4 h-4"/></button>
          </div>
        </div>
      )}

      {/* ETAPA 2 */}
      {step === 2 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 md:p-8 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-2">2. Raio-X do Tempo Verdadeiro</h3>
          <p className="text-sm text-slate-500 mb-6">Seja absolutamente honesto. Descontaremos as suas obrigações reais para encontrar o seu fôlego acadêmico.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-5">
              {[
                {label: "Sono (por noite)", key: "sono", min: 35, max: 70, step: 7, disp: Math.round(horas.sono/7)+"h"},
                {label: "Trabalho / Emprego (semana)", key: "trabalho", min: 0, max: 60, step: 2, disp: horas.trabalho+"h"},
                {label: "Deslocamento / Trânsito (semana)", key: "deslocamento", min: 0, max: 25, step: 1, disp: horas.deslocamento+"h"},
                {label: "Família & Casa (semana)", key: "familia", min: 0, max: 40, step: 1, disp: horas.familia+"h"},
                {label: "Compromissos Fixos (aulas, igreja)", key: "compromissos", min: 0, max: 30, step: 1, disp: horas.compromissos+"h"},
                {label: "Lazer & Telas (Netflix, Celular)", key: "lazer", min: 0, max: 30, step: 1, disp: horas.lazer+"h"}
              ].map(campo => (
                <div key={campo.key}>
                  <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700"><span>{campo.label}</span><span className="text-indigo-600">{campo.disp}</span></div>
                  <input type="range" min={campo.min} max={campo.max} step={campo.step} value={horas[campo.key]}
                    onChange={(e) => setHoras({ ...horas, [campo.key]: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none accent-indigo-600" />
                </div>
              ))}
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex flex-col items-center text-center">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Balanço das 168 Horas</h4>
              <div className="w-full h-40">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(val) => `${val} horas`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="text-xs text-slate-400">Tempo Livre Bruto:</p>
                <p className="text-3xl font-extrabold text-slate-800 my-1">{horasLivres}h</p>
              </div>
              <div className="mt-4 w-full pt-4 border-t border-slate-200">
                <p className="text-[10px] font-bold text-indigo-700 uppercase">Capacidade Acadêmica Segura:</p>
                <p className="text-xl font-black text-indigo-600 mt-1">{capacidadeRecomendada}h / semana</p>
                <div className="mt-2 text-[10px] text-slate-500 bg-white p-2 rounded border border-slate-100 leading-relaxed text-left flex gap-2 items-start">
                  <BatteryCharging className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Esta é uma <strong>quantidade de horas segura</strong>. Ultrapassar este limite aumenta o risco de <strong>burnout</strong>.</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-between mt-8 pt-4 border-t">
            <button onClick={() => setStep(1)} className="px-5 py-2.5 text-sm text-slate-500 hover:bg-slate-50 rounded-xl flex items-center gap-2"><ArrowLeft className="w-4 h-4"/> Voltar</button>
            <button onClick={() => setStep(3)} className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl flex items-center gap-2">Mapear Janelas <ArrowRight className="w-4 h-4"/></button>
          </div>
        </div>
      )}

      {/* ETAPA 3 */}
      {step === 3 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 md:p-8 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-2">3. Mapa de Disponibilidade Diária</h3>
          <p className="text-sm text-slate-500 mb-6">Em quais momentos você <strong>realmente</strong> consegue sentar para estudar? Mesmo 1 hora focada já faz a diferença!</p>
          <div className="overflow-x-auto rounded-xl border border-slate-100 mb-6">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr><th className="p-3">Dia</th><th className="p-3 text-center">Manhã</th><th className="p-3 text-center">Tarde</th><th className="p-3 text-center">Noite</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.keys(turnos).map(dia => (
                  <tr key={dia} className="hover:bg-slate-50/40">
                    <td className="p-3 font-semibold text-slate-700">{dia === 'Terca'?'Terça':dia==='Sabado'?'Sábado':dia}</td>
                    {['manha','tarde','noite'].map(turno => (
                      <td key={turno} className="p-2 text-center">
                        <select value={turnos[dia][turno]}
                          onChange={(e) => setTurnos({...turnos, [dia]: { ...turnos[dia], [turno]: Number(e.target.value) }})}
                          className={`w-full max-w-[80px] mx-auto text-xs font-semibold p-2 border rounded-lg outline-none cursor-pointer ${turnos[dia][turno] > 0 ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-400'}`}>
                          <option value="0">- Indisp. -</option>
                          {[1,2,3,4,5].map(h => <option key={h} value={h}>{h} h</option>)}
                        </select>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 text-sm">
            <span className="text-indigo-900">Total de horas alocadas:</span>
            <span className="text-lg font-black text-indigo-600">{totalHorasMapeadas}h na semana</span>
          </div>
          <div className="flex justify-between mt-8 pt-4 border-t">
            <button onClick={() => setStep(2)} className="px-5 py-2.5 text-sm text-slate-500 hover:bg-slate-50 rounded-xl flex items-center gap-2"><ArrowLeft className="w-4 h-4"/> Voltar</button>
            <button onClick={() => setStep(4)} className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl flex items-center gap-2">Inventário de Tarefas <ArrowRight className="w-4 h-4"/></button>
          </div>
        </div>
      )}

      {/* ETAPA 4 */}
      {step === 4 && (
        <div className="space-y-8">
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-sm">
            <h4 className="font-bold text-amber-900 text-sm">Incentivo do Orientador Digital:</h4>
            <p className="text-amber-800 text-xs mt-1">Seja realista. O mínimo bem feito é muito melhor do que o perfeito que nunca sai do papel.</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><ListTodo className="w-5 h-5 text-indigo-600"/> A. Suas Tarefas de Produção</h3>
            <form onSubmit={handleAddTarefa} className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-5"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">O que precisa ser feito?</label><input type="text" value={novaTarefa.nome} onChange={e => setNovaTarefa({...novaTarefa, nome: e.target.value})} className="w-full text-sm p-2 border rounded-md" placeholder="Ex: Ajustar introdução" /></div>
              <div className="md:col-span-3"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Categoria</label><select value={novaTarefa.categoria} onChange={e => setNovaTarefa({...novaTarefa, categoria: e.target.value})} className="w-full text-sm p-2 border rounded-md">{Object.keys(TASK_TIME_MAP).map(c=><option key={c}>{c}</option>)}</select></div>
              <div className="md:col-span-2"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Urgente (1-5)</label><select value={novaTarefa.urgencia} onChange={e => setNovaTarefa({...novaTarefa, urgencia: e.target.value})} className="w-full text-sm p-2 border rounded-md">{[1,2,3,4,5].map(v=><option key={v}>{v}</option>)}</select></div>
              <div className="md:col-span-2"><button type="submit" className="w-full bg-indigo-600 text-white font-bold text-sm p-2 rounded-md hover:bg-indigo-700">Adicionar</button></div>
            </form>
            <div className="space-y-2">
              {tarefas.length === 0 && <p className="text-xs text-slate-400 italic text-center p-4">Nenhuma tarefa. Adicione acima.</p>}
              {tarefas.map(t => (
                <div key={t.id} className="flex justify-between items-center bg-white border border-slate-100 p-3 rounded-lg hover:border-slate-300 transition-colors">
                  <div><span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded mr-2">{t.categoria}</span><span className="text-sm font-semibold">{t.nome}</span></div>
                  <div className="flex items-center gap-3"><span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">~{TASK_TIME_MAP[t.categoria]}h</span><button onClick={()=>handleRemoveTarefa(t.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><BookOpen className="w-5 h-5 text-indigo-600"/> B. Seus Textos e Leituras</h3>
            <form onSubmit={handleAddLeitura} className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-5"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Título do Artigo/Livro</label><input type="text" value={novaLeitura.titulo} onChange={e => setNovaLeitura({...novaLeitura, titulo: e.target.value})} className="w-full text-sm p-2 border rounded-md" placeholder="Ex: Autor - Metodologia..." /></div>
              <div className="md:col-span-2"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nº Páginas</label><input type="number" min="1" value={novaLeitura.paginas} onChange={e => setNovaLeitura({...novaLeitura, paginas: e.target.value})} className="w-full text-sm p-2 border rounded-md" /></div>
              <div className="md:col-span-3"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Relevância</label><select value={novaLeitura.relevancia} onChange={e => setNovaLeitura({...novaLeitura, relevancia: e.target.value})} className="w-full text-sm p-2 border rounded-md"><option>Alta</option><option>Media</option><option>Baixa</option></select></div>
              <div className="md:col-span-2"><button type="submit" className="w-full bg-indigo-600 text-white font-bold text-sm p-2 rounded-md hover:bg-indigo-700">Adicionar</button></div>
            </form>
            <div className="space-y-2">
              {leituras.length === 0 && <p className="text-xs text-slate-400 italic text-center p-4">Nenhuma leitura cadastrada.</p>}
              {leituras.map(l => (
                <div key={l.id} className="flex justify-between items-center bg-white border border-slate-100 p-3 rounded-lg hover:border-slate-300">
                  <div><span className={`text-[10px] font-bold px-2 py-0.5 rounded mr-2 ${l.relevancia==='Alta'?'bg-red-50 text-red-700':l.relevancia==='Media'?'bg-amber-50 text-amber-700':'bg-slate-100 text-slate-600'}`}>{l.relevancia}</span><span className="text-sm font-semibold">{l.titulo}</span></div>
                  <div className="flex items-center gap-3"><span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">~{Math.round((l.paginas/20)*10)/10}h</span><button onClick={()=>handleRemoveLeitura(l.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between mt-8">
            <button onClick={() => setStep(3)} className="px-5 py-2.5 text-sm text-slate-500 hover:bg-slate-50 rounded-xl flex items-center gap-2"><ArrowLeft className="w-4 h-4"/> Voltar</button>
            <button onClick={() => setStep(5)} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black tracking-wide rounded-xl shadow-lg flex items-center gap-2">GERAR MEU DIAGNÓSTICO <ArrowRight className="w-5 h-5"/></button>
          </div>
        </div>
      )}

      {/* ETAPA 5 */}
      {step === 5 && (
        <div className="space-y-8">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 md:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <div><span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">Diagnóstico Final</span><h2 className="text-2xl font-extrabold text-slate-900">Seu Plano Executável</h2></div>
              <div className="flex gap-2 mt-3 md:mt-0">
                <button onClick={handleCopyPlan} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5">{copiado?<Check className="w-3.5 h-3.5 text-emerald-600"/>:<Copy className="w-3.5 h-3.5"/>} Copiar</button>
                <button onClick={()=>window.print()} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5"><Printer className="w-3.5 h-3.5"/> Imprimir</button>
              </div>
            </div>
            {isSobrecarga ? (
              <div className="bg-red-50 border border-red-200 text-red-900 p-5 rounded-xl flex gap-4 items-start">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <strong className="font-black text-red-800 text-base block mb-2">Alerta de Sobrecarga!</strong>
                  <p>Você registrou tarefas que exigirão <strong>~{tempoEstimadoTarefas}h</strong>, mas mapeou apenas <strong>{totalHorasMapeadas}h</strong> disponíveis (capacidade ideal: {capacidadeRecomendada}h).</p>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-xl flex gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div className="text-sm"><strong className="font-black">Planeamento Sustentável.</strong> A quantidade de tarefas cabe nas horas que separou. Comece a executar!</div>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-6 md:p-8 shadow-sm">
            <h3 className="text-lg font-extrabold text-slate-900 mb-2 flex items-center gap-2"><Calendar className="w-5 h-5 text-indigo-600"/> O que fazer e quando:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo'].map(dia => {
                if (turnos[dia].manha===0 && turnos[dia].tarde===0 && turnos[dia].noite===0) return null;
                return (
                  <div key={dia} className="border border-slate-200 p-4 rounded-xl shadow-sm bg-white">
                    <h4 className="font-bold text-sm text-indigo-900 mb-3 border-b pb-2">{dia === 'Terca'?'Terça':dia==='Sabado'?'Sábado':dia}</h4>
                    <div className="space-y-3">
                      {['manha','tarde','noite'].map(turno => {
                        if (turnos[dia][turno] === 0) return null;
                        const slot = cronogramaGerado.cronograma[`${dia}-${turno}`];
                        return (
                          <div key={turno} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] font-black uppercase text-slate-500 bg-white px-2 py-0.5 rounded border shadow-sm">{turno === 'manha'?'Manhã':turno==='tarde'?'Tarde':'Noite'}</span>
                              <span className="text-[10px] font-bold text-indigo-500">{slot.horasTurno}h</span>
                            </div>
                            {slot.itens.length > 0 ? (
                              <ul className="space-y-1.5 mt-2">
                                {slot.itens.map((item, idx) => (
                                  <li key={idx} className="text-xs font-semibold text-slate-800 flex gap-1.5 items-start">
                                    <span className="text-emerald-500 mt-0.5">▪</span>
                                    <span>{item.nome} <span className="font-normal text-slate-400">(~{item.tempoEstimado}h)</span></span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-slate-500 italic mt-2">Tempo livre para Revisão ou Leituras.</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            {cronogramaGerado.itensExcedentes.length > 0 && (
              <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <h4 className="text-xs font-bold text-amber-900 uppercase mb-2">Backlog (próxima semana):</h4>
                <div className="flex flex-wrap gap-2">{cronogramaGerado.itensExcedentes.map((i, idx) => <span key={idx} className="text-[10px] bg-white border border-amber-100 text-amber-800 px-2 py-1 rounded">{i.nome} (~{i.tempoEstimado}h)</span>)}</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-lg">
              <h3 className="text-sm font-black text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Target className="w-5 h-5"/> A Regra de Ouro (MVP)</h3>
              <ul className="space-y-3 text-sm font-semibold">
                <li className="flex gap-3"><CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0"/> <span>{metaMinima.escrita}</span></li>
                <li className="flex gap-3"><CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0"/> <span>{metaMinima.leitura}</span></li>
              </ul>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-indigo-600"/> Técnica Pomodoro</h3>
              <ol className="list-decimal pl-4 space-y-1 text-xs font-medium text-slate-700">
                <li>Foco total por <strong>25 minutos</strong>.</li>
                <li>Pausa de <strong>5 minutos</strong>.</li>
                <li>Após 4 ciclos, pausa longa de 20 minutos.</li>
              </ol>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm text-center">
            <h3 className="text-sm font-black uppercase text-slate-400 mb-4">Síndrome da Página em Branco?</h3>
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {['Introdução','Metodologia','Referencial','Conclusao'].map(s => (
                <button key={s} onClick={() => handleDestravar(s)}
                  className={`px-4 py-2 border rounded-full text-xs font-bold transition-all ${destravarTema === s ? 'bg-amber-100 border-amber-300 text-amber-900' : 'hover:bg-slate-50 text-slate-600'}`}>Destravar {s}</button>
              ))}
            </div>
            {destravarDica && <p className="text-sm text-indigo-900 bg-indigo-50 border border-indigo-100 p-4 rounded-xl mx-auto max-w-xl font-medium">{destravarDica}</p>}
          </div>

          <div className="flex justify-center pb-8">
            <button onClick={() => setStep(4)} className="text-xs text-slate-400 hover:text-indigo-600 underline">Voltar e ajustar o planeamento</button>
          </div>
        </div>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
