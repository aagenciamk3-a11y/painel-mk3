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
const alvo=TODAS.find(x=>x.clienteId==="cynthia"&&x.id==="planej_2026-08");
__ok("a tarefa comeca no futuro", !!alvo && alvo.data>hoje && alvo.st.k==="futuro");
__ok("da para trazer para hoje", podeReplanejar(alvo,hoje)===true);
__ok("nao da para jogar no passado", podeReplanejar(alvo,addD(hoje,-1))===false);
USUARIO="Carla";
duplicarTarefa("cynthia","planej_2026-08",hoje);
let t=TODAS.find(x=>x.clienteId==="cynthia"&&x.id==="planej_2026-08");
__ok("antecipar faz vencer hoje", t.st.k==="hoje");
__ok("o texto diz de onde veio", /antecipada de/.test(t.st.txt));
__ok("guarda a data original", t.st.antecipada===alvo.data);
__ok("registra quem replanejou", (ESTADO.log[0]||{}).quem==="Carla");
ESTADO.dup=[]; rebuild();
duplicarTarefa("cynthia","planej_2026-08","2026-09-10");
t=TODAS.find(x=>x.clienteId==="cynthia"&&x.id==="planej_2026-08");
__ok("adiar mantem o prazo original", !/antecipada/.test(t.st.txt));
ESTADO.dup=[{cid:"cynthia",tid:"planej_2026-08",dia:passou,orig:"2026-08-23"}]; rebuild();
t=TODAS.find(x=>x.clienteId==="cynthia"&&x.id==="planej_2026-08");
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

bloco("Visao do cliente", M, limpar+`
USUARIO="Guilherme";
PORTAIS={suelem:{tokens:["t1","t2"],ativo:0,historico:true}, leonardo:{tokens:["t9"],ativo:0}};
const pv=portaisHTML();
__ok("sai em cards, como a tela de clientes", /class="cards"/.test(pv) && /pvcard/.test(pv));
__ok("tem o botao de copiar o link", /data-copiar=/.test(pv));
__ok("tem o botao de abrir", /target="_blank"/.test(pv));
__ok("quem tem reserva pode trocar o link", /data-novolink="suelem"/.test(pv));
__ok("quem nao tem reserva avisa", /sem reservas/.test(pv));
__ok("marca quem tem historico", /com hist/.test(pv));
__ok("mostra o que esta parado com o cliente", /pv-esp/.test(pv));
__ok("cliente sem portal aparece assim mesmo", /Portal ainda n/.test(pv));
location.hash="#/portais";
__ok("tem endereco proprio", aplicarRota()===true && VISTA.modo==="portais");
USUARIO="Carla"; VISTA.modo="portais";
__ok("quem nao e administracao nao entra", /administra/.test(portaisHTML()));
location.hash="#/portais"; aplicarRota();
__ok("rota derruba quem nao pode", VISTA.modo!=="portais");
USUARIO="Guilherme"; PORTAIS=null;
`);

bloco("Plano do mes (painel)", M, limpar+`
USUARIO="Guilherme";
const ymp=mesAtualYM();
__ok("comeca vazio", planoDe("suelem",ymp).estrategia==="");
salvarPlano("suelem",ymp,{estrategia:"Trafego pago para o perfil",esperado:"100 seguidores",base:"2000"});
const pl=planoDe("suelem",ymp);
__ok("guarda a estrategia", pl.estrategia==="Trafego pago para o perfil");
__ok("guarda o esperado", pl.esperado==="100 seguidores");
__ok("guarda o ponto de partida como numero", pl.base===2000);
__ok("registra quem salvou", (ESTADO.log[0]||{}).quem==="Guilherme");
ESTADO.portais={suelem:{tokens:["t1"],ativo:0}};
const espP=espelhoDe("suelem");
__ok("o espelho leva o plano", !!espP.plano && !!espP.plano[ymp]);
__ok("o espelho nao leva plano de outro cliente", Object.keys(espP.plano).every(k=>/^[0-9]{4}-[0-9]{2}$/.test(k)));
salvarPlano("suelem",ymp,{estrategia:"",esperado:"",base:""});
__ok("apagar tudo limpa o plano", !((ESTADO.plano.suelem||{})[ymp]));
USUARIO="Carla";
salvarPlano("suelem",ymp,{estrategia:"nao pode",esperado:"",base:""});
__ok("quem nao e administracao nao salva", !((ESTADO.plano.suelem||{})[ymp]));
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
  "const CLIENTES=["+JSON.stringify(d0.__C[1])+"];const MOSTRA_HISTORICO=false;var MEU_TOKEN='tok1',MK3_DB=null;");
bloco("Portal do cliente", P, `
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

__ok("atraso da MK3 nao vira arrasto do cliente",
  et2.every(x=> x.dono!=="MK3" || x.arrasto===0 || cli.some(y=>y.atraso>0)));
`);

console.log("\n"+(total-falhas)+"/"+total+" passaram"+(falhas?"  ("+falhas+" FALHA)":""));
process.exit(falhas?1:0);
