/* ═══════════════════════════════════════════════════════════════
   MOTOR — regras do Manual de Processos MK3 v1.0 + render.
   Régua da MK3: 2 DIAS ÚTEIS em toda etapa de entrega e aprovação.
   ═══════════════════════════════════════════════════════════════ */

const HOJE = new Date(); HOJE.setHours(0,0,0,0);

const d    = s => { const [a,m,x]=s.split("-").map(Number); return new Date(a,m-1,x); };
const iso  = t => t.getFullYear()+"-"+String(t.getMonth()+1).padStart(2,"0")+"-"+String(t.getDate()).padStart(2,"0");
const addD = (s,n)=>{ const x=d(s); x.setDate(x.getDate()+n); return iso(x); };
const addM = (s,n)=>{ const x=d(s); x.setMonth(x.getMonth()+n); return iso(x); };
const fmt  = s => s ? d(s).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit"}) : "—";
const dow  = s => s ? d(s).toLocaleDateString("pt-BR",{weekday:"short"}).replace(".","") : "";
const dias = s => Math.round((d(s)-HOJE)/86400000);

/* soma N dias ÚTEIS (pula sábado e domingo) */
const uteis = (s,n) => {
  if(!s) return null;
  let x = d(s), c = 0;
  while(c < n){ x.setDate(x.getDate()+1); const w = x.getDay(); if(w!==0 && w!==6) c++; }
  return iso(x);
};
const PRAZO = 2;

/* quantos dias ÚTEIS separam o limite da data real (0 = no prazo) */
const uteisEntre = (limite, real) => {
  if(!limite || !real || real <= limite) return 0;
  let n=0, x=d(limite);
  while(iso(x) < real){ x.setDate(x.getDate()+1); const w=x.getDay(); if(w!==0&&w!==6) n++; }
  return n;
};
/* dias UTEIS de hoje ate a data (negativo = ja passou, em dias corridos) */
const uteisAte = s => {
  const n=dias(s); if(n<=0) return n;
  let c=0, x=new Date(HOJE);
  for(let i=0;i<n;i++){ x.setDate(x.getDate()+1); const w=x.getDay(); if(w!==0&&w!==6) c++; }
  return c;
};
const maiorData = (a,b) => !a ? b : !b ? a : (a>b ? a : b);

/* ---------------- REGRAS ---------------- */
/* Conclusão de uma tarefa. Em `concluidas` aceita:
   - "id"            -> concluído (sem data, assume no prazo)
   - {id, data}      -> concluído naquela data (o painel calcula prazo/atraso) */
const conclusaoDe = (c, id) => {
  for(const e of (c.concluidas||[])){
    if(e === id) return {feita:true, data:null};
    if(e && e.id === id) return {feita:true, data:e.data||null};
  }
  return {feita:false, data:null};
};

