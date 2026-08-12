/* Portal do cliente — somente leitura. Usa as mesmas regras do painel. */
const C = CLIENTES[0];
const ORIGINAL = JSON.parse(JSON.stringify(C));
const CAMPOS_DATA = ["envioPlanejamento","aprovacaoPlanejamento","envioMidia","aprovacaoMidia","gravacao","alteracaoPedida"];
const $ = id => document.getElementById(id);
const esc = s => String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
let TAREFAS = regras(C).map(t=>({...t, st:status(t)}));
let RESULTADOS=null, OBJETIVO="", META=null, RECADO="", PENDENCIAS=null;
let TEM_ESPELHO=false, FONTE=null, ULTIMO=null, DASH_ABERTO=false;

/* aplica o estado publicado pela MK3 (o que foi marcado no painel) */
function aplicarEstado(E){
  if(!E) return;
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
function linkValido(E){
  const p=(E&&E.portais&&E.portais[CLIENTE_ID])||null;
  if(!p || !p.ativo) return true;             /* sem configuração = vale */
  return p.ativo===MEU_TOKEN;
}
function expirado(){
  document.getElementById("view").innerHTML=
    '<section class="bloco"><h2>Link expirado</h2>'+
    '<p>Este endereço foi substituído por um novo, por segurança. Peça o link atualizado à equipe da MK3.</p></section>';
}

$("hoje").textContent = HOJE.toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
$("titulo").textContent = C.nome;

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
  return '<section class="bloco"><h2>Tamb\u00e9m com voc\u00ea</h2>'+
    meus.map(t=>{
      const n = dias(t.data);
      const urg = n<0?"atrasado":n===0?"hoje":n===1?"umdia":"ok";
      const txt = n<0?("prazo venceu h\u00e1 "+Math.abs(n)+" dia"+(Math.abs(n)>1?"s":"")) : n===0?"vence hoje" : "faltam "+n+" dias";
      return '<div class="item i-'+urg+'"><div class="i-t">'+esc(t.tarefa)+'</div>'+
        '<div class="i-m">Prazo '+fmt(t.data)+' \u00b7 '+txt+'</div></div>';
    }).join("")+'</section>';
}

/* ---- 2) próximos passos (o que vem) ---- */
function proximos(){
  const hoje=iso(HOJE);
  const ts=TAREFAS.filter(t=>t.data && t.data>=hoje && t.st.k!=="ok" && t.fase!=="Contrato" && !/^pag_/.test(t.id))
    .sort((a,b)=>String(a.data).localeCompare(String(b.data))).slice(0,8);
  if(!ts.length) return '';
  return '<section class="bloco"><h2>Próximos passos</h2><div class="linha-lista">'+
    ts.map(t=>'<div class="ln"><span class="ln-d">'+fmt(t.data)+'</span>'+
      '<span class="ln-t">'+esc(t.tarefa)+'</span>'+
      '<span class="ln-q '+(t.resp==="Cliente"?"cli":"mk3")+'">'+(t.resp==="Cliente"?"com você":"com a MK3")+'</span></div>').join("")+
    '</div></section>';
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
function desenhar(){ $("view").innerHTML = heroHTML() + faltaVoce() + esperando() + resultados() + proximos() + historico(); ligarDash(); }
desenhar();

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
  const assinatura = JSON.stringify({c:v.concluidas,d:v.datas,r:v.resultados,a:v.ativo,p:v.pendencias});
  if(assinatura===ULTIMO){ marcarAtualizado(); return true; }   /* nada mudou: não redesenha */
  ULTIMO=assinatura;
  RESULTADOS = v.resultados || null; OBJETIVO = v.objetivo || ""; META = v.meta || null; RECADO = v.recado || ""; PENDENCIAS = v.pendencias || null;
  const E={concluidas:{},datas:{}};
  E.concluidas[CLIENTE_ID]=v.concluidas||[];
  E.datas[CLIENTE_ID]=v.datas||{};
  aplicarEstado(E); desenhar(); marcarAtualizado();
  return true;
}
function lerPublicado(){
  fetch("../../estado.json?ts="+Date.now())
    .then(r=>r.ok?r.json():null)
    .then(E=>{ if(!E) return; if(!linkValido(E)){ expirado(); return; } aplicarEstado(E); desenhar(); })
    .catch(()=>{});
}
function puxarEspelho(){
  if(!URL_ESP){ lerPublicado(); return; }
  fetch(URL_ESP+"?ts="+Date.now())
    .then(r=>r.ok?r.json():null)
    .then(v=>{ if(v && aplicarEspelho(v)){ TEM_ESPELHO=true; } else if(!TEM_ESPELHO){ lerPublicado(); } })
    .catch(()=>{ if(!TEM_ESPELHO) lerPublicado(); });
}
puxarEspelho();
if(URL_ESP && window.EventSource){
  try{
    FONTE=new EventSource(URL_ESP);
    FONTE.addEventListener("put",  ()=>puxarEspelho());
    FONTE.addEventListener("patch",()=>puxarEspelho());
    FONTE.onerror=()=>{ /* cai para a checagem periódica */ };
  }catch(e){}
}
setInterval(puxarEspelho, 60000);
document.addEventListener("visibilitychange",()=>{ if(!document.hidden) puxarEspelho(); });
