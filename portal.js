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
function desenhar(){ $("view").innerHTML = esperando() + proximos() + historico(); }
desenhar();
fetch("../../estado.json?ts="+Date.now())
  .then(r=>r.ok?r.json():null)
  .then(E=>{ if(!E) return; if(!linkValido(E)){ expirado(); return; } aplicarEstado(E); desenhar(); })
  .catch(()=>{});
