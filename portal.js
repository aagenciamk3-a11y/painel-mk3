/* Portal do cliente. A pagina e generica: tudo que aparece aqui chega
   pelo no painel/publico/<token> do Firebase. O token vem no endereco,
   depois do #, e nunca existe dentro do repositorio. */
let C = null, ORIGINAL = null, TAREFAS = [];
const CAMPOS_DATA = ["envioPlanejamento","aprovacaoPlanejamento","envioMidia","aprovacaoMidia","gravacao","alteracaoPedida"];
const $ = id => document.getElementById(id);
const escAttr = s => String(s==null?"":s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");
const esc = s => String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
let RESULTADOS=null, OBJETIVO="", META=null, RECADO="", PENDENCIAS=null, PLANO=null;
let LEADS=null, CRM=null;
let TEM_ESPELHO=false, FONTE=null, ULTIMO=null, DASH_ABERTO=false;
let ABA="geral", ABAS=["geral","trafego"];

function iniciar(base){
  if(!base || !base.id) return false;
  C = JSON.parse(JSON.stringify(base));
  ORIGINAL = JSON.parse(JSON.stringify(base));
  CLIENTE_ID = base.id;
  TAREFAS = regras(C).map(t=>({...t, st:status(t)}));
  return true;
}
/* aplica o que a MK3 marcou no painel */
function aplicarEstado(E){
  if(!C || !E) return;
  C.concluidas=(ORIGINAL.concluidas||[]).slice();
  CAMPOS_DATA.forEach(k=>C[k]=ORIGINAL[k]);
  const dd=(E.datas&&E.datas[CLIENTE_ID])||{};
  for(const k in dd){ if(dd[k]) C[k]=dd[k]; }
  for(const e of ((E.concluidas&&E.concluidas[CLIENTE_ID])||[])){
    C.concluidas=C.concluidas.filter(x=>((x&&x.id)?x.id:x)!==e.id);
    if(!e.remove) C.concluidas.push(e.data?{id:e.id,data:e.data}:e.id);
  }
  TAREFAS = regras(C).map(t=>({...t, st:status(t)}));
}
function aviso(titulo, texto){
  $("view").innerHTML='<section class="bloco"><h2>'+esc(titulo)+'</h2><p>'+esc(texto)+'</p></section>';
}
function expirado(){
  aviso("Link expirado","Este endereço foi substituído por um novo, por segurança. Peça o link atualizado à equipe da MK3.");
}
$("hoje").textContent = HOJE.toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});

/* ================== TRAFEGO PAGO ==================
   Os leads chegam da planilha do Meta pela ponte no Apps Script e ficam no
   Firebase. O que a equipe marca aqui (contato, venda, parceria) vive num no
   separado, para a proxima carga do Meta nunca sobrescrever o trabalho. */
