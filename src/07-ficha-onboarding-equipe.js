/* ================= FICHA DA MARCA, LINKS E CARIMBO ================= */
/* quem marcou a tarefa como feita, lido do próprio log */
function carimboDe(cid,tid){
  const e=(ESTADO.log||[]).find(x=>x.cliente===cid && x.id===tid && (x.acao==="concluir"||x.acao==="registrar"));
  if(!e || !e.quem) return null;
  const d=new Date(e.ts);
  return {quem:e.quem, quando:d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})+" às "+
          d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})};
}
function carimboHTML(t){
  if(t.st.k!=="ok") return '';
  const c=carimboDe(t.clienteId,t.id); if(!c) return '';
  return '<span class="carimbo" data-tt="'+escAttr(c.quem+" marcou em "+c.quando)+'">'+esc(c.quem)+'</span>';
}

/* links úteis de cada cliente */
const LINKS_PADRAO = {
  suelem:   {drive:"https://drive.google.com/drive/folders/1O5eYgdfNYqghQnjc0q84_NpBcW9Cr63m", insta:"suelemmartinsgomes", wpp:"27998887565"},
  cynthia:  {drive:"https://drive.google.com/drive/folders/1SlPUFY7OOSqso9lhAUfi92dFg2j23Eza", insta:"cynthiadcorretora", wpp:"27999178909"},
  oceanus:  {drive:"https://drive.google.com/drive/folders/1FAUG6fIzv3nIB1bqlUdAkHEX2BFSqQN0", insta:"escolaoceanus", wpp:"27992626014"},
  adriana:  {drive:"https://drive.google.com/drive/folders/1Mr_J56Sp8d2wnaTIfjkOT6BlXQlIXaHf", insta:"adriana.dinhamais", wpp:"27988537167"}
};
function linksDe(c){
  const ed=(ESTADO.clientes&&ESTADO.clientes[c.id])||{}, pad=LINKS_PADRAO[c.id]||{};
  const v=k=>(ed[k]!==undefined && ed[k]!==null && ed[k]!=="") ? ed[k] : (pad[k]||"");
  const insta=String(v("insta")).replace(/^@/,"").trim();
  const wpp=String(v("wpp")).replace(/\D/g,"");
  return {drive:v("drive"), insta:insta?("https://instagram.com/"+insta):"", instaNome:insta,
          wpp:wpp?("https://wa.me/"+(wpp.length<=11?"55":"")+wpp):"", wppNum:wpp};
}
const IC_LINK = {
  drive:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h7A1.5 1.5 0 0 1 19 10v7.5A1.5 1.5 0 0 1 17.5 19h-13A1.5 1.5 0 0 1 3 17.5z"/></svg>',
  insta:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/></svg>',
  wpp:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12a8 8 0 0 1-11.9 7L4 20l1.1-3.9A8 8 0 1 1 20 12z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.4-2-1-.8.9c-1-.5-1.8-1.3-2.2-2.3l.9-.8-1-2z" fill="currentColor" stroke="none"/></svg>'
};
function linksHTML(c, cls){
  const L=linksDe(c), b=[];
  if(L.drive) b.push('<span class="lnk" role="link" tabindex="0" data-abrir="'+escAttr(L.drive)+'" data-tt="Pasta no Drive">'+IC_LINK.drive+'</span>');
  if(L.insta) b.push('<span class="lnk" role="link" tabindex="0" data-abrir="'+escAttr(L.insta)+'" data-tt="@'+escAttr(L.instaNome)+'">'+IC_LINK.insta+'</span>');
  if(L.wpp)   b.push('<span class="lnk" role="link" tabindex="0" data-abrir="'+escAttr(L.wpp)+'" data-tt="WhatsApp do cliente">'+IC_LINK.wpp+'</span>');
  return b.length?'<div class="lnks '+(cls||"")+'">'+b.join("")+'</div>':'';
}

