/* Portal do cliente — somente leitura. Usa as mesmas regras do painel. */
const C = CLIENTES[0];
const ORIGINAL = JSON.parse(JSON.stringify(C));
const CAMPOS_DATA = ["envioPlanejamento","aprovacaoPlanejamento","envioMidia","aprovacaoMidia","gravacao","alteracaoPedida"];
const $ = id => document.getElementById(id);
const esc = s => String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
let TAREFAS = regras(C).map(t=>({...t, st:status(t)}));

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
function esperando(){
  const meus = TAREFAS.filter(t=>t.resp==="Cliente" && t.st.k!=="ok" && t.data)
    .sort((a,b)=>String(a.data).localeCompare(String(b.data)));
  const ct = contadores(C);
  if(!meus.length) return '<section class="bloco ok"><h2>Nada esperando você</h2>'+
    '<p>Está tudo com a gente no momento. Assim que houver algo para aprovar, aparece aqui.</p></section>';
  return '<section class="bloco"><h2>Esperando você</h2>'+
    meus.map(t=>{
      const c48 = ct.find(x=>("Aprovação de "+x.tipo).toLowerCase()===t.tarefa.toLowerCase());
      const n = dias(t.data);
      const urg = n<0?"atrasado":n===0?"hoje":n===1?"umdia":"ok";
      const txt = n<0?("prazo venceu há "+Math.abs(n)+" dia"+(Math.abs(n)>1?"s":"")) : n===0?"vence hoje" : "faltam "+n+" dias";
      return '<div class="item i-'+urg+'"><div class="i-t">'+esc(t.tarefa)+'</div>'+
        '<div class="i-m">Prazo '+fmt(t.data)+' · '+txt+
        (c48?' · enviado em '+fmt(c48.enviado):'')+'</div></div>';
    }).join("")+
    '<p class="nota">Sem retorno até o prazo, seguimos com a aprovação automática para não travar a produção.</p></section>';
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

/* ---- resultados do mês (dados do Reportei, enviados pela MK3) ---- */
let RESULTADOS=null;
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
    '<p class="nota">Todos os números do mês, direto da nossa ferramenta de relatórios. Atualiza sozinho.</p>'+
    '<div class="dash-box" id="dashBox">'+
      '<button class="dash-abrir" id="dashAbrir">Carregar painel completo</button>'+
      '<a class="res-link" href="'+esc(r.dash)+'" target="_blank" rel="noopener">ou abrir em outra aba</a>'+
    '</div></section>'):'');
}
function ligarDash(){
  const b=document.getElementById("dashAbrir"); if(!b) return;
  b.onclick=()=>{
    const ks=Object.keys(RESULTADOS||{}).sort(); const r=RESULTADOS[ks[ks.length-1]]; if(!r||!r.dash) return;
    const cx=document.getElementById("dashBox");
    cx.innerHTML='<div class="dash-carrega">Carregando o painel, isso leva alguns segundos...</div>'+
      '<iframe class="dash-fr" src="'+esc(r.dash)+'" loading="lazy" title="Painel de resultados"></iframe>'+
      '<a class="res-link" href="'+esc(r.dash)+'" target="_blank" rel="noopener">abrir em outra aba</a>';
    const fr=cx.querySelector(".dash-fr");
    fr.addEventListener("load",()=>{ const c=cx.querySelector(".dash-carrega"); if(c) c.remove(); fr.classList.add("pronto"); });
  };
}
function desenhar(){ $("view").innerHTML = esperando() + resultados() + proximos() + historico(); ligarDash(); }
desenhar();

/* ---- atualização automática: lê só o nó deste link no banco da MK3 ---- */
const URL_ESP = (typeof MK3_DB!=="undefined" && MK3_DB) ? (MK3_DB+"/painel/publico/"+MEU_TOKEN+".json") : null;
let TEM_ESPELHO=false, FONTE=null;

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
  RESULTADOS = v.resultados || null;
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
