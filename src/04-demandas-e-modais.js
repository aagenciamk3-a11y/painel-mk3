/* ================= DEMANDAS RECORRENTES =================
   Uma regra (ESTADO.recorrentes) gera ocorrencias na janela abaixo.
   Destino por AREA: todos da area + administracao veem.
   Destino por PESSOA: so a pessoa + administracao veem.
   Quem nao e da administracao so cria recorrente para si mesmo.        */
const REC_PASSADO=30, REC_FUTURO=45;            /* dias gerados para tras e para frente */
const FREQ_ROT={semanal:"Toda semana",mensal:"Todo mês",util:"Todo dia útil",quinzenal:"A cada 15 dias"};
const DOW_ROT=["domingo","segunda","terça","quarta","quinta","sexta","sábado"];
/* AREA_ROT (nome de cada area) mora em 02-interface.js: um lugar so para o painel inteiro */
function regraRecTexto(r){
  if(r.freq==="semanal") return ((r.dow===0||r.dow===6)?"Todo ":"Toda ")+DOW_ROT[r.dow];
  if(r.freq==="mensal")  return "Todo dia "+r.dia+" do mês";
  if(r.freq==="quinzenal") return "A cada 15 dias, desde "+fmt(r.inicio);
  return "Todo dia útil";
}
function datasRec(r,de,ate){
  const out=[]; const ini=(r.inicio&&r.inicio>de)?r.inicio:de;
  if(ini>ate) return out;
  if(r.freq==="mensal"){
    let y=+ini.slice(0,4), m=+ini.slice(5,7)-1;
    for(let k=0;k<5;k++){
      const ult=new Date(y,m+1,0).getDate();
      const s=iso(new Date(y,m,Math.min(Number(r.dia)||1,ult)));
      if(s>=ini && s<=ate) out.push(s);
      m++; if(m>11){ m=0; y++; }
    }
    return out;
  }
  for(let cur=ini; cur<=ate; cur=addD(cur,1)){
    const dw=d(cur).getDay();
    if(r.freq==="util"){ if(dw>=1 && dw<=5) out.push(cur); }
    else if(r.freq==="semanal"){ if(dw===Number(r.dow)) out.push(cur); }
    else if(r.freq==="quinzenal"){
      const n=Math.round((d(cur)-d(r.inicio))/86400000);
      if(n>=0 && n%14===0) out.push(cur);
    }
  }
  return out;
}
/* por pessoa: so ela e a administracao. Por area: o filtro de area de sempre resolve */
function recVisivel(r){
  if(r.alvo!=="pessoa") return true;
  if(!USUARIO) return false;
  return ehAdmin() || USUARIO===r.resp;
}
function ocorrenciasRec(){
  const out=[]; const hoje=iso(HOJE);
  const de=addD(hoje,-REC_PASSADO), ate=addD(hoje,REC_FUTURO);
  const exc=((ESTADO.excluidas||{})["_rec"])||[];
  const conc=(ESTADO.concluidas&&ESTADO.concluidas["_rec"])||[];
  (ESTADO.recorrentes||[]).forEach(r=>{
    if(!r || r.pausada || !recVisivel(r)) return;
    const cli=r.cli?CLIENTES.find(c=>c.id===r.cli):null;
    const pessoa=r.alvo==="pessoa";
    /* a pessoa so enxerga as areas dela: a ocorrencia cai numa area que ela ve */
    let area=r.area||"mkt";
    if(pessoa){
      const p=(ESTADO.pessoas||[]).find(x=>x.nome===r.resp);
      if(p && !p.admin){ const as=(p.areas||[]).filter(a=>a!=="all"); if(as.length && as.indexOf(area)<0) area=as[0]; }
    }
    datasRec(r,de,ate).forEach(dia=>{
      const id=r.id+"@"+dia;
      if(exc.indexOf(id)>=0) return;
      const done=conc.filter(e=>((e&&e.id)?e.id:e)===id).pop();
      const feita=!!(done&&!done.remove);
      if(!feita && r.criadaEm && dia<r.criadaEm) return;   /* nao cobra o que veio antes de existir */
      const t={id:id, clienteId:"_rec", cliDem:(cli?cli.id:null), recId:r.id, soPara:(pessoa?r.resp:null),
               cliente:(cli?cli.nome:(pessoa?r.resp:"Recorrente")),
               tarefa:r.texto, detalhe:regraRecTexto(r)+(r.obs?" · "+r.obs:""), obs:r.obs||"",
               data:dia, resp:(pessoa?r.resp:(AREA_ROT[area]||"")),
               fase:(pessoa?"Demanda":"Recorrente"), area:area,
               feita:feita, dataConclusao:(done&&done.data)||null};
      t.st=status(t);
      out.push(t);
    });
  });
  return out;
}
const podeMexerRec = r => !!r && (ehAdmin() || (!!USUARIO && r.criadaPor===USUARIO));
function addRecorrente(o){
  if(!USUARIO) return;
  snapshot();
  ESTADO.recorrentes=ESTADO.recorrentes||[];
  if(!ehAdmin()){ o.alvo="pessoa"; o.resp=USUARIO; }
  const id="rec_"+Date.now()+"_"+Math.floor(Math.random()*1000);
  const r={id:id, texto:o.texto, area:o.area, alvo:(o.alvo==="pessoa"?"pessoa":"area"),
           resp:(o.alvo==="pessoa"?o.resp:""), freq:o.freq, dow:Number(o.dow), dia:Number(o.dia)||1,
           inicio:o.inicio||iso(HOJE), cli:o.cli||null, obs:(o.obs||"").trim(),
           criadaPor:USUARIO||null, criadaEm:iso(HOJE), pausada:false};
  ESTADO.recorrentes.push(r);
  ESTADO.log.unshift({ts:new Date().toISOString(),acao:"recorrente",id:id,nome:r.texto,area:r.area,
                      resp:(r.alvo==="pessoa"?r.resp:(AREA_ROT[r.area]||"")),quem:USUARIO||null});
  ESTADO.log=ESTADO.log.slice(0,300);
  persist(); rebuild(); render();
}
function pausarRecorrente(id){
  const r=(ESTADO.recorrentes||[]).find(x=>x.id===id);
  if(!podeMexerRec(r)){ toast("Só quem criou, ou a administração, mexe nessa recorrente",false); return; }
  snapshot();
  r.pausada=!r.pausada;
  ESTADO.log.unshift({ts:new Date().toISOString(),acao:"recpausa",id:id,nome:r.texto,area:r.area,quem:USUARIO||null});
  ESTADO.log=ESTADO.log.slice(0,300);
  persist(); rebuild(); render();
}
function removerRecorrente(id){
  const r=(ESTADO.recorrentes||[]).find(x=>x.id===id);
  if(!podeMexerRec(r)){ toast("Só quem criou, ou a administração, remove essa recorrente",false); return; }
  snapshot();
  ESTADO.recorrentes=(ESTADO.recorrentes||[]).filter(x=>x.id!==id);
  const pre=id+"@";
  ESTADO.concluidas["_rec"]=(ESTADO.concluidas["_rec"]||[]).filter(e=>String((e&&e.id)?e.id:e).indexOf(pre)!==0);
  if(ESTADO.excluidas && ESTADO.excluidas["_rec"]) ESTADO.excluidas["_rec"]=ESTADO.excluidas["_rec"].filter(x=>String(x).indexOf(pre)!==0);
  ESTADO.log.unshift({ts:new Date().toISOString(),acao:"recorrentex",id:id,nome:r.texto,area:r.area,quem:USUARIO||null});
  ESTADO.log=ESTADO.log.slice(0,300);
  persist(); rebuild(); render();
}
function listaRecorrentes(){
  const todas=(ESTADO.recorrentes||[]).filter(recVisivel);
  if(!todas.length) return '<div class="dem-lista"><div class="dem-vazio">Nenhuma recorrente ainda. A primeira que você criar aparece aqui.</div></div>';
  const linha=r=>{
    const cli=r.cli?CLIENTES.find(c=>c.id===r.cli):null;
    const quem=r.alvo==="pessoa"?("Só "+r.resp):("Área: "+(AREA_ROT[r.area]||r.area));
    return '<div class="dem-row'+(r.pausada?" feita":"")+'">'+
      '<span class="dem-d">'+esc(regraRecTexto(r))+(r.pausada?' · pausada':'')+'</span>'+
      '<span class="dem-t">'+esc(r.texto)+(cli?' <i>'+esc(cli.nome)+'</i>':'')+
        (r.obs?'<span class="dem-obs">&#128221; '+esc(r.obs)+'</span>':'')+'</span>'+
      '<span class="dem-r">'+esc(quem)+'</span>'+
      (podeMexerRec(r)
        ? '<button class="dem-e" data-recpausa="'+escAttr(r.id)+'" title="'+(r.pausada?'Retomar':'Pausar')+'" aria-label="'+(r.pausada?'Retomar':'Pausar')+'">'+(r.pausada?'&#9654;':'&#10074;&#10074;')+'</button>'+
          '<button class="dem-x" data-recx="'+escAttr(r.id)+'" title="Remover" aria-label="Remover recorrente">&#215;</button>'
        : '<span class="dem-x off" title="Só quem criou pode mexer">&#215;</span>')+'</div>';
  };
  return '<div class="dem-lista">'+
    '<div class="dem-lista-h">Recorrentes cadastradas <span class="dem-n">'+todas.filter(r=>!r.pausada).length+' ativas</span></div>'+
    todas.map(linha).join("")+'</div>';
}
function recForm(){
  const f=$("rfreq"); if(!f) return;
  const v=f.value;
  if($("rl-dow")) $("rl-dow").style.display=(v==="semanal")?"":"none";
  if($("rl-dia")) $("rl-dia").style.display=(v==="mensal")?"":"none";
  const a=$("ralvo");
  if(a && $("rl-pessoa")) $("rl-pessoa").style.display=(a.value==="pessoa")?"":"none";
}
function abrirRecorrente(){
  if(!USUARIO) return;
  const admin=ehAdmin();
  const minhas=admin?["mkt","fin","com"]:areasDe().filter(a=>a!=="all");
  const areas=[["mkt","Marketing Digital"],["fin","Financeiro"],["com","Comercial"]].filter(a=>minhas.indexOf(a[0])>=0);
  const pessoas=(ESTADO.pessoas||[]).map(p=>p.nome);
  const hj=iso(HOJE), dwHoje=HOJE.getDay();
  const dows=[1,2,3,4,5,6,0];
  const mm=$("modal");
  mm.innerHTML='<div class="mbox demform"><h3>Demanda recorrente</h3>'+
    '<p class="msub">Ela se repete sozinha no painel, na frequência que você escolher.</p>'+
    '<label class="mlab">O que é a demanda<input type="text" id="rtexto" placeholder="Ex.: conferir o código reserva, postar o relatório..." autocomplete="off" data-focar></label>'+
    '<label class="mlab">Cliente <i class="opt-l">(opcional)</i><select id="rcli"><option value="">Sem cliente / interno</option>'+
      CLIENTES.map(c=>'<option value="'+c.id+'">'+esc(c.nome)+'</option>').join("")+'</select></label>'+
    (admin
      ? '<label class="mlab">Para quem<select id="ralvo" data-recform="1">'+
          '<option value="area">Uma área: todos da área e a administração veem</option>'+
          '<option value="pessoa">Uma pessoa: só ela e a administração veem</option></select></label>'+
        '<label class="mlab" id="rl-pessoa" style="display:none">Pessoa<select id="rresp">'+
          pessoas.map(p=>'<option>'+esc(p)+'</option>').join("")+'</select></label>'
      : '<p class="mhint">Você cria recorrente só para você: só você e a administração veem.</p>')+
    '<label class="mlab">Área<select id="rarea">'+areas.map(a=>'<option value="'+a[0]+'">'+a[1]+'</option>').join("")+'</select></label>'+
    '<label class="mlab">Frequência<select id="rfreq" data-recform="1">'+
      '<option value="semanal">Toda semana</option><option value="mensal">Todo mês</option>'+
      '<option value="util">Todo dia útil (segunda a sexta)</option><option value="quinzenal">A cada 15 dias</option></select></label>'+
    '<label class="mlab" id="rl-dow">Dia da semana<select id="rdow">'+
      dows.map(n=>'<option value="'+n+'"'+(n===dwHoje?' selected':'')+'>'+DOW_ROT[n]+'</option>').join("")+'</select></label>'+
    '<label class="mlab" id="rl-dia" style="display:none">Dia do mês<input type="number" id="rdia" min="1" max="31" value="'+HOJE.getDate()+'">'+
      '<span class="mhint">Em mês mais curto, cai no último dia.</span></label>'+
    '<label class="mlab">A partir de<input type="date" id="rini" value="'+hj+'">'+
      '<span class="mhint">Na frequência de 15 dias, esta é a primeira data.</span></label>'+
    '<label class="mlab">Observações <i class="opt-l">(opcional)</i><textarea id="robs" rows="2"></textarea></label>'+
    '<div class="mbtns"><button data-macao="salvarrecorrente">Criar recorrente</button><button class="sec" data-macao="fechar">Fechar</button></div>'+
    listaRecorrentes()+
  '</div>';
  mostrarModal();
  recForm();
}
function abrirEditorRec(id){
  const t=TODAS.find(x=>x.clienteId==="_rec"&&x.id===id); if(!t) return;
  const r=(ESTADO.recorrentes||[]).find(x=>x.id===t.recId);
  const feita=t.st.k==="ok";
  const mm=$("modal");
  mm.innerHTML='<div class="mbox"><h3>'+esc(t.tarefa)+'</h3>'+
    '<p class="msub">Recorrente · '+esc(r?regraRecTexto(r):"")+' · '+fmt(t.data)+' · '+
      esc(t.soPara?("só "+t.soPara):(AREA_ROT[t.area]||""))+
      (t.cliDem?' · '+esc(t.cliente):'')+
      (r&&r.criadaPor?' <i class="opt-l">(criada por '+esc(r.criadaPor)+')</i>':'')+'</p>'+
    (t.obs?'<p class="mok">&#128221; '+esc(t.obs)+'</p>':'')+
    (feita
      ? '<p class="mok">Concluída'+(t.st.quando?" em "+fmt(t.st.quando):"")+'.</p>'+
        blocoCorrigir("_rec", id, t.st.quando)+
        '<div class="mbtns wrap"><button class="danger" data-macao="desfazer" data-mcid="_rec" data-mtid="'+escAttr(id)+'">Reabrir</button></div>'
      : blocoConcluir("_rec", id, t, "Concluir"))+
    '<div class="mbtns wrap"><button class="sec" data-recorrente="1">Ver recorrentes</button>'+
      '<button class="sec" data-macao="fechar">Fechar</button></div></div>';
  mostrarModal(true);
}
function addDemanda(texto,area,data,resp,obs,cli,feitaEm){
  snapshot();
  ESTADO.demandas=ESTADO.demandas||[];
  const id="dem_"+Date.now()+"_"+Math.floor(Math.random()*1000);
  /* quem nao e da administracao so cria demanda para si mesmo */
  if(!ehAdmin() && USUARIO) resp=USUARIO;
  ESTADO.demandas.push({id:id,texto:texto,area:area,data:data,resp:resp,obs:(obs||"").trim(),
                        cli:cli||null, criadaPor:USUARIO||null});
  ESTADO.log.unshift({ts:new Date().toISOString(),acao:"demanda",id:id,nome:texto,area:area,data:data,resp:resp,quem:USUARIO||null});
  /* demanda de coisa que ja aconteceu: nasce concluida, sem ter que
     criar agora e voltar depois so para marcar */
  if(feitaEm && feitaEm<=iso(HOJE)){
    ESTADO.concluidas["_dem"]=(ESTADO.concluidas["_dem"]||[]).filter(e=>((e&&e.id)?e.id:e)!==id);
    ESTADO.concluidas["_dem"].push({id:id,data:feitaEm});
    ESTADO.log.unshift({ts:new Date().toISOString(),acao:"concluir",id:id,nome:texto,data:feitaEm,quem:USUARIO||null});
  }
  ESTADO.log=ESTADO.log.slice(0,300);
  persist(); rebuild(); render();
  return id;
}
/* a administracao apaga qualquer uma; os demais, so a que criaram */
function podeApagarDem(x){
  if(!x) return false;
  if(ehAdmin()) return true;
  return !!USUARIO && x.criadaPor===USUARIO;
}
function removeDemanda(id){
  const x=(ESTADO.demandas||[]).find(d=>d.id===id);
  if(!podeApagarDem(x)){ toast("Só dá para remover demanda que você mesmo criou",false); return; }
  snapshot();
  ESTADO.demandas=(ESTADO.demandas||[]).filter(d=>d.id!==id);
  ESTADO.log.unshift({ts:new Date().toISOString(),acao:"demandax",id:id,nome:x.texto,area:x.area,quem:USUARIO||null});
  ESTADO.log=ESTADO.log.slice(0,300);
  persist(); rebuild(); render();
}
/* faxina: tira de uma vez o que ja foi concluido */
function limparDemandasFeitas(){
  if(!ehAdmin()) return;
  const feitas=(ESTADO.demandas||[]).filter(x=>demConcluida(x.id));
  if(!feitas.length){ toast("Não há demanda concluída para limpar",false); return; }
  snapshot();
  const ids=feitas.map(x=>x.id);
  ESTADO.demandas=(ESTADO.demandas||[]).filter(x=>ids.indexOf(x.id)<0);
  ESTADO.concluidas["_dem"]=(ESTADO.concluidas["_dem"]||[]).filter(e=>ids.indexOf((e&&e.id)?e.id:e)<0);
  ESTADO.log.unshift({ts:new Date().toISOString(),acao:"demandax",
    nome:"Limpou "+feitas.length+" demanda"+(feitas.length>1?"s":"")+" concluída"+(feitas.length>1?"s":""),
    quem:USUARIO||null});
  ESTADO.log=ESTADO.log.slice(0,300);
  persist(); rebuild(); render();
  toast(feitas.length+" demanda"+(feitas.length>1?"s removidas":" removida"),true);
}
function demConcluida(id){ const e=(ESTADO.concluidas["_dem"]||[]).find(x=>((x&&x.id)?x.id:x)===id); return !!(e&&!e.remove); }
function listaDemandas(){
  const todas=(ESTADO.demandas||[]).slice().sort((a,b)=>String(b.data).localeCompare(String(a.data)));
  if(!todas.length) return '<div class="dem-lista"><div class="dem-vazio">Nenhuma demanda cadastrada ainda. A primeira que você criar aparece aqui, com opção de editar depois.</div></div>';
  const A=AREA_ROT;
  const linha=x=>{
    const feita=demConcluida(x.id);
    return '<div class="dem-row'+(x.obs?" comobs":"")+(feita?" feita":"")+'">'+
      '<span class="dem-d">'+(feita?'<i class="dem-ok">&#10003;</i> ':'')+fmt(x.data)+'</span>'+
      '<span class="dem-t">'+esc(x.texto)+' <i>'+(A[x.area]||"")+'</i>'+
        (x.obs?'<span class="dem-obs">&#128221; '+esc(x.obs)+'</span>':'')+'</span>'+
      '<span class="dem-r">'+esc(x.resp)+'</span>'+
      (podeEditarDem(x)?'<button class="dem-e" data-demedit="'+escAttr(x.id)+'" title="Editar demanda (texto, data, área, responsável)" aria-label="Editar demanda">&#9881;</button>':'')+
      '<button class="dem-e" data-demobs="'+escAttr(x.id)+'" title="Observações" aria-label="Observações">&#9998;</button>'+
      (podeApagarDem(x)
        ? '<button class="dem-x" data-demx="'+escAttr(x.id)+'" title="Remover" aria-label="Remover demanda">&#215;</button>'
        : '<span class="dem-x off" title="Só quem criou pode remover">&#215;</span>')+'</div>';
  };
  const pend=todas.filter(x=>!demConcluida(x.id));
  const feitas=todas.filter(x=>demConcluida(x.id));
  const limpar = ehAdmin() && feitas.length
    ? '<button class="dem-limpa" data-demlimpa="1" title="Remove de uma vez todas as demandas já concluídas">'+
      'Limpar as '+feitas.length+' concluída'+(feitas.length>1?'s':'')+'</button>' : '';
  return '<div class="dem-lista">'+
    '<div class="dem-lista-h">Demandas cadastradas <span class="dem-n">'+pend.length+' em aberto</span>'+limpar+'</div>'+
    (pend.length?pend.map(linha).join(""):'<div class="dem-vazio">Nada em aberto.</div>')+
    (feitas.length?'<details class="dem-feitas"><summary>Concluídas ('+feitas.length+') — ainda dá para editar ou corrigir a data</summary>'+
       feitas.map(linha).join("")+'</details>':'')+
  '</div>';
}
/* o link do cliente nao existe dentro do repositorio: o token e gerado aqui,
   fica no estado sincronizado e viaja so no endereco, depois do # */