/* ficha da marca — o que a equipe precisa na hora de escrever */
const FICHA_PADRAO = {
  cynthia:{
    frase:"Venda com propósito: realizar a conquista do cliente, não só fechar negócio.",
    objetivo:"Visibilidade e público de Vitória. Hoje a base é de Cachoeiro e o engajamento é fraco.",
    publico:"Médio e alto padrão em Vitória. Muito por indicação. Investidores e quem cuida de saúde e estética.",
    tom:"Meiga e direta. Fala coisa difícil sem ofender. Nunca omite defeito do imóvel: se é sol da tarde, é sol da tarde.",
    temas:"Viagens, restaurantes e barzinhos, família, filhos adultos, esportes sem exagero, charuto.",
    evitar:"Palavrão, agressividade, inventar ou omitir informação do imóvel, cliente especulador.",
    visual:"Moderna tradicional. Paleta marrom, bege, boho, branco, azul marinho e vinho. Sem estampa.",
    refs:"Suelem, Larissa Moraes (refugios.lar.lare), Carolina Zarch.",
    sucesso:"Um cliente chegar pelo Instagram, e ser reconhecida na região onde mora.",
    recado:"Na imersão você foi clara: não quer seguidor por seguidor, quer gente de Vitória. Hoje boa parte da sua base ainda é de Cachoeiro, e é isso que estamos virando. Cada seguidor novo daqui é alguém que pode visitar um imóvel com você."
  },
  adriana:{
    frase:"Elevando a autoestima da mulher.",
    objetivo:"Profissionalizar o perfil e trazer gente de fora do bairro para a loja.",
    publico:"Mulheres maduras que gostam de se vestir bem, confortável e intencional. Cariacica, Jardim América e Vila Velha.",
    tom:"Amigável, empática, confiante.",
    temas:"Moda, autoestima, autoconfiança, cores, modelagem, caimento, tecido, versatilidade. Consultoria de imagem (Transforma Dinha).",
    evitar:"Política, religião de forma forte, polêmica que obriga escolher lado. Atrair quem compra só por preço.",
    visual:"Mulher madura, segura, estilosa. Nada desleixado ou triste.",
    refs:"Silva Braz, Tom Braga (formato dos vídeos), Karine Mozer.",
    sucesso:"Constância no perfil e clientes novos conhecendo a marca pelo conteúdo.",
    recado:"Seu objetivo é que gente de fora do bairro conheça a loja. Alcance é exatamente essa conta: quantas pessoas diferentes viram a Dinha Mais no mês. Quanto mais gente nova alcançada, mais gente com chance de atravessar Cariacica para comprar com você."
  },
  oceanus:{
    frase:"Escola Oceanu's, particular, fundada em 1994, em Barcelona, Serra. Da Educação Infantil ao Fundamental II.",
    objetivo:"Gerar visita e matrícula. Instagram atrai, WhatsApp fecha. Pico de matrícula de outubro a fevereiro, com segundo pico em julho.",
    publico:"Pais de 28 a 45 anos de Serra e Grande Vitória. A mãe faz a triagem e a visita, o pai valida o custo, os avós pesam na confiança. Valorizam segurança, bilinguismo, estrutura, integral e proximidade.",
    tom:"Acolhedor e afetivo, com humor leve. Linguagem de família: rotina, acolhimento, adaptação, tranquilidade. Nunca culpa os pais.",
    temas:"Volta às aulas, rotina de sono, tela x livro, descanso como parte do aprendizado, brincadeiras entre gerações, bastidores de professores e equipe, tour pela estrutura, adaptação, alimentação, segurança.",
    evitar:"Promessa absoluta (\"seu filho vai...\"), expor criança identificada ou com rotina detalhada, lista de alunos, apelo a medo ou culpa, comparação agressiva com concorrente, garantia de resultado, termo técnico sem tradução, trend sem ligação com o local, excesso de CTA na mesma peça.",
    visual:"Logo em PNG, SVG e PDF no Drive antigo da agência. Tem cartão, folder e manual escolar.",
    refs:"sem base no Drive",
    sucesso:"Agenda de visitas cheia na temporada de matrícula.",
    recado:"O que traz matrícula é visita agendada, e visita começa com um pai vendo a escola no Instagram. É esse caminho que a gente acompanha aqui."
  },
  suelem:{
    frase:"Acolhimento e envolvimento real com a história de cada cliente. Ela não desiste.",
    objetivo:"Ser a corretora mais lembrada de Cariacica. Ampliar vendas por indicação e consolidar a marca.",
    publico:"Homens e mulheres a partir de 27 anos em transição: casamento, primeiro imóvel, ampliação de patrimônio, investimento. Do Minha Casa Minha Vida ao alto padrão.",
    tom:"Empático, próximo, direto e inspirador. Adapta ao cliente, foge do padrão engessado.",
    temas:"Bastidores reais, jornada do cliente, fé, família. Frases dela: \"Esse imóvel é um espetáculo!\", \"Juntos somos mais fortes.\"",
    evitar:"Mentir, forçar venda, agir por comissão.",
    visual:"Simples, elegante, com toque familiar, moderno e espiritual.",
    refs:"Rosângela Bastos, Tais Nascimento.",
    sucesso:"Ser referência em Cariacica: respeitada, indicada e admirada.",
    recado:"Sua meta é ser a corretora mais lembrada de Cariacica. Ser lembrada é aparecer muitas vezes para as mesmas pessoas certas, e é isso que este número conta: quantas vezes seu conteúdo apareceu na tela de alguém no mês."
  }
};
const FICHA_CAMPOS = [
  ["frase","A marca em uma frase"],
  ["objetivo","Objetivo do cliente"],
  ["publico","Quem é o público"],
  ["tom","Tom de voz"],
  ["temas","Temas da marca"],
  ["evitar","O que NÃO abordar"],
  ["visual","Identidade visual"],
  ["refs","Referências que admira"],
  ["sucesso","O que é sucesso pra ele"],
  ["recado","Recado do objetivo (o cliente lê isso no portal)"]
];
/* Copia para o banco os links e fichas que ainda moram no codigo (repositorio publico).
   Roda quando um admin abre o painel ja sincronizado. Depois que todos estiverem no banco,
   LINKS_PADRAO e FICHA_PADRAO podem sair do codigo sem nada sumir da tela. */
