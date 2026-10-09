/* ---------- sincronização em tempo real ---------- */
/* ================= SINCRONIZACAO =================
   Antes: cada clique gravava o ESTADO inteiro, e quem salvasse por ultimo apagava o que
   os outros tinham feito no meio tempo (inclusive pelo Desfazer).
   Agora: cada pessoa envia so os caminhos que ela mudou (ex.: concluidas/suelem),
   o log e somado por transacao, e o Desfazer de cada um ignora o que veio dos colegas. */
const ESTADO_VAZIO = () => ({concluidas:{},datas:{},semanal:{},notas:{},dup:[],demandas:[],recorrentes:[],portais:{},obsT:{},
  excluidas:{},titulos:{},clientes:{},novosClientes:[],pessoas:[],resultados:{},ficha:{},agenda:[],agendaResp:{},
  cobrancas:{},plano:{},agendaChave:"",log:[]});
function normalizarEstado(v){
  const e=Object.assign(ESTADO_VAZIO(), v||{});
  const vz=ESTADO_VAZIO();
  for(const k in vz){ if(e[k]==null || (Array.isArray(vz[k]) && !Array.isArray(e[k])) ) e[k]=vz[k]; }
  /* o Firebase guarda array como objeto quando ha buracos: volta para array */
  ["dup","demandas","recorrentes","novosClientes","pessoas","agenda","log"].forEach(k=>{
    if(e[k] && !Array.isArray(e[k]) && typeof e[k]==="object") e[k]=Object.keys(e[k]).sort((a,b)=>a-b).map(x=>e[k][x]).filter(Boolean); });
  if(!e.pessoas.length) e.pessoas=SEED_PESSOAS.map(p=>({...p}));
  e.pessoas.forEach(p=>{
    if(p.admin===undefined){ const dd=PERMS_PADRAO[p.nome]; p.admin=dd?dd.admin:false; p.areas=dd?dd.areas.slice():["mkt"]; }
    if(!p.areas) p.areas=["mkt"];
    if(!p.admin) p.areas=(p.areas||[]).filter(a=>a!=="all");   /* "all" é exclusivo de admin */
    if(p.pin===undefined) p.pin="";
  });
  return e;
}
const ehObj = x => x && typeof x==="object" && !Array.isArray(x);
/* forma canonica: o Firebase devolve as chaves em ordem alfabetica e apaga vazio e null.
   Comparar sem isto faz o eco da propria acao parecer mudanca de colega. */
function canon(v){
  if(v==null || typeof v==="function" || (typeof v==="number" && !isFinite(v))) return undefined;
  if(Array.isArray(v)){ const a=v.map(canon); while(a.length && a[a.length-1]===undefined) a.pop();
    return a.length ? a.map(x=>x===undefined?null:x) : undefined; }
  if(typeof v==="object"){ const o={}; Object.keys(v).sort().forEach(k=>{ const c=canon(v[k]); if(c!==undefined) o[k]=c; });
    return Object.keys(o).length ? o : undefined; }
  return v;
}
const chaveCanon = v => JSON.stringify(canon(v));
const igual = (a,b) => chaveCanon(a)===chaveCanon(b);
/* ate que nivel cada parte do estado desce: onde varios clientes dividem o mesmo objeto
   (semana -> cliente|tarefa|dia), descer mais evita que duas pessoas se atropelem */
const PROF = {semanal:3, obsT:3, datas:3, ficha:3, clientes:3, plano:3, portais:3, resultados:2};
/* o que nunca vai para o banco: a agenda e lida do Google por cada navegador, a cada minuto */
const SO_LOCAL = new Set(["agenda"]);
function caminhosDiff(a,b){
  const out=[];
  const desce=(x,y,pre)=>{
    const lim=PROF[pre[0]]||2;
    const ks=new Set(Object.keys(x||{}).concat(Object.keys(y||{})));
    ks.forEach(k=>{
      if(!pre.length && SO_LOCAL.has(k)) return;
      const u=(x||{})[k], w=(y||{})[k], p=pre.concat(k);
      if(igual(u,w)) return;
      if(ehObj(u) && ehObj(w) && p.length<lim) desce(u,w,p);
      else out.push(p);
    });
  };
  desce(a,b,[]);
  return out;
}
const lerCaminho = (o,p) => { let x=o; for(const k of p){ if(x==null || typeof x!=="object") return undefined; x=x[k]; } return x; };
function gravarCaminho(o,p,v){
  const c = (v===undefined) ? undefined : JSON.parse(JSON.stringify(v));
  let x=o;
  for(let i=0;i<p.length-1;i++){ if(!ehObj(x[p[i]])) x[p[i]]={}; x=x[p[i]]; }
  if(c===undefined) delete x[p[p.length-1]]; else x[p[p.length-1]]=c;
}
/* fusao de lista em 3 vias: mantem a minha ordem, tira o que um colega removeu,
   acrescenta no fim o que um colega criou. Base = como estava antes da minha mudanca. */
