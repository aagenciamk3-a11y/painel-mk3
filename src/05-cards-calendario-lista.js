/* ---------------- CARDS DE CLIENTE ---------------- */
/* ---- Feed: tudo que a equipe marcou, em ordem, para ninguem se perder ---- */
const ACAOROT = {
  concluir:["concluiu","ok"], registrar:["registrou","ok"], desfazer:["desfez","x"],
  naofeito:["marcou como não feito","x"], replanejar:["replanejou","mv"],
  observacao:["deixou observação em","obs"], demanda:["criou a demanda","nova"],
  recorrente:["criou a demanda recorrente","nova"], recpausa:["pausou ou retomou a recorrente","obs"],
  recorrentex:["removeu a recorrente","x"],
  renomear:["renomeou","obs"], novolink:["trocou o link do portal de","obs"],
  excluir:["excluiu","x"], restaurar:["restaurou","ok"], cobranca:["agendou cobrança de","nova"],
  editar:["editou a demanda","obs"], "cliente-editado":["editou o cadastro de","obs"],
  "cliente-novo":["cadastrou o cliente","nova"],
  arquivar:["arquivou o cliente","x"], reativar:["reativou o cliente","ok"],
  desremanejar:["desfez o remanejamento de","mv"], abasportal:["mudou o que o cliente vê em","obs"],
  mover:["moveu","mv"], demandax:["removeu a demanda","x"], plano:["atualizou o plano de","obs"]
};
function nomeCli(cid){
  if(cid==="_dem") return "Demanda";
  if(cid==="_rec") return "Recorrente";
  const c=CLIENTES.find(x=>x.id===cid); return c?c.nome:"";
}
/* de que area e a linha do log: demanda ja traz a area, tarefa vem do id.
   O que nao e nem uma coisa nem outra (cadastro, link de portal) e geral. */
