/* ═══════════════════════════════════════════════════════════════
   MOTOR — regras do Manual de Processos MK3 v1.0 + render.
   Régua da MK3: 2 DIAS ÚTEIS em toda etapa de entrega e aprovação.
   ═══════════════════════════════════════════════════════════════ */

const HOJE = new Date(); HOJE.setHours(0,0,0,0);

const d    = s => { const [a,m,x]=s.split("-").map(Number); return new Date(a,m-1,x); };
const iso  = t => t.getFullYear()+"-"+String(t.getMonth()+1).padStart(2,"0")+"-"+String(t.getDate()).padStart(2,"0");
const addD = (s,n)=>{ const x=d(s); x.setDate(x.getDate()+n); return iso(x); };
const addM = (s,n)=>{ const x=d(s); x.setMonth(x.getMonth()+n); return iso(x); };
const fmt  = s => s ? d(s).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit"}) : "—";
const dow  = s => s ? d(s).toLocaleDateString("pt-BR",{weekday:"short"}).replace(".","") : "";
const dias = s => Math.round((d(s)-HOJE)/86400000);

/* soma N dias ÚTEIS (pula sábado e domingo) */
const uteis = (s,n) => {
  if(!s) return null;
  let x = d(s), c = 0;
  while(c < n){ x.setDate(x.getDate()+1); const w = x.getDay(); if(w!==0 && w!==6) c++; }
  return iso(x);
};
const PRAZO = 2;

/* quantos dias ÚTEIS separam o limite da data real (0 = no prazo) */
const uteisEntre = (limite, real) => {
  if(!limite || !real || real <= limite) return 0;
  let n=0, x=d(limite);
  while(iso(x) < real){ x.setDate(x.getDate()+1); const w=x.getDay(); if(w!==0&&w!==6) n++; }
  return n;
};
const maiorData = (a,b) => !a ? b : !b ? a : (a>b ? a : b);

/* ---------------- REGRAS ---------------- */
/* Conclusão de uma tarefa. Em `concluidas` aceita:
   - "id"            -> concluído (sem data, assume no prazo)
   - {id, data}      -> concluído naquela data (o painel calcula prazo/atraso) */
const conclusaoDe = (c, id) => {
  for(const e of (c.concluidas||[])){
    if(e === id) return {feita:true, data:null};
    if(e && e.id === id) return {feita:true, data:e.data||null};
  }
  return {feita:false, data:null};
};

function regras(c){
  const T=[];
  const add=(id,fase,tarefa,detalhe,data,resp)=>{
    const cc=conclusaoDe(c,id);
    T.push({id,fase,tarefa,detalhe,data,resp,cliente:c.nome,clienteId:c.id,
      feita:cc.feita, dataConclusao:cc.data});
  };

  /* PARTE A — ENTRADA (âncora: assinatura) */
  const D0=c.entrada;
  add("pasta","Entrada","Duplicar pasta modelo e renomear","[SEGMENTO] "+c.nome,D0,"Estagiário");
  add("grupo","Entrada","Criar grupo de WhatsApp","MK3 - "+c.nome.toUpperCase()+", com foto da marca",D0,"Estagiário");
  add("boasvindas","Entrada","Mensagem de boas-vindas","No grupo, com os próximos passos",D0,"Estagiário");
  add("onboarding","Entrada","Enviar onboarding","Por WhatsApp e por e-mail",D0,"Estagiário");
  add("acessos","Entrada","Coletar acessos","Instagram, Facebook, LinkedIn e demais",D0,"Estagiário");
  add("prints","Entrada","Print das redes na chegada","Antes de qualquer ação · 02 → 04 Registro visual",D0,"Estagiário");
  add("reserva","Entrada","Código de reserva 2FA","Print salvo em 01. Acessos",D0,"Estagiário");

  const antesIm = c.imersao ? addD(c.imersao,-1) : null;
  add("pesq1","Entrada","Pesquisa de comportamento de consumo","Antes da imersão",antesIm,"Analista");
  add("pesq2","Entrada","Pesquisa de mercado e demanda","Antes da imersão",antesIm,"Analista");
  add("imersao","Entrada","Reunião de imersão","Google Agenda · convite por e-mail e WhatsApp",c.imersao,"Analista");
  add("imersaoDoc","Entrada","Tratar o documento da imersão","IA organiza, analista revisa · 03. Imersão",
      c.imersao?uteis(c.imersao,1):null,"Analista");
  add("reuniaoPlan","Entrada","Reunião de planejamento (entrada)","Temas, datas do negócio, tráfego",
      c.reuniaoPlanejamentoEntrada,"Analista");

  /* 1º CICLO — cadeia de 2 dias úteis. Cada etapa re-ancora na data
     REAL quando ela existe; sem data real, usa o limite do prazo. */
  const R = c.reuniaoPlanejamentoEntrada;
  if(R){
    const limEnvPlan  = uteis(R, PRAZO);
    const baseEnvPlan = c.envioPlanejamento || limEnvPlan;
    const lembPlan    = uteis(baseEnvPlan, 1);
    const limAprPlan  = uteis(baseEnvPlan, PRAZO);
    const baseAprPlan = c.aprovacaoPlanejamento || limAprPlan;
    /* se as artes dependem das fotos, elas só começam a contar depois da gravação */
    const gatilhoArtes = c.artesDependemDaGravacao && c.gravacao
                       ? maiorData(baseAprPlan, c.gravacao) : baseAprPlan;
    const limArtes    = uteis(gatilhoArtes, PRAZO);
    const baseEnvMid  = c.envioMidia || limArtes;
    const lembMid     = uteis(baseEnvMid, 1);
    const limAprMid   = uteis(baseEnvMid, PRAZO);
    const baseAprMid  = c.aprovacaoMidia || limAprMid;

    add("c1_plan","1º ciclo","Criar e enviar o planejamento ao cliente","2 dias úteis após a reunião · abre o prazo de 48h úteis",limEnvPlan,"Analista");
    add("c1_lembPlan","1º ciclo","Lembrete de aprovação do planejamento","1 dia útil sem retorno",lembPlan,"Analista");
    add("c1_aprPlan","1º ciclo","Aprovação do planejamento","Limite: 2 dias úteis · sem retorno = aprovado automaticamente",limAprPlan,"Cliente");
    /* só existe quando o cliente REALMENTE pediu alteração (se aprovou, não pediu) */
    if(c.alteracaoPedida)
      add("c1_ajuste","1º ciclo","Devolver a alteração pedida",
          "Alteração pedida em "+fmt(c.alteracaoPedida)+" · 2 dias úteis para devolver",
          uteis(c.alteracaoPedida,PRAZO),"Analista");
    add("c1_roteiro","1º ciclo","Enviar roteiro à produtora",
        "No mesmo dia da aprovação do planejamento", baseAprPlan, "Analista");
    if(c.gravacao)
      add("c1_gravacao","1º ciclo",c.semFotos?"Gravação":"Gravação + fotos","Manhã, 8h às 17h"+(c.artesDependemDaGravacao?" · insumo das artes":""),c.gravacao,"Produtora / Cliente");
    else
      add("c1_gravacao","1º ciclo","Agendar diária de gravação","Manhã, 8h às 17h · régua a confirmar",null,"Analista / Estagiário");
    add("c1_artes","1º ciclo","Criar as artes",
        (c.artesDependemDaGravacao && c.gravacao)
          ? "2 dias úteis após a gravação · depende das fotos de "+fmt(c.gravacao)
          : "2 dias úteis após a aprovação do planejamento",
        limArtes,"Analista / Design");
    add("c1_lembMid","1º ciclo","Lembrete de aprovação das artes","1 dia útil sem retorno",lembMid,"Analista");
    add("c1_aprMid","1º ciclo","Aprovação das artes","Limite: 2 dias úteis · aprovado = entra no Pode Postar",limAprMid,"Cliente");
    const temAgendamento = !c.escopo || c.escopo.agendamento !== false;
    if(temAgendamento)
      add("c1_podepostar","1º ciclo","Peças no Pode Postar","Automático na aprovação",baseAprMid,"Sistema");
    else
      add("c1_entrega","1º ciclo","Entregar as peças ao cliente",
          "Contrato não inclui agendamento · a cliente publica",baseAprMid,"Analista");
    add("c1_calendario","1º ciclo","Enviar à gestão o planejamento com as datas de postagem","",baseAprMid,"Analista");
  }

  /* GATILHOS RECORRENTES */
  add("reserva3m","Recorrente","Atualizar código de reserva","A cada 3 meses",addM(D0,3),"Estagiário");
  add("pesq6m","Recorrente","Atualizar as duas pesquisas","A cada 6 meses",addM(D0,6),"Analista");
  add("renov","Recorrente","Renovação de contrato (administrativo)","20 dias antes do vencimento",
      c.vencimentoContrato?addD(c.vencimentoContrato,-20):null,"Gestão");
  if(c.vencimentoContrato)
    add("acaoComercial","Contrato","Ação comercial — contrato encerra em 1 semana",
        "Contato para renovação/negociação com o cliente",addD(c.vencimentoContrato,-7),"Gestão");
  add("fimContrato","Contrato","Encerramento do contrato",
      c.contrato?("Contrato "+c.contrato):"",c.vencimentoContrato,"Gestão");

  if(c.vencimentoContrato){
    /* entrega integral dos materiais: até o fim da vigência,
       com tolerância de 10 dias úteis depois (cláusula 4.f) */
    add("entregaMateriais","Contrato","Entregar todos os materiais produzidos",
        "Artes, textos e editáveis · tolerância até "+fmt(uteis(c.vencimentoContrato,10)),
        c.vencimentoContrato,"Analista");
  }

  /* mensalidade: todo dia 20 enquanto o contrato estiver vigente */
  if(c.mensalidade && c.vencimentoContrato){
    const dia = c.mensalidade.diaVencimento;
    let m = new Date(d(c.inicioContrato||D0).getFullYear(), d(c.inicioContrato||D0).getMonth(), dia);
    let i = 0;
    while(iso(m) <= c.vencimentoContrato && i < 36){
      const s2 = iso(m);
      if(s2 >= (c.inicioContrato||D0))
        add("pag_"+s2,"Contrato","Mensalidade — R$ "+c.mensalidade.valorPix+" PIX + R$ "+
            c.mensalidade.valorPermuta+" permuta","Vencimento dia "+dia,s2,"Cliente");
      m.setMonth(m.getMonth()+1); i++;
    }
  }

  /* CICLO MENSAL PADRÃO — repete a cada mês de vigência, a partir de inicioCicloPadrao
     (ou do mês seguinte à entrada). Gera relatório, reunião mensal, planejamento e mídia
     de CADA mês, com ids sufixados por AAAA-MM. Reuniões pedem Meet + agenda + convite. */
  const e=d(D0);
  let ini = c.inicioCicloPadrao
    ? new Date(Number(c.inicioCicloPadrao.split("-")[0]), Number(c.inicioCicloPadrao.split("-")[1])-1, 1)
    : new Date(e.getFullYear(), e.getMonth()+1, 1);
  const fimCiclos = c.vencimentoContrato ? d(c.vencimentoContrato)
                                         : new Date(ini.getFullYear(), ini.getMonth()+1, 1);
  let _gi=0;
  for(let mref=new Date(ini); mref<=fimCiclos && _gi<24; mref.setMonth(mref.getMonth()+1), _gi++){
    const ano=mref.getFullYear(), mes=mref.getMonth()+1;
    const sfx="_"+ano+"-"+String(mes).padStart(2,"0");
    const dd=n=>ano+"-"+String(mes).padStart(2,"0")+"-"+String(n).padStart(2,"0");
    const ult=new Date(ano,mes,0).getDate();
    const cic="Ciclo "+mref.toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
    add("relatorio"+sfx,"Ciclo padrão","Gerar relatório mensal","Início da semana 3 · "+cic,dd(15),"Analista");
    add("reuMensal"+sfx,"Ciclo padrão","Reunião mensal","Janela: dias 15 a 20 · criar Meet, registrar na agenda e enviar convite · "+cic,dd(20),"Analista");
    add("envRelat"+sfx,"Ciclo padrão","Enviar relatório ao cliente","E-mail, no dia da reunião ou no útil seguinte · "+cic,dd(21),"Analista");
    add("planej"+sfx,"Ciclo padrão","Criar o planejamento","Após a reunião · aprovação interna da gestão · "+cic,dd(23),"Analista");
    add("envPlanej"+sfx,"Ciclo padrão","Enviar planejamento ao cliente","Abre o prazo de 48h úteis · "+cic,dd(24),"Analista");
    add("midia"+sfx,"Ciclo padrão","Produzir a mídia","Semana 4 · "+cic,dd(28),"Analista");
    add("agendado"+sfx,"Ciclo padrão","Conteúdo agendado","Pronto para publicar no dia 1 · "+cic,dd(ult),"Analista");
  }

  /* TAREFAS EXTRAS por cliente (itens fora do padrão: pagamentos a fornecedor, etc.) */
  (c.tarefasExtras||[]).forEach((t,i)=>add(t.id||("extra"+i), t.fase||"Outros", t.tarefa, t.detalhe||"", t.data||null, t.resp||"MK3"));

  return T;
}