const EMPRE = [
  [/pier\s*boulevard/i, "Pier Boulevard"],
  [/rio\s*marinho/i,    "Rio Marinho"],
  [/domingos\s*martins/i,"Domingos Martins"],
  [/fellini/i,          "Ed. Fellini"],
  [/casa\s*amarela/i,   "Casa Amarela"],
  [/ata(i|í)de/i,       "Ataíde"]
];
function empreendimentoDe(l){
  const txt=String((l&&l.anuncio)||"")+" "+String((l&&l.conjunto)||"");
  for(const e of EMPRE) if(e[0].test(txt)) return e[1];
  return "";
}
/* o telefone vem em quatro formatos diferentes da planilha; aqui vira um so */
function telLimpo(t){
  let n=String(t||"").replace(/^p:/,"").replace(/[^0-9]/g,"");
  if(!n) return "";
  if(n.length>=12 && n.slice(0,2)==="55") n=n.slice(2);
  if(n.length===10) n=n.slice(0,2)+"9"+n.slice(2);   /* fixo antigo de celular */
  if(n.length!==11) return n.length>=10?n:"";
  return n;
}
function telBonito(t){
  const n=telLimpo(t);
  if(n.length!==11) return String(t||"").replace(/^p:/,"") || "sem telefone";
  return "("+n.slice(0,2)+") "+n.slice(2,7)+"-"+n.slice(7);
}
function primeiroNome(nome){
  const p=String(nome||"").trim().split(/\s+/)[0]||"";
  return p ? p.charAt(0).toUpperCase()+p.slice(1).toLowerCase() : "";
}
function mensagemDe(l){
  const nome=primeiroNome(l.nome), emp=empreendimentoDe(l);
  const ola = nome ? ("Oi, "+nome+"! ") : "Oi! ";
  if(emp) return ola+"Aqui é a Suelem. Vi que você demonstrou interesse no "+emp+
    ". Posso te mandar os valores e as condições, e tirar qualquer dúvida?";
  return ola+"Aqui é a Suelem. Vi que você demonstrou interesse em um dos imóveis. "+
    "Posso te mandar os detalhes e tirar suas dúvidas?";
}
function linkZap(l){
  const n=telLimpo(l.tel);
  if(n.length!==11) return "";
  return "https://wa.me/55"+n+"?text="+encodeURIComponent(mensagemDe(l));
}
function listaLeads(){
  const m=LEADS||{};
  return Object.keys(m).map(k=>({...m[k], _id:k}))
    .filter(l=>l && l.nome && !l.teste)
    .sort((a,b)=>String(b.quando||"").localeCompare(String(a.quando||"")));
}
function crmDe(id){ return (CRM&&CRM[id])||{}; }
function ymDeData(iso0){ return String(iso0||"").slice(0,7); }
function contarTrafego(){
  const ym=ymDe(0), l=listaLeads();
  const noMes=x=>ymDeData(x.quando)===ym;
  const vend=x=>{ const c=crmDe(x._id); return !!c.venda; };
  const parc=x=>{ const c=crmDe(x._id); return !!c.parceria; };
  return {
    leadsMes:l.filter(noMes).length,       leadsTudo:l.length,
    contatoMes:l.filter(x=>noMes(x)&&crmDe(x._id).contato).length,
    contatoTudo:l.filter(x=>crmDe(x._id).contato).length,
    vendaMes:l.filter(x=>noMes(x)&&vend(x)).length,   vendaTudo:l.filter(vend).length,
    parcMes:l.filter(x=>noMes(x)&&parc(x)).length,    parcTudo:l.filter(parc).length
  };
}
function cardLead(l){
  const c=crmDe(l._id), emp=empreendimentoDe(l), zap=linkZap(l);
  const quando=l.quando?fmt(String(l.quando).slice(0,10)):"";
  return '<div class="ld'+(c.contato?" feito":"")+(c.venda?" vendeu":"")+'">'+
    '<div class="ld-topo">'+
      '<div class="ld-id"><b>'+esc(l.nome||"sem nome")+'</b>'+
        '<span>'+esc(telBonito(l.tel))+(quando?' · '+quando:'')+'</span></div>'+
      (emp?'<span class="ld-emp">'+esc(emp)+'</span>':'')+
    '</div>'+
    (c.venda?'<div class="ld-selo v">Venda concluída</div>':'')+
    (c.parceria?'<div class="ld-selo p">Parceria concluída</div>':'')+
    '<div class="ld-acoes">'+
      (zap?'<a class="ld-zap" href="'+escAttr(zap)+'" target="_blank" rel="noopener">Chamar no WhatsApp</a>'
          :'<span class="ld-zap off" title="Telefone fora do padrão">Telefone inválido</span>')+
      '<button class="ld-chk'+(c.contato?" on":"")+'" data-contato="'+escAttr(l._id)+'">'+
        (c.contato?'&#10003; Falei com essa pessoa':'Entrei em contato?')+'</button>'+
      '<button class="ld-mais" data-fechar="'+escAttr(l._id)+'" title="Registrar venda ou parceria">&#8942;</button>'+
    '</div></div>';
}
function mesRotulo(ym){
  if(!ym || ym==="0000-00") return "Sem data";
  const d0=new Date(+ym.slice(0,4), +ym.slice(5,7)-1, 1);
  const s0=d0.toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
  return s0.charAt(0).toUpperCase()+s0.slice(1);
}
function grupoMes(ym, leads){
  const feitos=leads.filter(x=>crmDe(x._id).contato).length;
  return '<details class="gm"><summary class="gm-h">'+
    '<span class="gm-t">'+esc(mesRotulo(ym))+'</span>'+
    '<span class="gm-n">'+leads.length+' pessoa'+(leads.length>1?'s':'')+
    (feitos?' · '+feitos+' já atendida'+(feitos>1?'s':''):'')+'</span></summary>'+
    '<div class="ld-lista">'+leads.map(cardLead).join("")+'</div></details>';
}
function trafegoHTML(){
  if(LEADS===null) return '<section class="bloco"><h2>Tráfego pago</h2><p>Carregando os leads…</p></section>';
  const l=listaLeads(), n=contarTrafego(), ym=ymDe(0);
  const num=(a,b,rot,cls)=>'<div class="tp-n '+cls+'"><b>'+a+'</b><i>'+rot+'</i><span>'+b+' no total</span></div>';
  const topo='<section class="bloco"><h2>Tráfego pago</h2>'+
    '<p class="tp-sub">Cada pessoa aqui preencheu o formulário do anúncio. '+
    'Quanto mais rápido o contato, maior a chance de resposta.</p></section>';
  const contas='<section class="bloco"><h2>'+esc(mesRotulo(ym))+'</h2><div class="tp-nums">'+
    num(n.leadsMes,   n.leadsTudo,   "pessoas chegaram", "leads")+
    num(n.contatoMes, n.contatoTudo, "já foram atendidas","cont")+
    num(n.vendaMes,   n.vendaTudo,   "vendas concluídas","venda")+
    num(n.parcMes,    n.parcTudo,    "parcerias fechadas","parc")+
    '</div></section>';
  if(!l.length) return topo+contas+
    '<section class="bloco ok"><h2>Nenhum lead ainda</h2><p>Assim que alguém preencher o formulário do anúncio, aparece aqui na hora.</p></section>';

  /* o mês corrente fica aberto; os anteriores ficam dobrados, um por mês */
  const porMes={};
  l.forEach(x=>{ const m=ymDeData(x.quando)||"0000-00"; (porMes[m]=porMes[m]||[]).push(x); });
  const doMes=porMes[ym]||[];
  const atual='<section class="bloco"><h2>Chegaram este mês</h2>'+
    (doMes.length
      ? '<div class="ld-lista">'+doMes.map(cardLead).join("")+'</div>'
      : '<p class="dd-vazio">Nenhuma pessoa nova este mês ainda.</p>')+
    '</section>';
  const antigos=Object.keys(porMes).sort().reverse().filter(m=>m!==ym);
  const nAnt=l.length-doMes.length;
  const anteriores = antigos.length
    ? '<section class="bloco"><h2>Meses anteriores</h2>'+
      '<p class="tp-sub">'+nAnt+' pessoa'+(nAnt>1?'s':'')+' de antes. Clique no mês para abrir.</p>'+
      antigos.map(m=>grupoMes(m, porMes[m])).join("")+'</section>'
    : '';
  return topo+contas+atual+anteriores;
}
function abrirFechamento(id){
  const l=listaLeads().find(x=>x._id===id); if(!l) return;
  const c=crmDe(id);
  let cx=document.getElementById("diaModal");
  if(!cx){ cx=document.createElement("div"); cx.id="diaModal"; document.body.appendChild(cx); }
  cx.innerHTML='<div class="dd-fundo" data-fecharx="1"><div class="dd-box" role="dialog" aria-modal="true">'+
    '<div class="dd-h"><b>'+esc(l.nome||"Lead")+'</b><button data-fecharx="1" aria-label="Fechar">&times;</button></div>'+
    '<p class="dd-sub">'+esc(telBonito(l.tel))+(empreendimentoDe(l)?' · '+esc(empreendimentoDe(l)):'')+'</p>'+
    '<div class="fe-op">'+
      '<button class="fe-b'+(c.venda?" on":"")+'" data-marcar="'+escAttr(id)+'|venda">Venda concluída</button>'+
      '<button class="fe-b'+(c.parceria?" on":"")+'" data-marcar="'+escAttr(id)+'|parceria">Parceria concluída</button>'+
    '</div>'+
    '<p class="dd-nota">Clique de novo para desmarcar. Fica registrado para a MK3 e para você, na hora.</p>'+
    '</div></div>';
  document.body.classList.add("travado");
}
/* escreve so no proprio no do link, um lead por vez */
function gravarCRM(id, campo, valor){
  const antes=crmDe(id);
  CRM=CRM||{}; CRM[id]=Object.assign({}, antes);
  CRM[id][campo]=valor;
  CRM[id].por = valor ? "cliente" : (antes.por||"cliente");
  CRM[id].ts  = new Date().toISOString();
  desenhar();
  const u=(typeof MK3_DB!=="undefined"&&MK3_DB)
    ? MK3_DB+"/painel/publico/"+MEU_TOKEN+"/crm/"+encodeURIComponent(id)+".json" : null;
  if(!u) return;
  fetch(u,{method:"PATCH",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({[campo]:valor, por:CRM[id].por, ts:CRM[id].ts})})
    .catch(()=>{ /* sem rede: fica marcado na tela e a proxima leitura corrige */ });
}
function fecharModalLead(){
  const cx=document.getElementById("diaModal"); if(cx) cx.innerHTML="";
  document.body.classList.remove("travado");
}

