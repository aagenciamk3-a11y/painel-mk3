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

function mesesDepois(isoData, n){
  const p=String(isoData).split("-").map(Number);
  const d=new Date(p[0], p[1]-1+n, 1);
  const ultimo=new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
  d.setDate(Math.min(p[2], ultimo));
  return iso(d);
}
/* devolve só a ocorrência corrente de um ciclo: a primeira ainda não concluída */
function ocorrenciaAtual(cli, inicio, meses, prefixo, idPrimeira){
  if(!inicio) return null;
  const limite = addD(iso(HOJE), 45);
  let base = inicio;
  for(let i=0;i<80;i++){
    const prox = mesesDepois(base, meses);
    const id = (i===0 && idPrimeira) ? idPrimeira : prefixo+"_"+prox;
    if(!conclusaoDe(cli, id).feita) return {id:id, data:prox};
    base = prox;
    if(prox > limite) return null;
  }
  return null;
}
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
  {
    add("planilha","Entrada","Planilha de acessos","E-mail, senha, 2FA e códigos de reserva · 01. ACESSOS",D0,"Estagiário");
    add("fotoMarca","Entrada","Salvar a foto da marca","02 → 06. Identidade Visual · vira a foto do grupo",D0,"Estagiário");
  }
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
  add("revisaoOnb","Entrada","Revisão final do onboarding","Conferir as 14 etapas uma a uma antes de encerrar",
        c.imersao?uteis(c.imersao,2):uteis(D0,10),"Analista");



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
    if(c.gravacao){
      add("c1_gravacaoMarcar","1º ciclo","Marcar a gravação",
          "Combinado para "+fmt(c.gravacao)+" · confirmar véspera",addD(c.gravacao,-3),"Analista / Estagiário");
      add("c1_gravacao","1º ciclo",c.semFotos?"Dia de gravação":"Dia de gravação + fotos",
          "Manhã, 8h às 17h"+(c.artesDependemDaGravacao?" · insumo das artes":""),c.gravacao,"Produtora / Cliente");
    } else {
      add("c1_gravacaoMarcar","1º ciclo","Marcar a gravação",
          "Falar com o cliente e fechar a data",null,"Analista / Estagiário");
      add("c1_gravacao","1º ciclo","Dia de gravação","Data a definir",null,"Produtora / Cliente");
    }
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
  /* ciclos que voltam sozinhos: ao concluir um, o painel já marca o próximo */
  const r2fa = ocorrenciaAtual(c, D0, 3, "rec_2fa", "reserva3m");
  if(r2fa) add(r2fa.id,"Recorrente","Atualizar código de reserva (2FA)",
      "A cada 3 meses · pegar no Instagram e salvar em 01. ACESSOS", r2fa.data, "Estagiário");
  const rpq = ocorrenciaAtual(c, D0, 6, "rec_pesq", "pesq6m");
  if(rpq) add(rpq.id,"Recorrente","Atualizar as duas pesquisas",
      "A cada 6 meses · mercado e comportamento, cada uma na pasta do ano e do mês", rpq.data, "Analista");
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
  const dtFeita = id => { const x=(c.concluidas||[]).find(e=>((e&&e.id)?e.id:e)===id); return (x&&x.data)||null; };
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
    const _dEnvP=dtFeita("envPlanej"+sfx);
    add("aprPlanej"+sfx,"Ciclo padrão","Aprovação do planejamento","Limite: 2 dias úteis · sem retorno = aprovado automaticamente · "+cic,uteis(_dEnvP||dd(24),2),"Cliente");
    add("midia"+sfx,"Ciclo padrão","Produzir a mídia","Semana 4 · "+cic,dd(28),"Analista");
    add("envMidia"+sfx,"Ciclo padrão","Entregar as artes e vídeos ao cliente","Abre o prazo de 48h úteis · "+cic,dd(28),"Analista");
    const _dEnvM=dtFeita("envMidia"+sfx);
    add("aprMidia"+sfx,"Ciclo padrão","Aprovação das artes","Limite: 2 dias úteis · sem retorno = aprovado automaticamente · "+cic,uteis(_dEnvM||dd(28),2),"Cliente");
    add("agendado"+sfx,"Ciclo padrão","Conteúdo agendado","Pronto para publicar no dia 1 · "+cic,dd(ult),"Analista");
  }
  /* o contrato encerra: nada de tarefa de ciclo depois da data final */
  if(c.vencimentoContrato){
    for(let i=T.length-1;i>=0;i--){
      if(T[i].fase==="Ciclo padrão" && T[i].data && T[i].data > c.vencimentoContrato) T.splice(i,1);
    }
  }

  /* TAREFAS EXTRAS por cliente (itens fora do padrão: pagamentos a fornecedor, etc.) */
  (c.tarefasExtras||[]).forEach((t,i)=>add(t.id||("extra"+i), t.fase||"Outros", t.tarefa, t.detalhe||"", t.data||null, t.resp||"MK3"));

  /* ---- coerência: o que já tem data real está feito; o lembrete perde o sentido após a resposta ---- */
  const forcado=(c.__pendenteForcado||[]);
  const marcaAuto=(id,quando)=>{
    if(!quando || forcado.indexOf(id)>=0) return;   /* respeita o "não feito" marcado por você */
    const t=T.find(x=>x.id===id);
    if(t && !t.feita){ t.feita=true; t.dataConclusao=quando; }
  };
  marcaAuto("c1_plan",    c.envioPlanejamento);
  marcaAuto("c1_aprPlan", c.aprovacaoPlanejamento);
  marcaAuto("c1_roteiro", c.aprovacaoPlanejamento);
  marcaAuto("c1_artes",   c.envioMidia);
  marcaAuto("c1_aprMid",  c.aprovacaoMidia);
  marcaAuto("c1_lembPlan",c.aprovacaoPlanejamento);
  marcaAuto("c1_lembMid", c.aprovacaoMidia);
  if(c.gravacao && c.gravacao <= iso(HOJE)) marcaAuto("c1_gravacao", c.gravacao);

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
function mostrarModal(semFoco){
  const mm=$("modal");
  const h=mm.querySelector("h3"); if(h) h.id="modalTitulo";
  if(!modalAberto()) focoAnterior=document.activeElement;   /* não perde a origem ao redesenhar */
  mm.style.display="flex";
  const ap=$("app"); if(ap) ap.setAttribute("inert","");
  /* nunca focar campo de texto: o cursor não deve cair dentro de caixa nenhuma.
     O foco vai para a própria janela, para o Esc e o leitor de tela funcionarem. */
  const cx=mm.querySelector(".mbox");
  if(cx){ cx.setAttribute("tabindex","-1"); if(cx.focus) setTimeout(()=>cx.focus({preventScroll:true}),20); }
}
function fecharModal(){
  const mm=$("modal"); if(!mm) return;
  mm.style.display="none"; mm.innerHTML="";
  const ap=$("app"); if(ap) ap.removeAttribute("inert");
  if(focoAnterior && focoAnterior.focus) focoAnterior.focus();
  focoAnterior=null;
}
const modalAberto = () => { const mm=$("modal"); return mm && mm.style.display==="flex"; };
function semPular(fn){
  const mm=$("modal");
  const cx=mm&&mm.querySelector(".mbox");
  const y=cx?cx.scrollTop:0;
  const py=(window.scrollY||window.pageYOffset||0);
  fn();
  const nv=mm&&mm.querySelector(".mbox");
  if(nv&&y) nv.scrollTop=y;
  if(py) window.scrollTo(0,py);
}

