/* ================= INTERFACE ================= */
/* nome de cada area, igual em todo o painel */
const AREA_ROT = {mkt:"Marketing Digital", fin:"Financeiro", com:"Comercial"};
const $ = id => document.getElementById(id);
const esc = s => String(s==null?"":s)
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

/* ---- ícone de status: não depender só de cor (2.3) ---- */
const SIC = {atrasado:"&#9650;",replan:"&#8618;",parcial:"&#9681;",hoje:"&#9679;",umdia:"&#9686;",semana:"&#9675;",futuro:"&#9675;",sem:"?",ok:"&#10003;"};
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
  if(window.fecharTip) window.fecharTip();                 /* tooltip nao fica boiando por cima do modal */
  const h=mm.querySelector("h3,h2"); if(h) h.id="modalTitulo";
  else mm.removeAttribute("aria-labelledby");
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

const ORDEM   = {atrasado:0,replan:0.2,parcial:0.5,hoje:1,umdia:2,semana:3,sem:4,futuro:5,ok:6};
const ROTULO  = {atrasado:"Atrasado",replan:"Replanejada e vencida",parcial:"Parcial",hoje:"Vence hoje",umdia:"Falta 1 dia",
                 semana:"Próximos 7 dias",sem:"Sem data",futuro:"Programado",ok:"Concluído"};
const BUCKETS = ["atrasado","replan","parcial","hoje","umdia","semana","sem","ok"];

/* ---- áreas (Visão Geral = tudo) ---- */
const AREAS = [{k:"all",rot:"Visão Geral"},{k:"mkt",rot:"Marketing Digital"},
               {k:"fin",rot:"Financeiro"},{k:"com",rot:"Comercial"}];
/* de que area e cada tarefa. Contrato, mensalidade, renovacao e encerramento sao do
   administrativo (fin); a acao comercial de renovacao aparece para o administrativo E o comercial. */