function novoToken(){
  const a=new Uint8Array(16);
  (window.crypto||window.msCrypto).getRandomValues(a);
  return Array.from(a).map(x=>x.toString(16).padStart(2,"0")).join("");
}
function portalDe(cid){
  ESTADO.portais=ESTADO.portais||{};
  return ESTADO.portais[cid]||null;
}
function garantirToken(cid){
  ESTADO.portais=ESTADO.portais||{};
  const p=ESTADO.portais[cid];
  if(p && p.ativo) return p.ativo;
  const tk=novoToken();
  ESTADO.portais[cid]=Object.assign({revogados:[],historico:false}, p||{}, {ativo:tk, quando:iso(HOJE)});
  return tk;
}
function urlPortal(tk){
  const base=location.origin+location.pathname.replace(/\/(index\.html)?$/,"");
  return base+"/c/#t="+tk;
}
function pendCliHTML(c){
  const pend=contadores(c);
  if(!pend.length) return '<div class="pv-esp"><span class="pv-pok">Nada esperando o cliente</span></div>';
  return '<div class="pv-esp">'+pend.sort((a,b)=>String(a.vencimento).localeCompare(String(b.vencimento))).map(x=>{
      const nn=uteisAte(x.vencimento);
      const k=nn<0?"atrasado":nn===0?"hoje":nn===1?"umdia":"ok";
      const txt=nn<0?("aprovou sozinho h\u00e1 "+Math.abs(nn)+" dia"+(Math.abs(nn)>1?"s":""))
              :nn===0?"aprova sozinho hoje"
              :nn===1?"falta 1 dia \u00fatil":"faltam "+nn+" dias \u00fateis";
      return '<span class="pv-p'+k+'">Aprovar '+esc(x.tipo)+' \u00b7 '+txt+'</span>';
    }).join("")+'</div>';
}
/* o cliente pode ver as duas abas ou so uma; util para soltar uma novidade
   para um cliente antes dos outros */