function merge3(base,mine,cur){
  const lista=v=>Array.isArray(v)?v.filter(x=>x!=null):(ehObj(v)?Object.keys(v).sort((a,b)=>a-b).map(k=>v[k]).filter(x=>x!=null):[]);
  const B=new Set(lista(base).map(chaveCanon)), M=new Set(lista(mine).map(chaveCanon)), C=new Set(lista(cur).map(chaveCanon));
  const out=lista(mine).filter(x=>{ const k=chaveCanon(x); return !(B.has(k) && !C.has(k)); });
  lista(cur).forEach(x=>{ const k=chaveCanon(x); if(!B.has(k) && !M.has(k)) out.push(x); });
  return out;
}
/* o log e de todos: soma as entradas novas em vez de sobrescrever a lista */
/* a mesma marcacao e identificada por instante + acao + tarefa; o autor nao entra na chave,
   senao uma correcao de autor virava uma segunda linha no feed */
const chaveLog = l => (l&&l.ts||"")+"|"+(l&&l.acao||"")+"|"+(l&&l.id||"");
function somarLog(a,b){
  const porChave=new Map();
  const lista=v=>Array.isArray(v)?v:(ehObj(v)?Object.values(v):[]);
  lista(a).concat(lista(b)).forEach(l=>{ if(!l) return; const k=chaveLog(l); const j=porChave.get(k);
    if(!j || (!j.quem && l.quem)) porChave.set(k,l); });      /* entre duas versoes, fica a que tem autor */
  return [...porChave.values()].sort((x,y)=>String(y.ts||"").localeCompare(String(x.ts||""))).slice(0,300);
}

let SYNC=null, SYNC_APLICANDO=false, SYNC_ON=false;
let SYNC_BASE=null;        /* ultimo estado que sabemos que esta no servidor */
let SYNC_PRONTO=false;     /* so envia depois de ler o servidor pela primeira vez */
function syncIniciar(){
  try{
    if(!window.firebase || !window.MK3_FIREBASE) return;
    const app = firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp(window.MK3_FIREBASE);
    SYNC = firebase.database().ref("painel/estado");
    const inicioLocal = JSON.parse(JSON.stringify(ESTADO));   /* o que estava no cache quando abriu */
    SYNC.on("value", snap=>{
      const v=snap.val();
      if(!SYNC_PRONTO){
        SYNC_PRONTO=true;
        if(!v){ SYNC_BASE=normalizarEstado({}); syncEnviar(); return; }
        const remoto=normalizarEstado(v);
        /* o que a pessoa mexeu antes do servidor responder vai por cima do que chegou;
           lista e fundida (nao apaga o que os colegas criaram desde o cache) */
        const meus=caminhosDiff(inicioLocal, ESTADO);
        SYNC_BASE=JSON.parse(JSON.stringify(remoto));
        meus.forEach(p=>{ if(p[0]==="log") return;
          const b0=lerCaminho(inicioLocal,p), m0=lerCaminho(ESTADO,p), r0=lerCaminho(remoto,p);
          gravarCaminho(remoto,p, (Array.isArray(m0)||Array.isArray(b0)) ? merge3(b0,m0,r0) : m0); });
        remoto.log=somarLog(remoto.log, ESTADO.log);
        /* o Desfazer guardado antes de ler o servidor e do cache velho: nao pode voltar */
        UNDO.length=0; REDO.length=0;
        aplicarRemoto(remoto, null);
        if(meus.length) syncEnviar();
        migrarPins();
        if(USUARIO) migrarDadosDoCodigo();
        return;
      }
      if(!v) return;
      const remoto=normalizarEstado(v);
      const deles=caminhosDiff(SYNC_BASE, remoto);
      SYNC_BASE=JSON.parse(JSON.stringify(remoto));
      if(!deles.length) return;                     /* eco do que eu mesmo mandei */
      /* o que eu mudei e ainda nao voltou do servidor continua valendo */
      const meus=caminhosDiff(SYNC_BASE, ESTADO).filter(p=>!deles.some(q=>q.join("/")===p.join("/")));
      meus.forEach(p=>{ if(p[0]==="log") return; gravarCaminho(remoto,p,lerCaminho(ESTADO,p)); });
      remoto.log=somarLog(remoto.log, ESTADO.log);
      aplicarRemoto(remoto, deles);
    }, err=>{ SYNC_ON=false; marcarSync("erro"); });
    firebase.database().ref(".info/connected").on("value", s=>{ SYNC_ON=!!s.val(); marcarSync(SYNC_ON?"ligado":"offline"); if(SYNC_ON) agendarEspelho(); });
  }catch(e){ SYNC=null; }
}
/* troca o estado pelo do servidor e corrige o Desfazer/Refazer: o que veio dos colegas
   passa a fazer parte de cada passo guardado, entao desfazer nao apaga o trabalho deles */