function migrarDadosDoCodigo(){
  if(!ehAdmin() || (SYNC && !SYNC_PRONTO)) return 0;
  let n=0;
  ESTADO.clientes=ESTADO.clientes||{}; ESTADO.ficha=ESTADO.ficha||{};
  Object.keys(LINKS_PADRAO).forEach(id=>{
    const pad=LINKS_PADRAO[id], ed=ESTADO.clientes[id]=ESTADO.clientes[id]||{};
    ["drive","insta","wpp"].forEach(k=>{ if(pad[k] && (ed[k]===undefined||ed[k]===null||ed[k]==="")){ ed[k]=pad[k]; n++; } });
  });
  Object.keys(FICHA_PADRAO).forEach(id=>{
    const pad=FICHA_PADRAO[id], sv=ESTADO.ficha[id]=ESTADO.ficha[id]||{};
    Object.keys(pad).forEach(k=>{ if(pad[k] && (sv[k]===undefined||sv[k]==="")){ sv[k]=pad[k]; n++; } });
  });
  if(n) persist();
  return n;
}
/* quantos dados ainda dependem do codigo (0 = ja pode tirar do repositorio) */
function dadosSoNoCodigo(){
  let n=0;
  Object.keys(LINKS_PADRAO).forEach(id=>{ const ed=(ESTADO.clientes||{})[id]||{}, pad=LINKS_PADRAO[id];
    ["drive","insta","wpp"].forEach(k=>{ if(pad[k] && !ed[k]) n++; }); });
  Object.keys(FICHA_PADRAO).forEach(id=>{ const sv=(ESTADO.ficha||{})[id]||{}, pad=FICHA_PADRAO[id];
    Object.keys(pad).forEach(k=>{ if(pad[k] && !sv[k]) n++; }); });
  return n;
}
function fichaDe(c){
  const salva=(ESTADO.ficha&&ESTADO.ficha[c.id])||{}, pad=FICHA_PADRAO[c.id]||{};
  const f={}; FICHA_CAMPOS.forEach(k=>{ f[k[0]] = (salva[k[0]]!==undefined && salva[k[0]]!=="") ? salva[k[0]] : (pad[k[0]]||""); });
  return f;
}
/* ---- Plano do mes: o que prometemos, como vamos fazer e quanto esperamos ----
   Fica por cliente e por mes. O cliente le isso no portal dele antes do mes
   comecar, e no fim compara com o que realmente aconteceu. */
