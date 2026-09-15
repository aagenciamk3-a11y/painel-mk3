/* ═══════════════════════════════════════════════════════════════════
   COMERCIAL — funil de vendas da MK3.

   Por que este arquivo existe separado do motor.js:
   1. O motor ja tem 3.800 linhas. Nao deve virar 4.800.
   2. E principalmente: a base de leads NAO pode morar no ESTADO.
      O ESTADO inteiro e publicado em painel/estado, que hoje qualquer
      um le. Lead e nome, telefone e faturamento de gente que nem
      cliente e, e que nao autorizou nada. Entao o funil vive em
      painel/comercial, atras de login do Google, e so quem esta na
      lista de e-mails autorizados enxerga.

   O contrato dos campos e o 01_modelo_de_dados.md do project
   "MK3 | Comercial". Campo que nao esta la nao existe.
   ═══════════════════════════════════════════════════════════════════ */

/* o estado do comercial e separado de proposito: nunca entra no ESTADO */
let COM = { leads:{}, log:[] };
let COM_LOGADO = null;      /* e-mail de quem entrou, ou null */
let COM_PRONTO = false;     /* ja leu do banco pelo menos uma vez */
let COM_NEGADO = false;     /* logou, mas o e-mail nao esta autorizado */

/* ---------------- ETAPAS ----------------
   Cinco, nao mais. Cada uma com gatilho de saida verificavel: a etapa
   so avanca quando aconteceu algo que da para conferir no proprio
   registro. Sem isso, lead apodrece em "em negociacao" e a conversao
   por etapa vira ficcao. */
const ETAPAS_COM = [
  {k:"novo",      rot:"Novo",               prob:0.05, sai:"alguem tentou o primeiro contato"},
  {k:"contatado", rot:"Contatado",          prob:0.15, sai:"o lead respondeu"},
  {k:"diag",      rot:"Diagnóstico feito",  prob:0.35, sai:"as 5 perguntas foram respondidas"},
  {k:"proposta",  rot:"Proposta enviada",   prob:0.60, sai:"a proposta saiu, com valor e pacote"},
  {k:"fechado",   rot:"Fechado",            prob:1.00, sai:"virou cliente ou virou perda, com motivo"}
];
const etapaCom   = k => ETAPAS_COM.find(e=>e.k===k) || ETAPAS_COM[0];
const probEtapa  = k => etapaCom(k).prob;
const ordemEtapa = k => ETAPAS_COM.findIndex(e=>e.k===k);

/* ---------------- LISTAS FECHADAS ----------------
   Valor fora da lista e erro de digitacao. Por isso tudo e <select>. */
const LC = {
  decisor:  ["Sim","Não","Não sei"],
  cargo:    ["Dono/Sócio","Diretor","Gerente de Marketing","Gerente Comercial",
             "Coordenador","Assistente","Outro"],
  origem:   ["Indicação","Instagram orgânico","Meta Ads","Google Ads","Busca Google",
             "Site/Formulário","Prospecção ativa","Evento/Networking","Carteira antiga (reativação)"],
  segmento: ["Escola particular","Educação infantil","Curso/Idiomas","Imobiliária/Corretor",
             "Indústria/Engenharia","Comércio local","Moda/Varejo","Saúde/Clínica",
             "Serviços B2B","Tecnologia","Outro"],
  porte:    ["Micro","Pequeno","Médio","Médio-Grande"],
  prazo:    ["Imediato (até 30 dias)","1 a 3 meses","3 a 6 meses","Sem prazo definido"],
  pacote:   ["Essencial","Crescimento","Expansão","Premium","Projeto avulso","Sob medida"],
  reuniao:  ["Ainda vai acontecer","Realizada","No-show","Remarcada","Cancelada"],
  /* "Preço" nao entra. Preco e sintoma de valor nao construido ou de
     conversa com quem nao decide. Por isso a frase e obrigatoria. */
  perda:    ["Sem dor real","Sem verba de fato","Decisor nunca entrou na conversa",
             "Timing (obra, safra, matrícula)","Escolheu concorrente",
             "Vai fazer internamente ou com freelancer","Sumiu / parou de responder",
             "Desqualificado por nós"]
};

/* multiplicador de preco por porte do cliente (manual de precos v2) */
const MULT_PORTE = {"Micro":0.8,"Pequeno":1.0,"Médio":1.2,"Médio-Grande":1.5};

/* ---------------- CALCULOS ---------------- */

/* Score CHAMP, 0 a 4. Um ponto para cada sinal que muda a chance de
   fechar. Calculado, nunca digitado. */