const ORDEM   = {atrasado:0,parcial:0.5,hoje:1,umdia:2,semana:3,sem:4,futuro:5,ok:6};
const ROTULO  = {atrasado:"Atrasado",parcial:"Parcial",hoje:"Vence hoje",umdia:"Falta 1 dia",
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
const areaMatch = t => {
  const permitidas = USUARIO ? areasDe() : ["all","mkt","fin","com"];
  const a = (permitidas.indexOf(VISTA.area)>=0) ? VISTA.area : (permitidas.indexOf("all")>=0?"all":permitidas[0]);
  if(a==="all") return true;
  return t.area===a;
};

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
  pessoas:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M16 14.6c3 .2 5 2.3 5 5.4"/></svg>',
  inicio:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9.5 20v-6h5v6"/></svg>',
  dash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="9" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="14" width="8" height="7" rx="1.5"/></svg>',
  todas:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  tend:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6" rx="1"/><rect x="13" y="7" width="3" height="10" rx="1"/></svg>',
  add:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12 19"/></svg>',
  equipe:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 20a5.5 5.5 0 0 0-3-4.9"/></svg>'
};
function navItem(key,label,icon,kind,on,n){
  const href = kind==="view" ? rotaDe({modo:key,escopo:null}) : rotaDe({area:key});
  return '<a class="snav'+(on?" on":"")+'" href="'+href+'" data-'+kind+'="'+key+'" title="'+esc(label)+'"'+(on?' aria-current="true"':'')+'>'+
    '<span class="snav-i">'+icon+'</span><span class="snav-t">'+esc(label)+'</span>'+
    (n?'<span class="snav-b">'+n+'</span>':'')+'</a>';
}
function areasTopoHTML(){
  if(!USUARIO) return '';
  const areas=[["all","Visão geral",IC.todas],["mkt","Mkt Digital",IC.mkt],["fin","Financeiro",IC.fin],["com","Comercial",IC.com]]
    .filter(a=>podeArea(a[0]));
  if(areas.length<2) return '';
  return '<div class="abar"><span class="abar-pill" id="abarPill"></span>'+
    areas.map(a=>{
      const on=VISTA.area===a[0];
      /* dentro de um cliente, conta só o que é dele; fora, conta todo mundo */
      const universo = VISTA.escopo ? TODAS.filter(t=>t.clienteId===VISTA.escopo) : TODAS;
      const n=universo.filter(t=>(a[0]==="all"||t.area===a[0]) && (t.st.k==="atrasado"||t.st.k==="hoje")).length;
      return '<a class="abar-b'+(on?" on":"")+'" href="'+rotaDe({area:a[0]})+'" data-area="'+a[0]+'" aria-pressed="'+on+'">'+
        '<span class="abar-i">'+a[2]+'</span>'+esc(a[1])+
        (n?'<span class="abar-n">'+n+'</span>':'')+'</a>';
    }).join("")+'</div>';
}
window.addEventListener("resize",()=>{ try{ posicionarPill(); }catch(e){} }); // MK3_RESIZE_PILL
function posicionarPill(){
  const bar=$("areabar"); if(!bar) return;
  const pill=bar.querySelector(".abar-pill"), ativo=bar.querySelector(".abar-b.on");
  if(!pill||!ativo) return;
  requestAnimationFrame(()=>{
    pill.style.width=ativo.offsetWidth+"px";
    pill.style.transform="translateX("+ativo.offsetLeft+"px)";
    pill.style.opacity="1";
  });
}
function sidebarHTML(){
  const c=VISTA.escopo?cliente(VISTA.escopo):null;
  const urg=tarefasArea().filter(t=>t.st.k==="atrasado"||t.st.k==="hoje"||t.st.k==="umdia").length;
  const views=[["cards","Clientes",IC.cards],["prio","Tarefas",IC.prio],["equipe","Funcionários",IC.pessoas],
               ["lista","Dashboard",IC.dash],["cal","Agenda",IC.cal],["tend","Tendência",IC.tend]]
    .filter(v=>(v[0]!=="tend" && v[0]!=="equipe") || ehAdmin());
  let h='<div class="side-brand"><span class="b"><span>MK</span>3</span><button class="side-toggle" data-side="toggle" title="Recolher menu">&#10094;</button></div>';
  h+='<button class="snav inicio" data-sair="1" title="Voltar para a escolha de perfil"><span class="snav-i">'+IC.inicio+'</span><span class="snav-t">Início</span></button>';
  h+='<div class="side-sec">Ver</div>';
  h+=views.map(v=>navItem(v[0],v[1],v[2],"view",(!c&&VISTA.modo===v[0]),(v[0]==="prio"?urg:0))).join("");
  if(ehAdmin()){
    h+='<div class="side-sec">Demandas</div>';
    h+='<button class="snav snav-add" data-compromisso="1" title="Novo compromisso na agenda"><span class="snav-i">'+IC.cal+'</span><span class="snav-t">Novo compromisso</span></button>';
    h+='<button class="snav snav-add" data-demanda="1" title="Nova demanda"><span class="snav-i">'+IC.add+'</span><span class="snav-t">Nova demanda</span></button>';
    h+='<button class="snav" data-clientes="1" title="Clientes"><span class="snav-i">'+IC.cards+'</span><span class="snav-t">Clientes</span></button>';
    h+='<button class="snav" data-equipe="1" title="Equipe"><span class="snav-i">'+IC.equipe+'</span><span class="snav-t">Equipe</span></button>';
    h+='<button class="snav" data-agenda="1" title="Agenda ao vivo"><span class="snav-i">'+IC.cal+'</span><span class="snav-t">Agenda ao vivo</span></button>';
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


/* uma tarefa entregue pela metade e com o resto remarcado não é simplesmente "atrasada" */
function temParcial(cid,tid){
  const b=ESTADO.obsT||{};
  for(const wk in b){
    const s=b[wk]||{};
    for(const k in s){
      if(s[k] && s[k].parcial && k.indexOf(cid+"|"+tid+"|")===0) return true;
    }
  }
  return false;
}
function remarcadaPara(cid,tid){
  const hoje=iso(HOJE);
  const l=(ESTADO.dup||[]).filter(e=>e.cid===cid && e.tid===tid && e.dia>=hoje)
    .sort((a,b)=>a.dia.localeCompare(b.dia));
  return l.length?l[0].dia:null;
}
function ajustarParcial(t){
  if(t.feita || t.st.k==="ok") return t;
  if(!temParcial(t.clienteId,t.id)) return t;
  const q=remarcadaPara(t.clienteId,t.id);
  if(!q) return t;                                   /* parcial sem remarcar continua atrasada */
  t.st={k:"parcial", atraso:0, quando:null, resto:q,
        txt:"Parcial · resto em "+fmt(q)};
  return t;
}
function rebuild(){
  const base = ORIG.concat((ESTADO.novosClientes||[]).map(c=>JSON.parse(JSON.stringify(c))));
  const ed = ESTADO.clientes||{};
  CLIENTES.length=0;
  base.forEach(o=>{
    const ov = ed[o.id]||{};
    if(ov.oculto) return;
    const c = JSON.parse(JSON.stringify(o));
    ["nome","segmento","entrada","vencimentoContrato"].forEach(k=>{ if(ov[k]) c[k]=ov[k]; });
    c.concluidas=(o.concluidas||[]).slice();
    const dd=ESTADO.datas[c.id]||{};
    for(const k in dd){ if(dd[k]) c[k]=dd[k]; }
    c.__pendenteForcado=[];
    for(const e of (ESTADO.concluidas[c.id]||[])){
      c.concluidas=c.concluidas.filter(x=>((x&&x.id)?x.id:x)!==e.id);
      if(!e.remove) c.concluidas.push(e.data?{id:e.id,data:e.data}:e.id);
      else c.__pendenteForcado.push(e.id);
    }
    CLIENTES.push(c);
  });
  TODAS = CLIENTES.flatMap(c=>regras(c).map(t=>ajustarParcial({...t, st:status(t), area:areaBase(t.id)})))
    .filter(t=>((ESTADO.excluidas||{})[t.clienteId]||[]).indexOf(t.id)<0)
    .map(t=>{ const nv=((ESTADO.titulos||{})[t.clienteId]||{})[t.id];
              return nv ? {...t, tarefa:nv, tituloOriginal:t.tarefa} : t; });
  (ESTADO.demandas||[]).forEach(dm=>{
    if((((ESTADO.excluidas||{})["_dem"])||[]).indexOf(dm.id)>=0) return;
    const done=(ESTADO.concluidas["_dem"]||[]).filter(e=>((e&&e.id)?e.id:e)===dm.id).pop();
    const cli=dm.cli?CLIENTES.find(c=>c.id===dm.cli):null;
    const t={id:dm.id, clienteId:"_dem", cliDem:(cli?cli.id:null), cliente:(cli?cli.nome:dm.resp),
             tarefa:dm.texto, detalhe:(dm.obs||"Demanda"), obs:dm.obs||"", data:dm.data, resp:dm.resp,
             fase:"Demanda", area:dm.area, feita:!!(done&&!done.remove), dataConclusao:(done&&done.data)||null};
    t.st=status(t);
    TODAS.push(t);
  });
}


const tdOf = t => escAttr([t.cliente, (t.st&&t.st.txt), (t.data?fmt(t.data)+" "+dow(t.data):""), t.resp, t.detalhe].filter(Boolean).join(" · "));
const attrsEdit = t => ' data-editar="1" data-mcid="'+t.clienteId+'" data-mtid="'+escAttr(t.id)+'" data-tt="'+escAttr(t.tarefa||t.titulo||"")+'" data-td="'+tdOf(t)+'"';

/* ---------- sincronização em tempo real ---------- */
let SYNC=null, SYNC_APLICANDO=false, SYNC_ON=false;
function syncIniciar(){
  try{
    if(!window.firebase || !window.MK3_FIREBASE) return;
    const app = firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp(window.MK3_FIREBASE);
    SYNC = firebase.database().ref("painel/estado");
    /* recebe as mudanças de qualquer pessoa, na hora */
    SYNC.on("value", snap=>{
      const v=snap.val();
      if(!v) return;
      const meu=JSON.stringify(ESTADO);
      const dele=JSON.stringify(v);
      if(meu===dele) return;
      SYNC_APLICANDO=true;
      ESTADO = {concluidas:{},datas:{},semanal:{},notas:{},dup:[],demandas:[],portais:{},obsT:{},excluidas:{},titulos:{},clientes:{},novosClientes:[],pessoas:[],resultados:{},ficha:{},agenda:[],agendaResp:{},agendaChave:"",log:[], ...v};
      try{ localStorage.setItem("mk3_estado", JSON.stringify(ESTADO)); }catch(e){}
      rebuild(); render();
      SYNC_APLICANDO=false;
      marcarSync("recebido");
    }, err=>{ SYNC_ON=false; marcarSync("erro"); });
    firebase.database().ref(".info/connected").on("value", s=>{ SYNC_ON=!!s.val(); marcarSync(SYNC_ON?"ligado":"offline"); if(SYNC_ON) agendarEspelho(); });
  }catch(e){ SYNC=null; }
}
function syncEnviar(){
  if(!SYNC || SYNC_APLICANDO) return;
  try{ SYNC.set(JSON.parse(JSON.stringify(ESTADO))); }catch(e){}
}
let syncTimer=null;
function marcarSync(estado){
  const el=document.getElementById("syncst"); if(!el) return;
  const mapa={ligado:["Sincronizado","on"],recebido:["Atualizado agora","on"],offline:["Sem conexão","off"],erro:["Sem sincronizar","off"]};
  const m0=mapa[estado]||mapa.offline;
  el.textContent=m0[0]; el.className="syncst "+m0[1];
  if(estado==="recebido"){ clearTimeout(syncTimer); syncTimer=setTimeout(()=>marcarSync(SYNC_ON?"ligado":"offline"),2500); }
}

/* ---- espelho público: cada portal de cliente lê só o nó do token dele ---- */
let ESPELHO_T=null;
function espelhoDe(cid){
  const p=(ESTADO.portais&&ESTADO.portais[cid])||null;
  const cli=CLIENTES.find(x=>x.id===cid)||null;
  return { ts:Date.now(),
           ativo:(p&&p.ativo)||null,
           objetivo:cli?objetivoDe(cli):"",
           recado:cli?((fichaDe(cli)||{}).recado||""):"",
           meta:cli?metaDe(cli):null,
           resultados:((ESTADO.resultados&&ESTADO.resultados[cid])||null),
           concluidas:((ESTADO.concluidas&&ESTADO.concluidas[cid])||[]),
           datas:((ESTADO.datas&&ESTADO.datas[cid])||{}) };
}
function publicarEspelho(){
  if(!SYNC_ON || !PORTAIS || !window.firebase) return;
  try{
    const base=firebase.database().ref("painel/publico");
    Object.keys(PORTAIS).forEach(cid=>{
      const dados=espelhoDe(cid);
      const tks=(PORTAIS[cid]&&PORTAIS[cid].tokens)||[];
      const ativo=dados.ativo||tks[(PORTAIS[cid]||{}).ativo||0]||null;
      tks.forEach(tk=>{ base.child(tk).set({...dados, ativo:ativo}); });
    });
  }catch(e){}
}
function agendarEspelho(){ clearTimeout(ESPELHO_T); ESPELHO_T=setTimeout(publicarEspelho,1500); }
function persist(){
  try{ localStorage.setItem("mk3_estado", JSON.stringify(ESTADO)); }catch(e){}
  syncEnviar(); agendarEspelho();
  setTimeout(marcarSalvo,0);
}
function snapshot(){ UNDO.push(JSON.stringify(ESTADO)); if(UNDO.length>80)UNDO.shift(); REDO.length=0; }
function nMud(){ let n=0; for(const k in ESTADO.concluidas)n+=(ESTADO.concluidas[k]||[]).filter(e=>!e.remove).length; return n; }

function marcar(cid,tid,data,tipo){
  snapshot();
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid); const nome=t?t.tarefa:tid;
  const anc=ANCORA[tid];
  ESTADO.concluidas[cid]=(ESTADO.concluidas[cid]||[]).filter(e=>e.id!==tid);
  if(tipo==="desfazer"){
    if(anc && ESTADO.datas[cid]) delete ESTADO.datas[cid][anc.campo];
    ESTADO.log.unshift({ts:new Date().toISOString(),cliente:cid,nome:nome,acao:"desfazer",id:tid,quem:USUARIO||null});
  } else {
    ESTADO.concluidas[cid].push({id:tid,data:data});
    if(anc){ ESTADO.datas[cid]=ESTADO.datas[cid]||{}; ESTADO.datas[cid][anc.campo]=data; }
    ESTADO.log.unshift({ts:new Date().toISOString(),cliente:cid,nome:nome,acao:(anc?"registrar":"concluir"),campo:(anc?anc.campo:null),id:tid,data:data,quem:USUARIO||null});
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
function obsInfo(cid,tid,day){
  const wk=segOf(day), b=(ESTADO.obsT&&ESTADO.obsT[wk])||null;
  return b ? (b[chaveTarefa(cid,tid,day)]||null) : null;
}
function setObsTarefa(cid,tid,day,txt,parcial){
  snapshot();
  const wk=segOf(day);
  ESTADO.obsT=ESTADO.obsT||{}; ESTADO.obsT[wk]=ESTADO.obsT[wk]||{};
  const k=chaveTarefa(cid,tid,day);
  if((txt||"").trim() || parcial) ESTADO.obsT[wk][k]={txt:(txt||"").trim(), parcial:!!parcial};
  else delete ESTADO.obsT[wk][k];
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid);
  ESTADO.log.unshift({ts:new Date().toISOString(),cliente:cid,nome:t?t.tarefa:tid,
    acao:"observacao",id:tid,data:day,parcial:!!parcial,motivo:(txt||"").trim()});
  ESTADO.log=ESTADO.log.slice(0,300);
  persist(); rebuild(); render();
}
function renomearTarefa(cid,tid,novo){
  if(!ehAdmin()) return;
  snapshot();
  ESTADO.titulos=ESTADO.titulos||{};
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid);
  const orig=(t&&t.tituloOriginal)||(t&&t.tarefa)||tid;
  novo=(novo||"").trim();
  if(!novo || novo===orig){ if(ESTADO.titulos[cid]){ delete ESTADO.titulos[cid][tid]; if(!Object.keys(ESTADO.titulos[cid]).length) delete ESTADO.titulos[cid]; } }
  else { ESTADO.titulos[cid]=ESTADO.titulos[cid]||{}; ESTADO.titulos[cid][tid]=novo; }
  ESTADO.log.unshift({ts:new Date().toISOString(),cliente:cid,acao:"renomear",id:tid,nome:novo||orig});
  persist(); rebuild(); render();
}
function abrirRenomear(cid,tid){
  if(!ehAdmin()) return;
  if(cid==="_dem"){ abrirEditarDemanda(tid); return; }   /* demanda edita tudo no formulário */
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid); if(!t) return;
  const atual=EXEC[baseId(t.id)]||t.tarefa;
  const renomeada=!!((ESTADO.titulos||{})[cid]||{})[tid];
  const mm=$("modal");
  mm.innerHTML='<div class="mbox"><h3>Renomear tarefa</h3>'+
    '<p class="msub">'+esc(t.cliente)+' · '+fmt(t.data)+'</p>'+
    '<label class="mlab">Título<input type="text" id="novoTit" value="'+escAttr(t.tarefa)+'" autocomplete="off"></label>'+
    (renomeada?'<p class="msub">Nome original: '+esc(t.tituloOriginal||atual)+'</p>':'')+
    '<div class="mbtns"><button data-macao="salvartit" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'">Salvar</button>'+
    (renomeada?'<button class="sec" data-macao="restauratit" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'">Voltar ao original</button>':'')+
    '<button class="sec" data-macao="fechar">Cancelar</button></div></div>';
  mostrarModal(true);
}
function excluirTarefa(cid,tid){
  if(!ehAdmin()) return;
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid);
  snapshot();
  if(cid==="_dem"){ ESTADO.demandas=(ESTADO.demandas||[]).filter(x=>x.id!==tid); }
  else { ESTADO.excluidas=ESTADO.excluidas||{}; ESTADO.excluidas[cid]=(ESTADO.excluidas[cid]||[]).concat([tid]); }
  ESTADO.dup=(ESTADO.dup||[]).filter(e=>!(e.cid===cid&&e.tid===tid));
  ESTADO.log.unshift({ts:new Date().toISOString(),cliente:cid,nome:t?t.tarefa:tid,acao:"excluir",id:tid});
  persist(); rebuild(); render();
  toast((t?t.tarefa:"Tarefa")+" · excluída", true);
}
function restaurarTarefa(cid,tid){
  snapshot();
  ESTADO.excluidas[cid]=((ESTADO.excluidas||{})[cid]||[]).filter(x=>x!==tid);
  if(!ESTADO.excluidas[cid].length) delete ESTADO.excluidas[cid];
  persist(); rebuild(); render(); semPular(()=>abrirExcluidas());
}
function nExcluidas(){ let n=0; for(const k in (ESTADO.excluidas||{})) n+=(ESTADO.excluidas[k]||[]).length; return n; }
function abrirExcluidas(){
  if(!ehAdmin()) return;
  const E=ESTADO.excluidas||{};
  const nomeCli=id=>{ const c=CLIENTES.find(x=>x.id===id); return c?c.nome:(id==="_dem"?"Demanda":id); };
  let linhas="";
  for(const cid in E) (E[cid]||[]).forEach(tid=>{
    linhas+='<div class="ex-row"><span class="ex-t">'+esc(EXEC[baseId(tid)]||tid)+' <i>'+esc(nomeCli(cid))+'</i></span>'+
      '<button data-restaurar="'+cid+'|'+escAttr(tid)+'">Restaurar</button></div>';
  });
  const mm=$("modal");
  mm.innerHTML='<div class="mbox"><h3>Tarefas excluídas</h3>'+
    '<p class="msub">Elas somem do painel, mas ficam guardadas aqui e podem voltar quando quiser.</p>'+
    (linhas?'<div class="ex-lista">'+linhas+'</div>':'<div class="vaziox"><h4>Nenhuma tarefa excluída</h4><p>Quando você excluir alguma, ela aparece aqui para restaurar.</p></div>')+
    '<div class="mbtns"><button class="sec" data-macao="fechar">Fechar</button></div></div>';
  mostrarModal(true);
}
function confirmarExcluir(cid,tid){
  if(!ehAdmin()) return;
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid);
  const mm=$("modal");
  mm.innerHTML='<div class="mbox"><h3>Excluir tarefa</h3>'+
    '<p class="msub">'+esc(t?((EXEC[baseId(t.id)]||t.tarefa)+" — "+t.cliente):tid)+'</p>'+
    '<div class="ex-aviso">A tarefa some do painel'+(cid==="_dem"?" e a demanda é apagada":" e das prioridades")+'. '+
    (cid==="_dem"?"":"Ela fica guardada em \u201cTarefas excluídas\u201d e pode voltar depois.")+'</div>'+
    '<div class="mbtns"><button class="danger" data-excl="'+cid+'|'+escAttr(tid)+'">Excluir</button>'+
    '<button class="sec" data-macao="fechar">Cancelar</button></div></div>';
  mostrarModal(true);
}
function abrirObsTarefa(cid,tid,day,editar){
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid);
  const o=obsInfo(cid,tid,day)||{txt:"",parcial:false};
  const temTexto=!!(o.txt||"").trim();
  const modoEdicao = editar || !temTexto;
  const rot=t?((EXEC[baseId(t.id)]||t.tarefa)+" — "+t.cliente):tid;
  const mm=$("modal");
  mm.innerHTML='<div class="mbox"><h3>&#128221; Observação da tarefa</h3>'+
    '<p class="msub">'+esc(rot)+' · '+fmt(day)+'</p>'+
    (modoEdicao
      ? '<label class="mlab"><span class="chkp'+(o.parcial?" on":"")+'" data-parcial="'+cid+'|'+escAttr(tid)+'|'+day+'" role="checkbox" aria-checked="'+(!!o.parcial)+'"><i></i>Entrega parcial (fizemos só uma parte)</span></label>'+
        '<textarea id="obsT" class="notepad-ta" rows="4" placeholder="Ex.: fizemos 3 das 6 artes; faltam os materiais da cliente">'+esc(o.txt||"")+'</textarea>'+
        '<div class="mbtns"><button data-macao="salvarobst" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'" data-mday="'+day+'" data-mparc="'+(o.parcial?"1":"")+'">Salvar</button>'+
        (temTexto||o.parcial?'<button class="danger" data-macao="limparobst" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'" data-mday="'+day+'">Remover</button>':'')+
        '<button class="sec" data-macao="fechar">Cancelar</button></div>'
      : (o.parcial?'<div class="parc-tag">Entrega parcial</div>':'')+
        '<div class="obs-leitura">'+esc(o.txt)+'</div>'+
        '<div class="mbtns"><button data-editarobst="'+cid+'|'+escAttr(tid)+'|'+day+'">&#9998; Editar</button>'+
        '<button class="sec" data-macao="fechar">Fechar</button></div>')+
  '</div>';
  mostrarModal(true);
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
function minimoReplan(t){
  const hoje=iso(HOJE);
  const base=t&&t.data ? (t.data>hoje?t.data:hoje) : hoje;
  return base;
}
function podeReplanejar(t,dia){ return !!t && dia>=minimoReplan(t); }
function duplicarTarefa(cid,tid,dia){
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid); if(!t) return;
  if(t.data===dia) return;
  if(!podeReplanejar(t,dia)){ toast("Só dá para replanejar para hoje ou para frente",false); return; }
  ESTADO.dup=ESTADO.dup||[];
  if(ESTADO.dup.some(e=>e.cid===cid&&e.tid===tid&&e.dia===dia)) return;
  snapshot();
  ESTADO.dup.push({cid:cid,tid:tid,dia:dia,orig:t.data});
  ESTADO.log.unshift({ts:new Date().toISOString(),cliente:cid,nome:t.tarefa,acao:"replanejar",id:tid,data:dia});
  persist(); rebuild(); render();
}
function removeDup(cid,tid,dia){
  snapshot();
  ESTADO.dup=(ESTADO.dup||[]).filter(e=>!(e.cid===cid&&e.tid===tid&&e.dia===dia));
  persist(); rebuild(); render();
}
function bcardHTML(t, dayIso, dupOrig){
  const feita=t.st.k==="ok";
  const x=xInfo(VISTA.psem,t.clienteId,t.id,dayIso);
  const st=feita?"ok":(x?"x":"none");
  const rot=EXEC[baseId(t.id)]||t.tarefa;
  const drag=t.clienteId+"|"+t.id+"|"+t.data;
  const ob=obsInfo(t.clienteId,t.id,dayIso);
  const nomeResp=(t.fase==="Demanda")?t.resp:AREARESP[t.area];
  const face=faceDe(nomeResp);
  const fc=FOTO[t.cliDem||t.clienteId];
  const faceCli=(t.fase==="Demanda" && !t.cliDem)?"":'<span class="card-face cli" title="'+escAttr(t.cliente)+'">'+esc((t.cliente||"?").slice(0,1))+
    (fc?'<img src="'+fc+'" alt="" onerror="this.remove()">':'')+'</span>';
  return '<div class="bcard st-'+st+(dupOrig?" dup":"")+'" data-drag="'+escAttr(drag)+'">'+
    (dupOrig?'<div class="dup-badge">&#8618; de '+fmt(dupOrig).slice(0,5)+'<button class="dup-x" data-dropx="1" data-mcid="'+t.clienteId+'" data-mtid="'+escAttr(t.id)+'" data-mday="'+dayIso+'" title="Remover">&#215;</button></div>':'')+
    (face?'<span class="face-topo" title="Responsável">'+face+'</span>':'')+
    (ehAdmin()
      ? '<button class="bcard-t edit" data-rename="'+t.clienteId+'|'+escAttr(t.id)+'" title="Clique para renomear">'+esc(rot)+(ob&&ob.parcial?' <span class="parc">parcial</span>':'')+'</button>'
      : '<div class="bcard-t">'+esc(rot)+(ob&&ob.parcial?' <span class="parc">parcial</span>':'')+'</div>')+
    '<div class="bcard-c">'+esc(t.cliente)+'</div>'+
    (feita&&t.st.atraso?'<div class="bcard-atr">atrasou '+t.st.atraso+(t.st.atraso>1?' dias úteis':' dia útil')+'</div>':'')+
    '<div class="bcard-chk">'+
      '<button class="chk ok'+(feita?" on":"")+'" data-wkok="1" data-mcid="'+t.clienteId+'" data-mtid="'+escAttr(t.id)+'" data-mday="'+dayIso+'" title="Feito · clique de novo para desmarcar" aria-label="Feito">&#10003;</button>'+
      '<button class="chk x'+(x?" on":"")+'" data-wkx="1" data-mcid="'+t.clienteId+'" data-mtid="'+escAttr(t.id)+'" data-mday="'+dayIso+'" title="Não feito · clique de novo para deixar neutro" aria-label="Não feito">&#10007;</button>'+
      '<button class="mover" data-mover="1" data-mcid="'+t.clienteId+'" data-mtid="'+escAttr(t.id)+'" data-mday="'+dayIso+'" title="Replanejar para outro dia" aria-label="Replanejar para outro dia">&#8618;</button>'+
      (ehAdmin()?'<button class="mover del" data-delt="'+t.clienteId+'|'+escAttr(t.id)+'" title="Excluir tarefa" aria-label="Excluir tarefa">&#128465;</button>':'')+
      '<button class="mover obsb'+(ob?" tem":"")+'" data-obst="'+t.clienteId+'|'+escAttr(t.id)+'|'+dayIso+'" title="Observação da tarefa" aria-label="Observação da tarefa">&#128221;</button>'+
      (faceCli?'<span class="face-rodape" title="Cliente">'+faceCli+'</span>':'')+
    '</div>'+
    (x&&x.motivo?'<button class="ver-motivo" data-vermotivo="1" data-mcid="'+t.clienteId+'" data-mtid="'+escAttr(t.id)+'" data-mday="'+dayIso+'">Mostrar motivo</button>':'')+
    (t.obs?'<button class="ver-obs" data-veobs="'+escAttr(t.id)+'">&#128221; Ver observação</button>':'')+
    (ob&&ob.txt?'<button class="ver-obs" data-obst="'+t.clienteId+'|'+escAttr(t.id)+'|'+dayIso+'">&#128221; Ver observação</button>':'')+
  '</div>';
}
function setNota(day, texto){
  snapshot();
  ESTADO.notas=ESTADO.notas||{};
  if(texto && texto.trim()) ESTADO.notas[day]=texto; else delete ESTADO.notas[day];
  persist(); render();
}
function addDemanda(texto,area,data,resp,obs,cli){
  snapshot();
  ESTADO.demandas=ESTADO.demandas||[];
  const id="dem_"+Date.now()+"_"+Math.floor(Math.random()*1000);
  ESTADO.demandas.push({id:id,texto:texto,area:area,data:data,resp:resp,obs:(obs||"").trim(),cli:cli||null});
  ESTADO.log.unshift({ts:new Date().toISOString(),acao:"demanda",id:id,nome:texto,area:area,data:data,resp:resp});
  persist(); rebuild(); render();
}
function removeDemanda(id){ if(!ehAdmin()) return; snapshot(); ESTADO.demandas=(ESTADO.demandas||[]).filter(x=>x.id!==id); persist(); rebuild(); render(); }
function demConcluida(id){ const e=(ESTADO.concluidas["_dem"]||[]).find(x=>((x&&x.id)?x.id:x)===id); return !!(e&&!e.remove); }
function listaDemandas(){
  const todas=(ESTADO.demandas||[]).slice().sort((a,b)=>String(b.data).localeCompare(String(a.data)));
  if(!todas.length) return '<div class="dem-lista"><div class="dem-vazio">Nenhuma demanda cadastrada ainda. A primeira que você criar aparece aqui, com opção de editar depois.</div></div>';
  const A={mkt:"Marketing",fin:"Financeiro",com:"Comercial"};
  const linha=x=>{
    const feita=demConcluida(x.id);
    return '<div class="dem-row'+(x.obs?" comobs":"")+(feita?" feita":"")+'">'+
      '<span class="dem-d">'+(feita?'<i class="dem-ok">&#10003;</i> ':'')+fmt(x.data)+'</span>'+
      '<span class="dem-t">'+esc(x.texto)+' <i>'+(A[x.area]||"")+'</i>'+
        (x.obs?'<span class="dem-obs">&#128221; '+esc(x.obs)+'</span>':'')+'</span>'+
      '<span class="dem-r">'+esc(x.resp)+'</span>'+
      '<button class="dem-e" data-demedit="'+escAttr(x.id)+'" title="Editar demanda (texto, data, área, responsável)" aria-label="Editar demanda">&#9881;</button>'+
      '<button class="dem-e" data-demobs="'+escAttr(x.id)+'" title="Observações" aria-label="Observações">&#9998;</button>'+
      '<button class="dem-x" data-demx="'+escAttr(x.id)+'" title="Remover">&#215;</button></div>';
  };
  const pend=todas.filter(x=>!demConcluida(x.id));
  const feitas=todas.filter(x=>demConcluida(x.id));
  return '<div class="dem-lista">'+
    '<div class="dem-lista-h">Demandas cadastradas <span class="dem-n">'+pend.length+' em aberto</span></div>'+
    (pend.length?pend.map(linha).join(""):'<div class="dem-vazio">Nada em aberto.</div>')+
    (feitas.length?'<details class="dem-feitas"><summary>Concluídas ('+feitas.length+') — ainda dá para editar ou corrigir a data</summary>'+
       feitas.map(linha).join("")+'</details>':'')+
  '</div>';
}
let PORTAIS=null;
function abrirPortais(){
  if(!ehAdmin()) return;
  const base=location.origin+location.pathname.replace(/\/(index\.html)?$/,"");
  const linhas = PORTAIS ? CLIENTES.map(c=>{
      const p=PORTAIS[c.id];
      if(!p) return '<div class="po-row"><span class="po-n">'+esc(c.nome)+'</span><span class="po-x">sem portal gerado</span></div>';
      const tks=p.tokens||[p.token];
      const esc0=(ESTADO.portais&&ESTADO.portais[c.id])||null;
      const ativo=(esc0&&esc0.ativo&&tks.indexOf(esc0.ativo)>=0)?esc0.ativo:tks[p.ativo||0];
      const restantes=tks.length-1-tks.indexOf(ativo);
      const url=base+"/c/"+ativo+"/";
      return '<div class="po-row"><span class="po-n">'+esc(c.nome)+
        (p.historico?'<i class="po-h">com histórico</i>':'')+'</span>'+
        '<span class="po-acoes">'+
          '<button class="po-c" data-copiar="'+escAttr(url)+'">Copiar</button>'+
          '<a class="po-a" href="'+escAttr(url)+'" target="_blank" rel="noopener">Abrir</a>'+
          (restantes>0
            ? '<button class="po-r" data-novolink="'+c.id+'" title="Gera um endereço novo e invalida o atual">Trocar link</button>'
            : '<span class="po-x">sem reservas</span>')+
        '</span>'+
        '<code class="po-u" title="Clique em Copiar para levar o link">'+esc(url)+'</code>'+
        (esc0&&esc0.ativo&&esc0.ativo!==tks[p.ativo||0]?'<span class="po-p">novo link · vale após a publicação</span>':'')+
        '</div>';
    }).join("") : '<div class="vazio">Carregando…</div>';
  const mm=$("modal");
  mm.innerHTML='<div class="mbox portais"><h3>Links dos clientes</h3>'+
    '<p class="msub">Link pessoal de cada cliente, sem senha. Só quem tem o endereço acessa, e cada página mostra apenas os dados daquele cliente.</p>'+
    '<div class="po-lista">'+linhas+'</div>'+
    '<p class="nota-p">O que você marca no painel aparece para o cliente na publicação automática (toda manhã, dias úteis) — ou quando você me pedir para publicar agora.</p>'+
    '<div class="mbtns"><button class="sec" data-macao="fechar">Fechar</button></div></div>';
  mostrarModal(true);
  if(!PORTAIS){
    fetch("portais.json?ts="+Date.now()).then(r=>r.json()).then(j=>{ PORTAIS=j; if(modalAberto()) abrirPortais(); }).catch(()=>{
      PORTAIS={}; if(modalAberto()) abrirPortais();
    });
  }
}
function trocarLink(cid){
  const p=PORTAIS&&PORTAIS[cid]; if(!p) return;
  const tks=p.tokens||[p.token];
  const at=(ESTADO.portais&&ESTADO.portais[cid]&&ESTADO.portais[cid].ativo)||tks[p.ativo||0];
  const i=tks.indexOf(at);
  if(i<0 || i>=tks.length-1){ toast("Sem endereços de reserva. Me peça para gerar mais.",false); return; }
  snapshot();
  ESTADO.portais=ESTADO.portais||{};
  ESTADO.portais[cid]={ativo:tks[i+1], revogados:((ESTADO.portais[cid]||{}).revogados||[]).concat([at]), quando:iso(HOJE)};
  ESTADO.log.unshift({ts:new Date().toISOString(),cliente:cid,acao:"novolink",nome:"Link do portal trocado"});
  persist(); semPular(()=>abrirPortais());
  toast("Link novo gerado. O antigo para de funcionar na próxima publicação.",false);
}

