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
  add("renov","Recorrente","Aviso de renovação / ação comercial","20 dias antes do vencimento",
      c.vencimentoContrato?addD(c.vencimentoContrato,-20):null,"Gestão");
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

const ORDEM   = {atrasado:0,hoje:1,umdia:2,semana:3,sem:4,futuro:5,ok:6};
const ROTULO  = {atrasado:"Atrasado",hoje:"Vence hoje",umdia:"Falta 1 dia",
                 semana:"Esta semana",sem:"Sem data",futuro:"Programado",ok:"Concluído"};
const BUCKETS = ["atrasado","hoje","umdia","semana","sem","ok"];

/* ---- áreas (filtro do topo) ---- */
const AREAS = [{k:"mkt",rot:"Marketing Digital"},{k:"fin",rot:"Financeiro"},{k:"com",rot:"Comercial"}];
function areaDe(t){
  if(/^pag_/.test(t.id) || /^fotos_/.test(t.id)) return "fin";
  if(["fimContrato","entregaMateriais","renov","renovacao_atrasada"].includes(t.id)) return "com";
  return "mkt";
}

const VISTA  = { area:"mkt", escopo:null, aba:"cal", mes:0, dia:null, filtro:null };
const TODAS  = CLIENTES.flatMap(c=>regras(c).map(t=>({...t, st:status(t), area:areaDe(t)})));
const cliente = id => CLIENTES.find(c=>c.id===id);
const tarefasCli = c => TODAS.filter(t=>t.clienteId===c.id && t.area===VISTA.area);

$("hoje").textContent = HOJE.toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});

/* ---- visual do cliente (banner + avatar por segmento) ---- */
function coresSeg(seg){
  const M = {
    "corretor":["#2f9150","#155a2c"], "corretora":["#8f5fb0","#573477"],
    "corretor de imóveis":["#2f9150","#155a2c"],
    "varejo":["#b98fb0","#6f4f6a"], "moda":["#c07bb0","#7a3f6a"],
    "escola":["#a0703f","#5f4020"], "educação":["#a0703f","#5f4020"],
    "tecnologia":["#3f6fa0","#20405f"], "saúde":["#3fa0a0","#205f5f"],
    "alimentação":["#c08a3f","#7a5320"], "beleza":["#c05f8f","#7a3f5f"]
  };
  return M[(seg||"").toLowerCase()] || ["#4c6b8f","#2a3f5a"];
}
const iniciais = n => (n||"?").trim().split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase();

/* ---- linha de tarefa (usada em Tarefas e no dia do calendário) ---- */
const linha = t => '<div class="row">'+
  '<div class="tag t-'+t.st.k+(t.st.atraso?' okatraso':'')+'">'+t.st.txt+'</div>'+
  '<div class="tarefa">'+esc(t.tarefa)+(t.detalhe?'<em>'+esc(t.detalhe)+'</em>':'')+'</div>'+
  '<div class="data">'+fmt(t.data)+' <span class="dow">'+dow(t.data)+'</span></div>'+
  '<div class="resp">'+esc(t.resp)+'</div></div>';

/* ---------------- HOME: CARDS ---------------- */
function cardsHTML(){
  return CLIENTES.map(c=>{
    const ts = tarefasCli(c);
    const n  = ks => ts.filter(t=>ks.includes(t.st.k)).length;
    const cor = coresSeg(c.segmento);
    const tiles = [
      ["atrasado","Atrasado",     n(["atrasado"])],
      ["hoje","Vence hoje",       n(["hoje","umdia"])],
      ["semana","A fazer",        n(["semana","futuro","sem"])],
      ["ok","Concluído",          n(["ok"])]
    ];
    return '<button class="ccard" data-cliente="'+c.id+'">'+
      '<div class="ccard-banner" style="background:linear-gradient(135deg,'+cor[0]+' 0%,'+cor[1]+' 100%)"></div>'+
      '<div class="ccard-av" style="background:'+cor[1]+'">'+esc(iniciais(c.marca||c.nome))+'</div>'+
      '<div class="ccard-body">'+
        '<div class="ccard-top"><h3>'+esc(c.marca||c.nome)+'</h3><span class="badge-ativo">Ativo</span></div>'+
        (c.segmento?'<span class="seg">'+esc(c.segmento)+'</span>':'')+
        '<div class="ccard-stats">'+tiles.map(t=>
          '<div class="stat s-'+t[0]+'"><i></i><b>'+t[2]+'</b> '+t[1]+'</div>').join("")+'</div>'+
      '</div></button>';
  }).join("");
}