function planoDe(cid, ym){
  const p=((ESTADO.plano&&ESTADO.plano[cid])||{})[ym];
  return p ? {...p} : {estrategia:"", esperado:"", base:null};
}
function salvarPlano(cid, ym, dados){
  if(!ehAdmin()) return;
  snapshot();
  ESTADO.plano=ESTADO.plano||{};
  ESTADO.plano[cid]=ESTADO.plano[cid]||{};
  const limpo={ estrategia:(dados.estrategia||"").trim(),
                esperado:(dados.esperado||"").trim(),
                base:(dados.base===""||dados.base==null)?null:Number(dados.base) };
  if(!limpo.estrategia && !limpo.esperado && limpo.base==null) delete ESTADO.plano[cid][ym];
  else ESTADO.plano[cid][ym]=limpo;
  const c=cliente(cid);
  ESTADO.log.unshift({ts:new Date().toISOString(),cliente:cid,acao:"plano",
    nome:"Plano de "+mesExtenso(ym),data:ym+"-01",quem:USUARIO||null});
  ESTADO.log=ESTADO.log.slice(0,300);
  persist(); render();
  toast("Plano de "+mesExtenso(ym)+" salvo"+(c?" para "+c.nome:""),true);
}
function abrirPlano(cid, ym){
  if(!ehAdmin()) return;
  const c=cliente(cid); if(!c) return;
  ym = ym || mesAtualYM();
  const p=planoDe(cid, ym);
  const obj=objetivoDe(c), meta=metaDe(c);
  const rotObj=(OBJETIVOS.find(o=>o[0]===obj)||["","sem objetivo definido"])[1];
  const meses=[0,1,-1].map(k=>{
    const d0=new Date(HOJE.getFullYear(), HOJE.getMonth()-k, 1);
    return d0.getFullYear()+"-"+String(d0.getMonth()+1).padStart(2,"0");
  });
  const mm=$("modal");
  mm.innerHTML='<div class="mbox planobox"><h3>Plano de '+esc(mesExtenso(ym))+'</h3>'+
    '<p class="msub">'+esc(c.nome)+' \u00b7 objetivo <b>'+esc(rotObj)+'</b>'+
      (meta?' (meta '+numBR(meta)+')':'')+
      '. O cliente l\u00ea isso no portal dele.</p>'+
    '<div class="fd-chips">'+meses.map(m=>
      '<button class="fd-chip'+(m===ym?" on":"")+'" data-planomes="'+cid+'|'+m+'">'+esc(mesExtenso(m))+'</button>').join("")+'</div>'+
    '<label class="mlab">Estrat\u00e9gia do m\u00eas'+
      '<textarea id="plEstr" rows="5" placeholder="Como vamos chegar no objetivo. Ex.: tr\u00e1fego pago para o perfil, dois reels por semana com CTA de seguir, parceria com perfis locais.">'+esc(p.estrategia||"")+'</textarea></label>'+
    '<label class="mlab">Resultado esperado'+
      '<input id="plEsp" type="text" placeholder="Ex.: 100 seguidores novos no m\u00eas" value="'+escAttr(p.esperado||"")+'"></label>'+
    '<label class="mlab">Ponto de partida (n\u00famero no dia 1)'+
      '<input id="plBase" type="number" placeholder="Ex.: 2000" value="'+(p.base==null?"":p.base)+'">'+
      '<span class="mhint">Serve para o gr\u00e1fico de compara\u00e7\u00e3o no fim do m\u00eas. Se ficar vazio, o painel calcula pelo Reportei.</span></label>'+
    '<div class="mbtns"><button data-macao="salvarplano" data-mcid="'+escAttr(cid)+'" data-mym="'+ym+'">Salvar</button>'+
    '<button class="sec" data-macao="fechar">Fechar</button></div></div>';
  mostrarModal(true);
}
function fichaHTML(c){
  const f=fichaDe(c), tem=FICHA_CAMPOS.some(k=>f[k[0]]);
  if(!tem) return '<div class="vazio">Sem ficha da marca ainda. '+(ehAdmin()?'Clique em Editar ficha para preencher a partir da imersão.':'Peça para a administração preencher a partir da imersão.')+'</div>'+
    (ehAdmin()?'<div class="mbtns"><button data-ficha="'+escAttr(c.id)+'">Editar ficha</button></div>':'');
  return '<section class="ficha">'+
    '<div class="fh-topo"><b>Ficha da marca</b><span>o que a imersão deixou combinado</span>'+
      (ehAdmin()?'<button class="ubtn" data-ficha="'+escAttr(c.id)+'">Editar</button>':'')+'</div>'+
    '<div class="fh-grid">'+FICHA_CAMPOS.filter(k=>f[k[0]]).map(k=>
      '<div class="fh-c'+(k[0]==="evitar"?" nao":"")+(k[0]==="frase"?" destaque":"")+'">'+
        '<div class="fh-k">'+esc(k[1])+'</div><div class="fh-v">'+esc(f[k[0]])+'</div></div>').join("")+
    '</div></section>';
}
function abrirFicha(cid){
  if(!ehAdmin()) return;
  const c=cliente(cid); if(!c) return;
  const f=fichaDe(c);
  $("modal").innerHTML='<div class="mbox fichaform"><h3>Ficha da marca · '+esc(c.nome)+'</h3>'+
    '<p class="msub">Sai da imersão e serve na hora de escrever. Deixe em branco o que não se aplica.</p>'+
    FICHA_CAMPOS.map(k=>'<label class="mlab">'+esc(k[1])+
      '<textarea id="fh_'+k[0]+'" rows="2">'+esc(f[k[0]])+'</textarea></label>').join("")+
    '<div class="mbtns"><button data-macao="salvarficha" data-cliid="'+escAttr(c.id)+'">Salvar</button>'+
    '<button class="sec" data-macao="fechar">Cancelar</button></div></div>';
  mostrarModal(true);
}
function salvarFicha(cid){
  if(!ehAdmin()) return;
  snapshot(); ESTADO.ficha=ESTADO.ficha||{}; const o={};
  FICHA_CAMPOS.forEach(k=>{ const el=$("fh_"+k[0]); o[k[0]]=el?el.value.trim():""; });
  ESTADO.ficha[cid]=o; persist(); rebuild(); render(); toast("Ficha salva",true);
}