/* ---- 1) o que está esperando o cliente ---- */
function pendentes(){
  /* o painel manda a lista pronta; sem espelho, calcula pelas mesmas regras */
  if(PENDENCIAS) return PENDENCIAS.slice();
  return contadores(C).map(x=>({tipo:x.tipo, enviado:x.enviado, vencimento:x.vencimento, dias:dias(x.vencimento)}));
}
function faltaVoce(){
  const p=pendentes();
  if(!p.length) return '';
  return '<section class="bloco falta"><h2>O que falta de voc\u00ea</h2>'+
    p.sort((a,b)=>String(a.vencimento).localeCompare(String(b.vencimento))).map(x=>{
      const n=(x.dias==null?dias(x.vencimento):x.dias);
      const urg = n<0?"atrasado":n===0?"hoje":n===1?"umdia":"ok";
      const quanto = n<0 ? "o prazo venceu, seguimos com a aprova\u00e7\u00e3o autom\u00e1tica"
                   : n===0 ? "vence hoje"
                   : n===1 ? "falta 1 dia \u00fatil"
                   : "faltam "+n+" dias \u00fateis";
      return '<div class="falta-row f-'+urg+'">'+
        '<div class="falta-n">'+(n<0?"!":Math.max(n,0))+'</div>'+
        '<div class="falta-t"><b>Aprovar '+esc(x.tipo)+'</b>'+
          '<span>Enviamos em '+fmt(x.enviado)+' \u00b7 '+quanto+'</span></div>'+
        '<div class="falta-d">at\u00e9 '+fmt(x.vencimento)+'</div></div>';
    }).join("")+
    '<p class="nota">Sem retorno at\u00e9 o prazo, seguimos com a aprova\u00e7\u00e3o autom\u00e1tica para n\u00e3o travar a produ\u00e7\u00e3o.</p></section>';
}
function esperando(){
  const ct = contadores(C);
  const tiposAprov = ct.map(x=>("aprova\u00e7\u00e3o de "+x.tipo).toLowerCase());
  const meus = TAREFAS.filter(t=>t.resp==="Cliente" && t.st.k!=="ok" && t.data &&
      tiposAprov.indexOf(String(t.tarefa).toLowerCase())<0)      /* aprova\u00e7\u00e3o j\u00e1 aparece no bloco de cima */
    .sort((a,b)=>String(a.data).localeCompare(String(b.data)));
  if(!meus.length && !pendentes().length)
    return '<section class="bloco ok"><h2>Nada esperando voc\u00ea</h2>'+
      '<p>Est\u00e1 tudo com a gente no momento. Assim que houver algo para aprovar, aparece aqui.</p></section>';
  if(!meus.length) return '';
  const tit = pendentes().length ? "Tamb\u00e9m com voc\u00ea" : "O que falta de voc\u00ea";
  return '<section class="bloco"><h2>'+tit+'</h2>'+
    meus.map(t=>{
      const n = dias(t.data);
      const urg = n<0?"atrasado":n===0?"hoje":n===1?"umdia":"ok";
      const txt = n<0?("prazo venceu h\u00e1 "+Math.abs(n)+" dia"+(Math.abs(n)>1?"s":"")) : n===0?"vence hoje" : "faltam "+n+" dias";
      return '<div class="item i-'+urg+'"><div class="i-t">'+esc(t.tarefa)+'</div>'+
        '<div class="i-m">Prazo '+fmt(t.data)+' \u00b7 '+txt+'</div></div>';
    }).join("")+'</section>';
}

/* ---- o plano do mes e o fechamento: promessa contra resultado ---- */
const ROTOBJ = {seguidores:"Seguidores", alcance:"Alcance", perfil:"Visitas ao perfil", views:"Visualizacoes"};
function mesNome(ym){
  const d0=new Date(+ym.slice(0,4), +ym.slice(5,7)-1, 1);
  return d0.toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
}
function ymDe(desloc){
  const d0=new Date(HOJE.getFullYear(), HOJE.getMonth()+(desloc||0), 1);
  return d0.getFullYear()+"-"+String(d0.getMonth()+1).padStart(2,"0");
}
function planoMes(ym){ return (PLANO&&PLANO[ym])||null; }
function numPT(n){ return (n==null||isNaN(n))?"-":Number(n).toLocaleString("pt-BR"); }
function soNumero(txt){ const m=String(txt||"").replace(/\./g,"").match(/-?[0-9]+/); return m?Number(m[0]):null; }
/* fecha o mes: de onde saiu, onde chegou, e o que tinha sido prometido */
function fechamento(ym){
  const p=planoMes(ym); if(!p) return null;
  const R=(RESULTADOS&&RESULTADOS[ym])||null; if(!R) return null;
  const d=R.destaque||null;
  let fim=null, ganho=null;
  if(d && d.v!=null){ fim=d.v; ganho=(d.novos!=null?d.novos:null); }
  else if(R.metricas&&R.metricas.length){ fim=R.metricas[0].v; }
  if(fim==null) return null;
  let base=(p.base!=null?p.base:null);
  if(base==null && ganho!=null) base=fim-ganho;
  if(base==null) return null;
  if(ganho==null) ganho=fim-base;
  return {base:base, fim:fim, ganho:ganho, esperado:soNumero(p.esperado),
          rot:(d&&d.k)||((R.metricas&&R.metricas[0]&&R.metricas[0].k)||"Resultado")};
}
function barrasHTML(f){
  const topo=Math.max(f.base, f.fim, 1);
  const alt=v=>Math.max(6, Math.round(v/topo*100));
  return '<div class="fc-graf">'+
    '<div class="fc-col"><span class="fc-v">'+numPT(f.base)+'</span>'+
      '<div class="fc-bar b1" style="height:'+alt(f.base)+'%"></div><i>inicio do mes</i></div>'+
    '<div class="fc-col"><span class="fc-v forte">'+numPT(f.fim)+'</span>'+
      '<div class="fc-bar b2" style="height:'+alt(f.fim)+'%"></div><i>fim do mes</i></div>'+
  '</div>';
}
function planoHTML(){
  const ymA=ymDe(0), ymP=ymDe(-1);
  let h="";
  const f=fechamento(ymP), pp=planoMes(ymP);
  if(f && pp){
    const bateu = f.esperado!=null ? (f.ganho>=f.esperado) : (f.ganho>0);
    const dif = f.esperado!=null ? (f.ganho-f.esperado) : null;
    const frase = f.esperado==null
      ? (f.ganho>=0?"Fechamos com "+numPT(f.ganho)+" a mais.":"Fechamos com "+numPT(Math.abs(f.ganho))+" a menos.")
      : (dif>0 ? "Passamos do combinado em "+numPT(dif)+"."
        : dif===0 ? "Entregamos exatamente o combinado."
        : "Ficamos "+numPT(Math.abs(dif))+" abaixo do combinado.");
    h+='<section class="bloco fecha '+(bateu?"bateu":"faltou")+'">'+
      '<h2>Fechamento de '+esc(mesNome(ymP))+'</h2>'+
      '<div class="fc-linha"><span class="fc-rot">'+esc(f.rot)+'</span>'+
        '<span class="fc-delta'+(f.ganho>=0?"":" neg")+'">'+(f.ganho>=0?"+":"")+numPT(f.ganho)+'</span></div>'+
      barrasHTML(f)+
      (f.esperado!=null?'<div class="fc-meta">Combinado no plano: <b>'+numPT(f.esperado)+'</b></div>':'')+
      '<p class="fc-frase">'+esc(frase)+'</p>'+
      (pp.estrategia?'<div class="fc-est"><span>O que fizemos</span>'+esc(pp.estrategia)+'</div>':'')+
      '</section>';
  }
  const p=planoMes(ymA);
  if(p && (p.estrategia||p.esperado)){
    h+='<section class="bloco plano"><h2>O plano de '+esc(mesNome(ymA))+'</h2>'+
      (OBJETIVO?'<div class="pl-l"><span>Objetivo do mes</span><b>'+esc(ROTOBJ[OBJETIVO]||OBJETIVO)+'</b></div>':'')+
      (p.estrategia?'<div class="pl-l"><span>Estrategia</span><p>'+esc(p.estrategia)+'</p></div>':'')+
      (p.esperado?'<div class="pl-l"><span>Resultado esperado</span><b>'+esc(p.esperado)+'</b></div>':'')+
      '</section>';
  }
  return h;
}

