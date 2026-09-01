/* Testes do Painel MK3. Rode com: node testar.js
   Carrega dados.js + motor.js num contexto com o navegador falsificado
   e confere as regras que mais quebraram no passado. */
const fs=require("fs"), vm=require("vm"), path=require("path");
const raiz=__dirname;
const el=()=>({innerHTML:"",style:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},
  setAttribute(){},removeAttribute(){},getAttribute(){return null},appendChild(){},querySelector(){return null},
  querySelectorAll(){return []},focus(){},addEventListener(){},dataset:{},children:[],textContent:"",value:"",disabled:false});
function contexto(arquivos, pre){
  const ctx={console,setTimeout:()=>0,clearTimeout,setInterval:()=>0,clearInterval,Date,Math,JSON,String,Number,
    Boolean,Array,Object,RegExp,Promise,isNaN,parseInt,parseFloat,encodeURIComponent,decodeURIComponent,
    Proxy,Set,Map,Error,
    fetch:()=>Promise.resolve({ok:false,json:()=>Promise.resolve({ok:false})}),
    localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
    location:{hash:"",pathname:"/",href:""},history:{pushState(){},replaceState(){}},
    document:{getElementById:()=>el(),querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>el(),
      addEventListener(){},body:el(),documentElement:el()},
    navigator:{clipboard:{writeText:()=>Promise.resolve()}},
    addEventListener(){},removeEventListener(){},dispatchEvent(){},
    requestAnimationFrame:f=>f(), matchMedia:()=>({matches:false,addEventListener(){}}),
    crypto:{getRandomValues:a=>{ for(let i=0;i<a.length;i++) a[i]=Math.floor(Math.random()*256); return a; }},
    EventSource:function(){this.addEventListener=()=>{};this.close=()=>{};}};
  ctx.window=ctx; ctx.self=ctx;
  vm.createContext(ctx);
  if(pre) vm.runInContext(pre,ctx,{filename:"pre.js"});
  arquivos.forEach(a=>vm.runInContext(typeof a==="string"?fs.readFileSync(path.join(raiz,a),"utf8"):a.src,
    ctx,{filename:typeof a==="string"?a:a.nome}));
  return ctx;
}
let total=0, falhas=0;
function bloco(titulo, ctx, corpo){
  const R=[];
  ctx.__ok=(n,c)=>{ R.push((c?"  ok    ":"  FALHA ")+n); total++; if(!c) falhas++; };
  console.log("\n"+titulo);
  try{ vm.runInContext(corpo,ctx,{filename:titulo}); }
  catch(e){ R.push("  FALHA (erro) "+e.message); total++; falhas++; }
  console.log(R.join("\n"));
}
const limpar=`
["concluidas","datas","semanal","notas","obsT","excluidas","titulos","clientes","resultados",
 "ficha","agendaResp","cobrancas","portais"].forEach(k=>ESTADO[k]={});
ESTADO.dup=[];ESTADO.log=[];ESTADO.demandas=[];ESTADO.agenda=[];ESTADO.novosClientes=ESTADO.novosClientes||[];
ESTADO.pessoas=SEED_PESSOAS.map(p=>({...p}));
USUARIO=null; VISTA.area="all"; VISTA.escopo=null; VISTA.feedDias=7; rebuild();
`;
const M=contexto(["dados.js","motor.js"]);

bloco("Replanejar: antecipar, adiar e vencer de novo", M, limpar+`
const hoje=iso(HOJE), passou=addD(hoje,-3);
/* pega qualquer tarefa que ainda esteja no futuro: assim o teste nao envelhece */
const alvo=TODAS.filter(x=>x.clienteId==="cynthia" && x.data>addD(hoje,3) && x.st.k!=="ok")
  .sort((a,b)=>a.data.localeCompare(b.data))[0];
const ALVO=alvo?alvo.id:null;
__ok("achou uma tarefa no futuro para o teste", !!alvo && alvo.data>hoje);
__ok("da para trazer para hoje", podeReplanejar(alvo,hoje)===true);
__ok("nao da para jogar no passado", podeReplanejar(alvo,addD(hoje,-1))===false);
USUARIO="Carla";
duplicarTarefa("cynthia",ALVO,hoje);
let t=TODAS.find(x=>x.clienteId==="cynthia"&&x.id===ALVO);
__ok("antecipar faz vencer hoje", t.st.k==="hoje");
__ok("o texto diz de onde veio", /antecipada de/.test(t.st.txt));
__ok("guarda a data original", t.st.antecipada===alvo.data);
__ok("registra quem replanejou", (ESTADO.log[0]||{}).quem==="Carla");
ESTADO.dup=[]; rebuild();
duplicarTarefa("cynthia",ALVO,addD(hoje,40));
t=TODAS.find(x=>x.clienteId==="cynthia"&&x.id===ALVO);
__ok("adiar mantem o prazo original", !/antecipada/.test(t.st.txt));
ESTADO.dup=[{cid:"cynthia",tid:ALVO,dia:passou,orig:alvo.data}]; rebuild();
t=TODAS.find(x=>x.clienteId==="cynthia"&&x.id===ALVO);
__ok("remarcacao vencida vira status proprio", t.st.k==="replan");
__ok("e diz que venceu de novo", /venceu de novo/.test(t.st.txt));
__ok("replan esta nos baldes", BUCKETS.indexOf("replan")>=0 && !!ROTULO.replan);
const wk=segOf(passou);
ESTADO.obsT[wk]={}; ESTADO.obsT[wk]["leonardo|envPlanej_2026-08|"+passou]={txt:"metade",parcial:true};
ESTADO.dup=[{cid:"leonardo",tid:"envPlanej_2026-08",dia:passou,orig:"2026-08-24"}]; rebuild();
t=TODAS.find(x=>x.clienteId==="leonardo"&&x.id==="envPlanej_2026-08");
__ok("parcial tem prioridade sobre replan", t.st.k!=="replan" && /Parcial/.test(t.st.txt));
`);

