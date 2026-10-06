/* ---------------- RENDER ---------------- */
function tituloContexto(){
  const c=VISTA.escopo?cliente(VISTA.escopo):null;
  const A={all:"Visão geral · todas as áreas",...AREA_ROT};
  const V={cards:"Clientes",prio:"Tarefas da semana",equipe:"Funcionários",cal:"Agenda",lista:"Dashboard",tend:"Tendência de atrasos",feed:"Feed da equipe",portais:"Visão do cliente",funil:"Funil de vendas"};
  const AB={cal:"Calendário",tarefas:"Tarefas",marca:"Marca",tend:"Tendência",hist:"Histórico"};
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
  const cargo=p=>p.admin?"Administra\u00e7\u00e3o":(AREA_ROT[(p.areas||[])[0]]||"Sem \u00e1rea");
  if(pendente){
    const p=ps.find(x=>x.nome===pendente)||{nome:pendente};
    return '<div class="login"><div class="login-box">'+
      '<div class="login-av">'+faceDe(p.nome)+'</div>'+
      '<h2>Ol\u00e1, '+esc(p.nome)+'</h2><p>Digite seu PIN para entrar.</p>'+
      '<input type="password" id="pinInput" inputmode="numeric" maxlength="8" placeholder="PIN" autocomplete="off">'+
      '<div id="pinErro" class="login-erro" role="alert"></div>'+
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
    if(reduz || alvo<=0 || !TELA_NOVA){ n.textContent=fmtN(alvo); return; }
    const dur=Math.min(900, 260+Math.min(alvo,40)*18); const ini=performance.now();
    const passo=t=>{ const p=Math.min(1,(t-ini)/dur);
      n.textContent=fmtN(Math.round(alvo*(1-Math.pow(1-p,3))));
      if(p<1) requestAnimationFrame(passo); };
    requestAnimationFrame(passo);
  });
  /* barras e anel crescendo (so na tela nova; num redesenho ja nascem no tamanho certo) */
  const aplicar=()=>{
    el.querySelectorAll("[data-alt]").forEach(b=>{ if(!TELA_NOVA) b.style.transition="none"; b.style.height=b.getAttribute("data-alt")+"%"; });
    el.querySelectorAll("[data-larg]").forEach(b=>{ if(!TELA_NOVA) b.style.transition="none"; b.style.width=b.getAttribute("data-larg")+"%"; });
    el.querySelectorAll("[data-arco]").forEach(a=>{ if(!TELA_NOVA) a.style.transition="none"; a.style.strokeDashoffset=a.getAttribute("data-arco"); });
  };
  if(TELA_NOVA && !reduz) requestAnimationFrame(aplicar); else aplicar();
}
/* so troca o HTML quando ele mudou: menu e barras nao sao recriados a cada clique */
function pintar(el,html){ if(!el) return; if(el.__h===html) return; el.innerHTML=html; el.__h=html; }
/* animacao de entrada so quando a tela muda de verdade; marcar uma tarefa nao faz o dashboard "piscar" */
let ULTIMA_TELA="", ANIM_T=null, TELA_NOVA=false;
function marcarTela(){
  const k=[USUARIO,VISTA.modo,VISTA.escopo,VISTA.aba,VISTA.area].join("|");
  TELA_NOVA = k!==ULTIMA_TELA; ULTIMA_TELA=k;
  const v=$("view"), sd=$("side");
  if(TELA_NOVA){ [v,sd].forEach(e=>e&&e.classList.add("anim")); clearTimeout(ANIM_T);
    ANIM_T=setTimeout(()=>[v,sd].forEach(e=>e&&e.classList.remove("anim")),900); }
}
function render(){
  document.body.classList.remove("menu-aberto");      /* navegar fecha o menu "Mais" do celular */
  marcarTela();
  if(!USUARIO){
    pintar($("ctx"),''); $("editbar").innerHTML=''; pintar($("side"),''); pintar($("areabar"),'');
    $("view").innerHTML = loginHTML(VISTA.pinPara);
    const pi=document.getElementById("pinInput"); if(pi&&pi.focus) setTimeout(()=>pi.focus(),30);
    return;
  }
  pintar($("ctx"), tituloContexto());
  $("editbar").innerHTML =
    '<button class="ubtn" data-undo="1"'+(UNDO.length?"":" disabled")+' title="Desfazer">&#8624; Desfazer</button>'+
    '<button class="ubtn" data-redo="1"'+(REDO.length?"":" disabled")+' title="Refazer">&#8625; Refazer</button>'+
    (ehAdmin()?'<button class="ubtn rec" data-recado="1" title="Texto pronto para o grupo">&#9998; Recado do dia</button>':'')+
    '<span class="salvo" id="salvo" aria-live="polite"></span>'+
    '<span class="syncst" id="syncst" title="Sincronização entre a equipe"></span>'+
    (agendaUrl()?'<span class="agviva" id="agviva">agenda ao vivo</span>':'')+
    ultimaAlteracaoHTML();
  marcarSync(SYNC_ON?"ligado":(window.firebase?"offline":"local"));
  pintar($("side"), sidebarHTML());
  pintar($("areabar"), areasTopoHTML());
  posicionarPill();

  const c = VISTA.escopo ? cliente(VISTA.escopo) : null;

  if(!c){
    let body;
    if((VISTA.modo==="tend"||VISTA.modo==="equipe"||VISTA.modo==="portais") && !ehAdmin()) VISTA.modo="lista";
    if(VISTA.modo==="funil" && !podeComercial()) VISTA.modo="lista";
    if(VISTA.modo==="equipe")     body = funcionariosHTML();
    else if(VISTA.modo==="tend")  body = tendenciaHTML();
    else if(VISTA.modo==="prio")  body = prioridadesHTML();
    else if(VISTA.modo==="cards") body = '<div class="cards">'+cardsHTML()+'</div>';
    else if(VISTA.modo==="feed")  body = feedHTML();
    else if(VISTA.modo==="portais") body = portaisHTML();
    else if(VISTA.modo==="funil")   body = (typeof funilHTML==="function" ? funilHTML() : '');
    else if(VISTA.modo==="cal")   body = calendario(tarefasArea(), marcosDaArea(CLIENTES.flatMap(x=>x.marcos)), true);
    else                          body = listaGlobalHTML();
    $("view").innerHTML = avisoGravacaoHTML()+body; animar(); gravarRota();
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
  const modos=["cards","feed","prio","equipe","lista","cal","tend","portais","funil"];
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
  if((VISTA.modo==="tend"||VISTA.modo==="equipe"||VISTA.modo==="portais") && !ehAdmin()) VISTA.modo="lista";
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
  if(ev.target && ev.target.id==="dfeita"){
    const cx=$("dfdata"); if(cx) cx.disabled = !ev.target.checked;
    return;
  }
  const alvo = ev.target.closest("[data-area],[data-modo],[data-cliente],[data-cliaba],[data-nav],[data-mes],[data-dia],[data-bucket],[data-editar],[data-feed],[data-mvmodo],[data-desrem],[data-irorig],[data-usaragenda],[data-relatorio],[data-relmes],[data-gerarlink],[data-abacli],[data-plano],[data-planomes],[data-macao],[data-undo],[data-redo],[data-wkok],[data-wkx],[data-nota],[data-vermotivo],[data-view],[data-area],[data-side],[data-dropx],[data-demanda],[data-recorrente],[data-recpausa],[data-recx],[data-demx],[data-demlimpa],[data-demobs],[data-demedit],[data-obst],[data-editarobst],[data-parcial],[data-delt],[data-excl],[data-rename],[data-restaurar],[data-lixeira],[data-clientes],[data-clied],[data-clinovo],[data-cliocultar],[data-clirestaurar],[data-veobs],[data-editarmotivo],[data-editarobs],[data-equipe],[data-trocarfoto],[data-pessoax],[data-pessoaxok],[data-pinrm],[data-rowok],[data-mover],[data-atrasadas],[data-portais],[data-recado],[data-abrir],[data-ficha],[data-irmes],[data-agenda],[data-atribuir],[data-compromisso],[data-avisar],[data-resp],[data-copiar],[data-novolink],[data-permb],[data-mesmover],[data-removedup],[data-motivo],[data-entrar],[data-pinok],[data-pincancel],[data-sair],[data-maismenu],[data-veratrasadas],[data-toastundo],[data-vertudo],[data-limpafiltro],[data-feitacheck]");
  if(!alvo) return;
  if(alvo.tagName==="A" && alvo.getAttribute("href") && novaAba(ev)) return;   /* abrir em outra aba */
  if(alvo.tagName==="A") ev.preventDefault();
  const D = alvo.dataset;

  if(D.entrar){ tentarEntrar(D.entrar); return; }
  if(D.pinok){
    const v=(($("pinInput")&&$("pinInput").value)||"").trim();
    const p=(ESTADO.pessoas||[]).find(x=>x.nome===D.pinok); const nome=D.pinok;
    pinConfere(p,v).then(ok=>{ if(p && ok){ entrar(nome); }
      else { const er=document.getElementById("pinErro"); if(er) er.textContent="PIN incorreto."; const pi=document.getElementById("pinInput"); if(pi){pi.value="";pi.focus();} } });
    return;
  }
  if(D.pincancel){ VISTA.pinPara=null; render(); return; }
  if(D.maismenu){ const ab=document.body.classList.toggle("menu-aberto"); ev.target.closest("[data-maismenu]").setAttribute("aria-expanded",ab); return; }
  if(D.veratrasadas){ if(VISTA.escopo) VISTA.aba="tarefas"; else VISTA.modo="lista"; VISTA.filtro="atrasado"; render(); window.scrollTo({top:0}); return; }
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
  if(D.mover){ MOVERMODO=true; abrirMover(D.mcid,D.mtid,D.mday); return; }   /* cada abertura comeca em Mover */
  if(D.atrasadas){ abrirAtrasadas(D.mday); return; }
  if(D.toastundo){ desfazer(); fecharToast(); return; }
  if(D.vertudo){ VISTA.verTudo=true; render(); return; }
  if(D.limpafiltro){ VISTA.filtro=null; render(); return; }
  if(D.demanda){ if(!USUARIO) return; abrirDemanda(D.demdia); return; }
  if(D.recorrente){ if(!USUARIO) return; abrirRecorrente(); return; }
  if(D.recpausa){ pausarRecorrente(D.recpausa); semPular(abrirRecorrente); return; }
  if(D.recx){ removerRecorrente(D.recx); semPular(abrirRecorrente); return; }
  if(D.equipe){ if(!ehAdmin()) return; abrirEquipe(); return; }
  if(D.motivo){ semPular(()=>abrirMotivo(D.mcid,D.mtid,D.mday,D.motivo)); return; }
  if(D.removedup){ semPular(()=>{ removeDup(D.mcid,D.mtid,D.mday); abrirMover(D.mcid,D.mtid,null,D.mday.slice(0,7)); }); toast("Cópia removida",true); return; }
  if(D.mesmover){ semPular(()=>abrirMover(D.mcid,D.mtid,D.mday||null,D.mesmover)); return; }
  if(D.permb){
    const p=(ESTADO.pessoas||[]).find(x=>x.nome===D.pnome); if(!p) return;
    const atual = D.permb==="admin" ? !!p.admin : ((p.areas||[]).indexOf(D.permb)>=0);
    setPerm(D.pnome, D.permb, !atual); return;
  }
  if(D.portais){ VISTA.escopo=null; VISTA.modo="portais"; VISTA.filtro=null; render(); window.scrollTo({top:0,behavior:"smooth"}); return; }
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
  if(D.pessoax){ confirmarRemoverPessoa(D.pessoax); return; }
  if(D.pinrm){ const n=D.pinrm; setPin(n,"").then(()=>semPular(abrirEquipe)); return; }
  if(D.pessoaxok){ const n=D.pessoaxok; semPular(()=>{ removePessoa(n); abrirEquipe(); }); toast(n+" removida da equipe",true); return; }
  if(D.demx){ const veio=modalAberto()&&/Demanda ·/.test(($("modal")||{}).innerHTML||"");
    semPular(()=>{ removeDemanda(D.demx); if(veio) fecharModal(); else abrirDemanda(); }); return; }
  if(D.demlimpa){ semPular(()=>{ limparDemandasFeitas(); abrirDemanda(); }); return; }
  if(D.demobs){ abrirObsDemanda(D.demobs, true); return; }
  if(D.demedit){
    const dm=(ESTADO.demandas||[]).find(x=>x.id===D.demedit);
    if(!podeEditarDem(dm)){ toast("Só dá para editar demanda que você mesmo criou",false); return; }
    abrirEditarDemanda(D.demedit); return;
  }
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
    setTimeout(()=>{ const c=document.querySelector(".chkp"); if(c) c.focus(); },40);   /* o foco volta para a caixa */
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
  if(D.feed){ VISTA.feedDias=Number(D.feed)||7; semPular(render); return; }
  if(D.mvmodo!==undefined){ MOVERMODO=(D.mvmodo==="1");
    if(D.mcid&&D.mtid) semPular(()=>abrirMover(D.mcid,D.mtid,null,null)); return; }
  if(D.desrem){ const p=D.desrem.split("|"); desfazerRemanejo(p[0],p[1]); return; }
  if(D.irorig){                       /* a etiqueta laranja volta para o dia de origem */
    const o=D.irorig, r0=d(o);
    VISTA.psem=segOf(o); VISTA.pano=r0.getFullYear(); VISTA.pmes=r0.getMonth();
    VISTA.dia=o; VISTA.filtro=null;
    render();
    setTimeout(()=>{
      const col=document.querySelector('[data-daycol="'+o+'"]');
      if(col){ col.classList.add("pisca"); col.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"});
               setTimeout(()=>col.classList.remove("pisca"),1600); }
    },60);
    return;
  }
  if(D.usaragenda){ const p=D.usaragenda.split("|"); usarDataDaAgenda(p[0],p[1]); return; }
  if(D.relatorio){ const p=D.relatorio.split("|"); abrirRelatorio(p[0],p[1]); return; }
  if(D.relmes){ const p=D.relmes.split("|"); semPular(()=>abrirRelatorio(p[0],p[1])); return; }
  if(D.abacli){ const p=D.abacli.split("|"); alternarAba(p[0],p[1]); return; }
  if(D.gerarlink){ if(!ehAdmin()) return; snapshot(); garantirToken(D.gerarlink);
    ESTADO.log.unshift({ts:new Date().toISOString(),cliente:D.gerarlink,acao:"novolink",nome:"Link do portal criado",quem:USUARIO||null});
    persist(); publicarEspelho(); semPular(render); toast("Link criado",true); return; }
  if(D.plano){ const p=D.plano.split("|"); abrirPlano(p[0],p[1]); return; }
  if(D.planomes){ const p=D.planomes.split("|"); semPular(()=>abrirPlano(p[0],p[1])); return; }
  if(D.editar){ abrirEditor(D.mcid, D.mtid); return; }
  if(D.undo){ desfazer(); return; }
  if(D.redo){ refazer(); return; }

  let topo = true;

  if(D.cliente){ VISTA.escopo=D.cliente; VISTA.aba=D.irAba||"cal"; VISTA.mes=0; VISTA.dia=null; VISTA.filtro=null; }   /* o link do Feed abre direto nas tarefas */
  if(D.nav==="home"){ VISTA.escopo=null; VISTA.filtro=null; VISTA.dia=null; }
  if(D.cliaba){ if(D.cliaba==="tend" && !ehAdmin()) return; VISTA.aba=D.cliaba; VISTA.filtro=null; VISTA.dia=null; }
  if(D.irmes!==undefined){ VISTA.mes=Number(D.irmes); VISTA.dia=null; topo=false; }
  else if(D.mes!==undefined){ const nn=Number(D.mes); VISTA.mes=(nn===0)?0:VISTA.mes+nn; VISTA.dia=null; topo=false; }
  if(D.bucket){ VISTA.filtro=(VISTA.filtro===D.bucket)?null:D.bucket; topo=false; }

  render();
  if(topo) window.scrollTo({top:0,behavior:"smooth"});
});