/* objetivos possíveis para o destaque do cliente */
const OBJETIVOS = [
  ["", "Sem destaque"],
  ["seguidores", "Seguidores"],
  ["alcance", "Alcance"],
  ["perfil", "Visitas ao perfil"],
  ["views", "Visualizações"]
];
const objetivoDe = c => ((ESTADO.clientes&&ESTADO.clientes[c.id]&&ESTADO.clientes[c.id].objetivo)||c.objetivo||"");
const metaDe = c => { const v=((ESTADO.clientes&&ESTADO.clientes[c.id]&&ESTADO.clientes[c.id].meta)||c.meta||null); return v?Number(v):null; };
function abrirClientes(){
  if(!ehAdmin()) return;
  const ed=ESTADO.clientes||{};
  const ocultos=ORIG.concat(ESTADO.novosClientes||[]).filter(c=>(ed[c.id]||{}).oculto);
  const mm=$("modal");
  mm.innerHTML='<div class="mbox equipe"><h3>Clientes</h3>'+
    '<p class="msub">Ajuste o nome, o segmento e o vencimento do contrato. Também dá para cadastrar um cliente novo.</p>'+
    '<div class="eq-lista">'+CLIENTES.map(c=>{
      const cor=coresDe(c), novo=(ESTADO.novosClientes||[]).some(x=>x.id===c.id);
      return '<div class="pcard">'+
        '<div class="pc-topo">'+avatarHTML(c,"card-face")+
          '<div class="pc-id"><span class="pc-n">'+esc(c.nome)+(novo?' <i class="cl-novo">novo</i>':'')+'</span>'+
          '<span class="pc-c">'+esc(c.segmento||"sem segmento")+' · contrato até '+fmt(c.vencimentoContrato)+
          (objetivoDe(c)?' · objetivo: '+esc((OBJETIVOS.find(o=>o[0]===objetivoDe(c))||["",""])[1].toLowerCase())+(metaDe(c)?' (meta '+numBR(metaDe(c))+')':''):'')+'</span></div>'+
          '<button class="pc-ico" data-clied="'+escAttr(c.id)+'" title="Editar cliente" aria-label="Editar">&#9998;</button>'+
          '<button class="pc-ico rm" data-cliocultar="'+escAttr(c.id)+'" title="Tirar do painel" aria-label="Tirar do painel">&#128465;</button>'+
        '</div></div>';
    }).join("")+'</div>'+
    (ocultos.length?'<details class="dem-feitas"><summary>Fora do painel ('+ocultos.length+')</summary>'+
      ocultos.map(c=>'<div class="ex-row"><span class="ex-t">'+esc(((ed[c.id]||{}).nome)||c.nome)+'</span>'+
        '<button data-clirestaurar="'+escAttr(c.id)+'">Trazer de volta</button></div>').join("")+'</details>':'')+
    '<div class="mbtns"><button data-clinovo="1">+ Novo cliente</button>'+
    '<button class="sec" data-macao="fechar">Fechar</button></div></div>';
  mostrarModal(true);
}
function abrirClienteForm(id){
  if(!ehAdmin()) return;
  const c=id?CLIENTES.find(x=>x.id===id):null;
  const segs=["Corretor","Corretora","Varejo","Moda","Escola","Educação","Tecnologia","Saúde","Alimentação","Beleza"];
  const mm=$("modal");
  mm.innerHTML='<div class="mbox demform"><h3>'+(c?"Editar cliente":"Novo cliente")+'</h3>'+
    (c?'':'<p class="msub">Cadastro rápido: o painel já cria as tarefas de entrada e o ciclo mensal a partir das datas.</p>')+
    '<label class="mlab">Nome<input type="text" id="clNome" value="'+escAttr(c?c.nome:"")+'" autocomplete="off"></label>'+
    '<label class="mlab">Segmento<select id="clSeg">'+segs.map(s=>'<option'+((c&&c.segmento===s)?" selected":"")+'>'+s+'</option>').join("")+'</select></label>'+
    '<label class="mlab">Entrada (assinatura)<input type="date" id="clEnt" value="'+escAttr(c?c.entrada:iso(HOJE))+'"></label>'+
    '<label class="mlab">Vencimento do contrato<input type="date" id="clVen" value="'+escAttr(c?(c.vencimentoContrato||""):"")+'"></label>'+
    '<div class="mbtns"><button data-macao="salvarcli" data-cliid="'+escAttr(c?c.id:"")+'">Salvar</button>'+
    '<button class="sec" data-macao="fecharcli">Cancelar</button></div></div>';
  mostrarModal(true);
}
function salvarCliente(id,dados){
  if(!ehAdmin()) return;
  snapshot();
  if(id){
    ESTADO.clientes=ESTADO.clientes||{};
    ESTADO.clientes[id]={...(ESTADO.clientes[id]||{}), ...dados};
    const n=(ESTADO.novosClientes||[]).find(x=>x.id===id);
    if(n) Object.assign(n,dados);
    ESTADO.log.unshift({ts:new Date().toISOString(),cliente:id,acao:"cliente-editado",nome:dados.nome||id});
  } else {
    const novoId="cli_"+Date.now();
    ESTADO.novosClientes=(ESTADO.novosClientes||[]).concat([{
      id:novoId, nome:dados.nome||"Cliente novo", marca:dados.nome||"", segmento:dados.segmento||"",
      plano:"", entrada:dados.entrada||iso(HOJE), contrato:"", inicioContrato:dados.entrada||iso(HOJE),
      vencimentoContrato:dados.vencimentoContrato||null, mensalidade:null,
      escopo:{agendamento:true,calendarioEditorial:false,trafegoPago:false},
      imersao:null, reuniaoPlanejamentoEntrada:null, envioPlanejamento:null, aprovacaoPlanejamento:null,
      envioMidia:null, aprovacaoMidia:null, gravacao:null, artesDependemDaGravacao:false,
      inicioCicloPadrao:null, justificados:[], concluidas:[], marcos:[]
    }]);
    ESTADO.log.unshift({ts:new Date().toISOString(),cliente:novoId,acao:"cliente-novo",nome:dados.nome||""});
  }
  persist(); rebuild(); render();
}
function ocultarCliente(id,valor){
  if(!ehAdmin()) return;
  snapshot();
  ESTADO.clientes=ESTADO.clientes||{};
  ESTADO.clientes[id]={...(ESTADO.clientes[id]||{}), oculto:!!valor};
  persist(); rebuild(); render(); semPular(()=>abrirClientes());
}
function abrirEquipe(){
  if(!ehAdmin()) return;
  const ps=ESTADO.pessoas||[];
  const AR=[["mkt","Marketing",IC.mkt],["fin","Financeiro",IC.fin],["com","Comercial",IC.com]];
  const mm=$("modal");
  mm.innerHTML='<div class="mbox equipe"><h3>Equipe e permissões</h3>'+
    '<p class="msub">Cada pessoa vê apenas as áreas marcadas. Quem é <b>Admin</b> vê tudo e edita esta tela.</p>'+
    '<div class="eq-lista">'+ps.map(p=>{
      const admin=!!p.admin;
      return '<div class="pcard'+(admin?" adm":"")+'">'+
        '<div class="pc-topo">'+faceDe(p.nome)+
          '<div class="pc-id"><span class="pc-n">'+esc(p.nome)+'</span>'+
          '<span class="pc-c">'+(admin?"Administração":((p.areas||[]).length?(p.areas||[]).map(a=>({mkt:"Marketing",fin:"Financeiro",com:"Comercial"}[a]||a)).join(" · "):"sem área"))+'</span></div>'+
          '<button class="pc-ico" data-trocarfoto="'+escAttr(p.nome)+'" title="'+(p.foto?"Trocar foto":"Adicionar foto")+'" aria-label="Foto">&#128247;</button>'+
          '<button class="pc-ico rm" data-pessoax="'+escAttr(p.nome)+'" title="Remover da equipe" aria-label="Remover">&#128465;</button>'+
        '</div>'+
        '<div class="pc-linha">'+
          '<button class="sw'+(admin?" on":"")+'" data-permb="admin" data-pnome="'+escAttr(p.nome)+'" role="switch" aria-checked="'+admin+'">'+
            '<i></i><span>Admin</span></button>'+
          '<span class="pc-sep"></span>'+
          AR.map(a=>{
            const on=admin||((p.areas||[]).indexOf(a[0])>=0);
            return '<button class="chip'+(on?" on":"")+(admin?" trav":"")+'" data-permb="'+a[0]+'" data-pnome="'+escAttr(p.nome)+'"'+
              (admin?' disabled title="Admin já vê tudo"':'')+' aria-pressed="'+on+'">'+
              '<span class="chip-i">'+a[2]+'</span>'+esc(a[1])+'</button>';
          }).join("")+
          '<span class="pc-pin"><span class="pin-l">PIN</span>'+
          '<input type="password" class="pinin" data-pin="'+escAttr(p.nome)+'" value="'+escAttr(p.pin||"")+'" maxlength="8" placeholder="—" inputmode="numeric" autocomplete="new-password" data-lpignore="true" aria-label="PIN de '+escAttr(p.nome)+'"></span>'+
        '</div>'+
      '</div>';
    }).join("")+'</div>'+
    '<div class="eq-add"><input type="text" id="enome" placeholder="Nome de quem vai entrar na equipe" autocomplete="off" data-eq-novo>'+
      '<button data-macao="addpessoa">Adicionar</button></div>'+
    '<div class="mbtns"><button class="sec" data-macao="fechar">Fechar</button></div></div>';
  mostrarModal(true);
}
function setPerm(nome,perm,valor){
  const p=(ESTADO.pessoas||[]).find(x=>x.nome===nome); if(!p) return;
  snapshot();
  if(perm==="admin"){
    if(valor){
      p.areasAntes=(p.areas||[]).filter(a=>a!=="all");   /* guarda o que ela via antes */
      p.admin=true; p.areas=["all","mkt","fin","com"];
    } else {
      p.admin=false;
      p.areas=(p.areasAntes&&p.areasAntes.length?p.areasAntes:[]).filter(a=>a!=="all");
      delete p.areasAntes;
    }
  }
  else { p.areas=(p.areas||[]).filter(a=>a!==perm); if(valor) p.areas.push(perm); }
  persist(); semPular(()=>abrirEquipe());
  if(p.nome===USUARIO){ const as=areasDe(); if(as.indexOf(VISTA.area)<0){ VISTA.area=as[0]||"mkt"; } render(); }
}
function setPin(nome,pin){
  const p=(ESTADO.pessoas||[]).find(x=>x.nome===nome); if(!p) return;
  p.pin=(pin||"").trim(); persist();
}
function abrirEditarDemanda(id){
  const dm=(ESTADO.demandas||[]).find(x=>x.id===id); if(!dm) return;
  const areas=[["mkt","Marketing Digital"],["fin","Financeiro"],["com","Comercial"]];
  const pessoas=(ESTADO.pessoas||[]).map(p=>p.nome);
  const mm=$("modal");
  mm.innerHTML='<div class="mbox demform"><h3>Editar demanda</h3>'+
    '<p class="msub">Dá para mudar a data — por exemplo, se era para hoje mas foi feita dias atrás.</p>'+
    '<label class="mlab">O que é a demanda<input type="text" id="edtexto" value="'+escAttr(dm.texto)+'" autocomplete="off"></label>'+
    '<label class="mlab">Cliente<select id="edcli"><option value=""'+(dm.cli?"":" selected")+'>Sem cliente / interno</option>'+
      CLIENTES.map(c=>'<option value="'+c.id+'"'+(dm.cli===c.id?" selected":"")+'>'+esc(c.nome)+'</option>').join("")+'</select></label>'+
    '<label class="mlab">Área<select id="edarea">'+areas.map(a=>'<option value="'+a[0]+'"'+(dm.area===a[0]?" selected":"")+'>'+a[1]+'</option>').join("")+'</select></label>'+
    '<label class="mlab">Data<input type="date" id="eddata" value="'+escAttr(dm.data)+'"></label>'+
    '<label class="mlab">Responsável<select id="edresp">'+pessoas.map(p=>'<option'+(dm.resp===p?" selected":"")+'>'+esc(p)+'</option>').join("")+'</select></label>'+
    '<div class="mbtns"><button data-macao="salvaredit" data-demid="'+escAttr(id)+'">Salvar</button>'+
    '<button class="sec" data-macao="fechar">Cancelar</button></div></div>';
  mostrarModal(true);
}
function editarDemanda(id,campos){
  const dm=(ESTADO.demandas||[]).find(x=>x.id===id); if(!dm) return;
  snapshot();
  if(campos.texto) dm.texto=campos.texto;
  if(campos.area) dm.area=campos.area;
  if(campos.data) dm.data=campos.data;
  if(campos.resp) dm.resp=campos.resp;
  if(campos.cli!==undefined) dm.cli=campos.cli||null;
  ESTADO.log.unshift({ts:new Date().toISOString(),cliente:"_dem",acao:"editar",id:id,nome:dm.texto,data:dm.data});
  persist(); rebuild(); render();
}
function abrirObsDemanda(id, editar){
  const dm=(ESTADO.demandas||[]).find(x=>x.id===id); if(!dm) return;
  const temTexto=!!(dm.obs||"").trim();
  const modoEdicao = editar || !temTexto;      /* sem nada escrito, já abre para escrever */
  const mm=$("modal");
  mm.innerHTML='<div class="mbox"><h3>&#128221; Observações</h3>'+
    '<p class="msub">'+esc(dm.texto)+' · '+fmt(dm.data)+' · '+esc(dm.resp)+'</p>'+
    (modoEdicao
      ? '<textarea id="obsTxt" class="notepad-ta" rows="5" placeholder="Registre o que vale lembrar: evolução da equipe, o que deu certo, o que travou..." data-focar>'+esc(dm.obs||"")+'</textarea>'+
        '<div class="mbtns"><button data-macao="salvarobs" data-demid="'+escAttr(id)+'">Salvar</button>'+
        '<button class="sec" data-macao="fechar">Cancelar</button></div>'
      : '<div class="obs-leitura">'+esc(dm.obs)+'</div>'+
        '<div class="mbtns"><button class="sec" data-macao="fechar">Fechar</button></div>')+
  '</div>';
  mostrarModal(!modoEdicao);
}
function setObsDemanda(id,txt){
  const dm=(ESTADO.demandas||[]).find(x=>x.id===id); if(!dm) return;
  snapshot(); dm.obs=(txt||"").trim(); persist(); rebuild(); render();
}
function abrirDemanda(diaSugerido){
  const areas=[["mkt","Marketing Digital"],["fin","Financeiro"],["com","Comercial"]];
  const pessoas=(ESTADO.pessoas||[]).map(p=>p.nome);
  const mm=$("modal");
  mm.innerHTML='<div class="mbox demform"><h3>Nova demanda</h3>'+
    '<label class="mlab">O que é a demanda<input type="text" id="dtexto" placeholder="Descreva a demanda..." autocomplete="off" data-focar></label>'+
    '<label class="mlab">Cliente <i class="opt-l">(opcional)</i><select id="dcli"><option value="">Sem cliente / interno</option>'+
      CLIENTES.map(c=>'<option value="'+c.id+'">'+esc(c.nome)+'</option>').join("")+'</select></label>'+
    '<label class="mlab">Área<select id="darea">'+areas.map(a=>'<option value="'+a[0]+'">'+a[1]+'</option>').join("")+'</select></label>'+
    '<label class="mlab">Data<input type="date" id="ddata" value="'+(diaSugerido||iso(HOJE))+'"></label>'+
    '<label class="mlab">Responsável<select id="dresp">'+pessoas.map(p=>'<option>'+p+'</option>').join("")+'</select></label>'+
    '<label class="mlab">Observações <i class="opt-l">(opcional)</i><textarea id="dobs" rows="2" placeholder="Ex.: primeira vez da Carla acompanhando a gravação sozinha"></textarea></label>'+
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
  const mks=marcosDaArea((c?c.marcos:CLIENTES.flatMap(x=>x.marcos)).filter(m=>m.data===dayIso));
  const ags=(VISTA.area==="all"||VISTA.area==="mkt") ? (c?agendaCli(c.id):(ESTADO.agenda||[])).filter(e=>e.dia===dayIso) : [];
  const titulo=d(dayIso).toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
  const mm=$("modal");
  mm.innerHTML='<div class="mbox diamodal"><h3>'+esc(titulo)+'</h3>'+
    (ags.length?'<div class="diaag">'+ags.map(e=>'<div class="diaag-l">&#9679; '+esc(e.titulo)+(e.diaInteiro?'':' · '+esc(e.hora||''))+
      ' '+donoHTML(e)+(e.meet?' <span class="ag-m" role="link" tabindex="0" data-abrir="'+escAttr(e.meet)+'">Meet</span>':'')+'</div>').join("")+'</div>':'')+
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
const MOTIVOS = [
  "Cliente não respondeu",
  "Cliente pediu para adiar",
  "Faltou material do cliente",
  "Aguardando aprovação interna",
  "Equipe sem tempo · outra prioridade",
  "Problema técnico",
  "Gravação não aconteceu"
];
function abrirMotivoLeitura(cid,tid,day){
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid);
  const cur=xInfo(segOf(day),cid,tid,day);
  const rot=t?((EXEC[baseId(t.id)]||t.tarefa)+" — "+t.cliente):tid;
  const mm=$("modal");
  mm.innerHTML='<div class="mbox motivo-box"><h3>Motivo</h3>'+
    '<p class="msub">'+esc(rot)+' · '+fmt(day)+'</p>'+
    '<div class="mot-leitura">'+esc(cur?cur.motivo:"(sem motivo registrado)")+'</div>'+
    '<div class="mbtns">'+
      '<button data-editarmotivo="1" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'" data-mday="'+day+'">&#9998; Editar</button>'+
      '<button class="sec" data-macao="neutro" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'" data-mday="'+day+'">Deixar neutro</button>'+
      '<button class="sec" data-macao="fechar">Fechar</button>'+
    '</div></div>';
  mostrarModal(true);
}
function abrirMotivo(cid,tid,day,sel){
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid);
  const cur=xInfo(segOf(day),cid,tid,day);
  const atual=cur?cur.motivo:"";
  if(sel===undefined) sel = atual ? (MOTIVOS.indexOf(atual)>=0 ? atual : "__outros") : null;
  const livre = (sel==="__outros" && MOTIVOS.indexOf(atual)<0) ? atual : "";
  const rot=t?((EXEC[baseId(t.id)]||t.tarefa)+" — "+t.cliente):tid;
  const opt=(txt,val)=>'<button class="mot'+(sel===val?" on":"")+'" data-motivo="'+escAttr(val)+'" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'" data-mday="'+day+'" aria-pressed="'+(sel===val)+'"><i></i><span>'+esc(txt)+'</span></button>';
  const mm=$("modal");
  mm.innerHTML='<div class="mbox motivo-box"><h3>Não deu pra fazer</h3>'+
    '<p class="msub">'+esc(rot)+' · '+fmt(day)+'</p>'+
    '<div class="mot-lista">'+MOTIVOS.map(x=>opt(x,x)).join("")+opt("Outros (escrever)","__outros")+'</div>'+
    (sel==="__outros"
      ? '<label class="mlab">Qual foi o motivo<textarea id="mmotivo" rows="3" placeholder="Escreva o que impediu..." data-focar>'+esc(livre)+'</textarea></label>'
      : '')+
    '<div class="mbtns">'+
      '<button data-macao="motivo" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'" data-mday="'+day+'" data-msel="'+escAttr(sel||"")+'"'+(sel?"":" disabled")+'>Salvar motivo</button>'+
      '<button class="sec" data-macao="neutro" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'" data-mday="'+day+'">Deixar neutro</button>'+
      '<button class="sec" data-macao="fechar">Cancelar</button>'+
    '</div></div>';
  mostrarModal(sel!=="__outros");
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
function abrirMover(cid,tid,diaAtual,mesRef){
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid);
  const base=mesRef||(diaAtual||iso(HOJE)).slice(0,7);
  const ano=+base.slice(0,4), mes=+base.slice(5,7)-1;
  const ref=new Date(ano,mes,1);
  const desloc=ref.getDay(), diasNoMes=new Date(ano,mes+1,0).getDate();
  const hojeIso=iso(HOJE);
  const prev=iso(new Date(ano,mes-1,1)).slice(0,7), next=iso(new Date(ano,mes+1,1)).slice(0,7);
  let cels="";
  for(let i=0;i<desloc;i++) cels+='<span class="mv-vazio"></span>';
  for(let dia=1;dia<=diasNoMes;dia++){
    const s=iso(new Date(ano,mes,dia));
    const fds=[0,6].indexOf(new Date(ano,mes,dia).getDay())>=0;
    const invalido=!podeReplanejar(t,s);
    const cls=["mv-d",fds?"fds":"",s===hojeIso?"hj":"",s===diaAtual?"atual":"",s===t.data?"orig":"",invalido?"nao":""].filter(Boolean).join(" ");
    cels+='<button class="'+cls+'" data-macao="mover" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'" data-mday="'+s+'"'+
      (s===diaAtual?' disabled title="Já está neste dia"':(invalido?' disabled title="Não dá para replanejar para trás"':''))+'>'+dia+'</button>';
  }
  const mm=$("modal");
  mm.innerHTML='<div class="mbox mover-box"><h3>Replanejar para outro dia</h3>'+
    '<p class="msub">'+esc(t?t.tarefa:"")+(t?" · "+esc(t.cliente):"")+'</p>'+
    '<p class="msub">Cria uma cópia no dia escolhido. A tarefa original continua na data dela'+(t&&t.data?" ("+fmt(t.data)+")":"")+'.</p>'+
    '<div class="mv-nav"><button class="mv-set" data-mesmover="'+prev+'" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'" data-mday="'+(diaAtual||"")+'" aria-label="Mês anterior">&lsaquo;</button>'+
      '<strong>'+ref.toLocaleDateString("pt-BR",{month:"long",year:"numeric"})+'</strong>'+
      '<button class="mv-set" data-mesmover="'+next+'" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'" data-mday="'+(diaAtual||"")+'" aria-label="Próximo mês">&rsaquo;</button></div>'+
    '<div class="mv-dow"><span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span></div>'+
    '<div class="mv-grade">'+cels+'</div>'+
    (function(){
      const cs=(ESTADO.dup||[]).filter(e=>e.cid===cid&&e.tid===tid).sort((a,b)=>a.dia.localeCompare(b.dia));
      if(!cs.length) return '';
      return '<div class="mv-copias"><span class="mv-ch">Cópias já criadas</span>'+cs.map(e=>
        '<span class="mv-cp">'+fmt(e.dia)+
        '<button data-removedup="1" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'" data-mday="'+e.dia+'" title="Remover esta cópia" aria-label="Remover cópia de '+fmt(e.dia)+'">&#215;</button></span>').join("")+'</div>';
    })()+
    '<div class="mbtns"><button class="sec" data-macao="fechar">Cancelar</button></div></div>';
  mostrarModal(true);
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
  if(D.macao==="motivo"){
    let mot=D.msel||"";
    if(mot==="__outros"){
      mot=(($("mmotivo")&&$("mmotivo").value)||"").trim();
      if(!mot){ const c=$("mmotivo"); if(c&&c.focus) c.focus(); return; }
    }
    if(!mot) return;
    setNaoFeito(D.mcid,D.mtid,D.mday,mot); fecharModal(); return;
  }
  if(D.macao==="mover"){
    const eraAtr=(TODAS.find(x=>x.clienteId===D.mcid&&x.id===D.mtid)||{}).st;
    duplicarTarefa(D.mcid,D.mtid,D.mday);
    toast("Colocada em "+fmt(D.mday),true);
    if(eraAtr&&eraAtr.k==="atrasado"){ abrirAtrasadas(D.mday); } else { fecharModal(); }
    return;
  }
  if(D.macao==="neutro"){ neutralizar(D.mcid,D.mtid,D.mday); fecharModal(); return; }
  if(D.macao==="salvarnota"){ const tx=($("mnota")&&$("mnota").value)||""; setNota(D.mday,tx); fecharModal(); return; }
  if(D.macao==="addpessoa"){ const n=(($("enome")&&$("enome").value)||"").trim(); if(n) addPessoa(n); semPular(()=>abrirEquipe()); const c=$("modal").querySelector("[data-eq-novo]"); if(c&&c.focus) setTimeout(()=>c.focus(),20); return; }
  if(D.macao==="salvarcli"){
    salvarCliente(D.cliid||null,{nome:(($("clNome")&&$("clNome").value)||"").trim(),
      segmento:$("clSeg")&&$("clSeg").value, entrada:$("clEnt")&&$("clEnt").value,
      vencimentoContrato:($("clVen")&&$("clVen").value)||null,
      objetivo:($("clObj")&&$("clObj").value)||"",
      meta:(($("clMeta")&&$("clMeta").value)||"")===""?null:Number($("clMeta").value),
      drive:($("clDrive")&&$("clDrive").value.trim())||"", insta:($("clInsta")&&$("clInsta").value.trim())||"",
      wpp:($("clWpp")&&$("clWpp").value.trim())||""});
    semPular(()=>abrirClientes()); toast("Cliente salvo",true); return;
  }
  if(D.macao==="fecharcli"){ semPular(()=>abrirClientes()); return; }
  if(D.macao==="salvarficha"){ salvarFicha(D.cliid); return; }
  if(D.macao==="salvaragenda"){ salvarAgendaUrl(); return; }
  if(D.macao==="criarcomp"){ criarCompromisso(); return; }
  if(D.macao==="copiarrecado"){
    const el=$("recTxt"); const t=el?el.textContent:"";
    if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(()=>toast("Recado copiado",true)).catch(()=>toast("Não consegui copiar, selecione o texto")); }
    else toast("Selecione o texto para copiar");
    return;
  }
  if(D.macao==="salvartit"){ renomearTarefa(D.mcid,D.mtid,($("novoTit")&&$("novoTit").value)||""); fecharModal(); toast("Título atualizado",true); return; }
  if(D.macao==="restauratit"){ renomearTarefa(D.mcid,D.mtid,""); fecharModal(); toast("Nome original restaurado",true); return; }
  if(D.macao==="salvarobst"){
    const o=obsInfo(D.mcid,D.mtid,D.mday);
    setObsTarefa(D.mcid,D.mtid,D.mday,($("obsT")&&$("obsT").value)||"", o?o.parcial:(D.mparc==="1"));
    fecharModal(); toast("Observação salva",true); return;
  }
  if(D.macao==="limparobst"){ setObsTarefa(D.mcid,D.mtid,D.mday,"",false); fecharModal(); toast("Observação removida",true); return; }
  if(D.macao==="salvaredit"){
    editarDemanda(D.demid,{texto:(($("edtexto")&&$("edtexto").value)||"").trim(),
      area:$("edarea")&&$("edarea").value, data:$("eddata")&&$("eddata").value, resp:$("edresp")&&$("edresp").value, cli:($("edcli")&&$("edcli").value)||null});
    fecharModal(); toast("Demanda atualizada",true); return;
  }
  if(D.macao==="salvarobs"){ setObsDemanda(D.demid, ($("obsTxt")&&$("obsTxt").value)||""); fecharModal(); toast("Observação salva",false); return; }
  if(D.macao==="salvardemanda"){ const tx=(($("dtexto")&&$("dtexto").value)||"").trim(); if(!tx){ if($("dtexto"))$("dtexto").focus(); return; } addDemanda(tx,$("darea").value,$("ddata").value,$("dresp").value,($("dobs")&&$("dobs").value)||"",($("dcli")&&$("dcli").value)||null); abrirDemanda(); return; }
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
  const r={concluidas:{...a.concluidas}, datas:{...a.datas}, semanal:{...(a.semanal||{})}, notas:{...(a.notas||{})}, dup:(b&&b.dup)?b.dup:(a.dup||[]), demandas:(b&&b.demandas)?b.demandas:(a.demandas||[]), portais:{...(a.portais||{}),...((b&&b.portais)||{})}, obsT:{...(a.obsT||{}),...((b&&b.obsT)||{})}, excluidas:{...(a.excluidas||{}),...((b&&b.excluidas)||{})}, titulos:{...(a.titulos||{}),...((b&&b.titulos)||{})}, clientes:{...(a.clientes||{}),...((b&&b.clientes)||{})}, resultados:{...(a.resultados||{}),...((b&&b.resultados)||{})}, ficha:{...(a.ficha||{}),...((b&&b.ficha)||{})}, agenda:(b&&b.agenda)?b.agenda:(a.agenda||[]), agendaResp:{...(a.agendaResp||{}),...((b&&b.agendaResp)||{})}, novosClientes:(b&&b.novosClientes)?b.novosClientes:(a.novosClientes||[]), pessoas:(b&&b.pessoas&&b.pessoas.length)?b.pessoas:(a.pessoas||[]), log:(b.log&&b.log.length?b.log:a.log)||[]};
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
  if(!ESTADO.concluidas)ESTADO.concluidas={}; if(!ESTADO.datas)ESTADO.datas={}; if(!ESTADO.log)ESTADO.log=[]; if(!ESTADO.semanal)ESTADO.semanal={}; if(!ESTADO.notas)ESTADO.notas={}; if(!ESTADO.dup)ESTADO.dup=[]; if(!ESTADO.demandas)ESTADO.demandas=[]; if(!ESTADO.portais)ESTADO.portais={}; if(!ESTADO.obsT)ESTADO.obsT={}; if(!ESTADO.excluidas)ESTADO.excluidas={}; if(!ESTADO.titulos)ESTADO.titulos={}; if(!ESTADO.clientes)ESTADO.clientes={}; if(!ESTADO.novosClientes)ESTADO.novosClientes=[]; if(!ESTADO.resultados)ESTADO.resultados={}; if(!ESTADO.ficha)ESTADO.ficha={}; if(!ESTADO.agenda)ESTADO.agenda=[]; if(!ESTADO.agendaResp)ESTADO.agendaResp={}; if(!ESTADO.pessoas||!ESTADO.pessoas.length)ESTADO.pessoas=SEED_PESSOAS.map(p=>({...p}));
  ESTADO.pessoas.forEach(p=>{
    if(p.admin===undefined){ const dd=PERMS_PADRAO[p.nome]; p.admin=dd?dd.admin:false; p.areas=dd?dd.areas.slice():["mkt"]; }
    if(!p.areas) p.areas=["mkt"];
    if(!p.admin) p.areas=(p.areas||[]).filter(a=>a!=="all");   /* "all" é exclusivo de admin */
    if(p.pin===undefined) p.pin="";
  });
  /* o perfil NÃO é lembrado entre aberturas: sempre passa pela tela de escolha.
     (protege quando alguém abre em outro computador e esquece aberto) */
  USUARIO=null;
  try{ localStorage.removeItem("mk3_user"); }catch(e){}
  if(USUARIO && !eu()) USUARIO=null;
  rebuild(); render(); montarTooltip(); syncIniciar(); ligarAgendaAoVivo();
  fetch("portais.json?ts="+Date.now()).then(r=>r.ok?r.json():null)
    .then(j=>{ if(j){ PORTAIS=j; agendarEspelho(); } }).catch(()=>{});
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
  '<div class="resp">'+esc(t.resp)+carimboHTML(t)+'</div>'+
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
    return '<a class="ccard" href="'+rotaDe({escopo:c.id,aba:"cal"})+'" data-cliente="'+c.id+'">'+
      '<div class="ccard-banner" style="background:linear-gradient(135deg,'+cor[0]+' 0%,'+cor[1]+' 100%)"></div>'+
      avatarHTML(c,"ccard-av")+
      '<div class="ccard-body">'+
        '<div class="ccard-top"><h3>'+esc(c.nome)+'</h3><span class="badge-ativo">Ativo</span></div>'+
        '<div class="ccard-stats">'+tiles.map(t=>
          '<div class="stat s-'+t[0]+'"><i></i><b>'+t[2]+'</b> '+t[1]+'</div>').join("")+'</div>'+
      onbBadgeHTML(c)+linksHTML(c,"card")+'</div></a>';
  }).join("");
}