function contadores(c){
  const out=[];
  const mk=(tipo,envio,aprov)=>{
    if(!envio || aprov) return;
    out.push({cliente:c.nome,tipo,enviado:envio,lembrete:uteis(envio,1),vencimento:uteis(envio,PRAZO)});
  };
  mk("planejamento", c.envioPlanejamento, c.aprovacaoPlanejamento);
  mk("mídia",        c.envioMidia,        c.aprovacaoMidia);
  return out;
}

/* ---------------- ATRASOS ---------------- */
/* Compara o limite da regra com a data real. Só registra o que já
   aconteceu — nada de previsão. */
function atrasos(c){
  const out=[];
  const just = etapa => (c.justificados||[]).find(j=>j.etapa===etapa);
  const reg=(etapa,quem,limite,real)=>{
    if(!limite || !real) return;
    const n = uteisEntre(limite, real);
    if(n>0){
      const j = just(etapa);
      out.push({cliente:c.nome, etapa, quem, limite, real, dias:n,
                justificado: !!j, motivo: j ? j.motivo : null});
    }
  };
  const R = c.reuniaoPlanejamentoEntrada;
  if(!R) return out;

  const limEnvPlan  = uteis(R, PRAZO);
  reg("Entrega do planejamento","MK3", limEnvPlan, c.envioPlanejamento);

  const baseEnvPlan = c.envioPlanejamento || limEnvPlan;
  const limAprPlan  = uteis(baseEnvPlan, PRAZO);
  reg("Aprovação do planejamento","Cliente", limAprPlan, c.aprovacaoPlanejamento);

  const baseAprPlan  = c.aprovacaoPlanejamento || limAprPlan;

  /* limite PELA REGRA: 2 dias úteis após a aprovação do planejamento */
  const limArtesRegra = uteis(baseAprPlan, PRAZO);

  /* data possível NA PRÁTICA: se as artes dependem das fotos, só
     começam a contar depois da gravação */
  const gatilhoArtes = c.artesDependemDaGravacao && c.gravacao
                     ? maiorData(baseAprPlan, c.gravacao) : baseAprPlan;
  const limArtes     = uteis(gatilhoArtes, PRAZO);

  /* a dependência NÃO apaga o prazo: se ela estoura a régua, isso é
     um atraso previsto e tem de aparecer antes de acontecer */
  const nPrev = uteisEntre(limArtesRegra, limArtes);
  if(nPrev>0 && !c.envioMidia){
    const j = just("Entrega das artes");
    out.push({cliente:c.nome, etapa:"Entrega das artes", quem:"MK3", previsto:true,
              limite:limArtesRegra, real:limArtes, dias:nPrev,
              justificado: !!j,
              motivo: j ? j.motivo : null,
              causa:"depende das fotos da gravação de "+fmt(c.gravacao)});
  }

  reg("Entrega das artes","MK3", limArtesRegra, c.envioMidia);

  const baseEnvMid = c.envioMidia || limArtes;
  const limAprMid  = uteis(baseEnvMid, PRAZO);
  reg("Aprovação das artes","Cliente", limAprMid, c.aprovacaoMidia);

  return out;
}

function status(t){
  if(t.feita){
    if(t.dataConclusao && t.data){
      const n=uteisEntre(t.data, t.dataConclusao);
      if(n>0) return {k:"ok", atraso:n, quando:t.dataConclusao,
                      txt:"Concluído · atrasou "+n+(n===1?" dia útil":" dias úteis")};
      return {k:"ok", atraso:0, quando:t.dataConclusao, txt:"Concluído na data"};
    }
    return {k:"ok", txt:"Concluído"};
  }
  if(!t.data) return {k:"sem",txt:"Sem data"};
  const n=dias(t.data);
  if(n<0)   return {k:"atrasado",txt:"Atrasado "+Math.abs(n)+"d"};
  if(n===0) return {k:"hoje",txt:"Vence hoje"};
  if(n===1) return {k:"umdia",txt:"Falta 1 dia"};
  if(n<=7)  return {k:"semana",txt:"Faltam "+n+" dias"};
  return {k:"futuro",txt:"Faltam "+n+" dias"};
}

/* ================= INTERFACE ================= */
const $ = id => document.getElementById(id);
const esc = s => String(s==null?"":s)
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

/* ---- ícone de status: não depender só de cor (2.3) ---- */
const SIC = {atrasado:"&#9650;",hoje:"&#9679;",umdia:"&#9686;",semana:"&#9675;",futuro:"&#9675;",sem:"?",ok:"&#10003;"};
const tagHTML = t => '<span class="tag t-'+t.st.k+(t.st.atraso?' okatraso':'')+'">'+
  '<i class="si" aria-hidden="true">'+(SIC[t.st.k]||"")+'</i>'+esc(t.st.txt)+'</span>';

/* ---- toast com desfazer (4.1) + marcador salvo (J) ---- */
let toastTimer=null;
function toast(msg, acao){
  const el=$("toast"); if(!el) return;
  el.innerHTML='<b>'+esc(msg)+'</b>'+(acao?'<button data-toastundo="1">Desfazer</button>':'');
  el.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove("on"), 5000);
}
function fecharToast(){ const el=$("toast"); if(el){ el.classList.remove("on"); clearTimeout(toastTimer); } }
let salvoTimer=null;
function marcarSalvo(){
  const el=document.getElementById("salvo"); if(!el) return;
  el.textContent="Salvo \u2713"; el.classList.add("on");
  clearTimeout(salvoTimer); salvoTimer=setTimeout(()=>el.classList.remove("on"),2000);
}

/* ---- modal acessível: foco preso, Esc, retorno de foco (3.4) ---- */
let focoAnterior=null;
const FOCAVEIS='button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';
function mostrarModal(){
  const mm=$("modal");
  const h=mm.querySelector("h3"); if(h) h.id="modalTitulo";
  focoAnterior=document.activeElement;
  mm.style.display="flex";
  const ap=$("app"); if(ap) ap.setAttribute("inert","");
  const f=mm.querySelectorAll(FOCAVEIS);
  const alvo=mm.querySelector("input,textarea,select")||f[0];
  if(alvo && alvo.focus) setTimeout(()=>alvo.focus(),20);
}
function fecharModal(){
  const mm=$("modal"); if(!mm) return;
  mm.style.display="none"; mm.innerHTML="";
  const ap=$("app"); if(ap) ap.removeAttribute("inert");
  if(focoAnterior && focoAnterior.focus) focoAnterior.focus();
  focoAnterior=null;
}
const modalAberto = () => { const mm=$("modal"); return mm && mm.style.display==="flex"; };

const ORDEM   = {atrasado:0,hoje:1,umdia:2,semana:3,sem:4,futuro:5,ok:6};
const ROTULO  = {atrasado:"Atrasado",hoje:"Vence hoje",umdia:"Falta 1 dia",
                 semana:"Esta semana",sem:"Sem data",futuro:"Programado",ok:"Concluído"};
const BUCKETS = ["atrasado","hoje","umdia","semana","sem","ok"];

/* ---- áreas (Visão Geral = tudo) ---- */
const AREAS = [{k:"all",rot:"Visão Geral"},{k:"mkt",rot:"Marketing Digital"},
               {k:"fin",rot:"Financeiro"},{k:"com",rot:"Comercial"}];
function areaBase(id){
  if(/^pag_/.test(id) || /^fotos_/.test(id) || id==="renov" || id==="renovacao_atrasada") return "fin";
  if(id==="acaoComercial") return "com";
  return "mkt";
}
const areaMatch = t => VISTA.area==="all" || t.area===VISTA.area;

/* ---- sidebar (estilo Pode Postar) ---- */
const IC = {
  cards:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  prio:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 12l3 3 5-6"/></svg>',
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>',
  lista:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  geral:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18"/></svg>',
  mkt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
  fin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20"/><path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  com:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  add:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12 19"/></svg>',
  equipe:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 20a5.5 5.5 0 0 0-3-4.9"/></svg>'
};
function navItem(key,label,icon,kind,on,n){
  return '<button class="snav'+(on?" on":"")+'" data-'+kind+'="'+key+'" title="'+esc(label)+'"'+(on?' aria-current="true"':'')+'>'+
    '<span class="snav-i">'+icon+'</span><span class="snav-t">'+esc(label)+'</span>'+
    (n?'<span class="snav-b">'+n+'</span>':'')+'</button>';
}
function sidebarHTML(){
  const c=VISTA.escopo?cliente(VISTA.escopo):null;
  const urg=TODAS.filter(t=>t.st.k==="atrasado"||t.st.k==="hoje"||t.st.k==="umdia").length;
  const views=[["cards","Cartões",IC.cards],["prio","Prioridades",IC.prio],["cal","Calendário",IC.cal],["lista","Lista",IC.lista]];
  const areas=[["all","Visão Geral",IC.geral],["mkt","Marketing Digital",IC.mkt],["fin","Financeiro",IC.fin],["com","Comercial",IC.com]]
    .filter(a=>podeArea(a[0]));
  let h='<div class="side-brand"><span class="b"><span>MK</span>3</span><button class="side-toggle" data-side="toggle" title="Recolher menu">&#10094;</button></div>';
  h+='<div class="side-sec">Ver</div>';
  h+=views.map(v=>navItem(v[0],v[1],v[2],"view",(!c&&VISTA.modo===v[0]),(v[0]==="prio"?urg:0))).join("");
  h+='<div class="side-sec">Áreas</div>';
  h+=areas.map(a=>navItem(a[0],a[1],a[2],"area",(VISTA.area===a[0]))).join("");
  if(ehAdmin()){
    h+='<div class="side-sec">Demandas</div>';
    h+='<button class="snav snav-add" data-demanda="1" title="Nova demanda"><span class="snav-i">'+IC.add+'</span><span class="snav-t">Nova demanda</span></button>';
    h+='<button class="snav" data-equipe="1" title="Equipe"><span class="snav-i">'+IC.equipe+'</span><span class="snav-t">Equipe</span></button>';
    h+='<button class="snav" data-portais="1" title="Links dos clientes"><span class="snav-i">'+IC.link+'</span><span class="snav-t">Links dos clientes</span></button>';
  }
  const pu=eu();
  h+='<div class="side-user"><button class="snav" data-sair="1" title="Trocar de usuário">'+
     '<span class="snav-i">'+faceDe(pu?pu.nome:"")+'</span><span class="snav-t">'+esc(pu?pu.nome:"")+
     '<i>'+(ehAdmin()?"Administração":"Trocar")+'</i></span></button></div>';
  return h;
}

const VISTA  = { pinPara:null, area:"all", escopo:null, aba:"cal", modo:"cards", mes:0, dia:null, filtro:null, verTudo:false, edit:false, pano:null, pmes:0, psem:null, side:false };
const cliente = id => CLIENTES.find(c=>c.id===id);
const tarefasCli  = c => TODAS.filter(t=>t.clienteId===c.id && areaMatch(t));
const tarefasArea = () => TODAS.filter(areaMatch);

/* ================= EDIÇÃO LOCAL (sem token; salva neste navegador) ================= */
let TODAS = [];
let ESTADO = { concluidas:{}, datas:{}, log:[] };
let UNDO = [], REDO = [];
const ORIG = JSON.parse(JSON.stringify(CLIENTES));
const CAMPOS_DATA = ["envioPlanejamento","aprovacaoPlanejamento","envioMidia","aprovacaoMidia","gravacao","alteracaoPedida"];
const ANCORA = {
  c1_plan:{campo:"envioPlanejamento", verbo:"Enviado ao cliente"},
  c1_aprPlan:{campo:"aprovacaoPlanejamento", verbo:"Cliente aprovou o planejamento"},
  c1_artes:{campo:"envioMidia", verbo:"Artes enviadas"},
  c1_aprMid:{campo:"aprovacaoMidia", verbo:"Cliente aprovou as artes"},
  c1_gravacao:{campo:"gravacao", verbo:"Gravado"}
};
const escAttr = s => String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

