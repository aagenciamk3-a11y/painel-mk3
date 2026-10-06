/* ---------------- PRIORIDADES DIÁRIAS (quadro semanal) ---------------- */
const EXEC = {
  c1_plan:"Planejamento", planej:"Planejamento", envPlanej:"Enviar planejamento",
  aprPlanej:"Aprovação do planejamento", envMidia:"Entregar artes", aprMidia:"Aprovação das artes",
  c1_artes:"Artes", midia:"Artes",
  c1_gravacao:"Dia de gravação", c1_gravacaoMarcar:"Marcar gravação", c1_roteiro:"Roteiro",
  c1_aprPlan:"Aprovação do planejamento", c1_aprMid:"Aprovação das artes",
  c1_podepostar:"Pode Postar", c1_entrega:"Entrega das peças"
};
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
function semanasDoMes(ano,mes){
  const set=new Set(); const last=new Date(ano,mes+1,0).getDate();
  for(let dia=1; dia<=last; dia++) set.add(segOf(iso(new Date(ano,mes,dia))));
  return [...set].sort();
}
/* responsavel de cada area sai da equipe cadastrada: a primeira pessoa (nao admin) da area */
const AREARESP = new Proxy({}, { get:(_,area)=>{
  const ps=(typeof ESTADO!=="undefined" && ESTADO.pessoas)||SEED_PESSOAS;
  const p=ps.find(x=>!x.admin && (x.areas||[]).indexOf(area)>=0);
  return p?p.nome:undefined;
}});
const SEED_PESSOAS = [
  {nome:"Guilherme",foto:null,            admin:true,  areas:["all","mkt","fin","com"], pin:""},
  {nome:"Alda",     foto:null,            admin:true,  areas:["all","mkt","fin","com"], pin:""},
  {nome:"Carla",    foto:"fotos/carla.jpg", admin:false, areas:["mkt"], pin:""},
  {nome:"Bia",      foto:"fotos/bia.jpg",   admin:false, areas:["fin"], pin:""},
  {nome:"Marlon",   foto:null,            admin:false, areas:["com"], pin:""}
];
const PERMS_PADRAO = {Guilherme:{admin:true,areas:["all","mkt","fin","com"]},Alda:{admin:true,areas:["all","mkt","fin","com"]},
  Carla:{admin:false,areas:["mkt"]},Bia:{admin:false,areas:["fin"]},Marlon:{admin:false,areas:["com"]}};

/* ---- sessão / permissões ---- */
let USUARIO=null;
const eu = () => (ESTADO.pessoas||[]).find(p=>p.nome===USUARIO)||null;
const ehAdmin = () => { const p=eu(); return !!(p&&p.admin); };
const areasDe = () => { const p=eu(); if(!p) return []; return p.admin?["all","mkt","fin","com"]:((p.areas||[]).filter(a=>a!=="all")); };
const podeArea = a => areasDe().indexOf(a)>=0;
function entrar(nome){
  USUARIO=nome; VISTA.pinPara=null;
  setTimeout(()=>{ try{ migrarDadosDoCodigo(); }catch(e){} },0);
  rebuild();                                      /* recorrente por pessoa: so aparece para quem pode ver */
  if(typeof reiniciarOcioso==="function") reiniciarOcioso();

  const as=areasDe(); if(as.indexOf(VISTA.area)<0) VISTA.area=as[0]||"mkt";
  VISTA.escopo=null; VISTA.modo="cards"; VISTA.filtro=null;
  aplicarRota();                                  /* abriu com endereço de uma tela? vai direto para ela */
  const as2=areasDe(); if(as2.indexOf(VISTA.area)<0) VISTA.area=as2[0]||"mkt";
  render();
  setTimeout(rodarCobrancas, 2500);               /* so quem e da administracao dispara */
}
function tentarEntrar(nome){
  const p=(ESTADO.pessoas||[]).find(x=>x.nome===nome);
  if(p && p.pin){ VISTA.pinPara=nome; render(); return; }
  entrar(nome);
}
function sair(){ USUARIO=null; VISTA.pinPara=null; UNDO.length=0; REDO.length=0;   /* quem entra depois nao desfaz o que o outro fez */
  rebuild(); fecharModal(); render(); }

