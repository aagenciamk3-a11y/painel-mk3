/* ═══════════════════════════════════════════════════════════════
   ESTADO — os dados dos clientes.
   Esta é a ÚNICA parte que muda quando você me avisa de algo.
   As regras de prazo ficam em motor.js e não mudam por cliente.
   ═══════════════════════════════════════════════════════════════ */

const CLIENTES = [

  /* ─────────────── ADRIANA · LOJA DINHA MAIS ─────────────── */
  {
    id: "adriana",
    nome: "Adriana",
    marca: "Loja Dinha Mais",

    segmento: "Varejo",                   // loja Dinha Mais / Dinha Sports
    plano: "6 artes + 2 Reels/mês",       // contrato CS00003/2025, cláusula 1.1
    entrada: "2026-06-22",

    /* CONTRATO CS00003/2025 — vigência 20/06/2026 a 20/09/2026 (3 meses) */
    contrato: "CS00003/2025",
    inicioContrato: "2026-06-20",
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
                 "c1_plan","c1_lembPlan","c1_aprPlan"],

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
    envioMidia:            null,          // artes ainda em produção
    aprovacaoMidia:        null,

    /* vídeos de julho já produzidos; artes não dependem de nova gravação */
    gravacao: null,
    artesDependemDaGravacao: false,

    /* ciclo mensal padrão (relatório + reunião + planejamento) começa em agosto */
    inicioCicloPadrao: "2026-08",

    justificados: [],

    concluidas: ["pasta","grupo","boasvindas","onboarding","acessos","prints","reserva",
                 "pesq1","pesq2","imersao","imersaoDoc","reuniaoPlan",
                 "c1_plan","c1_lembPlan","c1_aprPlan","c1_roteiro","c1_gravacao"],

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
  }
];