function scoreCHAMP(l){
  if(!l) return 0;
  let s=0;
  if(String(l.desafio||"").trim().length>=10) s++;          /* dor concreta, nao "quer vender mais" */
  if(l.decisor==="Sim" || (Number(l.envolvidos)>=2 && l.decisor!=="Não sei")) s++;
  if(Number(l.investe_hoje)>0) s++;
  if(l.prazo==="Imediato (até 30 dias)" || l.prazo==="1 a 3 meses") s++;
  return s;
}

/* Tempo ate o primeiro contato, em minutos. E a metrica que mais muda
   resultado na semana: 5 min contra 30 muda a chance de contato em
   100x (MIT/InsideSales). Sem primeiro contato, devolve null. */
/* Atencao: `entrada` e so a data. Para medir minutos a gente precisa da
   HORA em que o lead chegou, que fica em `entradaEm`, gravada na criacao.
   Lead importado de planilha antiga nao tem isso, e ai a resposta certa
   e "nao sei" e nao um numero contado a partir da meia-noite. */
function minutosAteContato(l){
  if(!l || !l.entradaEm || !l.primeiro_contato) return null;
  const a=new Date(l.entradaEm).getTime(), b=new Date(l.primeiro_contato).getTime();
  if(isNaN(a)||isNaN(b)) return null;
  return Math.max(0, Math.round((b-a)/60000));
}
/* ha quanto tempo esse lead esta esperando alguem falar com ele */
function minutosEsperando(l, agora){
  if(!l || !l.entradaEm || l.primeiro_contato) return null;
  const a=new Date(l.entradaEm).getTime(), b=(agora||new Date()).getTime();
  if(isNaN(a)) return null;
  return Math.max(0, Math.round((b-a)/60000));
}

/* Pipeline ponderado. Nunca mostrar soma crua: infla e vira mentira
   confortavel. Fechado ganho conta 100%, fechado perdido conta 0. */
function pipelinePonderado(lista){
  return (lista||[]).reduce((soma,l)=>{
    const v=Number(l.valor_mensal)||0;
    if(l.etapa==="fechado") return soma + (l.desfecho==="ganho" ? v : 0);
    return soma + v*probEtapa(l.etapa);
  },0);
}

/* Gatilho de saida: o registro comprova que a etapa terminou? */
function podeSair(l, destino){
  if(!l) return {ok:false, falta:"lead não encontrado"};
  const de=ordemEtapa(l.etapa), para=ordemEtapa(destino);
  if(para<=de) return {ok:true};                       /* voltar atras e sempre permitido */
  const exige = {
    contatado: [!!l.primeiro_contato, "registrar a data do primeiro contato"],
    diag:      [scoreCHAMP(l)>0 && !!String(l.desafio||"").trim(), "responder o diagnóstico (desafio, pelo menos)"],
    proposta:  [!!l.pacote && Number(l.valor_mensal)>0, "escolher o pacote e o valor mensal"],
    fechado:   [!!l.desfecho, "dizer se foi ganho ou perdido"]
  };
  /* pular etapa exige tudo o que ficou pelo caminho */
  for(let i=de+1;i<=para;i++){
    const k=ETAPAS_COM[i].k, r=exige[k];
    if(r && !r[0]) return {ok:false, falta:r[1], etapa:k};
  }
  if(destino==="fechado" && l.desfecho==="perdido"){
    if(!l.motivo_perda) return {ok:false, falta:"escolher o motivo da perda"};
    if(String(l.motivo_frase||"").trim().length<10)
      return {ok:false, falta:"escrever em uma frase o que realmente aconteceu"};
  }
  return {ok:true};
}

/* telefone em um formato so, como no portal */
function telCom(t){
  let n=String(t||"").replace(/\D/g,"");
  if(n.length>=12 && n.slice(0,2)==="55") n=n.slice(2);
  if(n.length===10) n=n.slice(0,2)+"9"+n.slice(2);
  return n.length===11 ? n : "";
}
function telComBonito(t){
  const n=telCom(t);
  return n ? "("+n.slice(0,2)+") "+n.slice(2,7)+"-"+n.slice(7) : (String(t||"")||"sem telefone");
}

/* ---------------- ACESSO AOS DADOS ---------------- */
const listaCom = () => Object.keys(COM.leads||{})
  .map(k=>({...COM.leads[k], id:k}))
  .filter(l=>l && !l.arquivado);
const leadCom = id => (COM.leads||{})[id] ? {...COM.leads[id], id:id} : null;
const daEtapa = k => listaCom().filter(l=>l.etapa===k);

/* quem esta com o lead hoje; vazio = ninguem pegou */
function respCom(l){ return (l&&l.responsavel) || ""; }

/* ---------------- SINAIS DO CARTAO ----------------
   Cada sinal existe porque muda a acao de quem olha. Nada e decorativo. */