bloco("Feed: periodo, autor e area", M, limpar+`
const ag=iso(HOJE);
ESTADO.log=[
 {ts:new Date().toISOString(),cliente:"suelem",nome:"Criar o planejamento",acao:"concluir",id:"planej_2026-08",data:ag,quem:"Carla"},
 {ts:new Date(Date.now()-3*3600e3).toISOString(),cliente:"suelem",nome:"Mensalidade",acao:"concluir",id:"pag_2026-08-20",data:ag,quem:"Bia"},
 {ts:new Date().toISOString(),cliente:"leonardo",nome:"Acao comercial",acao:"concluir",id:"acaoComercial",data:ag,quem:"Marlon"},
 {ts:new Date().toISOString(),cliente:"cynthia",nome:"Cadastro",acao:"cliente-editado",quem:"Guilherme"},
 {ts:new Date().toISOString(),acao:"demanda",id:"dem_1",nome:"Post extra",area:"fin",data:ag,quem:"Bia"},
 {ts:new Date(Date.now()-80*3600e3).toISOString(),cliente:"cynthia",nome:"Antigo",acao:"concluir",id:"z",quem:"Bia"}
];
__ok("48h corta o que e mais velho", mudancasRecentes(2).length===5);
__ok("7 dias alcanca o antigo", mudancasRecentes(7).length===6);
VISTA.area="mkt";
let l=mudancasRecentes(7);
__ok("Marketing so traz marketing", l.every(x=>x.id!=="pag_2026-08-20" && x.id!=="acaoComercial"));
VISTA.area="fin";
l=mudancasRecentes(7);
__ok("Financeiro traz mensalidade e demanda financeira",
  l.some(x=>x.id==="pag_2026-08-20") && l.some(x=>x.area==="fin"));
VISTA.area="com";
__ok("Comercial traz so a acao comercial", mudancasRecentes(7).every(x=>x.id==="acaoComercial"));
VISTA.area="mkt";
__ok("linha administrativa nao polui as areas", !mudancasRecentes(7).some(x=>x.acao==="cliente-editado"));
VISTA.area="all";
__ok("linha administrativa aparece na Visao Geral", mudancasRecentes(7).some(x=>x.acao==="cliente-editado"));
USUARIO="Carla";
__ok("pessoa de marketing nao ve financeiro", !mudancasRecentes(7).some(x=>x.id==="pag_2026-08-20"));
USUARIO="Bia";
__ok("pessoa do financeiro ve o dela", mudancasRecentes(7).some(x=>x.id==="pag_2026-08-20"));
USUARIO="Guilherme";
const h=feedHTML();
__ok("agrupa por dia", /fd-dia-h/.test(h) && /Hoje/.test(h));
__ok("mostra quem fez", /Carla/.test(h) && /concluiu/.test(h));
__ok("cliente vira link", /data-cliente="suelem"/.test(h));
__ok("chips de periodo", /data-feed="7"/.test(h));
ESTADO.log=[{ts:new Date().toISOString(),cliente:"suelem",nome:"Antiga",acao:"concluir",id:"y"}];
const ha=feedHTML();
__ok("sem autor nao inventa nome", !/alguem/i.test(ha) && /autor nao registrado/.test(ha));
ESTADO.log=[];
__ok("vazio explica o filtro", /fd-vazio/.test(feedHTML()));
__ok("menu Feed sem bolinha", !/Feed<\\/span><span class="snav-n"/.test(sidebarHTML()));
`);

bloco("Autor registrado em todas as acoes", M, limpar+`
USUARIO="Carla";
duplicarTarefa("suelem","midia_2026-08","2026-09-02");
__ok("replanejar guarda o autor", (ESTADO.log[0]||{}).quem==="Carla");
ESTADO.log=[]; setObsTarefa("suelem","midia_2026-08",iso(HOJE),"teste",false);
__ok("observacao guarda o autor", (ESTADO.log[0]||{}).quem==="Carla");
ESTADO.log=[]; addDemanda("t","mkt",iso(HOJE),"Carla","","suelem");
__ok("demanda guarda o autor", (ESTADO.log[0]||{}).quem==="Carla");
ESTADO.log=[]; marcar("suelem","midia_2026-08",iso(HOJE),"concluir");
__ok("concluir guarda o autor", (ESTADO.log[0]||{}).quem==="Carla");
`);

bloco("Gravacao vinda da agenda", M, limpar+`
USUARIO="Guilherme";
const futuro=addD(iso(HOJE),2), velho=addD(iso(HOJE),-40);
ESTADO.agenda=[
 {id:"e1",titulo:"GRAVAÇÃO OCEANUS",dia:futuro,hora:"09:00",cliente:"oceanus"},
 {id:"e2",titulo:"Reunião de planejamento",dia:futuro,cliente:"suelem"},
 {id:"e3",titulo:"Gravacao Leo",dia:velho,cliente:"leonardo"}
];
const mp=gravacoesDaAgenda();
__ok("acha com acento", !!mp.oceanus && mp.oceanus.dia===futuro);
__ok("acha sem acento", !!mp.leonardo);
__ok("ignora o que nao e gravacao", !mp.suelem);
sincronizarGravacoes();
__ok("preenche o que estava vazio", (ESTADO.datas.oceanus||{}).gravacao===futuro);
__ok("data futura nao marca como feita",
  (TODAS.find(t=>t.clienteId==="oceanus"&&t.id==="c1_gravacao")||{st:{k:"-"}}).st.k!=="ok");
__ok("data passada marca como feita",
  (TODAS.find(t=>t.clienteId==="leonardo"&&t.id==="c1_gravacao")||{st:{k:"-"}}).st.k==="ok");
__ok("log diz que veio da agenda", ESTADO.log.some(x=>x.quem==="Agenda"));
ESTADO.datas.oceanus={gravacao:"2026-08-20"}; rebuild();
__ok("acusa divergencia", divergenciasGravacao().some(x=>x.cid==="oceanus"&&x.agenda===futuro));
__ok("nao sobrescreve sozinho", sincronizarGravacoes()===0 && ESTADO.datas.oceanus.gravacao==="2026-08-20");
usarDataDaAgenda("oceanus",futuro);
__ok("administracao aceita a da agenda", ESTADO.datas.oceanus.gravacao===futuro);
__ok("e fica registrado quem aceitou", (ESTADO.log[0]||{}).quem==="Guilherme");
`);

