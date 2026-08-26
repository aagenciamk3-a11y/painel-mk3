# ESTRUTURA DA TELA COMERCIAL — painel MK3

O funil mora **dentro do painel** (github.com/aagenciamk3-a11y/painel-mk3), como uma
tela nova no menu **Ver**, ao lado de Clientes, Feed, Tarefas, Dashboard, Agenda.

## Como o painel funciona (para a estrutura nascer compatível)
- Site estático em GitHub Pages: `index.html` (estilo), `dados.js` (clientes),
  `motor.js` (regras + telas), `testar.js` (suíte de testes).
- Estado em `ESTADO`, salvo no localStorage e sincronizado por Firebase RTDB em `painel/estado`.
- Telas são funções que devolvem HTML; `VISTA.modo` decide qual aparece; rota em `#/<modo>`.
- Cliques são delegados por atributo `data-*` num único ouvinte.
- Áreas: `mkt`, `fin`, `com`. O funil é **`com`**, e quem só tem `mkt` não vê.
- Toda mudança de estado chama `rebuild()` antes de `render()`.
- Nada de senha, CPF/CNPJ ou dado sensível no repositório.

## Onde o dado vive
`ESTADO.leadsCom = { <id>: { ...campos do modelo } }`

Sincronização **bidirecional** com a planilha (escolha do time: dá para digitar nos dois).
Isso é confortável e é a parte mais perigosa da arquitetura. Regras obrigatórias:
1. Todo registro carrega `atualizadoEm` (ISO) e `origemEdicao` ("painel" ou "planilha").
2. Na sincronização, **vence o `atualizadoEm` mais recente**, campo a campo, não a linha inteira.
3. Conflito no mesmo campo em menos de 2 minutos → mantém o do painel e registra em
   `ESTADO.conflitos` para revisão humana. Nunca descarta em silêncio.
4. `id` é gerado pelo painel. A planilha nunca inventa id.
5. A ponte roda no Apps Script da planilha, com a chave em Script Properties, como a de leads.

## Telas

### 1. Funil (padrão)
Cinco colunas, uma por etapa, no formato de quadro.
- Topo de cada coluna: nome, quantidade e soma ponderada em R$.
- Cartão do lead: **empresa** em destaque, contato e cargo embaixo, etiqueta do pacote,
  selo do porte, avatar do responsável.
- Sinais no cartão, porque são o que muda a ação:
  - **vermelho** se `proximo_followup` já passou
  - **relógio** com o tempo até o 1º contato quando ainda não houve contato
  - **estrelas** do score CHAMP (0 a 4)
  - **cadeado** quando `decisor` = Não (é o preditor mais forte de perda)
- Arrastar entre colunas muda a etapa. Ao soltar em "Fechado", **exige** escolher
  ganho ou perdido, e se for perdido, motivo + frase.
- Botão de WhatsApp direto no cartão, com mensagem que muda conforme a etapa.

### 2. Lead (janela)
Abre ao clicar no cartão. Três blocos:
- **Quem é**: empresa, contato, cargo, decisor, envolvidos, segmento, porte, cidade, origem.
- **Diagnóstico**: as 5 perguntas CHAMP como campos, com o score calculado ao lado.
- **Negócio**: pacote, valor, setup, data da proposta, previsão, próximo follow-up.
- Rodapé: histórico de toques (data, canal, quem, o que aconteceu).

### 3. Números
- Seis indicadores, nada além: conversão por etapa, tempo médio até o 1º contato,
  ciclo médio, pipeline ponderado do mês, LTV/CAC, motivo de perda mais frequente.
- Funil visual mostrando onde cai mais gente (o gargalo, não o total).
- Conversão por origem — comparando a base com ela mesma, nunca com benchmark de fora.
- Alerta em destaque: leads sem primeiro contato há mais de 1 hora.

### 4. Hoje
A fila do dia de quem está logado: quem tem follow-up para hoje, quem estourou o prazo,
quem chegou e ninguém tocou. Ordenada por urgência, não por data de entrada.

## Ligações com o que já existe
- Lead que vira cliente **cria o cliente** no painel e dispara o onboarding de 14 etapas.
- O motivo de perda alimenta a Tendência.
- Follow-up atrasado entra no Recado do dia.
- Reunião agendada cria evento na Google Agenda pela ponte que já existe.

## O que NÃO fazer
- Não criar etapa nova sem gatilho de saída verificável.
- Não mostrar pipeline sem ponderar: infla e vira mentira confortável.
- Não deixar "preço" como motivo de perda.
- Não exibir dado de lead no portal do cliente. É base interna.
- Não publicar nada disso em endereço público sem token, como já é a regra do portal.