function areasDaTarefa(t){
  const id=String(t.id||"");
  if(/^acaoComercial(_|$)/.test(id)) return ["fin","com"];
  if(/^entregaMateriais(_|$)/.test(id)) return ["mkt"];                 /* entregar o material e trabalho do marketing */
  if(/^(pag_|fotos_|renov(_|$)|renovacao|fimContrato(_|$))/.test(id)) return ["fin"];
  if(t.fase==="Contrato") return ["fin"];                                 /* extras de contrato vindos do dados.js */
  return ["mkt"];
}
const areaBase = id => areasDaTarefa({id:id})[0];
/* a tarefa pertence a area? (algumas pertencem a duas) */
const naArea = (t,a) => (t.areas||[t.area]).indexOf(a)>=0;
const areaMatch = t => {
  const permitidas = USUARIO ? areasDe() : ["all","mkt","fin","com"];
  const a = (permitidas.indexOf(VISTA.area)>=0) ? VISTA.area : (permitidas.indexOf("all")>=0?"all":permitidas[0]);
  if(a==="all") return true;
  return naArea(t,a);
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
  olho:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/></svg>',
  feed:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16M4 12h16M4 19h10"/><circle cx="19.5" cy="19" r="1.6"/></svg>',
  add:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12 19"/></svg>',
  equipe:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 20a5.5 5.5 0 0 0-3-4.9"/></svg>',
  cadastro:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
  cadeado:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>',
  aovivo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2"/></svg>',
  repete:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/></svg>',
  compromisso:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M12 12.5v5M9.5 15h5"/></svg>',
  lixo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  mais:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/></svg>',
  sair:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l5-5-5-5M15 12H4"/></svg>'
};
/* no celular a sidebar vira barra inferior: so os itens "prim" ficam a mostra, o resto vai para "Mais" */
const NAV_PRIM = ["cards","feed","prio","cal","lista"];
function navItem(key,label,icon,kind,on,n){
  const href = kind==="view" ? rotaDe({modo:key,escopo:null}) : rotaDe({area:key});
  return '<a class="snav'+(on?" on":"")+(NAV_PRIM.indexOf(key)>=0?" prim":"")+'" href="'+href+'" data-'+kind+'="'+key+'" title="'+esc(label)+'" aria-label="'+esc(label)+(n?' ('+n+')':'')+'"'+(on?' aria-current="page"':'')+'>'+
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
      const n=universo.filter(t=>(a[0]==="all"||naArea(t,a[0])) && (t.st.k==="atrasado"||t.st.k==="hoje")).length;
      return '<a class="abar-b'+(on?" on":"")+'" href="'+rotaDe({area:a[0]})+'" data-area="'+a[0]+'" role="tab" aria-selected="'+on+'"'+(n?' aria-label="'+escAttr(a[1])+', '+n+' urgentes"':'')+'>'+
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
    /* no celular a barra rola: a area escolhida fica sempre a vista */
    const bx=bar.querySelector(".abar");
    if(bx && bx.scrollWidth>bx.clientWidth){ const l=ativo.offsetLeft-12; if(l<bx.scrollLeft||ativo.offsetLeft+ativo.offsetWidth>bx.scrollLeft+bx.clientWidth) bx.scrollLeft=l; }
  });
}
function sidebarHTML(){
  const c=VISTA.escopo?cliente(VISTA.escopo):null;
  const urg=tarefasArea().filter(t=>t.st.k==="atrasado"||t.st.k==="hoje"||t.st.k==="umdia").length;
  const views=[["cards","Clientes",IC.cards],["feed","Feed",IC.feed],["prio","Tarefas",IC.prio],
               ["lista","Dashboard",IC.dash],["cal","Agenda",IC.cal],
               ["equipe","Funcionários",IC.pessoas],["tend","Tendência",IC.tend]]
    .filter(v=>(v[0]!=="tend" && v[0]!=="equipe") || ehAdmin());
  /* botao de acao da sidebar: sempre com nome acessivel, mesmo com o menu recolhido */
  const bt=(attr,label,icon,cls,title)=>'<button class="snav'+(cls?" "+cls:"")+'" '+attr+' title="'+escAttr(title||label)+'" aria-label="'+escAttr(label)+'">'+
    '<span class="snav-i">'+icon+'</span><span class="snav-t">'+esc(label)+'</span></button>';
  let h='<div class="side-brand"><a class="b" href="'+rotaDe({modo:"cards",escopo:null})+'" data-view="cards" aria-label="MK3, ir para os clientes"><span>MK</span>3</a>'+
        '<button class="side-toggle" data-side="toggle" title="Recolher menu" aria-label="Recolher menu" aria-expanded="'+(!VISTA.side)+'">&#10094;</button></div>';
  h+='<button class="snav prim mais" data-maismenu="1" aria-label="Mais opções" aria-expanded="false"><span class="snav-i">'+IC.mais+'</span><span class="snav-t">Mais</span></button>';
  h+='<div class="side-sec">Ver</div>';
  h+=views.map(v=>navItem(v[0],v[1],v[2],"view",(!c&&VISTA.modo===v[0]),(v[0]==="prio"?urg:0))).join("");
  /* o funil e da area comercial: quem so tem marketing nao ve */
  if(podeComercial()) h+=navItem("funil","Funil de vendas",IC.com,"view",(!c&&VISTA.modo==="funil"),0);
  h+='<div class="side-sec">Criar</div>';
  h+=bt('data-demanda="1"',"Nova demanda",IC.add,"snav-add",ehAdmin()?"Nova demanda":"Nova demanda para você");
  h+=bt('data-recorrente="1"',"Demanda recorrente",IC.repete,"snav-add",ehAdmin()?"Demanda que se repete, para uma área ou uma pessoa":"Demanda que se repete, para você");
  if(agendaUrl()) h+=bt('data-compromisso="1"',"Novo na agenda",IC.compromisso,"snav-add","Cria direto no Google Agenda da MK3");
  if(ehAdmin()){
    h+='<div class="side-sec">Administração</div>';
    h+=bt('data-clientes="1"',"Cadastro de clientes",IC.cadastro,"","Cadastrar, editar e arquivar clientes");
    h+=bt('data-equipe="1"',"Permissões da equipe",IC.cadeado,"","Quem vê o quê, PIN e foto de cada pessoa");
    /* a agenda ao vivo se liga sozinha pelo script do Google (conectarPainel): sem botão no menu */
    h+='<a class="snav'+(!c&&VISTA.modo==="portais"?" on":"")+'" href="'+rotaDe({modo:"portais",escopo:null})+'" data-portais="1" title="O que o cliente vê no portal dele" aria-label="Visão do cliente"'+(!c&&VISTA.modo==="portais"?' aria-current="page"':'')+'><span class="snav-i">'+IC.olho+'</span><span class="snav-t">Visão do cliente</span></a>';
    const nx=nExcluidas();
    if(nx) h+='<button class="snav" data-lixeira="1" title="Ver tarefas excluídas" aria-label="Tarefas excluídas ('+nx+')"><span class="snav-i">'+IC.lixo+'</span><span class="snav-t">Excluídas</span><span class="snav-b neutro">'+nx+'</span></button>';
  }
  const pu=eu();
  /* quem esta logado e o botao de sair dividem a mesma linha: o menu cabe numa tela de notebook */
  h+='<div class="side-user"><div class="su-quem"><span class="snav-i">'+faceDe(pu?pu.nome:"")+'</span><span class="snav-t">'+esc(pu?pu.nome:"")+
     '<i>'+(ehAdmin()?"Administração":esc(AREA_ROT[((pu&&pu.areas)||[])[0]]||""))+'</i></span>'+
     '<button class="su-sair" data-sair="1" title="Sair e trocar de pessoa" aria-label="Sair">'+IC.sair+'</button></div></div>';
  return h;
}