/* ---- rotina automática: quando os resultados foram atualizados ---- */
function statusRotinaHTML(){
  let ult=null;
  const R=ESTADO.resultados||{};
  for(const cid in R) for(const ym in R[cid]){ const a=R[cid][ym].atualizado; if(a && (!ult || a>ult)) ult=a; }
  if(!ult) return '';
  const d=dias(ult), n=Math.abs(d);
  const txt = d===0 ? "atualizados hoje" : (n===1 ? "atualizados ontem" : "atualizados há "+n+" dias");
  const cls = n<=1 ? "ok" : (n<=3 ? "morno" : "velho");
  return '<div class="rotina '+cls+'"><span class="rot-pt"></span>Resultados '+txt+
    (n>3?' · a rotina das 7h não rodou, os números podem estar velhos':'')+'</div>';
}
/* ================= ONBOARDING (as 14 etapas obrigatórias) ================= */
const ONBOARDING = [
  ["pasta","Estrutura de pastas do cliente"],
  ["planilha","Planilha de acessos com e-mail e senha"],
  ["acessos","Coletar os acessos das redes"],
  ["fotoMarca","Foto da marca salva como arquivo"],
  ["grupo","Grupo de WhatsApp criado"],
  ["boasvindas","Boas-vindas enviadas no grupo"],
  ["onboarding","Onboarding enviado no grupo (mensagem e PDF)"],
  ["prints","Prints das redes na chegada", true],
  ["reserva","Códigos de reserva 2FA", true],
  ["pesq2","Pesquisa de mercado e demanda", true],
  ["pesq1","Pesquisa de comportamento em redes", true],
  ["imersao","Reunião de imersão marcada e feita"],
  ["imersaoDoc","Documento da imersão tratado"],
  ["revisaoOnb","Revisão final, etapa por etapa"]
];
const CURTO = {prints:"prints de chegada", reserva:"códigos 2FA", pesq2:"pesquisa de mercado", pesq1:"pesquisa de comportamento"};
function onboardingDe(c){
  const ts=TODAS.filter(t=>t.clienteId===c.id);
  const itens=ONBOARDING.map(o=>{
    const t=ts.find(x=>x.id===o[0]);
    return t ? {id:o[0], rot:o[1], critico:!!o[2], feita:t.st.k==="ok", data:t.data, st:t.st.k} : null;
  }).filter(Boolean);
  const feitas=itens.filter(i=>i.feita).length;
  const criticas=itens.filter(i=>i.critico && !i.feita);
  return {itens:itens, feitas:feitas, total:itens.length, criticas:criticas,
          completo: itens.length>0 && feitas===itens.length};
}
/* onboarding e trabalho do marketing: so aparece na Visao geral e no Mkt Digital, para quem ve marketing */
const mostraOnboarding = () => (VISTA.area==="all"||VISTA.area==="mkt") && podeArea("mkt");
/* contrato e mensalidade sao do administrativo: Visao geral e Financeiro, para quem ve financeiro */
const mostraFinanceiro = () => (VISTA.area==="all"||VISTA.area==="fin") && podeArea("fin");
function onbBadgeHTML(c){
  if(!mostraOnboarding()) return '';
  const o=onboardingDe(c); if(!o.total) return '';

  const pct=Math.round(o.feitas/o.total*100);
  return '<div class="onb'+(o.completo?" ok":(o.criticas.length?" crit":""))+'">'+
    '<div class="onb-t">'+(o.completo?"Onboarding completo":"Onboarding")+'<b>'+o.feitas+'/'+o.total+'</b></div>'+
    '<div class="onb-bar"><i style="width:0" data-larg="'+pct+'"></i></div>'+
    (o.criticas.length?'<div class="onb-c">Falta: '+o.criticas.map(i=>esc(CURTO[i.id]||i.rot)).join(", ")+'</div>':'')+
  '</div>';
}
function onboardingHTML(c){
  if(!mostraOnboarding()) return '';
  const o=onboardingDe(c); if(!o.total) return '';
  return '<section class="onb-box'+(o.completo?" ok":"")+'">'+
    '<div class="onb-h"><b>Onboarding</b><span>'+o.feitas+' de '+o.total+' etapas</span>'+
      (o.criticas.length?'<i class="onb-al">'+o.criticas.length+' obrigatória'+(o.criticas.length>1?'s':'')+' em aberto</i>':'')+'</div>'+
    '<div class="onb-lista">'+o.itens.map(i=>
      '<div class="onb-i'+(i.feita?" feita":"")+(i.critico?" critico":"")+'">'+
        '<span class="onb-ck">'+(i.feita?"&#10003;":"")+'</span>'+
        '<span class="onb-r">'+esc(i.rot)+(i.critico?'<em>obrigatória</em>':'')+'</span>'+
        '<span class="onb-d">'+(i.data?fmt(i.data):"sem data")+'</span>'+
      '</div>').join("")+'</div>'+
    (o.completo?'<div class="onb-fim">Tudo conferido. Cliente pronto para o ciclo normal.</div>':'')+
  '</section>';
}
/* ================= FUNCIONÁRIOS (carga por pessoa) ================= */
function pessoasVisiveis(){ return (ESTADO.pessoas||[]).slice(); }
function areasDaPessoa(p){ return p.admin ? ["all"] : ((p.areas||[]).filter(a=>a!=="all")); }
function tarefasDe(nome){
  const p=pessoaPorNome(nome); if(!p) return [];
  return TODAS.filter(t=>{
    if(t.fase==="Demanda") return t.resp===nome;      /* demanda tem dono com nome */
    if(p.admin) return false;                          /* admin só conta o que tem o nome dele */
    return (p.areas||[]).some(a=>naArea(t,a));
  });
}
function cargaSemana(ts){
  const ini=segOf(iso(HOJE)), dias=[0,1,2,3,4].map(i=>addD(ini,i));
  return dias.map(d=>({dia:d, n:ts.filter(t=>t.data===d && t.st.k!=="ok").length}));
}
function funcionariosHTML(){
  if(!ehAdmin()) return '<div class="vazio">Só a administração vê esta tela.</div>';
  const ROT={all:"todas as áreas",...AREA_ROT};
  const pes=pessoasVisiveis();
  const cartoes=pes.map((p,i)=>{
    const ts=tarefasDe(p.nome);
    const n=k=>ts.filter(t=>t.st.k===k).length;
    const atras=n("atrasado"), hoje=n("hoje"), parciais=n("parcial");
    const semana=ts.filter(t=>["umdia","semana"].indexOf(t.st.k)>=0).length;
    const ym=iso(HOJE).slice(0,7);
    const feitas=ts.filter(t=>t.st.k==="ok" && t.dataConclusao && String(t.dataConclusao).slice(0,7)===ym).length;
    const sem=cargaSemana(ts), pico=Math.max(1,...sem.map(x=>x.n));
    const prox=ts.filter(t=>t.st.k!=="ok" && t.data).sort((a,b)=>String(a.data).localeCompare(String(b.data)))[0];
    const DOW=["Seg","Ter","Qua","Qui","Sex"];
    const alerta = atras>0 ? "risco" : (sem.some(x=>x.n>=5) ? "cheio" : "");
    return '<div class="fcard '+alerta+'" style="animation-delay:'+(i*70)+'ms">'+
      '<div class="fc-topo">'+faceDe(p.nome)+
        '<div class="fc-id"><b>'+esc(p.nome)+'</b><i>'+esc(areasDaPessoa(p).map(a=>ROT[a]||a).join(" · ")||"sem área")+
        (p.admin?' · administração':'')+'</i></div>'+
        (atras>0?'<span class="fc-tag">'+atras+' atrasada'+(atras>1?'s':'')+'</span>':'')+
        (parciais>0?'<span class="fc-tag parc">'+parciais+' parcial'+(parciais>1?'is':'')+'</span>':'')+
      '</div>'+
      '<div class="fc-nums">'+
        '<div class="fc-n atrasado"><span data-num="'+atras+'">0</span><i>atrasado</i></div>'+
        '<div class="fc-n hoje"><span data-num="'+hoje+'">0</span><i>vence hoje</i></div>'+
        '<div class="fc-n semana"><span data-num="'+semana+'">0</span><i>próx. 7 dias</i></div>'+
        '<div class="fc-n ok"><span data-num="'+feitas+'">0</span><i>feitas no mês</i></div>'+
      '</div>'+
      '<div class="fc-sem"><div class="fc-h">Carga da semana</div><div class="fc-barras">'+
        sem.map((x,j)=>'<div class="fc-b'+(x.dia===iso(HOJE)?" hj":"")+(x.n>=5?" alto":"")+'">'+
          '<i style="height:0" data-alt="'+Math.round(x.n/pico*100)+'"></i>'+
          '<b>'+(x.n||"")+'</b><span>'+DOW[j]+'</span></div>').join("")+
      '</div></div>'+
      (prox?'<div class="fc-prox">Próxima: <b>'+esc(prox.tarefa)+'</b> · '+esc(prox.cliente||"")+' · '+fmt(prox.data)+'</div>'
           :'<div class="fc-prox vazio">Nada na fila.</div>')+
    '</div>';
  }).join("");
  const semDono=["mkt","fin","com"].filter(a=>!(ESTADO.pessoas||[]).some(p=>!p.admin && (p.areas||[]).indexOf(a)>=0));
  return '<div class="fgrid">'+cartoes+'</div>'+
    (semDono.length?'<div class="db-obs">Sem ninguém responsável: '+semDono.map(a=>ROT[a]).join(", ")+
      '. Defina em Equipe para a carga aparecer aqui.</div>':'');
}