/* sai sozinho depois de um tempo parado (evita ficar aberto na mesa de alguém) */
const OCIOSO_MIN=30;
let ocioso=null;
function reiniciarOcioso(){
  if(!USUARIO) return;
  clearTimeout(ocioso);
  ocioso=setTimeout(()=>{ if(USUARIO){ toast("Sessão encerrada por inatividade",false); sair(); } }, OCIOSO_MIN*60*1000);
}
["click","keydown","mousemove","touchstart"].forEach(ev=>document.addEventListener(ev,()=>{ if(USUARIO) reiniciarOcioso(); },{passive:true}));
const pessoaPorNome = n => (ESTADO.pessoas||[]).find(p=>p.nome===n);
function faceDe(nome){
  if(!nome) return '';
  const p=pessoaPorNome(nome), foto=p&&p.foto;
  return '<span class="card-face" title="'+esc(nome)+'">'+esc(nome.slice(0,1))+(fotoOk(foto)?'<img src="'+escAttr(foto)+'" alt="" onerror="this.remove()">':'')+'</span>';
}
function addPessoa(nome){ nome=(nome||"").trim(); if(!nome) return; ESTADO.pessoas=ESTADO.pessoas||[]; if(ESTADO.pessoas.some(p=>p.nome===nome)) return; snapshot(); ESTADO.pessoas.push({nome:nome,foto:null}); persist(); render(); }
function confirmarRemoverPessoa(nome){
  if(!ehAdmin()) return;
  const mm=$("modal");
  mm.innerHTML='<div class="mbox"><h3>Remover '+esc(nome)+' da equipe?</h3>'+
    '<div class="ex-aviso">Some a pessoa, o PIN, as áreas e a foto. As tarefas que ela já marcou continuam no histórico. '+
    'Dá para desfazer logo depois.</div>'+
    '<div class="mbtns"><button class="danger" data-pessoaxok="'+escAttr(nome)+'">Remover</button>'+
    '<button class="sec" data-equipe="1">Voltar</button></div></div>';
  mostrarModal(true);
}
function removePessoa(nome){ snapshot(); ESTADO.pessoas=(ESTADO.pessoas||[]).filter(p=>p.nome!==nome); persist(); rebuild(); render(); }
function setFotoPessoa(nome,url){ const p=pessoaPorNome(nome); if(!p) return; snapshot(); p.foto=url; persist(); rebuild(); render(); }
function relevanteBoard(t){
  if(t.fase==="Demanda") return VISTA.area==="all" || t.area===VISTA.area;
  if(VISTA.area==="fin" || VISTA.area==="com") return t.area===VISTA.area;
  return !!EXEC[baseId(t.id)];   // Visão Geral / Marketing: entregas de execução
}
function resumoSemanaHTML(){
  const wk=VISTA.psem; if(!wk) return '';
  let feitas=0, naofeitas=0; const motivos={};
  for(let i=0;i<5;i++){
    const day=addD(wk,i);
    TODAS.filter(t=>t.data===day && relevanteBoard(t)).forEach(t=>{
      const x=xInfo(wk,t.clienteId,t.id,day);
      if(x){ naofeitas++; const k=(x.motivo||"sem motivo").trim(); motivos[k]=(motivos[k]||0)+1; }
      else if(t.st.k==="ok") feitas++;
    });
  }
  const top=Object.entries(motivos).sort((a,b)=>b[1]-a[1]).slice(0,3);
  if(!feitas && !naofeitas) return '';
  const tot=feitas+naofeitas, pct=tot?Math.round(feitas/tot*100):0;
  return '<div class="resumo">'+
    '<div class="res-h">Resumo da semana</div>'+
    '<div class="res-nums"><span class="res-ok"><b>'+feitas+'</b> feitas</span>'+
      '<span class="res-x"><b>'+naofeitas+'</b> não feitas</span>'+
      '<span class="res-pct">'+pct+'% concluído</span></div>'+
    '<div class="res-bar"><i style="width:'+pct+'%"></i></div>'+
    (top.length?'<div class="res-mot"><span class="res-mot-h">Principais motivos</span>'+
      top.map(([k,n])=>'<span class="res-chip">'+esc(k)+' <b>'+n+'</b></span>').join("")+'</div>':'')+
  '</div>';
}
function atrasosHistoricos(){
  const alvo = VISTA.escopo ? CLIENTES.filter(c=>c.id===VISTA.escopo) : CLIENTES;
  const out=[];
  alvo.forEach(c=>{
    /* etapas oficiais com data real (consumadas) */
    atrasos(c).forEach(a=>{
      if(a.previsto || !a.limite) return;
      out.push({mes:a.limite.slice(0,7), quem:a.quem, dias:a.dias, cliente:c.nome,
                etapa:a.etapa, justificado:!!a.justificado});
    });
    /* qualquer tarefa concluída fora do prazo */
    TODAS.filter(t=>t.clienteId===c.id && t.st.k==="ok" && t.st.atraso>0 && t.data && areaMatch(t))
      .forEach(t=>out.push({mes:t.data.slice(0,7), quem:(t.resp==="Cliente"?"Cliente":"MK3"),
                dias:t.st.atraso, cliente:c.nome, etapa:t.tarefa, justificado:false}));
  });
  /* remove duplicidade (mesma etapa/mês/cliente) */
  const vis=new Set(); const fim=[];
  out.forEach(a=>{ const k=a.cliente+"|"+a.etapa+"|"+a.mes; if(vis.has(k))return; vis.add(k); fim.push(a); });
  return fim;
}
function tendenciaHTML(){
  const H=atrasosHistoricos().filter(a=>!a.justificado);
  const emAberto=TODAS.filter(t=>t.st.k==="atrasado" && areaMatch(t) && (!VISTA.escopo||t.clienteId===VISTA.escopo));
  /* últimos 6 meses até o atual */
  const meses=[]; const base=new Date(HOJE.getFullYear(),HOJE.getMonth(),1);
  for(let i=5;i>=0;i--){ const d0=new Date(base.getFullYear(),base.getMonth()-i,1);
    meses.push(iso(d0).slice(0,7)); }
  const dados=meses.map(ms=>{
    const doMes=H.filter(a=>a.mes===ms);
    const mk3=doMes.filter(a=>a.quem==="MK3").reduce((s,a)=>s+a.dias,0);
    const cli=doMes.filter(a=>a.quem==="Cliente").reduce((s,a)=>s+a.dias,0);
    return {ms, mk3, cli, n:doMes.length};
  });
  const topo=Math.max(1,...dados.map(x=>Math.max(x.mk3,x.cli)));
  const nomeMes=ms=>{const [a,b]=ms.split("-");return new Date(a,b-1,1).toLocaleDateString("pt-BR",{month:"short"}).replace(".","");};
  const atual=dados[dados.length-1], ant=dados[dados.length-2]||{mk3:0,cli:0};
  const varia=(hoje,antes)=>{ if(!antes&&!hoje) return {txt:"sem atrasos",cls:"n"};
    if(!antes) return {txt:"+"+hoje+"d vs mês anterior",cls:"pior"};
    const p=Math.round((hoje-antes)/antes*100);
    if(p===0) return {txt:"igual ao mês anterior",cls:"n"};
    return {txt:(p>0?"+":"")+p+"% vs mês anterior",cls:p>0?"pior":"melhor"}; };
  const vM=varia(atual.mk3,ant.mk3), vC=varia(atual.cli,ant.cli);

  /* ranking por cliente (6 meses) */
  const porCli={};
  H.filter(a=>meses.indexOf(a.mes)>=0).forEach(a=>{
    porCli[a.cliente]=porCli[a.cliente]||{mk3:0,cli:0};
    porCli[a.cliente][a.quem==="MK3"?"mk3":"cli"]+=a.dias;
  });
  const rank=Object.entries(porCli).map(([n,v])=>({n,...v,tot:v.mk3+v.cli})).sort((a,b)=>b.tot-a.tot);

  const barras=dados.map(x=>{
    const hM=Math.round(x.mk3/topo*100), hC=Math.round(x.cli/topo*100);
    return '<div class="tg-col'+(x.ms===iso(HOJE).slice(0,7)?" atual":"")+'">'+
      '<div class="tg-bars">'+
        '<span class="tg-b mk3" style="height:'+hM+'%" title="MK3: '+x.mk3+' dias úteis">'+(x.mk3?'<i>'+x.mk3+'</i>':'')+'</span>'+
        '<span class="tg-b cli" style="height:'+hC+'%" title="Cliente: '+x.cli+' dias úteis">'+(x.cli?'<i>'+x.cli+'</i>':'')+'</span>'+
      '</div>'+
      '<span class="tg-m">'+nomeMes(x.ms)+'</span></div>';
  }).join("");

  const semDados = H.length===0;
  return '<div class="tend">'+
    (semDados?'<div class="vaziox"><h4>Ainda sem histórico de atraso</h4>'+
      '<p>O gráfico se preenche conforme as etapas forem concluídas com data. Sempre que você marcar "concluído em tal dia" ou registrar a resposta do cliente, o atraso entra aqui.</p>'+
      '<button data-view="prio">Ir para as tarefas da semana</button></div>':'')+
    '<div class="tend-topo">'+
      '<div class="tend-kpi"><span class="k-r">Atraso da MK3 · mês atual</span><b class="mk3">'+atual.mk3+'<small>dias úteis</small></b>'+
        '<span class="k-v '+vM.cls+'">'+esc(vM.txt)+'</span></div>'+
      '<div class="tend-kpi"><span class="k-r">Atraso do cliente · mês atual</span><b class="cli">'+atual.cli+'<small>dias úteis</small></b>'+
        '<span class="k-v '+vC.cls+'">'+esc(vC.txt)+'</span></div>'+
      '<div class="tend-kpi"><span class="k-r">Em aberto agora</span><b class="ab">'+emAberto.length+'<small>tarefas atrasadas</small></b>'+
        '<span class="k-v n">precisam de ação</span></div>'+
    '</div>'+
    '<div class="tend-cx"><div class="tend-h">Últimos 6 meses <span class="leg"><i class="mk3"></i>MK3 <i class="cli"></i>Cliente</span></div>'+
      '<div class="tg">'+barras+'</div></div>'+
    (rank.length
      ? '<div class="tend-cx"><div class="tend-h">Por cliente (6 meses)</div>'+
        rank.map(r=>{
          const t=Math.max(1,rank[0].tot);
          return '<div class="rk"><span class="rk-n">'+esc(r.n)+'</span>'+
            '<span class="rk-bar"><i class="mk3" style="width:'+Math.round(r.mk3/t*100)+'%"></i>'+
            '<i class="cli" style="width:'+Math.round(r.cli/t*100)+'%"></i></span>'+
            '<span class="rk-v">'+r.tot+'d</span></div>';
        }).join("")+'</div>'
      : '')+
    '<p class="tend-nota">Conta apenas atrasos já consumados (etapa entregue ou respondida fora do prazo), em dias úteis. '+
    'Atrasos justificados ficam de fora. Entregas são responsabilidade da MK3; aprovações, do cliente.</p>'+
  '</div>';
}
function prioridadesHTML(){
  if(VISTA.pano==null){ VISTA.pano=HOJE.getFullYear(); VISTA.pmes=HOJE.getMonth(); }
  if(VISTA.psem==null) VISTA.psem=segOf(iso(HOJE));
  const anos=[...new Set(TODAS.filter(t=>t.data).map(t=>+t.data.slice(0,4)).concat([HOJE.getFullYear()]))].sort();
  let semanas=semanasDoMes(VISTA.pano,VISTA.pmes);
  if(!semanas.includes(VISTA.psem)) VISTA.psem=semanas[0];

  const selAno='<select data-sel="ano">'+anos.map(a=>'<option value="'+a+'"'+(a===VISTA.pano?" selected":"")+'>'+a+'</option>').join("")+'</select>';
  const selMes='<select data-sel="mes">'+MESES.map((n,i)=>'<option value="'+i+'"'+(i===VISTA.pmes?" selected":"")+'>'+n+'</option>').join("")+'</select>';
  const selSem='<select data-sel="semana">'+semanas.map(mon=>'<option value="'+mon+'"'+(mon===VISTA.psem?" selected":"")+'>'+fmt(mon).slice(0,5)+' a '+fmt(addD(mon,4)).slice(0,5)+'</option>').join("")+'</select>';

  const dias=["Segunda","Terça","Quarta","Quinta","Sexta"];
  const hojeIso=iso(HOJE);
  let cols="";
  for(let i=0;i<5;i++){
    const dayIso=addD(VISTA.psem,i);
    const reais=TODAS.filter(t=>t.data===dayIso && relevanteBoard(t))
      .sort((a,b)=> (ORDEM[a.st.k]??9)-(ORDEM[b.st.k]??9) || a.clienteId.localeCompare(b.clienteId));
    const dups=(ESTADO.dup||[]).filter(e=>e.dia===dayIso && !e.mover)
      .map(e=>({t:TODAS.find(x=>x.clienteId===e.cid&&x.id===e.tid),orig:e.orig}))
      .filter(o=>o.t && relevanteBoard(o.t));   /* a cópia respeita a área, como a original */
    const cs=reais.map(t=>bcardHTML(t,dayIso,null)).concat(dups.map(o=>bcardHTML(o.t,dayIso,o.orig)));
    let vazioBody;
    if(!cs.length){
      const nAtr=atrasadasDisponiveis(dayIso).length;
      vazioBody='<div class="bcol-vaziox">'+
        (nAtr ? '<span>Sem entregas neste dia.</span>'+
                '<button class="vz-atr" data-atrasadas="1" data-mday="'+dayIso+'">Fazer tarefas atrasadas ('+nAtr+')</button>'
              : '<span>Sem entregas neste dia.</span>'+
                '<button data-demanda="1" data-demdia="'+dayIso+'">+ Demanda</button>')+
      '</div>';
    }
    const body=cs.length ? cs.join("") : vazioBody;
    const nota=(ESTADO.notas&&ESTADO.notas[dayIso])||"";
    const notaEl='<div class="bnota'+(nota?" tem":"")+'" data-nota="'+dayIso+'"><span class="bnota-h">&#128221; Notas</span>'+
      (nota?'<span class="bnota-prev">'+esc(nota.length>70?nota.slice(0,70)+"\u2026":nota)+'</span>':'<span class="bnota-add">anotar\u2026</span>')+'</div>';
    cols+='<div class="bcol'+(dayIso===hojeIso?" hoje":"")+'" data-daycol="'+dayIso+'"><div class="bcol-h"><span>'+dias[i]+(cs.length?'<span class="bcount">'+cs.length+'</span>':'')+'</span><span class="bcol-hr">'+fmt(dayIso).slice(0,5)+'<button class="bcol-add" data-demanda="1" data-demdia="'+dayIso+'" title="Nova demanda neste dia" aria-label="Nova demanda">+</button>'+'</span></div><div class="bcol-body">'+body+'</div>'+notaEl+'</div>';
  }
  const rotArea={all:"Todas as áreas",...AREA_ROT}[VISTA.area]||"";
  return '<div class="semsel"><span class="semsel-l">Semana:</span>'+selAno+selMes+selSem+
           '</div>'+
         '<div class="board">'+cols+'</div>'+resumoSemanaHTML();
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
    (ehAdmin()?'<div class="rel-atalho"><button data-plano="'+c.id+'|'+mesAtualYM()+'">'+
      '&#127919; Plano de '+esc(mesExtenso(mesAtualYM()))+'</button>'+
      '<button data-relatorio="'+c.id+'|'+mesAtualYM()+'">'+
      '&#128203; Rascunho do relat\u00f3rio</button></div>':'')+
    '<h2>'+(VISTA.filtro?ROTULO[VISTA.filtro]:"Pendências")+'</h2>'+
    (lista.length ? '<div class="fila">'+lista.slice(0,VISTA.verTudo?999:7).map(t=>linha(t,false)).join("")+'</div>'+
        (!VISTA.verTudo && lista.length>7 ? '<button class="vermais" data-vertudo="1">Ver todas as '+lista.length+'</button>' : '')
      : vazioHTML(VISTA.filtro));

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

    const extras = TODAS.filter(t=>t.clienteId===c.id && t.st.k==="ok" && t.st.atraso>0 && t.data)
      .map(t=>({etapa:t.tarefa, cliente:c.nome, limite:t.data, real:t.st.quando, dias:t.st.atraso,
                quem:(t.resp==="Cliente"?"Cliente":"MK3"), causa:"entregue fora do prazo", previsto:false, justificado:false}));
    const atr = atrasos(c).concat(extras).sort((a,b)=>b.dias-a.dias);
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