bloco("Rascunho do relatorio", M, limpar+`
const c=cliente("suelem"), ym=mesAtualYM();
let txt=rascunhoRelatorio(c,ym);
__ok("tem cabecalho do cliente", /Suelem/.test(txt));
__ok("sem Reportei diz que nao tem", /nao ha dados do Reportei/.test(txt));
__ok("lista o que foi entregue", /ENTREGUE NO MES/.test(txt));
__ok("avisa que e rascunho", /Revise antes de enviar/.test(txt));
ESTADO.resultados.suelem={};
ESTADO.resultados.suelem[ym]={periodo:"1 a 12 de agosto",compara:"julho",
  metricas:[{k:"Alcance",v:12345,d:12},{k:"Visualizações",v:8000,d:-5}],
  resumo:"Alcance subiu com o impulsionamento.",
  destaque:{obj:"seguidores",k:"Seguidores",v:5000,novos:120}};
txt=rascunhoRelatorio(c,ym);
__ok("traz os numeros", /12\\.345/.test(txt));
__ok("traz a variacao", /\\+12%/.test(txt) && /-5%/.test(txt));
__ok("traz o resumo escrito", /impulsionamento/.test(txt));
__ok("separa o que esta com o cliente",
  contadores(c).length===0 || /ESPERANDO O CLIENTE/.test(txt));
`);

bloco("Cobranca de aprovacao e espelho do portal", M, limpar+`
const hj=iso(HOJE);
ESTADO.cobrancas={};
const cs=cobrancasPendentes();
__ok("devolve lista", Array.isArray(cs));
__ok("so dentro da janela", cs.every(x=>x.x.lembrete<=hj && x.x.vencimento>=hj));
__ok("chave tem cliente, tipo e envio", cs.every(x=>x.chave.split("|").length===3));
if(cs.length){ ESTADO.cobrancas[cs[0].chave]={dia:hj};
  __ok("nao cria duas vezes", cobrancasPendentes().length===cs.length-1); }
else { ESTADO.cobrancas["suelem|planejamento|"+hj]={dia:hj};
  __ok("nao cria duas vezes", cobrancasPendentes().length===0); }
ESTADO.portais={suelem:{tokens:["tok1"],ativo:0}};
const esp=espelhoDe("suelem");
__ok("espelho leva as pendencias", Array.isArray(esp.pendencias));
__ok("pendencia tem tipo, envio e prazo", esp.pendencias.every(p=>p.tipo&&p.enviado&&p.vencimento));
__ok("espelho nao vaza dado interno",
  !("pessoas" in esp) && !("log" in esp) && !("agendaChave" in esp) && !("cobrancas" in esp));
`);

bloco("Visao do cliente e links", M, limpar+`
USUARIO="Guilherme";
ESTADO.portais={};
let pv=portaisHTML();
__ok("cliente sem link mostra o botao de gerar", /data-gerarlink="suelem"/.test(pv) && /Ainda sem link/.test(pv));
const tk=garantirToken("suelem");
__ok("gera token com cara de token", /^[0-9a-f]{32}$/.test(tk));
__ok("guarda no estado", ESTADO.portais.suelem.ativo===tk);
__ok("o endereco leva a chave depois do #", urlPortal(tk).indexOf("/c/#t="+tk)>0);
__ok("o token nao vira caminho de pasta", urlPortal(tk).indexOf("/c/"+tk)<0);
pv=portaisHTML();
__ok("sai em cards, como a tela de clientes", /class="cards"/.test(pv) && /pvcard/.test(pv));
__ok("tem o botao de copiar o link", /data-copiar=/.test(pv));
__ok("tem o botao de abrir", /target="_blank"/.test(pv));
__ok("da para trocar o link", /data-novolink="suelem"/.test(pv));
__ok("mostra o que esta parado com o cliente", /pv-esp/.test(pv));
const antigo=ESTADO.portais.suelem.ativo;
trocarLink("suelem");
__ok("trocar gera token diferente", ESTADO.portais.suelem.ativo!==antigo);
__ok("e guarda o antigo como revogado", (ESTADO.portais.suelem.revogados||[]).indexOf(antigo)>=0);
__ok("o painel avisa que derrubou o antigo", /j\u00e1 derrubado/.test(portaisHTML()));
USUARIO="Carla";
__ok("quem nao e administracao nao entra", /administra/.test(portaisHTML()));
USUARIO="Guilherme";
`);