function sinaisCom(l, agora){
  const hoje=iso(agora||HOJE), s=[];
  if(l.etapa!=="fechado"){
    if(l.proximo_followup && l.proximo_followup<hoje)
      s.push({k:"atrasado", txt:"follow-up venceu em "+fmt(l.proximo_followup), ico:"&#9650;"});
    const esp=minutosEsperando(l, agora?new Date(agora):new Date());
    if(esp!=null && esp>60)
      s.push({k:"espera", txt:"esperando ha "+(esp<120?esp+" min":Math.round(esp/60)+"h")+" sem ninguem falar", ico:"&#9201;"});
    /* sem decisor na conversa o negocio e 233% menos provavel de fechar (Gong) */
    if(l.decisor==="Não")
      s.push({k:"semdecisor", txt:"quem decide ainda nao entrou na conversa", ico:"&#128274;"});
  }
  return s;
}
function estrelasCom(n){
  let h='<span class="cm-est" title="Diagnóstico: '+n+' de 4">';
  for(let i=1;i<=4;i++) h+= (i<=n?"&#9733;":"&#9734;");
  return h+'</span>';
}

/* mensagem de WhatsApp que muda conforme a etapa: o que faz sentido
   dizer para quem acabou de chegar nao e o que se diz para quem ja
   recebeu proposta. */
function zapCom(l){
  const n=telCom(l.whatsapp); if(!n) return "";
  const eu=primeiroNomeCom(USUARIO||"");
  const quem=primeiroNomeCom(l.contato||"");
  const ola=(quem?"Oi, "+quem+"! ":"Oi! ")+(eu?"Aqui é o "+eu+", da MK3. ":"");
  let t;
  if(l.etapa==="novo")           t=ola+"Vi seu contato aqui. Você tem cinco minutos hoje para eu entender o que a "+(l.empresa||"sua empresa")+" está precisando?";
  else if(l.etapa==="contatado") t=ola+"Voltando na nossa conversa. Consigo te mostrar em 20 minutos como a gente resolveria isso. Que dia dessa semana funciona?";
  else if(l.etapa==="diag")      t=ola+"Terminei de montar a proposta com o que conversamos. Posso te mandar por aqui?";
  else if(l.etapa==="proposta")  t=ola+"Conseguiu dar uma olhada na proposta? Se tiver qualquer dúvida eu explico por aqui mesmo.";
  else                           t=ola+"Tudo certo por aí?";
  return "https://wa.me/55"+n+"?text="+encodeURIComponent(t);
}
function primeiroNomeCom(n){
  const p=String(n||"").trim().split(/\s+/)[0]||"";
  return p ? p.charAt(0).toUpperCase()+p.slice(1).toLowerCase() : "";
}

/* ---------------- CARTAO ---------------- */
function cardCom(l){
  const sc=scoreCHAMP(l), sin=sinaisCom(l), zap=zapCom(l);
  const alerta=sin.find(x=>x.k==="atrasado")?" alerta":"";
  return '<div class="cm-card'+alerta+'" draggable="true" data-cmlead="'+escAttr(l.id)+'">'+
    '<div class="cm-emp">'+esc(l.empresa||"sem nome")+'</div>'+
    '<div class="cm-quem">'+esc(l.contato||"—")+(l.cargo?' <i>'+esc(l.cargo)+'</i>':'')+'</div>'+
    '<div class="cm-tags">'+
      (l.pacote?'<span class="cm-tag pac">'+esc(l.pacote)+'</span>':'')+
      (l.porte?'<span class="cm-tag por">'+esc(l.porte)+'</span>':'')+
      (Number(l.valor_mensal)>0?'<span class="cm-tag val">R$ '+numBR(l.valor_mensal)+'/mês</span>':'')+
    '</div>'+
    '<div class="cm-rodape">'+estrelasCom(sc)+
      (respCom(l)?'<span class="cm-resp" title="'+escAttr(respCom(l))+'">'+esc(respCom(l).slice(0,1))+'</span>'
                 :'<span class="cm-resp vago" title="ninguém pegou este lead">?</span>')+
    '</div>'+
    (sin.length?'<div class="cm-sinais">'+sin.map(s=>
      '<span class="cm-sin s-'+s.k+'">'+s.ico+' '+esc(s.txt)+'</span>').join("")+'</div>':'')+
    (zap?'<a class="cm-zap" href="'+escAttr(zap)+'" target="_blank" rel="noopener" data-cmzap="1">WhatsApp</a>':'')+
  '</div>';
}