function rebuild(){
  CLIENTES.forEach((c,i)=>{
    const o=ORIG[i];
    c.concluidas=(o.concluidas||[]).slice();
    CAMPOS_DATA.forEach(k=>c[k]=o[k]);
    const dd=ESTADO.datas[c.id]||{};
    for(const k in dd){ if(dd[k]) c[k]=dd[k]; }
    for(const e of (ESTADO.concluidas[c.id]||[])){
      c.concluidas=c.concluidas.filter(x=>((x&&x.id)?x.id:x)!==e.id);
      if(!e.remove) c.concluidas.push(e.data?{id:e.id,data:e.data}:e.id);
    }
  });
  TODAS = CLIENTES.flatMap(c=>regras(c).map(t=>({...t, st:status(t), area:areaBase(t.id)})));
  (ESTADO.demandas||[]).forEach(dm=>{
    const done=(ESTADO.concluidas["_dem"]||[]).filter(e=>((e&&e.id)?e.id:e)===dm.id).pop();
    const t={id:dm.id, clienteId:"_dem", cliente:dm.resp, tarefa:dm.texto, detalhe:"Demanda", data:dm.data, resp:dm.resp, fase:"Demanda", area:dm.area,
             feita:!!(done&&!done.remove), dataConclusao:(done&&done.data)||null};
    t.st=status(t);
    TODAS.push(t);
  });
}

const tdOf = t => escAttr([t.cliente, (t.st&&t.st.txt), (t.data?fmt(t.data)+" "+dow(t.data):""), t.resp, t.detalhe].filter(Boolean).join(" · "));
const attrsEdit = t => ' data-editar="1" data-mcid="'+t.clienteId+'" data-mtid="'+escAttr(t.id)+'" data-tt="'+escAttr(t.tarefa||t.titulo||"")+'" data-td="'+tdOf(t)+'"';

function persist(){ try{ localStorage.setItem("mk3_estado", JSON.stringify(ESTADO)); }catch(e){} setTimeout(marcarSalvo,0); }
function snapshot(){ UNDO.push(JSON.stringify(ESTADO)); if(UNDO.length>80)UNDO.shift(); REDO.length=0; }
function nMud(){ let n=0; for(const k in ESTADO.concluidas)n+=(ESTADO.concluidas[k]||[]).filter(e=>!e.remove).length; return n; }

function marcar(cid,tid,data,tipo){
  snapshot();
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid); const nome=t?t.tarefa:tid;
  const anc=ANCORA[tid];
  ESTADO.concluidas[cid]=(ESTADO.concluidas[cid]||[]).filter(e=>e.id!==tid);
  if(tipo==="desfazer"){
    if(anc && ESTADO.datas[cid]) delete ESTADO.datas[cid][anc.campo];
    ESTADO.log.unshift({ts:new Date().toISOString(),cliente:cid,nome:nome,acao:"desfazer",id:tid});
  } else {
    ESTADO.concluidas[cid].push({id:tid,data:data});
    if(anc){ ESTADO.datas[cid]=ESTADO.datas[cid]||{}; ESTADO.datas[cid][anc.campo]=data; }
    ESTADO.log.unshift({ts:new Date().toISOString(),cliente:cid,nome:nome,acao:(anc?"registrar":"concluir"),campo:(anc?anc.campo:null),id:tid,data:data});
  }
  ESTADO.log=ESTADO.log.slice(0,300);
  persist(); rebuild(); render();
}
const baseId = id => id.replace(/_\d{4}-\d{2}$/,"");
const segOf = isoStr => { const x=d(isoStr); const off=(x.getDay()+6)%7; x.setDate(x.getDate()-off); return iso(x); };
const chaveTarefa = (cid,tid,day) => cid+"|"+tid+(day?"|"+day:"");
function xInfo(week,cid,tid,day){
  const b=(ESTADO.semanal&&ESTADO.semanal[week])||null; if(!b) return null;
  return (day&&b[chaveTarefa(cid,tid,day)]) || b[chaveTarefa(cid,tid)] || null;   /* aceita chave antiga */
}
function setNaoFeito(cid,tid,day,motivo){
  snapshot();
  const wk=segOf(day);
  ESTADO.semanal=ESTADO.semanal||{}; ESTADO.semanal[wk]=ESTADO.semanal[wk]||{};
  delete ESTADO.semanal[wk][chaveTarefa(cid,tid)];              /* limpa chave antiga */
  if(motivo){ ESTADO.semanal[wk][chaveTarefa(cid,tid,day)]={motivo:motivo,data:day}; }
  else { delete ESTADO.semanal[wk][chaveTarefa(cid,tid,day)]; }
  ESTADO.concluidas[cid]=(ESTADO.concluidas[cid]||[]).filter(e=>e.id!==tid);
  if(motivo) ESTADO.concluidas[cid].push({id:tid,remove:true});  /* sobrepõe conclusão oficial */
  else { const anc=ANCORA[tid]; if(anc && ESTADO.datas[cid]) delete ESTADO.datas[cid][anc.campo]; }
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid);
  ESTADO.log.unshift({ts:new Date().toISOString(),cliente:cid,nome:t?t.tarefa:tid,acao:"naofeito",id:tid,data:day,motivo:motivo});
  ESTADO.log=ESTADO.log.slice(0,300);
  persist(); rebuild(); render();
}
function marcarFeitoSemana(cid,tid,day){
  const wk=segOf(day);
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid);
  const jaFeita = t && t.st.k==="ok";
  if(ESTADO.semanal&&ESTADO.semanal[wk]){
    delete ESTADO.semanal[wk][chaveTarefa(cid,tid)];
    delete ESTADO.semanal[wk][chaveTarefa(cid,tid,day)];
  }
  if(jaFeita){ marcar(cid,tid,null,"desfazer"); toast("Voltou para pendente",true); }   /* clicar de novo = neutro */
  else marcar(cid,tid,day,"concluir");
}
function neutralizar(cid,tid,day){
  const wk=segOf(day);
  if(ESTADO.semanal&&ESTADO.semanal[wk]){
    delete ESTADO.semanal[wk][chaveTarefa(cid,tid)];
    delete ESTADO.semanal[wk][chaveTarefa(cid,tid,day)];
  }
  marcar(cid,tid,null,"desfazer");
  toast("Marcação removida",true);
}
function duplicarTarefa(cid,tid,dia){
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid); if(!t) return;
  if(t.data===dia) return;
  ESTADO.dup=ESTADO.dup||[];
  if(ESTADO.dup.some(e=>e.cid===cid&&e.tid===tid&&e.dia===dia)) return;
  snapshot();
  ESTADO.dup.push({cid:cid,tid:tid,dia:dia,orig:t.data});
  ESTADO.log.unshift({ts:new Date().toISOString(),cliente:cid,nome:t.tarefa,acao:"replanejar",id:tid,data:dia});
  persist(); render();
}
function removeDup(cid,tid,dia){
  snapshot();
  ESTADO.dup=(ESTADO.dup||[]).filter(e=>!(e.cid===cid&&e.tid===tid&&e.dia===dia));
  persist(); render();
}
function bcardHTML(t, dayIso, dupOrig){
  const feita=t.st.k==="ok";
  const x=xInfo(VISTA.psem,t.clienteId,t.id,dayIso);
  const st=feita?"ok":(x?"x":"none");
  const rot=EXEC[baseId(t.id)]||t.tarefa;
  const drag=t.clienteId+"|"+t.id+"|"+t.data;
  const nomeResp=(t.fase==="Demanda")?t.resp:AREARESP[t.area];
  const face=faceDe(nomeResp);
  return '<div class="bcard st-'+st+(dupOrig?" dup":"")+'" data-drag="'+escAttr(drag)+'">'+
    (dupOrig?'<div class="dup-badge">&#8618; de '+fmt(dupOrig).slice(0,5)+'<button class="dup-x" data-dropx="1" data-mcid="'+t.clienteId+'" data-mtid="'+escAttr(t.id)+'" data-mday="'+dayIso+'" title="Remover">&#215;</button></div>':'')+
    '<div class="bcard-t">'+esc(rot)+'</div>'+
    '<div class="bcard-c">'+esc(t.cliente)+'</div>'+
    (feita&&t.st.atraso?'<div class="bcard-atr">atrasou '+t.st.atraso+' dia'+(t.st.atraso>1?'s':'')+' útil'+(t.st.atraso>1?'eis':'')+'</div>':'')+
    '<div class="bcard-chk">'+
      '<button class="chk ok'+(feita?" on":"")+'" data-wkok="1" data-mcid="'+t.clienteId+'" data-mtid="'+escAttr(t.id)+'" data-mday="'+dayIso+'" title="Feito · clique de novo para desmarcar" aria-label="Feito">&#10003;</button>'+
      '<button class="chk x'+(x?" on":"")+'" data-wkx="1" data-mcid="'+t.clienteId+'" data-mtid="'+escAttr(t.id)+'" data-mday="'+dayIso+'" title="Não feito · clique de novo para deixar neutro" aria-label="Não feito">&#10007;</button>'+
      '<button class="mover" data-mover="1" data-mcid="'+t.clienteId+'" data-mtid="'+escAttr(t.id)+'" data-mday="'+dayIso+'" title="Replanejar para outro dia" aria-label="Replanejar para outro dia">&#8618;</button>'+
      face+
    '</div>'+
    (x&&x.motivo?'<button class="ver-motivo" data-vermotivo="1" data-mcid="'+t.clienteId+'" data-mtid="'+escAttr(t.id)+'" data-mday="'+dayIso+'">Mostrar motivo</button>':'')+
  '</div>';
}
function setNota(day, texto){
  snapshot();
  ESTADO.notas=ESTADO.notas||{};
  if(texto && texto.trim()) ESTADO.notas[day]=texto; else delete ESTADO.notas[day];
  persist(); render();
}
function addDemanda(texto,area,data,resp){
  snapshot();
  ESTADO.demandas=ESTADO.demandas||[];
  const id="dem_"+Date.now()+"_"+Math.floor(Math.random()*1000);
  ESTADO.demandas.push({id:id,texto:texto,area:area,data:data,resp:resp});
  ESTADO.log.unshift({ts:new Date().toISOString(),acao:"demanda",id:id,nome:texto,area:area,data:data,resp:resp});
  persist(); rebuild(); render();
}
function removeDemanda(id){ snapshot(); ESTADO.demandas=(ESTADO.demandas||[]).filter(x=>x.id!==id); persist(); rebuild(); render(); }
function demConcluida(id){ const e=(ESTADO.concluidas["_dem"]||[]).find(x=>((x&&x.id)?x.id:x)===id); return !!(e&&!e.remove); }
function listaDemandas(){
  const ds=(ESTADO.demandas||[]).filter(x=>!demConcluida(x.id)).slice().sort((a,b)=>String(a.data).localeCompare(String(b.data)));
  if(!ds.length) return '';
  const A={mkt:"Marketing",fin:"Financeiro",com:"Comercial"};
  return '<div class="dem-lista"><div class="dem-lista-h">Demandas cadastradas</div>'+ds.map(x=>
    '<div class="dem-row"><span class="dem-d">'+fmt(x.data)+'</span>'+
    '<span class="dem-t">'+esc(x.texto)+' <i>'+(A[x.area]||"")+'</i></span>'+
    '<span class="dem-r">'+esc(x.resp)+'</span>'+
    '<button class="dem-x" data-demx="'+escAttr(x.id)+'" title="Remover">&#215;</button></div>').join("")+'</div>';
}
let PORTAIS=null;
function abrirPortais(){
  if(!ehAdmin()) return;
  const base=location.origin+location.pathname.replace(/\/(index\.html)?$/,"");
  const linhas = PORTAIS ? CLIENTES.map(c=>{
      const p=PORTAIS[c.id];
      if(!p) return '<div class="po-row"><span class="po-n">'+esc(c.nome)+'</span><span class="po-x">sem portal gerado</span></div>';
      const url=base+"/c/"+p.token+"/";
      return '<div class="po-row"><span class="po-n">'+esc(c.nome)+
        (p.historico?'<i class="po-h">com histórico</i>':'')+'</span>'+
        '<input class="po-u" readonly value="'+escAttr(url)+'">'+
        '<button class="po-c" data-copiar="'+escAttr(url)+'">Copiar</button>'+
        '<a class="po-a" href="'+escAttr(url)+'" target="_blank" rel="noopener">Abrir</a></div>';
    }).join("") : '<div class="vazio">Carregando…</div>';
  const mm=$("modal");
  mm.innerHTML='<div class="mbox portais"><h3>Links dos clientes</h3>'+
    '<p class="msub">Link pessoal de cada cliente, sem senha. Só quem tem o endereço acessa, e cada página mostra apenas os dados daquele cliente.</p>'+
    '<div class="po-lista">'+linhas+'</div>'+
    '<p class="nota-p">Para trocar um link (se vazar) ou ligar o histórico de atrasos de outro cliente, me peça — eu regenero.</p>'+
    '<div class="mbtns"><button class="sec" data-macao="fechar">Fechar</button></div></div>';
  mostrarModal();
  if(!PORTAIS){
    fetch("portais.json?ts="+Date.now()).then(r=>r.json()).then(j=>{ PORTAIS=j; if(modalAberto()) abrirPortais(); }).catch(()=>{
      PORTAIS={}; if(modalAberto()) abrirPortais();
    });
  }
}
function abrirEquipe(){
  if(!ehAdmin()) return;
  const ps=ESTADO.pessoas||[];
  const AR=[["mkt","Mkt"],["fin","Fin"],["com","Com"]];
  const mm=$("modal");
  mm.innerHTML='<div class="mbox equipe"><h3>Equipe e permissões</h3>'+
    '<p class="msub">Marque o que cada pessoa pode ver. Admin vê tudo, cria demandas e edita esta tela.</p>'+
    '<div class="eq-lista">'+ps.map(p=>
      '<div class="eq-row2">'+
        '<div class="eq-top">'+faceDe(p.nome)+'<span class="eq-nome">'+esc(p.nome)+'</span>'+
        '<button class="eq-foto" data-trocarfoto="'+escAttr(p.nome)+'">'+(p.foto?"Trocar foto":"Foto")+'</button>'+
        '<button class="eq-x" data-pessoax="'+escAttr(p.nome)+'" title="Remover da equipe" aria-label="Remover">&#215;</button></div>'+
        '<div class="eq-perm">'+
          '<label class="pchk'+(p.admin?" on":"")+'"><input type="checkbox" data-perm="admin" data-pnome="'+escAttr(p.nome)+'"'+(p.admin?" checked":"")+'> Admin</label>'+
          AR.map(a=>'<label class="pchk'+((!p.admin&&(p.areas||[]).indexOf(a[0])>=0)?" on":"")+(p.admin?" dim":"")+'">'+
            '<input type="checkbox" data-perm="'+a[0]+'" data-pnome="'+escAttr(p.nome)+'"'+((p.admin||(p.areas||[]).indexOf(a[0])>=0)?" checked":"")+(p.admin?" disabled":"")+'> '+a[1]+'</label>').join("")+
          '<span class="eq-pin"><input type="password" class="pinin" data-pin="'+escAttr(p.nome)+'" value="'+escAttr(p.pin||"")+'" maxlength="8" placeholder="PIN" inputmode="numeric"></span>'+
        '</div>'+
      '</div>').join("")+'</div>'+
    '<div class="eq-add"><input type="text" id="enome" placeholder="Nome do novo responsável" autocomplete="off">'+
      '<button data-macao="addpessoa">Adicionar</button></div>'+
    '<div class="mbtns"><button class="sec" data-macao="fechar">Fechar</button></div></div>';
  mostrarModal();
}
function setPerm(nome,perm,valor){
  const p=(ESTADO.pessoas||[]).find(x=>x.nome===nome); if(!p) return;
  snapshot();
  if(perm==="admin"){ p.admin=valor; if(valor) p.areas=["all","mkt","fin","com"]; }
  else { p.areas=(p.areas||[]).filter(a=>a!==perm); if(valor) p.areas.push(perm); }
  persist(); abrirEquipe();
  if(p.nome===USUARIO){ const as=areasDe(); if(as.indexOf(VISTA.area)<0){ VISTA.area=as[0]||"mkt"; } render(); }
}
function setPin(nome,pin){
  const p=(ESTADO.pessoas||[]).find(x=>x.nome===nome); if(!p) return;
  p.pin=(pin||"").trim(); persist();
}
function abrirDemanda(diaSugerido){
  const areas=[["mkt","Marketing Digital"],["fin","Financeiro"],["com","Comercial"]];
  const pessoas=(ESTADO.pessoas||[]).map(p=>p.nome);
  const mm=$("modal");
  mm.innerHTML='<div class="mbox demform"><h3>Nova demanda</h3>'+
    '<label class="mlab">O que é a demanda<input type="text" id="dtexto" placeholder="Descreva a demanda..." autocomplete="off"></label>'+
    '<label class="mlab">Área<select id="darea">'+areas.map(a=>'<option value="'+a[0]+'">'+a[1]+'</option>').join("")+'</select></label>'+
    '<label class="mlab">Data<input type="date" id="ddata" value="'+(diaSugerido||iso(HOJE))+'"></label>'+
    '<label class="mlab">Responsável<select id="dresp">'+pessoas.map(p=>'<option>'+p+'</option>').join("")+'</select></label>'+
    '<div class="mbtns"><button data-macao="salvardemanda">Adicionar</button><button class="sec" data-macao="fechar">Fechar</button></div>'+
    listaDemandas()+
  '</div>';
  mostrarModal();
}
function diaItem(t,showCli){
  return '<button class="dia-item editavel" data-editar="1" data-mcid="'+t.clienteId+'" data-mtid="'+escAttr(t.id)+'">'+
    '<span class="tag t-'+t.st.k+(t.st.atraso?" okatraso":"")+'">'+t.st.txt+'</span>'+
    '<span class="dia-t">'+esc(t.tarefa)+(showCli?' <i>'+esc(t.cliente)+'</i>':'')+'</span></button>';
}
function abrirDia(dayIso){
  const c=VISTA.escopo?cliente(VISTA.escopo):null;
  const showCli=!c;
  const base=(c?TODAS.filter(t=>t.clienteId===c.id):tarefasArea()).filter(t=>t.data===dayIso)
    .sort((a,b)=>ORDEM[a.st.k]-ORDEM[b.st.k]);
  const mostraMarco=(VISTA.area==="all"||VISTA.area==="mkt");
  const mks=mostraMarco?((c?c.marcos:CLIENTES.flatMap(x=>x.marcos)).filter(m=>m.data===dayIso)):[];
  const titulo=d(dayIso).toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
  const mm=$("modal");
  mm.innerHTML='<div class="mbox diamodal"><h3>'+esc(titulo)+'</h3>'+
    (mks.length?'<div class="diamarco">'+mks.map(m=>"&#9670; "+esc(m.titulo)).join("<br>")+'</div>':'')+
    (base.length?'<div class="dia-lista">'+base.map(t=>diaItem(t,showCli)).join("")+'</div>':'<div class="vazio">Nenhuma tarefa neste dia.</div>')+
    '<div class="mbtns"><button class="sec" data-macao="fechar">Fechar</button></div></div>';
  mostrarModal();
}
function abrirNota(day){
  const cur=(ESTADO.notas&&ESTADO.notas[day])||"";
  const titulo=d(day).toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"});
  const mm=$("modal");
  mm.innerHTML='<div class="mbox notepad"><h3>&#128221; Notas</h3><p class="msub">'+esc(titulo)+'</p>'+
    '<textarea id="mnota" class="notepad-ta" rows="9" placeholder="Escreva suas notas do dia...">'+esc(cur)+'</textarea>'+
    '<div class="mbtns"><button data-macao="salvarnota" data-mday="'+day+'">Salvar</button>'+
    '<button class="sec" data-macao="fechar">Fechar</button></div></div>';
  mostrarModal();
}
function abrirMotivo(cid,tid,day){
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid);
  const cur=xInfo(segOf(day),cid,tid);
  const rot=t?(EXEC[baseId(t.id)]+" — "+t.cliente):tid;
  const mm=$("modal");
  mm.innerHTML='<div class="mbox"><h3>Não deu pra fazer</h3>'+
    '<p class="msub">'+esc(rot)+' · '+fmt(day)+'</p>'+
    '<label class="mlab">Motivo<textarea id="mmotivo" rows="3" placeholder="Escreva o que impediu...">'+esc(cur?cur.motivo:"")+'</textarea></label>'+
    '<div class="mbtns"><button data-macao="motivo" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'" data-mday="'+day+'">Salvar motivo</button>'+
    '<button class="sec" data-macao="neutro" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'" data-mday="'+day+'">Deixar neutro</button>'+
    '<button class="sec" data-macao="fechar">Cancelar</button></div></div>';
  mostrarModal();
}
function desfazer(){ if(!UNDO.length)return; REDO.push(JSON.stringify(ESTADO)); ESTADO=JSON.parse(UNDO.pop()); persist(); rebuild(); render(); }
function refazer(){ if(!REDO.length)return; UNDO.push(JSON.stringify(ESTADO)); ESTADO=JSON.parse(REDO.pop()); persist(); rebuild(); render(); }