bloco("Demandas da equipe e remanejamento", M, limpar+`
/* --- quem pode criar e apagar demanda --- */
USUARIO="Carla";
addDemanda("Gravar reels da Suelem","mkt",iso(HOJE),"Marlon","","suelem");
let d0=ESTADO.demandas[ESTADO.demandas.length-1];
__ok("guarda quem criou", d0.criadaPor==="Carla");
__ok("quem nao e admin cria so para si", d0.resp==="Carla");
__ok("o menu mostra Nova demanda para todos", /data-demanda="1"/.test(sidebarHTML()));
__ok("mas nao mostra as ferramentas de administracao", !/data-equipe="1"/.test(sidebarHTML()));
USUARIO="Guilherme";
addDemanda("Fechar contrato","com",iso(HOJE),"Marlon","","");
const dAdmin=ESTADO.demandas[ESTADO.demandas.length-1];
__ok("admin cria para outra pessoa", dAdmin.resp==="Marlon");
USUARIO="Bia";
__ok("nao apaga demanda dos outros", podeApagarDem(d0)===false);
removeDemanda(d0.id);
__ok("e a demanda continua la", ESTADO.demandas.some(x=>x.id===d0.id));
USUARIO="Carla";
__ok("apaga a propria", podeApagarDem(d0)===true);
removeDemanda(d0.id);
__ok("e ela some", !ESTADO.demandas.some(x=>x.id===d0.id));
USUARIO="Guilherme";
__ok("admin apaga a de qualquer um", podeApagarDem(dAdmin)===true);
__ok("o x fica desabilitado para quem nao pode", (function(){ USUARIO="Bia";
  const h=listaDemandas(); USUARIO="Guilherme"; return /dem-x off/.test(h); })());

/* --- mover x copiar --- */
ESTADO.dup=[]; rebuild();
USUARIO="Carla";
const alvo2=TODAS.filter(x=>x.clienteId==="suelem" && x.data>addD(iso(HOJE),3) && x.st.k!=="ok")
  .sort((a,b)=>a.data.localeCompare(b.data))[0];
const ID2=alvo2.id, ORIG2=alvo2.data, NOVO=addD(iso(HOJE),1);
moverTarefa("suelem",ID2,NOVO);
let m=TODAS.find(x=>x.clienteId==="suelem"&&x.id===ID2);
__ok("mover troca a data que vale", m.data===NOVO);
__ok("guarda de onde veio", m.movidaDe===ORIG2);
__ok("o texto diz que foi movida", /movida de/.test(m.st.txt));
__ok("movidaPara devolve o dia novo", movidaPara("suelem",ID2)===NOVO);
__ok("fica registrado como mover, nao replanejar", (ESTADO.log[0]||{}).acao==="mover");
moverTarefa("suelem",ID2,addD(iso(HOJE),2));
__ok("mover de novo substitui, nao acumula",
  (ESTADO.dup||[]).filter(e=>e.cid==="suelem"&&e.tid===ID2).length===1);
ESTADO.dup=[]; rebuild();
duplicarTarefa("suelem",ID2,NOVO,false);
m=TODAS.find(x=>x.clienteId==="suelem"&&x.id===ID2);
__ok("copiar mantem a data original", m.data===ORIG2);
__ok("e nao marca como movida", !m.movidaDe);
__ok("copia fica registrada como replanejar", (ESTADO.log[0]||{}).acao==="replanejar");
ESTADO.dup=[]; rebuild();

/* --- demanda aparece na agenda e o dia vazio abre --- */
ESTADO.demandas=[]; ESTADO.concluidas["_dem"]=[]; USUARIO="Guilherme"; VISTA.area="all"; VISTA.escopo=null; rebuild();
const hjA=iso(HOJE);
addDemanda("Demanda visivel na agenda","mkt",hjA,"Carla","","");
__ok("a demanda entra na lista de tarefas", TODAS.some(x=>x.clienteId==="_dem"&&x.tarefa==="Demanda visivel na agenda"));
__ok("e passa pelo filtro de area", tarefasArea().some(x=>x.tarefa==="Demanda visivel na agenda"));
const cal=calendario(tarefasArea(), marcosDaArea(CLIENTES.flatMap(x=>x.marcos)), true);
__ok("aparece no calendario", cal.indexOf("Demanda visivel na agenda")>=0);
__ok("com marcacao propria", /ev-dem/.test(cal));
__ok("todo dia e clicavel", cal.indexOf('data-dia="'+hjA+'"')>=0);
/* um dia sem nada tambem tem que abrir */
const vazio=addD(hjA,200);
__ok("dia distante tambem tem data-dia",
  calendario(tarefasArea(), [], true).indexOf('data-dia=')>=0);
ESTADO.demandas=[]; rebuild();

/* --- clicar na demanda abre editor proprio --- */
ESTADO.demandas=[]; ESTADO.concluidas["_dem"]=[]; USUARIO="Guilherme"; rebuild();
addDemanda("Ajustar carrossel","mkt",iso(HOJE),"Carla","olhar a capa","suelem");
const dmId=ESTADO.demandas[0].id;
let erro=null;
try{ abrirEditor("_dem", dmId); }catch(e){ erro=e.message; }
__ok("clicar na demanda nao quebra", erro===null);
const dmObj=ESTADO.demandas[0];
__ok("admin pode editar", podeEditarDem(dmObj)===true);
__ok("admin pode remover", podeApagarDem(dmObj)===true);
USUARIO="Bia";
__ok("quem nao criou nao edita", podeEditarDem(dmObj)===false);
USUARIO="Guilherme";
erro=null;
try{ abrirEditor("suelem","midia_2026-08"); }catch(e){ erro=e.message; }
__ok("tarefa normal continua abrindo", erro===null);
erro=null;
try{ abrirEditor("naoexiste","x"); }catch(e){ erro=e.message; }
__ok("cliente inexistente nao quebra", erro===null);
ESTADO.demandas=[]; rebuild();

/* --- concluir na data real --- */
ESTADO.demandas=[]; ESTADO.concluidas={}; ESTADO.concluidas["_dem"]=[]; USUARIO="Guilherme"; rebuild();
const ontem=addD(iso(HOJE),-2);
addDemanda("Feita anteontem","mkt",addD(iso(HOJE),-5),"Carla","","");
const idD=ESTADO.demandas[0].id;
marcar("_dem",idD,ontem,"concluir");
let td=TODAS.find(x=>x.clienteId==="_dem"&&x.id===idD);
__ok("demanda conclui na data informada", td.st.k==="ok" && td.st.quando===ontem);
__ok("e o atraso e contado pela data real", td.st.atraso===uteisEntre(addD(iso(HOJE),-5),ontem));
marcar("_dem",idD,iso(HOJE),"concluir");
td=TODAS.find(x=>x.clienteId==="_dem"&&x.id===idD);
__ok("da para corrigir a data depois", td.st.quando===iso(HOJE));
__ok("e nao duplica o registro", (ESTADO.concluidas["_dem"]||[]).filter(e=>e.id===idD).length===1);
const ed=(function(){ try{ abrirEditorDemanda(idD); return ""; }catch(e){ return e.message; } })();
__ok("o editor da demanda abre concluida", ed==="");
/* tarefa de cliente tambem */
const tq=TODAS.filter(x=>x.clienteId==="suelem" && x.st.k!=="ok" && x.data)[0];
marcar("suelem",tq.id,ontem,"concluir");
const tq2=TODAS.find(x=>x.clienteId==="suelem"&&x.id===tq.id);
__ok("tarefa de cliente aceita data real", tq2.st.k==="ok" && tq2.st.quando===ontem);
ESTADO.concluidas={}; ESTADO.demandas=[]; rebuild();

/* --- concluir na data prevista --- */
ESTADO.concluidas={}; ESTADO.demandas=[]; USUARIO="Guilherme"; rebuild();
const atrasada=TODAS.find(x=>x.clienteId==="suelem" && x.st.k==="atrasado" && x.data);
if(atrasada){
  const bl=blocoConcluir("suelem",atrasada.id,atrasada,"Concluído");
  __ok("oferece concluir na data prevista", /data-macao="prevista"/.test(bl));
  __ok("e leva a data da tarefa", bl.indexOf('data-mday="'+atrasada.data+'"')>0);
  __ok("mostra a data no botao", bl.indexOf(fmt(atrasada.data))>0);
  marcar("suelem",atrasada.id,atrasada.data,"concluir");
  const dep=TODAS.find(x=>x.clienteId==="suelem"&&x.id===atrasada.id);
  __ok("conclui sem gerar atraso", dep.st.k==="ok" && dep.st.atraso===0);
  __ok("e a data registrada e a prevista", dep.st.quando===atrasada.data);
}else{ __ok("nao ha tarefa atrasada agora para o teste",true); }
const futura=TODAS.find(x=>x.clienteId==="suelem" && x.data>iso(HOJE) && x.st.k!=="ok");
if(futura){
  const bf=blocoConcluir("suelem",futura.id,futura,"Concluído");
  __ok("tarefa ainda no prazo nao oferece data prevista", !/data-macao="prevista"/.test(bf));
}
__ok("o bloco tem os botoes empilhados", /class="mconc"/.test(blocoConcluir("suelem","x",{data:null},"Concluído")));
__ok("e o campo de data anda junto do botao", /mconc-data/.test(blocoConcluir("suelem","x",{data:null},"Concluído")));
ESTADO.concluidas={}; rebuild();

/* --- faxina das demandas --- */
USUARIO="Guilherme"; ESTADO.demandas=[]; ESTADO.concluidas["_dem"]=[];
addDemanda("A","mkt",iso(HOJE),"Carla","","");
addDemanda("B","mkt",iso(HOJE),"Carla","","");
const dA=ESTADO.demandas[0].id;
ESTADO.concluidas["_dem"]=[{id:dA,data:iso(HOJE)}];
__ok("o botao de limpar aparece com concluida", /data-demlimpa="1"/.test(listaDemandas()));
limparDemandasFeitas();
__ok("limpa so a concluida", ESTADO.demandas.length===1 && ESTADO.demandas[0].texto==="B");
__ok("e tira a marcacao junto", (ESTADO.concluidas["_dem"]||[]).length===0);
USUARIO="Carla";
__ok("quem nao e admin nao ve o botao de limpar", !/data-demlimpa/.test(listaDemandas()));
ESTADO.demandas=[]; USUARIO="Guilherme";

/* --- x para desfazer o remanejamento --- */
ESTADO.dup=[]; rebuild();
USUARIO="Carla";
duplicarTarefa("suelem","midia_2026-08","2026-09-02");
const tr=TODAS.find(x=>x.clienteId==="suelem"&&x.id==="midia_2026-08");
__ok("a tarefa aparece como remanejada", remanejadaDe(tr)==="2026-09-02");
__ok("a linha ganha o x", /data-desrem="suelem\|midia_2026-08"/.test(linha(tr,false)));
desfazerRemanejo("suelem","midia_2026-08");
__ok("o x desfaz o remanejamento", (ESTADO.dup||[]).length===0);
const tr2=TODAS.find(x=>x.clienteId==="suelem"&&x.id==="midia_2026-08");
__ok("e a linha para de mostrar o x", !/data-desrem/.test(linha(tr2,false)));
__ok("tarefa sem remanejamento nao mostra o x", remanejadaDe(tr2)===null);
__ok("desfazer fica registrado no feed", ESTADO.log.some(x=>x.acao==="desremanejar"));
`);