document.addEventListener("change", function(ev){
  if(ev.target.closest("[data-recform]")){ recForm(); return; }
  const pm=ev.target.closest("[data-perm]");
  if(pm){ setPerm(pm.dataset.pnome, pm.dataset.perm, pm.checked); return; }
  const pn=ev.target.closest("[data-pin]");
  if(pn){ const nm=pn.dataset.pin; if(!pn.value.trim()) return; setPin(nm, pn.value).then(()=>semPular(abrirEquipe)); return; }
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
  const dest=col.getAttribute("data-daycol");
  if(moverTarefa(p[0],p[1],dest)) toast("Movida para "+fmt(dest),true);
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
    const p=(ESTADO.pessoas||[]).find(x=>x.nome===nome); const alvo=e.target;
    pinConfere(p,v).then(ok=>{ if(p && ok) entrar(nome);
      else { const er=document.getElementById("pinErro"); if(er) er.textContent="PIN incorreto."; alvo.value=""; } });
    return;
  }
  const tag=(e.target.tagName||"").toLowerCase();
  /* span com papel de link/caixa: Enter e Espaco fazem o mesmo que o clique */
  if((e.key==="Enter"||e.key===" ") && tag==="span" && /^(link|checkbox|button)$/.test(e.target.getAttribute("role")||"")){
    e.preventDefault(); e.target.click(); return; }
  const digitando = tag==="input"||tag==="textarea"||tag==="select"||e.target.isContentEditable;
  if(e.key==="Escape"){ if(modalAberto()){ fecharModal(); return; } fecharToast(); return; }
  if(digitando) return;
  if(!USUARIO) return;
  const mod=e.ctrlKey||e.metaKey;
  if(mod && (e.key==="z"||e.key==="Z")){ e.preventDefault(); if(e.shiftKey) refazer(); else desfazer(); return; }
  if(mod) return;
  if(e.key==="?"){ e.preventDefault(); abrirAtalhos(); return; }
  if(modalAberto()) return;
  if(e.key==="n"||e.key==="N"){ e.preventDefault(); abrirDemanda(); return; }
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