function concluirRapido(cid,tid){
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid);
  marcar(cid,tid,iso(HOJE),"concluir");
  toast((t?t.tarefa:"Tarefa")+" · concluída hoje", true);
}
function atrasadasDisponiveis(dia){
  const jaNoDia=new Set(TODAS.filter(t=>t.data===dia).map(t=>t.clienteId+"|"+t.id));
  const dup=new Set((ESTADO.dup||[]).filter(e=>e.dia===dia).map(e=>e.cid+"|"+e.tid));
  return TODAS.filter(t=>t.st.k==="atrasado" && relevanteBoard(t) && !jaNoDia.has(t.clienteId+"|"+t.id) && !dup.has(t.clienteId+"|"+t.id))
    .sort((a,b)=>String(a.data).localeCompare(String(b.data)));
}
function abrirAtrasadas(dia){
  const ts=atrasadasDisponiveis(dia);
  const rot=d(dia).toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"2-digit"});
  const mm=$("modal");
  mm.innerHTML='<div class="mbox diamodal"><h3>Tirar atrasos · '+esc(rot)+'</h3>'+
    '<p class="msub">Escolha o que fazer neste dia. A tarefa entra no dia e continua contando o atraso original.</p>'+
    (ts.length?'<div class="atr-lista">'+ts.map(t=>
      '<button class="atr-item" data-macao="mover" data-mcid="'+t.clienteId+'" data-mtid="'+escAttr(t.id)+'" data-mday="'+dia+'">'+
        tagHTML(t)+'<span class="at-t">'+esc(t.tarefa)+' <i>'+esc(t.cliente)+'</i></span>'+
        '<span class="at-add">+ neste dia</span></button>').join("")+'</div>'
      :'<div class="vaziox"><h4>Nenhum atraso por aqui</h4><p>Tudo em dia nesta área. Pode aproveitar para adiantar o que vem.</p><button data-macao="fechar">Fechar</button></div>')+
    '<div class="mbtns"><button data-demanda="1" data-demdia="'+dia+'">+ Nova demanda</button>'+
    '<button class="sec" data-macao="fechar">Fechar</button></div></div>';
  mostrarModal();
}
function abrirMover(cid,tid,diaAtual){
  const dias=["Segunda","Terça","Quarta","Quinta","Sexta"];
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid);
  const mm=$("modal");
  mm.innerHTML='<div class="mbox"><h3>Replanejar para outro dia</h3>'+
    '<p class="msub">'+esc(t?t.tarefa:"")+(t?" · "+esc(t.cliente):"")+'</p>'+
    '<p class="msub">Cria uma cópia no dia escolhido. A tarefa original continua na data dela.</p>'+
    '<div class="mbtns wrap">'+dias.map((d0,i)=>{
      const dd=addD(VISTA.psem,i);
      return '<button'+(dd===diaAtual?' class="sec"':'')+' data-macao="mover" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'" data-mday="'+dd+'">'+d0+' '+fmt(dd).slice(0,5)+'</button>';
    }).join("")+'</div>'+
    '<div class="mbtns"><button class="sec" data-macao="fechar">Cancelar</button></div></div>';
  mostrarModal();
}
function abrirEditor(cid,tid){
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid); if(!t) return;
  const feita=t.st.k==="ok"; const cli=cliente(cid); const anc=ANCORA[tid];
  const verbo = anc ? anc.verbo : "Concluído";
  const mm=$("modal");
  mm.innerHTML='<div class="mbox">'+
    '<h3>'+esc(t.tarefa)+'</h3>'+
    '<p class="msub">'+esc(cli.nome)+(t.detalhe?" · "+esc(t.detalhe):"")+'</p>'+
    (feita
      ? '<p class="mok">Já marcada como concluída'+(t.st.quando?" em "+fmt(t.st.quando):"")+'.</p>'+
        '<div class="mbtns"><button class="danger" data-macao="desfazer" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'">Desfazer</button>'+
        '<button class="sec" data-macao="fechar">Fechar</button></div>'
      : '<div class="mbtns wrap"><button data-macao="hoje" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'">'+esc(verbo)+' hoje</button></div>'+
        '<label class="mlab">Ou em outra data<input type="date" id="mdata" value="'+iso(HOJE)+'"></label>'+
        '<div class="mbtns"><button data-macao="data" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'">'+esc(verbo)+' nesta data</button>'+
        '<button class="sec" data-macao="fechar">Cancelar</button></div>')+
    '</div>';
  mostrarModal();
}
function handleModal(D){
  if(D.macao==="fechar"){ fecharModal(); return; }
  if(D.macao==="motivo"){ const mot=(($("mmotivo")&&$("mmotivo").value)||"").trim(); setNaoFeito(D.mcid,D.mtid,D.mday,mot); fecharModal(); return; }
  if(D.macao==="mover"){
    const eraAtr=(TODAS.find(x=>x.clienteId===D.mcid&&x.id===D.mtid)||{}).st;
    duplicarTarefa(D.mcid,D.mtid,D.mday);
    toast("Colocada em "+fmt(D.mday),true);
    if(eraAtr&&eraAtr.k==="atrasado"){ abrirAtrasadas(D.mday); } else { fecharModal(); }
    return;
  }
  if(D.macao==="neutro"){ neutralizar(D.mcid,D.mtid,D.mday); fecharModal(); return; }
  if(D.macao==="salvarnota"){ const tx=($("mnota")&&$("mnota").value)||""; setNota(D.mday,tx); fecharModal(); return; }
  if(D.macao==="addpessoa"){ const n=(($("enome")&&$("enome").value)||"").trim(); if(n) addPessoa(n); abrirEquipe(); return; }
  if(D.macao==="salvardemanda"){ const tx=(($("dtexto")&&$("dtexto").value)||"").trim(); if(!tx){ if($("dtexto"))$("dtexto").focus(); return; } addDemanda(tx,$("darea").value,$("ddata").value,$("dresp").value); abrirDemanda(); return; }
  const cid=D.mcid, tid=D.mtid;
  if(D.macao==="desfazer"){ marcar(cid,tid,null,"desfazer"); fecharModal(); return; }
  const dv = (D.macao==="hoje") ? iso(HOJE) : (($("mdata")&&$("mdata").value)||iso(HOJE));
  marcar(cid,tid,dv,"concluir"); fecharModal();
}

