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

/* ---- áreas (Visão Geral = tudo) ---- */
const AREAS = [{k:"all",rot:"Visão Geral"},{k:"mkt",rot:"Marketing Digital"},
               {k:"fin",rot:"Financeiro"},{k:"com",rot:"Comercial"}];
function areaBase(id){
  if(/^pag_/.test(id) || /^fotos_/.test(id)) return "fin";
  if(["fimContrato","entregaMateriais","renov","renovacao_atrasada"].includes(id)) return "com";
  return "mkt";
}
const areaMatch = t => VISTA.area==="all" || t.area===VISTA.area;

const VISTA  = { area:"all", escopo:null, aba:"cal", modo:"cards", mes:0, dia:null, filtro:null, edit:false };
const cliente = id => CLIENTES.find(c=>c.id===id);
const tarefasCli  = c => TODAS.filter(t=>t.clienteId===c.id && areaMatch(t));
const tarefasArea = () => TODAS.filter(areaMatch);

/* ================= ESTADO EDITÁVEL (grava no GitHub) ================= */
let TODAS = [];
let ESTADO = { concluidas:{}, datas:{}, log:[] };
const ORIG = JSON.parse(JSON.stringify(CLIENTES));
const CAMPOS_DATA = ["envioPlanejamento","aprovacaoPlanejamento","envioMidia","aprovacaoMidia","gravacao","alteracaoPedida"];

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
}