/* ---------------- QUADRO ---------------- */
function funilHTML(){
  if(!COM_LOGADO) return loginComHTML();
  if(COM_NEGADO) return '<section class="bloco cm-login"><h2>Acesso negado</h2>'+
    '<p>Você entrou como <b>'+esc(COM_LOGADO)+'</b>, e esse e-mail não está na lista '+
    'de quem pode ver a base de leads. Peça ao Guilherme para incluir, ou entre com outra conta.</p>'+
    '<button class="cm-entrar" data-cmsair="1">Entrar com outra conta</button></section>';
  if(!COM_PRONTO) return '<section class="bloco"><h2>Funil</h2><p>Carregando a base…</p></section>';
  const todos=listaCom();
  const abertos=todos.filter(l=>l.etapa!=="fechado");
  const colunas=ETAPAS_COM.map(e=>{
    const ls=daEtapa(e.k).sort((a,b)=>{
      const fa=a.proximo_followup||"9999", fb=b.proximo_followup||"9999";
      return fa.localeCompare(fb);
    });
    const soma=pipelinePonderado(ls);
    return '<div class="cm-col" data-cmcol="'+e.k+'">'+
      '<div class="cm-colh"><b>'+esc(e.rot)+'</b>'+
        '<span class="cm-n">'+ls.length+'</span>'+
        (soma>0?'<span class="cm-soma">R$ '+numBR(Math.round(soma))+'</span>':'')+
      '</div>'+
      '<div class="cm-lista">'+(ls.length?ls.map(cardCom).join("")
        :'<div class="cm-vazio">Solte um cartão aqui</div>')+'</div>'+
      '<div class="cm-sai">sai quando '+esc(e.sai)+'</div>'+
    '</div>';
  }).join("");

  const semContato=abertos.filter(l=>!l.primeiro_contato);
  const vencidos=abertos.filter(l=>l.proximo_followup && l.proximo_followup<iso(HOJE));
  const avisos=[];
  if(semContato.length) avisos.push('<span class="cm-av urg">'+semContato.length+
    (semContato.length>1?' leads esperando':' lead esperando')+' o primeiro contato</span>');
  if(vencidos.length) avisos.push('<span class="cm-av">'+vencidos.length+
    ' com follow-up vencido</span>');

  return '<div class="cm-topo">'+
      '<div class="cm-tit"><h2>Funil</h2>'+
        '<span class="cm-pipe">R$ '+numBR(Math.round(pipelinePonderado(abertos)))+
        ' <i>pipeline ponderado</i></span></div>'+
      '<div class="cm-acoes">'+avisos.join("")+
        '<button class="cm-novo" data-cmnovo="1">+ Novo lead</button>'+
        '<span class="cm-eu">'+esc(COM_LOGADO)+'</span></div>'+
    '</div>'+
    '<div class="cm-quadro">'+colunas+'</div>'+
    (todos.length?'':'<p class="cm-dica">A base está vazia. Clique em <b>+ Novo lead</b> para começar, '+
      'ou me peça para importar a planilha que já existe.</p>');
}

/* ---------------- FICHA DO LEAD ----------------
   Tres blocos, na ordem em que a conversa acontece: quem e, o que
   doi, e quanto custa resolver. */