function areaDoLog(x){
  if(x.area) return x.area;
  if(x.id && x.acao!=="demanda") return areaBase(String(x.id));
  return null;
}
function logVisivel(x){
  const a0=areaDoLog(x);
  const permitidas = USUARIO ? areasDe() : ["all","mkt","fin","com"];
  if(a0 && permitidas.indexOf("all")<0 && permitidas.indexOf(a0)<0) return false;  /* fora da area da pessoa */
  if(VISTA.area==="all") return true;
  return a0===VISTA.area;               /* linha geral so aparece na Visao Geral */
}
/* entradas dos ultimos N dias, sem repetir a mesma tarefa+acao */
function mudancasRecentes(nd){
  const limite=Date.now()-(nd||2)*24*3600*1000;
  const vistos={};
  return (ESTADO.log||[]).filter(x=>{
    if(!x || !x.ts) return false;
    if(new Date(x.ts).getTime()<limite) return false;
    if(x.acao==="observacao" && !x.motivo && !x.parcial) return false;
    if(!logVisivel(x)) return false;
    const k=(x.cliente||"")+"|"+(x.id||"")+"|"+x.acao;
    if(vistos[k]) return false;
    vistos[k]=1; return true;
  });
}
function mudancas48h(){ return mudancasRecentes(2).slice(0,12); }
function quandoRel(ts){
  const m=Math.round((Date.now()-new Date(ts).getTime())/60000);
  if(m<1) return "agora";
  if(m<60) return "há "+m+" min";
  const h=Math.round(m/60);
  if(h<24) return "há "+h+"h";
  const d0=Math.round(h/24);
  return "há "+d0+(d0>1?" dias":" dia");
}
function diaRot(iso0){
  const hoje=iso(HOJE);
  if(iso0===hoje) return "Hoje";
  if(iso0===addD(hoje,-1)) return "Ontem";
  return fmt(iso0)+" · "+dow(iso0);
}
function feedLinha(x){
  const a=ACAOROT[x.acao]||[x.acao,"obs"];
  const anon=!x.quem;                      /* marcacao antiga, de antes do painel guardar o autor */
  const quem=x.quem||"Autor não registrado";
  const cli=nomeCli(x.cliente);
  const c=cli?CLIENTES.find(y=>y.nome===cli):null;
  return '<div class="fd-row'+(anon?" anon":"")+'">'+
    '<span class="fd-face">'+(anon?'<span class="fd-anon">?</span>':faceDe(quem))+'</span>'+
    '<span class="fd-p '+a[1]+'"></span>'+
    '<span class="fd-t">'+(anon?'<i class="fd-sem">autor não registrado</i> ':'<b>'+esc(quem)+'</b> ')+
      esc(a[0])+' <em>'+esc(x.nome||x.id||"")+'</em>'+
      (x.motivo?'<span class="fd-obs">'+esc(x.motivo)+'</span>':'')+'</span>'+
    (c?'<a class="fd-c" href="'+rotaDe({escopo:c.id,aba:"tarefas"})+'" data-cliente="'+c.id+'" data-ir-aba="tarefas">'+esc(cli)+'</a>'
       :(cli?'<span class="fd-c">'+esc(cli)+'</span>':'<span class="fd-c"></span>'))+
    '<span class="fd-q">'+quandoRel(x.ts)+'</span>'+
  '</div>';
}
function feedHTML(){
  const nd=VISTA.feedDias||7;
  const ops=[[2,"48 horas"],[7,"7 dias"],[30,"30 dias"]];
  const chips='<div class="fd-chips">'+ops.map(o=>
    '<button class="fd-chip'+(nd===o[0]?" on":"")+'" data-feed="'+o[0]+'">'+o[1]+'</button>').join("")+'</div>';
  const l=mudancasRecentes(nd);
  const rotA={all:"",mkt:" em Marketing Digital",fin:" em Financeiro",com:" em Comercial"}[VISTA.area]||"";
  if(!l.length) return '<section class="feed"><div class="fd-topo"><h2>Quem fez o quê</h2>'+chips+'</div>'+
    '<div class="fd-vazio">Ningu\u00e9m marcou nada nesse per\u00edodo'+esc(rotA)+'.'+
    (VISTA.area!=="all"?' Em <b>Vis\u00e3o Geral</b> pode haver movimenta\u00e7\u00e3o de outras \u00e1reas.':
     ' Quando algu\u00e9m concluir, replanejar ou deixar observa\u00e7\u00e3o numa tarefa, aparece aqui com o nome e a hora.')+
    '</div></section>';
  const dias0={};
  l.forEach(x=>{ const d0=String(x.ts).slice(0,10); (dias0[d0]=dias0[d0]||[]).push(x); });
  const corpo=Object.keys(dias0).sort().reverse().map(d0=>
    '<div class="fd-dia"><div class="fd-dia-h">'+esc(diaRot(d0))+
      '<span>'+dias0[d0].length+(dias0[d0].length>1?" marcações":" marcação")+'</span></div>'+
      dias0[d0].map(feedLinha).join("")+'</div>').join("");
  return '<section class="feed"><div class="fd-topo"><h2>Quem fez o quê</h2>'+chips+'</div>'+corpo+'</section>';
}
/* selo do card: so aparece quando diz algo (antes "Ativo" estava em todos) */
function seloCliente(c){
  const v=c.vencimentoContrato;
  if(v){ const n=dias(v);
    if(n<0)   return '<span class="badge-ativo b-alerta">Contrato venceu</span>';
    if(n<=30) return '<span class="badge-ativo b-aviso">'+(c.semRenovacao?'Sai em ':'Contrato vence em ')+n+(n===1?' dia':' dias')+'</span>'; }
  const o=onboardingDe(c);
  if(o.total && !o.completo && mostraOnboarding()) return '<span class="badge-ativo">Onboarding</span>';
  return '';
}
/* contrato e mensalidade no card (so para quem cuida do administrativo) */
function contratoCardHTML(c){
  if(!mostraFinanceiro()) return '';
  const m=c.mensalidade||null, r=v=>"R$ "+Number(v||0).toLocaleString("pt-BR");
  const per=(c.inicioContrato&&c.vencimentoContrato) ? fmt(c.inicioContrato)+" a "+fmt(c.vencimentoContrato)
           : (c.vencimentoContrato ? "até "+fmt(c.vencimentoContrato) : "sem data de vencimento");
  return '<div class="ccard-fin">'+
    '<div class="cf"><span>Contrato</span><b>'+esc(c.contrato||"sem número")+'</b><i>'+esc(per)+'</i></div>'+
    '<div class="cf"><span>Mensalidade</span>'+(m
      ? '<b>'+r((m.valorPix||0)+(m.valorPermuta||0))+'</b><i>'+
          (m.valorPermuta ? Number(m.valorPix||0).toLocaleString("pt-BR")+" PIX + "+Number(m.valorPermuta).toLocaleString("pt-BR")+" permuta" : "PIX")+' · dia '+esc(m.diaVencimento)+'</i>'
      : '<b>—</b><i>não cadastrada</i>')+'</div>'+
  '</div>';
}
function cardsHTML(){
  /* conta uma vez por cliente: antes o sort refiltrava TODAS a cada comparacao */
  const por={}; CLIENTES.forEach(c=>{ por[c.id]=tarefasCli(c); });
  const crit=c=>{ const ts=por[c.id];
    return ts.filter(t=>t.st.k==="atrasado").length*100 + ts.filter(t=>t.st.k==="hoje").length*10 + ts.filter(t=>t.st.k==="umdia").length; };
  const peso={}; CLIENTES.forEach(c=>{ peso[c.id]=crit(c); });
  return CLIENTES.slice().sort((a,b)=>peso[b.id]-peso[a.id]).map(c=>{
    const ts = por[c.id];
    const n  = ks => ts.filter(t=>ks.includes(t.st.k)).length;
    const cor = coresDe(c);
    const lim30=addD(iso(HOJE),30);
    const prox30=ts.filter(t=>["semana","futuro"].includes(t.st.k) && t.data && t.data<=lim30).length;
    const tiles = [
      ["atrasado","Atrasado", n(["atrasado"]), "Passou da data e ainda não foi marcado"],
      ["hoje","Hoje e amanhã", n(["hoje","umdia"]), "Vence hoje ou amanhã"],
      ["semana","Em 30 dias", prox30, "A fazer nos próximos 30 dias (depois de amanhã até "+fmt(lim30)+")"],
      ["ok","Concluído",      n(["ok"]), "Tudo o que já foi feito para este cliente"]
    ];
    return '<a class="ccard" href="'+rotaDe({escopo:c.id,aba:"cal"})+'" data-cliente="'+c.id+'">'+
      '<div class="ccard-banner" style="background:linear-gradient(135deg,'+cor[0]+' 0%,'+cor[1]+' 100%)"></div>'+
      avatarHTML(c,"ccard-av")+
      '<div class="ccard-body">'+
        '<div class="ccard-top"><h3>'+esc(c.nome)+'</h3>'+seloCliente(c)+'</div>'+
        '<div class="ccard-stats">'+tiles.map(t=>
          '<div class="stat s-'+t[0]+'" data-tt="'+escAttr(t[3])+'"><i></i><b>'+t[2]+'</b> '+t[1]+'</div>').join("")+'</div>'+
      contratoCardHTML(c)+onbBadgeHTML(c)+linksHTML(c,"card")+'</div></a>';
  }).join("");
}