function mesesDepois(isoData, n){
  const p=String(isoData).split("-").map(Number);
  const d=new Date(p[0], p[1]-1+n, 1);
  const ultimo=new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
  d.setDate(Math.min(p[2], ultimo));
  return iso(d);
}
/* devolve só a ocorrência corrente de um ciclo: a primeira ainda não concluída */
function ocorrenciaAtual(cli, inicio, meses, prefixo, idPrimeira){
  if(!inicio) return null;
  const limite = addD(iso(HOJE), 45);
  let base = inicio;
  for(let i=0;i<80;i++){
    const prox = mesesDepois(base, meses);
    const id = (i===0 && idPrimeira) ? idPrimeira : prefixo+"_"+prox;
    if(!conclusaoDe(cli, id).feita) return {id:id, data:prox};
    base = prox;
    if(prox > limite) return null;
  }
  return null;
}
function regras(c){
  const T=[];
  const add=(id,fase,tarefa,detalhe,data,resp)=>{
    const cc=conclusaoDe(c,id);
    T.push({id,fase,tarefa,detalhe,data,resp,cliente:c.nome,clienteId:c.id,
      feita:cc.feita, dataConclusao:cc.data});
  };

  /* PARTE A — ENTRADA (âncora: assinatura) */
  const D0=c.entrada;
  add("pasta","Entrada","Duplicar pasta modelo e renomear","[SEGMENTO] "+c.nome,D0,"Estagiário");
  add("grupo","Entrada","Criar grupo de WhatsApp","MK3 - "+c.nome.toUpperCase()+", com foto da marca",D0,"Estagiário");
  add("boasvindas","Entrada","Mensagem de boas-vindas","No grupo, com os próximos passos",D0,"Estagiário");
  add("onboarding","Entrada","Enviar onboarding","Por WhatsApp e por e-mail",D0,"Estagiário");
  add("acessos","Entrada","Coletar acessos","Instagram, Facebook, LinkedIn e demais",D0,"Estagiário");
  {
    add("planilha","Entrada","Planilha de acessos","E-mail, senha, 2FA e códigos de reserva · 01. ACESSOS",D0,"Estagiário");
    add("fotoMarca","Entrada","Salvar a foto da marca","02 → 06. Identidade Visual · vira a foto do grupo",D0,"Estagiário");
  }
  add("prints","Entrada","Print das redes na chegada","Antes de qualquer ação · 02 → 04 Registro visual",D0,"Estagiário");
  add("reserva","Entrada","Código de reserva 2FA","Print salvo em 01. Acessos",D0,"Estagiário");

  const antesIm = c.imersao ? addD(c.imersao,-1) : null;
  add("pesq1","Entrada","Pesquisa de comportamento de consumo","Antes da imersão",antesIm,"Analista");
  add("pesq2","Entrada","Pesquisa de mercado e demanda","Antes da imersão",antesIm,"Analista");
  add("imersao","Entrada","Reunião de imersão","Google Agenda · convite por e-mail e WhatsApp",c.imersao,"Analista");
  add("imersaoDoc","Entrada","Tratar o documento da imersão","IA organiza, analista revisa · 03. Imersão",
      c.imersao?uteis(c.imersao,1):null,"Analista");
  add("reuniaoPlan","Entrada","Reunião de planejamento (entrada)","Temas, datas do negócio, tráfego",
      c.reuniaoPlanejamentoEntrada,"Analista");
  add("revisaoOnb","Entrada","Revisão final do onboarding","Conferir as 14 etapas uma a uma antes de encerrar",
        c.imersao?uteis(c.imersao,2):uteis(D0,10),"Analista");



  /* 1º CICLO — cadeia de 2 dias úteis. Cada etapa re-ancora na data
     REAL quando ela existe; sem data real, usa o limite do prazo. */
  const R = c.reuniaoPlanejamentoEntrada;
  if(R){
    const limEnvPlan  = uteis(R, PRAZO);
    const baseEnvPlan = c.envioPlanejamento || limEnvPlan;
    const lembPlan    = uteis(baseEnvPlan, 1);
    const limAprPlan  = uteis(baseEnvPlan, PRAZO);
    const baseAprPlan = c.aprovacaoPlanejamento || limAprPlan;
    /* se as artes dependem das fotos, elas só começam a contar depois da gravação */
    const gatilhoArtes = c.artesDependemDaGravacao && c.gravacao
                       ? maiorData(baseAprPlan, c.gravacao) : baseAprPlan;
    const limArtes    = uteis(gatilhoArtes, PRAZO);
    const baseEnvMid  = c.envioMidia || limArtes;
    const lembMid     = uteis(baseEnvMid, 1);
    const limAprMid   = uteis(baseEnvMid, PRAZO);
    const baseAprMid  = c.aprovacaoMidia || limAprMid;

    add("c1_plan","1º ciclo","Criar e enviar o planejamento ao cliente","2 dias úteis após a reunião · abre o prazo de 48h úteis",limEnvPlan,"Analista");
    add("c1_lembPlan","1º ciclo","Lembrete de aprovação do planejamento","1 dia útil sem retorno",lembPlan,"Analista");
    add("c1_aprPlan","1º ciclo","Aprovação do planejamento","Limite: 2 dias úteis · sem retorno = aprovado automaticamente",limAprPlan,"Cliente");
    /* só existe quando o cliente REALMENTE pediu alteração (se aprovou, não pediu) */
    if(c.alteracaoPedida)
      add("c1_ajuste","1º ciclo","Devolver a alteração pedida",
          "Alteração pedida em "+fmt(c.alteracaoPedida)+" · 2 dias úteis para devolver",
          uteis(c.alteracaoPedida,PRAZO),"Analista");
    add("c1_roteiro","1º ciclo","Enviar roteiro à produtora",
        "No mesmo dia da aprovação do planejamento", baseAprPlan, "Analista");
    if(c.gravacao){
      add("c1_gravacaoMarcar","1º ciclo","Marcar a gravação",
          "Combinado para "+fmt(c.gravacao)+" · confirmar véspera",addD(c.gravacao,-3),"Analista / Estagiário");
      add("c1_gravacao","1º ciclo",c.semFotos?"Dia de gravação":"Dia de gravação + fotos",
          "Manhã, 8h às 17h"+(c.artesDependemDaGravacao?" · insumo das artes":""),c.gravacao,"Produtora / Cliente");
    } else {
      add("c1_gravacaoMarcar","1º ciclo","Marcar a gravação",
          "Falar com o cliente e fechar a data",null,"Analista / Estagiário");
      add("c1_gravacao","1º ciclo","Dia de gravação","Data a definir",null,"Produtora / Cliente");
    }
    add("c1_artes","1º ciclo","Criar as artes",
        (c.artesDependemDaGravacao && c.gravacao)
          ? "2 dias úteis após a gravação · depende das fotos de "+fmt(c.gravacao)
          : "2 dias úteis após a aprovação do planejamento",
        limArtes,"Analista / Design");
    add("c1_lembMid","1º ciclo","Lembrete de aprovação das artes","1 dia útil sem retorno",lembMid,"Analista");
    add("c1_aprMid","1º ciclo","Aprovação das artes","Limite: 2 dias úteis · aprovado = entra no Pode Postar",limAprMid,"Cliente");
    const temAgendamento = !c.escopo || c.escopo.agendamento !== false;
    if(temAgendamento)
      add("c1_podepostar","1º ciclo","Peças no Pode Postar","Automático na aprovação",baseAprMid,"Sistema");
    else
      add("c1_entrega","1º ciclo","Entregar as peças ao cliente",
          "Contrato não inclui agendamento · a cliente publica",baseAprMid,"Analista");
    add("c1_calendario","1º ciclo","Enviar à gestão o planejamento com as datas de postagem","",baseAprMid,"Analista");
  }

  /* GATILHOS RECORRENTES */
  /* ciclos que voltam sozinhos: ao concluir um, o painel já marca o próximo */
  const r2fa = ocorrenciaAtual(c, D0, 3, "rec_2fa", "reserva3m");
  if(r2fa) add(r2fa.id,"Recorrente","Atualizar código de reserva (2FA)",
      "A cada 3 meses · pegar no Instagram e salvar em 01. ACESSOS", r2fa.data, "Estagiário");
  const rpq = ocorrenciaAtual(c, D0, 6, "rec_pesq", "pesq6m");
  if(rpq) add(rpq.id,"Recorrente","Atualizar as duas pesquisas",
      "A cada 6 meses · mercado e comportamento, cada uma na pasta do ano e do mês", rpq.data, "Analista");
  /* tarefas de contrato levam a data de vencimento no id: cada contrato tem as suas.
     Antes o id era fixo e, ao renovar, a tarefa do contrato novo ja nascia "feita". */
  const venc=c.vencimentoContrato;
  const idC = b => venc ? b+"_"+venc : b;
  /* marca antiga (sem a data no id) so vale se foi feita perto deste vencimento */
  const herdar = b => {
    if(!venc) return;
    const x=conclusaoDe(c,b); if(!x.feita || !x.data) return;
    if(x.data>=addD(venc,-120) && x.data<=addD(venc,30) && !conclusaoDe(c,idC(b)).feita)
      c.concluidas=(c.concluidas||[]).concat([{id:idC(b),data:x.data}]);
  };
  ["renov","acaoComercial","fimContrato","entregaMateriais"].forEach(herdar);
  /* cliente que ja avisou que nao renova: sem cobranca de renovacao nem acao comercial,
     ficam so o encerramento e a entrega dos materiais */
  if(!c.semRenovacao)
    add(idC("renov"),"Recorrente","Renovação de contrato (administrativo)","20 dias antes do vencimento",
      venc?addD(venc,-20):null,"Gestão");
  if(venc && !c.semRenovacao)
    add(idC("acaoComercial"),"Contrato","Ação comercial — contrato encerra em 1 semana",
        "Contato para renovação/negociação com o cliente",addD(venc,-7),"Gestão");
  add(idC("fimContrato"),"Contrato","Encerramento do contrato",
      c.contrato?("Contrato "+c.contrato):"",venc,"Gestão");

  if(venc){
    /* entrega integral dos materiais: até o fim da vigência,
       com tolerância de 10 dias úteis depois (cláusula 4.f) */
    add(idC("entregaMateriais"),"Contrato","Entregar todos os materiais produzidos",
        "Artes, textos e editáveis · tolerância até "+fmt(uteis(venc,10)),
        venc,"Analista");
  }

  /* mensalidade: no dia de vencimento, enquanto cada contrato estiver vigente.
     Contratos anteriores continuam gerando as mensalidades deles (historico de pagamento). */
  const fmtR = v => Number(v||0).toLocaleString("pt-BR");
  const mensalidades = (mens, ini, fim, nomeContrato) => {
    if(!mens || !fim) return;
    const dia = mens.diaVencimento;
    let m = new Date(d(ini||D0).getFullYear(), d(ini||D0).getMonth(), dia);
    let i = 0;
    while(iso(m) <= fim && i < 36){
      const s2 = iso(m);
      if(s2 >= (ini||D0) && !T.some(t=>t.id==="pag_"+s2))
        add("pag_"+s2,"Contrato","Mensalidade — R$ "+fmtR(mens.valorPix)+" PIX"+(mens.valorPermuta?" + R$ "+fmtR(mens.valorPermuta)+" permuta":""),
            "Vencimento dia "+dia+(nomeContrato?" · "+nomeContrato:""),s2,"Cliente");
      m.setMonth(m.getMonth()+1); i++;
    }
  };
  (c.contratosAnteriores||[]).forEach(k=>mensalidades(k.mensalidade, k.inicio, k.fim, k.contrato));
  mensalidades(c.mensalidade, c.inicioContrato, c.vencimentoContrato, c.contrato);

  /* CICLO MENSAL PADRÃO — repete a cada mês de vigência, a partir de inicioCicloPadrao
     (ou do mês seguinte à entrada). Gera relatório, reunião mensal, planejamento e mídia
     de CADA mês, com ids sufixados por AAAA-MM. Reuniões pedem Meet + agenda + convite. */
  const e=d(D0);
  let ini = c.inicioCicloPadrao
    ? new Date(Number(c.inicioCicloPadrao.split("-")[0]), Number(c.inicioCicloPadrao.split("-")[1])-1, 1)
    : new Date(e.getFullYear(), e.getMonth()+1, 1);
  const fimCiclos = c.vencimentoContrato ? d(c.vencimentoContrato)
                                         : new Date(ini.getFullYear(), ini.getMonth()+1, 1);
  const dtFeita = id => { const x=(c.concluidas||[]).find(e=>((e&&e.id)?e.id:e)===id); return (x&&x.data)||null; };
  let _gi=0;
  for(let mref=new Date(ini); mref<=fimCiclos && _gi<24; mref.setMonth(mref.getMonth()+1), _gi++){
    const ano=mref.getFullYear(), mes=mref.getMonth()+1;
    const sfx="_"+ano+"-"+String(mes).padStart(2,"0");
    const dd=n=>ano+"-"+String(mes).padStart(2,"0")+"-"+String(n).padStart(2,"0");
    const ult=new Date(ano,mes,0).getDate();
    const cic="Ciclo "+mref.toLocaleDateString("pt-BR",{month:"long",year:"numeric"});

    /* Meses ja fechados ficam como estao: o historico nao muda de lugar.
       Do mes corrente em diante, o ciclo e MALEAVEL: a equipe coloca a data
       das primeiras etapas, e a regua de 2 dias uteis so roda a partir do
       ENVIO DO PLANEJAMENTO, ancorada na data real. Sem esse envio, o que
       vem depois fica sem data em vez de cair num dia inventado. */
    const ym = ano+"-"+String(mes).padStart(2,"0");
    if(ym < iso(HOJE).slice(0,7)){
      add("relatorio"+sfx,"Ciclo padrão","Gerar relatório mensal","Início da semana 3 · "+cic,dd(15),"Analista");
      add("reuMensal"+sfx,"Ciclo padrão","Reunião mensal","Janela: dias 15 a 20 · criar Meet, registrar na agenda e enviar convite · "+cic,dd(20),"Analista");
      add("envRelat"+sfx,"Ciclo padrão","Enviar relatório ao cliente","E-mail, no dia da reunião ou no útil seguinte · "+cic,dd(21),"Analista");
      add("planej"+sfx,"Ciclo padrão","Criar o planejamento","Após a reunião · aprovação interna da gestão · "+cic,dd(23),"Analista");
      add("envPlanej"+sfx,"Ciclo padrão","Enviar planejamento ao cliente","Abre o prazo de 48h úteis · "+cic,dd(24),"Analista");
      add("aprPlanej"+sfx,"Ciclo padrão","Aprovação do planejamento","Limite: 2 dias úteis · sem retorno = aprovado automaticamente · "+cic,uteis(dtFeita("envPlanej"+sfx)||dd(24),PRAZO),"Cliente");
      add("midia"+sfx,"Ciclo padrão","Produzir a mídia","Semana 4 · "+cic,dd(28),"Analista");
      add("envMidia"+sfx,"Ciclo padrão","Entregar as artes e vídeos ao cliente","Abre o prazo de 48h úteis · "+cic,dd(28),"Analista");
      add("aprMidia"+sfx,"Ciclo padrão","Aprovação das artes","Limite: 2 dias úteis · sem retorno = aprovado automaticamente · "+cic,uteis(dtFeita("envMidia"+sfx)||dd(28),PRAZO),"Cliente");
      add("agendado"+sfx,"Ciclo padrão","Conteúdo agendado","Pronto para publicar no dia 1 · "+cic,dd(ult),"Analista");
      continue;
    }

    /* --- etapas de abertura: vocês marcam a data, o painel não inventa --- */
    const aMarcar = "Sem data até vocês marcarem · "+cic;
    add("relatorio"+sfx,"Ciclo padrão","Gerar relatório mensal",
        dtFeita("relatorio"+sfx)?("Feito · "+cic):aMarcar, dtFeita("relatorio"+sfx),"Analista");
    add("reuMensal"+sfx,"Ciclo padrão","Reunião mensal",
        dtFeita("reuMensal"+sfx)?("Meet, agenda e convite · "+cic)
                                :("Marque a data e o painel calcula o resto · "+cic),
        dtFeita("reuMensal"+sfx),"Analista");
    add("envRelat"+sfx,"Ciclo padrão","Enviar relatório ao cliente",
        "E-mail, no dia da reunião ou no útil seguinte · "+cic, dtFeita("envRelat"+sfx),"Analista");
    add("planej"+sfx,"Ciclo padrão","Criar o planejamento",
        "Após a reunião · aprovação interna da gestão · "+cic, dtFeita("planej"+sfx),"Analista");

    /* --- a partir daqui a régua roda sozinha, ancorada na data REAL --- */
    const _envP = dtFeita("envPlanej"+sfx);
    add("envPlanej"+sfx,"Ciclo padrão","Enviar planejamento ao cliente",
        _envP ? ("Enviado em "+fmt(_envP)+" · abre o prazo de 48h úteis · "+cic)
              : ("Marque o dia do envio: é ele que abre a régua do mês · "+cic),
        _envP,"Analista");

    const _limAprP = _envP ? uteis(_envP,PRAZO) : null;
    const _aprP    = dtFeita("aprPlanej"+sfx);
    add("aprPlanej"+sfx,"Ciclo padrão","Aprovação do planejamento",
        _envP ? ("Limite: 2 dias úteis após o envio · sem retorno = aprovado automaticamente · "+cic)
              : ("Conta 2 dias úteis assim que o planejamento for enviado · "+cic),
        _limAprP,"Cliente");

    const _baseAprP = _aprP || _limAprP;
    const _limMid   = _baseAprP ? uteis(_baseAprP,PRAZO) : null;
    add("midia"+sfx,"Ciclo padrão","Produzir a mídia",
        _baseAprP ? ("2 dias úteis após a aprovação do planejamento · "+cic)
                  : ("Começa a contar quando o planejamento for aprovado · "+cic),
        _limMid,"Analista");
    const _envM = dtFeita("envMidia"+sfx);
    add("envMidia"+sfx,"Ciclo padrão","Entregar as artes e vídeos ao cliente",
        _envM ? ("Entregue em "+fmt(_envM)+" · abre o prazo de 48h úteis · "+cic)
              : ("Abre o prazo de 48h úteis · "+cic),
        _envM || _limMid,"Analista");

    const _baseEnvM = _envM || _limMid;
    const _limAprM  = _baseEnvM ? uteis(_baseEnvM,PRAZO) : null;
    const _aprM     = dtFeita("aprMidia"+sfx);
    add("aprMidia"+sfx,"Ciclo padrão","Aprovação das artes",
        _baseEnvM ? ("Limite: 2 dias úteis após a entrega · sem retorno = aprovado automaticamente · "+cic)
                  : ("Conta 2 dias úteis assim que as artes forem entregues · "+cic),
        _limAprM,"Cliente");
    add("agendado"+sfx,"Ciclo padrão","Conteúdo agendado",
        (_aprM||_limAprM) ? ("No dia da aprovação das artes · "+cic)
                          : ("Depende da aprovação das artes · "+cic),
        _aprM || _limAprM,"Analista");
  }
  /* o contrato encerra: nada de tarefa de ciclo depois da data final */
  if(c.vencimentoContrato){
    for(let i=T.length-1;i>=0;i--){
      if(T[i].fase==="Ciclo padrão" && T[i].data && T[i].data > c.vencimentoContrato) T.splice(i,1);
    }
  }

  /* TAREFAS EXTRAS por cliente (itens fora do padrão: pagamentos a fornecedor, etc.) */
  (c.tarefasExtras||[]).forEach((t,i)=>add(t.id||("extra"+i), t.fase||"Outros", t.tarefa, t.detalhe||"", t.data||null, t.resp||"MK3"));

  /* ---- coerência: o que já tem data real está feito; o lembrete perde o sentido após a resposta ---- */
  const forcado=(c.__pendenteForcado||[]);
  const marcaAuto=(id,quando)=>{
    if(!quando || forcado.indexOf(id)>=0) return;   /* respeita o "não feito" marcado por você */
    const t=T.find(x=>x.id===id);
    if(t && !t.feita){ t.feita=true; t.dataConclusao=quando; }
  };
  marcaAuto("c1_plan",    c.envioPlanejamento);
  marcaAuto("c1_aprPlan", c.aprovacaoPlanejamento);
  marcaAuto("c1_roteiro", c.aprovacaoPlanejamento);
  marcaAuto("c1_artes",   c.envioMidia);
  marcaAuto("c1_aprMid",  c.aprovacaoMidia);
  marcaAuto("c1_lembPlan",c.aprovacaoPlanejamento);
  marcaAuto("c1_lembMid", c.aprovacaoMidia);
  if(c.gravacao && c.gravacao <= iso(HOJE)) marcaAuto("c1_gravacao", c.gravacao);

  return T;
}

function contadores(c){
  const out=[];
  const mk=(tipo,envio,aprov)=>{
    if(!envio || aprov) return;
    out.push({cliente:c.nome,tipo,enviado:envio,lembrete:uteis(envio,1),vencimento:uteis(envio,PRAZO)});
  };
  mk("planejamento", c.envioPlanejamento, c.aprovacaoPlanejamento);
  mk("mídia",        c.envioMidia,        c.aprovacaoMidia);
  return out;
}

/* ---------------- ATRASOS ---------------- */
/* Compara o limite da regra com a data real. Só registra o que já
   aconteceu — nada de previsão. */
