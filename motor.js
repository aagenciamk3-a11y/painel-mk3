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
    add("c1_ajuste","1º ciclo","Se pedir alteração: devolver o ajuste","2 dias úteis para a MK3 devolver",uteis(limAprPlan,PRAZO),"Analista");
    add("c1_roteiro","1º ciclo","Enviar roteiro à produtora",
        "No mesmo dia da aprovação do planejamento", baseAprPlan, "Analista");
    if(c.gravacao)
      add("c1_gravacao","1º ciclo","Gravação + fotos","Manhã, 8h às 17h · insumo das artes",c.gravacao,"Produtora / Cliente");
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

/* ---------------- NAVEGAÇÃO ---------------- */
const ORDEM   = {atrasado:0,hoje:1,umdia:2,semana:3,sem:4,futuro:5,ok:6};
const ROTULO  = {atrasado:"Atrasado",hoje:"Vence hoje",umdia:"Falta 1 dia",
                 semana:"Esta semana",sem:"Sem data",ok:"Concluído"};
const BUCKETS = ["atrasado","hoje","umdia","semana","sem","ok"];

const VISTA = { aba:"painel", escopo:null, filtro:null, mes:0, dia:null };
const TODAS = CLIENTES.flatMap(c=>regras(c).map(t=>({...t, st:status(t)})));
const cliente = id => CLIENTES.find(c=>c.id===id);

const noEscopo = () => VISTA.escopo ? TODAS.filter(t=>t.clienteId===VISTA.escopo) : TODAS;
const visiveis = () => {
  const base = noEscopo();
  return VISTA.filtro ? base.filter(t=>t.st.k===VISTA.filtro) : base.filter(t=>t.st.k!=="ok");
};

const $ = id => document.getElementById(id);

$("hoje").textContent = HOJE.toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});

function chipsHTML(c, comFiltro){
  const ch=[];
  if(c) ch.push('<span class="chip"><i>Cliente</i> '+c.nome+
    ' <button data-limpa="escopo" title="Ver todos os clientes">×</button></span>');
  if(comFiltro && VISTA.filtro) ch.push('<span class="chip"><i>Status</i> '+ROTULO[VISTA.filtro]+
    ' <button data-limpa="filtro" title="Ver todos os status">×</button></span>');
  if(ch.length) ch.push('<button class="limpar" data-limpa="tudo">Ver tudo</button>');
  return ch.length ? ch.join("")
    : '<span style="font-size:12px;color:var(--mut)">Mostrando todos os clientes.</span>';
}

const linha = t => '<div class="row">'+
  '<div class="tag t-'+t.st.k+(t.st.atraso?' okatraso':'')+'">'+t.st.txt+'</div>'+
  '<div class="tarefa">'+t.tarefa+'<em>'+(t.detalhe||"")+'</em></div>'+
  '<div class="cli">'+t.cliente+'</div>'+
  '<div class="data">'+fmt(t.data)+' <span class="dow">'+dow(t.data)+'</span></div>'+
  '<div class="resp">'+t.resp+'</div></div>';

