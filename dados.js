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
    plano: "Essência Avançado · 8 artes + 3 Reels/mês",   // contrato CS00008/2026, cláusula 1.1
    entrada: "2026-06-22",

    /* CONTRATO CS00008/2026 (M R Confecções, dona da Dinha Mais e Dinha Sports)
       vigência 06/10/2026 a 06/04/2027 (6 meses) · tráfego de cortesia 06/10/2026 a 06/01/2027 */
    contrato: "CS00008/2026",
    inicioContrato: "2026-10-06",
    vencimentoContrato: "2027-04-06",
    mensalidade: {valorPix: 1400, valorPermuta: 500, diaVencimento: 20},
    /* o contrato anterior continua gerando as mensalidades dele (historico de pagamento) */
    contratosAnteriores: [
      {contrato:"CS00003/2025", inicio:"2026-07-20", fim:"2026-09-20", mensalidade:{valorPix:1000, valorPermuta:500, diaVencimento:20}}
    ],

    /* O contrato CS00003/2025 exclui o agendamento (cláusula 1.1), mas a MK3
       decidiu agendar para todos os clientes. Padrão do painel: agendar.
       O contrato dos próximos precisa refletir isso. */
    escopo: {agendamento:true, calendarioEditorial:false, trafegoPago:true},   // tráfego: cortesia até 06/01/2027

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

    /* Contrato de 07/2026, vigência 3 meses. Confirmado em 08/10/2026: NÃO vai renovar,
       a Suelem sai no fim da vigência (15/10/2026). */
    contrato: "Contrato 07/2026 (sem renovação)",
    semRenovacao: true,
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

    concluidas: ["pasta","planilha","grupo","boasvindas","onboarding","acessos","prints","reserva",
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

  /* ─────────────── CYNTHIA CARVALHO · CORRETORA (VITÓRIA) ─────────────── */
  {
    id: "cynthia",
    nome: "Cynthia Carvalho",
    marca: "Cynthia Carvalho — Corretora de Imóveis",

    segmento: "Corretor",                      // Vitória/ES · Remax Foccus · médio/alto padrão
    plano: "10 artes + 5 Reels/mês + stories + tráfego básico",   // contrato CS00007/2026
    entrada: "2026-06-22",                      // grupo criado + onboarding enviado

    /* CONTRATO CS00007/2026 — 6 meses, de 20/09/2026 a 20/03/2027 (cláusula 2.1) */
    contrato: "CS00007/2026",
    inicioContrato: "2026-09-20",
    vencimentoContrato: "2027-03-20",
    mensalidade: {valorPix: 3100, valorPermuta: 0, diaVencimento: 20},
    contratosAnteriores: [
      {contrato:"CS00004/2025", inicio:"2026-07-15", fim:"2026-09-19", mensalidade:{valorPix:1500, valorPermuta:0, diaVencimento:20}}
    ],

    /* tráfego pago básico (3 campanhas/mês); não inclui calendário editorial */
    escopo: {agendamento:true, calendarioEditorial:false, trafegoPago:true},

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
    concluidas: ["pasta","planilha","grupo","boasvindas","onboarding","acessos","prints","reserva",
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
    plano: "10 artes + 7 Reels/mês + 2 diárias de captação + tráfego",  // contrato CS00006/2026
    entrada: "2026-02-12",

    /* CONTRATO CS00006/2026 — 12 meses, de 12/08/2026 a 12/08/2027, em continuidade ao CS00016/2026 */
    contrato: "CS00006/2026",
    inicioContrato: "2026-08-12",
    vencimentoContrato: "2027-08-12",
    mensalidade: {valorPix: 4300, valorPermuta: 0, diaVencimento: 5},
    contratosAnteriores: [
      {contrato:"CS00016/2026", inicio:"2026-02-12", fim:"2026-08-11", mensalidade:{valorPix:3100, valorPermuta:0, diaVencimento:15}}
    ],

    escopo: {agendamento:true, calendarioEditorial:true, trafegoPago:true},

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
      {id:"plan_atraso", fase:"1º ciclo", tarefa:"Criar e enviar o planejamento (EM ATRASO)", detalhe:"Planejamento do mês atrasado", data:"2026-06-30", resp:"Analista"},
      {id:"envPlanej_2026-08", fase:"Ciclo padrão", tarefa:"Enviar planejamento ao cliente", detalhe:"Ciclo agosto de 2026 · entregue em duas partes", data:"2026-08-03", resp:"Analista"}
    ],

    concluidas: ["pasta","planilha","grupo","boasvindas","onboarding","acessos","prints","reserva",
                 "pesq1","pesq2","imersao","imersaoDoc","reuniaoPlan",
                 "reserva3m","pag_2026-02-15","pag_2026-03-15","pag_2026-04-15","pag_2026-05-15","pag_2026-06-15"],

    marcos: [
      {data:"2026-02-12", titulo:"Entrada do cliente", detalhe:"Contrato CS00016/2026 · Escola Oceanus (Serra/ES)"}
    ]
  },

  /* ─────────────── A MARROQUINA · COSMÉTICOS PARA UNHAS ─────────────── */
  {
    id: "marroquina",
    nome: "A Marroquina",
    marca: "Marroquina Profissional",

    segmento: "Cosméticos",                 // unha em gel e henna · venda nacional
    plano: "Presença — R$ 3.800/mês (5% de desconto por 12 meses: R$ 3.610)",
    entrada: "2026-09-28",                  // assinatura + reunião de imersão

    /* CONTRATO CS00008/2026 — vigência 01/10/2026 a 01/10/2027 (12 meses) */
    contrato: "CS00008/2026",
    inicioContrato: "2026-10-01",
    vencimentoContrato: "2027-10-01",
    mensalidade: {valorPix: 3610, valorPermuta: 0, diaVencimento: 7},

    escopo: {agendamento:true, calendarioEditorial:false, trafegoPago:true},

    imersao: "2026-09-28",
    reuniaoPlanejamentoEntrada: "2026-09-30",

    /* datas REAIS — a cadeia se re-ancora a partir delas */
    envioPlanejamento:     null,
    aprovacaoPlanejamento: null,
    envioMidia:            null,
    aprovacaoMidia:        null,

    gravacao: null,
    artesDependemDaGravacao: false,

    /* 1º ciclo rodando em outubro; ciclo padrão começa em novembro */
    inicioCicloPadrao: "2026-11",

    justificados: [],

    /* pendências que estão do lado do cliente e travam a produção */
    tarefasExtras: [
      {id:"preparadores", fase:"1º ciclo", tarefa:"Alterar arte dos 5 preparadores", detalhe:"Aguardando do cliente: faca, arte antiga, logo nova e dizeres de fabricação · prazo MK3 de 2 dias úteis após o recebimento", data:"2026-10-02", resp:"Design"},
      {id:"catalogo", fase:"1º ciclo", tarefa:"Montar catálogo institucional", detalhe:"Aguardando a lista descritiva do que deve compor o catálogo", data:"2026-10-07", resp:"Design"},
      {id:"evento_1810", fase:"1º ciclo", tarefa:"Material do evento de 18/10 (alunas da Leí)", detalhe:"Único evento confirmado · aguardando dados específicos da Giovana", data:"2026-10-10", resp:"Analista"}
    ],

    concluidas: ["pasta","imersao","imersaoDoc","reuniaoPlan","pesq1","pesq2"],

    marcos: [
      {data:"2026-09-28", titulo:"Entrada do cliente",        detalhe:"Plano Presença · R$ 3.800/mês com 5% de desconto por 12 meses = R$ 3.610 · retorno de cliente antiga"},
      {data:"2026-09-28", titulo:"Reunião de imersão",        detalhe:"Diagnóstico: qualidade alta, autoridade de marca baixa · foco na nail designer"},
      {data:"2026-09-30", titulo:"Reunião de planejamento 1", detalhe:"Henna 1.3 como foco · géis prioritários: Control Cover, Classic Cover, Clear Hard e Gel Básico"},
      {data:"2026-10-18", titulo:"Evento alunas da Leí",      detalhe:"Único evento confirmado · produtos específicos para as alunas"},
      {data:"2026-11-09", titulo:"Evento Guarapari (a confirmar)", detalhe:"Aguardando posicionamento do organizador"},
      {data:"2026-12-08", titulo:"Evento Henrique (a confirmar)",  detalhe:"Formato de participação em definição"}
    ]
  },

  /* ─────────────── SOLUTION FILMES · PRODUTORA AUDIOVISUAL ─────────────── */
  {
    id: "solution",
    nome: "Solution Filmes",
    marca: "Solution Filmes",

    segmento: "Audiovisual",                // produtora: foto e vídeo institucional, VT, websérie, mobile
    plano: "Interno",                       // empresa dos sócios da MK3: sem contrato e sem mensalidade
    entrada: "2026-10-01",                  // imersão parte 1

    contrato: "",
    inicioContrato: "2026-10-01",
    vencimentoContrato: null,
    mensalidade: null,

    escopo: {agendamento:true, calendarioEditorial:true, trafegoPago:true},

    imersao: "2026-10-01",                  // parte 1 · parte 2 em 06/10
    reuniaoPlanejamentoEntrada: "2026-10-06",

    /* datas REAIS — a cadeia se re-ancora a partir delas */
    envioPlanejamento:     null,
    aprovacaoPlanejamento: null,
    envioMidia:            null,
    aprovacaoMidia:        null,

    gravacao: null,
    artesDependemDaGravacao: false,

    /* 1º ciclo rodando em outubro; ciclo padrão começa em novembro */
    inicioCicloPadrao: "2026-11",

    justificados: [],

    tarefasExtras: [
      {id:"linkedin", fase:"1º ciclo", tarefa:"Criar e configurar o LinkedIn da Solution", detalhe:"Canal desejado na imersão · perfil da empresa", data:"2026-10-20", resp:"Analista"},
      {id:"formatos", fase:"1º ciclo", tarefa:"Reunião de formatos de conteúdo", detalhe:"Combinada na reunião de 06/10 · definir os formatos fixos do Instagram", data:"2026-10-16", resp:"Analista"}
    ],

    concluidas: ["pasta","planilha",{id:"grupo",data:"2026-10-09"},{id:"boasvindas",data:"2026-10-01"},{id:"onboarding",data:"2026-10-01"},
                 {id:"imersao", data:"2026-10-01"},
                 {id:"imersaoDoc", data:"2026-10-09"},
                 {id:"reuniaoPlan", data:"2026-10-06"}],

    marcos: [
      {data:"2026-10-01", titulo:"Entrada do cliente",        detalhe:"Cliente interno · produtora dos sócios da MK3 · conteúdo, agendamento, tráfego pago e LinkedIn"},
      {data:"2026-10-01", titulo:"Imersão (parte 1)",         detalhe:"Marca, objetivos e público · foco em agências e empresas, sem conteúdo para filmmaker"},
      {data:"2026-10-06", titulo:"Imersão (parte 2) e planejamento", detalhe:"Outubro Rosa com o case Sicoob, Dia das Crianças com fotos de infância x IA, DiskPan 30 anos, websérie SBL"},
      {data:"2026-10-09", titulo:"Boas-vindas e PDF de onboarding", detalhe:"Não se aplicam (cliente interno) · só o grupo de WhatsApp entra"},
      {data:"2026-10-09", titulo:"Grupo de WhatsApp criado", detalhe:"MK3 - SOLUTION FILMES · Marlon e Bia (Solution) · foto entra quando a logo chegar"}
    ]
  },
];