function montarTooltip(){
  const tip=$("tip"); if(!tip) return;
  let alvoAtual=null, dispensado=false;
  const pos=(x,y)=>{
    let px=x+14, py=y+16;
    if(px+tip.offsetWidth>window.innerWidth-8) px=x-tip.offsetWidth-14;
    if(py+tip.offsetHeight>window.innerHeight-8) py=y-tip.offsetHeight-16;
    tip.style.left=Math.max(8,px)+"px"; tip.style.top=Math.max(8,py)+"px";
  };
  const abrir=(el,x,y)=>{
    if(dispensado && el===alvoAtual) return;
    alvoAtual=el; dispensado=false;
    tip.innerHTML='<b>'+esc(el.dataset.tt)+'</b>'+(el.dataset.td?'<span class="tl">'+esc(el.dataset.td)+'</span>':'')+
      (el.dataset.editar?'<span class="tl tk">clique para marcar · Esc fecha</span>':'');
    tip.style.display="block"; pos(x,y);
  };
  const fechar=()=>{ tip.style.display="none"; alvoAtual=null; };
  document.addEventListener("mouseover", e=>{
    if(e.target.closest && e.target.closest("#tip")) return;   /* hoverable */
    const el=e.target.closest("[data-tt]"); if(!el){ return; }
    abrir(el,e.clientX,e.clientY);
  });
  document.addEventListener("mousemove", e=>{
    if(tip.style.display!=="block") return;
    if(e.target.closest && e.target.closest("#tip")) return;
    pos(e.clientX,e.clientY);
  });
  document.addEventListener("mouseout", e=>{
    const el=e.target.closest && e.target.closest("[data-tt]");
    if(!el) return;
    const para=e.relatedTarget;
    if(para && para.closest && (para.closest("#tip")||para.closest("[data-tt]")===el)) return;  /* hoverable */
    fechar();
  });
  /* aparece também no foco por teclado */
  document.addEventListener("focusin", e=>{
    const el=e.target.closest && e.target.closest("[data-tt]"); if(!el) return;
    const r=el.getBoundingClientRect(); abrir(el, r.left, r.bottom-16);
  });
  document.addEventListener("focusout", e=>{ if(e.target.closest && e.target.closest("[data-tt]")) fechar(); });
  /* dismissível sem mover o mouse */
  document.addEventListener("keydown", e=>{ if(e.key==="Escape" && tip.style.display==="block"){ dispensado=true; fechar(); } });
}
function mergeEstado(a,b){
  if(!b) return a;
  const r={concluidas:{...a.concluidas}, datas:{...a.datas}, semanal:{...(a.semanal||{})}, notas:{...(a.notas||{})}, dup:(b&&b.dup)?b.dup:(a.dup||[]), demandas:(b&&b.demandas)?b.demandas:(a.demandas||[]), pessoas:(b&&b.pessoas&&b.pessoas.length)?b.pessoas:(a.pessoas||[]), log:(b.log&&b.log.length?b.log:a.log)||[]};
  for(const k in (b.concluidas||{})) r.concluidas[k]=b.concluidas[k];
  for(const k in (b.datas||{})) r.datas[k]={...(a.datas[k]||{}),...b.datas[k]};
  for(const k in (b.semanal||{})) r.semanal[k]={...((a.semanal&&a.semanal[k])||{}),...b.semanal[k]};
  for(const k in (b.notas||{})) r.notas[k]=b.notas[k];
  return r;
}
async function init(){
  try{ VISTA.side=localStorage.getItem("mk3_side")==="1"; }catch(e){}
  { const ap=$("app"); if(ap) ap.classList.toggle("side-col", !!VISTA.side); }
  let base={concluidas:{},datas:{},log:[]};
  try{ const r=await fetch("estado.json?ts="+Date.now()); if(r.ok){ const j=await r.json(); base={concluidas:{},datas:{},log:[],...j}; } }catch(e){}
  let local=null; try{ local=JSON.parse(localStorage.getItem("mk3_estado")||"null"); }catch(e){}
  ESTADO = mergeEstado(base, local);
  if(!ESTADO.concluidas)ESTADO.concluidas={}; if(!ESTADO.datas)ESTADO.datas={}; if(!ESTADO.log)ESTADO.log=[]; if(!ESTADO.semanal)ESTADO.semanal={}; if(!ESTADO.notas)ESTADO.notas={}; if(!ESTADO.dup)ESTADO.dup=[]; if(!ESTADO.demandas)ESTADO.demandas=[]; if(!ESTADO.pessoas||!ESTADO.pessoas.length)ESTADO.pessoas=SEED_PESSOAS.map(p=>({...p}));
  ESTADO.pessoas.forEach(p=>{
    if(p.admin===undefined){ const dd=PERMS_PADRAO[p.nome]; p.admin=dd?dd.admin:false; p.areas=dd?dd.areas.slice():["mkt"]; }
    if(!p.areas) p.areas=["mkt"];
    if(p.pin===undefined) p.pin="";
  });
  try{ USUARIO=localStorage.getItem("mk3_user")||null; }catch(e){}
  if(USUARIO && !eu()) USUARIO=null;
  rebuild(); render(); montarTooltip();
}

$("hoje").textContent = HOJE.toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});

function coresSeg(seg){
  const M = {
    "corretor":["#2f9150","#155a2c"], "corretora":["#8f5fb0","#573477"],
    "varejo":["#b98fb0","#6f4f6a"], "moda":["#c07bb0","#7a3f6a"],
    "escola":["#a0703f","#5f4020"], "educação":["#a0703f","#5f4020"],
    "tecnologia":["#3f6fa0","#20405f"]
  };
  return M[(seg||"").toLowerCase()] || ["#4c6b8f","#2a3f5a"];
}
/* cor fixa por cliente (banner + avatar) */
const CORCLI = {
  adriana:  ["#d8ab4c","#8c6a1c"],   // Dinha Mais — dourado
  suelem:   ["#8a3b5e","#4b1930"],   // Suelem — roxo vinho
  leonardo: ["#2bb7c0","#116169"],   // Leonardo — azul-turquesa
  cynthia:  ["#cbb693","#9a8461"],   // Cynthia — bege
  oceanus:  ["#2a30df","#1414a2"]    // Oceanus — azul da logo
};
const coresDe = c => CORCLI[c.id] || coresSeg(c.segmento);
const iniciais = n => (n||"?").trim().split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase();

const FOTO = {
  cynthia:"fotos/cynthia.jpg", suelem:"fotos/suelem.jpg", leonardo:"fotos/leonardo.jpg",
  oceanus:"fotos/oceanus.jpg", adriana:"fotos/dinha.jpg"
};
function avatarHTML(c, cls){
  const cor=coresDe(c), f=FOTO[c.id];
  return '<div class="'+cls+'" style="background:'+cor[1]+'">'+esc(iniciais(c.nome))+
    (f?'<img src="'+f+'" alt="" loading="lazy" onerror="this.remove()">':'')+'</div>';
}

/* ---- linha de tarefa (lista) ---- */
const linha = (t, showCli) => '<div class="row editavel'+(showCli?" rowc":"")+'"'+attrsEdit(t)+'>'+
  tagHTML(t)+
  '<div class="tarefa">'+esc(t.tarefa)+(t.detalhe?'<em>'+esc(t.detalhe)+'</em>':'')+'</div>'+
  (showCli?'<div class="cli">'+esc(t.cliente)+'</div>':'')+
  '<div class="data">'+fmt(t.data)+' <span class="dow">'+dow(t.data)+'</span></div>'+
  '<div class="resp">'+esc(t.resp)+'</div>'+
  (t.st.k==="ok" ? '<span class="row-ok" aria-hidden="true" style="opacity:.5">&#10003;</span>'
    : '<button class="row-ok" data-rowok="1" data-mcid="'+t.clienteId+'" data-mtid="'+escAttr(t.id)+'" title="Concluir hoje" aria-label="Concluir hoje">&#10003;</button>')+
  '</div>';

/* ---- bloco de evento no calendário (estilo referência) ---- */
function evCard(t, showCli, isMarco){
  const cls  = isMarco ? "marco" : t.st.k;
  const meta = isMarco ? "Marco" : (showCli ? t.cliente : t.resp);
  const tt   = (isMarco?"◆ ":"")+esc(t.tarefa || t.titulo);
  const dattr = isMarco ? (' data-tt="'+escAttr(t.titulo||t.tarefa||"")+'"') : attrsEdit(t);
  return '<div class="ev ev-'+cls+(isMarco?"":" editavel")+'"'+dattr+'>'+
    '<div class="ev-tt">'+tt+'</div>'+
    '<div class="ev-meta"><span class="ev-dot"></span>'+esc(meta)+'</div></div>';
}

/* ---------------- CARDS DE CLIENTE ---------------- */
function cardsHTML(){
  const crit=c=>{ const ts=tarefasCli(c);
    return ts.filter(t=>t.st.k==="atrasado").length*100 + ts.filter(t=>t.st.k==="hoje").length*10 + ts.filter(t=>t.st.k==="umdia").length; };
  return CLIENTES.slice().sort((a,b)=>crit(b)-crit(a)).map(c=>{
    const ts = tarefasCli(c);
    const n  = ks => ts.filter(t=>ks.includes(t.st.k)).length;
    const cor = coresDe(c);
    const tiles = [
      ["atrasado","Atrasado", n(["atrasado"])],
      ["hoje","Vence hoje",   n(["hoje","umdia"])],
      ["semana","A fazer",    n(["semana","futuro","sem"])],
      ["ok","Concluído",      n(["ok"])]
    ];
    return '<button class="ccard" data-cliente="'+c.id+'">'+
      '<div class="ccard-banner" style="background:linear-gradient(135deg,'+cor[0]+' 0%,'+cor[1]+' 100%)"></div>'+
      avatarHTML(c,"ccard-av")+
      '<div class="ccard-body">'+
        '<div class="ccard-top"><h3>'+esc(c.nome)+'</h3><span class="badge-ativo">Ativo</span></div>'+
        '<div class="ccard-stats">'+tiles.map(t=>
          '<div class="stat s-'+t[0]+'"><i></i><b>'+t[2]+'</b> '+t[1]+'</div>').join("")+'</div>'+
      '</div></button>';
  }).join("");
}