/* marco também tem área: pagamento e contrato são financeiro, o resto é marketing */
function areaMarco(mk){
  const t=((mk.titulo||"")+" "+(mk.detalhe||"")).toLowerCase();
  if(/parcela|pagamento|pagar|mensalidade|r\$|pacote de fotos|fornecedor|nota fiscal|boleto|pix/.test(t)) return "fin";
  if(/renova(ç|c)[ãa]o de contrato/.test(t)) return "fin";
  return "mkt";   /* assinatura, imersão, planejamento e gravação continuam sendo marketing */
}
function marcosDaArea(lista){
  if(!lista || !lista.length) return [];
  if(VISTA.area==="all") return lista;
  if(VISTA.area==="com") return [];
  return lista.filter(mk=>areaMarco(mk)===VISTA.area);
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
    const ags  = (VISTA.area==="all"||VISTA.area==="mkt") ? agendaVisivel().filter(e=>e.dia===s) : [];
    const cls  = ["cel", fora?"fora":"", fds?"fds":"", s===hojeIso?"hj":""].filter(Boolean).join(" ");
    const maxEv = 2;
    /* dentro do dia: o que está atrasado vem primeiro, o que já foi aprovado/concluído vem por último */
    const peso = it => it.ag ? 1.5 : (it.marco ? 3.5 : (ORDEM[it.o.st.k]!=null ? ORDEM[it.o.st.k] : 9));
    const items = ags.map(a=>({o:a,ag:true})).concat(mk.map(m=>({o:m,marco:true}))).concat(evs.map(t=>({o:t,marco:false})))
      .sort((a,b)=> peso(a)-peso(b)
        || String((a.ag||a.marco)?(a.o.titulo||""):(a.o.cliente||"")).localeCompare(String((b.ag||b.marco)?(b.o.titulo||""):(b.o.cliente||"")))
        || String((a.ag||a.marco)?(a.o.titulo||""):(a.o.tarefa||"")).localeCompare(String((b.ag||b.marco)?(b.o.titulo||""):(b.o.tarefa||""))));
    const cap = Math.min(items.length, maxEv);
    const evsHtml = items.slice(0,cap).map(it=> it.ag ? evAgenda(it.o) : (it.marco ? evCard(it.o,false,true) : evCard(it.o,showCli,false))).join("");
    const resto = items.length - cap;
    const extra = resto>0 ? '<div class="mais" data-dia="'+s+'">+'+resto+' '+(resto===1?"item":"itens")+'</div>' : "";
    cells += '<div class="'+cls+'" data-dia="'+s+'"><div class="n">'+dt.getDate()+'</div>'+evsHtml+extra+'</div>';
  }

  let dica="";
  const doMes = base.filter(t=>{ const r=d(t.data); return r.getFullYear()===ano && r.getMonth()===mes; });
  const abertas = base.filter(t=>t.st.k!=="ok");
  if(!doMes.length && !marcos.length && abertas.length){
    const prox = abertas.slice().sort((a,b)=>Math.abs(dias(a.data))-Math.abs(dias(b.data)))[0];
    const r=d(prox.data);
    const salto=(r.getFullYear()-HOJE.getFullYear())*12+(r.getMonth()-HOJE.getMonth());
    dica='<div class="cal-dica">Nada neste mês. '+abertas.length+(abertas.length>1?' itens em aberto':' item em aberto')+
      ', o mais próximo em <b>'+r.toLocaleDateString("pt-BR",{month:"long",year:"numeric"})+'</b>'+
      '<button class="ubtn" data-irmes="'+salto+'">Ir para lá</button></div>';
  }
  return dica+'<div class="cal-nav"><button data-mes="-1">&lsaquo;</button>'+
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