function aplicarRemoto(novo, caminhos){
  SYNC_APLICANDO=true;
  if(caminhos && caminhos.length){
    const fix=pilha=>pilha.forEach((snap,i)=>{ try{ const o=JSON.parse(snap);
      caminhos.forEach(p=>{ if(p[0]!=="log") gravarCaminho(o,p,lerCaminho(novo,p)); });
      o.log=somarLog(o.log, novo.log); pilha[i]=JSON.stringify(o); }catch(e){} });
    fix(UNDO); fix(REDO);
  }
  /* o que e so local (agenda do Google) continua o que este navegador leu */
  SO_LOCAL.forEach(k=>{ if(ESTADO && ESTADO[k]!==undefined) novo[k]=ESTADO[k]; });
  const urlAntes = ESTADO && ESTADO.agendaUrl;
  ESTADO=novo;
  try{ localStorage.setItem("mk3_estado", JSON.stringify(ESTADO)); }catch(e){}
  /* o endereco da agenda pode chegar so agora (navegador novo, cache limpo): liga a leitura na hora */
  if(typeof ligarAgendaAoVivo==="function" && ESTADO.agendaUrl && (ESTADO.agendaUrl!==urlAntes || !AGENDA_T)) ligarAgendaAoVivo();
  const pinAberto = document.getElementById("pinInput");          /* nao redesenha a tela de PIN no meio da digitacao */
  rebuild(); if(!(pinAberto && !USUARIO)) render();
  SYNC_APLICANDO=false;
  marcarSync("recebido");
}
function syncEnviar(){
  if(!SYNC || SYNC_APLICANDO) return;
  if(!SYNC_PRONTO || !SYNC_BASE) return;            /* ainda nao leu o servidor: o envio sai quando ler */
  try{
    const ps=caminhosDiff(SYNC_BASE, ESTADO);
    if(!ps.length) return;
    const antes=JSON.parse(JSON.stringify(SYNC_BASE));
    const up={}, listas=[]; let temLog=false;
    ps.forEach(p=>{
      if(p[0]==="log"){ temLog=true; return; }
      const v=lerCaminho(ESTADO,p), b0=lerCaminho(antes,p);
      if(Array.isArray(v) || Array.isArray(b0)) listas.push([p,b0,v]);       /* lista: funde no servidor */
      else up[p.join("/")] = (v===undefined) ? null : JSON.parse(JSON.stringify(v));
    });
    const novos=temLog ? (ESTADO.log||[]).filter(l=>!(antes.log||[]).some(b=>chaveLog(b)===chaveLog(l))) : [];
    /* a base anda ANTES de enviar: o Firebase devolve o eco na hora, dentro do update,
       e sem isto a propria mudanca pareceria vinda de um colega (e o Desfazer nao a tiraria) */
    ps.forEach(p=>{ if(p[0]!=="log") gravarCaminho(SYNC_BASE,p,lerCaminho(ESTADO,p)); });
    SYNC_BASE.log=somarLog(SYNC_BASE.log, ESTADO.log);
    if(Object.keys(up).length) SYNC.update(up).catch(()=>marcarSync("erro"));
    listas.forEach(([p,b0,v])=>{
      SYNC.child(p.join("/")).transaction(cur=>{ const r=merge3(b0,v,cur); return r.length?JSON.parse(JSON.stringify(r)):null; })
        .catch(()=>marcarSync("erro"));
    });
    if(novos.length) SYNC.child("log").transaction(cur=>somarLog(cur, novos)).catch(()=>{});
  }catch(e){ marcarSync("erro"); }
}
let syncTimer=null;
function marcarSync(estado){
  const el=document.getElementById("syncst"); if(!el) return;
  const mapa={ligado:["Sincronizado","on"],recebido:["Atualizado agora","on"],offline:["Sem conexão","off"],erro:["Sem sincronizar","off"],local:["Só neste navegador","off"]};
  const m0=mapa[estado]||mapa.offline;
  el.textContent=m0[0]; el.className="syncst "+m0[1];
  if(estado==="recebido"){ clearTimeout(syncTimer); syncTimer=setTimeout(()=>marcarSync(SYNC_ON?"ligado":"offline"),2500); }
}