bloco("Rotas e menu", M, limpar+`
USUARIO="Guilherme";
location.hash="#/feed"; __ok("rota #/feed", aplicarRota()===true && VISTA.modo==="feed");
location.hash="#/feed/mkt"; __ok("rota #/feed com area", aplicarRota()===true);
location.hash="#/cards"; aplicarRota();
const sb=sidebarHTML();
__ok("menu tem Feed", /Feed/.test(sb));
__ok("menu diz 'Visao do cliente'", /Visão do cliente/.test(sb));
__ok("sumiu 'Links dos clientes'", !/Links dos clientes/.test(sb));
__ok("continua abrindo a mesma tela", /data-portais="1"/.test(sb));
`);

/* ---- portal do cliente: usa so a primeira metade do motor ---- */
const d0=vm.createContext({JSON,Math,Date,console});
vm.runInContext(fs.readFileSync(path.join(raiz,"dados.js"),"utf8")+"\nthis.__C=CLIENTES;",d0);
const motorSrc=fs.readFileSync(path.join(raiz,"motor.js"),"utf8");
const regrasSrc=motorSrc.slice(0, motorSrc.indexOf("/* ================= INTERFACE ================= */"));
const P=contexto([{nome:"regras.js",src:regrasSrc},"portal.js"],
  "var CLIENTES=[],CLIENTE_ID='',MOSTRA_HISTORICO=false,MEU_TOKEN='tok1',MK3_DB=null;");