/* ================= AGENDA (espelho do Google Agenda) ================= */
/* ESTADO.agenda = [{id, titulo, dia, hora, fim, diaInteiro, meet, cliente, quando}] */
function agendaDe(dia){ return (ESTADO.agenda||[]).filter(e=>e.dia===dia); }
function agendaCli(cid){ return (ESTADO.agenda||[]).filter(e=>e.cliente===cid); }
function agendaVisivel(){
  const todos=(ESTADO.agenda||[]);
  if(VISTA.escopo) return todos.filter(e=>e.cliente===VISTA.escopo);
  return todos;
}
function evAgenda(e){
  const h = e.diaInteiro ? "dia inteiro" : (e.hora||"");
  return '<div class="ev ev-ag'+(e.meet?" tem-meet":"")+'" data-tt="'+escAttr(e.titulo+(h?" · "+h:""))+'">'+
    '<div class="ev-tt">&#9679; '+esc(e.titulo)+'</div>'+
    '<div class="ev-meta"><span class="ev-dot"></span>'+esc(h||"agenda")+'</div></div>';
}
function proximosAgendaHTML(){
  const hoje=iso(HOJE);
  const l=(ESTADO.agenda||[]).filter(e=>e.dia>=hoje).sort((a,b)=>(a.dia+(a.hora||"")).localeCompare(b.dia+(b.hora||""))).slice(0,5);
  if(!l.length) return '';
  return '<div class="db-cx"><div class="db-h">Próximos na agenda</div>'+
    l.map(e=>{
      const n=dias(e.dia);
      const quando = n===0?"hoje":(n===1?"amanhã":fmt(e.dia));
      return '<div class="ag-i'+(n===0?" hj":"")+'">'+
        '<span class="ag-d">'+esc(quando)+(e.diaInteiro?'':' <i>'+esc(e.hora||"")+'</i>')+'</span>'+
        '<span class="ag-t">'+esc(e.titulo)+'</span>'+donoHTML(e)+
        (e.meet?'<span class="ag-m" role="link" tabindex="0" data-abrir="'+escAttr(e.meet)+'" data-tt="Entrar no Meet">Meet</span>':'')+
      '</div>';
    }).join("")+'</div>';
}



/* ---- criar compromisso na agenda pelo painel ---- */
function abrirCompromisso(diaPre){
  if(!ehAdmin()) return;
  if(!agendaUrl()){ toast("Ligue a agenda ao vivo primeiro",false); abrirAgendaConfig(); return; }
  const hoje=iso(HOJE);
  const cls=CLIENTES.map(c=>'<option value="'+escAttr(c.id)+'">'+esc(c.nome)+'</option>').join("");
  $("modal").innerHTML='<div class="mbox compform"><h3>Novo compromisso na agenda</h3>'+
    '<p class="msub">Cria direto no Google Agenda da MK3. O cliente e o responsável ficam gravados no evento, então o painel já sabe de quem é.</p>'+
    '<label class="mlab">O que é<input type="text" id="cpTit" placeholder="Gravação, reunião, visita..." autocomplete="off"></label>'+
    '<div class="cp-linha tres">'+
      '<label class="mlab">Dia<input type="date" id="cpDia" value="'+escAttr(diaPre||hoje)+'"></label>'+
      '<label class="mlab">Começa<input type="time" id="cpHora"></label>'+
      '<label class="mlab">Termina<input type="time" id="cpFim"></label>'+
    '</div>'+
    '<div class="cp-dica">Sem hora, entra como dia inteiro. Sem hora de término, dura 1 hora.</div>'+
    '<div class="cp-linha dois">'+
      '<label class="mlab">Cliente<select id="cpCli"><option value="">Nenhum</option>'+cls+'</select></label>'+
    '</div>'+
    '<div class="mlab">Responsáveis<div class="cp-eq" id="cpResp">'+
      (ESTADO.pessoas||[]).map(p=>'<button type="button" class="cp-p" data-resp="'+escAttr(p.nome)+'">'+
        faceDe(p.nome)+esc(p.nome)+'</button>').join("")+
      '</div><i class="mdica">Nenhum marcado, o painel adivinha pelo assunto e pelos convidados.</i></div>'+
    '<label class="mlab">Convidar<input type="text" id="cpConv" placeholder="e-mails separados por vírgula" autocomplete="off"></label>'+
    '<div class="cp-aviso">'+
      '<button type="button" class="cp-sw" id="cpAvisar" data-avisar="1" role="switch" aria-checked="false"><i></i></button>'+
      '<div class="cp-aviso-t"><b>Avisar os convidados por e-mail</b>'+
        '<span>Desligado, eles entram no evento sem receber nada.</span></div>'+
    '</div>'+
    '<label class="mlab">Observação<input type="text" id="cpObs" placeholder="opcional" autocomplete="off"></label>'+
    '<div class="mbtns"><button data-macao="criarcomp">Criar na agenda</button>'+
    '<button class="sec" data-macao="fechar">Cancelar</button></div></div>';
  mostrarModal(true);
}
function criarCompromisso(){
  if(!ehAdmin()) return;
  const v=id=>{ const el=$(id); return el?String(el.value||"").trim():""; };
  const titulo=v("cpTit"), dia=v("cpDia");
  if(!titulo){ toast("Falta dizer o que é",false); return; }
  if(!dia){ toast("Falta o dia",false); return; }
  const av=$("cpAvisar");
  const resp=[...document.querySelectorAll("#cpResp .cp-p.on")].map(b=>b.dataset.resp).join(", ");
  const corpo={ chave:(ESTADO.agendaChave||""), titulo:titulo, dia:dia, hora:v("cpHora"),
    fim:v("cpFim"), cliente:v("cpCli"), responsavel:resp,
    convidados:v("cpConv"), avisar:!!(av && av.classList.contains("on")), obs:v("cpObs") };
  const bt=document.querySelector('[data-macao="criarcomp"]');
  if(bt){ bt.disabled=true; bt.textContent="Criando..."; }
  fetch(agendaUrl(), {method:"POST", headers:{"Content-Type":"text/plain;charset=utf-8"}, body:JSON.stringify(corpo)})
    .then(r=>r.json())
    .then(j=>{
      if(j && j.ok){ fecharModal(); toast("Compromisso criado na agenda",true); setTimeout(puxarAgendaAoVivo,1200); }
      else { toast("Não deu: "+((j&&j.erro)||"resposta inesperada"),false);
             if(bt){ bt.disabled=false; bt.textContent="Criar na agenda"; } }
    })
    .catch(()=>{ toast("Não consegui falar com a agenda",false);
      if(bt){ bt.disabled=false; bt.textContent="Criar na agenda"; } });
}
/* ---- de quem é o evento: adivinha e, se não der, deixa a administração atribuir ---- */
function pessoasDaArea(a){ return (ESTADO.pessoas||[]).filter(p=>!p.admin && (p.areas||[]).indexOf(a)>=0); }
function pessoaDoEvento(e){
  const manual=(ESTADO.agendaResp||{})[e.id];
  if(manual) return {nome:manual, como:"manual"};
  if(e.pessoa){
    const val=String(e.pessoa).split(/\s*,\s*/).filter(n=>pessoaPorNome(n));
    if(val.length) return {nome:val.join(", "), como:"convidado"};
  }
  if(e.area){ const p=pessoasDaArea(e.area)[0]; if(p) return {nome:p.nome, como:"área"}; }
  if(e.cliente){ const p=pessoasDaArea("mkt")[0]; if(p) return {nome:p.nome, como:"cliente"}; }
  return null;
}
function atribuirEvento(id, nome){
  if(!ehAdmin()) return;
  snapshot(); ESTADO.agendaResp=ESTADO.agendaResp||{};
  if(nome) ESTADO.agendaResp[id]=nome; else delete ESTADO.agendaResp[id];
  persist(); semPular(render);
  toast(nome?("Atribuído para "+nome):"Atribuição removida", true);
}
function donoHTML(e){
  const d=pessoaDoEvento(e);
  if(d){
    const nomes=String(d.nome).split(/\s*,\s*/).filter(Boolean);
    return nomes.map(n=>'<span class="ag-p'+(d.como==="manual"?" fix":"")+'" data-tt="'+
      escAttr(d.como==="manual"?"atribuído à mão":("identificado pelo "+d.como))+'">'+faceDe(n)+esc(n)+'</span>').join("");
  }
  if(!ehAdmin()) return '<span class="ag-p sem">sem responsável</span>';
  const opts=(ESTADO.pessoas||[]).map(p=>'<option value="'+escAttr(p.nome)+'">'+esc(p.nome)+'</option>').join("");
  return '<span class="ag-atrib"><label>Atribuir tarefa para:'+
    '<select data-atribuir="'+escAttr(e.id)+'"><option value="">escolha</option>'+opts+'</select></label></span>';
}
/* ---- agenda ao vivo: o painel lê o Google Agenda direto, sem intermediário ---- */
let AGENDA_T=null;
function agendaUrl(){ return (ESTADO.agendaUrl||"").trim(); }
function puxarAgendaAoVivo(){
  const u=agendaUrl(); if(!u) return;
  fetch(u+(u.indexOf("?")<0?"?":"&")+"ts="+Date.now())
    .then(r=>r.ok?r.json():null)
    .then(j=>{
      if(!j || !Array.isArray(j.eventos)) return;
      const antes=JSON.stringify(ESTADO.agenda||[]);
      ESTADO.agenda=j.eventos;                     /* só na memória: não grava nem sincroniza */
      if(JSON.stringify(ESTADO.agenda)!==antes){ marcarAgendaViva(j.lido); semPular(render); }
      else marcarAgendaViva(j.lido);
    })
    .catch(()=>{ marcarAgendaViva(null,true); });
}
function marcarAgendaViva(quando,erro){
  const el=document.getElementById("agviva"); if(!el) return;
  if(erro){ el.className="agviva erro"; el.textContent="agenda fora do ar"; return; }
  el.className="agviva"; el.textContent="agenda ao vivo";
  el.title = quando ? ("última leitura "+quando) : "";
}
function ligarAgendaAoVivo(){
  clearInterval(AGENDA_T);
  if(!agendaUrl()) return;
  puxarAgendaAoVivo();
  AGENDA_T=setInterval(puxarAgendaAoVivo, 60000);
  document.addEventListener("visibilitychange",()=>{ if(!document.hidden) puxarAgendaAoVivo(); });
}
function abrirAgendaConfig(){
  if(!ehAdmin()) return;
  $("modal").innerHTML='<div class="mbox demform"><h3>Agenda ao vivo</h3>'+
    '<p class="msub">Cole aqui o endereço do aplicativo da web publicado no Apps Script. Com ele preenchido, o painel lê o Google Agenda direto, a cada minuto e sempre que alguém abre a tela.</p>'+
    '<label class="mlab">Endereço do aplicativo<input type="text" id="agUrl" placeholder="https://script.google.com/macros/s/…/exec" value="'+escAttr(agendaUrl())+'"></label>'+
    '<label class="mlab">Chave para criar eventos<input type="text" id="agChave" placeholder="a mesma que está no script" value="'+escAttr(ESTADO.agendaChave||"")+'"></label>'+
    '<div class="mbtns"><button data-macao="salvaragenda">Salvar e testar</button>'+
    '<button class="sec" data-macao="fechar">Fechar</button></div></div>';
  mostrarModal(true);
}
function salvarAgendaUrl(){
  if(!ehAdmin()) return;
  const v=(($("agUrl")&&$("agUrl").value)||"").trim();
  const k=(($("agChave")&&$("agChave").value)||"").trim();
  snapshot(); ESTADO.agendaUrl=v; ESTADO.agendaChave=k; persist();
  fecharModal(); ligarAgendaAoVivo();
  toast(v?"Agenda ao vivo ligada":"Agenda ao vivo desligada", true);
}
/* ================= RESULTADOS (Reportei) ================= */
const REPORTEI_PROJ = { leonardo:1100216, suelem:1265569, oceanus:1180490 };   /* cliente do painel -> projeto no Reportei */
const numBR = n => (n==null||isNaN(n)) ? "-" : Number(n).toLocaleString("pt-BR");
function mesAtualYM(){ const d=HOJE; return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"); }
function resultadoDe(cid, ym){
  const r=(ESTADO.resultados&&ESTADO.resultados[cid])||null; if(!r) return null;
  if(ym && r[ym]) return {...r[ym], ym:ym};
  const ks=Object.keys(r).sort(); if(!ks.length) return null;
  const u=ks[ks.length-1]; return {...r[u], ym:u};
}
function setaHTML(d){
  if(d==null) return '<span class="rs-d zero">estável</span>';
  const p=Math.round(d*10)/10, cls=p>0?"sobe":(p<0?"desce":"zero");
  const ic=p>0?"&#9650;":(p<0?"&#9660;":"&#8226;");
  return '<span class="rs-d '+cls+'">'+ic+' '+(p>0?"+":"")+String(p).replace(".",",")+'%</span>';
}
function resultadosPainelHTML(){
  const linhas=CLIENTES.map(c=>{
    const r=resultadoDe(c.id, mesAtualYM()); if(!r) return null; return {c:c, r:r};
  }).filter(Boolean);
  if(!linhas.length) return '';
  return '<div class="db-cx res"><div class="db-h">Resultados do mês <i class="res-f">via Reportei</i></div>'+
    linhas.map((L,i)=>{
      const ms=(L.r.metricas||[]).slice(0,4);
      return '<div class="res-cli" style="animation-delay:'+(i*70)+'ms">'+
        '<div class="res-nome">'+avatarHTML(L.c,"card-face res-av")+'<b>'+esc(L.c.nome)+'</b>'+
          (L.r.link?'<a class="res-link" href="'+esc(L.r.link)+'" target="_blank" rel="noopener">relatório completo</a>':'')+'</div>'+
        '<div class="res-ms">'+ms.map(x=>
          '<div class="res-m"><span class="rs-v" data-num="'+(x.v||0)+'">0</span>'+
          '<span class="rs-k">'+esc(x.k)+'</span>'+setaHTML(x.d)+'</div>').join("")+'</div>'+
        (L.r.resumo?'<div class="res-txt">'+esc(L.r.resumo)+'</div>':'')+
      '</div>';
    }).join("")+
    '<div class="db-obs">'+esc(linhas[0].r.periodo||"")+(linhas[0].r.compara?" · comparado com "+esc(linhas[0].r.compara):"")+'</div></div>';
}



/* ================= FICHA DA MARCA, LINKS E CARIMBO ================= */
/* quem marcou a tarefa como feita, lido do próprio log */
function carimboDe(cid,tid){
  const e=(ESTADO.log||[]).find(x=>x.cliente===cid && x.id===tid && (x.acao==="concluir"||x.acao==="registrar"));
  if(!e || !e.quem) return null;
  const d=new Date(e.ts);
  return {quem:e.quem, quando:d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})+" às "+
          d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})};
}
function carimboHTML(t){
  if(t.st.k!=="ok") return '';
  const c=carimboDe(t.clienteId,t.id); if(!c) return '';
  return '<span class="carimbo" data-tt="'+escAttr(c.quem+" marcou em "+c.quando)+'">'+esc(c.quem)+'</span>';
}

/* links úteis de cada cliente */
const LINKS_PADRAO = {
  suelem:   {drive:"https://drive.google.com/drive/folders/1O5eYgdfNYqghQnjc0q84_NpBcW9Cr63m", insta:"suelemmartinsgomes", wpp:"27998887565"},
  leonardo: {drive:"https://drive.google.com/drive/folders/1eadjcdimP-grmxJRpjslvLIHoLZ0fBqp", insta:"leonardodepaulacorretor", wpp:"27998871444"},
  cynthia:  {drive:"https://drive.google.com/drive/folders/1SlPUFY7OOSqso9lhAUfi92dFg2j23Eza", insta:"cynthiadcorretora", wpp:"27999178909"},
  oceanus:  {drive:"https://drive.google.com/drive/folders/1FAUG6fIzv3nIB1bqlUdAkHEX2BFSqQN0", insta:"escolaoceanus", wpp:"27992626014"},
  adriana:  {drive:"https://drive.google.com/drive/folders/1Mr_J56Sp8d2wnaTIfjkOT6BlXQlIXaHf", insta:"adriana.dinhamais", wpp:"27988537167"}
};
function linksDe(c){
  const ed=(ESTADO.clientes&&ESTADO.clientes[c.id])||{}, pad=LINKS_PADRAO[c.id]||{};
  const v=k=>(ed[k]!==undefined && ed[k]!==null && ed[k]!=="") ? ed[k] : (pad[k]||"");
  const insta=String(v("insta")).replace(/^@/,"").trim();
  const wpp=String(v("wpp")).replace(/\D/g,"");
  return {drive:v("drive"), insta:insta?("https://instagram.com/"+insta):"", instaNome:insta,
          wpp:wpp?("https://wa.me/"+(wpp.length<=11?"55":"")+wpp):"", wppNum:wpp};
}
const IC_LINK = {
  drive:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h7A1.5 1.5 0 0 1 19 10v7.5A1.5 1.5 0 0 1 17.5 19h-13A1.5 1.5 0 0 1 3 17.5z"/></svg>',
  insta:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/></svg>',
  wpp:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12a8 8 0 0 1-11.9 7L4 20l1.1-3.9A8 8 0 1 1 20 12z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.4-2-1-.8.9c-1-.5-1.8-1.3-2.2-2.3l.9-.8-1-2z" fill="currentColor" stroke="none"/></svg>'
};
function linksHTML(c, cls){
  const L=linksDe(c), b=[];
  if(L.drive) b.push('<span class="lnk" role="link" tabindex="0" data-abrir="'+escAttr(L.drive)+'" data-tt="Pasta no Drive">'+IC_LINK.drive+'</span>');
  if(L.insta) b.push('<span class="lnk" role="link" tabindex="0" data-abrir="'+escAttr(L.insta)+'" data-tt="@'+escAttr(L.instaNome)+'">'+IC_LINK.insta+'</span>');
  if(L.wpp)   b.push('<span class="lnk" role="link" tabindex="0" data-abrir="'+escAttr(L.wpp)+'" data-tt="WhatsApp do cliente">'+IC_LINK.wpp+'</span>');
  return b.length?'<div class="lnks '+(cls||"")+'">'+b.join("")+'</div>':'';
}