const ABASPORTAL = [["geral","Visão geral"],["trafego","Tráfego pago"]];
function abasDe(cid){
  const p=portalDe(cid);
  return (p && p.abas && p.abas.length) ? p.abas.slice() : ["geral","trafego"];
}
function alternarAba(cid, aba){
  if(!ehAdmin()) return;
  const at=abasDe(cid);
  const i=at.indexOf(aba);
  let nova = i>=0 ? at.filter(x=>x!==aba) : ABASPORTAL.map(a=>a[0]).filter(x=>at.indexOf(x)>=0 || x===aba);
  if(!nova.length){ toast("O cliente precisa enxergar pelo menos uma aba",false); return; }
  snapshot();
  ESTADO.portais=ESTADO.portais||{};
  ESTADO.portais[cid]=Object.assign({}, ESTADO.portais[cid]||{}, {abas:nova});
  ESTADO.log.unshift({ts:new Date().toISOString(),cliente:cid,acao:"abasportal",
    nome:"O cliente passa a ver: "+nova.map(x=>(ABASPORTAL.find(a=>a[0]===x)||["",x])[1]).join(" e "),quem:USUARIO||null});
  persist(); publicarEspelho(); semPular(render);
}
function abasCliHTML(cid, p){
  const at=abasDe(cid);
  return '<div class="pv-abas"><span>O cliente vê</span>'+
    ABASPORTAL.map(a=>'<button class="pv-ab'+(at.indexOf(a[0])>=0?" on":"")+'" data-abacli="'+escAttr(cid)+'|'+a[0]+'">'+
      a[1]+'</button>').join("")+'</div>';
}
/* ---- Visao do cliente: escolhe o cliente, ve o que esta com ele e leva o link ---- */
function portaisHTML(){
  if(!ehAdmin()) return '<div class="fd-vazio">Tela só da administração.</div>';
  const cards=CLIENTES.map(c=>{
    const cor=coresDe(c);
    const p=portalDe(c.id);
    const topo='<div class="ccard-banner" style="background:linear-gradient(135deg,'+cor[0]+' 0%,'+cor[1]+' 100%)"></div>'+
      avatarHTML(c,"ccard-av")+
      '<div class="ccard-body"><div class="ccard-top"><h3>'+esc(c.nome)+'</h3>'+
      (p&&p.historico?'<span class="badge-ativo comhist">com histórico</span>':'')+'</div>';
    if(!p || !p.ativo) return '<div class="ccard pvcard">'+topo+
      pendCliHTML(c)+
      '<div class="pv-sem">Ainda sem link. Gere um para este cliente.</div>'+
      '<div class="pv-btns"><button class="pv-b principal" data-gerarlink="'+escAttr(c.id)+'">Gerar link</button></div>'+
      '</div></div>';
    const url=urlPortal(p.ativo);
    const nrev=(p.revogados||[]).length;
    return '<div class="ccard pvcard">'+topo+
      pendCliHTML(c)+
      '<div class="pv-url" title="'+escAttr(url)+'">'+esc(url.replace(/^https?:\/\//,""))+'</div>'+
      (nrev?'<div class="pv-aviso">'+nrev+' link'+(nrev>1?'s':'')+' antigo'+(nrev>1?'s':'')+' já derrubado'+(nrev>1?'s':'')+'</div>':'')+
      abasCliHTML(c.id, p)+
      '<div class="pv-btns">'+
        '<button class="pv-b principal" data-copiar="'+escAttr(url)+'">Copiar link</button>'+
        '<a class="pv-b" href="'+escAttr(url)+'" target="_blank" rel="noopener">Abrir</a>'+
        '<button class="pv-b sec" data-novolink="'+escAttr(c.id)+'" title="Gera um endereço novo e derruba o atual na hora">Trocar</button>'+
      '</div></div></div>';
  }).join("");
  return '<section class="pvista">'+
    '<p class="pv-intro">A p\u00e1gina que cada cliente enxerga: o objetivo dele, os n\u00fameros do m\u00eas, '+
    'o que est\u00e1 esperando aprova\u00e7\u00e3o e, quando tem tr\u00e1fego pago, os leads que chegaram. '+
    'A chave fica depois do # do endere\u00e7o, ent\u00e3o n\u00e3o aparece em log de servidor nem no reposit\u00f3rio. '+
    'Trocar o link derruba o antigo na hora.</p>'+
    '<div class="cards">'+cards+'</div>'+
    '<p class="nota-p">O que voc\u00ea marca no painel chega ao cliente na publica\u00e7\u00e3o autom\u00e1tica, '+
    'toda manh\u00e3 em dia \u00fatil.</p></section>';
}

function trocarLink(cid){
  if(!ehAdmin()) return;
  snapshot();
  ESTADO.portais=ESTADO.portais||{};
  const p=ESTADO.portais[cid]||{};
  const velho=p.ativo||null;
  ESTADO.portais[cid]={ativo:novoToken(),
    revogados:(p.revogados||[]).concat(velho?[velho]:[]).slice(-10),
    historico:!!p.historico, quando:iso(HOJE)};
  ESTADO.log.unshift({ts:new Date().toISOString(),cliente:cid,acao:"novolink",nome:"Link do portal trocado",quem:USUARIO||null});
  persist(); publicarEspelho(); semPular(render);
  toast("Link novo gerado. O antigo já parou de funcionar.",false);
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
  const inativos=ORIG.concat(ESTADO.novosClientes||[]).filter(c=>(ed[c.id]||{}).oculto);
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
          '<button class="pc-ico rm" data-cliocultar="'+escAttr(c.id)+'" title="Arquivar cliente" aria-label="Arquivar cliente">&#128230;</button>'+
        '</div></div>';
    }).join("")+'</div>'+
    (inativos.length?'<details class="dem-feitas"><summary>Clientes inativos ('+inativos.length+')</summary>'+
      '<p class="msub">Saíram do painel, mas nada foi apagado. O link do portal está fora do ar e volta a valer na reativação.</p>'+
      inativos.map(c=>{ const q=(ed[c.id]||{}).arquivadoEm;
        return '<div class="ex-row"><span class="ex-t">'+esc(((ed[c.id]||{}).nome)||c.nome)+
          (q?' <i class="opt-l">arquivado em '+fmt(q)+'</i>':'')+'</span>'+
          '<button data-clirestaurar="'+escAttr(c.id)+'">Reativar</button></div>'; }).join("")+'</details>':'')+
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
    ESTADO.log.unshift({ts:new Date().toISOString(),cliente:id,acao:"cliente-editado",nome:dados.nome||id,quem:USUARIO||null});
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
    ESTADO.log.unshift({ts:new Date().toISOString(),cliente:novoId,acao:"cliente-novo",nome:dados.nome||"",quem:USUARIO||null});
  }
  persist(); rebuild(); render();
}
/* Arquivar nao apaga nada: o cliente sai do painel, o link do portal para
   de abrir e o token fica guardado. Se ele voltar, reativar devolve tudo. */