/* ---- 2) o mes em etapas: quem tem a bola, at\u00e9 quando, e o que o atraso empurra ----
   Cada etapa comeca quando a anterior termina de verdade. Por isso um atraso do
   cliente aparece empurrando tudo que vem depois, com o numero de dias uteis. */
function ymAtual(){ const d0=HOJE; return d0.getFullYear()+"-"+String(d0.getMonth()+1).padStart(2,"0"); }
const ETAPAS = [
  {p:"envPlanej", c1:"c1_plan",   rot:"Planejamento do m\u00eas",        dono:"MK3",   verbo:"entregamos"},
  {p:"aprPlanej", c1:"c1_aprPlan",rot:"Aprova\u00e7\u00e3o do planejamento", dono:"VOCE",  verbo:"voc\u00ea aprova"},
  {p:"envMidia",  c1:"c1_artes",  rot:"Artes e v\u00eddeos",             dono:"MK3",   verbo:"entregamos"},
  {p:"aprMidia",  c1:"c1_aprMid", rot:"Aprova\u00e7\u00e3o das artes",       dono:"VOCE",  verbo:"voc\u00ea aprova"},
  {p:"agendado",  c1:"c1_podepostar", c1b:"c1_entrega", rot:"Conte\u00fado no ar", dono:"MK3", verbo:"publicamos"}
];
function acharEtapa(e, ym){
  return TAREFAS.find(t=>t.id===e.p+"_"+ym)
      || TAREFAS.find(t=>t.id===e.c1)
      || (e.c1b?TAREFAS.find(t=>t.id===e.c1b):null) || null;
}
function cicloEtapas(){
  const ym=ymAtual(), hoje=iso(HOJE), out=[];
  let fimAnterior=null, arrasto=0;
  ETAPAS.forEach(e=>{
    const t=acharEtapa(e,ym); if(!t || !t.data) return;
    const feita = t.st.k==="ok";
    const real  = feita ? (t.dataConclusao||t.data) : null;
    const prazo = t.data;
    const inicio= fimAnterior || prazo;
    let atraso=0;
    if(real) atraso=uteisEntre(prazo, real);
    else if(hoje>prazo) atraso=uteisEntre(prazo, hoje);
    if(atraso<0) atraso=0;
    const estado = feita ? (atraso>0?"tarde":"ok")
                 : (hoje>prazo ? "atrasado" : (inicio<=hoje ? "agora" : "futuro"));
    out.push({rot:e.rot, dono:e.dono, verbo:e.verbo, inicio:inicio, prazo:prazo,
              real:real, atraso:atraso, estado:estado, arrasto:arrasto});
    if(e.dono==="VOCE" && atraso>0) arrasto+=atraso;     /* so o atraso do cliente empurra */
    fimAnterior = real || (hoje>prazo?hoje:prazo);
  });
  return out;
}
function cicloHTML(){
  const et=cicloEtapas();
  if(et.length<2) return '';
  const mes=HOJE.toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
  const totalArr=et.reduce((a,x)=>Math.max(a,x.arrasto),0);
  const linhas=et.map(x=>{
    const janela = x.inicio===x.prazo ? fmt(x.prazo) : (fmt(x.inicio)+" a "+fmt(x.prazo));
    let nota="";
    if(x.estado==="ok")        nota="feito no prazo"+(x.real?", em "+fmt(x.real):"");
    else if(x.estado==="tarde")nota="saiu "+x.atraso+" dia"+(x.atraso>1?"s \u00fateis":" \u00fatil")+" depois do combinado"+(x.real?", em "+fmt(x.real):"");
    else if(x.estado==="atrasado") nota="parado h\u00e1 "+x.atraso+" dia"+(x.atraso>1?"s \u00fateis":" \u00fatil")+", prazo era "+fmt(x.prazo);
    else if(x.estado==="agora")nota="em andamento, prazo "+fmt(x.prazo);
    else                       nota="ainda n\u00e3o come\u00e7ou";
    const empurrada = x.arrasto>0 && x.dono==="MK3" && x.estado!=="ok"
      ? '<div class="cl-emp">empurrada '+x.arrasto+' dia'+(x.arrasto>1?'s \u00fateis':' \u00fatil')+' pela aprova\u00e7\u00e3o anterior</div>' : '';
    return '<div class="cl-row e-'+x.estado+' d-'+(x.dono==="VOCE"?"cli":"mk3")+'">'+
      '<span class="cl-rail"><i></i></span>'+
      '<div class="cl-body">'+
        '<div class="cl-h"><b>'+esc(x.rot)+'</b>'+
          '<span class="cl-dono">'+(x.dono==="VOCE"?"com voc\u00ea":"com a MK3")+'</span></div>'+
        '<div class="cl-j">'+esc(janela)+'</div>'+
        '<div class="cl-n">'+esc(nota)+'</div>'+ empurrada +
      '</div></div>';
  }).join("");
  const resumo = totalArr>0
    ? '<div class="cl-aviso">O ciclo deste m\u00eas est\u00e1 <b>'+totalArr+' dia'+(totalArr>1?'s \u00fateis':' \u00fatil')+
      '</b> atr\u00e1s do previsto, e a origem foi a aprova\u00e7\u00e3o. Cada etapa s\u00f3 come\u00e7a quando a anterior termina, '+
      'ent\u00e3o o que atrasa em uma ponta desloca tudo que vem depois.</div>'
    : '<div class="cl-aviso ok">Ciclo em dia. Cada etapa comeca quando a anterior termina, ent\u00e3o manter as aprova\u00e7\u00f5es no prazo mant\u00e9m a publica\u00e7\u00e3o na data.</div>';
  return '<section class="bloco ciclo"><h2>Como est\u00e1 '+esc(mes)+'</h2>'+
    resumo+'<div class="cl-lista">'+linhas+'</div></section>';
}