/* ficha da marca — o que a equipe precisa na hora de escrever */
const FICHA_PADRAO = {
  cynthia:{
    frase:"Venda com propósito: realizar a conquista do cliente, não só fechar negócio.",
    objetivo:"Visibilidade e público de Vitória. Hoje a base é de Cachoeiro e o engajamento é fraco.",
    publico:"Médio e alto padrão em Vitória. Muito por indicação. Investidores e quem cuida de saúde e estética.",
    tom:"Meiga e direta. Fala coisa difícil sem ofender. Nunca omite defeito do imóvel: se é sol da tarde, é sol da tarde.",
    temas:"Viagens, restaurantes e barzinhos, família, filhos adultos, esportes sem exagero, charuto.",
    evitar:"Palavrão, agressividade, inventar ou omitir informação do imóvel, cliente especulador.",
    visual:"Moderna tradicional. Paleta marrom, bege, boho, branco, azul marinho e vinho. Sem estampa.",
    refs:"Suelem, Larissa Moraes (refugios.lar.lare), Carolina Zarch.",
    sucesso:"Um cliente chegar pelo Instagram, e ser reconhecida na região onde mora.",
    recado:"Na imersão você foi clara: não quer seguidor por seguidor, quer gente de Vitória. Hoje boa parte da sua base ainda é de Cachoeiro, e é isso que estamos virando. Cada seguidor novo daqui é alguém que pode visitar um imóvel com você."
  },
  leonardo:{
    frase:"Autenticidade, conhecimento e autoridade no mercado imobiliário. 11 anos no setor, 22 em vendas.",
    objetivo:"Mais autoridade e mais vendas. Mede por captações e por quanta gente chega até ele.",
    publico:"Investidores e famílias em evolução, 30 a 50 anos, com filhos e pets, do interior do ES. Pessoas de fé.",
    tom:"Próximo, humano e técnico na medida. Clareza e objetividade, odeia enrolação.",
    temas:"Clientes felizes, etapas da compra, dados de mercado, bastidores, família e natureza. Formação em Geoprocessamento é diferencial.",
    evitar:"Política, futebol e religião de forma polêmica. Mentira, palavrão, tratar cliente como número.",
    visual:"Ainda sem branding fechado. Deseja estudo de cores e fontes no futuro.",
    refs:"Jesus, Kleverson.",
    sucesso:"Comprar a casa, o apartamento e trocar de carro.",
    recado:"Você mede o resultado pelo tanto de gente que chega até você. É por isso que acompanhamos as visitas ao perfil e não o número de seguidores: cada visita aqui é alguém que viu seu conteúdo e parou para te conhecer antes de falar com você."
  },
  adriana:{
    frase:"Elevando a autoestima da mulher.",
    objetivo:"Profissionalizar o perfil e trazer gente de fora do bairro para a loja.",
    publico:"Mulheres maduras que gostam de se vestir bem, confortável e intencional. Cariacica, Jardim América e Vila Velha.",
    tom:"Amigável, empática, confiante.",
    temas:"Moda, autoestima, autoconfiança, cores, modelagem, caimento, tecido, versatilidade. Consultoria de imagem (Transforma Dinha).",
    evitar:"Política, religião de forma forte, polêmica que obriga escolher lado. Atrair quem compra só por preço.",
    visual:"Mulher madura, segura, estilosa. Nada desleixado ou triste.",
    refs:"Silva Braz, Tom Braga (formato dos vídeos), Karine Mozer.",
    sucesso:"Constância no perfil e clientes novos conhecendo a marca pelo conteúdo.",
    recado:"Seu objetivo é que gente de fora do bairro conheça a loja. Alcance é exatamente essa conta: quantas pessoas diferentes viram a Dinha Mais no mês. Quanto mais gente nova alcançada, mais gente com chance de atravessar Cariacica para comprar com você."
  },
  oceanus:{
    frase:"Escola Oceanu's, particular, fundada em 1994, em Barcelona, Serra. Da Educação Infantil ao Fundamental II.",
    objetivo:"Gerar visita e matrícula. Instagram atrai, WhatsApp fecha. Pico de matrícula de outubro a fevereiro, com segundo pico em julho.",
    publico:"Pais de 28 a 45 anos de Serra e Grande Vitória. A mãe faz a triagem e a visita, o pai valida o custo, os avós pesam na confiança. Valorizam segurança, bilinguismo, estrutura, integral e proximidade.",
    tom:"Acolhedor e afetivo, com humor leve. Linguagem de família: rotina, acolhimento, adaptação, tranquilidade. Nunca culpa os pais.",
    temas:"Volta às aulas, rotina de sono, tela x livro, descanso como parte do aprendizado, brincadeiras entre gerações, bastidores de professores e equipe, tour pela estrutura, adaptação, alimentação, segurança.",
    evitar:"Promessa absoluta (\"seu filho vai...\"), expor criança identificada ou com rotina detalhada, lista de alunos, apelo a medo ou culpa, comparação agressiva com concorrente, garantia de resultado, termo técnico sem tradução, trend sem ligação com o local, excesso de CTA na mesma peça.",
    visual:"Logo em PNG, SVG e PDF no Drive antigo da agência. Tem cartão, folder e manual escolar.",
    refs:"sem base no Drive",
    sucesso:"Agenda de visitas cheia na temporada de matrícula.",
    recado:"O que traz matrícula é visita agendada, e visita começa com um pai vendo a escola no Instagram. É esse caminho que a gente acompanha aqui."
  },
  suelem:{
    frase:"Acolhimento e envolvimento real com a história de cada cliente. Ela não desiste.",
    objetivo:"Ser a corretora mais lembrada de Cariacica. Ampliar vendas por indicação e consolidar a marca.",
    publico:"Homens e mulheres a partir de 27 anos em transição: casamento, primeiro imóvel, ampliação de patrimônio, investimento. Do Minha Casa Minha Vida ao alto padrão.",
    tom:"Empático, próximo, direto e inspirador. Adapta ao cliente, foge do padrão engessado.",
    temas:"Bastidores reais, jornada do cliente, fé, família. Frases dela: \"Esse imóvel é um espetáculo!\", \"Juntos somos mais fortes.\"",
    evitar:"Mentir, forçar venda, agir por comissão.",
    visual:"Simples, elegante, com toque familiar, moderno e espiritual.",
    refs:"Rosângela Bastos, Tais Nascimento.",
    sucesso:"Ser referência em Cariacica: respeitada, indicada e admirada.",
    recado:"Sua meta é ser a corretora mais lembrada de Cariacica. Ser lembrada é aparecer muitas vezes para as mesmas pessoas certas, e é isso que este número conta: quantas vezes seu conteúdo apareceu na tela de alguém no mês."
  }
};
const FICHA_CAMPOS = [
  ["frase","A marca em uma frase"],
  ["objetivo","Objetivo do cliente"],
  ["publico","Quem é o público"],
  ["tom","Tom de voz"],
  ["temas","Temas da marca"],
  ["evitar","O que NÃO abordar"],
  ["visual","Identidade visual"],
  ["refs","Referências que admira"],
  ["sucesso","O que é sucesso pra ele"],
  ["recado","Recado do objetivo (o cliente lê isso no portal)"]
];
function fichaDe(c){
  const salva=(ESTADO.ficha&&ESTADO.ficha[c.id])||{}, pad=FICHA_PADRAO[c.id]||{};
  const f={}; FICHA_CAMPOS.forEach(k=>{ f[k[0]] = (salva[k[0]]!==undefined && salva[k[0]]!=="") ? salva[k[0]] : (pad[k[0]]||""); });
  return f;
}
function fichaHTML(c){
  const f=fichaDe(c), tem=FICHA_CAMPOS.some(k=>f[k[0]]);
  if(!tem) return '<div class="vazio">Sem ficha da marca ainda. '+(ehAdmin()?'Clique em Editar ficha para preencher a partir da imersão.':'Peça para a administração preencher a partir da imersão.')+'</div>'+
    (ehAdmin()?'<div class="mbtns"><button data-ficha="'+escAttr(c.id)+'">Editar ficha</button></div>':'');
  return '<section class="ficha">'+
    '<div class="fh-topo"><b>Ficha da marca</b><span>o que a imersão deixou combinado</span>'+
      (ehAdmin()?'<button class="ubtn" data-ficha="'+escAttr(c.id)+'">Editar</button>':'')+'</div>'+
    '<div class="fh-grid">'+FICHA_CAMPOS.filter(k=>f[k[0]]).map(k=>
      '<div class="fh-c'+(k[0]==="evitar"?" nao":"")+(k[0]==="frase"?" destaque":"")+'">'+
        '<div class="fh-k">'+esc(k[1])+'</div><div class="fh-v">'+esc(f[k[0]])+'</div></div>').join("")+
    '</div></section>';
}
function abrirFicha(cid){
  if(!ehAdmin()) return;
  const c=cliente(cid); if(!c) return;
  const f=fichaDe(c);
  $("modal").innerHTML='<div class="mbox fichaform"><h3>Ficha da marca · '+esc(c.nome)+'</h3>'+
    '<p class="msub">Sai da imersão e serve na hora de escrever. Deixe em branco o que não se aplica.</p>'+
    FICHA_CAMPOS.map(k=>'<label class="mlab">'+esc(k[1])+
      '<textarea id="fh_'+k[0]+'" rows="2">'+esc(f[k[0]])+'</textarea></label>').join("")+
    '<div class="mbtns"><button data-macao="salvarficha" data-cliid="'+escAttr(c.id)+'">Salvar</button>'+
    '<button class="sec" data-macao="fechar">Cancelar</button></div></div>';
  mostrarModal(true);
}
function salvarFicha(cid){
  if(!ehAdmin()) return;
  snapshot(); ESTADO.ficha=ESTADO.ficha||{}; const o={};
  FICHA_CAMPOS.forEach(k=>{ const el=$("fh_"+k[0]); o[k[0]]=el?el.value.trim():""; });
  ESTADO.ficha[cid]=o; persist(); rebuild(); render(); toast("Ficha salva",true);
}

/* ---- rotina automática: quando os resultados foram atualizados ---- */
function statusRotinaHTML(){
  let ult=null;
  const R=ESTADO.resultados||{};
  for(const cid in R) for(const ym in R[cid]){ const a=R[cid][ym].atualizado; if(a && (!ult || a>ult)) ult=a; }
  if(!ult) return '';
  const d=dias(ult), n=Math.abs(d);
  const txt = d===0 ? "atualizados hoje" : (n===1 ? "atualizados ontem" : "atualizados há "+n+" dias");
  const cls = n<=1 ? "ok" : (n<=3 ? "morno" : "velho");
  return '<div class="rotina '+cls+'"><span class="rot-pt"></span>Resultados '+txt+
    (n>3?' · a rotina das 7h não rodou, os números podem estar velhos':'')+'</div>';
}
/* ================= ONBOARDING (as 14 etapas obrigatórias) ================= */
const ONBOARDING = [
  ["pasta","Estrutura de pastas do cliente"],
  ["planilha","Planilha de acessos com e-mail e senha"],
  ["acessos","Coletar os acessos das redes"],
  ["fotoMarca","Foto da marca salva como arquivo"],
  ["grupo","Grupo de WhatsApp criado"],
  ["boasvindas","Boas-vindas enviadas no grupo"],
  ["onboarding","Onboarding por WhatsApp e por e-mail"],
  ["prints","Prints das redes na chegada", true],
  ["reserva","Códigos de reserva 2FA", true],
  ["pesq2","Pesquisa de mercado e demanda", true],
  ["pesq1","Pesquisa de comportamento em redes", true],
  ["imersao","Reunião de imersão marcada e feita"],
  ["imersaoDoc","Documento da imersão tratado"],
  ["revisaoOnb","Revisão final, etapa por etapa"]
];
const CURTO = {prints:"prints de chegada", reserva:"códigos 2FA", pesq2:"pesquisa de mercado", pesq1:"pesquisa de comportamento"};
function onboardingDe(c){
  const ts=TODAS.filter(t=>t.clienteId===c.id);
  const itens=ONBOARDING.map(o=>{
    const t=ts.find(x=>x.id===o[0]);
    return t ? {id:o[0], rot:o[1], critico:!!o[2], feita:t.st.k==="ok", data:t.data, st:t.st.k} : null;
  }).filter(Boolean);
  const feitas=itens.filter(i=>i.feita).length;
  const criticas=itens.filter(i=>i.critico && !i.feita);
  return {itens:itens, feitas:feitas, total:itens.length, criticas:criticas,
          completo: itens.length>0 && feitas===itens.length};
}
function onbBadgeHTML(c){
  const o=onboardingDe(c); if(!o.total) return '';

  const pct=Math.round(o.feitas/o.total*100);
  return '<div class="onb'+(o.completo?" ok":(o.criticas.length?" crit":""))+'">'+
    '<div class="onb-t">'+(o.completo?"Onboarding completo":"Onboarding")+'<b>'+o.feitas+'/'+o.total+'</b></div>'+
    '<div class="onb-bar"><i style="width:0" data-larg="'+pct+'"></i></div>'+
    (o.criticas.length?'<div class="onb-c">Falta: '+o.criticas.map(i=>esc(CURTO[i.id]||i.rot)).join(", ")+'</div>':'')+
  '</div>';
}
function onboardingHTML(c){
  const o=onboardingDe(c); if(!o.total) return '';
  return '<section class="onb-box'+(o.completo?" ok":"")+'">'+
    '<div class="onb-h"><b>Onboarding</b><span>'+o.feitas+' de '+o.total+' etapas</span>'+
      (o.criticas.length?'<i class="onb-al">'+o.criticas.length+' obrigatória'+(o.criticas.length>1?'s':'')+' em aberto</i>':'')+'</div>'+
    '<div class="onb-lista">'+o.itens.map(i=>
      '<div class="onb-i'+(i.feita?" feita":"")+(i.critico?" critico":"")+'">'+
        '<span class="onb-ck">'+(i.feita?"&#10003;":"")+'</span>'+
        '<span class="onb-r">'+esc(i.rot)+(i.critico?'<em>obrigatória</em>':'')+'</span>'+
        '<span class="onb-d">'+(i.data?fmt(i.data):"sem data")+'</span>'+
      '</div>').join("")+'</div>'+
    (o.completo?'<div class="onb-fim">Tudo conferido. Cliente pronto para o ciclo normal.</div>':'')+
  '</section>';
}
/* ================= FUNCIONÁRIOS (carga por pessoa) ================= */
function pessoasVisiveis(){ return (ESTADO.pessoas||[]).slice(); }
function areasDaPessoa(p){ return p.admin ? ["all"] : ((p.areas||[]).filter(a=>a!=="all")); }
function tarefasDe(nome){
  const p=pessoaPorNome(nome); if(!p) return [];
  return TODAS.filter(t=>{
    if(t.fase==="Demanda") return t.resp===nome;      /* demanda tem dono com nome */
    if(p.admin) return false;                          /* admin só conta o que tem o nome dele */
    return (p.areas||[]).indexOf(t.area)>=0;
  });
}
function cargaSemana(ts){
  const ini=segOf(iso(HOJE)), dias=[0,1,2,3,4].map(i=>addD(ini,i));
  return dias.map(d=>({dia:d, n:ts.filter(t=>t.data===d && t.st.k!=="ok").length}));
}
function funcionariosHTML(){
  if(!ehAdmin()) return '<div class="vazio">Só a administração vê esta tela.</div>';
  const ROT={all:"todas as áreas",mkt:"Marketing Digital",fin:"Financeiro",com:"Comercial"};
  const pes=pessoasVisiveis();
  const cartoes=pes.map((p,i)=>{
    const ts=tarefasDe(p.nome);
    const n=k=>ts.filter(t=>t.st.k===k).length;
    const atras=n("atrasado"), hoje=n("hoje"), parciais=n("parcial");
    const semana=ts.filter(t=>["umdia","semana"].indexOf(t.st.k)>=0).length;
    const ym=iso(HOJE).slice(0,7);
    const feitas=ts.filter(t=>t.st.k==="ok" && t.dataConclusao && String(t.dataConclusao).slice(0,7)===ym).length;
    const sem=cargaSemana(ts), pico=Math.max(1,...sem.map(x=>x.n));
    const prox=ts.filter(t=>t.st.k!=="ok" && t.data).sort((a,b)=>String(a.data).localeCompare(String(b.data)))[0];
    const DOW=["Seg","Ter","Qua","Qui","Sex"];
    const alerta = atras>0 ? "risco" : (sem.some(x=>x.n>=5) ? "cheio" : "");
    return '<div class="fcard '+alerta+'" style="animation-delay:'+(i*70)+'ms">'+
      '<div class="fc-topo">'+faceDe(p.nome)+
        '<div class="fc-id"><b>'+esc(p.nome)+'</b><i>'+esc(areasDaPessoa(p).map(a=>ROT[a]||a).join(" · ")||"sem área")+
        (p.admin?' · administração':'')+'</i></div>'+
        (atras>0?'<span class="fc-tag">'+atras+' atrasada'+(atras>1?'s':'')+'</span>':'')+
        (parciais>0?'<span class="fc-tag parc">'+parciais+' parcial'+(parciais>1?'is':'')+'</span>':'')+
      '</div>'+
      '<div class="fc-nums">'+
        '<div class="fc-n atrasado"><span data-num="'+atras+'">0</span><i>atrasado</i></div>'+
        '<div class="fc-n hoje"><span data-num="'+hoje+'">0</span><i>vence hoje</i></div>'+
        '<div class="fc-n semana"><span data-num="'+semana+'">0</span><i>esta semana</i></div>'+
        '<div class="fc-n ok"><span data-num="'+feitas+'">0</span><i>feitas no mês</i></div>'+
      '</div>'+
      '<div class="fc-sem"><div class="fc-h">Carga da semana</div><div class="fc-barras">'+
        sem.map((x,j)=>'<div class="fc-b'+(x.dia===iso(HOJE)?" hj":"")+(x.n>=5?" alto":"")+'">'+
          '<i style="height:0" data-alt="'+Math.round(x.n/pico*100)+'"></i>'+
          '<b>'+(x.n||"")+'</b><span>'+DOW[j]+'</span></div>').join("")+
      '</div></div>'+
      (prox?'<div class="fc-prox">Próxima: <b>'+esc(prox.tarefa)+'</b> · '+esc(prox.cliente||"")+' · '+fmt(prox.data)+'</div>'
           :'<div class="fc-prox vazio">Nada na fila.</div>')+
    '</div>';
  }).join("");
  const semDono=["mkt","fin","com"].filter(a=>!(ESTADO.pessoas||[]).some(p=>!p.admin && (p.areas||[]).indexOf(a)>=0));
  return '<div class="fgrid">'+cartoes+'</div>'+
    (semDono.length?'<div class="db-obs">Sem ninguém responsável: '+semDono.map(a=>ROT[a]).join(", ")+
      '. Defina em Equipe para a carga aparecer aqui.</div>':'');
}