/* marco também tem área: pagamento e contrato são financeiro, o resto é marketing */
function areaMarco(mk){
  const t=((mk.titulo||"")+" "+(mk.detalhe||"")).toLowerCase();
  if(/parcela|pagamento|pagar|mensalidade|r\$|pacote de fotos|fornecedor|nota fiscal|boleto|pix/.test(t)) return "fin";
  if(/renova(ç|c)[ãa]o de contrato/.test(t)) return "fin";
  return "mkt";   /* assinatura, imersão, planejamento e gravação continuam sendo marketing */
}
function marcosDaArea(lista){
  if(!lista || !lista.length) return [];
  if(VISTA.area==="all") return lista;
  if(VISTA.area==="com") return [];
  return lista.filter(mk=>areaMarco(mk)===VISTA.area);
}
/* ---------------- CALENDÁRIO (reutilizável) ---------------- */
function calendario(tasks, marcos, showCli, soAgenda){
  const base = tasks.filter(t=>t.data);
  const ref  = new Date(HOJE.getFullYear(), HOJE.getMonth()+VISTA.mes, 1);
  const ano  = ref.getFullYear(), mes = ref.getMonth();
  const desloc = new Date(ano,mes,1).getDay();      // domingo = 0
  const ini = new Date(ano,mes,1-desloc);
  const hojeIso = iso(HOJE);
  const diasNoMes = new Date(ano,mes+1,0).getDate();
  const semanas = Math.ceil((desloc+diasNoMes)/7);

  let cells="";
  for(let i=0;i<semanas*7;i++){
    const dt = new Date(ini); dt.setDate(ini.getDate()+i);
    const s = iso(dt);
    const fora = dt.getMonth()!==mes;
    const fer  = feriado(s);
    const fds  = dt.getDay()===0 || dt.getDay()===6 || !!fer;
    const evs  = base.filter(t=>t.data===s);
    const mk   = marcos.filter(m=>m.data===s);
    const ags  = soAgenda ? agendaDaArea().filter(e=>e.dia===s)
               : ((VISTA.area==="all"||VISTA.area==="mkt") ? agendaVisivel().filter(e=>e.dia===s) : []);
    const cls  = ["cel", fora?"fora":"", fds?"fds":"", s===hojeIso?"hj":""].filter(Boolean).join(" ");
    const maxEv = 3;
    /* dentro do dia: o que está atrasado vem primeiro, o que já foi aprovado/concluído vem por último */
    const peso = it => it.ag ? 1.5
      : (it.marco ? 3.5
      : (it.o.fase==="Demanda" ? 0.8            /* demanda aparece cedo: e o que a equipe acabou de criar */
      : (ORDEM[it.o.st.k]!=null ? ORDEM[it.o.st.k] : 9)));
    const items = ags.map(a=>({o:a,ag:true})).concat(mk.map(m=>({o:m,marco:true}))).concat(evs.map(t=>({o:t,marco:false})))
      .sort((a,b)=> peso(a)-peso(b)
        || String((a.ag||a.marco)?(a.o.titulo||""):(a.o.cliente||"")).localeCompare(String((b.ag||b.marco)?(b.o.titulo||""):(b.o.cliente||"")))
        || String((a.ag||a.marco)?(a.o.titulo||""):(a.o.tarefa||"")).localeCompare(String((b.ag||b.marco)?(b.o.titulo||""):(b.o.tarefa||""))));
    const cap = Math.min(items.length, maxEv);
    const evsHtml = items.slice(0,cap).map(it=> it.ag ? evAgenda(it.o) : (it.marco ? evCard(it.o,false,true) : evCard(it.o,showCli,false))).join("");
    const resto = items.length - cap;
    const extra = resto>0 ? '<div class="mais" data-dia="'+s+'">+'+resto+' '+(resto===1?"item":"itens")+'</div>' : "";
    cells += '<div class="'+cls+(items.length?'':' vazia')+'" data-dia="'+s+'"><div class="n">'+dt.getDate()+'</div>'+
      (fer?'<div class="fer" data-tt="Feriado nacional: não conta como dia útil">'+esc(fer)+'</div>':'')+evsHtml+extra+'</div>';
  }

  let dica="";
  const doMes = base.filter(t=>{ const r=d(t.data); return r.getFullYear()===ano && r.getMonth()===mes; });
  const abertas = base.filter(t=>t.st.k!=="ok");
  if(!doMes.length && !marcos.length && abertas.length){
    const prox = abertas.slice().sort((a,b)=>Math.abs(dias(a.data))-Math.abs(dias(b.data)))[0];
    const r=d(prox.data);
    const salto=(r.getFullYear()-HOJE.getFullYear())*12+(r.getMonth()-HOJE.getMonth());
    dica='<div class="cal-dica">Nada neste mês. '+abertas.length+(abertas.length>1?' itens em aberto':' item em aberto')+
      ', o mais próximo em <b>'+r.toLocaleDateString("pt-BR",{month:"long",year:"numeric"})+'</b>'+
      '<button class="ubtn" data-irmes="'+salto+'">Ir para lá</button></div>';
  }
  /* atrasadas de meses anteriores nao aparecem na grade do mes: avisa em vez de parecer que nao ha nada */
  if(VISTA.mes===0){
    const ini0=iso(new Date(ano,mes,1));
    const velhas=tasks.filter(t=>t.st && t.st.k==="atrasado" && t.data && t.data<ini0).length;
    if(velhas) dica+='<div class="cal-dica atr"><b>'+velhas+'</b>'+(velhas>1?' tarefas atrasadas':' tarefa atrasada')+
      ' de meses anteriores não '+(velhas>1?'aparecem':'aparece')+' nesta grade.'+
      '<button class="ubtn" data-veratrasadas="1">Ver atrasadas</button></div>';
  }
  return dica+'<div class="cal-nav"><button data-mes="-1">&lsaquo;</button>'+
      '<strong>'+esc(mesAno(ref))+'</strong>'+
      '<button data-mes="1">&rsaquo;</button><button class="hj" data-mes="0">Hoje</button></div>'+
    '<div class="cal"><div class="cal-dow">'+
      '<div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div></div>'+
      '<div class="cal-grid">'+cells+'</div></div>';
}