/* ---------------- RENDER ---------------- */
function render(){
  const c = VISTA.escopo ? cliente(VISTA.escopo) : null;

  $("nav").innerHTML =
    '<button class="'+(VISTA.aba==="painel" && !VISTA.escopo ? "on":"")+'" data-nav="geral">Visão geral</button>'+
    '<button class="'+(VISTA.aba==="calendario"?"on":"")+'" data-nav="calendario">Calendário</button>'+
    '<button class="'+(VISTA.aba==="historico"?"on":"")+'" data-nav="historico">Histórico</button>'+
    '<button class="'+(VISTA.aba==="clientes"?"on":"")+'" data-nav="clientes">Clientes <b>'+CLIENTES.length+'</b></button>'+
    (c ? '<button class="'+(VISTA.aba==="painel"?"on":"")+'" data-nav="cliente">'+c.nome+'</button>' : "");

  $("aba-painel").hidden     = VISTA.aba!=="painel";
  $("aba-calendario").hidden = VISTA.aba!=="calendario";
  $("aba-historico").hidden  = VISTA.aba!=="historico";
  $("aba-clientes").hidden   = VISTA.aba!=="clientes";

  if(VISTA.aba==="clientes"){   renderGrade(); return; }
  if(VISTA.aba==="calendario"){ $("chipsCal").innerHTML  = chipsHTML(c,false); renderCal(c);  return; }
  if(VISTA.aba==="historico"){  $("chipsHist").innerHTML = chipsHTML(c,false); renderHist(c); return; }

  $("chips").innerHTML = chipsHTML(c,true);

  const base = noEscopo();
  $("semaforo").innerHTML = BUCKETS.map(k =>
    '<div class="sf '+k+' '+(VISTA.filtro===k?"on":"")+'" data-bucket="'+k+'">'+
    '<b>'+base.filter(t=>t.st.k===k).length+'</b><small>'+ROTULO[k]+'</small></div>').join("");

  $("tituloFila").textContent =
    (VISTA.filtro ? ROTULO[VISTA.filtro] : "Fila de execução") + (c ? " · "+c.nome : " · todos os clientes");

  const lista = visiveis().sort((a,b)=>
    ORDEM[a.st.k]-ORDEM[b.st.k] || String(a.data).localeCompare(String(b.data)));
  $("fila").innerHTML = lista.length
    ? '<div class="fila">'+lista.map(linha).join("")+'</div>'
    : '<div class="vazio">Nada aqui'+(VISTA.filtro?" em <strong>"+ROTULO[VISTA.filtro]+"</strong>":"")+
      (c?" para "+c.nome:"")+'.</div>';

  const c48 = (c?[c]:CLIENTES).flatMap(contadores);
  $("c48").innerHTML = c48.length
    ? '<div class="fila">'+c48.map(x=>{
        const n=dias(x.vencimento);
        const k=n<0?"atrasado":n===0?"hoje":n===1?"umdia":"semana";
        const txt=n<0?"Aprovado automático":n===0?"Vence hoje":"Faltam "+n+" dias";
        return '<div class="row"><div class="tag t-'+k+'">'+txt+'</div>'+
          '<div class="tarefa">Aprovação de '+x.tipo+'<em>Enviado '+fmt(x.enviado)+' · lembrete '+fmt(x.lembrete)+'</em></div>'+
          '<div class="cli">'+x.cliente+'</div>'+
          '<div class="data">'+fmt(x.vencimento)+' <span class="dow">'+dow(x.vencimento)+'</span></div>'+
          '<div class="resp">Cliente</div></div>';
      }).join("")+'</div>'
    : '<div class="vazio">Nenhum contador ativo. Ele nasce quando você me avisar que enviou algo — por exemplo '+
      '<code>enviei o planejamento do Lorenzo hoje</code>. Aí eu marco o lembrete de 1 dia útil e a aprovação '+
      'automática em 2 dias úteis, e a cadeia inteira se re-ancora nessa data.</div>';

  /* ---- atrasos ---- */
  const atr = (c?[c]:CLIENTES).flatMap(atrasos).sort((a,b)=>b.dias-a.dias);
  const contam  = atr.filter(a=>!a.previsto && !a.justificado);   // entram no placar
  const jus     = atr.filter(a=>a.justificado);
  const prev    = atr.filter(a=>a.previsto && !a.justificado);
  const somaMK3 = contam.filter(a=>a.quem==="MK3").reduce((s,a)=>s+a.dias,0);
  const somaCli = contam.filter(a=>a.quem==="Cliente").reduce((s,a)=>s+a.dias,0);
  const somaJus = jus.reduce((s,a)=>s+a.dias,0);
  $("tituloAtrasos").textContent = "Atrasos" +
    (contam.length ? "  ·  placar — MK3: "+somaMK3+"d · Cliente: "+somaCli+"d" : "") +
    (jus.length  ? "  ·  "+somaJus+"d justificados (fora do placar)" : "") +
    (prev.length ? "  ·  "+prev.length+" previsto"+(prev.length>1?"s":"") : "");
  $("atrasos").innerHTML = atr.length
    ? '<div class="fila">'+atr.map(a=>
        '<div class="atr'+(a.justificado?" just":a.previsto?" prev":"")+'">'+
          '<div class="etapa">'+a.etapa+
            (a.justificado?' <span class="badge-just">Justificado</span>'
             : a.previsto?' <span class="badge-prev">Vai atrasar</span>':'')+
            '<em>'+a.cliente+(a.motivo?" · "+a.motivo:(a.causa?" · "+a.causa:""))+'</em></div>'+
          '<div class="data">limite '+fmt(a.limite)+'</div>'+
          '<div class="data">'+(a.previsto?"só em ":"saiu ")+fmt(a.real)+'</div>'+
          '<div class="n">+'+a.dias+' '+(a.dias===1?"dia útil":"dias úteis")+'</div>'+
          '<div class="quem q-'+a.quem+'">'+a.quem+'</div>'+
        '</div>').join("")+'</div>'
    : '<div class="ok-prazo">Nenhum atraso'+(c?" para "+c.nome:"")+'. Tudo dentro do prazo.</div>';

  $("detalhe").innerHTML = (c && !VISTA.filtro) ? "<h2>Linha do tempo · "+c.nome+"</h2>"+ficha(c) : "";
}