/* ---- 2) próximos passos (o que vem) ---- */
let PMES = 0, PDIA = null;                       /* 0 = mes corrente, -1 = anterior, 1 = seguinte */
let PVISAO = "cal";                 /* cal ou lista */
function tarefasDoPortal(){
  return TAREFAS.filter(t=>t.data && t.fase!=="Contrato" && !/^pag_|^fotos_/.test(t.id));
}
/* janelas de cada etapa: serve para pintar o intervalo no calendario */
function faixas(){
  return cicloEtapas().map(x=>({
    ini:x.inicio, fim:x.prazo, dono:x.dono, estado:x.estado, rot:x.rot
  }));
}
function proximos(){
  const abas='<div class="pv-abas">'+
    '<button class="pv-aba'+(PVISAO==="cal"?" on":"")+'" data-pvisao="cal">Calendário</button>'+
    '<button class="pv-aba'+(PVISAO==="lista"?" on":"")+'" data-pvisao="lista">Lista</button></div>';
  return PVISAO==="cal" ? calendarioHTML(abas) : listaHTML(abas);
}
function listaHTML(abas){
  const hoje=iso(HOJE);
  const ts=tarefasDoPortal().filter(t=>t.data>=hoje && t.st.k!=="ok")
    .sort((a,b)=>String(a.data).localeCompare(String(b.data))).slice(0,10);
  if(!ts.length) return '<section class="bloco"><div class="pv-topo"><h2>Próximos passos</h2>'+abas+'</div>'+
    '<p>Nada programado daqui para frente.</p></section>';
  return '<section class="bloco"><div class="pv-topo"><h2>Próximos passos</h2>'+abas+'</div><div class="linha-lista">'+
    ts.map(t=>'<div class="ln"><span class="ln-d">'+fmt(t.data)+'</span>'+
      '<span class="ln-t">'+esc(t.tarefa)+'</span>'+
      '<span class="ln-q '+(t.resp==="Cliente"?"cli":"mk3")+'">'+(t.resp==="Cliente"?"com você":"com a MK3")+'</span></div>').join("")+
    '</div></section>';
}
/* ---- o dia aberto: o que acontece nele e de quem e a vez ---- */
function detalheDia(){
  if(!PDIA) return '';
  const hoje=iso(HOJE);
  const ts=tarefasDoPortal().filter(t=>t.data===PDIA)
    .sort((a,b)=>String(a.resp).localeCompare(String(b.resp)));
  const mk=(C.marcos||[]).filter(m=>m.data===PDIA);
  const f=faixas().find(x=>x.ini<=PDIA && PDIA<=x.fim);
  const d0=d(PDIA);
  const titulo=d0.toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"});
  let corpo="";
  if(f){
    const dono = f.dono==="VOCE" ? "com você" : "com a MK3";
    const alerta = f.estado==="atrasado";
    corpo+='<div class="dd-faixa '+(f.dono==="VOCE"?"cli":"mk3")+(alerta?" alerta":"")+'">'+
      '<b>'+esc(f.rot)+'</b> está '+dono+' neste dia'+
      (alerta?' e o prazo já passou. Enquanto isso não sai, as etapas seguintes ficam paradas.'
             :', dentro do prazo de '+fmt(f.ini)+' a '+fmt(f.fim)+'.')+'</div>';
  }
  if(!ts.length && !mk.length){
    corpo+='<p class="dd-vazio">Nada marcado para este dia.</p>';
  } else {
    corpo+='<div class="dd-lista">'+
      mk.map(m=>'<div class="dd-i marco"><span class="dd-q">marco</span>'+
        '<span class="dd-t">'+esc(m.titulo)+(m.detalhe?'<i>'+esc(m.detalhe)+'</i>':'')+'</span></div>').join("")+
      ts.map(t=>{
        const feita=t.st.k==="ok";
        const atrasada=!feita && t.data<hoje;
        const cls=feita?"ok":(atrasada?"atr":(t.resp==="Cliente"?"cli":"mk3"));
        const sit=feita?("concluído"+(t.st.quando?" em "+fmt(t.st.quando):""))
                 :atrasada?("em atraso desde "+fmt(t.data))
                 :(t.data===hoje?"para hoje":"programado");
        return '<div class="dd-i '+cls+'">'+
          '<span class="dd-q">'+(t.resp==="Cliente"?"com você":"com a MK3")+'</span>'+
          '<span class="dd-t">'+esc(t.tarefa)+(t.detalhe?'<i>'+esc(t.detalhe)+'</i>':'')+'</span>'+
          '<span class="dd-s">'+esc(sit)+'</span></div>';
      }).join("")+'</div>';
  }
  return '<div class="dd-fundo" data-pdia="">'+
    '<div class="dd-box" role="dialog" aria-modal="true" aria-label="'+escAttr(titulo)+'">'+
      '<div class="dd-h"><b>'+esc(titulo)+'</b>'+
      '<button data-pdia="" aria-label="Fechar">&times;</button></div>'+corpo+
    '</div></div>';
}
function calendarioHTML(abas){
  const hoje=iso(HOJE);
  const ref=new Date(HOJE.getFullYear(), HOJE.getMonth()+PMES, 1);
  const ano=ref.getFullYear(), mes=ref.getMonth();
  const desloc=ref.getDay(), nDias=new Date(ano,mes+1,0).getDate();
  const ts=tarefasDoPortal();
  const fx=faixas();
  const mk=(C.marcos||[]);

  let cels="";
  for(let i=0;i<desloc;i++) cels+='<div class="cd-vazio"></div>';
  for(let d0=1;d0<=nDias;d0++){
    const dia=iso(new Date(ano,mes,d0));
    const doDia=ts.filter(t=>t.data===dia);
    const marcos=mk.filter(m=>m.data===dia);
    /* a janela que cobre este dia diz de quem e a bola */
    const f=fx.find(x=>x.ini<=dia && dia<=x.fim);
    const cobre = f ? (" j-"+(f.dono==="VOCE"?"cli":"mk3")+(f.estado==="atrasado"?" j-alerta":"")) : "";
    const fds=[0,6].indexOf(new Date(ano,mes,d0).getDay())>=0;
    const itens=doDia.map(t=>{
      const feita=t.st.k==="ok";
      const atrasada=!feita && t.data<hoje;
      const cls=feita?"ok":(atrasada?"atr":(t.resp==="Cliente"?"cli":"mk3"));
      return '<span class="cd-i cd-'+cls+'" title="'+esc(t.tarefa)+(t.resp==="Cliente"?" (com você)":" (com a MK3)")+'">'+
        esc(t.tarefa)+'</span>';
    }).join("")+marcos.map(m=>'<span class="cd-i cd-marco" title="'+esc(m.titulo)+'">'+esc(m.titulo)+'</span>').join("");
    const temAlgo = doDia.length || marcos.length;
    cels+='<button type="button" class="cd-d'+(dia===hoje?" hoje":"")+(fds?" fds":"")+cobre+
      (temAlgo?" tem":"")+(dia===PDIA?" sel":"")+'" data-pdia="'+dia+'"'+
      ' aria-label="'+esc(fmt(dia))+(temAlgo?", "+(doDia.length+marcos.length)+" item(ns)":", sem nada")+'">'+
      '<span class="cd-n">'+d0+'</span>'+(itens?'<div class="cd-itens">'+itens+'</div>':'')+'</button>';
  }
  const nomeMes=ref.toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
  const legenda='<div class="cd-leg">'+
    '<span><i class="l-mk3"></i>com a MK3</span>'+
    '<span><i class="l-cli"></i>com você</span>'+
    '<span><i class="l-atr"></i>fora do prazo</span>'+
    '<span><i class="l-ok"></i>concluído</span></div>';
  return '<section class="bloco cal"><div class="pv-topo"><h2>Calendário</h2>'+abas+'</div>'+
    '<div class="cd-nav"><button data-pmes="'+(PMES-1)+'" aria-label="Mês anterior">&lsaquo;</button>'+
      '<strong>'+esc(nomeMes)+'</strong>'+
      '<button data-pmes="'+(PMES+1)+'" aria-label="Próximo mês">&rsaquo;</button></div>'+
    '<div class="cd-dow"><span>dom</span><span>seg</span><span>ter</span><span>qua</span><span>qui</span><span>sex</span><span>sáb</span></div>'+
    '<div class="cd-grade">'+cels+'</div>'+
    '<div class="cd-dica">Clique em qualquer dia para ver o que acontece nele.</div>'+ legenda +
    '<p class="nota">O fundo de cada dia mostra de quem é a vez: roxo com a MK3, amarelo com você. '+
    'Quando a sua parte passa do prazo, o bloco fica vermelho e tudo que vem depois anda junto.</p>'+
    '</section>';
}

