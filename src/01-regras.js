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

/* ---- feriados nacionais: não são dia útil ----
   Fixos (Lei 662/49, 6.802/80 e 14.759/23) + Sexta-feira Santa (móvel, pela Páscoa). */
const FERIADOS_FIXOS = {"01-01":"Confraternização Universal","04-21":"Tiradentes","05-01":"Dia do Trabalho",
  "09-07":"Independência","10-12":"Nossa Senhora Aparecida","11-02":"Finados","11-15":"Proclamação da República",
  "11-20":"Consciência Negra","12-25":"Natal"};
const pascoa = ano => {   /* algoritmo de Meeus/Butcher */
  const a=ano%19,b=Math.floor(ano/100),c=ano%100,dd=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),
        h=(19*a+b-dd-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),
        mes=Math.floor((h+l-7*m+114)/31),dia=((h+l-7*m+114)%31)+1;
  return new Date(ano,mes-1,dia);
};
const _feriadosAno = {};
const feriadosDoAno = ano => {
  if(_feriadosAno[ano]) return _feriadosAno[ano];
  const o={};
  for(const k in FERIADOS_FIXOS) o[ano+"-"+k]=FERIADOS_FIXOS[k];
  const sexta=pascoa(ano); sexta.setDate(sexta.getDate()-2); o[iso(sexta)]="Sexta-feira Santa";
  return (_feriadosAno[ano]=o);
};
/* nome do feriado naquele dia (ou "") */
const feriado = s => { if(!s) return ""; const t=typeof s==="string"?s:iso(s); return feriadosDoAno(Number(t.slice(0,4)))[t]||""; };
/* dia útil = segunda a sexta e não é feriado nacional */
const ehUtil = x => { const w=x.getDay(); return w!==0 && w!==6 && !feriado(iso(x)); };

/* soma N dias ÚTEIS (pula sábado, domingo e feriado) */
const uteis = (s,n) => {
  if(!s) return null;
  let x = d(s), c = 0;
  while(c < n){ x.setDate(x.getDate()+1); if(ehUtil(x)) c++; }
  return iso(x);
};
const PRAZO = 2;

/* quantos dias ÚTEIS separam o limite da data real (0 = no prazo) */
const uteisEntre = (limite, real) => {
  if(!limite || !real || real <= limite) return 0;
  let n=0, x=d(limite);
  while(iso(x) < real){ x.setDate(x.getDate()+1); if(ehUtil(x)) n++; }
  return n;
};
/* dias UTEIS de hoje ate a data (negativo = ja passou, em dias corridos) */
const uteisAte = s => {
  const n=dias(s); if(n<=0) return n;
  let c=0, x=new Date(HOJE);
  for(let i=0;i<n;i++){ x.setDate(x.getDate()+1); if(ehUtil(x)) c++; }
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
  add("onboarding","Entrada","Enviar onboarding","Mensagem e PDF no grupo de WhatsApp",D0,"Estagiário");
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
  add("imersao","Entrada","Reunião de imersão","Google Meet · link enviado no grupo de WhatsApp",c.imersao,"Analista");
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