/* ---- espelho público: cada portal de cliente lê só o nó do token dele ---- */
let ESPELHO_T=null;
function espelhoDe(cid){
  const p=(ESTADO.portais&&ESTADO.portais[cid])||null;
  const cli=CLIENTES.find(x=>x.id===cid)||null;
  /* o que esta parado na mao do cliente, para ele ver o proprio gargalo */
  const pend = cli ? contadores(cli).map(x=>({
        tipo:x.tipo, enviado:x.enviado, vencimento:x.vencimento,
        dias:uteisAte(x.vencimento) })) : [];
  /* a pagina do portal e generica: os dados do cliente viajam pelo espelho,
     ja limpos de tudo que e interno (valores, contrato, segmento, financeiro) */
  const base = cli ? (function(){
    const pub=JSON.parse(JSON.stringify(cli));
    ["mensalidade","contrato","justificados","inicioContrato","plano","segmento","marca",
     "__pendenteForcado","tarefasExtras","marcos","concluidas"].forEach(k=>delete pub[k]);
    const orig=ORIG.concat(ESTADO.novosClientes||[]).find(x=>x.id===cid) || cli;
    pub.concluidas=(orig.concluidas||[]).slice();
    pub.tarefasExtras=(orig.tarefasExtras||[]).filter(t=>{
      const txt=((t.tarefa||"")+" "+(t.detalhe||"")).toLowerCase();
      return !(t.fase==="Contrato" || /^pag_|^fotos_/.test(t.id||"") ||
               /r\$|pagar|fornecedor|mensalidade|contrato|nota fiscal/.test(txt));
    });
    const lim=x=>String(x||"").replace(/CS\s*\d{3,}[\/\d]*/gi,"").replace(/R\$\s*[\d.,]+/g,"")
      .replace(/\s{2,}/g," ").trim().replace(/[·\-–]\s*$/,"").trim();
    pub.marcos=(orig.marcos||[]).map(mm=>({data:mm.data,titulo:lim(mm.titulo),detalhe:lim(mm.detalhe)}))
      .filter(mm=>mm.titulo);
    return pub;
  })() : null;
  const ymA=mesAtualYM();
  const planos={};
  [ymA, (function(){const d0=new Date(HOJE.getFullYear(),HOJE.getMonth()-1,1);
    return d0.getFullYear()+"-"+String(d0.getMonth()+1).padStart(2,"0");})()]
    .forEach(m=>{ const p=((ESTADO.plano&&ESTADO.plano[cid])||{})[m]; if(p) planos[m]=p; });
  return { ts:Date.now(),
           base:base,
           historico:!!(p&&p.historico),
           abas:((p&&p.abas&&p.abas.length)?p.abas:["geral","trafego"]),
           pendencias:pend,
           plano:planos,
           ativo:(p&&p.ativo)||null,
           objetivo:cli?objetivoDe(cli):"",
           recado:cli?((fichaDe(cli)||{}).recado||""):"",
           meta:cli?metaDe(cli):null,
           resultados:((ESTADO.resultados&&ESTADO.resultados[cid])||null),
           concluidas:((ESTADO.concluidas&&ESTADO.concluidas[cid])||[]),
           datas:((ESTADO.datas&&ESTADO.datas[cid])||{}) };
}
function publicarEspelho(){
  if(!SYNC_ON || !window.firebase) return;
  try{
    const base=firebase.database().ref("painel/publico");
    CLIENTES.forEach(c=>{
      const cfg=(ESTADO.portais&&ESTADO.portais[c.id])||null;
      if(!cfg || !cfg.ativo) return;                 /* sem link gerado ainda */
      if(cfg.desligado || clienteArquivado(c.id)) return;   /* cliente arquivado: link fora do ar */
      const dados=espelhoDe(c.id);
      /* leads e crm ja moram no no do token: nao sobrescreve o que esta la */
      base.child(cfg.ativo).update({...dados, ativo:cfg.ativo});
      (cfg.revogados||[]).forEach(tk=>{ base.child(tk).remove(); });
    });
    /* cliente que saiu do sistema (tirado do dados.js): o link do portal sai do ar, como no arquivar */
    const existe=new Set(ORIG.concat(ESTADO.novosClientes||[]).map(c=>c.id));
    let mudou=false;
    Object.keys(ESTADO.portais||{}).forEach(cid=>{
      const cfg=ESTADO.portais[cid];
      if(existe.has(cid) || !cfg || !cfg.ativo || cfg.desligado) return;
      desligarPortal(cid); mudou=true;
    });
    if(mudou){ try{ localStorage.setItem("mk3_estado", JSON.stringify(ESTADO)); }catch(e){} syncEnviar(); }
  }catch(e){}
}
function agendarEspelho(){ clearTimeout(ESPELHO_T); ESPELHO_T=setTimeout(publicarEspelho,1500); }
function persist(){
  try{ localStorage.setItem("mk3_estado", JSON.stringify(ESTADO)); }catch(e){}
  syncEnviar(); agendarEspelho();
  setTimeout(marcarSalvo,0);
}
function snapshot(){ UNDO.push(JSON.stringify(ESTADO)); if(UNDO.length>80)UNDO.shift(); REDO.length=0; }
/* a barra mostra quem mexeu por ultimo: o painel e compartilhado, nao "salvo neste navegador" */
function ultimaAlteracaoHTML(){
  const l=(ESTADO.log||[]).find(x=>x && x.ts);
  if(!l) return '<span class="umud dim">Clique numa tarefa para marcar.<span class="so-tecla"> Atalhos: <span class="kbd">?</span></span></span>';
  return '<span class="umud">Última alteração: <b>'+esc(l.quem||"alguém")+'</b>, '+esc(quandoRel(l.ts))+
         '<span class="so-tecla"> · atalhos <span class="kbd">?</span></span></span>';
}
function nMud(){ let n=0; for(const k in ESTADO.concluidas)n+=(ESTADO.concluidas[k]||[]).filter(e=>!e.remove).length; return n; }