function ocultarCliente(id,valor){
  if(!ehAdmin()) return;
  snapshot();
  ESTADO.clientes=ESTADO.clientes||{};
  ESTADO.clientes[id]={...(ESTADO.clientes[id]||{}), oculto:!!valor,
                       arquivadoEm: valor ? iso(HOJE) : null};
  const nm=(nomeArquivado(id)||id);
  if(valor) desligarPortal(id); else religarPortal(id);
  ESTADO.log.unshift({ts:new Date().toISOString(),cliente:id,nome:nm,
    acao:(valor?"arquivar":"reativar"),quem:USUARIO||null});
  ESTADO.log=ESTADO.log.slice(0,300);
  persist(); rebuild(); render(); semPular(()=>abrirClientes());
}
function nomeArquivado(id){
  const ed=(ESTADO.clientes||{})[id]||{};
  if(ed.nome) return ed.nome;
  const c=ORIG.concat(ESTADO.novosClientes||[]).find(x=>x.id===id);
  return c?c.nome:null;
}
/* tira o no publico do ar sem perder o token: o link volta a valer na reativacao */
function desligarPortal(cid){
  const cfg=(ESTADO.portais||{})[cid]; if(!cfg||!cfg.ativo) return;
  ESTADO.portais[cid]={...cfg, desligado:true};
  try{ if(SYNC_ON && window.firebase) firebase.database().ref("painel/publico").child(cfg.ativo).remove(); }catch(e){}
}
function religarPortal(cid){
  const cfg=(ESTADO.portais||{})[cid]; if(!cfg) return;
  ESTADO.portais[cid]={...cfg, desligado:false};
}
const clienteArquivado = cid => !!(((ESTADO.clientes||{})[cid]||{}).oculto);
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
          '<span class="pc-c">'+(admin?"Administração":((p.areas||[]).length?(p.areas||[]).map(a=>(AREA_ROT[a]||a)).join(" · "):"sem área"))+'</span></div>'+
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
          '<input type="password" class="pinin" data-pin="'+escAttr(p.nome)+'" value="" maxlength="8" placeholder="'+(p.pin?'definido':'—')+'" title="'+(p.pin?'Digite um novo PIN para trocar':'Sem PIN')+'" inputmode="numeric" autocomplete="new-password" data-lpignore="true" aria-label="PIN de '+escAttr(p.nome)+'">'+(p.pin?'<button class="pin-rm" data-pinrm="'+escAttr(p.nome)+'" title="Remover o PIN" aria-label="Remover o PIN de '+escAttr(p.nome)+'">&#215;</button>':'')+'</span>'+
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
/* PIN guardado como hash (SHA-256 com o nome): o banco nao mostra mais o PIN de ninguem.
   Um PIN curto ainda pode ser adivinhado por quem le o banco; a protecao real e a regra do Firebase. */