/* ---------------- CALENDÁRIO ---------------- */
function renderCal(c){
  /* barra de filtros — por enquanto: Cliente. Fácil de crescer. */
  const btn = (rot,val,ativo) =>
    '<button class="opt '+(ativo?"on":"")+'" data-fcliente="'+val+'">'+rot+'</button>';
  $("filtros").innerHTML =
    '<h3>Filtros</h3>'+
    '<div class="filtro-linha"><span class="rot">Cliente</span>'+
      btn("Todos","", !VISTA.escopo)+
      CLIENTES.map(x=>btn(x.nome, x.id, VISTA.escopo===x.id)).join("")+
    '</div>';

  const base = (c ? TODAS.filter(t=>t.clienteId===c.id) : TODAS).filter(t=>t.data);
  const ref  = new Date(HOJE.getFullYear(), HOJE.getMonth()+VISTA.mes, 1);
  const ano  = ref.getFullYear(), mes = ref.getMonth();

  $("mesRef").textContent = ref.toLocaleDateString("pt-BR",{month:"long",year:"numeric"});

  const desloc = (new Date(ano,mes,1).getDay()+6)%7;   // semana começa na segunda
  const ini = new Date(ano,mes,1-desloc);
  const hojeIso = iso(HOJE);
  const donos = c?[c]:CLIENTES;

  /* quantas semanas o mês realmente ocupa (5 ou 6) — não força 6 sempre */
  const diasNoMes = new Date(ano,mes+1,0).getDate();
  const semanas = Math.ceil((desloc + diasNoMes)/7);

  let html="";
  for(let i=0;i<semanas*7;i++){
    const dt = new Date(ini); dt.setDate(ini.getDate()+i);
    const s = iso(dt);
    const fora = dt.getMonth()!==mes;
    const fds  = dt.getDay()===0 || dt.getDay()===6;
    const evs  = base.filter(t=>t.data===s);
    const mk   = donos.flatMap(x=>x.marcos.filter(m=>m.data===s));
    const cls  = ["cel", fora?"fora":"", fds?"fds":"", s===hojeIso?"hj":"", s===VISTA.dia?"sel":""]
                 .filter(Boolean).join(" ");
    const marco = mk.length
      ? '<div class="ev t-ok" title="'+mk[0].titulo+'">◆ '+mk[0].titulo+'</div>' : "";
    const teto = mk.length ? 2 : 3;
    const evsHtml = evs.slice(0,teto).map(t=>
      '<div class="ev t-'+t.st.k+'" title="'+t.tarefa+' — '+t.cliente+'">'+
      (c?"":t.cliente+": ")+t.tarefa+'</div>').join("");
    const resto = evs.length - teto;
    const extra = resto>0 ? '<div class="mais">+'+resto+' '+(resto===1?"tarefa":"tarefas")+'</div>' : "";
    html += '<div class="'+cls+'" data-dia="'+s+'"><div class="n">'+dt.getDate()+'</div>'+
            marco+evsHtml+extra+'</div>';
  }
  $("calGrid").innerHTML = html;

  if(!VISTA.dia){ $("calDia").innerHTML = ""; return; }
  const evs = base.filter(t=>t.data===VISTA.dia).sort((a,b)=>ORDEM[a.st.k]-ORDEM[b.st.k]);
  const titulo = d(VISTA.dia).toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"});
  $("calDia").innerHTML = "<h2>"+titulo+"</h2>" + (evs.length
    ? '<div class="fila">'+evs.map(linha).join("")+'</div>'
    : '<div class="vazio">Nenhuma tarefa neste dia.</div>');
}

/* ---------------- HISTÓRICO ---------------- */
function renderHist(c){
  const alvo = c ? [c] : CLIENTES;
  const hojeIso = iso(HOJE);
  $("historico").innerHTML = alvo.map(x=>{
    const ms = [...x.marcos].sort((a,b)=>a.data.localeCompare(b.data));
    if(!ms.length) return '<div class="vazio">Sem marcos registrados para '+x.nome+'.</div>';
    return '<h2 style="margin-top:0">'+x.nome+'</h2><div class="hist"><ol>'+ms.map(m=>{
      const passado = m.data <= hojeIso;
      const cls = m.data===hojeIso ? "hj" : (passado ? "feito" : "");
      return '<li class="'+cls+'">'+
        '<div class="qd">'+d(m.data).toLocaleDateString("pt-BR",{weekday:"long"})+'</div>'+
        '<div class="tt">'+m.titulo+(passado?"":'<span class="prev">previsto</span>')+'</div>'+
        '<div class="dt">'+d(m.data).toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"})+
        (m.detalhe?" · "+m.detalhe:"")+'</div></li>';
    }).join("")+'</ol></div>';
  }).join('<div style="height:28px"></div>');
}