function atrasos(c){
  const out=[];
  const just = etapa => (c.justificados||[]).find(j=>j.etapa===etapa);
  const reg=(etapa,quem,limite,real)=>{
    if(!limite || !real) return;
    const n = uteisEntre(limite, real);
    if(n>0){
      const j = just(etapa);
      out.push({cliente:c.nome, etapa, quem, limite, real, dias:n,
                justificado: !!j, motivo: j ? j.motivo : null});
    }
  };
  const R = c.reuniaoPlanejamentoEntrada;
  if(!R) return out;

  const limEnvPlan  = uteis(R, PRAZO);
  reg("Entrega do planejamento","MK3", limEnvPlan, c.envioPlanejamento);

  const baseEnvPlan = c.envioPlanejamento || limEnvPlan;
  const limAprPlan  = uteis(baseEnvPlan, PRAZO);
  reg("Aprovação do planejamento","Cliente", limAprPlan, c.aprovacaoPlanejamento);

  const baseAprPlan  = c.aprovacaoPlanejamento || limAprPlan;

  /* limite PELA REGRA: 2 dias úteis após a aprovação do planejamento */
  const limArtesRegra = uteis(baseAprPlan, PRAZO);

  /* data possível NA PRÁTICA: se as artes dependem das fotos, só
     começam a contar depois da gravação */
  const gatilhoArtes = c.artesDependemDaGravacao && c.gravacao
                     ? maiorData(baseAprPlan, c.gravacao) : baseAprPlan;
  const limArtes     = uteis(gatilhoArtes, PRAZO);

  /* a dependência NÃO apaga o prazo: se ela estoura a régua, isso é
     um atraso previsto e tem de aparecer antes de acontecer */
  const nPrev = uteisEntre(limArtesRegra, limArtes);
  if(nPrev>0 && !c.envioMidia){
    const j = just("Entrega das artes");
    out.push({cliente:c.nome, etapa:"Entrega das artes", quem:"MK3", previsto:true,
              limite:limArtesRegra, real:limArtes, dias:nPrev,
              justificado: !!j,
              motivo: j ? j.motivo : null,
              causa:"depende das fotos da gravação de "+fmt(c.gravacao)});
  }

  reg("Entrega das artes","MK3", limArtesRegra, c.envioMidia);

  const baseEnvMid = c.envioMidia || limArtes;
  const limAprMid  = uteis(baseEnvMid, PRAZO);
  reg("Aprovação das artes","Cliente", limAprMid, c.aprovacaoMidia);

  return out;
}

function status(t){
  if(t.feita){
    if(t.dataConclusao && t.data){
      const n=uteisEntre(t.data, t.dataConclusao);
      if(n>0) return {k:"ok", atraso:n, quando:t.dataConclusao,
                      txt:"Concluído · atrasou "+n+(n===1?" dia útil":" dias úteis")};
      return {k:"ok", atraso:0, quando:t.dataConclusao, txt:"Concluído na data"};
    }
    return {k:"ok", txt:"Concluído"};
  }
  if(!t.data) return {k:"sem",txt:"Sem data"};
  const n=dias(t.data);
  if(n<0)   return {k:"atrasado",txt:"Atrasado "+Math.abs(n)+"d"};
  if(n===0) return {k:"hoje",txt:"Vence hoje"};
  if(n===1) return {k:"umdia",txt:"Falta 1 dia"};
  if(n<=7)  return {k:"semana",txt:"Faltam "+n+" dias"};
  return {k:"futuro",txt:"Faltam "+n+" dias"};
}

/* ================= INTERFACE ================= */
/* nome de cada area, igual em todo o painel */
const AREA_ROT = {mkt:"Marketing Digital", fin:"Financeiro", com:"Comercial"};
const $ = id => document.getElementById(id);
const esc = s => String(s==null?"":s)
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

/* ---- ícone de status: não depender só de cor (2.3) ---- */
const SIC = {atrasado:"&#9650;",replan:"&#8618;",parcial:"&#9681;",hoje:"&#9679;",umdia:"&#9686;",semana:"&#9675;",futuro:"&#9675;",sem:"?",ok:"&#10003;"};
const tagHTML = t => '<span class="tag t-'+t.st.k+(t.st.atraso?' okatraso':'')+'">'+
  '<i class="si" aria-hidden="true">'+(SIC[t.st.k]||"")+'</i>'+esc(t.st.txt)+'</span>';

/* ---- toast com desfazer (4.1) + marcador salvo (J) ---- */
let toastTimer=null;
function toast(msg, acao){
  const el=$("toast"); if(!el) return;
  el.innerHTML='<b>'+esc(msg)+'</b>'+(acao?'<button data-toastundo="1">Desfazer</button>':'');
  el.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove("on"), 5000);
}
function fecharToast(){ const el=$("toast"); if(el){ el.classList.remove("on"); clearTimeout(toastTimer); } }
let salvoTimer=null;
function marcarSalvo(){
  const el=document.getElementById("salvo"); if(!el) return;
  el.textContent="Salvo \u2713"; el.classList.add("on");
  clearTimeout(salvoTimer); salvoTimer=setTimeout(()=>el.classList.remove("on"),2000);
}

/* ---- modal acessível: foco preso, Esc, retorno de foco (3.4) ---- */
let focoAnterior=null;
const FOCAVEIS='button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';
function mostrarModal(){
  const mm=$("modal");
  if(window.fecharTip) window.fecharTip();                 /* tooltip nao fica boiando por cima do modal */
  const h=mm.querySelector("h3,h2"); if(h) h.id="modalTitulo";
  else mm.removeAttribute("aria-labelledby");
  if(!modalAberto()) focoAnterior=document.activeElement;   /* não perde a origem ao redesenhar */
  mm.style.display="flex";
  const ap=$("app"); if(ap) ap.setAttribute("inert","");
  /* nunca focar campo de texto: o cursor não deve cair dentro de caixa nenhuma.
     O foco vai para a própria janela, para o Esc e o leitor de tela funcionarem. */
  const cx=mm.querySelector(".mbox");
  if(cx){ cx.setAttribute("tabindex","-1"); if(cx.focus) setTimeout(()=>cx.focus({preventScroll:true}),20); }
}
function fecharModal(){
  const mm=$("modal"); if(!mm) return;
  mm.style.display="none"; mm.innerHTML="";
  const ap=$("app"); if(ap) ap.removeAttribute("inert");
  if(focoAnterior && focoAnterior.focus) focoAnterior.focus();
  focoAnterior=null;
}
const modalAberto = () => { const mm=$("modal"); return mm && mm.style.display==="flex"; };
function semPular(fn){
  const mm=$("modal");
  const cx=mm&&mm.querySelector(".mbox");
  const y=cx?cx.scrollTop:0;
  const py=(window.scrollY||window.pageYOffset||0);
  fn();
  const nv=mm&&mm.querySelector(".mbox");
  if(nv&&y) nv.scrollTop=y;
  if(py) window.scrollTo(0,py);
}

const ORDEM   = {atrasado:0,replan:0.2,parcial:0.5,hoje:1,umdia:2,semana:3,sem:4,futuro:5,ok:6};
const ROTULO  = {atrasado:"Atrasado",replan:"Replanejada e vencida",parcial:"Parcial",hoje:"Vence hoje",umdia:"Falta 1 dia",
                 semana:"Próximos 7 dias",sem:"Sem data",futuro:"Programado",ok:"Concluído"};
const BUCKETS = ["atrasado","replan","parcial","hoje","umdia","semana","sem","ok"];

/* ---- áreas (Visão Geral = tudo) ---- */
const AREAS = [{k:"all",rot:"Visão Geral"},{k:"mkt",rot:"Marketing Digital"},
               {k:"fin",rot:"Financeiro"},{k:"com",rot:"Comercial"}];
/* de que area e cada tarefa. Contrato, mensalidade, renovacao e encerramento sao do
   administrativo (fin); a acao comercial de renovacao aparece para o administrativo E o comercial. */
function areasDaTarefa(t){
  const id=String(t.id||"");
  if(/^acaoComercial(_|$)/.test(id)) return ["fin","com"];
  if(/^entregaMateriais(_|$)/.test(id)) return ["mkt"];                 /* entregar o material e trabalho do marketing */
  if(/^(pag_|fotos_|renov(_|$)|renovacao|fimContrato(_|$))/.test(id)) return ["fin"];
  if(t.fase==="Contrato") return ["fin"];                                 /* extras de contrato vindos do dados.js */
  return ["mkt"];
}
const areaBase = id => areasDaTarefa({id:id})[0];
/* a tarefa pertence a area? (algumas pertencem a duas) */
const naArea = (t,a) => (t.areas||[t.area]).indexOf(a)>=0;
const areaMatch = t => {
  const permitidas = USUARIO ? areasDe() : ["all","mkt","fin","com"];
  const a = (permitidas.indexOf(VISTA.area)>=0) ? VISTA.area : (permitidas.indexOf("all")>=0?"all":permitidas[0]);
  if(a==="all") return true;
  return naArea(t,a);
};

