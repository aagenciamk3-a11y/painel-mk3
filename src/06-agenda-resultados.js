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
function btEditarAg(e){
  return (ehAdmin() && e.gid && agendaUrl()) ? '<span class="ag-ed" role="button" tabindex="0" data-agedit="'+escAttr(e.id)+'" data-tt="Editar ou apagar no Google Agenda">editar</span>' : '';
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
        btEditarAg(e)+
      '</div>';
    }).join("")+'</div>';
}



/* ---- criar compromisso na agenda pelo painel ---- */
let COMP_EDIT=null;   /* evento do Google sendo editado (null = novo) */
function eventoAgenda(id){ return (ESTADO.agenda||[]).find(e=>e.id===id)||null; }
function editarCompromisso(id){
  const e=eventoAgenda(id); if(!e) return;
  if(!e.gid){ toast("Este evento ainda não pode ser editado pelo painel. Recarregue a página.",false); return; }
  if(e.varios){ toast("Evento de vários dias: edite direto no Google Agenda",false); return; }
  abrirCompromisso(e.dia, e);
}
function abrirCompromisso(diaPre, evEd){
  if(!ehAdmin()) return;
  COMP_EDIT=evEd||null;
  if(!agendaUrl()){ toast("A agenda do Google ainda não está ligada ao painel",false); return; }
  const hoje=iso(HOJE);
  const cls=CLIENTES.map(c=>'<option value="'+escAttr(c.id)+'">'+esc(c.nome)+'</option>').join("");
  $("modal").innerHTML='<div class="mbox compform"><h3>'+(COMP_EDIT?'Editar compromisso':'Novo compromisso na agenda')+'</h3>'+
    '<p class="msub">'+(COMP_EDIT?'Salvou aqui, mudou no Google Agenda da MK3 na hora.':'Cria direto no Google Agenda da MK3. O cliente e o responsável ficam gravados no evento, então o painel já sabe de quem é.')+'</p>'+
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
    '<div class="cp-aviso">'+
      '<button type="button" class="cp-sw" id="cpMeet" data-avisar="1" role="switch" aria-checked="false"><i></i></button>'+
      '<div class="cp-aviso-t"><b>Criar link do Meet</b>'+
        '<span>Para reunião on-line. O link aparece no painel e no convite.</span></div>'+
    '</div>'+
    '<label class="mlab">Observação<input type="text" id="cpObs" placeholder="opcional" autocomplete="off"></label>'+
    '<div class="mbtns"><button data-macao="criarcomp">'+(COMP_EDIT?'Salvar na agenda':'Criar na agenda')+'</button>'+
    (COMP_EDIT?'<button class="sec perigo" data-macao="apagarcomp">Apagar da agenda</button>':'')+
    '<button class="sec" data-macao="fechar">Cancelar</button></div></div>';
  mostrarModal(true);
  if(COMP_EDIT) preencherCompromisso(COMP_EDIT);
}
function preencherCompromisso(e){
  const pe=(id,v)=>{ const el=$(id); if(el) el.value=v||""; };
  pe("cpTit",e.titulo); pe("cpDia",e.dia);
  if(!e.diaInteiro){ pe("cpHora",e.hora); pe("cpFim",e.fim); }
  pe("cpCli", e.cliente && CLIENTES.some(c=>c.id===e.cliente) ? e.cliente : "");
  pe("cpObs",e.obs);
  const resp=String(e.tagResp||"").split(/\s*,\s*/).filter(Boolean);
  document.querySelectorAll("#cpResp .cp-p").forEach(b=>{ if(resp.indexOf(b.dataset.resp)>=0) b.classList.add("on"); });
  const cv=$("cpConv"); if(cv) cv.placeholder = (e.convidados||[]).length ? "já convidados: "+e.convidados.join(", ")+" (novos e-mails aqui)" : "e-mails separados por vírgula";
  if(e.meet){ const m=$("cpMeet"); if(m){ m.classList.add("on"); m.setAttribute("aria-checked","true"); m.disabled=true; } }
}
function apagarCompromisso(){
  if(!ehAdmin()||!COMP_EDIT) return;
  const bt=document.querySelector('[data-macao="apagarcomp"]');
  if(bt && !bt.classList.contains("confirma")){ bt.classList.add("confirma"); bt.textContent="Clique de novo para apagar"; return; }
  if(bt){ bt.disabled=true; bt.textContent="Apagando..."; }
  const e=COMP_EDIT;
  fetch(agendaUrl(), {method:"POST", headers:{"Content-Type":"text/plain;charset=utf-8"},
    body:JSON.stringify({chave:(ESTADO.agendaChave||""), acao:"apagar", gid:e.gid})})
    .then(r=>r.json())
    .then(j=>{
      if(j && j.ok){ ESTADO.agenda=(ESTADO.agenda||[]).filter(x=>x.gid!==e.gid); COMP_EDIT=null; fecharModal(); render();
        toast("Apagado do Google Agenda",false); puxarAgendaAoVivo(); }
      else { toast("Não deu: "+((j&&j.erro)||"resposta inesperada"),false); if(bt){ bt.disabled=false; bt.textContent="Apagar da agenda"; bt.classList.remove("confirma"); } }
    })
    .catch(()=>{ toast("Não consegui falar com a agenda",false); if(bt){ bt.disabled=false; bt.textContent="Apagar da agenda"; bt.classList.remove("confirma"); } });
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
    convidados:v("cpConv"), avisar:!!(av && av.classList.contains("on")),
    meet:!!($("cpMeet") && $("cpMeet").classList.contains("on") && !(COMP_EDIT && COMP_EDIT.meet)), obs:v("cpObs") };
  if(COMP_EDIT){ corpo.acao="editar"; corpo.gid=COMP_EDIT.gid; }
  const rotulo = COMP_EDIT ? "Salvar na agenda" : "Criar na agenda";
  const bt=document.querySelector('[data-macao="criarcomp"]');
  if(bt){ bt.disabled=true; bt.textContent= COMP_EDIT ? "Salvando..." : "Criando..."; }
  fetch(agendaUrl(), {method:"POST", headers:{"Content-Type":"text/plain;charset=utf-8"}, body:JSON.stringify(corpo)})
    .then(r=>r.json())
    .then(j=>{
      if(j && j.ok){ const ed=!!COMP_EDIT; COMP_EDIT=null; fecharModal();
        toast(ed?"Alterado no Google Agenda":"Compromisso criado na agenda do Google",false); puxarAgendaAoVivo(); setTimeout(puxarAgendaAoVivo,4000); }
      else { toast("Não deu: "+((j&&j.erro)||"resposta inesperada"),false);
             if(bt){ bt.disabled=false; bt.textContent=rotulo; } }
    })
    .catch(()=>{ toast("Não consegui falar com a agenda",false);
      if(bt){ bt.disabled=false; bt.textContent=rotulo; } });
}
/* ---- cobranca de aprovacao: o painel cria o lembrete na agenda sozinho ----
   Regra do manual: 1 dia util depois do envio, um evento avisa a equipe de
   cobrar o cliente. So a administracao dispara, so uma vez por etapa, e a
   marca fica no estado para nao duplicar nem em outro navegador. */