/* ================= RECADO DO DIA ================= */
function recadoTexto(){
  const ts=TODAS.filter(t=>t.st.k!=="ok");
  const cli=t=>t.cliente||"";
  const donoDe=t=>{
    if(t.fase==="Demanda") return t.resp||"";
    if(t.resp==="Cliente") return "cliente";
    const p=(ESTADO.pessoas||[]).find(x=>!x.admin && (x.areas||[]).some(a=>naArea(t,a)));
    return p?p.nome:"";
  };
  const linha=t=>{ const d=donoDe(t); return "- "+cli(t)+": "+t.tarefa+(d?" ("+d+")":""); };
  const LIM=8;
  const bloco=(tit,arr,fn)=>{ if(!arr.length) return "";
    const cabe=arr.slice(0,LIM), resto=arr.length-cabe.length;
    return "\n"+tit+" ("+arr.length+")\n"+cabe.map(fn).join("\n")+(resto>0?"\n- e mais "+resto:"")+"\n"; };
  const atras=ts.filter(t=>t.st.k==="atrasado").sort((a,b)=>String(a.data).localeCompare(String(b.data)));
  const parc=ts.filter(t=>t.st.k==="parcial").sort((a,b)=>String(a.st.resto||"").localeCompare(String(b.st.resto||"")));
  const hoje=ts.filter(t=>t.st.k==="hoje");
  const amanha=ts.filter(t=>t.st.k==="umdia");
  const cobrar=ts.filter(t=>t.resp==="Cliente" && ["atrasado","parcial","hoje","umdia"].indexOf(t.st.k)>=0);
  const dia=HOJE.toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"2-digit"});
  let s="MK3 - "+dia.charAt(0).toUpperCase()+dia.slice(1)+"\n";
  s+=bloco("ATRASADO", atras, t=>linha(t)+" - venceu "+fmt(t.data));
  s+=bloco("FEITO PELA METADE", parc, t=>linha(t)+" - resto em "+fmt(t.st.resto));
  s+=bloco("VENCE HOJE", hoje, linha);
  s+=bloco("AMANHÃ", amanha, linha);
  s+=bloco("COBRAR O CLIENTE", cobrar, t=>"- "+cli(t)+": "+t.tarefa+" - prazo "+fmt(t.data));
  if(!atras.length && !parc.length && !hoje.length && !amanha.length){ s+="\nNada vencendo hoje nem amanha. Dia livre para adiantar o que vem.\n"; }
  return s.trim();
}
function abrirRecado(){
  if(!ehAdmin()) return;
  const txt=recadoTexto();
  const mm=$("modal");
  mm.innerHTML='<div class="mbox recado"><h3>Recado do dia</h3>'+
    '<p class="msub">Texto pronto para colar no grupo. Gerado agora, com o que está no painel.</p>'+
    '<pre class="rec-txt" id="recTxt">'+esc(txt)+'</pre>'+
    '<div class="mbtns"><button data-macao="copiarrecado">Copiar texto</button>'+
    '<button class="sec" data-macao="fechar">Fechar</button></div></div>';
  mostrarModal(true);
}
/* o que cada numero do dashboard quer dizer (aparece ao passar o mouse) */
const KPI_DICA={
  atrasado:"Passou da data e ainda não foi marcado como feito",
  replan:"Foi replanejado e venceu de novo",
  parcial:"Feito em parte: falta terminar",
  hoje:"Vence hoje",
  umdia:"Vence amanhã",
  semana:"Vence nos próximos 7 dias",
  sem:"Etapas de ciclos futuros que ainda dependem de uma data real (envio, aprovação, gravação). Ganham data quando o ciclo anterior anda.",
  ok:"Concluídas"
};
function dashboardHTML(completo){
  const ts=tarefasArea();
  const n=k=>ts.filter(t=>t.st.k===k).length;
  const cards=BUCKETS.map((k,i)=>
    '<button class="kpi '+k+' '+(VISTA.filtro===k?"on":"")+'" data-bucket="'+k+'" style="animation-delay:'+(i*45)+'ms"'+
      (KPI_DICA[k]?' data-tt="'+escAttr(KPI_DICA[k])+'"':'')+'>'+
      '<b data-num="'+n(k)+'">0</b><small>'+ROTULO[k]+'</small></button>').join("");

  const esper=(VISTA.escopo?[cliente(VISTA.escopo)]:CLIENTES).flatMap(contadores);
  const espHtml = esper.length
    ? esper.sort((a,b)=>String(a.vencimento).localeCompare(String(b.vencimento))).slice(0,4).map(x=>{
        const d0=dias(x.vencimento);
        const cls=d0<0?"atrasado":d0===0?"hoje":d0===1?"umdia":"semana";
        return '<div class="db-li"><span class="db-p '+cls+'"></span>'+
          '<span class="db-t">'+esc(x.cliente)+' <i>'+esc(x.tipo)+'</i></span>'+
          '<span class="db-v">'+(d0<0?"aprovou sozinho":d0===0?"hoje":d0===1?"amanhã":"em "+d0+" dias")+'</span></div>';
      }).join("")
    : '<div class="db-vazio">Nada na mão do cliente.</div>';

  const hoje=iso(HOJE);
  const prox=[];
  for(let i=0;i<7;i++){ const d0=addD(hoje,i);
    prox.push({d:d0, n:ts.filter(t=>t.data===d0 && t.st.k!=="ok").length}); }
  const topo=Math.max(1,...prox.map(p=>p.n));
  const proxHtml='<div class="db-sem">'+prox.map(p=>{
    const dw=d(p.d).toLocaleDateString("pt-BR",{weekday:"short"}).replace(".","");
    return '<div class="db-col'+(p.d===hoje?" hj":"")+'" title="'+fmt(p.d)+': '+p.n+'">'+
      '<span class="db-bar" style="height:0" data-alt="'+Math.round(p.n/topo*100)+'"></span>'+
      '<i>'+(p.n||"")+'</i><span class="db-dw">'+dw+'</span></div>';
  }).join("")+'</div>';

  const mesAtual=iso(HOJE).slice(0,7);
  const H=(typeof atrasosHistoricos==="function"?atrasosHistoricos():[]).filter(a=>a.mes===mesAtual&&!a.justificado);
  const mk3=H.filter(a=>a.quem==="MK3").reduce((s,a)=>s+a.dias,0);
  const cli=H.filter(a=>a.quem==="Cliente").reduce((s,a)=>s+a.dias,0);

  /* anel de progresso do mês */
  const doMes=ts.filter(t=>t.data && t.data.slice(0,7)===iso(HOJE).slice(0,7));
  const feitasMes=doMes.filter(t=>t.st.k==="ok").length;
  const pct=doMes.length?Math.round(feitasMes/doMes.length*100):0;
  const R=42, C=2*Math.PI*R;
  const anel='<div class="db-anel"><svg viewBox="0 0 110 110" aria-hidden="true">'+
      '<circle cx="55" cy="55" r="'+R+'" class="an-bg"/>'+
      '<circle cx="55" cy="55" r="'+R+'" class="an-fg" style="stroke-dasharray:'+C+';stroke-dashoffset:'+C+'" data-arco="'+(C-(C*pct/100))+'"/>'+
    '</svg><div class="an-txt"><b data-num="'+pct+'">0</b><span>%</span><i>do mês concluído</i>'+
      '<i class="an-sub">'+feitasMes+' de '+doMes.length+' tarefas com prazo em '+esc(HOJE.toLocaleDateString("pt-BR",{month:"long"}))+'</i></div></div>';

  /* o que fazer agora: 3 mais críticos */
  const criticos=ts.filter(t=>t.st.k!=="ok" && t.data)
    .sort((a,b)=>ORDEM[a.st.k]-ORDEM[b.st.k]||String(a.data).localeCompare(String(b.data))).slice(0,3);
  const agoraHtml=criticos.length
    ? criticos.map((t,i)=>'<button class="db-ag editavel" data-editar="1" data-mcid="'+t.clienteId+'" data-mtid="'+escAttr(t.id)+'" style="animation-delay:'+(i*70)+'ms">'+
        tagHTML(t)+'<span class="db-agt">'+esc(EXEC[baseId(t.id)]||t.tarefa)+' <i>'+esc(t.cliente)+'</i></span>'+
        '<span class="db-agr">'+esc(t.resp)+'</span></button>').join("")
    : '<div class="db-vazio">Nada crítico agora.</div>';

  return '<div class="dash'+(completo?" full":"")+'">'+
    (completo?statusRotinaHTML():'')+
    (completo?'<div class="db-topo">'+anel+'<div class="db-agora"><div class="db-h">O que fazer agora</div>'+agoraHtml+'</div></div>':'')+
    '<div class="kpis">'+cards+'</div>'+
    '<div class="db-linha">'+
      '<div class="db-cx"><div class="db-h">Esperando o cliente</div>'+espHtml+'</div>'+
      '<div class="db-cx"><div class="db-h">Próximos 7 dias</div>'+proxHtml+'</div>'+
      '<div class="db-cx"><div class="db-h">Atraso do mês</div>'+
        '<div class="db-pl"><span class="db-pn mk3" data-tt="Soma dos dias úteis de atraso deste mês em etapas que dependem da MK3 (criar, enviar, gravar...)"><b>'+mk3+'</b>MK3</span>'+
        '<span class="db-pn cli" data-tt="Soma dos dias úteis que o cliente passou do prazo de 2 dias úteis para aprovar ou enviar material"><b>'+cli+'</b>Cliente</span></div>'+
        '<div class="db-obs">dias úteis de atraso somados neste mês. Fim de semana e feriado não contam.</div></div>'+
    '</div>'+
    (completo?proximosAgendaHTML():'')+
    (completo?resultadosPainelHTML():'')+
    (completo?(function(){
      const porCli={};
      ts.filter(t=>t.st.k==="atrasado").forEach(t=>{ porCli[t.cliente]=(porCli[t.cliente]||0)+1; });
      const r=Object.entries(porCli).sort((a,b)=>b[1]-a[1]);
      if(!r.length) return '';
      const tp=Math.max(1,r[0][1]);
      return '<div class="db-cx"><div class="db-h">Atrasos abertos por cliente</div>'+
        r.map(([nome,q],i)=>'<div class="db-rk" style="animation-delay:'+(i*60)+'ms"><span class="db-rn">'+esc(nome)+'</span>'+
          '<span class="db-rb"><i style="width:0" data-larg="'+Math.round(q/tp*100)+'"></i></span>'+
          '<span class="db-rv" data-num="'+q+'">0</span></div>').join("")+'</div>';
    })():'')+
  '</div>';
}
function listaGlobalHTML(){
  const ts = tarefasArea();
  const semaf = dashboardHTML(true);
  const lista = (VISTA.filtro ? ts.filter(t=>t.st.k===VISTA.filtro) : ts.filter(t=>t.st.k!=="ok"))
    .sort((a,b)=>ORDEM[a.st.k]-ORDEM[b.st.k] || String(a.data).localeCompare(String(b.data)));
  return semaf +
    '<h2>'+(VISTA.filtro?ROTULO[VISTA.filtro]:"Pendências")+' · todos os clientes</h2>'+
    (lista.length ? '<div class="fila">'+lista.slice(0,VISTA.verTudo?999:7).map(t=>linha(t,true)).join("")+'</div>'+
        (!VISTA.verTudo && lista.length>7 ? '<button class="vermais" data-vertudo="1">Ver todas as '+lista.length+'</button>' : '')
      : vazioHTML(VISTA.filtro));
}