const ehHashPin = v => typeof v==="string" && /^[0-9a-f]{64}$/.test(v);
async function hashPin(nome,pin){
  const dados=new TextEncoder().encode("mk3-painel|"+nome+"|"+String(pin||"").trim());
  const h=await crypto.subtle.digest("SHA-256",dados);
  return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function pinConfere(p,v){
  if(!p || !p.pin) return true;
  if(ehHashPin(p.pin)){ try{ return (await hashPin(p.nome,v))===p.pin; }catch(e){ return false; } }
  return v===p.pin;                                   /* PIN antigo, ainda nao convertido */
}
/* converte os PINs que ainda estao em texto puro (roda uma vez, quem abrir primeiro) */
async function migrarPins(){
  if(!(window.crypto&&crypto.subtle)) return;
  /* calcula primeiro e so depois grava no estado ATUAL: no meio do await o estado pode ter sido trocado pelo do servidor */
  const novos={};
  for(const p of (ESTADO.pessoas||[])){ if(p.pin && !ehHashPin(p.pin)){ try{ novos[p.nome]={de:p.pin, para:await hashPin(p.nome,p.pin)}; }catch(e){} } }
  let mudou=false;
  (ESTADO.pessoas||[]).forEach(p=>{ const n=novos[p.nome]; if(n && p.pin===n.de){ p.pin=n.para; mudou=true; } });
  if(mudou) persist();
}
async function setPin(nome,pin){
  const v=(pin||"").trim();
  if(v && !(window.crypto&&crypto.subtle)){ toast("Este navegador não consegue proteger o PIN (abra pelo endereço https)",false); return; }
  const h = v ? await hashPin(nome,v) : "";
  const p=(ESTADO.pessoas||[]).find(x=>x.nome===nome); if(!p) return;   /* busca depois do await, no estado atual */
  snapshot();
  p.pin = h;
  persist(); toast(v?"PIN de "+nome+" atualizado":"PIN de "+nome+" removido",true);
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
  ESTADO.log.unshift({ts:new Date().toISOString(),cliente:"_dem",acao:"editar",id:id,nome:dm.texto,data:dm.data,quem:USUARIO||null});
  persist(); rebuild(); render();
}
function abrirObsDemanda(id, editar){
  const dm=(ESTADO.demandas||[]).find(x=>x.id===id); if(!dm) return;
  const temTexto=!!(dm.obs||"").trim();
  const modoEdicao = editar || !temTexto;      /* sem nada escrito, já abre para escrever */
  const mm=$("modal");
  mm.innerHTML='<div class="mbox"><h3>Observação da demanda</h3>'+
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
    (ehAdmin()
      ? '<label class="mlab">Responsável<select id="dresp">'+pessoas.map(p=>'<option>'+esc(p)+'</option>').join("")+'</select></label>'
      : '<label class="mlab">Responsável<input type="text" id="dresp" value="'+escAttr(USUARIO||"")+'" disabled>'+
        '<span class="mhint">Você cria demanda para você mesmo. Para passar para outra pessoa, peça à administração.</span></label>')+
    '<label class="mlab">Observações <i class="opt-l">(opcional)</i><textarea id="dobs" rows="2" placeholder="Ex.: primeira vez da Carla acompanhando a gravação sozinha"></textarea></label>'+
    '<div class="demfeita"><label class="mcheck"><input type="checkbox" id="dfeita" data-feitacheck="1">'+
      '<span>Já foi feita</span></label>'+
      '<input type="date" id="dfdata" value="'+(diaSugerido||iso(HOJE))+'" max="'+iso(HOJE)+'" disabled>'+
      '<span class="mhint">Para registrar algo que já aconteceu: entra na lista já concluída, no dia certo.</span></div>'+
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
  const base=(c?TODAS.filter(t=>ehDoCliente(t,c.id)):tarefasArea()).filter(t=>t.data===dayIso)
    .sort((a,b)=>ORDEM[a.st.k]-ORDEM[b.st.k]);
  const mks=marcosDaArea((c?c.marcos:CLIENTES.flatMap(x=>x.marcos)).filter(m=>m.data===dayIso));
  const ags=(VISTA.area==="all"||VISTA.area==="mkt") ? (c?agendaCli(c.id):(ESTADO.agenda||[])).filter(e=>e.dia===dayIso) : [];
  const titulo=d(dayIso).toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
  const mm=$("modal");
  mm.innerHTML='<div class="mbox diamodal"><h3>'+esc(titulo)+'</h3>'+
    (ags.length?'<div class="diaag">'+ags.map(e=>'<div class="diaag-l">&#9679; '+esc(e.titulo)+(e.diaInteiro?'':' · '+esc(e.hora||''))+
      ' '+donoHTML(e)+(e.meet?' <span class="ag-m" role="link" tabindex="0" data-abrir="'+escAttr(e.meet)+'">Meet</span>':'')+'</div>').join("")+'</div>':'')+
    (mks.length?'<div class="diamarco">'+mks.map(m=>"&#9670; "+esc(m.titulo)).join("<br>")+'</div>':'')+
    (base.length?'<div class="dia-lista">'+base.map(t=>diaItem(t,showCli)).join("")+'</div>'
               :'<div class="vazio">Nada marcado neste dia. Bom lugar para encaixar uma demanda.</div>')+
    '<div class="mbtns">'+
      (USUARIO?'<button data-demanda="1" data-demdia="'+dayIso+'">+ Nova demanda neste dia</button>':'')+
      '<button class="sec" data-macao="fechar">Fechar</button></div></div>';
  mostrarModal();
}
function abrirNota(day){
  const cur=(ESTADO.notas&&ESTADO.notas[day])||"";
  const titulo=d(day).toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"});
  const mm=$("modal");
  mm.innerHTML='<div class="mbox notepad"><h3>Anotação do dia</h3><p class="msub">'+esc(titulo)+'</p>'+
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
  mm.innerHTML='<div class="mbox motivo-box"><h3>Por que não foi feita?</h3>'+
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
function desfazer(){
  if(!UNDO.length) return;
  const antes=ESTADO;
  REDO.push(JSON.stringify(ESTADO)); ESTADO=JSON.parse(UNDO.pop()); persist(); rebuild(); render();
  /* com a equipe mexendo junto, pode nao sobrar nada para desfazer: avisa em vez de fingir */
  if(typeof igual==="function" && igual(antes,ESTADO)) toast("Nada mudou: um colega alterou isso depois de você",false);
}
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
    const antes=!invalido && t && t.data && s<t.data;
    const cls=["mv-d",fds?"fds":"",s===hojeIso?"hj":"",s===diaAtual?"atual":"",s===t.data?"orig":"",
               invalido?"nao":"",antes?"antes":""].filter(Boolean).join(" ");
    const tit = (s===diaAtual||(t&&s===t.data)) ? ' disabled title="Já está neste dia"'
              : invalido ? ' disabled title="Dia que já passou"'
              : antes ? ' title="Antecipa: passa a vencer neste dia"'
              : ' title="Adia para este dia"';
    cels+='<button class="'+cls+'" data-macao="mover" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'" data-mday="'+s+'"'+tit+'>'+dia+'</button>';
  }
  const mm=$("modal");
  mm.innerHTML='<div class="mbox mover-box"><h3>Replanejar para outro dia</h3>'+
    '<p class="msub">'+esc(t?t.tarefa:"")+(t?" · "+esc(t.cliente):"")+'</p>'+
    '<p class="msub">Escolha o dia. <b>Mover</b> tira do dia de hoje e leva para o novo. '+
      '<b>Copiar</b> deixa nos dois, para entrega em duas etapas.</p>'+
    '<div class="mv-modo">'+
      '<button class="mv-m'+(MOVERMODO?" on":"")+'" data-mvmodo="1" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'">Mover</button>'+
      '<button class="mv-m'+(MOVERMODO?"":" on")+'" data-mvmodo="0" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'">Copiar</button></div>'+
    '<div class="mv-nav"><button class="mv-set" data-mesmover="'+prev+'" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'" data-mday="'+(diaAtual||"")+'" aria-label="Mês anterior">&lsaquo;</button>'+
      '<strong>'+esc(mesAno(ref))+'</strong>'+
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
/* ---- rascunho do relatorio mensal: o painel ja sabe quase tudo ----
   Junta os numeros do Reportei com o que foi entregue, o que atrasou e o que
   ficou pendente. Sai texto para revisar, nao relatorio pronto: numero que o
   painel nao tem, ele diz que nao tem, em vez de inventar. */
/* "outubro de 2026" -> "Outubro de 2026" (o capitalize do CSS punha "De" maiusculo) */
const mesAno = dt => { const t=dt.toLocaleDateString("pt-BR",{month:"long",year:"numeric"}); return t.charAt(0).toUpperCase()+t.slice(1); };
function mesExtenso(ym){
  const d0=new Date(+ym.slice(0,4), +ym.slice(5,7)-1, 1);
  return d0.toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
}
function rascunhoRelatorio(c, ym){
  const L=[];
  const R=resultadoDe(c.id, ym);
  L.push("RELATÓRIO "+mesExtenso(ym).toUpperCase()+" - "+c.nome);
  L.push("");

  /* 1. o objetivo */
  const obj=objetivoDe(c), meta=metaDe(c);
  if(obj){
    const rot=(OBJETIVOS.find(o=>o[0]===obj)||["",""])[1];
    L.push("OBJETIVO: "+rot+(meta?" (meta "+numBR(meta)+")":""));
    const dq=R&&R.destaque;
    if(dq) L.push("Hoje: "+numBR(dq.v)+(dq.novos!=null?" ("+(dq.novos>=0?"+":"")+numBR(dq.novos)+" no mês)":""));
    L.push("");
  }

  /* 2. os numeros */
  if(R && R.metricas && R.metricas.length){
    L.push("NÚMEROS - "+(R.periodo||mesExtenso(ym))+(R.compara?" (vs "+R.compara+")":""));
    R.metricas.forEach(m=>{
      const d0=(m.d==null)?"":"  "+(m.d>=0?"+":"")+m.d+"%";
      L.push("- "+m.k+": "+numBR(m.v)+d0);
    });
    if(R.resumo){ L.push(""); L.push(R.resumo); }
  } else {
    L.push("NÚMEROS: não há dados do Reportei para este mês neste painel.");
  }
  L.push("");

  /* 3. o que foi entregue */
  const ts=TODAS.filter(t=>t.clienteId===c.id);
  const feitas=ts.filter(t=>t.st.k==="ok" && t.dataConclusao && String(t.dataConclusao).slice(0,7)===ym)
    .sort((a,b)=>String(a.dataConclusao).localeCompare(String(b.dataConclusao)));
  L.push("ENTREGUE NO MÊS ("+feitas.length+")");
  if(feitas.length) feitas.forEach(t=>L.push("- "+fmt(t.dataConclusao)+"  "+t.tarefa));
  else L.push("- nada marcado como concluído neste mês");
  L.push("");

  /* 4. marcos */
  const mk=(c.marcos||[]).filter(m=>String(m.data).slice(0,7)===ym);
  if(mk.length){
    L.push("MARCOS");
    mk.forEach(m=>L.push("- "+fmt(m.data)+"  "+m.titulo+(m.detalhe?" ("+m.detalhe+")":"")));
    L.push("");
  }

  /* 5. o que atrasou, com honestidade sobre de quem foi */
  const atr=feitas.filter(t=>t.st.atraso>0);
  if(atr.length){
    L.push("SAIU FORA DO PRAZO ("+atr.length+")");
    atr.forEach(t=>L.push("- "+t.tarefa+": "+t.st.atraso+" dia"+(t.st.atraso>1?"s úteis":" útil")+
      " depois do previsto ("+(t.resp==="Cliente"?"aguardando o cliente":"MK3")+")"));
    L.push("");
  }

  /* 6. o que ficou em aberto */
  const abertas=ts.filter(t=>t.st.k!=="ok" && t.data && String(t.data).slice(0,7)===ym)
    .sort((a,b)=>String(a.data).localeCompare(String(b.data)));
  if(abertas.length){
    L.push("AINDA EM ABERTO ("+abertas.length+")");
    abertas.forEach(t=>L.push("- "+fmt(t.data)+"  "+t.tarefa+" ["+(ROTULO[t.st.k]||t.st.k)+"]"));
    L.push("");
  }

  /* 7. o que esta na mao do cliente */
  const ct=contadores(c);
  if(ct.length){
    L.push("ESPERANDO O CLIENTE");
    ct.forEach(x=>L.push("- aprovação de "+x.tipo+": enviado em "+fmt(x.enviado)+
      ", aprova sozinho em "+fmt(x.vencimento)));
    L.push("");
  }

  L.push("---");
  L.push("Rascunho gerado pelo painel em "+fmt(iso(HOJE))+". Revise antes de enviar.");
  return L.join("\n");
}
function abrirRelatorio(cid, ym){
  const c=cliente(cid); if(!c) return;
  ym = ym || mesAtualYM();
  const txt=rascunhoRelatorio(c, ym);
  const meses=[0,1,2].map(k=>{
    const d0=new Date(HOJE.getFullYear(), HOJE.getMonth()-k, 1);
    return d0.getFullYear()+"-"+String(d0.getMonth()+1).padStart(2,"0");
  });
  const mm=$("modal");
  mm.innerHTML='<div class="mbox recado"><h3>Rascunho do relat\u00f3rio</h3>'+
    '<p class="msub">'+esc(c.nome)+' \u00b7 '+esc(mesExtenso(ym))+
    '. Montado com o que est\u00e1 no painel e no Reportei. Revise antes de enviar.</p>'+
    '<div class="fd-chips rel-meses">'+meses.map(m=>
      '<button class="fd-chip'+(m===ym?" on":"")+'" data-relmes="'+cid+'|'+m+'">'+esc(mesExtenso(m))+'</button>').join("")+'</div>'+
    '<pre class="rec-txt" id="recTxt">'+esc(txt)+'</pre>'+
    '<div class="mbtns"><button data-macao="copiarrecado">Copiar texto</button>'+
    '<button class="sec" data-macao="fechar">Fechar</button></div></div>';
  mostrarModal(true);
}
/* As tres formas de concluir, no mesmo lugar e com o mesmo desenho.
   "na data prevista" existe porque quase sempre a marcacao vem depois do fato:
   a entrega saiu no prazo, so o registro atrasou. */
function blocoConcluir(cid, tid, t, verbo){
  const hoje=iso(HOJE);
  const prev=t.data && t.data<hoje ? t.data : null;
  return '<div class="mconc">'+
    '<button class="mconc-b principal" data-macao="hoje" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'">'+
      esc(verbo)+' hoje <i>'+fmt(hoje)+'</i></button>'+
    (prev?'<button class="mconc-b" data-macao="prevista" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'" data-mday="'+prev+'">'+
      esc(verbo)+' na data prevista <i>'+fmt(prev)+'</i></button>':'')+
    '</div>'+
    '<label class="mlab">Ou em outro dia'+
      '<div class="mconc-data">'+
        '<input type="date" id="mdata" value="'+hoje+'" max="'+hoje+'">'+
        '<button data-macao="data" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'">Concluir</button>'+
      '</div>'+
      '<span class="mhint">O painel conta o atraso pela data que voc\u00ea informar, n\u00e3o pela de hoje.</span>'+
    '</label>';
}
function blocoCorrigir(cid, tid, quando){
  const hoje=iso(HOJE);
  return '<label class="mlab">Corrigir a data em que ficou pronta'+
    '<div class="mconc-data">'+
      '<input type="date" id="mdata" value="'+(quando||hoje)+'" max="'+hoje+'">'+
      '<button data-macao="data" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'">Salvar</button>'+
    '</div></label>';
}

/* demanda nao e tarefa de cliente: tem editor proprio, com remover e editar */
function podeEditarDem(x){
  if(!x) return false;
  if(ehAdmin()) return true;
  return !!USUARIO && x.criadaPor===USUARIO;
}
function abrirEditorDemanda(id){
  const dm=(ESTADO.demandas||[]).find(x=>x.id===id);
  const t=TODAS.find(x=>x.clienteId==="_dem"&&x.id===id);
  if(!dm || !t) return;
  const feita=t.st.k==="ok";
  const A=AREA_ROT;
  const cli=dm.cli?cliente(dm.cli):null;
  const mm=$("modal");
  mm.innerHTML='<div class="mbox"><h3>'+esc(dm.texto)+'</h3>'+
    '<p class="msub">Demanda · '+esc(A[dm.area]||dm.area)+' · '+fmt(dm.data)+
      ' · '+esc(dm.resp)+(cli?' · '+esc(cli.nome):'')+
      (dm.criadaPor?' <i class="opt-l">(criada por '+esc(dm.criadaPor)+')</i>':'')+'</p>'+
    (dm.obs?'<p class="mok">&#128221; '+esc(dm.obs)+'</p>':'')+
    (feita
      ? '<p class="mok">Concluída'+(t.st.quando?" em "+fmt(t.st.quando):"")+'.</p>'+
        blocoCorrigir("_dem", id, t.st.quando)+
        '<div class="mbtns wrap"><button class="danger" data-macao="desfazer" data-mcid="_dem" data-mtid="'+escAttr(id)+'">Reabrir</button></div>'
      : blocoConcluir("_dem", id, t, "Concluir"))+
    '<div class="mbtns wrap">'+
      (podeEditarDem(dm)?'<button class="sec" data-demedit="'+escAttr(id)+'">Editar</button>':'')+
      '<button class="sec" data-demobs="'+escAttr(id)+'">Observação</button>'+
      (podeApagarDem(dm)?'<button class="danger" data-demx="'+escAttr(id)+'">Remover</button>':'')+
    '</div>'+
    (podeEditarDem(dm)?'':'<p class="mhint">Editar e remover só quem criou, ou a administração.</p>')+
    '<div class="mbtns"><button class="sec" data-macao="fechar">Fechar</button></div></div>';
  mostrarModal(true);
}
function abrirEditor(cid,tid){
  if(cid==="_dem"){ abrirEditorDemanda(tid); return; }
  if(cid==="_rec"){ abrirEditorRec(tid); return; }
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid); if(!t) return;
  const feita=t.st.k==="ok"; const cli=cliente(cid); if(!cli) return; const anc=ANCORA[tid];
  const verbo = anc ? anc.verbo : "Concluído";
  const mm=$("modal");
  mm.innerHTML='<div class="mbox">'+
    '<h3>'+esc(t.tarefa)+'</h3>'+
    '<p class="msub">'+esc(cli.nome)+(t.detalhe?" · "+esc(t.detalhe):"")+'</p>'+
    (/^(relatorio|envRelat)/.test(tid)
      ? '<div class="mbtns wrap"><button class="sec" data-relatorio="'+cid+'|'+tid.slice(-7)+'">Montar rascunho do relat\u00f3rio</button></div>'
      : '')+
    (feita
      ? '<p class="mok">Já marcada como concluída'+(t.st.quando?" em "+fmt(t.st.quando):"")+'.</p>'+
        blocoCorrigir(cid, tid, t.st.quando)+
        '<div class="mbtns wrap"><button class="danger" data-macao="desfazer" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'">Desfazer</button>'+
        '<button class="sec" data-macao="fechar">Fechar</button></div>'
      : blocoConcluir(cid, tid, t, verbo)+
        '<div class="mbtns"><button class="sec" data-macao="fechar">Cancelar</button></div>')+
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
    if(!duplicarTarefa(D.mcid,D.mtid,D.mday,MOVERMODO)) return;
    toast((MOVERMODO?"Movida para ":"Copiada para ")+fmt(D.mday),true);
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
  if(D.macao==="salvarplano"){
    salvarPlano(D.mcid, D.mym, {estrategia:($("plEstr")||{}).value, esperado:($("plEsp")||{}).value, base:($("plBase")||{}).value});
    fecharModal(); return;
  }
  if(D.macao==="copiarrecado"){
    const el=$("recTxt"); const t=el?el.textContent:"";
    if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(()=>toast("Texto copiado")).catch(()=>toast("Não consegui copiar, selecione o texto")); }
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
  if(D.macao==="salvarrecorrente"){
    const tx=(($("rtexto")&&$("rtexto").value)||"").trim();
    if(!tx){ if($("rtexto"))$("rtexto").focus(); return; }
    const freq=$("rfreq").value;
    const dia=Number(($("rdia")&&$("rdia").value)||0);
    if(freq==="mensal" && !(dia>=1 && dia<=31)){ toast("Dia do mês tem que ser de 1 a 31",false); return; }
    const alvo=($("ralvo")&&$("ralvo").value)||"pessoa";
    addRecorrente({texto:tx, area:$("rarea").value, alvo:alvo, resp:($("rresp")&&$("rresp").value)||USUARIO,
                   freq:freq, dow:($("rdow")&&$("rdow").value), dia:dia, inicio:($("rini")&&$("rini").value)||iso(HOJE),
                   cli:($("rcli")&&$("rcli").value)||null, obs:($("robs")&&$("robs").value)||""});
    toast("Recorrente criada",true); abrirRecorrente(); return;
  }
  if(D.macao==="salvardemanda"){ const tx=(($("dtexto")&&$("dtexto").value)||"").trim(); if(!tx){ if($("dtexto"))$("dtexto").focus(); return; } const jaFeita=$("dfeita")&&$("dfeita").checked; const qdo=jaFeita?(($("dfdata")&&$("dfdata").value)||iso(HOJE)):null;
    if(qdo && qdo>iso(HOJE)){ toast("A conclusão não pode ser numa data futura",false); return; }
    const dd0=$("ddata").value;
    addDemanda(tx,$("darea").value,dd0,$("dresp").value,($("dobs")&&$("dobs").value)||"",($("dcli")&&$("dcli").value)||null,qdo);
    semPular(abrirDemanda); toast(qdo?"Demanda registrada como feita":(dd0?"Demanda criada para "+fmt(dd0):"Demanda criada"),true); return; }
  const cid=D.mcid, tid=D.mtid;
  if(D.macao==="desfazer"){ marcar(cid,tid,null,"desfazer"); fecharModal(); return; }
  let dv = (D.macao==="hoje") ? iso(HOJE)
         : (D.macao==="prevista") ? (D.mday||iso(HOJE))
         : (($("mdata")&&$("mdata").value)||iso(HOJE));
  /* nao existe concluir no futuro: o que se registra e o que ja aconteceu */
  if(dv>iso(HOJE)){ toast("A data de conclusão não pode ser no futuro",false); return; }
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
  /* no toque o tooltip abre no tap; some ao rolar e quando um modal abre por cima */
  window.addEventListener("scroll", fechar, {passive:true});
  window.fecharTip=fechar;
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
  /* o estado vem do Firebase (e do cache local); nao existe mais estado.json no repositorio */
  let local=null; try{ local=JSON.parse(localStorage.getItem("mk3_estado")||"null"); }catch(e){}
  ESTADO = mergeEstado(base, local);
  ESTADO = normalizarEstado(ESTADO);
  if(!window.firebase) migrarPins();                 /* com Firebase, converte depois de ler o servidor */
  /* o perfil NÃO é lembrado entre aberturas: sempre passa pela tela de escolha.
     (protege quando alguém abre em outro computador e esquece aberto) */
  USUARIO=null;
  try{ localStorage.removeItem("mk3_user"); }catch(e){}
  if(USUARIO && !eu()) USUARIO=null;
  rebuild(); render(); montarTooltip(); syncIniciar(); ligarAgendaAoVivo();
  setTimeout(rodarCobrancas, 4000);
}

