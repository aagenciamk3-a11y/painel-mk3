/* ═══════════════════════════════════════════════════════════════
   ESTADO — os dados dos clientes.
   Esta é a ÚNICA parte que muda quando você me avisa de algo.
   As regras de prazo ficam em motor.js e não mudam por cliente.
   ═══════════════════════════════════════════════════════════════ */

const CLIENTES = [

  /* ─────────────── ADRIANA · LOJA DINHA MAIS ─────────────── */
  {
    id: "adriana",
    nome: "Dinha Mais",
    marca: "Loja Dinha Mais",

    segmento: "Varejo",                   // loja Dinha Mais / Dinha Sports
    plano: "6 artes + 2 Reels/mês",       // contrato CS00003/2025, cláusula 1.1
    entrada: "2026-06-22",

    /* CONTRATO CS00003/2025 — vigência 20/06/2026 a 20/09/2026 (3 meses) */
    contrato: "CS00003/2025",
    inicioContrato: "2026-07-20",          // 1ª mensalidade em 20/07 (a de 20/06 estava errada)
    vencimentoContrato: "2026-09-20",
    mensalidade: {valorPix: 1000, valorPermuta: 500, diaVencimento: 20},

    /* O contrato CS00003/2025 exclui o agendamento (cláusula 1.1), mas a MK3
       decidiu agendar para todos os clientes. Padrão do painel: agendar.
       O contrato dos próximos precisa refletir isso. */
    escopo: {agendamento:true, calendarioEditorial:false, trafegoPago:false},

    imersao: "2026-06-22",
    reuniaoPlanejamentoEntrada: "2026-06-30",

    /* datas REAIS — re-ancoram a cadeia e alimentam o registro de atraso */
    envioPlanejamento:     "2026-07-13",
    aprovacaoPlanejamento: "2026-07-13",
    envioMidia:            null,
    aprovacaoMidia:        null,

    /* as artes dependem das fotos: só começam a contar depois da gravação */
    gravacao: "2026-07-16",
    artesDependemDaGravacao: true,

    /* o 1º ciclo dela ainda está rodando, então o calendário padrão
       (relatório + reunião mensal) só começa em agosto */
    inicioCicloPadrao: "2026-08",

    /* atrasos justificados: continuam registrados, mas não contam no placar */
    justificados: [
      {etapa:"Entrega das artes", motivo:"Dependência das fotos da gravação, aprovado pela gestão"}
    ],

    concluidas: ["pasta","grupo","boasvindas","onboarding","acessos","prints","reserva",
                 "pesq1","pesq2","imersao","imersaoDoc","reuniaoPlan",
                 "c1_plan","c1_lembPlan","c1_aprPlan","c1_roteiro","c1_gravacao"],

    marcos: [
      {data:"2026-06-22", titulo:"Entrada do cliente",        detalhe:"Contrato assinado"},
      {data:"2026-06-22", titulo:"Reunião de imersão",        detalhe:"Entrevista de branding"},
      {data:"2026-06-30", titulo:"Reunião de planejamento 1", detalhe:"Ciclo de julho"},
      {data:"2026-07-13", titulo:"Planejamento entregue",     detalhe:"Enviado à cliente"},
      {data:"2026-07-13", titulo:"Planejamento aprovado",     detalhe:"Aprovado no mesmo dia"},
      {data:"2026-07-16", titulo:"Gravação + fotos",          detalhe:"Insumo para as artes do mês"}
    ]
  },

  /* ─────────────── SUELEM · CORRETORA DE IMÓVEIS ─────────────── */
  {
    id: "suelem",
    nome: "Suelem",
    marca: "Suelem Corretora de Imóveis",

    segmento: "Corretor",                          // Vila Velha / Cariacica · ES
    plano: "6 artes + 2 Reels/mês + 2 campanhas de tráfego",
    /* Cliente desde mai/2025 (CS00001). Renovação nova firmada hoje;
       usamos a assinatura de hoje como âncora do contrato atual. */
    entrada: "2026-07-15",

    /* RENOVAÇÃO 07/2026 — aguardando assinatura. Vigência 3 meses. */
    contrato: "Renovação 07/2026 (aguardando assinatura)",
    inicioContrato: "2026-07-15",
    vencimentoContrato: "2026-10-15",
    mensalidade: {valorPix: 2200, valorPermuta: 0, diaVencimento: 20},

    /* Plano reformulado com tráfego pago (2 campanhas básicas). Pacote de
       fotos (R$ 600 em 3x de R$ 200) registrado à parte, nos marcos. */
    escopo: {agendamento:true, calendarioEditorial:false, trafegoPago:true},

    /* cliente antiga: sem nova imersão. Âncora do ciclo de julho = aprovação
       do planejamento de hoje (planejamento enviado e aprovado no mesmo dia). */
    imersao: null,
    reuniaoPlanejamentoEntrada: "2026-07-15",

    envioPlanejamento:     "2026-07-15",
    aprovacaoPlanejamento: "2026-07-15",
    envioMidia:            "2026-07-16",   // artes enviadas para aprovação
    aprovacaoMidia:        null,

    /* vídeos de julho já produzidos; artes não dependem de nova gravação */
    gravacao: null,
    artesDependemDaGravacao: false,

    /* ciclo mensal padrão (relatório + reunião + planejamento) começa em agosto */
    inicioCicloPadrao: "2026-08",

    justificados: [],

    concluidas: ["pasta","grupo","boasvindas","onboarding","acessos","prints","reserva",
                 "pesq1","pesq2","imersao","imersaoDoc","reuniaoPlan",
                 "c1_plan","c1_lembPlan","c1_aprPlan","c1_roteiro","c1_gravacao","c1_artes","c1_lembMid"],

    /* pacote de fotos profissional: R$ 600 em 3x de R$ 200 — repasse ao fornecedor */
    tarefasExtras: [
      {id:"fotos_2026-07", fase:"Contrato", tarefa:"Pagar fornecedor de fotos — R$ 200 (1/3)", detalhe:"Pacote de fotos profissional · repassar ao fornecedor", data:"2026-07-20", resp:"Financeiro"},
      {id:"fotos_2026-08", fase:"Contrato", tarefa:"Pagar fornecedor de fotos — R$ 200 (2/3)", detalhe:"Pacote de fotos profissional · repassar ao fornecedor", data:"2026-08-20", resp:"Financeiro"},
      {id:"fotos_2026-09", fase:"Contrato", tarefa:"Pagar fornecedor de fotos — R$ 200 (3/3)", detalhe:"Pacote de fotos profissional · repassar ao fornecedor", data:"2026-09-20", resp:"Financeiro"}
    ],

    marcos: [
      {data:"2025-05-30", titulo:"Cliente desde 2025",             detalhe:"Primeiro contrato CS00001/2025"},
      {data:"2026-07-15", titulo:"Renovação de contrato",          detalhe:"Novo plano R$ 2.200 + 2 campanhas de tráfego · aguardando assinatura"},
      {data:"2026-07-15", titulo:"Planejamento de julho aprovado", detalhe:"Aprovado no mesmo dia"},
      {data:"2026-07-15", titulo:"Produção de julho",              detalhe:"Vídeos já produzidos; artes em produção, seguem para o Pode Postar após aprovação"},
      {data:"2026-07-20", titulo:"Pacote de fotos 1/3",            detalhe:"R$ 200 · parcela 1 de 3"},
      {data:"2026-08-20", titulo:"Pacote de fotos 2/3",            detalhe:"R$ 200 · parcela 2 de 3"},
      {data:"2026-09-20", titulo:"Pacote de fotos 3/3",            detalhe:"R$ 200 · parcela 3 de 3"}
    ]
  },

  /* ─────────────── LEONARDO DE PAULA · CORRETOR ─────────────── */
  {
    id: "leonardo",
    nome: "Leonardo de Paula",
    marca: "Leonardo de Paula Negócios Imobiliários",

    segmento: "Corretor",                       // Cariacica / Grande Vitória · ES
    plano: "8 artes + 3 Reels/mês",             // contrato CS00012/2025
    /* cliente desde jan/2026; ancorado no ponto atual (renovação pendente) */
    entrada: "2026-01-14",

    /* CONTRATO CS00012/2025 — vigência original 14/01 a 14/07/2026 (6 meses),
       VENCIDO em 14/07. Renovação registrada como pendência atrasada (tarefasExtras).
       Vencimento abaixo é uma continuação PROVISÓRIA (6 meses, mesmo valor) só para
       manter o fluxo normal deste cliente até a renovação ser fechada. */
    contrato: "CS00012/2025 (vencido 14/07 · renovação pendente)",
    inicioContrato: "2026-07-15",
    vencimentoContrato: "2027-01-14",
    mensalidade: {valorPix: 1980, valorPermuta: 0, diaVencimento: 15},

    escopo: {agendamento:true, calendarioEditorial:false, trafegoPago:false},

    /* cliente antigo: sem nova imersão. Âncora do ciclo atual = envio do
       planejamento (09/07). Enviado 09/07, cobrado e aprovado 13/07. */
    imersao: null,
    reuniaoPlanejamentoEntrada: "2026-07-09",

    envioPlanejamento:     "2026-07-09",
    aprovacaoPlanejamento: "2026-07-13",
    envioMidia:            "2026-07-14",   // artes entregues terça
    aprovacaoMidia:        "2026-07-16",   // artes aprovadas
    alteracaoPedida:       "2026-07-17",   // cliente pediu alteração hoje · 2 dias úteis p/ devolver

    gravacao: null,
    artesDependemDaGravacao: false,

    /* novo ciclo (relatório + reunião + planejamento) a partir de agosto */
    inicioCicloPadrao: "2026-08",

    justificados: [],

    /* renovação do contrato entra como pendência ATRASADA */
    tarefasExtras: [
      {id:"renovacao_atrasada", fase:"Contrato", tarefa:"Renovar contrato (venceu 14/07)", detalhe:"CS00012/2025 encerrou 14/07/2026 · renovação pendente", data:"2026-07-14", resp:"Gestão"}
    ],

    concluidas: ["pasta","grupo","boasvindas","onboarding","acessos","prints","reserva",
                 "pesq1","pesq2","imersao","imersaoDoc","reuniaoPlan",
                 "c1_plan","c1_lembPlan","c1_aprPlan","c1_roteiro","c1_artes",
                 "c1_lembMid","c1_aprMid","c1_podepostar","c1_calendario","reserva3m","pesq6m"],

    marcos: [
      {data:"2026-01-14", titulo:"Cliente desde 2026",     detalhe:"Contrato CS00012/2025"},
      {data:"2026-07-09", titulo:"Planejamento enviado",   detalhe:"Conteúdo escrito enviado para aprovação"},
      {data:"2026-07-13", titulo:"Planejamento aprovado",  detalhe:"Cobrado dia 13 e aprovado; 1 publicação marcada em ajuste (cliente não informou o que ajustar)"},
      {data:"2026-07-14", titulo:"Artes entregues",        detalhe:"Enviadas para aprovação; aguardando retorno"}
    ]
  },

  /* ─────────────── CYNTHIA CARVALHO · CORRETORA (VITÓRIA) ─────────────── */
  {
    id: "cynthia",
    nome: "Cynthia Carvalho",
    marca: "Cynthia Carvalho — Corretora de Imóveis",

    segmento: "Corretor",                      // Vitória/ES · Remax Foccus · médio/alto padrão
    plano: "6 artes + 2 Reels/mês",            // contrato CS00004/2025
    entrada: "2026-06-22",                      // grupo criado + onboarding enviado

    contrato: "CS00004/2025",
    inicioContrato: "2026-07-15",               // contrato alterado (data mudada a pedido dela)
    vencimentoContrato: "2026-10-15",
    mensalidade: {valorPix: 1500, valorPermuta: 0, diaVencimento: 20},

    /* o contrato exclui agendamento, mas a MK3 agenda para todos (Pode Postar) */
    escopo: {agendamento:true, calendarioEditorial:false, trafegoPago:false},

    /* imersão remarcada 2x por falta da cliente; realizada em 06/07 (a pedido dela) */
    imersao: "2026-07-06",
    reuniaoPlanejamentoEntrada: "2026-07-10",   // âncora do ciclo (planejamento enviado 13/07)

    envioPlanejamento:     "2026-07-13",
    aprovacaoPlanejamento: "2026-07-17",         // aprovado hoje — 2 dias úteis após o limite (15/07)
    envioMidia:            null,
    aprovacaoMidia:        null,

    gravacao: "2026-07-23",
    semFotos: true,                 // gravação só, sem fotos
    artesDependemDaGravacao: false, // as artes dela NÃO dependem da gravação

    inicioCicloPadrao: "2026-08",

    justificados: [],

    /* c1_aprPlan com data -> painel mostra "Concluído · atrasou N dias úteis" */
    concluidas: ["pasta","grupo","boasvindas","onboarding","acessos","prints","reserva",
                 "pesq1","pesq2","imersao","imersaoDoc","reuniaoPlan",
                 "c1_plan","c1_lembPlan",
                 {id:"c1_aprPlan", data:"2026-07-17"}],

    marcos: [
      {data:"2026-06-22", titulo:"Entrada do cliente",        detalhe:"Grupo criado e onboarding enviado"},
      {data:"2026-06-26", titulo:"Imersão remarcada",         detalhe:"Cliente não compareceu; pediu desculpas"},
      {data:"2026-07-02", titulo:"Imersão remarcada",         detalhe:"Cliente não compareceu novamente"},
      {data:"2026-07-06", titulo:"Reunião de imersão",        detalhe:"Realizada às 11:15, a pedido da cliente"},
      {data:"2026-07-13", titulo:"Planejamento enviado",      detalhe:"Para aprovação no Pode Postar"},
      {data:"2026-07-15", titulo:"Contrato alterado",         detalhe:"Data ajustada a pedido da cliente e reenviado"},
      {data:"2026-07-17", titulo:"Planejamento aprovado + contrato assinado", detalhe:"Aprovado hoje (com atraso); contrato assinado"},
      {data:"2026-07-23", titulo:"Gravação marcada",       detalhe:"Diária de gravação agendada pela cliente"}
    ]
  },

  /* ─────────────── ESCOLA OCEANUS ─────────────── */
  {
    id: "oceanus",
    nome: "Oceanus",
    marca: "Escola Oceanus",

    segmento: "Escola",                          // Serra/ES
    plano: "Plano Básico + 1 diária de captação/mês",  // contrato CS00016/2026
    entrada: "2026-02-12",

    contrato: "CS00016/2026",
    inicioContrato: "2026-02-12",
    vencimentoContrato: "2026-08-12",
    mensalidade: {valorPix: 3100, valorPermuta: 0, diaVencimento: 15},

    escopo: {agendamento:true, calendarioEditorial:false, trafegoPago:false},

    /* cliente antiga (desde fev). Sem novo 1º ciclo; o planejamento do mês
       corrente está em atraso, registrado abaixo em tarefasExtras. */
    imersao: null,
    reuniaoPlanejamentoEntrada: null,

    envioPlanejamento:     null,
    aprovacaoPlanejamento: null,
    envioMidia:            null,
    aprovacaoMidia:        null,

    gravacao: null,
    artesDependemDaGravacao: false,

    inicioCicloPadrao: "2026-09",                // contrato encerra em ago; sem novo ciclo padrão

    justificados: [],

    /* PLANEJAMENTO EM ATRASO (17 dias) */
    tarefasExtras: [
      {id:"plan_atraso", fase:"1º ciclo", tarefa:"Criar e enviar o planejamento (EM ATRASO)", detalhe:"Planejamento do mês atrasado", data:"2026-06-30", resp:"Analista"}
    ],

    concluidas: ["pasta","grupo","boasvindas","onboarding","acessos","prints","reserva",
                 "pesq1","pesq2","imersao","imersaoDoc","reuniaoPlan",
                 "reserva3m","pag_2026-02-15","pag_2026-03-15","pag_2026-04-15","pag_2026-05-15","pag_2026-06-15"],

    marcos: [
      {data:"2026-02-12", titulo:"Entrada do cliente", detalhe:"Contrato CS00016/2026 · Escola Oceanus (Serra/ES)"}
    ]
  }
];