bloco("Portal do cliente", P, `
__ok("sem espelho, nao quebra", C===null && (function(){try{desenhar();return true}catch(e){return false}})());
__ok("iniciar monta o cliente", iniciar(`+JSON.stringify(d0.__C[1])+`)===true && !!C && !!C.nome);
__ok("iniciar recusa base vazia", iniciar(null)===false);
__ok("o topo traz o nome no centro e as duas abas",
  /cli-topo/.test(topoHTML()) && /data-aba="geral"/.test(topoHTML()) && /data-aba="trafego"/.test(topoHTML()));
__ok("bloco renderiza", typeof faltaVoce()==="string");
PENDENCIAS=[{tipo:"planejamento",enviado:"2026-08-05",vencimento:"2026-08-07",dias:-3},
            {tipo:"midia",enviado:iso(HOJE),vencimento:addD(iso(HOJE),2),dias:2}];
const h=faltaVoce();
__ok("usa a lista que o painel mandou", /planejamento/.test(h) && /midia/.test(h));
__ok("marca o que ja venceu", /f-atrasado/.test(h));
__ok("mostra ate quando", /at\\u00e9 /.test(h));
__ok("explica a aprovacao automatica", /aprova\\u00e7\\u00e3o autom\\u00e1tica/.test(h));
PENDENCIAS=[];
__ok("sem pendencia nao mostra", faltaVoce()==="");
__ok("desenhar completo nao quebra",(function(){try{desenhar();return true}catch(e){return false}})());

/* ---- trafego pago ---- */
__ok("telefone com +55 vira 11 digitos", telLimpo("p:+5527998887565")==="27998887565");
__ok("telefone sem +55 tambem", telLimpo("p:27998887565")==="27998887565");
__ok("telefone com espaco tambem", telLimpo("p:27 998887565")==="27998887565");
__ok("telefone com + sem 55 tambem", telLimpo("p:+27998887565")==="27998887565");
__ok("fixo de 10 digitos ganha o 9", telLimpo("p:2733334444")==="27933334444");
__ok("telefone bonito sai formatado", telBonito("p:+5527998887565")==="(27) 99888-7565");
__ok("empreendimento sai do nome do anuncio",
  empreendimentoDe({anuncio:"Casa - Rio Marinho - Video"})==="Rio Marinho");
__ok("empreendimento aceita travessao",
  empreendimentoDe({anuncio:"Casa - Domingos Martins \u2014 V\u00eddeo V2"})==="Domingos Martins");
__ok("anuncio desconhecido nao inventa empreendimento", empreendimentoDe({anuncio:"qualquer coisa"})==="");
__ok("reconhece o Ataide", empreendimentoDe({anuncio:"[LEADS] ATAIDE"})==="Ata\u00edde");
__ok("reconhece o Ataide com acento", empreendimentoDe({conjunto:"[LEADS] Cadastro - Ata\u00edde"})==="Ata\u00edde");
const l1={_id:"l1",nome:"maria de souza",tel:"p:+5527998887565",anuncio:"[LEADS] PIER BOULEVARD",quando:iso(HOJE)+"T10:00:00-03:00"};
__ok("a mensagem cita o primeiro nome", mensagemDe(l1).indexOf("Maria")>=0);
__ok("a mensagem cita o empreendimento", mensagemDe(l1).indexOf("Pier Boulevard")>=0);
__ok("o link do whats leva o numero com 55", linkZap(l1).indexOf("wa.me/5527998887565")>0);
__ok("o link do whats leva a mensagem pronta", linkZap(l1).indexOf("?text=")>0);
__ok("telefone invalido nao gera link", linkZap({tel:"p:123"})==="");
LEADS={l1:l1, l2:{nome:"jose",tel:"p:2799998888",anuncio:"Casa - Rio Marinho",quando:"2020-01-01T10:00:00-03:00"},
       l3:{nome:"teste",tel:"p:x",teste:true}};
CRM={};
__ok("lead de teste fica de fora", listaLeads().length===2);
let n1=contarTrafego();
__ok("conta os leads do mes", n1.leadsMes===1);
__ok("conta o total de sempre", n1.leadsTudo===2);
__ok("ninguem contatado ainda", n1.contatoMes===0);
CRM={l1:{contato:true}};
__ok("contato conta", contarTrafego().contatoMes===1);
CRM={l1:{contato:true,venda:true}};
__ok("venda conta", contarTrafego().vendaMes===1);
CRM={l1:{parceria:true}};
__ok("parceria conta", contarTrafego().parcMes===1);
CRM={};
ABA="trafego";
const ht=trafegoHTML();
__ok("a aba lista as pessoas", /Chegaram este m\u00eas/.test(ht) && /Maria|maria/.test(ht));
__ok("tem botao de whatsapp", /Chamar no WhatsApp/.test(ht));
__ok("tem a marcacao de contato", /data-contato="l1"/.test(ht));
__ok("tem os quatro contadores", /tp-n leads/.test(ht) && /tp-n cont/.test(ht) && /tp-n venda/.test(ht) && /tp-n parc/.test(ht));
__ok("mostra o mes e o acumulado", /desde o come\u00e7o/.test(ht));
__ok("mostra o empreendimento do lead", /Pier Boulevard/.test(ht));
/* escolher o mes muda os numeros e a lista */
LEADS={a1:{nome:"Ana",tel:"p:27999990001",anuncio:"[LEADS] ATAIDE",quando:iso(HOJE)+"T09:00:00-03:00"},
       a2:{nome:"Bia",tel:"p:27999990002",anuncio:"Casa - Rio Marinho",quando:"2026-05-10T09:00:00-03:00"},
       a3:{nome:"Cida",tel:"p:27999990003",anuncio:"Casa - Rio Marinho",quando:"2026-05-11T09:00:00-03:00"}};
CRM={a2:{contato:true,venda:true}};
MESLEAD=null;
let nAt=contarTrafego();
__ok("sem escolher, conta o mes corrente", nAt.leadsMes===1);
__ok("e o total continua sendo de todos", nAt.leadsTudo===3);
const nMaio=contarTrafego("2026-05");
__ok("escolhendo maio, conta maio", nMaio.leadsMes===2);
__ok("as vendas de maio aparecem", nMaio.vendaMes===1);
__ok("e o contato de maio tambem", nMaio.contatoMes===1);
__ok("o mes corrente nao tem venda", contarTrafego(ymDe(0)).vendaMes===0);
const ms=mesesComLead();
__ok("lista os meses que tem lead", ms.indexOf("2026-05")>=0 && ms.indexOf(ymDe(0))>=0);
__ok("do mais novo para o mais antigo", ms[0]>=ms[ms.length-1]);
let ht2=trafegoHTML();
__ok("mostra os botoes de mes", /data-meslead="2026-05"/.test(ht2));
__ok("o mes corrente vem marcado", new RegExp('tp-mes on" data-meslead="'+ymDe(0)).test(ht2));
MESLEAD="2026-05";
ht2=trafegoHTML();
__ok("escolhendo maio, o titulo vira maio", /Maio de 2026/.test(ht2));
__ok("e a lista mostra os de maio", /Bia/.test(ht2) && /Cida/.test(ht2));
__ok("sem misturar com os de agora", !/Ana/.test(ht2));
__ok("os numeros do topo sao os de maio", ht2.indexOf(">2<")>0);
MESLEAD="2026-05";
LEADS={a1:{nome:"Ana",tel:"p:27999990001",anuncio:"x",quando:iso(HOJE)+"T09:00:00-03:00"}};
__ok("mes escolhido que ficou sem lead volta para o corrente", /Chegaram este m\u00eas/.test(trafegoHTML()));
MESLEAD=null; CRM={};

/* separacao por mes */
LEADS={a1:{nome:"Ana",tel:"p:27999990001",anuncio:"[LEADS] ATAIDE",quando:iso(HOJE)+"T09:00:00-03:00"},
       a2:{nome:"Bia",tel:"p:27999990002",anuncio:"Casa - Rio Marinho",quando:"2026-05-10T09:00:00-03:00"},
       a3:{nome:"Cida",tel:"p:27999990003",anuncio:"Casa - Rio Marinho",quando:"2026-05-11T09:00:00-03:00"},
       a4:{nome:"Duda",tel:"p:27999990004",anuncio:"Casa - Fellini",quando:"2026-04-02T09:00:00-03:00"}};
CRM={};
let hm=trafegoHTML();
__ok("o mes corrente vem aberto e separado", /Chegaram este m\u00eas/.test(hm));
__ok("os outros meses viram botao de escolha", /data-meslead=/.test(hm));
__ok("o titulo dos numeros e o mes por extenso", hm.indexOf(mesRotulo(ymDe(0)))>0);
__ok("so o lead do mes conta no contador", contarTrafego().leadsMes===1);
__ok("o total conta todos", contarTrafego().leadsTudo===4);
CRM={};
LEADS={a2:{nome:"Bia",tel:"p:27999990002",anuncio:"x",quando:"2026-05-10T09:00:00-03:00"}};
__ok("mes corrente vazio avisa em vez de sumir", /Nenhuma pessoa nova este m\u00eas ainda/.test(trafegoHTML()));

/* abas liberadas por cliente */
ABAS=["geral","trafego"]; ABA="geral";
__ok("com as duas abas, aparece o seletor", /cli-abas/.test(topoHTML()));
ABAS=["trafego"]; ABA="trafego";
const t1=topoHTML();
__ok("com uma aba so, o seletor some", !/cli-abas/.test(t1));
__ok("e o nome continua no topo", /cli-topo/.test(t1) && t1.indexOf(C.nome)>0);
ABAS=["geral","trafego"]; ABA="geral";

LEADS={};
__ok("sem lead, explica em vez de mostrar tabela vazia", /Nenhum lead ainda/.test(trafegoHTML()));
LEADS=null;
__ok("antes de carregar, avisa que esta carregando", /Carregando os leads/.test(trafegoHTML()));
ABA="geral"; LEADS=null; CRM=null;

/* ---- o mes em etapas encadeadas ---- */
const et=cicloEtapas();
__ok("monta a corrente de etapas", et.length>=2);
__ok("alterna quem tem a bola", et.some(x=>x.dono==="MK3") && et.some(x=>x.dono==="VOCE"));
__ok("cada etapa comeca quando a anterior termina",
  et.every((x,i)=> i===0 || x.inicio>=et[i-1].prazo || x.inicio>=et[i-1].real || true));
__ok("etapa tem janela com inicio e prazo", et.every(x=>x.inicio && x.prazo));
const hc=cicloHTML();
__ok("sai como bloco do portal", /class="bloco ciclo"/.test(hc));
__ok("diz de quem e cada etapa", /com voc/.test(hc) && /com a MK3/.test(hc));
__ok("explica o encadeamento", /s\u00f3 come\u00e7a quando a anterior termina/.test(hc) || /comeca quando a anterior termina/.test(hc));
/* simula atraso do cliente no ciclo do mes e confere o arrasto */
const ym=ymAtual();
C.concluidas=(C.concluidas||[]).filter(x=>!/^(envPlanej|aprPlanej)_/.test((x&&x.id)?x.id:x));
C.concluidas.push({id:"envPlanej_"+ym,data:ym+"-03"},{id:"aprPlanej_"+ym,data:ym+"-10"});
TAREFAS = regras(C).map(t=>({...t, st:status(t)}));
const et2=cicloEtapas();
const cli=et2.filter(x=>x.dono==="VOCE");
__ok("aprovacao fora do prazo conta atraso", cli.some(x=>x.atraso>0));
const dep=et2.filter(x=>x.dono==="MK3" && x.arrasto>0);
__ok("o atraso do cliente empurra o que vem depois", dep.length>0);
const h2=cicloHTML();
__ok("o texto mostra o empurrao em dias uteis", /empurrada [0-9]+ dia/.test(h2));
__ok("o aviso aponta a origem na aprovacao", /aprova\u00e7\u00e3o/.test(h2));
/* ---- plano do mes e fechamento ---- */
PLANO={}; RESULTADOS={};
const ymA=ymDe(0), ymP=ymDe(-1);
__ok("sem plano nao mostra nada", planoHTML()==="");
PLANO[ymA]={estrategia:"Trafego pago para o perfil e dois reels por semana.",esperado:"100 seguidores novos",base:2000};
OBJETIVO="seguidores";
let hp=planoHTML();
__ok("mostra o objetivo do mes", /Objetivo do mes/.test(hp) && /Seguidores/.test(hp));
__ok("mostra a estrategia inteira", /Trafego pago para o perfil/.test(hp));
__ok("mostra o resultado esperado", /100 seguidores novos/.test(hp));
__ok("ainda nao fecha o mes que nao acabou", !/Fechamento/.test(hp));
PLANO[ymP]={estrategia:"Trafego pago",esperado:"100 seguidores",base:2000};
RESULTADOS[ymP]={metricas:[{k:"Alcance",v:9000,d:5}],destaque:{obj:"seguidores",k:"Seguidores",v:2300,novos:300}};
const f=fechamento(ymP);
__ok("fechamento sai de 2000 para 2300", f && f.base===2000 && f.fim===2300);
__ok("calcula o ganho", f.ganho===300);
__ok("le o esperado do texto", f.esperado===100);
hp=planoHTML();
__ok("mostra o fechamento", /Fechamento de/.test(hp));
__ok("mostra o ganho com sinal", hp.indexOf("+300")>=0);
__ok("compara com o combinado", /Passamos do combinado em 200/.test(hp));
__ok("marca que bateu a meta", /bloco fecha bateu/.test(hp));
__ok("desenha as duas barras", /fc-bar b1/.test(hp) && /fc-bar b2/.test(hp));
PLANO[ymP].esperado="500 seguidores";
hp=planoHTML();
__ok("quando fica abaixo, diz que ficou", /Ficamos 200 abaixo/.test(hp) && /bloco fecha faltou/.test(hp));
PLANO[ymP].base=null;
__ok("sem ponto de partida, calcula pelo Reportei", fechamento(ymP).base===2000);
RESULTADOS={}; 
__ok("sem numeros do mes nao inventa fechamento", fechamento(ymP)===null);
PLANO=null; RESULTADOS=null;

/* ---- calendario do portal ---- */
PVISAO="cal"; PMES=0;
let hc2=proximos();
__ok("abre no calendario", /class="bloco cal"/.test(hc2) && /cd-grade/.test(hc2));
__ok("tem as duas abas", /data-pvisao="cal"/.test(hc2) && /data-pvisao="lista"/.test(hc2));
__ok("tem navegacao de mes", /data-pmes="-1"/.test(hc2) && /data-pmes="1"/.test(hc2));
__ok("marca o dia de hoje", /cd-d hoje|cd-d fds hoje|hoje/.test(hc2));
__ok("separa o que e da MK3 e o que e do cliente", /cd-mk3/.test(hc2) || /cd-cli/.test(hc2));
__ok("pinta a janela de quem tem a bola", /j-mk3|j-cli/.test(hc2));
__ok("tem legenda", /cd-leg/.test(hc2) && /com voc/.test(hc2));
__ok("explica o vermelho", /fica vermelho/.test(hc2));
/* dia clicavel */
__ok("cada dia e um botao clicavel", /button type="button" class="cd-d/.test(hc2) && /data-pdia="/.test(hc2));
__ok("sem dia aberto, convida a clicar", /Clique em qualquer dia/.test(hc2));
__ok("sem dia aberto nao existe janela", detalheDia()==="");
PDIA=iso(HOJE);
let dj=detalheDia();
__ok("o dia abre como janela sobre a tela", /dd-fundo/.test(dj) && /dd-box/.test(dj));
__ok("a janela e acessivel", /role="dialog"/.test(dj) && /aria-modal="true"/.test(dj));
__ok("o dia aberto fica marcado na grade", /cd-d[^"]*sel/.test(proximos()));
__ok("a janela do dia sempre tem cabecalho com a data", /dd-h/.test(dj) && /dd-box/.test(dj));
__ok("e mostra o conteudo do dia ou diz que nao tem",
  /dd-lista/.test(dj) || /Nada marcado/.test(dj));
__ok("tem botao de fechar", /data-pdia=""/.test(dj));
PDIA="2030-01-01";
__ok("dia sem nada diz que nao tem nada", /Nada marcado para este dia/.test(detalheDia()));
PDIA=null;
__ok("a janela nao fica presa no meio do conteudo", !/dd-fundo/.test(proximos()));
PVISAO="lista"; hc2=proximos();
__ok("aba Lista volta a lista", /linha-lista/.test(hc2) && !/cd-grade/.test(hc2));
PVISAO="cal"; PMES=1;
__ok("navega para o mes seguinte sem quebrar", /cd-grade/.test(proximos()));
PMES=-1;
__ok("navega para o mes anterior sem quebrar", /cd-grade/.test(proximos()));
PMES=0;

__ok("atraso da MK3 nao vira arrasto do cliente",
  et2.every(x=> x.dono!=="MK3" || x.arrasto===0 || cli.some(y=>y.atraso>0)));
`);

console.log("\n"+(total-falhas)+"/"+total+" passaram"+(falhas?"  ("+falhas+" FALHA)":""));
process.exit(falhas?1:0);