/* data do topo: por extenso no computador, curta no celular */
function pintarHoje(){
  const el=$("hoje"); if(!el) return;
  const longa=HOJE.toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
  const curta=HOJE.toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short"}).replace(/\./g,"");
  el.innerHTML='<span class="hj-l">'+esc(longa)+'</span><span class="hj-c" aria-hidden="true">'+esc(curta)+'</span>';
}
pintarHoje();

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
  oceanus:  ["#2a30df","#1414a2"],   // Oceanus — azul da logo
  cli_1786128011208: ["#501e93","#30105c"],  // MK3 — roxo da marca
  cli_1786128681070: ["#0f3fb0","#001032"],  // Tyconnex — azul e marinho da marca
  marroquina:        ["#f9ae00","#20160a"]   // A Marroquina — dourado e marrom da marca
};
const coresDe = c => CORCLI[c.id] || coresSeg(c.segmento);
const iniciais = n => (n||"?").trim().split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase();

const FOTO_FIXA = {
  cynthia:"fotos/cynthia.jpg", suelem:"fotos/suelem.jpg", leonardo:"fotos/leonardo.jpg",
  oceanus:"fotos/oceanus.jpg", adriana:"fotos/dinha.jpg",
  cli_1786128681070:"fotos/tyconnex.jpg",
  cli_1786128011208:"fotos/mk3.jpg",
  marroquina:"fotos/marroquina.jpg"
};
/* clientes novos podem ter foto própria salva no estado */
const FOTO = new Proxy({}, { get:(_,k)=>{
  const ov=((typeof ESTADO!=="undefined" && ESTADO.clientes)||{})[k];
  return (ov&&ov.foto) || FOTO_FIXA[k] || undefined;
}});
function avatarHTML(c, cls){
  const cor=coresDe(c), f=FOTO[c.id];
  return '<div class="'+cls+'" style="background:'+cor[1]+'">'+esc(iniciais(c.nome))+
    (fotoOk(f)?'<img src="'+escAttr(f)+'" alt="" loading="lazy" onerror="this.remove()">':'')+'</div>';
}

