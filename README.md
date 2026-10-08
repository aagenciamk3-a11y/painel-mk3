# Painel de Prazos — MK3

Painel interno de controle de prazos da MK3 Marketing Digital.
Regras extraídas do Manual de Processos Internos v1.0.

## Arquivos

- `index.html` — a página (estrutura e estilo)
- `dados.js` — os clientes e suas datas. **É o arquivo que muda no dia a dia.**
- `src/` — o código do painel, dividido por assunto:
  - `01-regras.js` regras de prazo (também usado pelo portal do cliente)
  - `02-interface.js` utilidades de tela, ícones, menu
  - `03-estado-sync.js` estado, sincronização com o Firebase, desfazer
  - `04-demandas-e-modais.js` demandas, recorrentes e janelas
  - `05-cards-calendario-lista.js`, `06-agenda-resultados.js`, `07-ficha-onboarding-equipe.js`,
    `08-quadro-e-tarefas.js`, `09-render-rotas-cliques.js`
- `motor.js` — **gerado** a partir de `src/` por `node montar.js`. Não edite direto.
- `comercial.js` — funil de vendas
- `portal.css` + `portal.js` → `c/index.html`, gerado por `node gerar_portal.js`

## Agenda ao vivo

`apps-script/agenda-ao-vivo.gs` é a ponte com o Google Agenda da MK3, nos dois sentidos:
o painel lê a agenda por ela a cada 20 segundos (com a aba aberta) e cria, edita e apaga
compromissos por ela. As instruções de publicação estão no topo do arquivo. Depois de implantar,
a função `conectarPainel` grava o endereço e a chave no banco do painel, e a equipe toda passa
a usar sem colar nada.

A aba **Agenda** mostra só o Google Agenda (gravações, reuniões e o que a equipe coloca por ali,
que vai direto para o Google). Prazos e demandas ficam nas outras abas.

**Financeiro:** compromisso criado com a área Financeiro e os prazos financeiros do painel
(mensalidade, renovação, encerramento, próximos 60 dias) viram eventos com a Bia convidada,
que recebe o aviso por e-mail. O e-mail dela fica na propriedade `EMAIL_FINANCEIRO` do script
(fora do repositório e do banco). Enquanto ela não estiver configurada, os prazos não são enviados.

## Publicar

```
node montar.js            # junta src/ em motor.js
node gerar_portal.js      # só se mexeu em portal.css, portal.js ou 01-regras.js
node testar.js            # tem que passar tudo
git add -A && git commit -m "..." && git push origin main
```

Ao publicar, troque o `?v=` dos scripts no fim do `index.html` para o navegador baixar a versão nova.

## Regras

Régua da MK3: 2 dias úteis em toda etapa de entrega e aprovação.
Nenhuma senha, acesso, código 2FA, telefone ou documento de cliente entra neste repositório:
o repositório é público. Esses dados moram no Firebase.