/* ---- 3) linha do tempo com atrasos e efeito cascata ---- */
function historico(){
  if(!MOSTRA_HISTORICO) return '';
  const hojeIso=iso(HOJE);
  /* só o que é responsabilidade do cliente: aprovações e envios de material dele */
  const consumados = atrasos(C).filter(a=>a.quem==="Cliente" && !a.previsto);
  const emAberto = TAREFAS.filter(t=>t.resp==="Cliente" && t.st.k!=="ok" && t.data && t.data<hojeIso)
    .map(t=>({etapa:t.tarefa, limite:t.data, dias:uteisEntre(t.data,hojeIso), aberto:true}))
    .filter(a=>a.dias>0);
  const todos = consumados.concat(emAberto).sort((a,b)=>String(a.limite).localeCompare(String(b.limite)));
  const marcos = [...(C.marcos||[])].sort((a,b)=>a.data.localeCompare(b.data));

  let h='<section class="bloco"><h2>Linha do tempo</h2>';
  if(marcos.length){
    h+='<div class="tl">'+marcos.map(m=>'<div class="tl-i"><span class="tl-d">'+fmt(m.data)+'</span>'+
      '<span class="tl-t">'+esc(m.titulo)+(m.detalhe?' <i>'+esc(m.detalhe)+'</i>':'')+'</span></div>').join("")+'</div>';
  }
  if(todos.length){
    h+='<h3 class="sub">Aprovações fora do prazo</h3>'+
      '<p class="nota">Registro objetivo, para explicar o remanejamento das entregas. Prazos em dias úteis.</p>'+
      todos.map(a=>{
        const dias1=a.dias, plural=dias1>1;
        if(a.aberto){
          /* o que está parado esperando esta aprovação */
          const parado=TAREFAS.filter(t=>t.resp!=="Cliente" && t.st.k!=="ok" && t.data && t.data>=a.limite)
            .sort((x,y)=>String(x.data).localeCompare(String(y.data))).slice(0,2);
          return '<div class="atr aberto"><div class="a-t">'+esc(a.etapa)+' <span class="tagx">em aberto</span></div>'+
            '<div class="a-m">Prazo era '+fmt(a.limite)+' · <b>'+dias1+(plural?' dias úteis':' dia útil')+' sem retorno</b></div>'+
            (parado.length?'<div class="a-e">Enquanto isso, segue parado: '+parado.map(t=>esc(t.tarefa)).join(" · ")+'</div>':'')+
          '</div>';
        }
        const dep=TAREFAS.filter(t=>t.data && a.real && t.data>=a.real && /arte|Pode Postar|roteiro|agendad/i.test(t.tarefa))
          .sort((x,y)=>String(x.data).localeCompare(String(y.data))).slice(0,2);
        return '<div class="atr"><div class="a-t">'+esc(a.etapa)+'</div>'+
          '<div class="a-m">Prazo '+fmt(a.limite)+' · retorno em '+fmt(a.real)+' · <b>'+dias1+(plural?' dias úteis':' dia útil')+' além do prazo</b></div>'+
          (dep.length?'<div class="a-e">Efeito: '+dep.map(t=>esc(t.tarefa)+" ficou para "+fmt(t.data)).join(" · ")+'</div>':'')+
        '</div>';
      }).join("");
  } else {
    h+='<div class="ok-box">Nenhuma aprovação fora do prazo até aqui. Obrigado pela agilidade.</div>';
  }
  h+='</section>';
  return h;
}


