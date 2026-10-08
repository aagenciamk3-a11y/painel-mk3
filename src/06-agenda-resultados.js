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
function puxarAgendaAoVivo(){
  const u=agendaUrl(); if(!u) return;
  fetch(u+(u.indexOf("?")<0?"?":"&")+"ts="+Date.now())
    .then(r=>r.ok?r.json():null)
    .then(j=>{
      if(!j || !Array.isArray(j.eventos)) return;
      const antes=JSON.stringify(ESTADO.agenda||[]);
      ESTADO.agenda=j.eventos;                     /* só na memória: não grava nem sincroniza */
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
  AGENDA_T=setInterval(()=>{ if(!document.hidden) puxarAgendaAoVivo(); }, 60000);   /* aba escondida nao busca */
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