/* ---------------- LISTA GLOBAL (todos os clientes) ---------------- */
function vazioHTML(filtro){
  const A={all:"nas suas áreas",mkt:"no Marketing",fin:"no Financeiro",com:"no Comercial"}[VISTA.area]||"";
  if(filtro) return '<div class="vaziox"><h4>Nada em "'+esc(ROTULO[filtro])+'"</h4>'+
    '<p>Nenhuma tarefa neste status '+esc(A)+' agora.</p>'+
    '<button data-limpafiltro="1">Ver todos os status</button></div>';
  return '<div class="vaziox"><h4>Tudo em dia '+esc(A)+'</h4>'+
    '<p>Nenhuma pendência aberta. Aproveite para adiantar o que vem pela frente.</p>'+
    '<button data-demanda="1">+ Nova demanda</button></div>';
}


/* ---- gravacao: a agenda manda, o painel obedece ----
   Le os eventos de gravacao da agenda ao vivo, preenche a data quando o painel
   esta vazio e denuncia quando as duas fontes discordam. Nunca sobrescreve
   sozinho uma data que ja existe: quem decide isso e a administracao. */
function ehGravacao(e){ return /grava(c|\u00e7)(a|\u00e3)o|gravar/i.test(String(e.titulo||"")); }
function gravacoesDaAgenda(){
  const mapa={};
  (ESTADO.agenda||[]).filter(e=>ehGravacao(e) && e.cliente && e.dia).forEach(e=>{
    const a=mapa[e.cliente];
    if(!a || e.dia>a.dia) mapa[e.cliente]={dia:e.dia, titulo:e.titulo, hora:e.hora||""};
  });
  return mapa;
}
function divergenciasGravacao(){
  const mapa=gravacoesDaAgenda(), out=[];
  CLIENTES.forEach(c=>{
    const g=mapa[c.id]; if(!g) return;
    if(c.gravacao && c.gravacao!==g.dia) out.push({cid:c.id, nome:c.nome, painel:c.gravacao, agenda:g.dia, hora:g.hora});
  });
  return out;
}
/* preenche so o que esta vazio; data futura nao marca a tarefa como feita */
function sincronizarGravacoes(){
  const mapa=gravacoesDaAgenda();
  let n=0;
  CLIENTES.forEach(c=>{
    const g=mapa[c.id]; if(!g || c.gravacao) return;
    ESTADO.datas[c.id]=ESTADO.datas[c.id]||{};
    ESTADO.datas[c.id].gravacao=g.dia;
    ESTADO.log.unshift({ts:new Date().toISOString(),cliente:c.id,nome:"Gravação",
      acao:"registrar",campo:"gravacao",id:"c1_gravacao",data:g.dia,quem:"Agenda"});
    n++;
  });
  if(n){ ESTADO.log=ESTADO.log.slice(0,300); persist(); rebuild(); }
  return n;
}
function usarDataDaAgenda(cid,dia){
  snapshot();
  ESTADO.datas[cid]=ESTADO.datas[cid]||{};
  ESTADO.datas[cid].gravacao=dia;
  const c=cliente(cid);
  ESTADO.log.unshift({ts:new Date().toISOString(),cliente:cid,nome:"Gravação",
    acao:"registrar",campo:"gravacao",id:"c1_gravacao",data:dia,quem:USUARIO||null});
  persist(); rebuild(); render();
  toast("Gravação de "+(c?c.nome:cid)+" agora é "+fmt(dia),true);
}
function avisoGravacaoHTML(){
  if(!ehAdmin()) return "";
  const d0=divergenciasGravacao();
  if(!d0.length) return "";
  return '<div class="avgrav"><span class="avgrav-i">&#9888;</span>'+
    '<div class="avgrav-c"><b>Grava\u00e7\u00e3o com duas datas diferentes</b>'+
    d0.map(x=>'<div class="avgrav-l">'+esc(x.nome)+': painel diz <s>'+fmt(x.painel)+'</s>, '+
      'agenda diz <b>'+fmt(x.agenda)+'</b>'+(x.hora?' \u00e0s '+esc(x.hora):'')+
      ' <button data-usaragenda="'+x.cid+'|'+x.agenda+'">usar a da agenda</button></div>').join("")+
    '</div></div>';
}