/* ================= RECADO DO DIA ================= */
function recadoTexto(){
  const ts=TODAS.filter(t=>t.st.k!=="ok");
  const cli=t=>t.cliente||"";
  const donoDe=t=>{
    if(t.fase==="Demanda") return t.resp||"";
    if(t.resp==="Cliente") return "cliente";
    const p=(ESTADO.pessoas||[]).find(x=>!x.admin && (x.areas||[]).indexOf(t.area)>=0);
    return p?p.nome:"";
  };
  const linha=t=>{ const d=donoDe(t); return "- "+cli(t)+": "+t.tarefa+(d?" ("+d+")":""); };
  const LIM=8;
  const bloco=(tit,arr,fn)=>{ if(!arr.length) return "";
    const cabe=arr.slice(0,LIM), resto=arr.length-cabe.length;
    return "\n"+tit+" ("+arr.length+")\n"+cabe.map(fn).join("\n")+(resto>0?"\n- e mais "+resto:"")+"\n"; };
  const atras=ts.filter(t=>t.st.k==="atrasado").sort((a,b)=>String(a.data).localeCompare(String(b.data)));
  const parc=ts.filter(t=>t.st.k==="parcial").sort((a,b)=>String(a.st.resto||"").localeCompare(String(b.st.resto||"")));
  const hoje=ts.filter(t=>t.st.k==="hoje");
  const amanha=ts.filter(t=>t.st.k==="umdia");
  const cobrar=ts.filter(t=>t.resp==="Cliente" && ["atrasado","parcial","hoje","umdia"].indexOf(t.st.k)>=0);
  const dia=HOJE.toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"2-digit"});
  let s="MK3 - "+dia.charAt(0).toUpperCase()+dia.slice(1)+"\n";
  s+=bloco("ATRASADO", atras, t=>linha(t)+" - venceu "+fmt(t.data));
  s+=bloco("FEITO PELA METADE", parc, t=>linha(t)+" - resto em "+fmt(t.st.resto));
  s+=bloco("VENCE HOJE", hoje, linha);
  s+=bloco("AMANHA", amanha, linha);
  s+=bloco("COBRAR O CLIENTE", cobrar, t=>"- "+cli(t)+": "+t.tarefa+" - prazo "+fmt(t.data));
  if(!atras.length && !parc.length && !hoje.length && !amanha.length){ s+="\nNada vencendo hoje nem amanha. Dia livre para adiantar o que vem.\n"; }
  return s.trim();
}
function abrirRecado(){
  if(!ehAdmin()) return;
  const txt=recadoTexto();
  const mm=$("modal");
  mm.innerHTML='<div class="mbox recado"><h3>Recado do dia</h3>'+
    '<p class="msub">Texto pronto para colar no grupo. Gerado agora, com o que está no painel.</p>'+
    '<pre class="rec-txt" id="recTxt">'+esc(txt)+'</pre>'+
    '<div class="mbtns"><button data-macao="copiarrecado">Copiar texto</button>'+
    '<button class="sec" data-macao="fechar">Fechar</button></div></div>';
  mostrarModal(true);
}
function dashboardHTML(completo){
  const ts=tarefasArea();
  const n=k=>ts.filter(t=>t.st.k===k).length;
  const cards=BUCKETS.map((k,i)=>
    '<button class="kpi '+k+' '+(VISTA.filtro===k?"on":"")+'" data-bucket="'+k+'" style="animation-delay:'+(i*45)+'ms">'+
      '<b data-num="'+n(k)+'">0</b><small>'+ROTULO[k]+'</small></button>').join("");

  const esper=(VISTA.escopo?[cliente(VISTA.escopo)]:CLIENTES).flatMap(contadores);
  const espHtml = esper.length
    ? esper.sort((a,b)=>String(a.vencimento).localeCompare(String(b.vencimento))).slice(0,4).map(x=>{
        const d0=dias(x.vencimento);
        const cls=d0<0?"atrasado":d0===0?"hoje":d0===1?"umdia":"semana";
        return '<div class="db-li"><span class="db-p '+cls+'"></span>'+
          '<span class="db-t">'+esc(x.cliente)+' <i>'+esc(x.tipo)+'</i></span>'+
          '<span class="db-v">'+(d0<0?"aprovado auto":d0===0?"hoje":d0+"d")+'</span></div>';
      }).join("")
    : '<div class="db-vazio">Nada na mão do cliente.</div>';

  const hoje=iso(HOJE);
  const prox=[];
  for(let i=0;i<7;i++){ const d0=addD(hoje,i);
    prox.push({d:d0, n:ts.filter(t=>t.data===d0 && t.st.k!=="ok").length}); }
  const topo=Math.max(1,...prox.map(p=>p.n));
  const proxHtml='<div class="db-sem">'+prox.map(p=>{
    const dw=d(p.d).toLocaleDateString("pt-BR",{weekday:"short"}).replace(".","");
    return '<div class="db-col'+(p.d===hoje?" hj":"")+'" title="'+fmt(p.d)+': '+p.n+'">'+
      '<span class="db-bar" style="height:0" data-alt="'+Math.round(p.n/topo*100)+'"></span>'+
      '<i>'+(p.n||"")+'</i><span class="db-dw">'+dw+'</span></div>';
  }).join("")+'</div>';

  const mesAtual=iso(HOJE).slice(0,7);
  const H=(typeof atrasosHistoricos==="function"?atrasosHistoricos():[]).filter(a=>a.mes===mesAtual&&!a.justificado);
  const mk3=H.filter(a=>a.quem==="MK3").reduce((s,a)=>s+a.dias,0);
  const cli=H.filter(a=>a.quem==="Cliente").reduce((s,a)=>s+a.dias,0);

  /* anel de progresso do mês */
  const doMes=ts.filter(t=>t.data && t.data.slice(0,7)===iso(HOJE).slice(0,7));
  const feitasMes=doMes.filter(t=>t.st.k==="ok").length;
  const pct=doMes.length?Math.round(feitasMes/doMes.length*100):0;
  const R=42, C=2*Math.PI*R;
  const anel='<div class="db-anel"><svg viewBox="0 0 110 110" aria-hidden="true">'+
      '<circle cx="55" cy="55" r="'+R+'" class="an-bg"/>'+
      '<circle cx="55" cy="55" r="'+R+'" class="an-fg" style="stroke-dasharray:'+C+';stroke-dashoffset:'+C+'" data-arco="'+(C-(C*pct/100))+'"/>'+
    '</svg><div class="an-txt"><b data-num="'+pct+'">0</b><span>%</span><i>do mês concluído</i></div></div>';

  /* o que fazer agora: 3 mais críticos */
  const criticos=ts.filter(t=>t.st.k!=="ok" && t.data)
    .sort((a,b)=>ORDEM[a.st.k]-ORDEM[b.st.k]||String(a.data).localeCompare(String(b.data))).slice(0,3);
  const agoraHtml=criticos.length
    ? criticos.map((t,i)=>'<button class="db-ag editavel" data-editar="1" data-mcid="'+t.clienteId+'" data-mtid="'+escAttr(t.id)+'" style="animation-delay:'+(i*70)+'ms">'+
        tagHTML(t)+'<span class="db-agt">'+esc(EXEC[baseId(t.id)]||t.tarefa)+' <i>'+esc(t.cliente)+'</i></span>'+
        '<span class="db-agr">'+esc(t.resp)+'</span></button>').join("")
    : '<div class="db-vazio">Nada crítico agora. Respira.</div>';

  return '<div class="dash'+(completo?" full":"")+'">'+
    (completo?statusRotinaHTML():'')+
    (completo?'<div class="db-topo">'+anel+'<div class="db-agora"><div class="db-h">O que fazer agora</div>'+agoraHtml+'</div></div>':'')+
    '<div class="kpis">'+cards+'</div>'+
    '<div class="db-linha">'+
      '<div class="db-cx"><div class="db-h">Esperando o cliente</div>'+espHtml+'</div>'+
      '<div class="db-cx"><div class="db-h">Próximos 7 dias</div>'+proxHtml+'</div>'+
      '<div class="db-cx"><div class="db-h">Atraso do mês</div>'+
        '<div class="db-pl"><span class="db-pn mk3"><b>'+mk3+'</b>MK3</span>'+
        '<span class="db-pn cli"><b>'+cli+'</b>Cliente</span></div>'+
        '<div class="db-obs">dias úteis já consumados</div></div>'+
    '</div>'+
    (completo?proximosAgendaHTML():'')+
    (completo?resultadosPainelHTML():'')+
    (completo?(function(){
      const porCli={};
      ts.filter(t=>t.st.k==="atrasado").forEach(t=>{ porCli[t.cliente]=(porCli[t.cliente]||0)+1; });
      const r=Object.entries(porCli).sort((a,b)=>b[1]-a[1]);
      if(!r.length) return '';
      const tp=Math.max(1,r[0][1]);
      return '<div class="db-cx"><div class="db-h">Atrasos abertos por cliente</div>'+
        r.map(([nome,q],i)=>'<div class="db-rk" style="animation-delay:'+(i*60)+'ms"><span class="db-rn">'+esc(nome)+'</span>'+
          '<span class="db-rb"><i style="width:0" data-larg="'+Math.round(q/tp*100)+'"></i></span>'+
          '<span class="db-rv" data-num="'+q+'">0</span></div>').join("")+'</div>';
    })():'')+
  '</div>';
}
function listaGlobalHTML(){
  const ts = tarefasArea();
  const semaf = dashboardHTML(true);
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
  aprPlanej:"Aprovação do planejamento", envMidia:"Entregar artes", aprMidia:"Aprovação das artes",
  c1_artes:"Artes", midia:"Artes",
  c1_gravacao:"Dia de gravação", c1_gravacaoMarcar:"Marcar gravação", c1_roteiro:"Roteiro",
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
  if(typeof reiniciarOcioso==="function") reiniciarOcioso();

  const as=areasDe(); if(as.indexOf(VISTA.area)<0) VISTA.area=as[0]||"mkt";
  VISTA.escopo=null; VISTA.modo="cards"; VISTA.filtro=null;
  aplicarRota();                                  /* abriu com endereço de uma tela? vai direto para ela */
  const as2=areasDe(); if(as2.indexOf(VISTA.area)<0) VISTA.area=as2[0]||"mkt";
  render();
}
function tentarEntrar(nome){
  const p=(ESTADO.pessoas||[]).find(x=>x.nome===nome);
  if(p && p.pin){ VISTA.pinPara=nome; render(); return; }
  entrar(nome);
}
function sair(){ USUARIO=null; VISTA.pinPara=null; fecharModal(); render(); }

/* sai sozinho depois de um tempo parado (evita ficar aberto na mesa de alguém) */
const OCIOSO_MIN=30;
let ocioso=null;
function reiniciarOcioso(){
  if(!USUARIO) return;
  clearTimeout(ocioso);
  ocioso=setTimeout(()=>{ if(USUARIO){ toast("Sessão encerrada por inatividade",false); sair(); } }, OCIOSO_MIN*60*1000);
}
["click","keydown","mousemove","touchstart"].forEach(ev=>document.addEventListener(ev,()=>{ if(USUARIO) reiniciarOcioso(); },{passive:true}));
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
function atrasosHistoricos(){
  const alvo = VISTA.escopo ? CLIENTES.filter(c=>c.id===VISTA.escopo) : CLIENTES;
  const out=[];
  alvo.forEach(c=>{
    /* etapas oficiais com data real (consumadas) */
    atrasos(c).forEach(a=>{
      if(a.previsto || !a.limite) return;
      out.push({mes:a.limite.slice(0,7), quem:a.quem, dias:a.dias, cliente:c.nome,
                etapa:a.etapa, justificado:!!a.justificado});
    });
    /* qualquer tarefa concluída fora do prazo */
    TODAS.filter(t=>t.clienteId===c.id && t.st.k==="ok" && t.st.atraso>0 && t.data && areaMatch(t))
      .forEach(t=>out.push({mes:t.data.slice(0,7), quem:(t.resp==="Cliente"?"Cliente":"MK3"),
                dias:t.st.atraso, cliente:c.nome, etapa:t.tarefa, justificado:false}));
  });
  /* remove duplicidade (mesma etapa/mês/cliente) */
  const vis=new Set(); const fim=[];
  out.forEach(a=>{ const k=a.cliente+"|"+a.etapa+"|"+a.mes; if(vis.has(k))return; vis.add(k); fim.push(a); });
  return fim;
}
function tendenciaHTML(){
  const H=atrasosHistoricos().filter(a=>!a.justificado);
  const emAberto=TODAS.filter(t=>t.st.k==="atrasado" && areaMatch(t) && (!VISTA.escopo||t.clienteId===VISTA.escopo));
  /* últimos 6 meses até o atual */
  const meses=[]; const base=new Date(HOJE.getFullYear(),HOJE.getMonth(),1);
  for(let i=5;i>=0;i--){ const d0=new Date(base.getFullYear(),base.getMonth()-i,1);
    meses.push(iso(d0).slice(0,7)); }
  const dados=meses.map(ms=>{
    const doMes=H.filter(a=>a.mes===ms);
    const mk3=doMes.filter(a=>a.quem==="MK3").reduce((s,a)=>s+a.dias,0);
    const cli=doMes.filter(a=>a.quem==="Cliente").reduce((s,a)=>s+a.dias,0);
    return {ms, mk3, cli, n:doMes.length};
  });
  const topo=Math.max(1,...dados.map(x=>Math.max(x.mk3,x.cli)));
  const nomeMes=ms=>{const [a,b]=ms.split("-");return new Date(a,b-1,1).toLocaleDateString("pt-BR",{month:"short"}).replace(".","");};
  const atual=dados[dados.length-1], ant=dados[dados.length-2]||{mk3:0,cli:0};
  const varia=(hoje,antes)=>{ if(!antes&&!hoje) return {txt:"sem atrasos",cls:"n"};
    if(!antes) return {txt:"+"+hoje+"d vs mês anterior",cls:"pior"};
    const p=Math.round((hoje-antes)/antes*100);
    if(p===0) return {txt:"igual ao mês anterior",cls:"n"};
    return {txt:(p>0?"+":"")+p+"% vs mês anterior",cls:p>0?"pior":"melhor"}; };
  const vM=varia(atual.mk3,ant.mk3), vC=varia(atual.cli,ant.cli);

  /* ranking por cliente (6 meses) */
  const porCli={};
  H.filter(a=>meses.indexOf(a.mes)>=0).forEach(a=>{
    porCli[a.cliente]=porCli[a.cliente]||{mk3:0,cli:0};
    porCli[a.cliente][a.quem==="MK3"?"mk3":"cli"]+=a.dias;
  });
  const rank=Object.entries(porCli).map(([n,v])=>({n,...v,tot:v.mk3+v.cli})).sort((a,b)=>b.tot-a.tot);

  const barras=dados.map(x=>{
    const hM=Math.round(x.mk3/topo*100), hC=Math.round(x.cli/topo*100);
    return '<div class="tg-col'+(x.ms===iso(HOJE).slice(0,7)?" atual":"")+'">'+
      '<div class="tg-bars">'+
        '<span class="tg-b mk3" style="height:'+hM+'%" title="MK3: '+x.mk3+' dias úteis">'+(x.mk3?'<i>'+x.mk3+'</i>':'')+'</span>'+
        '<span class="tg-b cli" style="height:'+hC+'%" title="Cliente: '+x.cli+' dias úteis">'+(x.cli?'<i>'+x.cli+'</i>':'')+'</span>'+
      '</div>'+
      '<span class="tg-m">'+nomeMes(x.ms)+'</span></div>';
  }).join("");

  const semDados = H.length===0;
  return '<div class="tend">'+
    (semDados?'<div class="vaziox"><h4>Ainda sem histórico de atraso</h4>'+
      '<p>O gráfico se preenche conforme as etapas forem concluídas com data. Sempre que você marcar "concluído em tal dia" ou registrar a resposta do cliente, o atraso entra aqui.</p>'+
      '<button data-view="prio">Ir para as prioridades</button></div>':'')+
    '<div class="tend-topo">'+
      '<div class="tend-kpi"><span class="k-r">Atraso da MK3 · mês atual</span><b class="mk3">'+atual.mk3+'<small>dias úteis</small></b>'+
        '<span class="k-v '+vM.cls+'">'+esc(vM.txt)+'</span></div>'+
      '<div class="tend-kpi"><span class="k-r">Atraso do cliente · mês atual</span><b class="cli">'+atual.cli+'<small>dias úteis</small></b>'+
        '<span class="k-v '+vC.cls+'">'+esc(vC.txt)+'</span></div>'+
      '<div class="tend-kpi"><span class="k-r">Em aberto agora</span><b class="ab">'+emAberto.length+'<small>tarefas atrasadas</small></b>'+
        '<span class="k-v n">precisam de ação</span></div>'+
    '</div>'+
    '<div class="tend-cx"><div class="tend-h">Últimos 6 meses <span class="leg"><i class="mk3"></i>MK3 <i class="cli"></i>Cliente</span></div>'+
      '<div class="tg">'+barras+'</div></div>'+
    (rank.length
      ? '<div class="tend-cx"><div class="tend-h">Por cliente (6 meses)</div>'+
        rank.map(r=>{
          const t=Math.max(1,rank[0].tot);
          return '<div class="rk"><span class="rk-n">'+esc(r.n)+'</span>'+
            '<span class="rk-bar"><i class="mk3" style="width:'+Math.round(r.mk3/t*100)+'%"></i>'+
            '<i class="cli" style="width:'+Math.round(r.cli/t*100)+'%"></i></span>'+
            '<span class="rk-v">'+r.tot+'d</span></div>';
        }).join("")+'</div>'
      : '')+
    '<p class="tend-nota">Conta apenas atrasos já consumados (etapa entregue ou respondida fora do prazo), em dias úteis. '+
    'Atrasos justificados ficam de fora. Entregas são responsabilidade da MK3; aprovações, do cliente.</p>'+
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
    const reais=TODAS.filter(t=>t.data===dayIso && relevanteBoard(t))
      .sort((a,b)=> (ORDEM[a.st.k]??9)-(ORDEM[b.st.k]??9) || a.clienteId.localeCompare(b.clienteId));
    const dups=(ESTADO.dup||[]).filter(e=>e.dia===dayIso)
      .map(e=>({t:TODAS.find(x=>x.clienteId===e.cid&&x.id===e.tid),orig:e.orig}))
      .filter(o=>o.t && relevanteBoard(o.t));   /* a cópia respeita a área, como a original */
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
    cols+='<div class="bcol'+(dayIso===hojeIso?" hoje":"")+'" data-daycol="'+dayIso+'"><div class="bcol-h"><span>'+dias[i]+(cs.length?'<span class="bcount">'+cs.length+'</span>':'')+'</span><span class="bcol-hr">'+fmt(dayIso).slice(0,5)+(ehAdmin()?'<button class="bcol-add" data-demanda="1" data-demdia="'+dayIso+'" title="Nova demanda neste dia" aria-label="Nova demanda">+</button>':'')+'</span></div><div class="bcol-body">'+body+'</div>'+notaEl+'</div>';
  }
  const rotArea={all:"Todas as áreas",mkt:"Marketing Digital",fin:"Financeiro",com:"Comercial"}[VISTA.area]||"";
  return '<div class="semsel"><span class="semsel-l">Semana:</span>'+selAno+selMes+selSem+
           '</div>'+
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
  const A={all:"Visão geral · todas as áreas",mkt:"Marketing Digital",fin:"Financeiro",com:"Comercial"};
  const V={cards:"Clientes",prio:"Tarefas",equipe:"Funcionários",cal:"Agenda",lista:"Dashboard",tend:"Tendência de atrasos"};
  const AB={cal:"Calendário",tarefas:"Tarefas",tend:"Tendência",hist:"Histórico"};
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
function animar(){
  const el=document.getElementById("view"); if(!el) return;
  const reduz = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* números contando */
  el.querySelectorAll("[data-num]").forEach(n=>{
    const alvo=+n.getAttribute("data-num")||0;
    const fmtN=v=>Number(v).toLocaleString("pt-BR");
    if(reduz || alvo<=0){ n.textContent=fmtN(alvo); return; }
    const dur=Math.min(900, 260+Math.min(alvo,40)*18); const ini=performance.now();
    const passo=t=>{ const p=Math.min(1,(t-ini)/dur);
      n.textContent=fmtN(Math.round(alvo*(1-Math.pow(1-p,3))));
      if(p<1) requestAnimationFrame(passo); };
    requestAnimationFrame(passo);
  });
  /* barras e anel crescendo */
  requestAnimationFrame(()=>{
    el.querySelectorAll("[data-alt]").forEach(b=>{ b.style.height=b.getAttribute("data-alt")+"%"; });
    el.querySelectorAll("[data-larg]").forEach(b=>{ b.style.width=b.getAttribute("data-larg")+"%"; });
    el.querySelectorAll("[data-arco]").forEach(a=>{ a.style.strokeDashoffset=a.getAttribute("data-arco"); });
  });
}
function render(){
  if(!USUARIO){
    $("ctx").innerHTML=''; $("editbar").innerHTML=''; $("side").innerHTML=''; $("areabar").innerHTML='';
    $("view").innerHTML = loginHTML(VISTA.pinPara);
    const pi=document.getElementById("pinInput"); if(pi&&pi.focus) setTimeout(()=>pi.focus(),30);
    return;
  }
  $("ctx").innerHTML = tituloContexto();
  $("editbar").innerHTML =
    '<button class="ubtn" data-undo="1"'+(UNDO.length?"":" disabled")+' title="Desfazer">&#8624; Desfazer</button>'+
    '<button class="ubtn" data-redo="1"'+(REDO.length?"":" disabled")+' title="Refazer">&#8625; Refazer</button>'+
    (ehAdmin()?'<button class="ubtn rec" data-recado="1" title="Texto pronto para o grupo">&#9998; Recado do dia</button>':'')+
    ((ehAdmin()&&nExcluidas())?'<button class="ubtn" data-lixeira="1" title="Ver tarefas excluídas">&#128465; '+nExcluidas()+' excluída'+(nExcluidas()>1?'s':'')+'</button>':'')+
    '<span class="salvo" id="salvo" aria-live="polite"></span>'+
    '<span class="syncst" id="syncst" title="Sincronização entre a equipe"></span>'+
    (agendaUrl()?'<span class="agviva" id="agviva">agenda ao vivo</span>':'')+
    (nMud()?'<span class="umud">'+nMud()+' '+(nMud()>1?"tarefas marcadas":"tarefa marcada")+' por você · salvo neste navegador</span>'
           :'<span class="umud dim">Clique numa tarefa para marcar. Atalhos: <span class="kbd">?</span></span>');
  $("side").innerHTML = sidebarHTML();
  $("areabar").innerHTML = areasTopoHTML();
  posicionarPill();

  const c = VISTA.escopo ? cliente(VISTA.escopo) : null;

  if(!c){
    let body;
    if((VISTA.modo==="tend"||VISTA.modo==="equipe") && !ehAdmin()) VISTA.modo="lista";
    if(VISTA.modo==="equipe")     body = funcionariosHTML();
    else if(VISTA.modo==="tend")  body = tendenciaHTML();
    else if(VISTA.modo==="prio")  body = prioridadesHTML();
    else if(VISTA.modo==="cards") body = '<div class="cards">'+cardsHTML()+'</div>';
    else if(VISTA.modo==="cal")   body = calendario(tarefasArea(), marcosDaArea(CLIENTES.flatMap(x=>x.marcos)), true);
    else                          body = listaGlobalHTML();
    $("view").innerHTML = body; animar(); gravarRota();
    return;
  }

  const cor = coresDe(c);
  const tabs = [["cal","Calendário"],["tarefas","Tarefas"],["marca","Marca"],["tend","Tendência"],["hist","Histórico"]]
    .filter(t=>t[0]!=="tend" || ehAdmin());
  const bar =
    '<div class="cli-bar"><a class="voltar" href="'+rotaDe({escopo:null,modo:"cards"})+'" data-nav="home">&larr; Todos os clientes</a>'+
    '<div class="cli-title">'+avatarHTML(c,"cli-av2")+
      '<strong>'+esc(c.nome)+'</strong></div>'+linksHTML(c,"topo")+
    '<div class="cli-tabs">'+tabs.map(t=>
      '<a class="'+(VISTA.aba===t[0]?"on":"")+'" href="'+rotaDe({aba:t[0]})+'" data-cliaba="'+t[0]+'">'+t[1]+'</a>').join("")+'</div></div>';

  const body = VISTA.aba==="cal" ? calendario(tarefasCli(c), marcosDaArea(c.marcos), false)
             : VISTA.aba==="marca" ? fichaHTML(c)
             : VISTA.aba==="tarefas" ? (onboardingHTML(c)+tarefasHTML(c))
             : (VISTA.aba==="tend" && ehAdmin()) ? tendenciaHTML()
             : histHTML(c);
  $("view").innerHTML = bar + body; animar(); gravarRota();
}