/* ---------------- CALENDÁRIO (reutilizável) ---------------- */
function calendario(tasks, marcos, showCli){
  const base = tasks.filter(t=>t.data);
  const ref  = new Date(HOJE.getFullYear(), HOJE.getMonth()+VISTA.mes, 1);
  const ano  = ref.getFullYear(), mes = ref.getMonth();
  const desloc = new Date(ano,mes,1).getDay();      // domingo = 0
  const ini = new Date(ano,mes,1-desloc);
  const hojeIso = iso(HOJE);
  const diasNoMes = new Date(ano,mes+1,0).getDate();
  const semanas = Math.ceil((desloc+diasNoMes)/7);

  let cells="";
  for(let i=0;i<semanas*7;i++){
    const dt = new Date(ini); dt.setDate(ini.getDate()+i);
    const s = iso(dt);
    const fora = dt.getMonth()!==mes;
    const fds  = dt.getDay()===0 || dt.getDay()===6;
    const evs  = base.filter(t=>t.data===s);
    const mk   = marcos.filter(m=>m.data===s);
    const cls  = ["cel", fora?"fora":"", fds?"fds":"", s===hojeIso?"hj":""].filter(Boolean).join(" ");
    const maxEv = 2;
    const items = mk.map(m=>({o:m,marco:true})).concat(evs.map(t=>({o:t,marco:false})));
    const cap = Math.min(items.length, maxEv);
    const evsHtml = items.slice(0,cap).map(it=> it.marco ? evCard(it.o,false,true) : evCard(it.o,showCli,false)).join("");
    const resto = items.length - cap;
    const extra = resto>0 ? '<div class="mais" data-dia="'+s+'">+'+resto+' '+(resto===1?"item":"itens")+'</div>' : "";
    cells += '<div class="'+cls+'" data-dia="'+s+'"><div class="n">'+dt.getDate()+'</div>'+evsHtml+extra+'</div>';
  }

  return '<div class="cal-nav"><button data-mes="-1">&lsaquo;</button>'+
      '<strong>'+ref.toLocaleDateString("pt-BR",{month:"long",year:"numeric"})+'</strong>'+
      '<button data-mes="1">&rsaquo;</button><button class="hj" data-mes="0">Hoje</button></div>'+
    '<div class="cal"><div class="cal-dow">'+
      '<div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div></div>'+
      '<div class="cal-grid">'+cells+'</div></div>';
}

/* ---------------- LISTA GLOBAL (todos os clientes) ---------------- */
function vazioHTML(filtro){
  const A={all:"nas suas áreas",mkt:"no Marketing",fin:"no Financeiro",com:"no Comercial"}[VISTA.area]||"";
  if(filtro) return '<div class="vaziox"><h4>Nada em "'+esc(ROTULO[filtro])+'"</h4>'+
    '<p>Nenhuma tarefa neste status '+esc(A)+' agora.</p>'+
    '<button data-limpafiltro="1">Ver todos os status</button></div>';
  return '<div class="vaziox"><h4>Tudo em dia '+esc(A)+'</h4>'+
    '<p>Nenhuma pendência aberta. Aproveite para adiantar o que vem pela frente.</p>'+
    '<button data-demanda="1">+ Nova demanda</button></div>';
}
function listaGlobalHTML(){
  const ts = tarefasArea();
  const semaf = '<div class="semaforo">'+BUCKETS.map(k=>
    '<div class="sf '+k+' '+(VISTA.filtro===k?"on":"")+'" data-bucket="'+k+'">'+
    '<b>'+ts.filter(t=>t.st.k===k).length+'</b><small>'+ROTULO[k]+'</small></div>').join("")+'</div>';
  const lista = (VISTA.filtro ? ts.filter(t=>t.st.k===VISTA.filtro) : ts.filter(t=>t.st.k!=="ok"))
    .sort((a,b)=>ORDEM[a.st.k]-ORDEM[b.st.k] || String(a.data).localeCompare(String(b.data)));
  return semaf +
    '<h2>'+(VISTA.filtro?ROTULO[VISTA.filtro]:"Fila de execução")+' · todos os clientes</h2>'+
    (lista.length ? '<div class="fila">'+lista.slice(0,VISTA.verTudo?999:7).map(t=>linha(t,true)).join("")+'</div>'+
        (!VISTA.verTudo && lista.length>7 ? '<button class="vermais" data-vertudo="1">Ver todas as '+lista.length+'</button>' : '')
      : vazioHTML(VISTA.filtro));
}

/* ---------------- PRIORIDADES DIÁRIAS (quadro semanal) ---------------- */
const EXEC = {
  c1_plan:"Planejamento", planej:"Planejamento", envPlanej:"Enviar planejamento",
  c1_artes:"Artes", midia:"Artes",
  c1_gravacao:"Gravação", c1_roteiro:"Roteiro",
  c1_aprPlan:"Aprovação do planejamento", c1_aprMid:"Aprovação das artes",
  c1_podepostar:"Pode Postar", c1_entrega:"Entrega das peças"
};
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
function semanasDoMes(ano,mes){
  const set=new Set(); const last=new Date(ano,mes+1,0).getDate();
  for(let dia=1; dia<=last; dia++) set.add(segOf(iso(new Date(ano,mes,dia))));
  return [...set].sort();
}
const AREARESP = { mkt:"Carla", fin:"Bia" };
const SEED_PESSOAS = [
  {nome:"Guilherme",foto:null,            admin:true,  areas:["all","mkt","fin","com"], pin:""},
  {nome:"Alda",     foto:null,            admin:true,  areas:["all","mkt","fin","com"], pin:""},
  {nome:"Carla",    foto:"fotos/carla.jpg", admin:false, areas:["mkt"], pin:""},
  {nome:"Bia",      foto:"fotos/bia.jpg",   admin:false, areas:["fin"], pin:""},
  {nome:"Marlon",   foto:null,            admin:false, areas:["com"], pin:""}
];
const PERMS_PADRAO = {Guilherme:{admin:true,areas:["all","mkt","fin","com"]},Alda:{admin:true,areas:["all","mkt","fin","com"]},
  Carla:{admin:false,areas:["mkt"]},Bia:{admin:false,areas:["fin"]},Marlon:{admin:false,areas:["com"]}};

/* ---- sessão / permissões ---- */
let USUARIO=null;
const eu = () => (ESTADO.pessoas||[]).find(p=>p.nome===USUARIO)||null;
const ehAdmin = () => { const p=eu(); return !!(p&&p.admin); };
const areasDe = () => { const p=eu(); if(!p) return []; return p.admin?["all","mkt","fin","com"]:((p.areas||[]).filter(a=>a!=="all")); };
const podeArea = a => areasDe().indexOf(a)>=0;
function entrar(nome){
  USUARIO=nome; VISTA.pinPara=null;
  try{ localStorage.setItem("mk3_user",nome); }catch(e){}
  const as=areasDe(); if(as.indexOf(VISTA.area)<0) VISTA.area=as[0]||"mkt";
  VISTA.escopo=null; VISTA.modo="cards"; VISTA.filtro=null; render();
}
function tentarEntrar(nome){
  const p=(ESTADO.pessoas||[]).find(x=>x.nome===nome);
  if(p && p.pin){ VISTA.pinPara=nome; render(); return; }
  entrar(nome);
}
function sair(){ USUARIO=null; VISTA.pinPara=null; try{ localStorage.removeItem("mk3_user"); }catch(e){} render(); }
const pessoaPorNome = n => (ESTADO.pessoas||[]).find(p=>p.nome===n);
function faceDe(nome){
  if(!nome) return '';
  const p=pessoaPorNome(nome), foto=p&&p.foto;
  return '<span class="card-face" title="'+esc(nome)+'">'+esc(nome.slice(0,1))+(foto?'<img src="'+foto+'" alt="" onerror="this.remove()">':'')+'</span>';
}
function addPessoa(nome){ nome=(nome||"").trim(); if(!nome) return; ESTADO.pessoas=ESTADO.pessoas||[]; if(ESTADO.pessoas.some(p=>p.nome===nome)) return; snapshot(); ESTADO.pessoas.push({nome:nome,foto:null}); persist(); render(); }
function removePessoa(nome){ snapshot(); ESTADO.pessoas=(ESTADO.pessoas||[]).filter(p=>p.nome!==nome); persist(); rebuild(); render(); }
function setFotoPessoa(nome,url){ const p=pessoaPorNome(nome); if(!p) return; snapshot(); p.foto=url; persist(); rebuild(); render(); }
function relevanteBoard(t){
  if(t.fase==="Demanda") return VISTA.area==="all" || t.area===VISTA.area;
  if(VISTA.area==="fin" || VISTA.area==="com") return t.area===VISTA.area;
  return !!EXEC[baseId(t.id)];   // Visão Geral / Marketing: entregas de execução
}
function resumoSemanaHTML(){
  const wk=VISTA.psem; if(!wk) return '';
  let feitas=0, naofeitas=0; const motivos={};
  for(let i=0;i<5;i++){
    const day=addD(wk,i);
    TODAS.filter(t=>t.data===day && relevanteBoard(t)).forEach(t=>{
      const x=xInfo(wk,t.clienteId,t.id,day);
      if(x){ naofeitas++; const k=(x.motivo||"sem motivo").trim(); motivos[k]=(motivos[k]||0)+1; }
      else if(t.st.k==="ok") feitas++;
    });
  }
  const top=Object.entries(motivos).sort((a,b)=>b[1]-a[1]).slice(0,3);
  if(!feitas && !naofeitas) return '';
  const tot=feitas+naofeitas, pct=tot?Math.round(feitas/tot*100):0;
  return '<div class="resumo">'+
    '<div class="res-h">Resumo da semana</div>'+
    '<div class="res-nums"><span class="res-ok"><b>'+feitas+'</b> feitas</span>'+
      '<span class="res-x"><b>'+naofeitas+'</b> não feitas</span>'+
      '<span class="res-pct">'+pct+'% concluído</span></div>'+
    '<div class="res-bar"><i style="width:'+pct+'%"></i></div>'+
    (top.length?'<div class="res-mot"><span class="res-mot-h">Principais motivos</span>'+
      top.map(([k,n])=>'<span class="res-chip">'+esc(k)+' <b>'+n+'</b></span>').join("")+'</div>':'')+
  '</div>';
}
function prioridadesHTML(){
  if(VISTA.pano==null){ VISTA.pano=HOJE.getFullYear(); VISTA.pmes=HOJE.getMonth(); }
  if(VISTA.psem==null) VISTA.psem=segOf(iso(HOJE));
  const anos=[...new Set(TODAS.filter(t=>t.data).map(t=>+t.data.slice(0,4)).concat([HOJE.getFullYear()]))].sort();
  let semanas=semanasDoMes(VISTA.pano,VISTA.pmes);
  if(!semanas.includes(VISTA.psem)) VISTA.psem=semanas[0];

  const selAno='<select data-sel="ano">'+anos.map(a=>'<option value="'+a+'"'+(a===VISTA.pano?" selected":"")+'>'+a+'</option>').join("")+'</select>';
  const selMes='<select data-sel="mes">'+MESES.map((n,i)=>'<option value="'+i+'"'+(i===VISTA.pmes?" selected":"")+'>'+n+'</option>').join("")+'</select>';
  const selSem='<select data-sel="semana">'+semanas.map(mon=>'<option value="'+mon+'"'+(mon===VISTA.psem?" selected":"")+'>'+fmt(mon).slice(0,5)+' a '+fmt(addD(mon,4)).slice(0,5)+'</option>').join("")+'</select>';

  const dias=["Segunda","Terça","Quarta","Quinta","Sexta"];
  const hojeIso=iso(HOJE);
  let cols="";
  for(let i=0;i<5;i++){
    const dayIso=addD(VISTA.psem,i);
    const reais=TODAS.filter(t=>t.data===dayIso && relevanteBoard(t)).sort((a,b)=>a.clienteId.localeCompare(b.clienteId));
    const dups=(ESTADO.dup||[]).filter(e=>e.dia===dayIso).map(e=>({t:TODAS.find(x=>x.clienteId===e.cid&&x.id===e.tid),orig:e.orig})).filter(o=>o.t);
    const cs=reais.map(t=>bcardHTML(t,dayIso,null)).concat(dups.map(o=>bcardHTML(o.t,dayIso,o.orig)));
    let vazioBody;
    if(!cs.length){
      const nAtr=atrasadasDisponiveis(dayIso).length;
      vazioBody='<div class="bcol-vaziox">'+
        (nAtr ? '<span>Sem entregas neste dia.</span>'+
                '<button class="atr" data-atrasadas="1" data-mday="'+dayIso+'">Fazer tarefas atrasadas ('+nAtr+')</button>'
              : '<span>Sem entregas neste dia.</span>'+
                '<button data-demanda="1" data-demdia="'+dayIso+'">+ Demanda</button>')+
      '</div>';
    }
    const body=cs.length ? cs.join("") : vazioBody;
    const nota=(ESTADO.notas&&ESTADO.notas[dayIso])||"";
    const notaEl='<div class="bnota'+(nota?" tem":"")+'" data-nota="'+dayIso+'"><span class="bnota-h">&#128221; Notas</span>'+
      (nota?'<span class="bnota-prev">'+esc(nota.length>70?nota.slice(0,70)+"\u2026":nota)+'</span>':'<span class="bnota-add">anotar\u2026</span>')+'</div>';
    cols+='<div class="bcol'+(dayIso===hojeIso?" hoje":"")+'" data-daycol="'+dayIso+'"><div class="bcol-h"><span>'+dias[i]+(cs.length?'<span class="bcount">'+cs.length+'</span>':'')+'</span><span>'+fmt(dayIso).slice(0,5)+'</span></div><div class="bcol-body">'+body+'</div>'+notaEl+'</div>';
  }
  const rotArea={all:"Todas as áreas",mkt:"Marketing Digital",fin:"Financeiro",com:"Comercial"}[VISTA.area]||"";
  return '<div class="semsel"><span class="semsel-l">Semana:</span>'+selAno+selMes+selSem+
           '<span class="semsel-area">'+esc(rotArea)+'</span></div>'+
         '<div class="board">'+cols+'</div>'+resumoSemanaHTML();
}