/* ---------------- GRADE DE CLIENTES ---------------- */
function renderGrade(){
  $("grade").innerHTML = CLIENTES.map(c=>{
    const ts = TODAS.filter(t=>t.clienteId===c.id);
    const n  = k => ts.filter(t=>t.st.k===k).length;
    const pin = k => n(k) ? '<span class="tag t-'+k+'">'+n(k)+' '+ROTULO[k].toLowerCase()+'</span>' : "";
    return '<button class="cli-card" data-cliente="'+c.id+'">'+
      '<h3>'+c.nome+'</h3>'+
      '<div class="sub">'+(c.segmento||"segmento pendente")+' · entrada '+fmt(c.entrada)+'</div>'+
      '<div class="mini">'+pin("atrasado")+pin("hoje")+pin("umdia")+pin("semana")+pin("sem")+'</div></button>';
  }).join("");
}

/* ---------------- FICHA DO CLIENTE ---------------- */
function ficha(c){
  const ts = TODAS.filter(t=>t.clienteId===c.id);
  const bloco = f => {
    const its = ts.filter(t=>t.fase===f);
    if(!its.length) return "";
    return '<div class="fase"><h4>'+f+'</h4>'+its.map(t=>
      '<div class="li"><div class="tag t-'+t.st.k+(t.st.atraso?' okatraso':'')+'">'+t.st.txt+'</div>'+
      '<div class="tarefa">'+t.tarefa+'</div>'+
      '<div class="data">'+fmt(t.data)+' <span class="dow">'+dow(t.data)+'</span></div></div>').join("")+'</div>';
  };
  const p = v => v ? v : '<span class="pend">pendente</span>';
  return '<div class="card"><div class="cabec"><h3>'+c.nome+'</h3><div class="meta">'+
    '<div><span>Segmento</span>'+p(c.segmento)+'</div>'+
    '<div><span>Plano</span>'+p(c.plano)+'</div>'+
    '<div><span>Entrada</span>'+fmt(c.entrada)+'</div>'+
    '<div><span>Vencimento</span>'+p(c.vencimentoContrato && fmt(c.vencimentoContrato))+'</div>'+
    '</div></div>'+
    bloco("Entrada")+bloco("1º ciclo")+bloco("Ciclo padrão")+bloco("Recorrente")+bloco("Contrato")+'</div>';
}

/* ---------------- CLIQUES ---------------- */
document.addEventListener("click", function(ev){
  const alvo = ev.target.closest("[data-nav],[data-bucket],[data-cliente],[data-limpa],[data-mes],[data-dia],[data-fcliente]");
  if(!alvo) return;
  const D = alvo.dataset;
  let topo = true;

  if(D.nav==="geral"){      VISTA.aba="painel";     VISTA.escopo=null; VISTA.filtro=null; }
  if(D.nav==="calendario"){ VISTA.aba="calendario"; VISTA.mes=0; VISTA.dia=null; }
  if(D.nav==="historico"){  VISTA.aba="historico"; }
  if(D.nav==="clientes"){   VISTA.aba="clientes"; }
  if(D.nav==="cliente"){    VISTA.aba="painel"; }

  if(D.cliente){ VISTA.aba="painel"; VISTA.escopo=D.cliente; VISTA.filtro=null; }

  /* filtro de cliente dentro do calendário (não troca de aba) */
  if(D.fcliente!==undefined){ VISTA.escopo = D.fcliente || null; VISTA.dia=null; topo=false; }

  if(D.bucket) VISTA.filtro = (VISTA.filtro===D.bucket) ? null : D.bucket;

  if(D.mes!==undefined){
    const n = Number(D.mes);
    VISTA.mes = (n===0) ? 0 : VISTA.mes + n;
    VISTA.dia = null;
    topo = false;
  }
  if(D.dia){ VISTA.dia = (VISTA.dia===D.dia) ? null : D.dia; topo = false; }

  if(D.limpa==="filtro") VISTA.filtro=null;
  if(D.limpa==="escopo") VISTA.escopo=null;
  if(D.limpa==="tudo"){  VISTA.escopo=null; VISTA.filtro=null; }

  render();
  if(topo) window.scrollTo({top:0,behavior:"smooth"});
});

render();