/* ---- sidebar (estilo Pode Postar) ---- */
const IC = {
  cards:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  prio:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 12l3 3 5-6"/></svg>',
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>',
  lista:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  geral:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18"/></svg>',
  mkt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
  fin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20"/><path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  com:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  pessoas:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M16 14.6c3 .2 5 2.3 5 5.4"/></svg>',
  inicio:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9.5 20v-6h5v6"/></svg>',
  dash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="9" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="14" width="8" height="7" rx="1.5"/></svg>',
  todas:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  tend:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6" rx="1"/><rect x="13" y="7" width="3" height="10" rx="1"/></svg>',
  olho:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/></svg>',
  feed:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16M4 12h16M4 19h10"/><circle cx="19.5" cy="19" r="1.6"/></svg>',
  add:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12 19"/></svg>',
  equipe:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 20a5.5 5.5 0 0 0-3-4.9"/></svg>',
  cadastro:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
  cadeado:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>',
  aovivo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2"/></svg>',
  repete:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/></svg>',
  compromisso:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M12 12.5v5M9.5 15h5"/></svg>',
  lixo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  mais:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/></svg>',
  sair:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l5-5-5-5M15 12H4"/></svg>'
};
/* no celular a sidebar vira barra inferior: so os itens "prim" ficam a mostra, o resto vai para "Mais" */
const NAV_PRIM = ["cards","feed","prio","cal","lista"];
function navItem(key,label,icon,kind,on,n){
  const href = kind==="view" ? rotaDe({modo:key,escopo:null}) : rotaDe({area:key});
  return '<a class="snav'+(on?" on":"")+(NAV_PRIM.indexOf(key)>=0?" prim":"")+'" href="'+href+'" data-'+kind+'="'+key+'" title="'+esc(label)+'" aria-label="'+esc(label)+(n?' ('+n+')':'')+'"'+(on?' aria-current="page"':'')+'>'+
    '<span class="snav-i">'+icon+'</span><span class="snav-t">'+esc(label)+'</span>'+
    (n?'<span class="snav-b">'+n+'</span>':'')+'</a>';
}
function areasTopoHTML(){
  if(!USUARIO) return '';
  const areas=[["all","Visão geral",IC.todas],["mkt","Mkt Digital",IC.mkt],["fin","Financeiro",IC.fin],["com","Comercial",IC.com]]
    .filter(a=>podeArea(a[0]));
  if(areas.length<2) return '';
  return '<div class="abar"><span class="abar-pill" id="abarPill"></span>'+
    areas.map(a=>{
      const on=VISTA.area===a[0];
      /* dentro de um cliente, conta só o que é dele; fora, conta todo mundo */
      const universo = VISTA.escopo ? TODAS.filter(t=>t.clienteId===VISTA.escopo) : TODAS;
      const n=universo.filter(t=>(a[0]==="all"||naArea(t,a[0])) && (t.st.k==="atrasado"||t.st.k==="hoje")).length;
      return '<a class="abar-b'+(on?" on":"")+'" href="'+rotaDe({area:a[0]})+'" data-area="'+a[0]+'" role="tab" aria-selected="'+on+'"'+(n?' aria-label="'+escAttr(a[1])+', '+n+' urgentes"':'')+'>'+
        '<span class="abar-i">'+a[2]+'</span>'+esc(a[1])+
        (n?'<span class="abar-n">'+n+'</span>':'')+'</a>';
    }).join("")+'</div>';
}
window.addEventListener("resize",()=>{ try{ posicionarPill(); }catch(e){} }); // MK3_RESIZE_PILL
function posicionarPill(){
  const bar=$("areabar"); if(!bar) return;
  const pill=bar.querySelector(".abar-pill"), ativo=bar.querySelector(".abar-b.on");
  if(!pill||!ativo) return;
  requestAnimationFrame(()=>{
    pill.style.width=ativo.offsetWidth+"px";
    pill.style.transform="translateX("+ativo.offsetLeft+"px)";
    pill.style.opacity="1";
    /* no celular a barra rola: a area escolhida fica sempre a vista */
    const bx=bar.querySelector(".abar");
    if(bx && bx.scrollWidth>bx.clientWidth){ const l=ativo.offsetLeft-12; if(l<bx.scrollLeft||ativo.offsetLeft+ativo.offsetWidth>bx.scrollLeft+bx.clientWidth) bx.scrollLeft=l; }
  });
}
function sidebarHTML(){
  const c=VISTA.escopo?cliente(VISTA.escopo):null;
  const urg=tarefasArea().filter(t=>t.st.k==="atrasado"||t.st.k==="hoje"||t.st.k==="umdia").length;
  const views=[["cards","Clientes",IC.cards],["feed","Feed",IC.feed],["prio","Tarefas",IC.prio],
               ["lista","Dashboard",IC.dash],["cal","Agenda",IC.cal],
               ["equipe","Funcionários",IC.pessoas],["tend","Tendência",IC.tend]]
    .filter(v=>(v[0]!=="tend" && v[0]!=="equipe") || ehAdmin());
  /* botao de acao da sidebar: sempre com nome acessivel, mesmo com o menu recolhido */
  const bt=(attr,label,icon,cls,title)=>'<button class="snav'+(cls?" "+cls:"")+'" '+attr+' title="'+escAttr(title||label)+'" aria-label="'+escAttr(label)+'">'+
    '<span class="snav-i">'+icon+'</span><span class="snav-t">'+esc(label)+'</span></button>';
  let h='<div class="side-brand"><a class="b" href="'+rotaDe({modo:"cards",escopo:null})+'" data-view="cards" aria-label="MK3, ir para os clientes"><span>MK</span>3</a>'+
        '<button class="side-toggle" data-side="toggle" title="Recolher menu" aria-label="Recolher menu" aria-expanded="'+(!VISTA.side)+'">&#10094;</button></div>';
  h+='<button class="snav prim mais" data-maismenu="1" aria-label="Mais opções" aria-expanded="false"><span class="snav-i">'+IC.mais+'</span><span class="snav-t">Mais</span></button>';
  h+='<div class="side-sec">Ver</div>';
  h+=views.map(v=>navItem(v[0],v[1],v[2],"view",(!c&&VISTA.modo===v[0]),(v[0]==="prio"?urg:0))).join("");
  /* o funil e da area comercial: quem so tem marketing nao ve */
  if(podeComercial()) h+=navItem("funil","Funil de vendas",IC.com,"view",(!c&&VISTA.modo==="funil"),0);
  h+='<div class="side-sec">Criar</div>';
  h+=bt('data-demanda="1"',"Nova demanda",IC.add,"snav-add",ehAdmin()?"Nova demanda":"Nova demanda para você");
  h+=bt('data-recorrente="1"',"Demanda recorrente",IC.repete,"snav-add",ehAdmin()?"Demanda que se repete, para uma área ou uma pessoa":"Demanda que se repete, para você");
  if(ehAdmin()){
    h+=bt('data-compromisso="1"',"Novo compromisso",IC.compromisso,"snav-add","Novo compromisso na agenda");
    h+='<div class="side-sec">Administração</div>';
    h+=bt('data-clientes="1"',"Cadastro de clientes",IC.cadastro,"","Cadastrar, editar e arquivar clientes");
    h+=bt('data-equipe="1"',"Permissões da equipe",IC.cadeado,"","Quem vê o quê, PIN e foto de cada pessoa");
    /* a agenda ao vivo se liga sozinha pelo script do Google (conectarPainel): sem botão no menu */
    h+='<a class="snav'+(!c&&VISTA.modo==="portais"?" on":"")+'" href="'+rotaDe({modo:"portais",escopo:null})+'" data-portais="1" title="O que o cliente vê no portal dele" aria-label="Visão do cliente"'+(!c&&VISTA.modo==="portais"?' aria-current="page"':'')+'><span class="snav-i">'+IC.olho+'</span><span class="snav-t">Visão do cliente</span></a>';
    const nx=nExcluidas();
    if(nx) h+='<button class="snav" data-lixeira="1" title="Ver tarefas excluídas" aria-label="Tarefas excluídas ('+nx+')"><span class="snav-i">'+IC.lixo+'</span><span class="snav-t">Excluídas</span><span class="snav-b neutro">'+nx+'</span></button>';
  }
  const pu=eu();
  /* quem esta logado e o botao de sair dividem a mesma linha: o menu cabe numa tela de notebook */
  h+='<div class="side-user"><div class="su-quem"><span class="snav-i">'+faceDe(pu?pu.nome:"")+'</span><span class="snav-t">'+esc(pu?pu.nome:"")+
     '<i>'+(ehAdmin()?"Administração":esc(AREA_ROT[((pu&&pu.areas)||[])[0]]||""))+'</i></span>'+
     '<button class="su-sair" data-sair="1" title="Sair e trocar de pessoa" aria-label="Sair">'+IC.sair+'</button></div></div>';
  return h;
}

let MOVERMODO = true;      /* arrastar e replanejar movem por padrao */
/* comercial e area fechada: admin sempre, e quem tiver "com" nas areas */
function podeComercial(){
  if(ehAdmin()) return true;
  const p=eu(); return !!p && (p.areas||[]).indexOf("com")>=0;
}
const VISTA  = { pinPara:null, area:"all", escopo:null, aba:"cal", modo:"cards", feedDias:7, mes:0, dia:null, filtro:null, verTudo:false, edit:false, pano:null, pmes:0, psem:null, side:false };
const cliente = id => CLIENTES.find(c=>c.id===id);
/* demanda com cliente mora no balde "_dem", mas pertence ao cliente:
   sem isto ela some quando a equipe filtra por um cliente so */
const ehDoCliente = (t,cid) => t.clienteId===cid || t.cliDem===cid;
const tarefasCli  = c => TODAS.filter(t=>ehDoCliente(t,c.id) && areaMatch(t));
const tarefasArea = () => TODAS.filter(areaMatch);

/* ================= EDIÇÃO LOCAL (sem token; salva neste navegador) ================= */
let TODAS = [];
let ESTADO = { concluidas:{}, datas:{}, log:[] };
let UNDO = [], REDO = [];
const ORIG = JSON.parse(JSON.stringify(CLIENTES));
const CAMPOS_DATA = ["envioPlanejamento","aprovacaoPlanejamento","envioMidia","aprovacaoMidia","gravacao","alteracaoPedida"];
const ANCORA = {
  c1_plan:{campo:"envioPlanejamento", verbo:"Enviado ao cliente"},
  c1_aprPlan:{campo:"aprovacaoPlanejamento", verbo:"Cliente aprovou o planejamento"},
  c1_artes:{campo:"envioMidia", verbo:"Artes enviadas"},
  c1_aprMid:{campo:"aprovacaoMidia", verbo:"Cliente aprovou as artes"},
  c1_gravacao:{campo:"gravacao", verbo:"Gravado"}
};
/* foto so de fonte conhecida: data URL de imagem, pasta fotos/ do repo ou https.
   O valor vem do banco compartilhado; sem isto, um texto com aspas viraria codigo na tela de todos */
const fotoOk = f => typeof f==="string" && /^(data:image\/(png|jpe?g|webp|gif);base64,|fotos\/[\w.-]+$|https:\/\/)/i.test(f);
const urlOk  = u => typeof u==="string" && /^https?:\/\//i.test(u);
const escAttr = esc;   /* mesma coisa que esc: o nome fica por legibilidade nos atributos */


/* uma tarefa entregue pela metade e com o resto remarcado não é simplesmente "atrasada" */
/* indices montados uma vez por rebuild: antes cada tarefa varria ESTADO.dup e todas as semanas de obsT */
let IDX=null;
function construirIndices(){
  const dup={}, parc={};
  (ESTADO.dup||[]).forEach(e=>{ if(!e) return; const k=e.cid+"|"+e.tid; (dup[k]=dup[k]||[]).push(e); });
  const b=ESTADO.obsT||{};
  for(const wk in b){ const s0=b[wk]||{}; for(const k in s0){ if(s0[k]&&s0[k].parcial){ const p=k.split("|"); parc[p[0]+"|"+p[1]]=true; } } }
  return {dup, parc};
}
function dupDe(cid,tid){ return IDX ? (IDX.dup[cid+"|"+tid]||[]).slice() : (ESTADO.dup||[]).filter(e=>e.cid===cid && e.tid===tid); }
function temParcial(cid,tid){
  if(IDX) return !!IDX.parc[cid+"|"+tid];
  const b=ESTADO.obsT||{};
  for(const wk in b){
    const s=b[wk]||{};
    for(const k in s){
      if(s[k] && s[k].parcial && k.indexOf(cid+"|"+tid+"|")===0) return true;
    }
  }
  return false;
}
function remarcadaPara(cid,tid){
  const hoje=iso(HOJE);
  const l=dupDe(cid,tid)
    .sort((a,b)=>a.dia.localeCompare(b.dia));
  if(!l.length) return null;
  const futura=l.find(e=>e.dia>=hoje);
  return futura ? futura.dia : l[l.length-1].dia;   /* se ja passou, devolve a ultima mesmo assim */
}
/* replanejada cuja data nova ja passou: nao pode voltar a ser "futuro" nem sumir */
function replanVencido(cid,tid){
  const hoje=iso(HOJE);
  const l=dupDe(cid,tid).sort((a,b)=>a.dia.localeCompare(b.dia));
  if(!l.length) return null;
  if(l.some(e=>e.dia>=hoje)) return null;          /* ainda tem remarcacao no futuro */
  return l[l.length-1].dia;
}
/* remarcacao para antes da data original: o prazo que vale passa a ser o novo */
function antecipacao(cid,tid,dataOrig){
  const hoje=iso(HOJE);
  const l=dupDe(cid,tid).filter(e=>e.dia>=hoje && (!dataOrig || e.dia<dataOrig))
    .sort((a,b)=>a.dia.localeCompare(b.dia));
  return l.length?l[0].dia:null;
}
function ajustarReplan(t){
  /* tarefa movida: o dia novo e o unico que existe, inclusive para o status */
  const mv=movidaPara(t.clienteId,t.id);
  if(mv && mv!==t.data){
    const orig=t.data;
    t.data=mv;
    t.movidaDe=orig;
    t.st=status(t);
    if(t.st.k!=="ok") t.st.txt=t.st.txt+" · movida de "+fmt(orig);
    return t;
  }
  if(t.feita || t.st.k==="ok" || t.st.k==="parcial") return t;
  const ant=antecipacao(t.clienteId,t.id,t.data);
  if(ant){
    const st2=status({...t, data:ant});
    st2.txt=st2.txt+" · antecipada de "+fmt(t.data);
    st2.antecipada=t.data;
    t.st=st2;
    return t;
  }
  const q=replanVencido(t.clienteId,t.id);
  if(!q) return t;
  t.st={k:"replan", atraso:uteisEntre(q,iso(HOJE)), quando:null, resto:q,
        txt:"Replanejada para "+fmt(q)+" e venceu de novo"};
  return t;
}
function ajustarParcial(t){
  if(t.feita || t.st.k==="ok") return t;
  if(!temParcial(t.clienteId,t.id)) return t;
  const q=remarcadaPara(t.clienteId,t.id);
  if(!q) return t;                                   /* parcial sem remarcar continua atrasada */
  const hoje=iso(HOJE);
  if(q<hoje){
    const atr=uteisEntre(q,hoje);
    t.st={k:"atrasado", atraso:atr, quando:null, resto:q,
          txt:"Parcial · resto venceu "+fmt(q)};
  } else {
    t.st={k:"parcial", atraso:0, quando:null, resto:q,
          txt:"Parcial · resto em "+fmt(q)};
  }
  return t;
}
function rebuild(){
  IDX=construirIndices();
  try{ rebuildCore(); } finally { IDX=null; }
}
function rebuildCore(){
  const base = ORIG.concat((ESTADO.novosClientes||[]).map(c=>JSON.parse(JSON.stringify(c))));
  const ed = ESTADO.clientes||{};
  CLIENTES.length=0;
  base.forEach(o=>{
    const ov = ed[o.id]||{};
    if(ov.oculto) return;
    const c = JSON.parse(JSON.stringify(o));
    ["nome","segmento","entrada","vencimentoContrato","contrato","inicioContrato","mensalidade"].forEach(k=>{ if(ov[k]) c[k]=ov[k]; });
    /* contratos renovados pelo painel somam ao historico do dados.js */
    if(ov.contratosAnteriores) c.contratosAnteriores=(c.contratosAnteriores||[]).concat(
      ov.contratosAnteriores.filter(k=>!(c.contratosAnteriores||[]).some(x=>x.contrato===k.contrato)));
    c.concluidas=(o.concluidas||[]).slice();
    const dd=ESTADO.datas[c.id]||{};
    for(const k in dd){ if(dd[k]) c[k]=dd[k]; }
    c.__pendenteForcado=[];
    for(const e of (ESTADO.concluidas[c.id]||[])){
      c.concluidas=c.concluidas.filter(x=>((x&&x.id)?x.id:x)!==e.id);
      if(!e.remove) c.concluidas.push(e.data?{id:e.id,data:e.data}:e.id);
      else c.__pendenteForcado.push(e.id);
    }
    CLIENTES.push(c);
  });
  TODAS = CLIENTES.flatMap(c=>regras(c).map(t=>{ const as=areasDaTarefa(t); return ajustarParcial(ajustarReplan({...t, st:status(t), area:as[0], areas:as})); }))
    .filter(t=>((ESTADO.excluidas||{})[t.clienteId]||[]).indexOf(t.id)<0)
    .map(t=>{ const nv=((ESTADO.titulos||{})[t.clienteId]||{})[t.id];
              return nv ? {...t, tarefa:nv, tituloOriginal:t.tarefa} : t; });
  (ESTADO.demandas||[]).forEach(dm=>{
    if((((ESTADO.excluidas||{})["_dem"])||[]).indexOf(dm.id)>=0) return;
    const done=(ESTADO.concluidas["_dem"]||[]).filter(e=>((e&&e.id)?e.id:e)===dm.id).pop();
    const cli=dm.cli?CLIENTES.find(c=>c.id===dm.cli):null;
    const t={id:dm.id, clienteId:"_dem", cliDem:(cli?cli.id:null), cliente:(cli?cli.nome:dm.resp),
             tarefa:dm.texto, detalhe:(dm.obs||"Demanda"), obs:dm.obs||"", data:dm.data, resp:dm.resp,
             fase:"Demanda", area:dm.area, feita:!!(done&&!done.remove), dataConclusao:(done&&done.data)||null};
    t.st=status(t);
    TODAS.push(t);
  });
  /* demandas recorrentes: cada ocorrencia vira uma tarefa no balde "_rec" */
  ocorrenciasRec().forEach(t=>TODAS.push(t));
}