function selCom(id, lista, valor, vazio){
  return '<select id="'+id+'"><option value="">'+(vazio||"—")+'</option>'+
    lista.map(v=>'<option'+(v===valor?' selected':'')+'>'+esc(v)+'</option>').join("")+'</select>';
}
function campoCom(rot, dentro, dica){
  return '<label class="mlab">'+esc(rot)+dentro+(dica?'<span class="mhint">'+esc(dica)+'</span>':'')+'</label>';
}
function abrirLeadCom(id){
  const l = id ? leadCom(id) : {etapa:"novo", entrada:iso(HOJE), responsavel:USUARIO||""};
  if(id && !l){ toast("Lead não encontrado",false); return; }
  const novo=!id, sc=scoreCHAMP(l), min=minutosAteContato(l);
  const pessoas=(ESTADO.pessoas||[]).filter(p=>(p.areas||[]).indexOf("com")>=0||(p.areas||[]).indexOf("all")>=0).map(p=>p.nome);
  const mm=$("modal");
  mm.innerHTML='<div class="mbox cmficha"><h3>'+(novo?"Novo lead":esc(l.empresa||"Lead"))+'</h3>'+

    '<div class="cm-sec">Quem é</div>'+
    '<div class="cm-grade">'+
      campoCom("Empresa",'<input type="text" id="cmEmpresa" value="'+escAttr(l.empresa||"")+'" data-focar>')+
      campoCom("Contato",'<input type="text" id="cmContato" value="'+escAttr(l.contato||"")+'">')+
      campoCom("Cargo", selCom("cmCargo", LC.cargo, l.cargo))+
      campoCom("É quem decide?", selCom("cmDecisor", LC.decisor, l.decisor),
        "A pergunta certa não é “você decide?”, é “além de você, quem mais assina?”")+
      campoCom("WhatsApp",'<input type="text" id="cmZap" value="'+escAttr(l.whatsapp||"")+'" placeholder="(27) 99999-0000">')+
      campoCom("E-mail",'<input type="text" id="cmEmail" value="'+escAttr(l.email||"")+'">')+
      campoCom("Origem", selCom("cmOrigem", LC.origem, l.origem))+
      campoCom("Segmento", selCom("cmSegmento", LC.segmento, l.segmento))+
      campoCom("Porte", selCom("cmPorte", LC.porte, l.porte))+
      campoCom("Cidade",'<input type="text" id="cmCidade" value="'+escAttr(l.cidade||"")+'" placeholder="Cariacica/ES">')+
      campoCom("Instagram",'<input type="text" id="cmInsta" value="'+escAttr(l.instagram||"")+'">')+
      campoCom("Entrada",'<input type="date" id="cmEntrada" value="'+escAttr((l.entrada||"").slice(0,10))+'">')+
    '</div>'+

    '<div class="cm-sec">Diagnóstico <span class="cm-scorebox">'+estrelasCom(sc)+' '+sc+' de 4</span></div>'+
    '<div class="cm-grade um">'+
      campoCom("O desafio, na frase dele",'<textarea id="cmDesafio" rows="2" placeholder="Ex.: perde aluno na rematrícula e não sabe por quê">'+esc(l.desafio||"")+'</textarea>')+
      campoCom("A meta, em número, para 90 dias",'<input type="text" id="cmMeta" value="'+escAttr(l.meta||"")+'" placeholder="Ex.: 40 matrículas novas até dezembro">')+
    '</div>'+
    '<div class="cm-grade">'+
      campoCom("Quantas pessoas decidem",'<input type="number" id="cmEnvolvidos" min="0" value="'+escAttr(l.envolvidos!=null?l.envolvidos:"")+'">')+
      campoCom("Já investe por mês (R$)",'<input type="number" id="cmInveste" min="0" value="'+escAttr(l.investe_hoje!=null?l.investe_hoje:"")+'">',"0 = não investe nada hoje")+
      campoCom("Prazo de decisão", selCom("cmPrazo", LC.prazo, l.prazo))+
      campoCom("Responsável", selCom("cmResp", pessoas, l.responsavel))+
    '</div>'+

    '<div class="cm-sec">Negócio</div>'+
    '<div class="cm-grade">'+
      campoCom("Pacote", selCom("cmPacote", LC.pacote, l.pacote))+
      campoCom("Mensalidade (R$)",'<input type="number" id="cmValor" min="0" value="'+escAttr(l.valor_mensal!=null?l.valor_mensal:"")+'">'+
        (l.porte&&MULT_PORTE[l.porte]?'<span class="mhint">Porte '+esc(l.porte)+': multiplicador '+MULT_PORTE[l.porte]+'x</span>':''))+
      campoCom("Setup / entrada (R$)",'<input type="number" id="cmSetup" min="0" value="'+escAttr(l.setup!=null?l.setup:"")+'">')+
      campoCom("Data da proposta",'<input type="date" id="cmDataProp" value="'+escAttr(l.data_proposta||"")+'">')+
      campoCom("Primeiro contato",'<input type="datetime-local" id="cmPrimeiro" value="'+escAttr((l.primeiro_contato||"").slice(0,16))+'">',
        min!=null?("levou "+(min<120?min+" min":Math.round(min/60)+"h")+" desde a entrada"):"quanto antes, melhor: 5 min contra 30 muda tudo")+
      campoCom("Próximo follow-up",'<input type="date" id="cmFollow" value="'+escAttr(l.proximo_followup||"")+'">')+
      campoCom("Reunião",'<input type="datetime-local" id="cmReuniao" value="'+escAttr((l.reuniao||"").slice(0,16))+'">')+
      campoCom("Resultado da reunião", selCom("cmResultado", LC.reuniao, l.resultado_reuniao))+
    '</div>'+
    campoCom("Observações",'<textarea id="cmObs" rows="2">'+esc(l.obs||"")+'</textarea>')+

    (l.etapa==="fechado"?fechamentoComHTML(l):'')+

    '<div class="mbtns">'+
      '<button data-cmsalvar="'+escAttr(l.id||"")+'">'+(novo?"Criar lead":"Salvar")+'</button>'+
      (novo?'':'<button class="sec" data-cmexcluir="'+escAttr(l.id)+'">Excluir</button>')+
      '<button class="sec" data-macao="fechar">Fechar</button>'+
    '</div></div>';
  mostrarModal(true);
}
/* o desfecho so aparece quando o lead chega em Fechado: perguntar antes
   e convidar a chutar */