const tokenGet=()=>localStorage.getItem("mk3_ghtoken")||"";
function pedirToken(){
  const t=prompt("Cole seu token do GitHub (fine-grained, permissão Contents: Read and write no repositório painel-mk3). Fica salvo só neste navegador.");
  if(t && t.trim()){ localStorage.setItem("mk3_ghtoken", t.trim()); return true; }
  return false;
}
async function salvarEstado(msg){
  const tk=tokenGet(); if(!tk) return false;
  const api="https://api.github.com/repos/aagenciamk3-a11y/painel-mk3/contents/estado.json";
  let sha=null;
  try{ const cur=await fetch(api+"?ts="+Date.now(),{headers:{Authorization:"Bearer "+tk,Accept:"application/vnd.github+json"}}).then(r=>r.json()); sha=cur.sha||null; }catch(e){}
  ESTADO.log=(ESTADO.log||[]).slice(0,200);
  const content=btoa(unescape(encodeURIComponent(JSON.stringify(ESTADO,null,2))));
  try{
    const r=await fetch(api,{method:"PUT",headers:{Authorization:"Bearer "+tk,Accept:"application/vnd.github+json","Content-Type":"application/json"},
      body:JSON.stringify({message:msg, content, sha})});
    return r.ok;
  }catch(e){ return false; }
}
function setConcluida(cid,tid,data){
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid); const nome=t?t.tarefa:tid;
  ESTADO.concluidas[cid]=(ESTADO.concluidas[cid]||[]).filter(e=>e.id!==tid);
  if(data){ ESTADO.concluidas[cid].push({id:tid,data:data});
    ESTADO.log.unshift({ts:new Date().toISOString(),cliente:cid,nome:nome,acao:"concluir",id:tid,data:data}); }
  else { ESTADO.concluidas[cid].push({id:tid,remove:true});
    ESTADO.log.unshift({ts:new Date().toISOString(),cliente:cid,nome:nome,acao:"desfazer",id:tid}); }
}
function abrirEditor(cid,tid){
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid); if(!t) return;
  const feita=t.st.k==="ok"; const cli=cliente(cid);
  const mm=$("modal");
  mm.innerHTML='<div class="mbox">'+
    '<h3>'+esc(t.tarefa)+'</h3>'+
    '<p class="msub">'+esc(cli.nome)+(t.detalhe?" · "+esc(t.detalhe):"")+'</p>'+
    (feita
      ? '<p class="mok">Já está concluída'+(t.st.quando?" em "+fmt(t.st.quando):"")+'.</p>'+
        '<div class="mbtns"><button data-macao="desfazer" data-mcid="'+cid+'" data-mtid="'+esc(tid)+'">Desfazer</button>'+
        '<button class="sec" data-macao="fechar">Cancelar</button></div>'
      : '<label class="mlab">Concluído na data<input type="date" id="mdata" value="'+iso(HOJE)+'"></label>'+
        '<div class="mbtns"><button data-macao="concluir" data-mcid="'+cid+'" data-mtid="'+esc(tid)+'">Salvar</button>'+
        '<button class="sec" data-macao="fechar">Cancelar</button></div>')+
    '</div>';
  mm.style.display="flex";
}
function fecharModal(){ const mm=$("modal"); mm.style.display="none"; mm.innerHTML=""; }
async function handleModal(D){
  if(D.macao==="fechar"){ fecharModal(); return; }
  const cid=D.mcid, tid=D.mtid;
  if(D.macao==="concluir"){ const dv=($("mdata")&&$("mdata").value)||iso(HOJE); setConcluida(cid,tid,dv); }
  else if(D.macao==="desfazer"){ setConcluida(cid,tid,null); }
  fecharModal(); rebuild(); render();
  const ok=await salvarEstado("painel: "+D.macao+" "+cid+"/"+tid);
  if(!ok){ alert("Não consegui salvar no GitHub. Verifique o token (botão Trocar token). A mudança está só na tela."); }
}
async function init(){
  try{ const r=await fetch("estado.json?ts="+Date.now()); if(r.ok){ const j=await r.json(); ESTADO={concluidas:{},datas:{},log:[],...j}; } }catch(e){}
  rebuild(); render();
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
const iniciais = n => (n||"?").trim().split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase();

const FOTO = {
  cynthia:"fotos/cynthia.jpg", suelem:"fotos/suelem.jpg", leonardo:"fotos/leonardo.jpg",
  oceanus:"fotos/oceanus.jpg", adriana:"fotos/dinha.jpg"
};
function avatarHTML(c, cls){
  const cor=coresSeg(c.segmento), f=FOTO[c.id];
  return '<div class="'+cls+'" style="background:'+cor[1]+'">'+esc(iniciais(c.nome))+
    (f?'<img src="'+f+'" alt="" loading="lazy" onerror="this.remove()">':'')+'</div>';
}

/* ---- linha de tarefa (lista) ---- */
const linha = (t, showCli) => '<div class="row'+(showCli?" rowc":"")+(VISTA.edit?" editavel":"")+'"'+(VISTA.edit?(' data-editar="1" data-mcid="'+t.clienteId+'" data-mtid="'+esc(t.id)+'"'):"")+'>'+
  '<div class="tag t-'+t.st.k+(t.st.atraso?' okatraso':'')+'">'+t.st.txt+'</div>'+
  '<div class="tarefa">'+esc(t.tarefa)+(t.detalhe?'<em>'+esc(t.detalhe)+'</em>':'')+'</div>'+
  (showCli?'<div class="cli">'+esc(t.cliente)+'</div>':'')+
  '<div class="data">'+fmt(t.data)+' <span class="dow">'+dow(t.data)+'</span></div>'+
  '<div class="resp">'+esc(t.resp)+'</div></div>';

/* ---- bloco de evento no calendário (estilo referência) ---- */
function evCard(t, showCli, isMarco){
  const cls  = isMarco ? "marco" : t.st.k;
  const meta = isMarco ? "Marco" : (showCli ? t.cliente : t.resp);
  const tt   = (isMarco?"◆ ":"")+esc(t.tarefa || t.titulo);
  return '<div class="ev ev-'+cls+'" title="'+esc(t.tarefa||t.titulo)+'">'+
    '<div class="ev-tt">'+tt+'</div>'+
    '<div class="ev-meta"><span class="ev-dot"></span>'+esc(meta)+'</div></div>';
}

/* ---------------- CARDS DE CLIENTE ---------------- */
function cardsHTML(){
  return CLIENTES.map(c=>{
    const ts = tarefasCli(c);
    const n  = ks => ts.filter(t=>ks.includes(t.st.k)).length;
    const cor = coresSeg(c.segmento);
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
    const cls  = ["cel", fora?"fora":"", fds?"fds":"", s===hojeIso?"hj":"", s===VISTA.dia?"sel":""].filter(Boolean).join(" ");
    const teto = 3;
    let evsHtml = mk.slice(0,1).map(m=>evCard(m,false,true)).join("");
    evsHtml += evs.slice(0, teto - (mk.length?1:0)).map(t=>evCard(t,showCli,false)).join("");
    const total = evs.length + mk.length;
    const mostrados = Math.min(evs.length, teto-(mk.length?1:0)) + Math.min(mk.length,1);
    const resto = total - mostrados;
    const extra = resto>0 ? '<div class="mais">+'+resto+' '+(resto===1?"item":"itens")+'</div>' : "";
    cells += '<div class="'+cls+'" data-dia="'+s+'"><div class="n">'+dt.getDate()+'</div>'+evsHtml+extra+'</div>';
  }

  let dayList="";
  if(VISTA.dia){
    const evs = base.filter(t=>t.data===VISTA.dia).sort((a,b)=>ORDEM[a.st.k]-ORDEM[b.st.k]);
    const titulo = d(VISTA.dia).toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"});
    dayList = '<div class="calDia"><h2>'+titulo+'</h2>'+(evs.length
      ? '<div class="fila">'+evs.map(t=>linha(t,showCli)).join("")+'</div>'
      : '<div class="vazio">Nenhuma tarefa neste dia.</div>')+'</div>';
  }

  return '<div class="cal-nav"><button data-mes="-1">&lsaquo;</button>'+
      '<strong>'+ref.toLocaleDateString("pt-BR",{month:"long",year:"numeric"})+'</strong>'+
      '<button data-mes="1">&rsaquo;</button><button class="hj" data-mes="0">Hoje</button></div>'+
    '<div class="cal"><div class="cal-dow">'+
      '<div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div></div>'+
      '<div class="cal-grid">'+cells+'</div></div>'+dayList;
}

/* ---------------- LISTA GLOBAL (todos os clientes) ---------------- */
function listaGlobalHTML(){
  const ts = tarefasArea();
  const semaf = '<div class="semaforo">'+BUCKETS.map(k=>
    '<div class="sf '+k+' '+(VISTA.filtro===k?"on":"")+'" data-bucket="'+k+'">'+
    '<b>'+ts.filter(t=>t.st.k===k).length+'</b><small>'+ROTULO[k]+'</small></div>').join("")+'</div>';
  const lista = (VISTA.filtro ? ts.filter(t=>t.st.k===VISTA.filtro) : ts.filter(t=>t.st.k!=="ok"))
    .sort((a,b)=>ORDEM[a.st.k]-ORDEM[b.st.k] || String(a.data).localeCompare(String(b.data)));
  return semaf +
    '<h2>'+(VISTA.filtro?ROTULO[VISTA.filtro]:"Fila de execução")+' · todos os clientes</h2>'+
    (lista.length ? '<div class="fila">'+lista.map(t=>linha(t,true)).join("")+'</div>'
                  : '<div class="vazio">Nada aqui'+(VISTA.filtro?" em <strong>"+ROTULO[VISTA.filtro]+"</strong>":"")+'.</div>');
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
    (lista.length ? '<div class="fila">'+lista.map(t=>linha(t,false)).join("")+'</div>'
                  : '<div class="vazio">Nada aqui'+(VISTA.filtro?" em <strong>"+ROTULO[VISTA.filtro]+"</strong>":"")+'.</div>');

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

    const atr = atrasos(c).sort((a,b)=>b.dias-a.dias);
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
function render(){
  $("editbar").innerHTML = VISTA.edit
    ? '<button class="editbtn on" data-edit="toggle">● Edição ligada — clique para desligar</button>'+
      '<span class="edithint">Abra um cliente em <b>Tarefas</b> (ou clique num dia do calendário) e clique numa tarefa para marcar <b>Concluído</b>. Salva sozinho.</span>'+
      '<button class="editbtn sec" data-edit="token">Trocar token</button>'
    : '<button class="editbtn" data-edit="toggle">✎ Modo edição</button>';
  $("areas").innerHTML = AREAS.map(a=>
    '<button class="areabtn '+(VISTA.area===a.k?"on":"")+'" data-area="'+a.k+'">'+a.rot+'</button>').join("");

  const c = VISTA.escopo ? cliente(VISTA.escopo) : null;

  if(!c){
    const modos = [["cards","Cartões"],["cal","Calendário"],["lista","Lista"]];
    const toggle = '<div class="modos">'+modos.map(m=>
      '<button class="'+(VISTA.modo===m[0]?"on":"")+'" data-modo="'+m[0]+'">'+m[1]+'</button>').join("")+'</div>';
    let body;
    if(VISTA.modo==="cards")      body = '<div class="cards">'+cardsHTML()+'</div>';
    else if(VISTA.modo==="cal")   body = calendario(tarefasArea(), CLIENTES.flatMap(x=>x.marcos), true);
    else                          body = listaGlobalHTML();
    $("view").innerHTML = toggle + body;
    return;
  }

  const cor = coresSeg(c.segmento);
  const tabs = [["cal","Calendário"],["tarefas","Tarefas"],["hist","Histórico"]];
  const bar =
    '<div class="cli-bar"><button class="voltar" data-nav="home">&larr; Todos os clientes</button>'+
    '<div class="cli-title">'+avatarHTML(c,"cli-av2")+
      '<strong>'+esc(c.nome)+'</strong></div>'+
    '<div class="cli-tabs">'+tabs.map(t=>
      '<button class="'+(VISTA.aba===t[0]?"on":"")+'" data-cliaba="'+t[0]+'">'+t[1]+'</button>').join("")+'</div></div>';

  const body = VISTA.aba==="cal" ? calendario(tarefasCli(c), c.marcos, false)
             : VISTA.aba==="tarefas" ? tarefasHTML(c)
             : histHTML(c);
  $("view").innerHTML = bar + body;
}

/* ---------------- CLIQUES ---------------- */
document.addEventListener("click", function(ev){
  const alvo = ev.target.closest("[data-area],[data-modo],[data-cliente],[data-cliaba],[data-nav],[data-mes],[data-dia],[data-bucket],[data-edit],[data-editar],[data-macao]");
  if(!alvo) return;
  const D = alvo.dataset;

  if(D.macao){ handleModal(D); return; }
  if(D.editar && VISTA.edit){ abrirEditor(D.mcid, D.mtid); return; }
  if(D.edit==="token"){ pedirToken(); return; }
  if(D.edit==="toggle"){ if(!VISTA.edit && !tokenGet()){ if(!pedirToken()) return; } VISTA.edit=!VISTA.edit; render(); return; }

  let topo = true;

  if(D.area){ VISTA.area=D.area; VISTA.filtro=null; VISTA.dia=null; }
  if(D.modo){ VISTA.modo=D.modo; VISTA.filtro=null; VISTA.dia=null; }
  if(D.cliente){ VISTA.escopo=D.cliente; VISTA.aba="cal"; VISTA.mes=0; VISTA.dia=null; VISTA.filtro=null; }
  if(D.nav==="home"){ VISTA.escopo=null; VISTA.filtro=null; VISTA.dia=null; }
  if(D.cliaba){ VISTA.aba=D.cliaba; VISTA.filtro=null; VISTA.dia=null; }
  if(D.mes!==undefined){ const nn=Number(D.mes); VISTA.mes=(nn===0)?0:VISTA.mes+nn; VISTA.dia=null; topo=false; }
  if(D.dia){ VISTA.dia=(VISTA.dia===D.dia)?null:D.dia; topo=false; }
  if(D.bucket){ VISTA.filtro=(VISTA.filtro===D.bucket)?null:D.bucket; topo=false; }

  render();
  if(topo) window.scrollTo({top:0,behavior:"smooth"});
});

init();