const tdOf = t => escAttr([t.cliente, (t.st&&t.st.txt), (t.data?fmt(t.data)+" "+dow(t.data):""), t.resp, t.detalhe].filter(Boolean).join(" · "));
const attrsEdit = t => ' data-editar="1" data-mcid="'+t.clienteId+'" data-mtid="'+escAttr(t.id)+'" data-tt="'+escAttr(t.tarefa||t.titulo||"")+'" data-td="'+tdOf(t)+'"';

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
const chaveLog = l => (l&&l.ts||"")+"|"+(l&&l.acao||"")+"|"+(l&&l.id||"")+"|"+(l&&l.quem||"");
function somarLog(a,b){
  const vistos=new Set(), out=[];
  const lista=v=>Array.isArray(v)?v:(ehObj(v)?Object.values(v):[]);
  lista(a).concat(lista(b)).forEach(l=>{ if(!l) return; const k=chaveLog(l); if(vistos.has(k)) return; vistos.add(k); out.push(l); });
  return out.sort((x,y)=>String(y.ts||"").localeCompare(String(x.ts||""))).slice(0,300);
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
  if(!(feitaEm && feitaEm<=iso(HOJE))) demandaParaGoogle(id);     /* vai para o Google Agenda tambem */
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
  demandaSaiDoGoogle(x);
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
          '<span class="pc-c">'+esc(c.segmento||"sem segmento")+' · '+esc(c.contrato||"contrato")+' até '+fmt(c.vencimentoContrato)+
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
    '<div class="cl-sec">Contrato vigente</div>'+
    '<label class="mlab">Número do contrato<input type="text" id="clCon" value="'+escAttr(c?(c.contrato||""):"")+'" placeholder="Ex.: CS00009/2026" autocomplete="off"></label>'+
    '<div class="cp-linha dois">'+
      '<label class="mlab">Início<input type="date" id="clIni" value="'+escAttr(c?(c.inicioContrato||""):"")+'"></label>'+
      '<label class="mlab">Vencimento<input type="date" id="clVen" value="'+escAttr(c?(c.vencimentoContrato||""):"")+'"></label></div>'+
    '<div class="cp-linha tres">'+
      '<label class="mlab">Mensalidade PIX (R$)<input type="number" min="0" step="1" id="clPix" value="'+escAttr(c&&c.mensalidade?c.mensalidade.valorPix:"")+'"></label>'+
      '<label class="mlab">Permuta (R$)<input type="number" min="0" step="1" id="clPerm" value="'+escAttr(c&&c.mensalidade?(c.mensalidade.valorPermuta||0):"")+'"></label>'+
      '<label class="mlab">Dia do vencimento<input type="number" min="1" max="31" id="clDia" value="'+escAttr(c&&c.mensalidade?c.mensalidade.diaVencimento:"")+'"></label></div>'+
    (c?'<p class="mhint">Trocou o número do contrato? O anterior fica guardado com as mensalidades dele.</p>':'')+
    '<div class="mbtns"><button data-macao="salvarcli" data-cliid="'+escAttr(c?c.id:"")+'">Salvar</button>'+
    '<button class="sec" data-macao="fecharcli">Cancelar</button></div></div>';
  mostrarModal(true);
}
function salvarCliente(id,dados){
  if(!ehAdmin()) return;
  snapshot();
  if(id){
    ESTADO.clientes=ESTADO.clientes||{};
    const atual=CLIENTES.find(x=>x.id===id);
    /* contrato renovado: o anterior vai para o historico, com as mensalidades dele */
    if(atual && dados.contrato && atual.contrato && dados.contrato!==atual.contrato && atual.inicioContrato){
      const ant={contrato:atual.contrato, inicio:atual.inicioContrato,
                 fim:addD(dados.inicioContrato||atual.vencimentoContrato||iso(HOJE),-1), mensalidade:atual.mensalidade||null};
      dados.contratosAnteriores=((ESTADO.clientes[id]||{}).contratosAnteriores||[]).concat([ant]);
    }
    ESTADO.clientes[id]={...(ESTADO.clientes[id]||{}), ...dados};
    const n=(ESTADO.novosClientes||[]).find(x=>x.id===id);
    if(n) Object.assign(n,dados);
    ESTADO.log.unshift({ts:new Date().toISOString(),cliente:id,acao:"cliente-editado",nome:dados.nome||id,quem:USUARIO||null});
  } else {
    const novoId="cli_"+Date.now();
    ESTADO.novosClientes=(ESTADO.novosClientes||[]).concat([{
      id:novoId, nome:dados.nome||"Cliente novo", marca:dados.nome||"", segmento:dados.segmento||"",
      plano:"", entrada:dados.entrada||iso(HOJE), contrato:dados.contrato||"", inicioContrato:dados.inicioContrato||dados.entrada||iso(HOJE),
      vencimentoContrato:dados.vencimentoContrato||null, mensalidade:dados.mensalidade||null,
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
  if(dm.foraAgenda && dm.data>=iso(HOJE)) delete dm.foraAgenda;   /* editou: volta a valer na agenda */
  persist(); rebuild(); render();
  demandaParaGoogle(id);
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
  if(dm.gid) demandaParaGoogle(id);
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
      ' '+donoHTML(e)+(e.meet?' <span class="ag-m" role="link" tabindex="0" data-abrir="'+escAttr(e.meet)+'">Meet</span>':'')+' '+btEditarAg(e)+'</div>').join("")+'</div>':'')+
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
    /* so grava o que o formulario tem: antes, salvar apagava objetivo, meta e links (campos que nao estavam na tela) */
    const val=id=>{ const e=$(id); return e ? String(e.value||"").trim() : undefined; };
    const dados={};
    const put=(k,v)=>{ if(v!==undefined) dados[k]=v; };
    put("nome",val("clNome")); put("segmento",val("clSeg")); put("entrada",val("clEnt"));
    put("contrato",val("clCon")); put("inicioContrato",val("clIni")||undefined);
    const ven=val("clVen"); if(ven!==undefined) dados.vencimentoContrato=ven||null;
    const pix=val("clPix"), perm=val("clPerm"), dia=val("clDia");
    if(pix!==undefined && pix!==""){
      if(!(Number(dia)>=1 && Number(dia)<=31)){ toast("Dia do vencimento tem que ser de 1 a 31",false); return; }
      dados.mensalidade={valorPix:Number(pix)||0, valorPermuta:Number(perm)||0, diaVencimento:Number(dia)};
    }
    if(dados.inicioContrato && dados.vencimentoContrato && dados.inicioContrato>dados.vencimentoContrato){
      toast("O início do contrato está depois do vencimento",false); return; }
    salvarCliente(D.cliid||null,dados);
    semPular(()=>abrirClientes()); toast("Cliente salvo",true); return;
  }
  if(D.macao==="fecharcli"){ semPular(()=>abrirClientes()); return; }
  if(D.macao==="salvarficha"){ salvarFicha(D.cliid); return; }
  if(D.macao==="salvaragenda"){ salvarAgendaUrl(); return; }
  if(D.macao==="criarcomp"){ criarCompromisso(); return; }
  if(D.macao==="apagarcomp"){ apagarCompromisso(); return; }
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
  cynthia:  ["#cbb693","#9a8461"],   // Cynthia — bege
  oceanus:  ["#2a30df","#1414a2"],   // Oceanus — azul da logo
  cli_1786128011208: ["#501e93","#30105c"],  // MK3 — roxo da marca
  cli_1786128681070: ["#0f3fb0","#001032"],  // Tyconnex — azul e marinho da marca
  marroquina:        ["#f9ae00","#20160a"]   // A Marroquina — dourado e marrom da marca
};
const coresDe = c => CORCLI[c.id] || coresSeg(c.segmento);
const iniciais = n => (n||"?").trim().split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase();

const FOTO_FIXA = {
  cynthia:"fotos/cynthia.jpg", suelem:"fotos/suelem.jpg",
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
  desremanejar:["desfez o remanejamento de","mv"], abasportal:["mudou o que o cliente vê em","obs"]
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
    const tiles = [
      ["atrasado","Atrasado", n(["atrasado"])],
      ["hoje","Hoje e amanhã", n(["hoje","umdia"])],
      ["semana","A fazer",    n(["semana","futuro","sem"])],
      ["ok","Concluído",      n(["ok"])]
    ];
    return '<a class="ccard" href="'+rotaDe({escopo:c.id,aba:"cal"})+'" data-cliente="'+c.id+'">'+
      '<div class="ccard-banner" style="background:linear-gradient(135deg,'+cor[0]+' 0%,'+cor[1]+' 100%)"></div>'+
      avatarHTML(c,"ccard-av")+
      '<div class="ccard-body">'+
        '<div class="ccard-top"><h3>'+esc(c.nome)+'</h3>'+seloCliente(c)+'</div>'+
        '<div class="ccard-stats">'+tiles.map(t=>
          '<div class="stat s-'+t[0]+'"><i></i><b>'+t[2]+'</b> '+t[1]+'</div>').join("")+'</div>'+
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
function calendario(tasks, marcos, showCli){
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
    const fds  = dt.getDay()===0 || dt.getDay()===6;
    const evs  = base.filter(t=>t.data===s);
    const mk   = marcos.filter(m=>m.data===s);
    const ags  = (VISTA.area==="all"||VISTA.area==="mkt") ? agendaVisivel().filter(e=>e.dia===s) : [];
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
    cells += '<div class="'+cls+(items.length?'':' vazia')+'" data-dia="'+s+'"><div class="n">'+dt.getDate()+'</div>'+evsHtml+extra+'</div>';
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
  ["onboarding","Onboarding por WhatsApp e por e-mail"],
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
  s+=bloco("AMANHA", amanha, linha);
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
function dashboardHTML(completo){
  const ts=tarefasArea();
  const n=k=>ts.filter(t=>t.st.k===k).length;
  const cards=BUCKETS.map((k,i)=>
    '<button class="kpi '+k+' '+(VISTA.filtro===k?"on":"")+'" data-bucket="'+k+'" style="animation-delay:'+(i*45)+'ms">'+
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
        '<div class="db-pl"><span class="db-pn mk3"><b>'+mk3+'</b>MK3</span>'+
        '<span class="db-pn cli"><b>'+cli+'</b>Cliente</span></div>'+
        '<div class="db-obs">dias úteis já consumados</div></div>'+
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
  if(t.fase==="Demanda") return VISTA.area==="all" || naArea(t,VISTA.area);
  if(VISTA.area==="fin" || VISTA.area==="com") return naArea(t,VISTA.area);
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

/* ---------------- RENDER ---------------- */
function tituloContexto(){
  const c=VISTA.escopo?cliente(VISTA.escopo):null;
  const A={all:"Visão geral · todas as áreas",...AREA_ROT};
  const V={cards:"Clientes",prio:"Tarefas da semana",equipe:"Funcionários",cal:"Agenda",lista:"Dashboard",tend:"Tendência de atrasos",feed:"Feed da equipe",portais:"Visão do cliente",funil:"Funil de vendas"};
  const AB={cal:"Calendário",tarefas:"Tarefas",marca:"Marca",tend:"Tendência",hist:"Histórico"};
  let t = c ? c.nome : (V[VISTA.modo]||"");
  const bits=[A[VISTA.area]||""];
  if(c) bits.unshift(AB[VISTA.aba]||"");
  else if(VISTA.modo==="prio" && VISTA.psem) bits.push(fmt(VISTA.psem).slice(0,5)+" a "+fmt(addD(VISTA.psem,4)).slice(0,5));
  else if(VISTA.modo==="cal"){ const r=new Date(HOJE.getFullYear(),HOJE.getMonth()+VISTA.mes,1);
    bits.push(r.toLocaleDateString("pt-BR",{month:"long",year:"numeric"})); }
  return '<h1 class="ctx-t">'+esc(t)+'</h1><div class="ctx-s">'+bits.filter(Boolean).map(esc).join(" · ")+'</div>';
}
function loginHTML(pendente){
  const ps=ESTADO.pessoas||[];
  const cargo=p=>p.admin?"Administra\u00e7\u00e3o":(AREA_ROT[(p.areas||[])[0]]||"Sem \u00e1rea");
  if(pendente){
    const p=ps.find(x=>x.nome===pendente)||{nome:pendente};
    return '<div class="login"><div class="login-box">'+
      '<div class="login-av">'+faceDe(p.nome)+'</div>'+
      '<h2>Ol\u00e1, '+esc(p.nome)+'</h2><p>Digite seu PIN para entrar.</p>'+
      '<input type="password" id="pinInput" inputmode="numeric" maxlength="8" placeholder="PIN" autocomplete="off">'+
      '<div id="pinErro" class="login-erro" role="alert"></div>'+
      '<div class="login-acoes"><button data-pinok="'+escAttr(pendente)+'">Entrar</button>'+
      '<button class="sec" data-pincancel="1">Voltar</button></div></div></div>';
  }
  return '<div class="login"><div class="login-box wide">'+
    '<h2>Quem est\u00e1 usando?</h2><p>Cada pessoa v\u00ea apenas as \u00e1reas dela.</p>'+
    '<div class="login-lista">'+ps.map(p=>
      '<button class="login-p" data-entrar="'+escAttr(p.nome)+'">'+faceDe(p.nome)+
      '<span class="lp-n">'+esc(p.nome)+'</span><span class="lp-c">'+esc(cargo(p))+'</span>'+
      (p.pin?'<span class="lp-pin" title="Protegido por PIN">&#128274;</span>':'')+'</button>').join("")+
    '</div></div></div>';
}
function animar(){
  const el=document.getElementById("view"); if(!el) return;
  const reduz = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* números contando */
  el.querySelectorAll("[data-num]").forEach(n=>{
    const alvo=+n.getAttribute("data-num")||0;
    const fmtN=v=>Number(v).toLocaleString("pt-BR");
    if(reduz || alvo<=0 || !TELA_NOVA){ n.textContent=fmtN(alvo); return; }
    const dur=Math.min(900, 260+Math.min(alvo,40)*18); const ini=performance.now();
    const passo=t=>{ const p=Math.min(1,(t-ini)/dur);
      n.textContent=fmtN(Math.round(alvo*(1-Math.pow(1-p,3))));
      if(p<1) requestAnimationFrame(passo); };
    requestAnimationFrame(passo);
  });
  /* barras e anel crescendo (so na tela nova; num redesenho ja nascem no tamanho certo) */
  const aplicar=()=>{
    el.querySelectorAll("[data-alt]").forEach(b=>{ if(!TELA_NOVA) b.style.transition="none"; b.style.height=b.getAttribute("data-alt")+"%"; });
    el.querySelectorAll("[data-larg]").forEach(b=>{ if(!TELA_NOVA) b.style.transition="none"; b.style.width=b.getAttribute("data-larg")+"%"; });
    el.querySelectorAll("[data-arco]").forEach(a=>{ if(!TELA_NOVA) a.style.transition="none"; a.style.strokeDashoffset=a.getAttribute("data-arco"); });
  };
  if(TELA_NOVA && !reduz) requestAnimationFrame(aplicar); else aplicar();
}
/* so troca o HTML quando ele mudou: menu e barras nao sao recriados a cada clique */
function pintar(el,html){ if(!el) return; if(el.__h===html) return; el.innerHTML=html; el.__h=html; }
/* animacao de entrada so quando a tela muda de verdade; marcar uma tarefa nao faz o dashboard "piscar" */
let ULTIMA_TELA="", ANIM_T=null, TELA_NOVA=false;
function marcarTela(){
  const k=[USUARIO,VISTA.modo,VISTA.escopo,VISTA.aba,VISTA.area].join("|");
  TELA_NOVA = k!==ULTIMA_TELA; ULTIMA_TELA=k;
  const v=$("view"), sd=$("side");
  if(TELA_NOVA){ [v,sd].forEach(e=>e&&e.classList.add("anim")); clearTimeout(ANIM_T);
    ANIM_T=setTimeout(()=>[v,sd].forEach(e=>e&&e.classList.remove("anim")),900); }
}
function render(){
  document.body.classList.remove("menu-aberto");      /* navegar fecha o menu "Mais" do celular */
  marcarTela();
  if(!USUARIO){
    pintar($("ctx"),''); $("editbar").innerHTML=''; pintar($("side"),''); pintar($("areabar"),'');
    $("view").innerHTML = loginHTML(VISTA.pinPara);
    const pi=document.getElementById("pinInput"); if(pi&&pi.focus) setTimeout(()=>pi.focus(),30);
    return;
  }
  pintar($("ctx"), tituloContexto());
  $("editbar").innerHTML =
    '<button class="ubtn" data-undo="1"'+(UNDO.length?"":" disabled")+' title="Desfazer">&#8624; Desfazer</button>'+
    '<button class="ubtn" data-redo="1"'+(REDO.length?"":" disabled")+' title="Refazer">&#8625; Refazer</button>'+
    (ehAdmin()?'<button class="ubtn rec" data-recado="1" title="Texto pronto para o grupo">&#9998; Recado do dia</button>':'')+
    '<span class="salvo" id="salvo" aria-live="polite"></span>'+
    '<span class="syncst" id="syncst" title="Sincronização entre a equipe"></span>'+
    (agendaUrl()?'<span class="agviva" id="agviva">agenda ao vivo</span>':'')+
    ultimaAlteracaoHTML();
  marcarSync(SYNC_ON?"ligado":(window.firebase?"offline":"local"));
  pintar($("side"), sidebarHTML());
  pintar($("areabar"), areasTopoHTML());
  posicionarPill();

  const c = VISTA.escopo ? cliente(VISTA.escopo) : null;

  if(!c){
    let body;
    if((VISTA.modo==="tend"||VISTA.modo==="equipe"||VISTA.modo==="portais") && !ehAdmin()) VISTA.modo="lista";
    if(VISTA.modo==="funil" && !podeComercial()) VISTA.modo="lista";
    if(VISTA.modo==="equipe")     body = funcionariosHTML();
    else if(VISTA.modo==="tend")  body = tendenciaHTML();
    else if(VISTA.modo==="prio")  body = prioridadesHTML();
    else if(VISTA.modo==="cards") body = '<div class="cards">'+cardsHTML()+'</div>';
    else if(VISTA.modo==="feed")  body = feedHTML();
    else if(VISTA.modo==="portais") body = portaisHTML();
    else if(VISTA.modo==="funil")   body = (typeof funilHTML==="function" ? funilHTML() : '');
    else if(VISTA.modo==="cal")   body = calendario(tarefasArea(), marcosDaArea(CLIENTES.flatMap(x=>x.marcos)), true);
    else                          body = listaGlobalHTML();
    $("view").innerHTML = avisoGravacaoHTML()+body; animar(); gravarRota();
    return;
  }

  const cor = coresDe(c);
  const tabs = [["cal","Calendário"],["tarefas","Tarefas"],["marca","Marca"],["tend","Tendência"],["hist","Histórico"]]
    .filter(t=>t[0]!=="tend" || ehAdmin());
  const bar =
    '<div class="cli-bar"><a class="voltar" href="'+rotaDe({escopo:null,modo:"cards"})+'" data-nav="home">&larr; Todos os clientes</a>'+
    '<div class="cli-title">'+avatarHTML(c,"cli-av2")+
      '<strong>'+esc(c.nome)+'</strong></div>'+linksHTML(c,"topo")+
    '<div class="cli-tabs">'+tabs.map(t=>
      '<a class="'+(VISTA.aba===t[0]?"on":"")+'" href="'+rotaDe({aba:t[0]})+'" data-cliaba="'+t[0]+'">'+t[1]+'</a>').join("")+'</div></div>';

  const body = VISTA.aba==="cal" ? calendario(tarefasCli(c), marcosDaArea(c.marcos), false)
             : VISTA.aba==="marca" ? fichaHTML(c)
             : VISTA.aba==="tarefas" ? (onboardingHTML(c)+tarefasHTML(c))
             : (VISTA.aba==="tend" && ehAdmin()) ? tendenciaHTML()
             : histHTML(c);
  $("view").innerHTML = bar + body; animar(); gravarRota();
}


/* ---------------- ROTAS (endereço da página) ----------------
   Permite ctrl+clique / clique do meio abrir em outra aba, e o voltar do navegador funcionar. */
let ROTA_APLICANDO=false;
function rotaAtual(){
  const a = VISTA.area && VISTA.area!=="all" ? "/"+VISTA.area : "";
  if(VISTA.escopo) return "#/cliente/"+encodeURIComponent(VISTA.escopo)+"/"+(VISTA.aba||"cal")+a;
  return "#/"+(VISTA.modo||"cards")+a;
}
function rotaDe(op){
  const v = {modo:VISTA.modo, area:VISTA.area, escopo:VISTA.escopo, aba:VISTA.aba, ...op};
  const a = v.area && v.area!=="all" ? "/"+v.area : "";
  if(v.escopo) return "#/cliente/"+encodeURIComponent(v.escopo)+"/"+(v.aba||"cal")+a;
  return "#/"+(v.modo||"cards")+a;
}
function gravarRota(){
  if(ROTA_APLICANDO || !USUARIO) return;
  const r=rotaAtual();
  if(location.hash===r) return;
  ROTA_APLICANDO=true;
  /* primeira tela depois do login só ajusta o endereço; as seguintes viram histórico,
     para o voltar e o avançar do navegador andarem dentro do painel */
  try{ if(!location.hash) history.replaceState(null,"",r); else history.pushState(null,"",r); }
  catch(e){ location.hash=r.slice(1); }
  ROTA_APLICANDO=false;
}
window.addEventListener("popstate", ()=>{
  if(!USUARIO) return;
  if(aplicarRota()){ VISTA.filtro=null; VISTA.dia=null; VISTA.verTudo=false; ROTA_APLICANDO=true; render(); ROTA_APLICANDO=false; }
});
function aplicarRota(){
  const h=(location.hash||"").replace(/^#\/?/,"");
  if(!h) return false;
  const p=h.split("/").filter(Boolean).map(decodeURIComponent);
  const areas=["all","mkt","fin","com"];
  const modos=["cards","feed","prio","equipe","lista","cal","tend","portais","funil"];
  const abas=["cal","tarefas","marca","tend","hist"];
  let mudou=false;
  if(p[0]==="cliente" && p[1]){
    if(cliente(p[1])){ VISTA.escopo=p[1]; mudou=true;
      if(p[2] && abas.indexOf(p[2])>=0) VISTA.aba=p[2];
      if(p[3] && areas.indexOf(p[3])>=0 && podeArea(p[3])) VISTA.area=p[3];
    }
  } else if(p[0] && modos.indexOf(p[0])>=0){
    VISTA.escopo=null; VISTA.modo=p[0]; mudou=true;
    if(p[1] && areas.indexOf(p[1])>=0 && podeArea(p[1])) VISTA.area=p[1];
  }
  if((VISTA.modo==="tend"||VISTA.modo==="equipe"||VISTA.modo==="portais") && !ehAdmin()) VISTA.modo="lista";
  if(VISTA.aba==="tend" && !ehAdmin()) VISTA.aba="cal";
  return mudou;
}
window.addEventListener("hashchange", ()=>{
  if(ROTA_APLICANDO || !USUARIO) return;
  if(aplicarRota()){ VISTA.filtro=null; VISTA.dia=null; VISTA.verTudo=false; render(); }
});
/* ctrl/cmd/shift+clique e clique do meio: deixa o navegador abrir em outra aba */
const novaAba = ev => ev.metaKey||ev.ctrlKey||ev.shiftKey||ev.button===1;

/* ---------------- CLIQUES ---------------- */
document.addEventListener("click", function(ev){
  if(ev.target && ev.target.id==="dfeita"){
    const cx=$("dfdata"); if(cx) cx.disabled = !ev.target.checked;
    return;
  }
  const alvo = ev.target.closest("[data-area],[data-modo],[data-cliente],[data-cliaba],[data-nav],[data-mes],[data-dia],[data-bucket],[data-editar],[data-feed],[data-mvmodo],[data-desrem],[data-irorig],[data-usaragenda],[data-relatorio],[data-relmes],[data-gerarlink],[data-abacli],[data-plano],[data-planomes],[data-macao],[data-undo],[data-redo],[data-wkok],[data-wkx],[data-nota],[data-vermotivo],[data-view],[data-area],[data-side],[data-dropx],[data-demanda],[data-recorrente],[data-recpausa],[data-recx],[data-demx],[data-demlimpa],[data-demobs],[data-demedit],[data-obst],[data-editarobst],[data-parcial],[data-delt],[data-excl],[data-rename],[data-restaurar],[data-lixeira],[data-clientes],[data-clied],[data-clinovo],[data-cliocultar],[data-clirestaurar],[data-veobs],[data-editarmotivo],[data-editarobs],[data-equipe],[data-trocarfoto],[data-pessoax],[data-pessoaxok],[data-pinrm],[data-rowok],[data-mover],[data-atrasadas],[data-portais],[data-recado],[data-abrir],[data-ficha],[data-irmes],[data-agenda],[data-atribuir],[data-compromisso],[data-agedit],[data-avisar],[data-resp],[data-copiar],[data-novolink],[data-permb],[data-mesmover],[data-removedup],[data-motivo],[data-entrar],[data-pinok],[data-pincancel],[data-sair],[data-maismenu],[data-veratrasadas],[data-toastundo],[data-vertudo],[data-limpafiltro],[data-feitacheck]");
  if(!alvo) return;
  if(alvo.tagName==="A" && alvo.getAttribute("href") && novaAba(ev)) return;   /* abrir em outra aba */
  if(alvo.tagName==="A") ev.preventDefault();
  const D = alvo.dataset;

  if(D.entrar){ tentarEntrar(D.entrar); return; }
  if(D.pinok){
    const v=(($("pinInput")&&$("pinInput").value)||"").trim();
    const p=(ESTADO.pessoas||[]).find(x=>x.nome===D.pinok); const nome=D.pinok;
    pinConfere(p,v).then(ok=>{ if(p && ok){ entrar(nome); }
      else { const er=document.getElementById("pinErro"); if(er) er.textContent="PIN incorreto."; const pi=document.getElementById("pinInput"); if(pi){pi.value="";pi.focus();} } });
    return;
  }
  if(D.pincancel){ VISTA.pinPara=null; render(); return; }
  if(D.maismenu){ const ab=document.body.classList.toggle("menu-aberto"); ev.target.closest("[data-maismenu]").setAttribute("aria-expanded",ab); return; }
  if(D.veratrasadas){ if(VISTA.escopo) VISTA.aba="tarefas"; else VISTA.modo="lista"; VISTA.filtro="atrasado"; render(); window.scrollTo({top:0}); return; }
  if(D.sair){ sair(); return; }
  if(D.macao){ handleModal(D); return; }
  if(D.wkok){ marcarFeitoSemana(D.mcid,D.mtid,D.mday); return; }
  if(D.wkx){
    const jaX=xInfo(segOf(D.mday),D.mcid,D.mtid,D.mday);
    if(jaX){ neutralizar(D.mcid,D.mtid,D.mday); return; }
    abrirMotivo(D.mcid,D.mtid,D.mday); return;
  }
  if(D.vermotivo){ abrirMotivoLeitura(D.mcid,D.mtid,D.mday); return; }
  if(D.nota){ abrirNota(D.nota); return; }
  if(D.dia){ abrirDia(D.dia); return; }
  if(D.dropx){ removeDup(D.mcid,D.mtid,D.mday); return; }
  if(D.rowok){ concluirRapido(D.mcid,D.mtid); return; }
  if(D.mover){ MOVERMODO=true; abrirMover(D.mcid,D.mtid,D.mday); return; }   /* cada abertura comeca em Mover */
  if(D.atrasadas){ abrirAtrasadas(D.mday); return; }
  if(D.toastundo){ desfazer(); fecharToast(); return; }
  if(D.vertudo){ VISTA.verTudo=true; render(); return; }
  if(D.limpafiltro){ VISTA.filtro=null; render(); return; }
  if(D.demanda){ if(!USUARIO) return; abrirDemanda(D.demdia); return; }
  if(D.recorrente){ if(!USUARIO) return; abrirRecorrente(); return; }
  if(D.recpausa){ pausarRecorrente(D.recpausa); semPular(abrirRecorrente); return; }
  if(D.recx){ removerRecorrente(D.recx); semPular(abrirRecorrente); return; }
  if(D.equipe){ if(!ehAdmin()) return; abrirEquipe(); return; }
  if(D.motivo){ semPular(()=>abrirMotivo(D.mcid,D.mtid,D.mday,D.motivo)); return; }
  if(D.removedup){ semPular(()=>{ removeDup(D.mcid,D.mtid,D.mday); abrirMover(D.mcid,D.mtid,null,D.mday.slice(0,7)); }); toast("Cópia removida",true); return; }
  if(D.mesmover){ semPular(()=>abrirMover(D.mcid,D.mtid,D.mday||null,D.mesmover)); return; }
  if(D.permb){
    const p=(ESTADO.pessoas||[]).find(x=>x.nome===D.pnome); if(!p) return;
    const atual = D.permb==="admin" ? !!p.admin : ((p.areas||[]).indexOf(D.permb)>=0);
    setPerm(D.pnome, D.permb, !atual); return;
  }
  if(D.portais){ VISTA.escopo=null; VISTA.modo="portais"; VISTA.filtro=null; render(); window.scrollTo({top:0,behavior:"smooth"}); return; }
  if(D.recado){ abrirRecado(); return; }
  if(D.agenda){ abrirAgendaConfig(); return; }
  if(D.compromisso){ abrirCompromisso(VISTA.dia||null); return; }
  if(D.agedit){ ev.preventDefault(); ev.stopPropagation(); editarCompromisso(D.agedit); return; }
  if(D.resp!==undefined && alvo.classList.contains("cp-p")){ ev.preventDefault();
    if(alvo.classList.contains("on")) alvo.classList.remove("on"); else alvo.classList.add("on"); return; }
  if(D.avisar){ ev.preventDefault(); const el=alvo;          /* cada interruptor liga o proprio (avisar, Meet) */
    if(el){ const on=el.classList.contains("on");
      if(on) el.classList.remove("on"); else el.classList.add("on");
      el.setAttribute("aria-checked", String(!on)); } return; }
  if(D.atribuir){ return; }   /* o select responde no change, não no clique */
  if(D.abrir){ ev.preventDefault(); ev.stopPropagation(); window.open(D.abrir,"_blank","noopener"); return; }
  if(D.ficha){ abrirFicha(D.ficha); return; }
  if(D.novolink){ trocarLink(D.novolink); return; }
  if(D.copiar){
    const txt=D.copiar;
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(()=>toast("Link copiado",false),()=>{});
    else { const i=document.createElement("textarea"); i.value=txt; document.body.appendChild(i); i.select(); try{document.execCommand("copy");}catch(e){} i.remove(); toast("Link copiado",false); }
    return;
  }
  if(D.trocarfoto){ fotoAlvo=D.trocarfoto; const fi=$("fotoInput"); if(fi){ fi.value=""; fi.click(); } return; }
  if(D.pessoax){ confirmarRemoverPessoa(D.pessoax); return; }
  if(D.pinrm){ const n=D.pinrm; setPin(n,"").then(()=>semPular(abrirEquipe)); return; }
  if(D.pessoaxok){ const n=D.pessoaxok; semPular(()=>{ removePessoa(n); abrirEquipe(); }); toast(n+" removida da equipe",true); return; }
  if(D.demx){ const veio=modalAberto()&&/Demanda ·/.test(($("modal")||{}).innerHTML||"");
    semPular(()=>{ removeDemanda(D.demx); if(veio) fecharModal(); else abrirDemanda(); }); return; }
  if(D.demlimpa){ semPular(()=>{ limparDemandasFeitas(); abrirDemanda(); }); return; }
  if(D.demobs){ abrirObsDemanda(D.demobs, true); return; }
  if(D.demedit){
    const dm=(ESTADO.demandas||[]).find(x=>x.id===D.demedit);
    if(!podeEditarDem(dm)){ toast("Só dá para editar demanda que você mesmo criou",false); return; }
    abrirEditarDemanda(D.demedit); return;
  }
  if(D.rename){ const p=D.rename.split("|"); abrirRenomear(p[0],p[1]); return; }
  if(D.delt){ const p=D.delt.split("|"); confirmarExcluir(p[0],p[1]); return; }
  if(D.excl){ const p=D.excl.split("|"); excluirTarefa(p[0],p[1]); fecharModal(); return; }
  if(D.restaurar){ const p=D.restaurar.split("|"); restaurarTarefa(p[0],p[1]); return; }
  if(D.lixeira){ abrirExcluidas(); return; }
  if(D.clientes){ abrirClientes(); return; }
  if(D.clied){ abrirClienteForm(D.clied); return; }
  if(D.clinovo){ abrirClienteForm(null); return; }
  if(D.cliocultar){ ocultarCliente(D.cliocultar,true); return; }
  if(D.clirestaurar){ ocultarCliente(D.clirestaurar,false); return; }
  if(D.obst){ const p=D.obst.split("|"); abrirObsTarefa(p[0],p[1],p[2]); return; }
  if(D.editarobst){ const p=D.editarobst.split("|"); abrirObsTarefa(p[0],p[1],p[2],true); return; }
  if(D.parcial){
    const p=D.parcial.split("|"); const o=obsInfo(p[0],p[1],p[2])||{txt:"",parcial:false};
    const txt=($("obsT")&&$("obsT").value)||o.txt||"";
    setObsTarefa(p[0],p[1],p[2],txt,!o.parcial);
    semPular(()=>abrirObsTarefa(p[0],p[1],p[2],true));
    setTimeout(()=>{ const c=document.querySelector(".chkp"); if(c) c.focus(); },40);   /* o foco volta para a caixa */
    return;
  }
  if(D.veobs){ abrirObsDemanda(D.veobs); return; }
  if(D.editarmotivo){ abrirMotivo(D.mcid,D.mtid,D.mday); return; }
  if(D.editarobs){ abrirObsDemanda(D.editarobs, true); return; }
  if(D.side==="toggle"){ VISTA.side=!VISTA.side; try{localStorage.setItem("mk3_side",VISTA.side?"1":"0");}catch(e){} const ap=$("app"); if(ap) ap.classList.toggle("side-col",VISTA.side); return; }
  if(D.view){ if((D.view==="tend"||D.view==="equipe") && !ehAdmin()) return; VISTA.escopo=null; VISTA.modo=D.view; VISTA.filtro=null; VISTA.dia=null; VISTA.verTudo=false; render(); window.scrollTo({top:0,behavior:"smooth"}); return; }
  if(D.area){ if(!podeArea(D.area)) return; if(VISTA.area===D.area) return;
    VISTA.area=D.area; VISTA.filtro=null; VISTA.dia=null; VISTA.verTudo=false;
    /* a área é só um filtro: mantém a seção e o cliente abertos */
    semPular(render); return; }
  if(D.feed){ VISTA.feedDias=Number(D.feed)||7; semPular(render); return; }
  if(D.mvmodo!==undefined){ MOVERMODO=(D.mvmodo==="1");
    if(D.mcid&&D.mtid) semPular(()=>abrirMover(D.mcid,D.mtid,null,null)); return; }
  if(D.desrem){ const p=D.desrem.split("|"); desfazerRemanejo(p[0],p[1]); return; }
  if(D.irorig){                       /* a etiqueta laranja volta para o dia de origem */
    const o=D.irorig, r0=d(o);
    VISTA.psem=segOf(o); VISTA.pano=r0.getFullYear(); VISTA.pmes=r0.getMonth();
    VISTA.dia=o; VISTA.filtro=null;
    render();
    setTimeout(()=>{
      const col=document.querySelector('[data-daycol="'+o+'"]');
      if(col){ col.classList.add("pisca"); col.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"});
               setTimeout(()=>col.classList.remove("pisca"),1600); }
    },60);
    return;
  }
  if(D.usaragenda){ const p=D.usaragenda.split("|"); usarDataDaAgenda(p[0],p[1]); return; }
  if(D.relatorio){ const p=D.relatorio.split("|"); abrirRelatorio(p[0],p[1]); return; }
  if(D.relmes){ const p=D.relmes.split("|"); semPular(()=>abrirRelatorio(p[0],p[1])); return; }
  if(D.abacli){ const p=D.abacli.split("|"); alternarAba(p[0],p[1]); return; }
  if(D.gerarlink){ if(!ehAdmin()) return; snapshot(); garantirToken(D.gerarlink);
    ESTADO.log.unshift({ts:new Date().toISOString(),cliente:D.gerarlink,acao:"novolink",nome:"Link do portal criado",quem:USUARIO||null});
    persist(); publicarEspelho(); semPular(render); toast("Link criado",true); return; }
  if(D.plano){ const p=D.plano.split("|"); abrirPlano(p[0],p[1]); return; }
  if(D.planomes){ const p=D.planomes.split("|"); semPular(()=>abrirPlano(p[0],p[1])); return; }
  if(D.editar){ abrirEditor(D.mcid, D.mtid); return; }
  if(D.undo){ desfazer(); return; }
  if(D.redo){ refazer(); return; }

  let topo = true;

  if(D.cliente){ VISTA.escopo=D.cliente; VISTA.aba=D.irAba||"cal"; VISTA.mes=0; VISTA.dia=null; VISTA.filtro=null; }   /* o link do Feed abre direto nas tarefas */
  if(D.nav==="home"){ VISTA.escopo=null; VISTA.filtro=null; VISTA.dia=null; }
  if(D.cliaba){ if(D.cliaba==="tend" && !ehAdmin()) return; VISTA.aba=D.cliaba; VISTA.filtro=null; VISTA.dia=null; }
  if(D.irmes!==undefined){ VISTA.mes=Number(D.irmes); VISTA.dia=null; topo=false; }
  else if(D.mes!==undefined){ const nn=Number(D.mes); VISTA.mes=(nn===0)?0:VISTA.mes+nn; VISTA.dia=null; topo=false; }
  if(D.bucket){ VISTA.filtro=(VISTA.filtro===D.bucket)?null:D.bucket; topo=false; }

  render();
  if(topo) window.scrollTo({top:0,behavior:"smooth"});
});

document.addEventListener("change", function(ev){
  if(ev.target.closest("[data-recform]")){ recForm(); return; }
  const pm=ev.target.closest("[data-perm]");
  if(pm){ setPerm(pm.dataset.pnome, pm.dataset.perm, pm.checked); return; }
  const pn=ev.target.closest("[data-pin]");
  if(pn){ const nm=pn.dataset.pin; if(!pn.value.trim()) return; setPin(nm, pn.value).then(()=>semPular(abrirEquipe)); return; }
  const el=ev.target.closest("[data-sel]"); if(!el) return;
  const w=el.dataset.sel, v=el.value;
  if(w==="ano"){ VISTA.pano=Number(v); const ws=semanasDoMes(VISTA.pano,VISTA.pmes); VISTA.psem=ws[0]||VISTA.psem; }
  else if(w==="mes"){ VISTA.pmes=Number(v); const ws=semanasDoMes(VISTA.pano,VISTA.pmes); VISTA.psem=ws[0]||VISTA.psem; }
  else if(w==="semana"){ VISTA.psem=v; }
  render();
});

/* drag por ponteiro (funciona no mouse real e é robusto) */
let DRAG=null;
function limparDragover(){ document.querySelectorAll(".bcol.dragover,.bcol.dragno").forEach(x=>{x.classList.remove("dragover");x.classList.remove("dragno");}); }
document.addEventListener("mousedown", function(e){
  const card=e.target&&e.target.closest&&e.target.closest("[data-drag]");
  if(!card) return;
  if(e.target.closest("button")) return;   // clicar nos botões não arrasta
  e.preventDefault();
  const r=card.getBoundingClientRect();
  const ghost=card.cloneNode(true); ghost.classList.add("drag-ghost"); ghost.style.width=r.width+"px";
  document.body.appendChild(ghost);
  DRAG={data:card.getAttribute("data-drag"), ghost, ox:e.clientX-r.left, oy:e.clientY-r.top, moved:false, card};
  ghost.style.left=(e.clientX-DRAG.ox)+"px"; ghost.style.top=(e.clientY-DRAG.oy)+"px";
});
document.addEventListener("mousemove", function(e){
  if(!DRAG) return;
  if(!DRAG.moved){ DRAG.moved=true; DRAG.card.classList.add("dragging"); document.body.classList.add("arrastando"); DRAG.ghost.classList.add("on"); }
  DRAG.ghost.style.left=(e.clientX-DRAG.ox)+"px"; DRAG.ghost.style.top=(e.clientY-DRAG.oy)+"px";
  const el=document.elementFromPoint(e.clientX,e.clientY);
  const col=el&&el.closest?el.closest("[data-daycol]"):null;
  limparDragover();
  if(col){
    const p=DRAG.data.split("|");
    const t=TODAS.find(x=>x.clienteId===p[0]&&x.id===p[1]);
    const dia=col.getAttribute("data-daycol");
    col.classList.add(podeReplanejar(t,dia)?"dragover":"dragno");
  }
});
document.addEventListener("mouseup", function(e){
  if(!DRAG) return;
  const st=DRAG; DRAG=null;
  st.ghost.remove(); st.card.classList.remove("dragging"); document.body.classList.remove("arrastando"); limparDragover();
  if(!st.moved) return;
  const el=document.elementFromPoint(e.clientX,e.clientY);
  const col=el&&el.closest?el.closest("[data-daycol]"):null;
  if(!col) return;
  const p=st.data.split("|");
  const dest=col.getAttribute("data-daycol");
  if(moverTarefa(p[0],p[1],dest)) toast("Movida para "+fmt(dest),true);
});

/* ---- atalhos de teclado (4.3) ---- */
function abrirAtalhos(){
  const L=[["?","Esta lista de atalhos"],["N","Nova demanda"],["T","Ir para hoje / semana atual"],
           ["&larr; &rarr;","Semana ou mês anterior / seguinte"],["Esc","Fechar janela ou dica"],
           ["Ctrl+Z","Desfazer"],["Ctrl+Shift+Z","Refazer"]];
  const mm=$("modal");
  mm.innerHTML='<div class="mbox atalhos"><h3>Atalhos de teclado</h3>'+
    '<p class="msub">Funcionam quando você não está digitando num campo.</p>'+
    L.map(a=>'<div class="at-row"><span>'+a[1]+'</span><span class="kbd">'+a[0]+'</span></div>').join("")+
    '<div class="mbtns"><button class="sec" data-macao="fechar">Fechar</button></div></div>';
  mostrarModal();
}
document.addEventListener("change", function(ev){
  const s=ev.target.closest("[data-atribuir]");
  if(s) atribuirEvento(s.dataset.atribuir, s.value);
});
document.addEventListener("keydown", function(e){
  if(e.key==="Enter" && e.target && e.target.id==="pinInput"){
    const nome=VISTA.pinPara; const v=(e.target.value||"").trim();
    const p=(ESTADO.pessoas||[]).find(x=>x.nome===nome); const alvo=e.target;
    pinConfere(p,v).then(ok=>{ if(p && ok) entrar(nome);
      else { const er=document.getElementById("pinErro"); if(er) er.textContent="PIN incorreto."; alvo.value=""; } });
    return;
  }
  const tag=(e.target.tagName||"").toLowerCase();
  /* span com papel de link/caixa: Enter e Espaco fazem o mesmo que o clique */
  if((e.key==="Enter"||e.key===" ") && tag==="span" && /^(link|checkbox|button)$/.test(e.target.getAttribute("role")||"")){
    e.preventDefault(); e.target.click(); return; }
  const digitando = tag==="input"||tag==="textarea"||tag==="select"||e.target.isContentEditable;
  if(e.key==="Escape"){ if(modalAberto()){ fecharModal(); return; } fecharToast(); return; }
  if(digitando) return;
  if(!USUARIO) return;
  const mod=e.ctrlKey||e.metaKey;
  if(mod && (e.key==="z"||e.key==="Z")){ e.preventDefault(); if(e.shiftKey) refazer(); else desfazer(); return; }
  if(mod) return;
  if(e.key==="?"){ e.preventDefault(); abrirAtalhos(); return; }
  if(modalAberto()) return;
  if(e.key==="n"||e.key==="N"){ e.preventDefault(); abrirDemanda(); return; }
  if(e.key==="t"||e.key==="T"){
    if(VISTA.modo==="prio"){ VISTA.pano=HOJE.getFullYear(); VISTA.pmes=HOJE.getMonth(); VISTA.psem=segOf(iso(HOJE)); }
    else VISTA.mes=0;
    render(); return;
  }
  if(e.key==="ArrowLeft"||e.key==="ArrowRight"){
    const d1=e.key==="ArrowRight"?1:-1;
    if(VISTA.modo==="prio"&&!VISTA.escopo){ VISTA.psem=addD(VISTA.psem,7*d1); const r=d(VISTA.psem); VISTA.pano=r.getFullYear(); VISTA.pmes=r.getMonth(); }
    else { VISTA.mes+=d1; VISTA.dia=null; }
    render(); return;
  }
});

let fotoAlvo=null;
(function(){ const fi=document.getElementById("fotoInput"); if(!fi) return;
  fi.addEventListener("change", function(e){
    const f=e.target.files&&e.target.files[0]; if(!f||!fotoAlvo) return;
    const rd=new FileReader();
    rd.onload=function(){ const img=new Image();
      img.onload=function(){ const s=Math.min(img.width,img.height),sx=(img.width-s)/2,sy=(img.height-s)/2;
        const cv=document.createElement("canvas"); cv.width=128; cv.height=128;
        cv.getContext("2d").drawImage(img,sx,sy,s,s,0,0,128,128);
        setFotoPessoa(fotoAlvo, cv.toDataURL("image/jpeg",0.82)); fotoAlvo=null; semPular(()=>abrirEquipe()); };
      img.src=rd.result; };
    rd.readAsDataURL(f);
  });
})();

init();