function fechamentoComHTML(l){
  return '<div class="cm-sec">Desfecho</div>'+
    '<div class="cm-desf">'+
      '<button class="cm-df'+(l.desfecho==="ganho"?" on g":"")+'" data-cmdesf="ganho">Ganhamos</button>'+
      '<button class="cm-df'+(l.desfecho==="perdido"?" on p":"")+'" data-cmdesf="perdido">Perdemos</button>'+
    '</div>'+
    (l.desfecho==="perdido"
      ? '<div class="cm-grade um">'+
          campoCom("Motivo", selCom("cmMotivo", LC.perda, l.motivo_perda))+
          campoCom("O que realmente aconteceu",'<textarea id="cmFrase" rows="2" placeholder="Uma frase. Obrigatório.">'+esc(l.motivo_frase||"")+'</textarea>',
            "“Preço” não é opção: quase sempre significa valor não construído ou conversa com quem não decide")+
        '</div>'
      : (l.desfecho==="ganho"
        ? '<p class="cm-dica ok">Ao salvar, posso cadastrar este lead como cliente e abrir o onboarding de 14 etapas.</p>'
        : ''));
}

/* ---------------- GRAVACAO ---------------- */
function novoIdCom(){
  const a=new Uint8Array(8);
  (window.crypto||window.msCrypto).getRandomValues(a);
  return "ld_"+Array.from(a).map(x=>x.toString(16).padStart(2,"0")).join("");
}
const vCom = id => { const e=$(id); return e ? String(e.value||"").trim() : ""; };
const nCom = id => { const v=vCom(id); return v==="" ? null : Number(v); };

/* le a ficha inteira da tela. Serve tanto para salvar quanto para o
   desfecho, que precisa guardar o que ja foi digitado antes de
   redesenhar a janela. */
function coletarLeadCom(id){
  const antes = id ? (COM.leads[id]||{}) : {};
  return Object.assign({}, antes, {
    empresa:vCom("cmEmpresa"), contato:vCom("cmContato"), cargo:vCom("cmCargo"),
    decisor:vCom("cmDecisor"), whatsapp:telCom(vCom("cmZap"))||vCom("cmZap"),
    email:vCom("cmEmail"), origem:vCom("cmOrigem"), segmento:vCom("cmSegmento"),
    porte:vCom("cmPorte"), cidade:vCom("cmCidade"), instagram:vCom("cmInsta"),
    entrada:vCom("cmEntrada")||iso(HOJE),
    desafio:vCom("cmDesafio"), meta:vCom("cmMeta"),
    envolvidos:nCom("cmEnvolvidos"), investe_hoje:nCom("cmInveste"), prazo:vCom("cmPrazo"),
    responsavel:vCom("cmResp"),
    pacote:vCom("cmPacote"), valor_mensal:nCom("cmValor"), setup:nCom("cmSetup"),
    data_proposta:vCom("cmDataProp"), primeiro_contato:vCom("cmPrimeiro"),
    proximo_followup:vCom("cmFollow"), reuniao:vCom("cmReuniao"),
    resultado_reuniao:vCom("cmResultado"), obs:vCom("cmObs")
  });
}
function salvarLeadCom(id){
  const novo = coletarLeadCom(id);
  if($("cmMotivo")) novo.motivo_perda=vCom("cmMotivo");
  if($("cmFrase"))  novo.motivo_frase=vCom("cmFrase");
  if(!novo.empresa && !novo.contato){ toast("Precisa pelo menos da empresa ou do contato",false); return; }
  novo.score=scoreCHAMP(novo);
  novo.atualizadoEm=new Date().toISOString();
  novo.atualizadoPor=USUARIO||COM_LOGADO||null;

  /* fechar como perdido exige motivo e frase. Sem isso a base perde a
     unica informacao que ensina alguma coisa sobre por que perdemos. */
  if(novo.etapa==="fechado" && novo.desfecho==="perdido"){
    const r=podeSair(novo,"fechado");
    if(!r.ok){ toast("Falta "+r.falta, false); return; }
  }

  const oid = id || novoIdCom();
  if(!id){ novo.etapa="novo"; novo.criadoEm=novo.atualizadoEm;
           novo.entradaEm=novo.atualizadoEm;   /* hora exata: sem ela nao da para medir resposta */ }
  COM.leads[oid]=novo;
  logCom(id?"editou":"criou", oid, novo.empresa||novo.contato);
  salvarCom();
  fecharModal(); render();
  toast(id?"Lead salvo":"Lead criado");
}
function excluirLeadCom(id){
  const l=COM.leads[id]; if(!l) return;
  if(!confirm("Excluir "+(l.empresa||l.contato||"este lead")+" da base?")) return;
  delete COM.leads[id];
  logCom("excluiu", id, l.empresa||l.contato);
  salvarCom(); fecharModal(); render();
}
/* arrastar entre colunas: o gatilho de saida e verificado aqui, e a
   recusa explica o que falta em vez de so nao deixar */