/* ---------------- CALENDÁRIO DO CLIENTE ---------------- */
function calHTML(c){
  const base = tarefasCli(c).filter(t=>t.data);
  const ref  = new Date(HOJE.getFullYear(), HOJE.getMonth()+VISTA.mes, 1);
  const ano  = ref.getFullYear(), mes = ref.getMonth();
  const desloc = new Date(ano,mes,1).getDay();          // domingo = 0 (semana começa no domingo)
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
    const mk   = c.marcos.filter(m=>m.data===s);
    const cls  = ["cel", fora?"fora":"", fds?"fds":"", s===hojeIso?"hj":"", s===VISTA.dia?"sel":""].filter(Boolean).join(" ");
    const marco = mk.length ? '<div class="ev t-ok" title="'+esc(mk[0].titulo)+'">◆ '+esc(mk[0].titulo)+'</div>' : "";
    const teto = mk.length ? 2 : 3;
    const evsHtml = evs.slice(0,teto).map(t=>
      '<div class="ev t-'+t.st.k+(t.st.atraso?' okatraso':'')+'" title="'+esc(t.tarefa)+'">'+esc(t.tarefa)+'</div>').join("");
    const resto = evs.length - teto;
    const extra = resto>0 ? '<div class="mais">+'+resto+' '+(resto===1?"tarefa":"tarefas")+'</div>' : "";
    cells += '<div class="'+cls+'" data-dia="'+s+'"><div class="n">'+dt.getDate()+'</div>'+marco+evsHtml+extra+'</div>';
  }

  let dayList="";
  if(VISTA.dia){
    const evs = base.filter(t=>t.data===VISTA.dia).sort((a,b)=>ORDEM[a.st.k]-ORDEM[b.st.k]);
    const titulo = d(VISTA.dia).toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"});
    dayList = '<div class="calDia"><h2>'+titulo+'</h2>'+(evs.length
      ? '<div class="fila">'+evs.map(linha).join("")+'</div>'
      : '<div class="vazio">Nenhuma tarefa neste dia.</div>')+'</div>';
  }

  return '<div class="cal-nav"><button data-mes="-1">&lsaquo;</button>'+
      '<strong>'+ref.toLocaleDateString("pt-BR",{month:"long",year:"numeric"})+'</strong>'+
      '<button data-mes="1">&rsaquo;</button><button class="hj" data-mes="0">Hoje</button></div>'+
    '<div class="cal"><div class="cal-dow">'+
      '<div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div></div>'+
      '<div class="cal-grid">'+cells+'</div></div>'+dayList;
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
    (lista.length ? '<div class="fila">'+lista.map(linha).join("")+'</div>'
                  : '<div class="vazio">Nada aqui'+(VISTA.filtro?" em <strong>"+ROTULO[VISTA.filtro]+"</strong>":"")+'.</div>');

  if(VISTA.area==="mkt"){
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

    const atr = atrasos(c).sort((a,b)=>b.dias-a.dias);
    const contam=atr.filter(a=>!a.previsto && !a.justificado);
    const jus=atr.filter(a=>a.justificado), prev=atr.filter(a=>a.previsto && !a.justificado);
    const sMK3=contam.filter(a=>a.quem==="MK3").reduce((s,a)=>s+a.dias,0);
    const sCli=contam.filter(a=>a.quem==="Cliente").reduce((s,a)=>s+a.dias,0);
    const sJus=jus.reduce((s,a)=>s+a.dias,0);
    html += '<h2>Atrasos'+
      (contam.length?"  ·  placar — MK3: "+sMK3+"d · Cliente: "+sCli+"d":"")+
      (jus.length?"  ·  "+sJus+"d justificados (fora do placar)":"")+
      (prev.length?"  ·  "+prev.length+" previsto"+(prev.length>1?"s":""):"")+'</h2>';
    html += atr.length
      ? '<div class="fila">'+atr.map(a=>
          '<div class="atr'+(a.justificado?" just":a.previsto?" prev":"")+'">'+
            '<div class="etapa">'+esc(a.etapa)+
              (a.justificado?' <span class="badge-just">Justificado</span>'
               : a.previsto?' <span class="badge-prev">Vai atrasar</span>':'')+
              '<em>'+esc(a.cliente)+(a.motivo?" · "+esc(a.motivo):(a.causa?" · "+esc(a.causa):""))+'</em></div>'+
            '<div class="data">limite '+fmt(a.limite)+'</div>'+
            '<div class="data">'+(a.previsto?"só em ":"saiu ")+fmt(a.real)+'</div>'+
            '<div class="n">+'+a.dias+' '+(a.dias===1?"dia útil":"dias úteis")+'</div>'+
            '<div class="quem q-'+a.quem+'">'+a.quem+'</div>'+
          '</div>').join("")+'</div>'
      : '<div class="ok-prazo">Nenhum atraso. Tudo dentro do prazo.</div>';
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
function render(){
  $("areas").innerHTML = AREAS.map(a=>
    '<button class="areabtn '+(VISTA.area===a.k?"on":"")+'" data-area="'+a.k+'">'+a.rot+'</button>').join("");

  const c = VISTA.escopo ? cliente(VISTA.escopo) : null;

  if(!c){
    $("view").innerHTML = '<div class="cards">'+cardsHTML()+'</div>';
    return;
  }

  const cor = coresSeg(c.segmento);
  const tabs = [["cal","Calendário"],["tarefas","Tarefas"],["hist","Histórico"]];
  const bar =
    '<div class="cli-bar"><button class="voltar" data-nav="home">&larr; Clientes</button>'+
    '<div class="cli-title"><span class="cli-av2" style="background:'+cor[1]+'">'+esc(iniciais(c.marca||c.nome))+'</span>'+
      '<strong>'+esc(c.marca||c.nome)+'</strong>'+(c.segmento?' <span class="seg">'+esc(c.segmento)+'</span>':'')+'</div>'+
    '<div class="cli-tabs">'+tabs.map(t=>
      '<button class="'+(VISTA.aba===t[0]?"on":"")+'" data-cliaba="'+t[0]+'">'+t[1]+'</button>').join("")+'</div></div>';

  const body = VISTA.aba==="cal" ? calHTML(c)
             : VISTA.aba==="tarefas" ? tarefasHTML(c)
             : histHTML(c);
  $("view").innerHTML = bar + body;
}

/* ---------------- CLIQUES ---------------- */
document.addEventListener("click", function(ev){
  const alvo = ev.target.closest("[data-area],[data-cliente],[data-cliaba],[data-nav],[data-mes],[data-dia],[data-bucket]");
  if(!alvo) return;
  const D = alvo.dataset;
  let topo = true;

  if(D.area){ VISTA.area=D.area; VISTA.filtro=null; VISTA.dia=null; }
  if(D.cliente){ VISTA.escopo=D.cliente; VISTA.aba="cal"; VISTA.mes=0; VISTA.dia=null; VISTA.filtro=null; }
  if(D.nav==="home"){ VISTA.escopo=null; VISTA.filtro=null; VISTA.dia=null; }
  if(D.cliaba){ VISTA.aba=D.cliaba; VISTA.filtro=null; VISTA.dia=null; }
  if(D.mes!==undefined){ const nn=Number(D.mes); VISTA.mes=(nn===0)?0:VISTA.mes+nn; VISTA.dia=null; topo=false; }
  if(D.dia){ VISTA.dia=(VISTA.dia===D.dia)?null:D.dia; topo=false; }
  if(D.bucket){ VISTA.filtro=(VISTA.filtro===D.bucket)?null:D.bucket; topo=false; }

  render();
  if(topo) window.scrollTo({top:0,behavior:"smooth"});
});

render();