/* ---------------- ROTAS (endereço da página) ----------------
   Permite ctrl+clique / clique do meio abrir em outra aba, e o voltar do navegador funcionar. */
let ROTA_APLICANDO=false;
function rotaAtual(){
  const a = VISTA.area && VISTA.area!=="all" ? "/"+VISTA.area : "";
  if(VISTA.escopo) return "#/cliente/"+encodeURIComponent(VISTA.escopo)+"/"+(VISTA.aba||"cal")+a;
  return "#/"+(VISTA.modo||"cards")+a;
}
function rotaDe(op){
  const v = {modo:VISTA.modo, area:VISTA.area, escopo:VISTA.escopo, aba:VISTA.aba, ...op};
  const a = v.area && v.area!=="all" ? "/"+v.area : "";
  if(v.escopo) return "#/cliente/"+encodeURIComponent(v.escopo)+"/"+(v.aba||"cal")+a;
  return "#/"+(v.modo||"cards")+a;
}
function gravarRota(){
  if(ROTA_APLICANDO || !USUARIO) return;
  const r=rotaAtual();
  if(location.hash===r) return;
  ROTA_APLICANDO=true;
  /* primeira tela depois do login só ajusta o endereço; as seguintes viram histórico,
     para o voltar e o avançar do navegador andarem dentro do painel */
  try{ if(!location.hash) history.replaceState(null,"",r); else history.pushState(null,"",r); }
  catch(e){ location.hash=r.slice(1); }
  ROTA_APLICANDO=false;
}
window.addEventListener("popstate", ()=>{
  if(!USUARIO) return;
  if(aplicarRota()){ VISTA.filtro=null; VISTA.dia=null; VISTA.verTudo=false; ROTA_APLICANDO=true; render(); ROTA_APLICANDO=false; }
});
function aplicarRota(){
  const h=(location.hash||"").replace(/^#\/?/,"");
  if(!h) return false;
  const p=h.split("/").filter(Boolean).map(decodeURIComponent);
  const areas=["all","mkt","fin","com"];
  const modos=["cards","prio","equipe","lista","cal","tend"];
  const abas=["cal","tarefas","marca","tend","hist"];
  let mudou=false;
  if(p[0]==="cliente" && p[1]){
    if(cliente(p[1])){ VISTA.escopo=p[1]; mudou=true;
      if(p[2] && abas.indexOf(p[2])>=0) VISTA.aba=p[2];
      if(p[3] && areas.indexOf(p[3])>=0 && podeArea(p[3])) VISTA.area=p[3];
    }
  } else if(p[0] && modos.indexOf(p[0])>=0){
    VISTA.escopo=null; VISTA.modo=p[0]; mudou=true;
    if(p[1] && areas.indexOf(p[1])>=0 && podeArea(p[1])) VISTA.area=p[1];
  }
  if((VISTA.modo==="tend"||VISTA.modo==="equipe") && !ehAdmin()) VISTA.modo="lista";
  if(VISTA.aba==="tend" && !ehAdmin()) VISTA.aba="cal";
  return mudou;
}
window.addEventListener("hashchange", ()=>{
  if(ROTA_APLICANDO || !USUARIO) return;
  if(aplicarRota()){ VISTA.filtro=null; VISTA.dia=null; VISTA.verTudo=false; render(); }
});
/* ctrl/cmd/shift+clique e clique do meio: deixa o navegador abrir em outra aba */
const novaAba = ev => ev.metaKey||ev.ctrlKey||ev.shiftKey||ev.button===1;

/* ---------------- CLIQUES ---------------- */
document.addEventListener("click", function(ev){
  const alvo = ev.target.closest("[data-area],[data-modo],[data-cliente],[data-cliaba],[data-nav],[data-mes],[data-dia],[data-bucket],[data-editar],[data-macao],[data-undo],[data-redo],[data-wkok],[data-wkx],[data-nota],[data-vermotivo],[data-view],[data-area],[data-side],[data-dropx],[data-demanda],[data-demx],[data-demobs],[data-demedit],[data-obst],[data-editarobst],[data-parcial],[data-delt],[data-excl],[data-rename],[data-restaurar],[data-lixeira],[data-clientes],[data-clied],[data-clinovo],[data-cliocultar],[data-clirestaurar],[data-veobs],[data-editarmotivo],[data-editarobs],[data-equipe],[data-trocarfoto],[data-pessoax],[data-rowok],[data-mover],[data-atrasadas],[data-portais],[data-recado],[data-abrir],[data-ficha],[data-irmes],[data-agenda],[data-atribuir],[data-compromisso],[data-avisar],[data-resp],[data-copiar],[data-novolink],[data-permb],[data-mesmover],[data-removedup],[data-motivo],[data-entrar],[data-pinok],[data-pincancel],[data-sair],[data-toastundo],[data-vertudo],[data-limpafiltro]");
  if(!alvo) return;
  if(alvo.tagName==="A" && alvo.getAttribute("href") && novaAba(ev)) return;   /* abrir em outra aba */
  if(alvo.tagName==="A") ev.preventDefault();
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
  if(D.vermotivo){ abrirMotivoLeitura(D.mcid,D.mtid,D.mday); return; }
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
  if(D.motivo){ semPular(()=>abrirMotivo(D.mcid,D.mtid,D.mday,D.motivo)); return; }
  if(D.removedup){ semPular(()=>{ removeDup(D.mcid,D.mtid,D.mday); abrirMover(D.mcid,D.mtid,null,D.mday.slice(0,7)); }); toast("Cópia removida",true); return; }
  if(D.mesmover){ semPular(()=>abrirMover(D.mcid,D.mtid,D.mday||null,D.mesmover)); return; }
  if(D.permb){
    const p=(ESTADO.pessoas||[]).find(x=>x.nome===D.pnome); if(!p) return;
    const atual = D.permb==="admin" ? !!p.admin : ((p.areas||[]).indexOf(D.permb)>=0);
    setPerm(D.pnome, D.permb, !atual); return;
  }
  if(D.portais){ abrirPortais(); return; }
  if(D.recado){ abrirRecado(); return; }
  if(D.agenda){ abrirAgendaConfig(); return; }
  if(D.compromisso){ abrirCompromisso(VISTA.dia||null); return; }
  if(D.resp!==undefined && alvo.classList.contains("cp-p")){ ev.preventDefault();
    if(alvo.classList.contains("on")) alvo.classList.remove("on"); else alvo.classList.add("on"); return; }
  if(D.avisar){ ev.preventDefault(); const el=$("cpAvisar");
    if(el){ const on=el.classList.contains("on");
      if(on) el.classList.remove("on"); else el.classList.add("on");
      el.setAttribute("aria-checked", String(!on)); } return; }
  if(D.atribuir){ return; }   /* o select responde no change, não no clique */
  if(D.abrir){ ev.preventDefault(); ev.stopPropagation(); window.open(D.abrir,"_blank","noopener"); return; }
  if(D.ficha){ abrirFicha(D.ficha); return; }
  if(D.novolink){ trocarLink(D.novolink); return; }
  if(D.copiar){
    const txt=D.copiar;
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(()=>toast("Link copiado",false),()=>{});
    else { const i=document.createElement("textarea"); i.value=txt; document.body.appendChild(i); i.select(); try{document.execCommand("copy");}catch(e){} i.remove(); toast("Link copiado",false); }
    return;
  }
  if(D.trocarfoto){ fotoAlvo=D.trocarfoto; const fi=$("fotoInput"); if(fi){ fi.value=""; fi.click(); } return; }
  if(D.pessoax){ semPular(()=>{ removePessoa(D.pessoax); abrirEquipe(); }); return; }
  if(D.demx){ semPular(()=>{ removeDemanda(D.demx); abrirDemanda(); }); return; }
  if(D.demobs){ abrirObsDemanda(D.demobs, true); return; }
  if(D.demedit){ abrirEditarDemanda(D.demedit); return; }
  if(D.rename){ const p=D.rename.split("|"); abrirRenomear(p[0],p[1]); return; }
  if(D.delt){ const p=D.delt.split("|"); confirmarExcluir(p[0],p[1]); return; }
  if(D.excl){ const p=D.excl.split("|"); excluirTarefa(p[0],p[1]); fecharModal(); return; }
  if(D.restaurar){ const p=D.restaurar.split("|"); restaurarTarefa(p[0],p[1]); return; }
  if(D.lixeira){ abrirExcluidas(); return; }
  if(D.clientes){ abrirClientes(); return; }
  if(D.clied){ abrirClienteForm(D.clied); return; }
  if(D.clinovo){ abrirClienteForm(null); return; }
  if(D.cliocultar){ ocultarCliente(D.cliocultar,true); return; }
  if(D.clirestaurar){ ocultarCliente(D.clirestaurar,false); return; }
  if(D.obst){ const p=D.obst.split("|"); abrirObsTarefa(p[0],p[1],p[2]); return; }
  if(D.editarobst){ const p=D.editarobst.split("|"); abrirObsTarefa(p[0],p[1],p[2],true); return; }
  if(D.parcial){
    const p=D.parcial.split("|"); const o=obsInfo(p[0],p[1],p[2])||{txt:"",parcial:false};
    const txt=($("obsT")&&$("obsT").value)||o.txt||"";
    setObsTarefa(p[0],p[1],p[2],txt,!o.parcial);
    semPular(()=>abrirObsTarefa(p[0],p[1],p[2],true));
    return;
  }
  if(D.veobs){ abrirObsDemanda(D.veobs); return; }
  if(D.editarmotivo){ abrirMotivo(D.mcid,D.mtid,D.mday); return; }
  if(D.editarobs){ abrirObsDemanda(D.editarobs, true); return; }
  if(D.side==="toggle"){ VISTA.side=!VISTA.side; try{localStorage.setItem("mk3_side",VISTA.side?"1":"0");}catch(e){} const ap=$("app"); if(ap) ap.classList.toggle("side-col",VISTA.side); return; }
  if(D.view){ if((D.view==="tend"||D.view==="equipe") && !ehAdmin()) return; VISTA.escopo=null; VISTA.modo=D.view; VISTA.filtro=null; VISTA.dia=null; VISTA.verTudo=false; render(); window.scrollTo({top:0,behavior:"smooth"}); return; }
  if(D.area){ if(!podeArea(D.area)) return; if(VISTA.area===D.area) return;
    VISTA.area=D.area; VISTA.filtro=null; VISTA.dia=null; VISTA.verTudo=false;
    /* a área é só um filtro: mantém a seção e o cliente abertos */
    semPular(render); return; }
  if(D.editar){ abrirEditor(D.mcid, D.mtid); return; }
  if(D.undo){ desfazer(); return; }
  if(D.redo){ refazer(); return; }

  let topo = true;

  if(D.cliente){ VISTA.escopo=D.cliente; VISTA.aba="cal"; VISTA.mes=0; VISTA.dia=null; VISTA.filtro=null; }
  if(D.nav==="home"){ VISTA.escopo=null; VISTA.filtro=null; VISTA.dia=null; }
  if(D.cliaba){ if(D.cliaba==="tend" && !ehAdmin()) return; VISTA.aba=D.cliaba; VISTA.filtro=null; VISTA.dia=null; }
  if(D.irmes!==undefined){ VISTA.mes=Number(D.irmes); VISTA.dia=null; topo=false; }
  else if(D.mes!==undefined){ const nn=Number(D.mes); VISTA.mes=(nn===0)?0:VISTA.mes+nn; VISTA.dia=null; topo=false; }
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
function limparDragover(){ document.querySelectorAll(".bcol.dragover,.bcol.dragno").forEach(x=>{x.classList.remove("dragover");x.classList.remove("dragno");}); }
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
  if(!DRAG.moved){ DRAG.moved=true; DRAG.card.classList.add("dragging"); document.body.classList.add("arrastando"); DRAG.ghost.classList.add("on"); }
  DRAG.ghost.style.left=(e.clientX-DRAG.ox)+"px"; DRAG.ghost.style.top=(e.clientY-DRAG.oy)+"px";
  const el=document.elementFromPoint(e.clientX,e.clientY);
  const col=el&&el.closest?el.closest("[data-daycol]"):null;
  limparDragover();
  if(col){
    const p=DRAG.data.split("|");
    const t=TODAS.find(x=>x.clienteId===p[0]&&x.id===p[1]);
    const dia=col.getAttribute("data-daycol");
    col.classList.add(podeReplanejar(t,dia)?"dragover":"dragno");
  }
});
document.addEventListener("mouseup", function(e){
  if(!DRAG) return;
  const st=DRAG; DRAG=null;
  st.ghost.remove(); st.card.classList.remove("dragging"); document.body.classList.remove("arrastando"); limparDragover();
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
document.addEventListener("change", function(ev){
  const s=ev.target.closest("[data-atribuir]");
  if(s) atribuirEvento(s.dataset.atribuir, s.value);
});
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
        setFotoPessoa(fotoAlvo, cv.toDataURL("image/jpeg",0.82)); fotoAlvo=null; semPular(()=>abrirEquipe()); };
      img.src=rd.result; };
    rd.readAsDataURL(f);
  });
})();

init();