function moverEtapaCom(id, destino){
  const l=leadCom(id); if(!l) return;
  if(l.etapa===destino) return;
  const r=podeSair(l, destino);
  if(!r.ok){
    if(destino==="fechado"){ abrirLeadComFechando(id); return; }
    toast("Para mover para "+etapaCom(destino).rot+", falta "+r.falta, false);
    abrirLeadCom(id); return;
  }
  COM.leads[id].etapa=destino;
  COM.leads[id].atualizadoEm=new Date().toISOString();
  if(destino==="fechado" && !COM.leads[id].fechamento) COM.leads[id].fechamento=iso(HOJE);
  logCom("moveu para "+etapaCom(destino).rot, id, l.empresa||l.contato);
  salvarCom(); render();
}
/* soltar em Fechado sem desfecho abre a ficha ja no ponto da decisao */
function abrirLeadComFechando(id){
  if(!COM.leads[id]) return;
  COM.leads[id].etapa="fechado";
  if(!COM.leads[id].fechamento) COM.leads[id].fechamento=iso(HOJE);
  abrirLeadCom(id);
  toast("Diga se foi ganho ou perdido para concluir", false);
}
function marcarDesfechoCom(id, qual){
  if(!COM.leads[id]) return;
  /* guarda o que ja estava digitado antes de redesenhar a janela */
  const atual=coletarLeadCom(id);
  if($("cmMotivo")) atual.motivo_perda=vCom("cmMotivo");
  if($("cmFrase"))  atual.motivo_frase=vCom("cmFrase");
  COM.leads[id]=atual;
  const l=COM.leads[id];
  l.desfecho = (l.desfecho===qual ? "" : qual);
  if(l.desfecho!=="perdido"){ l.motivo_perda=""; l.motivo_frase=""; }
  l.atualizadoEm=new Date().toISOString();
  salvarCom(); abrirLeadCom(id);
}
function logCom(acao, id, nome){
  COM.log=COM.log||[];
  COM.log.unshift({ts:new Date().toISOString(), acao:acao, id:id, nome:nome||"",
                   quem:USUARIO||COM_LOGADO||null});
  COM.log=COM.log.slice(0,200);
}

/* ═══════════════════════════════════════════════════════════════════
   ACESSO — o funil e a unica parte do painel atras de login.

   O resto do painel continua abrindo direto, como sempre. Aqui e
   diferente porque o dado e de terceiros: nome, telefone e faturamento
   de gente que nao e cliente e nunca autorizou nada.

   A protecao de verdade esta na REGRA do Firebase, nao nesta tela.
   Esconder o botao nao protege coisa nenhuma: qualquer um abre o
   endereco do banco no navegador. Quem decide quem le e o servidor,
   conferindo o e-mail do Google contra a lista de autorizados.
   ═══════════════════════════════════════════════════════════════════ */
const NO_COM = "painel/comercial";

function loginComHTML(){
  return '<section class="bloco cm-login"><h2>Funil de vendas</h2>'+
    '<p>Esta é a única tela do painel que pede login. A base de leads tem nome, '+
    'telefone e faturamento de gente que ainda não é cliente, então ela fica '+
    'guardada separada do resto e só abre para os e-mails da MK3.</p>'+
    '<button class="cm-entrar" data-cmentrar="1">Entrar com Google</button>'+
    '<p class="cm-dica">Seu Chrome já está logado no Google por causa do Drive e da Agenda, '+
    'então costuma ser um clique só.</p></section>';
}
function entrarCom(){
  if(!window.firebase || !firebase.auth){
    toast("Não consegui falar com o servidor agora", false); return;
  }
  const p=new firebase.auth.GoogleAuthProvider();
  p.setCustomParameters({prompt:"select_account"});
  firebase.auth().signInWithPopup(p)
    .then(()=>{ /* onAuthStateChanged cuida do resto */ })
    .catch(e=>{
      if(e && e.code==="auth/popup-closed-by-user") return;
      toast("Não deu para entrar: "+((e&&e.message)||"erro desconhecido"), false);
    });
}
function sairCom(){
  if(window.firebase && firebase.auth) firebase.auth().signOut();
  COM_LOGADO=null; COM_PRONTO=false; COM={leads:{},log:[]};
  render();
}
/* liga o funil ao banco. Chamado uma vez, na subida do painel. */
function ligarCom(){
  if(!window.firebase || !firebase.auth || !firebase.database) return;
  firebase.auth().onAuthStateChanged(u=>{
    if(!u){ COM_LOGADO=null; COM_PRONTO=false; COM={leads:{},log:[]}; if(VISTA.modo==="funil") render(); return; }
    COM_LOGADO=u.email||""; COM_NEGADO=false;
    const ref=firebase.database().ref(NO_COM);
    ref.on("value", s=>{
      const v=s.val()||{};
      COM={leads:v.leads||{}, log:v.log||[]};
      COM_PRONTO=true;
      if(VISTA.modo==="funil") render();
    }, err=>{
      /* a regra recusou: e-mail fora da lista. Dizer isso na cara, em
         vez de deixar a tela girando para sempre. */
      COM_PRONTO=true; COM_NEGADO=true; COM={leads:{},log:[]};
      if(VISTA.modo==="funil") render();
    });
  });
}
let COM_T=null;
function salvarCom(){
  if(!COM_LOGADO || !window.firebase || !firebase.database) return;
  clearTimeout(COM_T);
  COM_T=setTimeout(()=>{
    firebase.database().ref(NO_COM).update({leads:COM.leads, log:COM.log})
      .catch(()=>toast("Não consegui salvar no servidor. Sua alteração está só nesta tela.", false));
  }, 400);
}