/* ---------------- TAREFAS DO CLIENTE ---------------- */
function tarefasHTML(c){
  const ts = tarefasCli(c);
  const semaf = '<div class="semaforo">'+BUCKETS.map(k=>
    '<div class="sf '+k+' '+(VISTA.filtro===k?"on":"")+'" data-bucket="'+k+'">'+
    '<b>'+ts.filter(t=>t.st.k===k).length+'</b><small>'+ROTULO[k]+'</small></div>').join("")+'</div>';
  const lista = (VISTA.filtro ? ts.filter(t=>t.st.k===VISTA.filtro) : ts.filter(t=>t.st.k!=="ok"))
    .sort((a,b)=>ORDEM[a.st.k]-ORDEM[b.st.k] || String(a.data).localeCompare(String(b.data)));
  let html = semaf +
    '<h2>'+(VISTA.filtro?ROTULO[VISTA.filtro]:"Fila de execução")+'</h2>'+
    (lista.length ? '<div class="fila">'+lista.slice(0,VISTA.verTudo?999:7).map(t=>linha(t,false)).join("")+'</div>'+
        (!VISTA.verTudo && lista.length>7 ? '<button class="vermais" data-vertudo="1">Ver todas as '+lista.length+'</button>' : '')
      : vazioHTML(VISTA.filtro));

  if(VISTA.area==="mkt" || VISTA.area==="all"){
    const c48 = contadores(c);
    if(c48.length) html += '<h2>Contadores de 48h úteis — na mão do cliente</h2><div class="fila">'+c48.map(x=>{
        const nn=dias(x.vencimento);
        const k=nn<0?"atrasado":nn===0?"hoje":nn===1?"umdia":"semana";
        const txt=nn<0?"Aprovado automático":nn===0?"Vence hoje":"Faltam "+nn+" dias";
        return '<div class="row"><div class="tag t-'+k+'">'+txt+'</div>'+
          '<div class="tarefa">Aprovação de '+esc(x.tipo)+'<em>Enviado '+fmt(x.enviado)+' · lembrete '+fmt(x.lembrete)+'</em></div>'+
          '<div class="data">'+fmt(x.vencimento)+' <span class="dow">'+dow(x.vencimento)+'</span></div>'+
          '<div class="resp">Cliente</div></div>';
      }).join("")+'</div>';

    const extras = TODAS.filter(t=>t.clienteId===c.id && t.st.k==="ok" && t.st.atraso>0 && t.data)
      .map(t=>({etapa:t.tarefa, cliente:c.nome, limite:t.data, real:t.st.quando, dias:t.st.atraso,
                quem:(t.resp==="Cliente"?"Cliente":"MK3"), causa:"entregue fora do prazo", previsto:false, justificado:false}));
    const atr = atrasos(c).concat(extras).sort((a,b)=>b.dias-a.dias);
    const contam=atr.filter(a=>!a.previsto && !a.justificado);
    const jus=atr.filter(a=>a.justificado), prev=atr.filter(a=>a.previsto && !a.justificado);
    const sMK3=contam.filter(a=>a.quem==="MK3").reduce((s,a)=>s+a.dias,0);
    const sCli=contam.filter(a=>a.quem==="Cliente").reduce((s,a)=>s+a.dias,0);
    const sJus=jus.reduce((s,a)=>s+a.dias,0);
    if(atr.length){
      html += '<h2>Atrasos'+
        (contam.length?"  ·  placar — MK3: "+sMK3+"d · Cliente: "+sCli+"d":"")+
        (jus.length?"  ·  "+sJus+"d justificados (fora do placar)":"")+
        (prev.length?"  ·  "+prev.length+" previsto"+(prev.length>1?"s":""):"")+'</h2>'+
        '<div class="fila">'+atr.map(a=>
          '<div class="atr'+(a.justificado?" just":a.previsto?" prev":"")+'">'+
            '<div class="etapa">'+esc(a.etapa)+
              (a.justificado?' <span class="badge-just">Justificado</span>'
               : a.previsto?' <span class="badge-prev">Vai atrasar</span>':'')+
              '<em>'+esc(a.cliente)+(a.motivo?" · "+esc(a.motivo):(a.causa?" · "+esc(a.causa):""))+'</em></div>'+
            '<div class="data">limite '+fmt(a.limite)+'</div>'+
            '<div class="data">'+(a.previsto?"só em ":"saiu ")+fmt(a.real)+'</div>'+
            '<div class="n">+'+a.dias+' '+(a.dias===1?"dia útil":"dias úteis")+'</div>'+
            '<div class="quem q-'+a.quem+'">'+a.quem+'</div>'+
          '</div>').join("")+'</div>';
    }
  }
  return html;
}

/* ---------------- HISTÓRICO DO CLIENTE ---------------- */
function histHTML(c){
  const hojeIso = iso(HOJE);
  const ms = [...c.marcos].sort((a,b)=>a.data.localeCompare(b.data));
  if(!ms.length) return '<div class="vazio">Sem marcos registrados para '+esc(c.nome)+'.</div>';
  return '<div class="hist"><ol>'+ms.map(m=>{
    const passado = m.data <= hojeIso;
    const cls = m.data===hojeIso ? "hj" : (passado ? "feito" : "");
    return '<li class="'+cls+'">'+
      '<div class="qd">'+d(m.data).toLocaleDateString("pt-BR",{weekday:"long"})+'</div>'+
      '<div class="tt">'+esc(m.titulo)+(passado?"":'<span class="prev">previsto</span>')+'</div>'+
      '<div class="dt">'+d(m.data).toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"})+
      (m.detalhe?" · "+esc(m.detalhe):"")+'</div></li>';
  }).join("")+'</ol></div>';
}

/* ---------------- RENDER ---------------- */
function tituloContexto(){
  const c=VISTA.escopo?cliente(VISTA.escopo):null;
  const A={all:"Visão Geral",mkt:"Marketing Digital",fin:"Financeiro",com:"Comercial"};
  const V={cards:"Clientes",prio:"Prioridades",cal:"Calendário",lista:"Lista"};
  const AB={cal:"Calendário",tarefas:"Tarefas",hist:"Histórico"};
  let t = c ? c.nome : (V[VISTA.modo]||"");
  const bits=[A[VISTA.area]||""];
  if(c) bits.unshift(AB[VISTA.aba]||"");
  else if(VISTA.modo==="prio" && VISTA.psem) bits.push(fmt(VISTA.psem).slice(0,5)+" a "+fmt(addD(VISTA.psem,4)).slice(0,5));
  else if(VISTA.modo==="cal"){ const r=new Date(HOJE.getFullYear(),HOJE.getMonth()+VISTA.mes,1);
    bits.push(r.toLocaleDateString("pt-BR",{month:"long",year:"numeric"})); }
  return '<h1 class="ctx-t">'+esc(t)+'</h1><div class="ctx-s">'+bits.filter(Boolean).map(esc).join(" · ")+'</div>';
}
function loginHTML(pendente){
  const ps=ESTADO.pessoas||[];
  const cargo=p=>p.admin?"Administra\u00e7\u00e3o":({mkt:"Marketing Digital",fin:"Financeiro",com:"Comercial"}[(p.areas||[])[0]]||"Sem \u00e1rea");
  if(pendente){
    const p=ps.find(x=>x.nome===pendente)||{nome:pendente};
    return '<div class="login"><div class="login-box">'+
      '<div class="login-av">'+faceDe(p.nome)+'</div>'+
      '<h2>Ol\u00e1, '+esc(p.nome)+'</h2><p>Digite seu PIN para entrar.</p>'+
      '<input type="password" id="pinInput" inputmode="numeric" maxlength="8" placeholder="PIN" autocomplete="off">'+
      '<div id="pinErro" class="login-erro"></div>'+
      '<div class="login-acoes"><button data-pinok="'+escAttr(pendente)+'">Entrar</button>'+
      '<button class="sec" data-pincancel="1">Voltar</button></div></div></div>';
  }
  return '<div class="login"><div class="login-box wide">'+
    '<h2>Quem est\u00e1 usando?</h2><p>Cada pessoa v\u00ea apenas as \u00e1reas dela.</p>'+
    '<div class="login-lista">'+ps.map(p=>
      '<button class="login-p" data-entrar="'+escAttr(p.nome)+'">'+faceDe(p.nome)+
      '<span class="lp-n">'+esc(p.nome)+'</span><span class="lp-c">'+esc(cargo(p))+'</span>'+
      (p.pin?'<span class="lp-pin" title="Protegido por PIN">&#128274;</span>':'')+'</button>').join("")+
    '</div></div></div>';
}
function render(){
  if(!USUARIO){
    $("ctx").innerHTML=''; $("editbar").innerHTML=''; $("side").innerHTML='';
    $("view").innerHTML = loginHTML(VISTA.pinPara);
    const pi=document.getElementById("pinInput"); if(pi&&pi.focus) setTimeout(()=>pi.focus(),30);
    return;
  }
  $("ctx").innerHTML = tituloContexto();
  $("editbar").innerHTML =
    '<button class="ubtn" data-undo="1"'+(UNDO.length?"":" disabled")+' title="Desfazer">&#8624; Desfazer</button>'+
    '<button class="ubtn" data-redo="1"'+(REDO.length?"":" disabled")+' title="Refazer">&#8625; Refazer</button>'+
    '<span class="salvo" id="salvo" aria-live="polite"></span>'+
    (nMud()?'<span class="umud">'+nMud()+' '+(nMud()>1?"tarefas marcadas":"tarefa marcada")+' por você · salvo neste navegador</span>'
           :'<span class="umud dim">Clique numa tarefa para marcar. Atalhos: <span class="kbd">?</span></span>');
  $("side").innerHTML = sidebarHTML();

  const c = VISTA.escopo ? cliente(VISTA.escopo) : null;

  if(!c){
    let body;
    if(VISTA.modo==="prio")       body = prioridadesHTML();
    else if(VISTA.modo==="cards") body = '<div class="cards">'+cardsHTML()+'</div>';
    else if(VISTA.modo==="cal")   body = calendario(tarefasArea(), (VISTA.area==="all"||VISTA.area==="mkt")?CLIENTES.flatMap(x=>x.marcos):[], true);
    else                          body = listaGlobalHTML();
    $("view").innerHTML = body;
    return;
  }

  const cor = coresDe(c);
  const tabs = [["cal","Calendário"],["tarefas","Tarefas"],["hist","Histórico"]];
  const bar =
    '<div class="cli-bar"><button class="voltar" data-nav="home">&larr; Todos os clientes</button>'+
    '<div class="cli-title">'+avatarHTML(c,"cli-av2")+
      '<strong>'+esc(c.nome)+'</strong></div>'+
    '<div class="cli-tabs">'+tabs.map(t=>
      '<button class="'+(VISTA.aba===t[0]?"on":"")+'" data-cliaba="'+t[0]+'">'+t[1]+'</button>').join("")+'</div></div>';

  const body = VISTA.aba==="cal" ? calendario(tarefasCli(c), (VISTA.area==="all"||VISTA.area==="mkt")?c.marcos:[], false)
             : VISTA.aba==="tarefas" ? tarefasHTML(c)
             : histHTML(c);
  $("view").innerHTML = bar + body;
}

