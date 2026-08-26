# MODELO DE DADOS — Base de leads MK3

Este é o contrato. Painel e planilha usam exatamente estes campos e estes valores.
Campo que não está aqui não existe. Valor fora da lista é erro de digitação.

## Regra de ouro
Toda coluna precisa responder "que decisão eu tomo diferente por causa dela?".
A base antiga tinha 41 colunas e quase nenhuma linha preenchida — sintoma clássico
de planilha desenhada para parecer completa, não para ser usada.
Aqui são 24 campos, e 8 deles são obrigatórios.

## Campos

### Identificação (obrigatórios)
| Campo | Tipo | Nota |
|---|---|---|
| `id` | texto | gerado, nunca digitado |
| `empresa` | texto | razão social ou nome fantasia |
| `contato` | texto | nome da pessoa |
| `cargo` | lista | ver Listas → Cargo |
| `decisor` | lista | Sim / Não / Não sei |
| `whatsapp` | texto | normalizado para 55DDD9XXXXXXXX |
| `origem` | lista | ver Listas → Origem |
| `entrada` | data | quando o lead chegou |

### Qualificação — CHAMP + Meta
| Campo | Tipo | Nota |
|---|---|---|
| `desafio` | texto | a dor, na frase do cliente |
| `meta` | texto | o número que ele quer mudar em 90 dias |
| `envolvidos` | número | quantas pessoas participam da decisão |
| `investe_hoje` | número | R$/mês que já gasta com marketing (0 = não investe) |
| `prazo` | lista | ver Listas → Prazo de decisão |
| `score` | 0 a 4 | calculado, não digitado (ver Cálculos) |

### Contexto
| Campo | Tipo | Nota |
|---|---|---|
| `segmento` | lista | ver Listas → Segmento |
| `porte` | lista | Micro / Pequeno / Médio / Médio-Grande |
| `cidade` | texto | Cidade / UF |
| `email` | texto | opcional |
| `instagram` | texto | @ ou site |

### Funil
| Campo | Tipo | Nota |
|---|---|---|
| `etapa` | lista | ver Etapas |
| `responsavel` | lista | nome de quem é o dono do lead |
| `primeiro_contato` | data e hora | quando alguém falou com o lead de verdade |
| `toques` | número | quantas tentativas já foram feitas |
| `proximo_followup` | data | quando é o próximo toque |
| `reuniao` | data e hora | vazio = não agendada |
| `resultado_reuniao` | lista | ver Listas |

### Proposta e desfecho
| Campo | Tipo | Nota |
|---|---|---|
| `pacote` | lista | ver Listas → Pacote |
| `valor_mensal` | número | R$/mês proposto |
| `setup` | número | entrada, se houver |
| `data_proposta` | data | |
| `fechamento` | data | quando virou ganho ou perdido |
| `motivo_perda` | lista | ver Listas → Motivo da perda |
| `motivo_frase` | texto | OBRIGATÓRIO quando há motivo_perda |
| `obs` | texto | livre |

## Etapas do funil (5, não mais)
Ciclo curto pede poucas etapas. Cada uma tem gatilho de saída verificável.

| # | Etapa | Só sai daqui quando |
|---|---|---|
| 1 | Novo | alguém tentou contato pela primeira vez |
| 2 | Contatado | o lead respondeu |
| 3 | Diagnóstico feito | as 5 perguntas CHAMP foram respondidas |
| 4 | Proposta enviada | a proposta saiu, com valor e pacote |
| 5 | Fechado | virou cliente ou virou perda, com motivo |

Não crie "em negociação" nem "aguardando cliente". São etapas-lixo onde lead
apodrece sem prazo e que destroem a leitura de conversão por etapa.

## Listas fechadas

**Origem:** Indicação · Instagram orgânico · Meta Ads · Google Ads · Busca Google ·
Site/Formulário · Prospecção ativa · Evento/Networking · Carteira antiga (reativação)

**Cargo:** Dono/Sócio · Diretor · Gerente de Marketing · Gerente Comercial ·
Coordenador · Assistente · Outro

**Segmento:** Escola particular · Educação infantil · Curso/Idiomas ·
Imobiliária/Corretor · Indústria/Engenharia · Comércio local · Moda/Varejo ·
Saúde/Clínica · Serviços B2B · Tecnologia · Outro

**Prazo de decisão:** Imediato (até 30 dias) · 1 a 3 meses · 3 a 6 meses · Sem prazo definido

**Pacote:** Essencial · Crescimento · Expansão · Premium · Projeto avulso · Sob medida

**Resultado da reunião:** Ainda vai acontecer · Realizada · No-show · Remarcada · Cancelada

**Motivo da perda** (mutuamente exclusivos):
- Sem dor real
- Sem verba de fato
- Decisor nunca entrou na conversa
- Timing (obra, safra, matrícula)
- Escolheu concorrente
- Vai fazer internamente ou com freelancer
- Sumiu / parou de responder
- Desqualificado por nós

> "Preço" não é opção. Preço é sintoma: quase sempre significa "não construí valor"
> ou "falei com quem não decide". Em análises win/loss rigorosas, preço e
> funcionalidade explicam só ~20% das perdas reais (InsightSquared).
> Por isso `motivo_frase` é obrigatório: uma frase dizendo o que realmente aconteceu.

## Cálculos

**Score CHAMP (0 a 4)** — some 1 ponto para cada:
- `desafio` preenchido com dor concreta
- `decisor` = Sim, ou `envolvidos` ≥ 2 com o decisor mapeado
- `investe_hoje` > 0
- `prazo` = Imediato ou 1 a 3 meses

**Tempo até o 1º contato** = `primeiro_contato` − `entrada`, em minutos.
É a métrica que mais muda resultado na semana.

**Probabilidade por etapa** (para o pipeline ponderado):
Novo 5% · Contatado 15% · Diagnóstico feito 35% · Proposta enviada 60% · Fechado 100%/0%

**Pipeline ponderado** = Σ (`valor_mensal` × probabilidade da etapa)

**Ciclo médio** = média de (`fechamento` − `entrada`) dos ganhos.
Referência Brasil: 48 dias em operações B2B (Meetime).

**LTV** = `valor_mensal` × meses médios de retenção.
**LTV/CAC** saudável ≥ 3.