/* ---------------- LEAD GANHO VIRA CLIENTE ----------------
   O funil termina onde o painel comeca: cliente novo entra com as 14
   etapas de onboarding, sem redigitar nada. */
function leadViraCliente(id){
  const l=leadCom(id);
  if(!l || l.desfecho!=="ganho"){ toast("Só depois de marcar como ganho", false); return; }
  if(!ehAdmin()){ toast("Só a administração cadastra cliente", false); return; }
  if(l.clienteId && cliente(l.clienteId)){ toast("Este lead já virou cliente", false); return; }
  return {
    nome: l.empresa || l.contato,
    segmento: l.segmento || "",
    entrada: l.fechamento || iso(HOJE),
    mensalidade: {valorPix: Number(l.valor_mensal)||0, valorPermuta:0, diaVencimento:20},
    plano: l.pacote || "",
    origemLead: id
  };
}

/* ---------------- ARRASTAR ENTRE COLUNAS ----------------
   Mesmo mecanismo que ja move tarefa entre datas no calendario. */
function ligarArrastoCom(){
  const q=document.querySelector(".cm-quadro"); if(!q) return;
  let pegando=null;
  q.addEventListener("dragstart", e=>{
    const c=e.target.closest("[data-cmlead]"); if(!c) return;
    pegando=c.dataset.cmlead;
    c.classList.add("arrastando");
    if(e.dataTransfer){ e.dataTransfer.effectAllowed="move"; try{e.dataTransfer.setData("text/plain",pegando);}catch(x){} }
  });
  q.addEventListener("dragend", e=>{
    const c=e.target.closest("[data-cmlead]"); if(c) c.classList.remove("arrastando");
    q.querySelectorAll(".cm-col.alvo").forEach(x=>x.classList.remove("alvo"));
    pegando=null;
  });
  q.addEventListener("dragover", e=>{
    const col=e.target.closest("[data-cmcol]"); if(!col) return;
    e.preventDefault();
    if(e.dataTransfer) e.dataTransfer.dropEffect="move";
    q.querySelectorAll(".cm-col.alvo").forEach(x=>{ if(x!==col) x.classList.remove("alvo"); });
    col.classList.add("alvo");
  });
  q.addEventListener("drop", e=>{
    const col=e.target.closest("[data-cmcol]"); if(!col) return;
    e.preventDefault();
    col.classList.remove("alvo");
    const id = pegando || (e.dataTransfer && e.dataTransfer.getData("text/plain"));
    if(id) moverEtapaCom(id, col.dataset.cmcol);
  });
}

/* ---------------- CLIQUES ----------------
   O painel delega tudo num ouvinte so. Aqui o funil registra os seus,
   sem mexer na lista gigante do motor. */
document.addEventListener("click", ev=>{
  const a=ev.target.closest("[data-cmlead],[data-cmnovo],[data-cmsalvar],[data-cmexcluir],[data-cmdesf],[data-cmentrar],[data-cmsair]");
  if(!a) return;
  if(ev.target.closest("[data-cmzap]")) return;        /* o botao de WhatsApp e link, deixa passar */
  ev.preventDefault(); ev.stopPropagation();
  const d=a.dataset;
  if(d.cmentrar!==undefined){ entrarCom(); return; }
  if(d.cmsair!==undefined){ sairCom(); return; }
  if(d.cmnovo!==undefined){ abrirLeadCom(null); return; }
  if(d.cmsalvar!==undefined){ salvarLeadCom(d.cmsalvar||null); return; }
  if(d.cmexcluir!==undefined){ excluirLeadCom(d.cmexcluir); return; }
  if(d.cmdesf!==undefined){
    const alvo=document.querySelector("[data-cmsalvar]");
    marcarDesfechoCom(alvo?alvo.dataset.cmsalvar:"", d.cmdesf); return;
  }
  if(d.cmlead!==undefined){ abrirLeadCom(d.cmlead); return; }
}, true);

/* o motor sobe primeiro; este arquivo entra depois e so se pendura no
   banco quando o Firebase ja existe na pagina */
if(typeof window!=="undefined"){
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", ligarCom);
  else setTimeout(ligarCom,0);
}