function marcar(cid,tid,data,tipo){
  snapshot();
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid); const nome=t?t.tarefa:tid;
  const anc=ANCORA[tid];
  ESTADO.concluidas[cid]=(ESTADO.concluidas[cid]||[]).filter(e=>e.id!==tid);
  if(tipo==="desfazer"){
    if(anc && ESTADO.datas[cid]) delete ESTADO.datas[cid][anc.campo];
    ESTADO.log.unshift({ts:new Date().toISOString(),cliente:cid,nome:nome,acao:"desfazer",id:tid,quem:USUARIO||null});
  } else {
    ESTADO.concluidas[cid].push({id:tid,data:data});
    if(anc){ ESTADO.datas[cid]=ESTADO.datas[cid]||{}; ESTADO.datas[cid][anc.campo]=data; }
    ESTADO.log.unshift({ts:new Date().toISOString(),cliente:cid,nome:nome,acao:(anc?"registrar":"concluir"),campo:(anc?anc.campo:null),id:tid,data:data,quem:USUARIO||null});
  }
  ESTADO.log=ESTADO.log.slice(0,300);
  persist(); rebuild(); render();
}
const baseId = id => id.replace(/_\d{4}-\d{2}$/,"");
const segOf = isoStr => { const x=d(isoStr); const off=(x.getDay()+6)%7; x.setDate(x.getDate()-off); return iso(x); };
const chaveTarefa = (cid,tid,day) => cid+"|"+tid+(day?"|"+day:"");
function xInfo(week,cid,tid,day){
  const b=(ESTADO.semanal&&ESTADO.semanal[week])||null; if(!b) return null;
  return (day&&b[chaveTarefa(cid,tid,day)]) || b[chaveTarefa(cid,tid)] || null;   /* aceita chave antiga */
}
function obsInfo(cid,tid,day){
  const wk=segOf(day), b=(ESTADO.obsT&&ESTADO.obsT[wk])||null;
  return b ? (b[chaveTarefa(cid,tid,day)]||null) : null;
}
function setObsTarefa(cid,tid,day,txt,parcial){
  snapshot();
  const wk=segOf(day);
  ESTADO.obsT=ESTADO.obsT||{}; ESTADO.obsT[wk]=ESTADO.obsT[wk]||{};
  const k=chaveTarefa(cid,tid,day);
  if((txt||"").trim() || parcial) ESTADO.obsT[wk][k]={txt:(txt||"").trim(), parcial:!!parcial};
  else delete ESTADO.obsT[wk][k];
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid);
  ESTADO.log.unshift({ts:new Date().toISOString(),cliente:cid,nome:t?t.tarefa:tid,
    acao:"observacao",id:tid,data:day,parcial:!!parcial,motivo:(txt||"").trim(),quem:USUARIO||null});
  ESTADO.log=ESTADO.log.slice(0,300);
  persist(); rebuild(); render();
}
function renomearTarefa(cid,tid,novo){
  if(!ehAdmin()) return;
  snapshot();
  ESTADO.titulos=ESTADO.titulos||{};
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid);
  const orig=(t&&t.tituloOriginal)||(t&&t.tarefa)||tid;
  novo=(novo||"").trim();
  if(!novo || novo===orig){ if(ESTADO.titulos[cid]){ delete ESTADO.titulos[cid][tid]; if(!Object.keys(ESTADO.titulos[cid]).length) delete ESTADO.titulos[cid]; } }
  else { ESTADO.titulos[cid]=ESTADO.titulos[cid]||{}; ESTADO.titulos[cid][tid]=novo; }
  ESTADO.log.unshift({ts:new Date().toISOString(),cliente:cid,acao:"renomear",id:tid,nome:novo||orig,quem:USUARIO||null});
  persist(); rebuild(); render();
}
function abrirRenomear(cid,tid){
  if(!ehAdmin()) return;
  if(cid==="_dem"){ abrirEditarDemanda(tid); return; }   /* demanda edita tudo no formulário */
  if(cid==="_rec"){ abrirEditorRec(tid); return; }      /* a ocorrencia abre a regra dela, nao a lista toda */
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid); if(!t) return;
  const atual=EXEC[baseId(t.id)]||t.tarefa;
  const renomeada=!!((ESTADO.titulos||{})[cid]||{})[tid];
  const mm=$("modal");
  mm.innerHTML='<div class="mbox"><h3>Renomear tarefa</h3>'+
    '<p class="msub">'+esc(t.cliente)+' · '+fmt(t.data)+'</p>'+
    '<label class="mlab">Título<input type="text" id="novoTit" value="'+escAttr(t.tarefa)+'" autocomplete="off"></label>'+
    (renomeada?'<p class="msub">Nome original: '+esc(t.tituloOriginal||atual)+'</p>':'')+
    '<div class="mbtns"><button data-macao="salvartit" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'">Salvar</button>'+
    (renomeada?'<button class="sec" data-macao="restauratit" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'">Voltar ao original</button>':'')+
    '<button class="sec" data-macao="fechar">Cancelar</button></div></div>';
  mostrarModal(true);
}
function excluirTarefa(cid,tid){
  if(!ehAdmin()) return;
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid);
  snapshot();
  if(cid==="_dem"){ ESTADO.demandas=(ESTADO.demandas||[]).filter(x=>x.id!==tid); }
  else { ESTADO.excluidas=ESTADO.excluidas||{}; ESTADO.excluidas[cid]=(ESTADO.excluidas[cid]||[]).concat([tid]); }
  ESTADO.dup=(ESTADO.dup||[]).filter(e=>!(e.cid===cid&&e.tid===tid));
  ESTADO.log.unshift({ts:new Date().toISOString(),cliente:cid,nome:t?t.tarefa:tid,acao:"excluir",id:tid,quem:USUARIO||null});
  persist(); rebuild(); render();
  toast((t?t.tarefa:"Tarefa")+" · excluída", true);
}
function restaurarTarefa(cid,tid){
  snapshot();
  ESTADO.excluidas[cid]=((ESTADO.excluidas||{})[cid]||[]).filter(x=>x!==tid);
  if(!ESTADO.excluidas[cid].length) delete ESTADO.excluidas[cid];
  persist(); rebuild(); render(); semPular(()=>abrirExcluidas());
}
/* nome legivel da tarefa excluida: recorrente vira "texto da regra (dd/mm)" em vez do id cru */
function rotuloExcluida(cid,tid){
  if(cid==="_rec"){ const p=String(tid).split("@"); const r=(ESTADO.recorrentes||[]).find(x=>x.id===p[0]);
    return (r?r.texto:"Recorrente removida")+(p[1]?" ("+fmt(p[1]).slice(0,5)+")":""); }
  if(cid==="_dem"){ const dm=(ESTADO.demandas||[]).find(x=>x.id===tid); if(dm) return dm.texto; }
  return EXEC[baseId(tid)]||tid;
}
function nExcluidas(){ let n=0; for(const k in (ESTADO.excluidas||{})) n+=(ESTADO.excluidas[k]||[]).length; return n; }
function abrirExcluidas(){
  if(!ehAdmin()) return;
  const E=ESTADO.excluidas||{};
  const nomeCli=id=>{ const c=CLIENTES.find(x=>x.id===id); return c?c.nome:(id==="_dem"?"Demanda":(id==="_rec"?"Recorrente":id)); };
  let linhas="";
  for(const cid in E) (E[cid]||[]).forEach(tid=>{
    linhas+='<div class="ex-row"><span class="ex-t">'+esc(rotuloExcluida(cid,tid))+' <i>'+esc(nomeCli(cid))+'</i></span>'+
      '<button data-restaurar="'+cid+'|'+escAttr(tid)+'">Restaurar</button></div>';
  });
  const mm=$("modal");
  mm.innerHTML='<div class="mbox"><h3>Tarefas excluídas</h3>'+
    '<p class="msub">Elas somem do painel, mas ficam guardadas aqui e podem voltar quando quiser.</p>'+
    (linhas?'<div class="ex-lista">'+linhas+'</div>':'<div class="vaziox"><h4>Nenhuma tarefa excluída</h4><p>Quando você excluir alguma, ela aparece aqui para restaurar.</p></div>')+
    '<div class="mbtns"><button class="sec" data-macao="fechar">Fechar</button></div></div>';
  mostrarModal(true);
}
function confirmarExcluir(cid,tid){
  if(!ehAdmin()) return;
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid);
  const mm=$("modal");
  mm.innerHTML='<div class="mbox"><h3>Excluir tarefa</h3>'+
    '<p class="msub">'+esc(t?((EXEC[baseId(t.id)]||t.tarefa)+" — "+t.cliente):tid)+'</p>'+
    '<div class="ex-aviso">A tarefa some do painel'+(cid==="_dem"?" e a demanda é apagada":" e de todas as telas")+'. '+
    (cid==="_dem"?"":"Ela fica guardada em \u201cTarefas excluídas\u201d e pode voltar depois.")+'</div>'+
    '<div class="mbtns"><button class="danger" data-excl="'+cid+'|'+escAttr(tid)+'">Excluir</button>'+
    '<button class="sec" data-macao="fechar">Cancelar</button></div></div>';
  mostrarModal(true);
}
function abrirObsTarefa(cid,tid,day,editar){
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid);
  const o=obsInfo(cid,tid,day)||{txt:"",parcial:false};
  const temTexto=!!(o.txt||"").trim();
  const modoEdicao = editar || !temTexto;
  const rot=t?((EXEC[baseId(t.id)]||t.tarefa)+" — "+t.cliente):tid;
  const mm=$("modal");
  mm.innerHTML='<div class="mbox"><h3>Observação da tarefa</h3>'+
    '<p class="msub">'+esc(rot)+' · '+fmt(day)+'</p>'+
    (modoEdicao
      ? '<label class="mlab"><span class="chkp'+(o.parcial?" on":"")+'" data-parcial="'+cid+'|'+escAttr(tid)+'|'+day+'" role="checkbox" tabindex="0" aria-checked="'+(!!o.parcial)+'"><i></i>Entrega parcial (fizemos só uma parte)</span></label>'+
        '<textarea id="obsT" class="notepad-ta" rows="4" placeholder="Ex.: fizemos 3 das 6 artes; faltam os materiais da cliente">'+esc(o.txt||"")+'</textarea>'+
        '<div class="mbtns"><button data-macao="salvarobst" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'" data-mday="'+day+'" data-mparc="'+(o.parcial?"1":"")+'">Salvar</button>'+
        (temTexto||o.parcial?'<button class="danger" data-macao="limparobst" data-mcid="'+cid+'" data-mtid="'+escAttr(tid)+'" data-mday="'+day+'">Remover</button>':'')+
        '<button class="sec" data-macao="fechar">Cancelar</button></div>'
      : (o.parcial?'<div class="parc-tag">Entrega parcial</div>':'')+
        '<div class="obs-leitura">'+esc(o.txt)+'</div>'+
        '<div class="mbtns"><button data-editarobst="'+cid+'|'+escAttr(tid)+'|'+day+'">&#9998; Editar</button>'+
        '<button class="sec" data-macao="fechar">Fechar</button></div>')+
  '</div>';
  mostrarModal(true);
}
function setNaoFeito(cid,tid,day,motivo){
  snapshot();
  const wk=segOf(day);
  ESTADO.semanal=ESTADO.semanal||{}; ESTADO.semanal[wk]=ESTADO.semanal[wk]||{};
  delete ESTADO.semanal[wk][chaveTarefa(cid,tid)];              /* limpa chave antiga */
  if(motivo){ ESTADO.semanal[wk][chaveTarefa(cid,tid,day)]={motivo:motivo,data:day}; }
  else { delete ESTADO.semanal[wk][chaveTarefa(cid,tid,day)]; }
  ESTADO.concluidas[cid]=(ESTADO.concluidas[cid]||[]).filter(e=>e.id!==tid);
  if(motivo) ESTADO.concluidas[cid].push({id:tid,remove:true});  /* sobrepõe conclusão oficial */
  else { const anc=ANCORA[tid]; if(anc && ESTADO.datas[cid]) delete ESTADO.datas[cid][anc.campo]; }
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid);
  ESTADO.log.unshift({ts:new Date().toISOString(),cliente:cid,nome:t?t.tarefa:tid,acao:"naofeito",id:tid,data:day,motivo:motivo,quem:USUARIO||null});
  ESTADO.log=ESTADO.log.slice(0,300);
  persist(); rebuild(); render();
}
function marcarFeitoSemana(cid,tid,day){
  const wk=segOf(day);
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid);
  const jaFeita = t && t.st.k==="ok";
  if(ESTADO.semanal&&ESTADO.semanal[wk]){
    delete ESTADO.semanal[wk][chaveTarefa(cid,tid)];
    delete ESTADO.semanal[wk][chaveTarefa(cid,tid,day)];
  }
  if(jaFeita){ marcar(cid,tid,null,"desfazer"); toast("Voltou para pendente",true); }   /* clicar de novo = neutro */
  else marcar(cid,tid,day,"concluir");
}
function neutralizar(cid,tid,day){
  const wk=segOf(day);
  if(ESTADO.semanal&&ESTADO.semanal[wk]){
    delete ESTADO.semanal[wk][chaveTarefa(cid,tid)];
    delete ESTADO.semanal[wk][chaveTarefa(cid,tid,day)];
  }
  marcar(cid,tid,null,"desfazer");
  toast("Marcação removida",true);
}
/* da para antecipar ou adiar; so nao da para jogar no passado */
function minimoReplan(t){ return iso(HOJE); }
function podeReplanejar(t,dia){ return !!t && dia>=minimoReplan(t); }
/* mover = a tarefa passa a valer no dia novo e sai do dia antigo.
   copiar = deixa as duas, para quando a entrega acontece em duas etapas. */