let MOVERMODO = true;      /* arrastar e replanejar movem por padrao */
/* comercial e area fechada: admin sempre, e quem tiver "com" nas areas */
function podeComercial(){
  if(ehAdmin()) return true;
  const p=eu(); return !!p && (p.areas||[]).indexOf("com")>=0;
}
const VISTA  = { pinPara:null, area:"all", escopo:null, aba:"cal", modo:"cards", feedDias:7, mes:0, dia:null, filtro:null, verTudo:false, edit:false, pano:null, pmes:0, psem:null, side:false };
const cliente = id => CLIENTES.find(c=>c.id===id);
/* demanda com cliente mora no balde "_dem", mas pertence ao cliente:
   sem isto ela some quando a equipe filtra por um cliente so */
const ehDoCliente = (t,cid) => t.clienteId===cid || t.cliDem===cid;
const tarefasCli  = c => TODAS.filter(t=>ehDoCliente(t,c.id) && areaMatch(t));
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
/* foto so de fonte conhecida: data URL de imagem, pasta fotos/ do repo ou https.
   O valor vem do banco compartilhado; sem isto, um texto com aspas viraria codigo na tela de todos */
const fotoOk = f => typeof f==="string" && /^(data:image\/(png|jpe?g|webp|gif);base64,|fotos\/[\w.-]+$|https:\/\/)/i.test(f);
const urlOk  = u => typeof u==="string" && /^https?:\/\//i.test(u);
const escAttr = esc;   /* mesma coisa que esc: o nome fica por legibilidade nos atributos */