function chaveCobranca(c,x){ return c.id+"|"+x.tipo+"|"+x.enviado; }
function cobrancasPendentes(){
  const hoje=iso(HOJE), out=[];
  CLIENTES.forEach(c=>contadores(c).forEach(x=>{
    if(x.lembrete>hoje) return;                 /* ainda nao chegou o dia */
    if(x.vencimento<hoje) return;               /* ja passou, aprovacao automatica */
    const k=chaveCobranca(c,x);
    if((ESTADO.cobrancas||{})[k]) return;
    out.push({cli:c, x:x, chave:k});
  }));
  return out;
}
/* trava no servidor antes de criar o evento: dois admins abrindo juntos nao duplicam a cobranca */
function reservarCobranca(chave){
  if(!SYNC) return Promise.resolve(true);                 /* sem banco (teste local): nao tem com quem disputar */
  if(!SYNC_PRONTO) return Promise.resolve(false);          /* ainda nao leu o servidor: nao arrisca duplicar */
  return SYNC.child("cobrancas/"+chave).transaction(cur=> cur ? undefined : {reservado:USUARIO||"", em:new Date().toISOString()})
    .then(r=>!!(r&&r.committed)).catch(()=>false);
}
function criarCobranca(item){
  return reservarCobranca(item.chave).then(ok=>{
    if(!ok) return false;
    return criarCobrancaAgenda(item).then(feito=>{
      if(!feito && SYNC) SYNC.child("cobrancas/"+item.chave).remove().catch(()=>{});   /* falhou: solta a trava */
      return feito;
    });
  });
}
function criarCobrancaAgenda(item){
  const c=item.cli, x=item.x;
  const corpo={ chave:(ESTADO.agendaChave||""),
    titulo:"Cobrar aprovação de "+x.tipo+" - "+c.nome,
    dia:(x.lembrete<iso(HOJE)?iso(HOJE):x.lembrete), hora:"09:00", fim:"09:15",
    cliente:c.nome, responsavel:"", convidados:"", avisar:false,
    obs:"Enviado em "+fmt(x.enviado)+". Sem retorno do cliente, aprova sozinho em "+fmt(x.vencimento)+"." };
  return fetch(agendaUrl(), {method:"POST", headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(corpo)})
    .then(r=>r.json())
    .then(j=>{
      if(!(j&&j.ok)) return false;
      ESTADO.cobrancas=ESTADO.cobrancas||{};
      ESTADO.cobrancas[item.chave]={dia:corpo.dia, criado:new Date().toISOString()};
      return true;
    })
    .catch(()=>false);
}
let COBR_RODOU=false;
function rodarCobrancas(){
  if(COBR_RODOU || !ehAdmin() || !agendaUrl()) return;
  if(SYNC && !SYNC_PRONTO){ setTimeout(rodarCobrancas,3000); return; }   /* espera ler o servidor */
  COBR_RODOU=true;
  const l=cobrancasPendentes();
  if(!l.length) return;
  Promise.all(l.map(criarCobranca)).then(res=>{
    const n=res.filter(Boolean).length;
    if(!n) return;
    persist();
    toast(n===1 ? "Criei 1 cobrança de aprovação na agenda"
                : "Criei "+n+" cobranças de aprovação na agenda", false);
    setTimeout(puxarAgendaAoVivo,1200);
  });
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
/* ---- de quem e o evento: o painel descobre sozinho ----
   O script da agenda so entrega o evento cru (titulo, convidados, tags #cliente/#resp).
   Cliente: pela tag ou pelo nome no titulo ("Gravação - Oceanus", "Planejamento - Dinha").
   Pessoa: pela tag ou pelo convidado cujo e-mail comeca com o nome da pessoa (carla..., alda...). */
const semAcento = s => String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const palavras = s => semAcento(s).replace(/['’`]/g,"").split(/[^a-z0-9]+/).filter(Boolean);
const PALAVRA_FRACA = new Set(["a","o","as","os","de","da","do","das","dos","e","escola","mk3","marketing","digital","grupo","loja","lojas"]);
function chavesDoCliente(c){
  const ks=new Set([semAcento(c.id)]);
  [c.nome,c.marca].forEach(n=>palavras(n).forEach(w=>{ if(w.length>=4 && !PALAVRA_FRACA.has(w)) ks.add(w); }));
  return ks;
}
function clienteDoEvento(e){
  if(e.cliente && CLIENTES.some(c=>c.id===e.cliente)) return e.cliente;       /* script antigo ja mandava o id */
  const tag=palavras(e.tagCliente||"");
  const tit=new Set(palavras((e.titulo||"")+" "+(e.tagCliente||"")));
  for(const c of CLIENTES){
    const ks=chavesDoCliente(c);
    if(tag.length && (tag.join(" ")===semAcento(c.id) || palavras(c.nome).join(" ")===tag.join(" "))) return c.id;
    for(const k of ks){ if(tit.has(k)) return c.id; }
  }
  return "";
}
function pessoasDoEvento(e){
  if(e.pessoa) return e.pessoa;                                               /* script antigo */
  const ps=ESTADO.pessoas||[];
  const daTag=String(e.tagResp||"").split(/\s*,\s*/).filter(n=>ps.some(p=>p.nome===n));
  if(daTag.length) return daTag.join(", ");
  const conv=(e.convidados||[]).map(semAcento);
  const achou=ps.filter(p=>{ const n=semAcento(p.nome); return n.length>=3 && conv.some(c=>c.indexOf(n)===0); }).map(p=>p.nome);
  return achou.join(", ");
}
function enriquecerEvento(e){
  const x={...e};
  x.cliente=clienteDoEvento(e);
  x.pessoa=pessoasDoEvento(e);
  if(!x.area) x.area = x.cliente ? "mkt" : "";
  return x;
}
function puxarAgendaAoVivo(){
  const u=agendaUrl(); if(!u) return;
  fetch(u+(u.indexOf("?")<0?"?":"&")+"ts="+Date.now())
    .then(r=>r.ok?r.json():null)
    .then(j=>{
      if(!j || !Array.isArray(j.eventos)) return;
      const antes=JSON.stringify(ESTADO.agenda||[]);
      const evs=j.eventos.map(enriquecerEvento);
      demandasDoGoogle(evs);                            /* mudou no Google? a demanda acompanha */
      const gids=gidsDeDemanda();
      ESTADO.agenda=evs.filter(e=>!gids[e.gid]);        /* evento que e demanda aparece uma vez so, como demanda */
      if(ehAdmin()) mandarDemandasPendentes();
      if(JSON.stringify(ESTADO.agenda)!==antes){ if(ehAdmin()) sincronizarGravacoes(); marcarAgendaViva(j.lido); semPular(render); }
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
  clearInterval(AGENDA_T); AGENDA_T=null;
  if(!agendaUrl()) return;
  puxarAgendaAoVivo();
  AGENDA_T=setInterval(()=>{ if(!document.hidden) puxarAgendaAoVivo(); }, 20000);   /* a cada 20 s; aba escondida nao busca */
}
/* um ouvinte so (antes cada salvamento da agenda somava mais um) */
document.addEventListener("visibilitychange",()=>{
  if(document.hidden) return;
  virouODia();
  if(agendaUrl()) puxarAgendaAoVivo();
});
/* aba aberta de um dia para o outro: "vence hoje" tem que ser o hoje de verdade */
function virouODia(){
  const agora=new Date(); agora.setHours(0,0,0,0);
  if(agora.getTime()===HOJE.getTime()) return false;
  HOJE.setTime(agora.getTime());
  pintarHoje(); rebuild(); render(); return true;
}
setInterval(()=>{ try{ if(!document.hidden) virouODia(); }catch(e){} }, 5*60000);
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
const REPORTEI_PROJ = { suelem:1265569, oceanus:1180490 };   /* cliente do painel -> projeto no Reportei */
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
          (urlOk(L.r.link)?'<a class="res-link" href="'+esc(L.r.link)+'" target="_blank" rel="noopener">relatório completo</a>':'')+'</div>'+
        '<div class="res-ms">'+ms.map(x=>
          '<div class="res-m"><span class="rs-v" data-num="'+(x.v||0)+'">0</span>'+
          '<span class="rs-k">'+esc(x.k)+'</span>'+setaHTML(x.d)+'</div>').join("")+'</div>'+
        (L.r.resumo?'<div class="res-txt">'+esc(L.r.resumo)+'</div>':'')+
      '</div>';
    }).join("")+
    '<div class="db-obs">'+esc(linhas[0].r.periodo||"")+(linhas[0].r.compara?" · comparado com "+esc(linhas[0].r.compara):"")+'</div></div>';
}





/* ================= DEMANDAS NO GOOGLE AGENDA =================
   Toda demanda do painel vira um evento de dia inteiro na agenda da MK3.
   Criar, editar, mudar a data, escrever observacao e remover: o Google acompanha.
   E o caminho de volta: mudou o titulo ou o dia no Google, a demanda acompanha.
   dm.gid guarda o id do evento; dm.gidEm, quando foi criado. */
const DEM_GOOGLE_DESDE="2026-10-08";     /* demandas antigas (ja passadas) nao vao para a agenda */
function diasDe(isoD,n){ const x=new Date(isoD+"T12:00:00Z"); x.setUTCDate(x.getUTCDate()+n); return x.toISOString().slice(0,10); }
function gidsDeDemanda(){ const o={}; (ESTADO.demandas||[]).forEach(d=>{ if(d.gid) o[d.gid]=d.id; }); return o; }
/* no Google o titulo leva o cliente junto: "Planejamento · Oceanus" */
function sufixoCliente(dm){ const c=dm&&dm.cli?CLIENTES.find(x=>x.id===dm.cli):null; return c?" · "+primeiroNomeCli(c):""; }
function primeiroNomeCli(c){ return String(c.nome||c.marca||"").trim(); }
function tituloDemanda(dm){ const suf=sufixoCliente(dm); const t=String(dm.texto||""); return suf && !t.endsWith(suf) ? t+suf : t; }
function textoDoTitulo(dm,titulo){ const suf=sufixoCliente(dm); const t=String(titulo||""); return suf && t.endsWith(suf) ? t.slice(0,-suf.length) : t; }
function corpoDemanda(dm){
  const linhas=[]; if(dm.obs) linhas.push(dm.obs); linhas.push("Demanda do Painel de Prazos");
  return { chave:(ESTADO.agendaChave||""), titulo:tituloDemanda(dm), dia:dm.data, hora:"", cliente:dm.cli||"",
           responsavel:dm.resp||"", avisar:false, meet:false, obs:linhas.join(" · ") };
}
function postAgenda(corpo){
  if(typeof fetch!=="function" || !agendaUrl()) return Promise.resolve(null);
  return fetch(agendaUrl(),{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(corpo)})
    .then(r=>r.json()).catch(()=>null);
}
/* o Google devolve o iCalUID "<id>@google.com" de evento criado por aqui */
function gidDoRetorno(j){ return j && j.ok && j.id ? String(j.id).replace(/@google\.com$/,"") : ""; }
const DEM_ENVIANDO={};
function demandaParaGoogle(id){
  const dm=(ESTADO.demandas||[]).find(x=>x.id===id);
  if(!dm || !agendaUrl() || dm.foraAgenda || !dm.data || !dm.texto) return Promise.resolve(false);
  if(DEM_ENVIANDO[id]) return Promise.resolve(false);
  DEM_ENVIANDO[id]=true;
  const fim=v=>{ delete DEM_ENVIANDO[id]; return v; };
  if(dm.gid){
    return postAgenda({...corpoDemanda(dm), acao:"editar", gid:dm.gid}).then(j=>fim(!!(j&&j.ok)));
  }
  /* trava no servidor: dois navegadores nao criam o mesmo evento duas vezes */
  return reservarCobranca("dem|"+id).then(ok=>{
    if(!ok) return fim(false);
    return postAgenda(corpoDemanda(dm)).then(j=>{
      const g=gidDoRetorno(j);
      const atual=(ESTADO.demandas||[]).find(x=>x.id===id);
      if(g && atual){ atual.gid=g; atual.gidEm=Date.now(); persist(); }
      else if(SYNC) SYNC.child("cobrancas/dem|"+id).remove().catch(()=>{});   /* falhou: solta para tentar de novo */
      return fim(!!g);
    });
  });
}
function demandaSaiDoGoogle(dm){
  if(!dm || !dm.gid || !agendaUrl()) return;
  postAgenda({chave:(ESTADO.agendaChave||""), acao:"apagar", gid:dm.gid});
}
/* demanda de hoje em diante que ainda nao esta na agenda: manda (a administracao faz, uma por vez) */
let DEM_FILA=false;
function mandarDemandasPendentes(){
  if(DEM_FILA || !agendaUrl() || !ESTADO.agendaChave) return;
  const hoje=iso(HOJE);
  const fila=(ESTADO.demandas||[]).filter(d=>!d.gid && !d.foraAgenda && d.data && d.data>=hoje && d.data>=DEM_GOOGLE_DESDE
    && !demConcluida(d.id) && !(ESTADO.cobrancas||{})["dem|"+d.id]).map(d=>d.id);
  if(!fila.length) return;
  DEM_FILA=true;
  fila.reduce((p,id)=>p.then(()=>demandaParaGoogle(id)), Promise.resolve()).then(()=>{ DEM_FILA=false; });
}
/* volta do Google: mudou titulo ou dia, a demanda muda; apagado la, a demanda fica so no painel */
function demandasDoGoogle(evs){
  const porGid={}; evs.forEach(e=>{ if(e.gid && !porGid[e.gid]) porGid[e.gid]=e; });
  const hoje=iso(HOJE); let mudou=false;
  (ESTADO.demandas||[]).forEach(dm=>{
    if(!dm.gid) return;
    const e=porGid[dm.gid];
    if(!e){
      /* so conta como apagado se ja deu tempo de aparecer e se o dia esta na janela que o script le */
      if(Date.now()-(dm.gidEm||0) > 120000 && dm.data>=diasDe(hoje,-40) && dm.data<=diasDe(hoje,170)){
        delete dm.gid; dm.foraAgenda=true; mudou=true;
      }
      return;
    }
    const tx=textoDoTitulo(dm,e.titulo);
    if(tx && tx!==dm.texto){ dm.texto=tx; mudou=true; }
    if(e.dia && e.dia!==dm.data && !e.varios){ dm.data=e.dia; mudou=true; }
  });
  if(mudou){ persist(); rebuild(); }
}