/* ---- linha de tarefa (lista) ---- */
/* tarefa remanejada: devolve a data da copia, para dar um jeito de desfazer */
function remanejadaDe(t){
  if(!t) return null;
  const l=dupDe(t.clienteId,t.id)
    .sort((a,b)=>a.dia.localeCompare(b.dia));
  return l.length ? l[l.length-1].dia : null;
}
function desfazerRemanejo(cid,tid){
  const l=dupDe(cid,tid);
  if(!l.length) return;
  snapshot();
  ESTADO.dup=(ESTADO.dup||[]).filter(e=>!(e.cid===cid && e.tid===tid));
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid);
  ESTADO.log.unshift({ts:new Date().toISOString(),cliente:cid,nome:t?t.tarefa:tid,
    acao:"desremanejar",id:tid,quem:USUARIO||null});
  ESTADO.log=ESTADO.log.slice(0,300);
  persist(); rebuild(); render();
  toast("Remanejamento desfeito. A tarefa voltou para a data original.",true);
}
const linha = (t, showCli) => '<div class="row editavel'+(showCli?" rowc":"")+'"'+attrsEdit(t)+'>'+
  tagHTML(t)+
  '<div class="tarefa">'+esc(t.tarefa)+(t.detalhe?'<em>'+esc(t.detalhe)+'</em>':'')+
    (remanejadaDe(t)?'<button class="row-desrem" data-desrem="'+t.clienteId+'|'+escAttr(t.id)+'" '+
      'title="Tirar o remanejamento e voltar para '+fmt(t.data)+'" aria-label="Desfazer remanejamento">&#215; remanejada</button>':'')+'</div>'+
  (showCli?'<div class="cli">'+esc(t.cliente)+'</div>':'')+
  '<div class="data">'+fmt(t.data)+' <span class="dow">'+dow(t.data)+'</span></div>'+
  '<div class="resp">'+esc(t.resp)+carimboHTML(t)+'</div>'+
  (t.st.k==="ok" ? '<span class="row-ok" aria-hidden="true" style="opacity:.5">&#10003;</span>'
    : '<button class="row-ok" data-rowok="1" data-mcid="'+t.clienteId+'" data-mtid="'+escAttr(t.id)+'" title="Concluir hoje" aria-label="Concluir hoje">&#10003;</button>')+
  '</div>';

/* ---- bloco de evento no calendário (estilo referência) ---- */
function evCard(t, showCli, isMarco){
  const cls  = isMarco ? "marco" : (t.st.k + (t.fase==="Demanda" ? " ev-dem" : ""));
  const meta = isMarco ? "Marco" : (showCli ? t.cliente : t.resp);
  const tt   = (isMarco?"◆ ":"")+esc(t.tarefa || t.titulo);
  const dattr = isMarco ? (' data-tt="'+escAttr(t.titulo||t.tarefa||"")+'"') : attrsEdit(t);
  return '<div class="ev ev-'+cls+(isMarco?"":" editavel")+'"'+dattr+'>'+
    '<div class="ev-tt">'+tt+'</div>'+
    '<div class="ev-meta"><span class="ev-dot"></span>'+esc(meta)+'</div></div>';
}

