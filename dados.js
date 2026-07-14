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
  }
];