/* ---- destaque: o objetivo do cliente, em primeiro lugar ---- */
const ROT_OBJ = { seguidores:"Seguidores", alcance:"Alcance", perfil:"Visitas ao perfil", views:"Visualizações" };
function destaqueAtual(){
  if(!OBJETIVO || !RESULTADOS) return null;
  const ks=Object.keys(RESULTADOS).sort(); if(!ks.length) return null;
  const r=RESULTADOS[ks[ks.length-1]]; if(!r) return null;
  if(r.destaque && r.destaque.obj===OBJETIVO) return {...r.destaque, periodo:r.periodo, compara:r.compara};
  const rot=ROT_OBJ[OBJETIVO];
  const m=(r.metricas||[]).find(x=>x.k===rot);
  return m ? {k:rot, v:m.v, d:m.d, periodo:r.periodo, compara:r.compara} : null;
}
function heroHTML(){
  const h=destaqueAtual(); if(!h) return '';
  const pct = (META && META>0) ? Math.max(0, Math.min(100, Math.round(h.v/META*100))) : null;
  const sobe = h.d==null ? null : h.d>0;
  return '<section class="hero'+(sobe===true?" up":(sobe===false?" down":""))+'">'+
    '<div class="hero-k">'+esc(h.k)+'<i>o foco do trabalho agora</i></div>'+
    '<div class="hero-v">'+numBR(h.v)+'</div>'+
    '<div class="hero-l">'+
      (h.d==null?'<span class="rs-d zero">sem comparação</span>'
               :'<span class="rs-d '+(h.d>0?"sobe":(h.d<0?"desce":"zero"))+'">'+
                 (h.d>0?"\u25B2":(h.d<0?"\u25BC":"\u2022"))+' '+(h.d>0?"+":"")+
                 String(Math.round(h.d*10)/10).replace(".",",")+'% em relação a '+esc(h.compara||"antes")+'</span>')+
      (h.novos!=null?'<span class="hero-x">'+(h.novos>0?"+":"")+numBR(h.novos)+' no mês</span>':'')+
    '</div>'+
    (pct!=null?'<div class="hero-meta"><div class="hero-bar"><i style="width:'+pct+'%"></i></div>'+
      '<span>'+numBR(h.v)+' de '+numBR(META)+' · '+pct+'% da meta</span></div>':'')+
    (RECADO?'<div class="hero-r"><span class="hero-asp">&#8220;</span>'+esc(RECADO)+'</div>':'')+
    (h.periodo?'<div class="hero-p">'+esc(h.periodo)+'</div>':'')+
  '</section>';
}
/* ---- resultados do mês (dados do Reportei, enviados pela MK3) ---- */
const numBR = n => (n==null||isNaN(n)) ? "-" : Number(n).toLocaleString("pt-BR");
function seta(d){
  if(d==null) return '<span class="rs-d zero">estável</span>';
  const p=Math.round(d*10)/10, cls=p>0?"sobe":(p<0?"desce":"zero");
  return '<span class="rs-d '+cls+'">'+(p>0?"\u25B2":(p<0?"\u25BC":"\u2022"))+' '+(p>0?"+":"")+String(p).replace(".",",")+'%</span>';
}
function resultados(){
  if(!RESULTADOS) return '';
  const ks=Object.keys(RESULTADOS).sort(); if(!ks.length) return '';
  const r=RESULTADOS[ks[ks.length-1]]; if(!r || !(r.metricas||[]).length) return '';
  return '<section class="bloco"><h2>Resultados do mês</h2>'+
    '<div class="res-ms">'+r.metricas.map(x=>
      '<div class="res-m"><span class="rs-v">'+numBR(x.v)+'</span>'+
      '<span class="rs-k">'+esc(x.k)+'</span>'+seta(x.d)+'</div>').join("")+'</div>'+
    (r.resumo?'<p class="nota">'+esc(r.resumo)+'</p>':'')+
    '<p class="nota">'+esc(r.periodo||"")+(r.compara?' · comparado com '+esc(r.compara):'')+'.</p>'+
  '</section>'+
  (r.dash?('<section class="bloco"><h2>Painel completo</h2>'+
    '<p class="nota">Todos os números do mês, direto da nossa ferramenta de relatórios. Atualiza sozinho. Role dentro do quadro para ver tudo.</p>'+
    '<div class="dash-box" id="dashBox">'+(DASH_ABERTO?dashFrameHTML(r.dash):
      '<button class="dash-abrir" id="dashAbrir">Carregar painel completo</button>'+
      '<a class="res-link" href="'+esc(r.dash)+'" target="_blank" rel="noopener">ou abrir em outra aba</a>')+
    '</div></section>'):'');
}
function dashFrameHTML(u){
  return '<div class="dash-carrega">Carregando o painel, isso leva alguns segundos...</div>'+
    '<iframe class="dash-fr" src="'+esc(u)+'" loading="lazy" title="Painel de resultados"></iframe>'+
    '<a class="res-link" href="'+esc(u)+'" target="_blank" rel="noopener">abrir em outra aba</a>';
}
function armarFrame(cx){
  const fr=cx.querySelector(".dash-fr"); if(!fr) return;
  fr.addEventListener("load",()=>{ const c=cx.querySelector(".dash-carrega"); if(c) c.remove(); fr.classList.add("pronto"); });
}
function ligarDash(){
  const cx=document.getElementById("dashBox"); if(!cx) return;
  if(DASH_ABERTO){ armarFrame(cx); return; }
  const b=document.getElementById("dashAbrir"); if(!b) return;
  b.onclick=()=>{
    const ks=Object.keys(RESULTADOS||{}).sort(); const r=RESULTADOS[ks[ks.length-1]]; if(!r||!r.dash) return;
    DASH_ABERTO=true; cx.innerHTML=dashFrameHTML(r.dash); armarFrame(cx);
  };
}
function caixaDia(){
  let cx=document.getElementById("diaModal");
  if(!cx){ cx=document.createElement("div"); cx.id="diaModal"; document.body.appendChild(cx); }
  cx.innerHTML=detalheDia();
  document.body.classList.toggle("travado", !!PDIA);
}
function topoHTML(){
  const rot={geral:"Visão geral", trafego:"Tráfego pago"};
  const disp=(ABAS||["geral","trafego"]).filter(a=>rot[a]);
  return '<div class="cli-topo"><h1>'+esc(C.nome)+'</h1>'+
    (disp.length>1
      ? '<div class="cli-abas">'+disp.map(a=>
          '<button class="cli-aba'+(ABA===a?" on":"")+'" data-aba="'+a+'">'+rot[a]+'</button>').join("")+'</div>'
      : '')+
    '</div>';
}
function desenhar(){
  if(!C){ return; }
  const corpo = ABA==="trafego"
    ? trafegoHTML()
    : (heroHTML() + faltaVoce() + planoHTML() + cicloHTML() + esperando() + resultados() + proximos() + historico());
  $("view").innerHTML = topoHTML() + corpo;
  if(ABA!=="trafego"){ ligarDash(); caixaDia(); }
}
/* navegacao do calendario e troca de visao, sem recarregar a pagina */
document.addEventListener("click", ev=>{
  const a=ev.target.closest("[data-pmes],[data-pvisao],[data-pdia],[data-aba],[data-contato],[data-fechar],[data-marcar],[data-fecharx]"); if(!a) return;
  ev.preventDefault();
  if(a.dataset.pmes!==undefined){ PMES=Number(a.dataset.pmes)||0; PDIA=null; }
  if(a.dataset.pdia!==undefined){
    if(a.classList.contains("dd-fundo") && ev.target!==a) return;   /* clique dentro da janela nao fecha */
    PDIA = (a.dataset.pdia && a.dataset.pdia!==PDIA) ? a.dataset.pdia : null;
  }
  if(a.dataset.pvisao){ PVISAO=a.dataset.pvisao; PDIA=null; }
  if(a.dataset.aba){ ABA=a.dataset.aba; PDIA=null; }
  if(a.dataset.contato){ const id=a.dataset.contato; gravarCRM(id,"contato",!crmDe(id).contato); return; }
  if(a.dataset.fechar){ abrirFechamento(a.dataset.fechar); return; }
  if(a.dataset.marcar){
    const p=a.dataset.marcar.split("|");
    gravarCRM(p[0], p[1], !crmDe(p[0])[p[1]]);
    abrirFechamento(p[0]); return;
  }
  if(a.dataset.fecharx){ if(ev.target===a || a.tagName==="BUTTON"){ fecharModalLead(); } return; }
  desenhar();
});
document.addEventListener("keydown", ev=>{
  if(ev.key!=="Escape") return;
  if(PDIA){ PDIA=null; caixaDia(); return; }
  const cx=document.getElementById("diaModal");
  if(cx && cx.innerHTML) fecharModalLead();
});