/* ---------------- CLIQUES ---------------- */
document.addEventListener("click", function(ev){
  const alvo = ev.target.closest("[data-area],[data-modo],[data-cliente],[data-cliaba],[data-nav],[data-mes],[data-dia],[data-bucket],[data-editar],[data-macao],[data-undo],[data-redo],[data-wkok],[data-wkx],[data-nota],[data-vermotivo],[data-view],[data-area],[data-side],[data-dropx],[data-demanda],[data-demx],[data-equipe],[data-trocarfoto],[data-pessoax],[data-rowok],[data-mover],[data-atrasadas],[data-portais],[data-copiar],[data-entrar],[data-pinok],[data-pincancel],[data-sair],[data-toastundo],[data-vertudo],[data-limpafiltro]");
  if(!alvo) return;
  const D = alvo.dataset;

  if(D.entrar){ tentarEntrar(D.entrar); return; }
  if(D.pinok){
    const v=(($("pinInput")&&$("pinInput").value)||"").trim();
    const p=(ESTADO.pessoas||[]).find(x=>x.nome===D.pinok);
    if(p && v===p.pin){ entrar(D.pinok); }
    else { const er=document.getElementById("pinErro"); if(er) er.textContent="PIN incorreto."; const pi=document.getElementById("pinInput"); if(pi){pi.value="";pi.focus();} }
    return;
  }
  if(D.pincancel){ VISTA.pinPara=null; render(); return; }
  if(D.sair){ sair(); return; }
  if(D.macao){ handleModal(D); return; }
  if(D.wkok){ marcarFeitoSemana(D.mcid,D.mtid,D.mday); return; }
  if(D.wkx){
    const jaX=xInfo(segOf(D.mday),D.mcid,D.mtid,D.mday);
    if(jaX){ neutralizar(D.mcid,D.mtid,D.mday); return; }
    abrirMotivo(D.mcid,D.mtid,D.mday); return;
  }
  if(D.vermotivo){ abrirMotivo(D.mcid,D.mtid,D.mday); return; }
  if(D.nota){ abrirNota(D.nota); return; }
  if(D.dia){ abrirDia(D.dia); return; }
  if(D.dropx){ removeDup(D.mcid,D.mtid,D.mday); return; }
  if(D.rowok){ concluirRapido(D.mcid,D.mtid); return; }
  if(D.mover){ abrirMover(D.mcid,D.mtid,D.mday); return; }
  if(D.atrasadas){ abrirAtrasadas(D.mday); return; }
  if(D.toastundo){ desfazer(); fecharToast(); return; }
  if(D.vertudo){ VISTA.verTudo=true; render(); return; }
  if(D.limpafiltro){ VISTA.filtro=null; render(); return; }
  if(D.demanda){ if(!ehAdmin()) return; abrirDemanda(D.demdia); return; }
  if(D.equipe){ if(!ehAdmin()) return; abrirEquipe(); return; }
  if(D.portais){ abrirPortais(); return; }
  if(D.copiar){
    const txt=D.copiar;
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(()=>toast("Link copiado",false),()=>{});
    else { const i=document.createElement("textarea"); i.value=txt; document.body.appendChild(i); i.select(); try{document.execCommand("copy");}catch(e){} i.remove(); toast("Link copiado",false); }
    return;
  }
  if(D.trocarfoto){ fotoAlvo=D.trocarfoto; const fi=$("fotoInput"); if(fi){ fi.value=""; fi.click(); } return; }
  if(D.pessoax){ removePessoa(D.pessoax); abrirEquipe(); return; }
  if(D.demx){ removeDemanda(D.demx); abrirDemanda(); return; }
  if(D.side==="toggle"){ VISTA.side=!VISTA.side; try{localStorage.setItem("mk3_side",VISTA.side?"1":"0");}catch(e){} const ap=$("app"); if(ap) ap.classList.toggle("side-col",VISTA.side); return; }
  if(D.view){ VISTA.escopo=null; VISTA.modo=D.view; VISTA.filtro=null; VISTA.dia=null; VISTA.verTudo=false; render(); window.scrollTo({top:0,behavior:"smooth"}); return; }
  if(D.area){ if(!podeArea(D.area)) return; VISTA.escopo=null; VISTA.area=D.area; VISTA.filtro=null; VISTA.dia=null; VISTA.verTudo=false; render(); window.scrollTo({top:0,behavior:"smooth"}); return; }
  if(D.editar){ abrirEditor(D.mcid, D.mtid); return; }
  if(D.undo){ desfazer(); return; }
  if(D.redo){ refazer(); return; }

  let topo = true;

  if(D.cliente){ VISTA.escopo=D.cliente; VISTA.aba="cal"; VISTA.mes=0; VISTA.dia=null; VISTA.filtro=null; }
  if(D.nav==="home"){ VISTA.escopo=null; VISTA.filtro=null; VISTA.dia=null; }
  if(D.cliaba){ VISTA.aba=D.cliaba; VISTA.filtro=null; VISTA.dia=null; }
  if(D.mes!==undefined){ const nn=Number(D.mes); VISTA.mes=(nn===0)?0:VISTA.mes+nn; VISTA.dia=null; topo=false; }
  if(D.bucket){ VISTA.filtro=(VISTA.filtro===D.bucket)?null:D.bucket; topo=false; }

  render();
  if(topo) window.scrollTo({top:0,behavior:"smooth"});
});

document.addEventListener("change", function(ev){
  const pm=ev.target.closest("[data-perm]");
  if(pm){ setPerm(pm.dataset.pnome, pm.dataset.perm, pm.checked); return; }
  const pn=ev.target.closest("[data-pin]");
  if(pn){ setPin(pn.dataset.pin, pn.value); return; }
  const el=ev.target.closest("[data-sel]"); if(!el) return;
  const w=el.dataset.sel, v=el.value;
  if(w==="ano"){ VISTA.pano=Number(v); const ws=semanasDoMes(VISTA.pano,VISTA.pmes); VISTA.psem=ws[0]||VISTA.psem; }
  else if(w==="mes"){ VISTA.pmes=Number(v); const ws=semanasDoMes(VISTA.pano,VISTA.pmes); VISTA.psem=ws[0]||VISTA.psem; }
  else if(w==="semana"){ VISTA.psem=v; }
  render();
});

/* drag por ponteiro (funciona no mouse real e é robusto) */
let DRAG=null;
function limparDragover(){ document.querySelectorAll(".bcol.dragover").forEach(x=>x.classList.remove("dragover")); }
document.addEventListener("mousedown", function(e){
  const card=e.target&&e.target.closest&&e.target.closest("[data-drag]");
  if(!card) return;
  if(e.target.closest("button")) return;   // clicar nos botões não arrasta
  e.preventDefault();
  const r=card.getBoundingClientRect();
  const ghost=card.cloneNode(true); ghost.classList.add("drag-ghost"); ghost.style.width=r.width+"px";
  document.body.appendChild(ghost);
  DRAG={data:card.getAttribute("data-drag"), ghost, ox:e.clientX-r.left, oy:e.clientY-r.top, moved:false, card};
  ghost.style.left=(e.clientX-DRAG.ox)+"px"; ghost.style.top=(e.clientY-DRAG.oy)+"px";
});
document.addEventListener("mousemove", function(e){
  if(!DRAG) return;
  DRAG.moved=true; DRAG.card.classList.add("dragging");
  DRAG.ghost.style.left=(e.clientX-DRAG.ox)+"px"; DRAG.ghost.style.top=(e.clientY-DRAG.oy)+"px";
  const el=document.elementFromPoint(e.clientX,e.clientY);
  const col=el&&el.closest?el.closest("[data-daycol]"):null;
  limparDragover(); if(col) col.classList.add("dragover");
});
document.addEventListener("mouseup", function(e){
  if(!DRAG) return;
  const st=DRAG; DRAG=null;
  st.ghost.remove(); st.card.classList.remove("dragging"); limparDragover();
  if(!st.moved) return;
  const el=document.elementFromPoint(e.clientX,e.clientY);
  const col=el&&el.closest?el.closest("[data-daycol]"):null;
  if(!col) return;
  const p=st.data.split("|");
  duplicarTarefa(p[0],p[1],col.getAttribute("data-daycol"));
});

/* ---- atalhos de teclado (4.3) ---- */
function abrirAtalhos(){
  const L=[["?","Esta lista de atalhos"],["N","Nova demanda"],["T","Ir para hoje / semana atual"],
           ["&larr; &rarr;","Semana ou mês anterior / seguinte"],["Esc","Fechar janela ou dica"],
           ["Ctrl+Z","Desfazer"],["Ctrl+Shift+Z","Refazer"]];
  const mm=$("modal");
  mm.innerHTML='<div class="mbox atalhos"><h3>Atalhos de teclado</h3>'+
    '<p class="msub">Funcionam quando você não está digitando num campo.</p>'+
    L.map(a=>'<div class="at-row"><span>'+a[1]+'</span><span class="kbd">'+a[0]+'</span></div>').join("")+
    '<div class="mbtns"><button class="sec" data-macao="fechar">Fechar</button></div></div>';
  mostrarModal();
}
document.addEventListener("keydown", function(e){
  if(e.key==="Enter" && e.target && e.target.id==="pinInput"){
    const nome=VISTA.pinPara; const v=(e.target.value||"").trim();
    const p=(ESTADO.pessoas||[]).find(x=>x.nome===nome);
    if(p && v===p.pin) entrar(nome);
    else { const er=document.getElementById("pinErro"); if(er) er.textContent="PIN incorreto."; e.target.value=""; }
    return;
  }
  const tag=(e.target.tagName||"").toLowerCase();
  const digitando = tag==="input"||tag==="textarea"||tag==="select"||e.target.isContentEditable;
  if(e.key==="Escape"){ if(modalAberto()){ fecharModal(); return; } fecharToast(); return; }
  if(digitando) return;
  if(!USUARIO) return;
  const mod=e.ctrlKey||e.metaKey;
  if(mod && (e.key==="z"||e.key==="Z")){ e.preventDefault(); if(e.shiftKey) refazer(); else desfazer(); return; }
  if(mod) return;
  if(e.key==="?"){ e.preventDefault(); abrirAtalhos(); return; }
  if(modalAberto()) return;
  if(e.key==="n"||e.key==="N"){ if(!ehAdmin()) return; e.preventDefault(); abrirDemanda(); return; }
  if(e.key==="t"||e.key==="T"){
    if(VISTA.modo==="prio"){ VISTA.pano=HOJE.getFullYear(); VISTA.pmes=HOJE.getMonth(); VISTA.psem=segOf(iso(HOJE)); }
    else VISTA.mes=0;
    render(); return;
  }
  if(e.key==="ArrowLeft"||e.key==="ArrowRight"){
    const d1=e.key==="ArrowRight"?1:-1;
    if(VISTA.modo==="prio"&&!VISTA.escopo){ VISTA.psem=addD(VISTA.psem,7*d1); const r=d(VISTA.psem); VISTA.pano=r.getFullYear(); VISTA.pmes=r.getMonth(); }
    else { VISTA.mes+=d1; VISTA.dia=null; }
    render(); return;
  }
});

let fotoAlvo=null;
(function(){ const fi=document.getElementById("fotoInput"); if(!fi) return;
  fi.addEventListener("change", function(e){
    const f=e.target.files&&e.target.files[0]; if(!f||!fotoAlvo) return;
    const rd=new FileReader();
    rd.onload=function(){ const img=new Image();
      img.onload=function(){ const s=Math.min(img.width,img.height),sx=(img.width-s)/2,sy=(img.height-s)/2;
        const cv=document.createElement("canvas"); cv.width=128; cv.height=128;
        cv.getContext("2d").drawImage(img,sx,sy,s,s,0,0,128,128);
        setFotoPessoa(fotoAlvo, cv.toDataURL("image/jpeg",0.82)); fotoAlvo=null; abrirEquipe(); };
      img.src=rd.result; };
    rd.readAsDataURL(f);
  });
})();

init();