/* uma tarefa entregue pela metade e com o resto remarcado não é simplesmente "atrasada" */
/* indices montados uma vez por rebuild: antes cada tarefa varria ESTADO.dup e todas as semanas de obsT */
let IDX=null;
function construirIndices(){
  const dup={}, parc={};
  (ESTADO.dup||[]).forEach(e=>{ if(!e) return; const k=e.cid+"|"+e.tid; (dup[k]=dup[k]||[]).push(e); });
  const b=ESTADO.obsT||{};
  for(const wk in b){ const s0=b[wk]||{}; for(const k in s0){ if(s0[k]&&s0[k].parcial){ const p=k.split("|"); parc[p[0]+"|"+p[1]]=true; } } }
  return {dup, parc};
}
function dupDe(cid,tid){ return IDX ? (IDX.dup[cid+"|"+tid]||[]).slice() : (ESTADO.dup||[]).filter(e=>e.cid===cid && e.tid===tid); }
function temParcial(cid,tid){
  if(IDX) return !!IDX.parc[cid+"|"+tid];
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
  const l=dupDe(cid,tid)
    .sort((a,b)=>a.dia.localeCompare(b.dia));
  if(!l.length) return null;
  const futura=l.find(e=>e.dia>=hoje);
  return futura ? futura.dia : l[l.length-1].dia;   /* se ja passou, devolve a ultima mesmo assim */
}
/* replanejada cuja data nova ja passou: nao pode voltar a ser "futuro" nem sumir */
function replanVencido(cid,tid){
  const hoje=iso(HOJE);
  const l=dupDe(cid,tid).sort((a,b)=>a.dia.localeCompare(b.dia));
  if(!l.length) return null;
  if(l.some(e=>e.dia>=hoje)) return null;          /* ainda tem remarcacao no futuro */
  return l[l.length-1].dia;
}
/* remarcacao para antes da data original: o prazo que vale passa a ser o novo */
function antecipacao(cid,tid,dataOrig){
  const hoje=iso(HOJE);
  const l=dupDe(cid,tid).filter(e=>e.dia>=hoje && (!dataOrig || e.dia<dataOrig))
    .sort((a,b)=>a.dia.localeCompare(b.dia));
  return l.length?l[0].dia:null;
}
function ajustarReplan(t){
  /* tarefa movida: o dia novo e o unico que existe, inclusive para o status */
  const mv=movidaPara(t.clienteId,t.id);
  if(mv && mv!==t.data){
    const orig=t.data;
    t.data=mv;
    t.movidaDe=orig;
    t.st=status(t);
    if(t.st.k!=="ok") t.st.txt=t.st.txt+" · movida de "+fmt(orig);
    return t;
  }
  if(t.feita || t.st.k==="ok" || t.st.k==="parcial") return t;
  const ant=antecipacao(t.clienteId,t.id,t.data);
  if(ant){
    const st2=status({...t, data:ant});
    st2.txt=st2.txt+" · antecipada de "+fmt(t.data);
    st2.antecipada=t.data;
    t.st=st2;
    return t;
  }
  const q=replanVencido(t.clienteId,t.id);
  if(!q) return t;
  t.st={k:"replan", atraso:uteisEntre(q,iso(HOJE)), quando:null, resto:q,
        txt:"Replanejada para "+fmt(q)+" e venceu de novo"};
  return t;
}
function ajustarParcial(t){
  if(t.feita || t.st.k==="ok") return t;
  if(!temParcial(t.clienteId,t.id)) return t;
  const q=remarcadaPara(t.clienteId,t.id);
  if(!q) return t;                                   /* parcial sem remarcar continua atrasada */
  const hoje=iso(HOJE);
  if(q<hoje){
    const atr=uteisEntre(q,hoje);
    t.st={k:"atrasado", atraso:atr, quando:null, resto:q,
          txt:"Parcial · resto venceu "+fmt(q)};
  } else {
    t.st={k:"parcial", atraso:0, quando:null, resto:q,
          txt:"Parcial · resto em "+fmt(q)};
  }
  return t;
}
function rebuild(){
  IDX=construirIndices();
  try{ rebuildCore(); } finally { IDX=null; }
}
function rebuildCore(){
  const base = ORIG.concat((ESTADO.novosClientes||[]).map(c=>JSON.parse(JSON.stringify(c))));
  const ed = ESTADO.clientes||{};
  CLIENTES.length=0;
  base.forEach(o=>{
    const ov = ed[o.id]||{};
    if(ov.oculto) return;
    const c = JSON.parse(JSON.stringify(o));
    ["nome","segmento","entrada","vencimentoContrato","contrato","inicioContrato","mensalidade"].forEach(k=>{ if(ov[k]) c[k]=ov[k]; });
    /* contratos renovados pelo painel somam ao historico do dados.js */
    if(ov.contratosAnteriores) c.contratosAnteriores=(c.contratosAnteriores||[]).concat(
      ov.contratosAnteriores.filter(k=>!(c.contratosAnteriores||[]).some(x=>x.contrato===k.contrato)));
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
  TODAS = CLIENTES.flatMap(c=>regras(c).map(t=>{ const as=areasDaTarefa(t); return ajustarParcial(ajustarReplan({...t, st:status(t), area:as[0], areas:as})); }))
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
  /* demandas recorrentes: cada ocorrencia vira uma tarefa no balde "_rec" */
  ocorrenciasRec().forEach(t=>TODAS.push(t));
}


const tdOf = t => escAttr([t.cliente, (t.st&&t.st.txt), (t.data?fmt(t.data)+" "+dow(t.data):""), t.resp, t.detalhe].filter(Boolean).join(" · "));
const attrsEdit = t => ' data-editar="1" data-mcid="'+t.clienteId+'" data-mtid="'+escAttr(t.id)+'" data-tt="'+escAttr(t.tarefa||t.titulo||"")+'" data-td="'+tdOf(t)+'"';