/* ---- atualização automática: lê só o nó deste link no banco da MK3 ---- */
const URL_ESP = (typeof MK3_DB!=="undefined" && MK3_DB) ? (MK3_DB+"/painel/publico/"+MEU_TOKEN+".json") : null;


function marcarAtualizado(){
  let el=document.getElementById("atualiz");
  if(!el){ el=document.createElement("div"); el.id="atualiz"; el.className="atualiz";
    const f=document.querySelector("footer"); if(f) f.parentNode.insertBefore(el,f); else document.body.appendChild(el); }
  const h=new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
  el.innerHTML='<span class="pt"></span>Atualiza sozinho. Última leitura às '+h+'.';
}
function aplicarEspelho(v){
  if(!v || typeof v!=="object") return false;
  if(v.ativo && v.ativo!==MEU_TOKEN){ expirado(); return true; }
  if(!C && !iniciar(v.base)){ aviso("Link inválido","Não consegui carregar este acompanhamento. Confira o endereço ou peça um link novo à equipe da MK3."); return true; }
  if(typeof v.historico==="boolean") MOSTRA_HISTORICO=v.historico;
  ABAS = (v.abas && v.abas.length) ? v.abas : ["geral","trafego"];
  if(ABAS.indexOf(ABA)<0) ABA=ABAS[0];
  LEADS = v.leads || {};
  CRM   = v.crm   || {};
  const assinatura = JSON.stringify({c:v.concluidas,d:v.datas,r:v.resultados,a:v.ativo,p:v.pendencias,pl:v.plano,l:v.leads,cr:v.crm});
  if(assinatura===ULTIMO){ marcarAtualizado(); return true; }   /* nada mudou: não redesenha */
  ULTIMO=assinatura;
  RESULTADOS = v.resultados || null; OBJETIVO = v.objetivo || ""; META = v.meta || null; RECADO = v.recado || ""; PENDENCIAS = v.pendencias || null; PLANO = v.plano || null;
  const E={concluidas:{},datas:{}};
  E.concluidas[CLIENTE_ID]=v.concluidas||[];
  E.datas[CLIENTE_ID]=v.datas||{};
  aplicarEstado(E); desenhar(); marcarAtualizado();
  return true;
}
function puxarEspelho(){
  if(!URL_ESP) return;
  fetch(URL_ESP+"?ts="+Date.now())
    .then(r=>r.ok?r.json():null)
    .then(v=>{
      if(v && aplicarEspelho(v)){ TEM_ESPELHO=true; return; }
      if(!TEM_ESPELHO) aviso("Link inválido","Não encontrei nenhum acompanhamento neste endereço. Peça o link à equipe da MK3.");
    })
    .catch(()=>{ if(!TEM_ESPELHO) aviso("Sem conexão","Não consegui falar com o servidor agora. Tente novamente em instantes."); });
}
if(!MEU_TOKEN) aviso("Link incompleto","Este endereço está sem a chave de acesso. Use o link completo que a MK3 enviou.");
else puxarEspelho();
if(MEU_TOKEN && URL_ESP && window.EventSource){
  try{
    FONTE=new EventSource(URL_ESP);
    FONTE.addEventListener("put",  ()=>puxarEspelho());
    FONTE.addEventListener("patch",()=>puxarEspelho());
    FONTE.onerror=()=>{ /* cai para a checagem periódica */ };
  }catch(e){}
}
if(MEU_TOKEN) setInterval(puxarEspelho, 60000);
document.addEventListener("visibilitychange",()=>{ if(MEU_TOKEN && !document.hidden) puxarEspelho(); });