function moverTarefa(cid,tid,dia){ return duplicarTarefa(cid,tid,dia,true); }
function duplicarTarefa(cid,tid,dia,mover){
  /* devolve true so quando algo mudou: quem chama decide se avisa */
  const t=TODAS.find(x=>x.clienteId===cid&&x.id===tid); if(!t) return false;
  if(t.data===dia){ toast("A tarefa já está nesse dia",false); return false; }
  if(!podeReplanejar(t,dia)){ toast("Não dá para replanejar para um dia que já passou",false); return false; }
  ESTADO.dup=ESTADO.dup||[];
  if(ESTADO.dup.some(e=>e.cid===cid&&e.tid===tid&&e.dia===dia)){ toast("Já existe uma cópia nesse dia",false); return false; }
  snapshot();
  /* mover não acumula: substitui qualquer remarcação anterior da mesma tarefa */
  if(mover) ESTADO.dup=ESTADO.dup.filter(e=>!(e.cid===cid&&e.tid===tid));
  ESTADO.dup.push({cid:cid,tid:tid,dia:dia,orig:t.data,mover:!!mover});
  ESTADO.log.unshift({ts:new Date().toISOString(),cliente:cid,nome:t.tarefa,
    acao:(mover?"mover":"replanejar"),id:tid,data:dia,quem:USUARIO||null});
  persist(); rebuild(); render();
  return true;
}
/* para onde a tarefa foi movida, se foi */
function movidaPara(cid,tid){
  const e=dupDe(cid,tid).filter(x=>x.mover)
    .sort((a,b)=>a.dia.localeCompare(b.dia)).pop();
  return e?e.dia:null;
}
function removeDup(cid,tid,dia){
  snapshot();
  ESTADO.dup=(ESTADO.dup||[]).filter(e=>!(e.cid===cid&&e.tid===tid&&e.dia===dia));
  persist(); rebuild(); render();
}
function bcardHTML(t, dayIso, dupOrig){
  if(!dupOrig && t.movidaDe) dupOrig=t.movidaDe;   /* movida: a etiqueta conta de onde veio */
  const feita=t.st.k==="ok";
  const x=xInfo(VISTA.psem,t.clienteId,t.id,dayIso);
  const st=feita?"ok":(x?"x":"none");
  const rot=EXEC[baseId(t.id)]||t.tarefa;
  const drag=t.clienteId+"|"+t.id+"|"+t.data;
  const ob=obsInfo(t.clienteId,t.id,dayIso);
  const nomeResp=(t.fase==="Demanda")?t.resp:AREARESP[t.area];
  const face=faceDe(nomeResp);
  const fc=FOTO[t.cliDem||t.clienteId];
  const faceCli=(t.fase==="Demanda" && !t.cliDem)?"":'<span class="card-face cli" title="'+escAttr(t.cliente)+'">'+esc((t.cliente||"?").slice(0,1))+
    (fotoOk(fc)?'<img src="'+escAttr(fc)+'" alt="" onerror="this.remove()">':'')+'</span>';
  return '<div class="bcard st-'+st+(dupOrig?" dup":"")+'" data-drag="'+escAttr(drag)+'">'+
    (dupOrig?'<div class="dup-badge">'+
      '<button class="dup-ir" data-irorig="'+dupOrig+'" title="Ir para '+fmt(dupOrig)+', o dia de origem desta tarefa">'+
        '&#8618; de '+fmt(dupOrig).slice(0,5)+'</button>'+
      '<button class="dup-x" data-dropx="1" data-mcid="'+t.clienteId+'" data-mtid="'+escAttr(t.id)+'" data-mday="'+dayIso+'" title="Remover">&#215;</button></div>':'')+
    (face?'<span class="face-topo" title="Responsável">'+face+'</span>':'')+
    (ehAdmin()
      ? '<button class="bcard-t edit" data-rename="'+t.clienteId+'|'+escAttr(t.id)+'" title="Clique para renomear">'+esc(rot)+(ob&&ob.parcial?' <span class="parc">parcial</span>':'')+'</button>'
      : '<div class="bcard-t">'+esc(rot)+(ob&&ob.parcial?' <span class="parc">parcial</span>':'')+'</div>')+
    '<div class="bcard-c">'+esc(t.cliente)+'</div>'+
    (feita&&t.st.atraso?'<div class="bcard-atr">atrasou '+t.st.atraso+(t.st.atraso>1?' dias úteis':' dia útil')+'</div>':'')+
    '<div class="bcard-chk">'+
      '<button class="chk ok'+(feita?" on":"")+'" data-wkok="1" data-mcid="'+t.clienteId+'" data-mtid="'+escAttr(t.id)+'" data-mday="'+dayIso+'" title="Feito · clique de novo para desmarcar" aria-label="Feito">&#10003;</button>'+
      '<button class="chk x'+(x?" on":"")+'" data-wkx="1" data-mcid="'+t.clienteId+'" data-mtid="'+escAttr(t.id)+'" data-mday="'+dayIso+'" title="Não feito · clique de novo para deixar neutro" aria-label="Não feito">&#10007;</button>'+
      '<button class="mover" data-mover="1" data-mcid="'+t.clienteId+'" data-mtid="'+escAttr(t.id)+'" data-mday="'+dayIso+'" title="Replanejar para outro dia" aria-label="Replanejar para outro dia">&#8618;</button>'+
      (ehAdmin()?'<button class="mover del" data-delt="'+t.clienteId+'|'+escAttr(t.id)+'" title="Excluir tarefa" aria-label="Excluir tarefa">&#128465;</button>':'')+
      '<button class="mover obsb'+(ob?" tem":"")+'" data-obst="'+t.clienteId+'|'+escAttr(t.id)+'|'+dayIso+'" title="Observação da tarefa" aria-label="Observação da tarefa">&#128221;</button>'+
      (faceCli?'<span class="face-rodape" title="Cliente">'+faceCli+'</span>':'')+
    '</div>'+
    (x&&x.motivo?'<button class="ver-motivo" data-vermotivo="1" data-mcid="'+t.clienteId+'" data-mtid="'+escAttr(t.id)+'" data-mday="'+dayIso+'">Mostrar motivo</button>':'')+
    (t.obs?'<button class="ver-obs" data-veobs="'+escAttr(t.id)+'">&#128221; Ver observação</button>':'')+
    (ob&&ob.txt?'<button class="ver-obs" data-obst="'+t.clienteId+'|'+escAttr(t.id)+'|'+dayIso+'">&#128221; Ver observação</button>':'')+
  '</div>';
}
function setNota(day, texto){
  snapshot();
  ESTADO.notas=ESTADO.notas||{};
  if(texto && texto.trim()) ESTADO.notas[day]=texto; else delete ESTADO.notas[day];
  persist(); render();
}
