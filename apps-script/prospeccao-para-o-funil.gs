/* =====================================================================
   PONTE: planilhas de PROSPECÇÃO  ->  Firebase  ->  funil de vendas

   Onde instalar: no MESMO projeto de Apps Script da ponte de leads
   (Extensões > Apps Script a partir da planilha LEADS_SUELEM).
   Ali já existe a propriedade FIREBASE_SECRET e as funções segredo_(),
   fbGet_(), fbPut_() e telLimpo_(), que este arquivo reaproveita.
   Depois de colar, rode instalarProspeccao() uma vez.

   Por que não escreve direto na base do funil:
   quem manda na base é o painel. Se este script escrevesse em
   painel/comercial/leads, uma edição feita na tela e uma sincronização
   feita aqui iam brigar pela mesma chave e alguém perderia trabalho.
   Então aqui só empurramos NOVIDADE para painel/comercial/entrada, uma
   caixa de entrada. O painel abre a caixa, vira lead e apaga a entrada.

   E por que nunca repete: cada item ganha uma chave estável (telefone +
   dia + começo do texto). A chave fica em painel/comercial/vistos. Item
   com chave vista não é reenviado, nem que a equipe apague o lead depois.
   ===================================================================== */

/* ---------- CONFIGURAÇÃO ---------- */
/* Planilha -> ano padrão das datas que vêm só como "dia/mês".
   Planilha nova de prospecção: acrescente uma linha aqui. */
var PROSPECCAO = [
  { id: "1qGbxReZAAOBnLtN0_fvH6DSMwbnewJLL1809RKmIAlo", nome: "PROSPECÇÃO 2026", ano: 2026 },
  { id: "1ioEiwXh8PkpUmml_OzsGi85G-_DasaNzUlovrNB5kYI", nome: "PROSPECÇÃO",      ano: 2025 }
];

var NO_FUNIL = "painel/comercial";

/* ---------- INSTALAÇÃO (rode uma vez) ---------- */
function instalarProspeccao(){
  ScriptApp.getProjectTriggers().forEach(function(t){
    if(t.getHandlerFunction() === "sincronizarProspeccao") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("sincronizarProspeccao").timeBased().everyHours(1).create();
  sincronizarProspeccao();
  Logger.log("Ponte da prospecção instalada: roda de hora em hora.");
}

/* ---------- NORMALIZAÇÃO ---------- */
function semAcento_(s){
  return String(s == null ? "" : s)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim();
}
function pedaco_(s, n){
  return semAcento_(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, n || 40);
}
/* chave de banco: Firebase recusa . $ # [ ] / e espaços atrapalham a URL */
function chaveOk_(s){ return String(s).replace(/[.$#\[\]\/\s]+/g, "_").slice(0, 200); }

/* "25/02" -> 2026-02-25 · "05/2025" -> 2025-05-01 · "13/01/2026" -> 2026-01-13
   Data de verdade vinda da célula tem prioridade. Formato que não
   reconhecemos vira vazio, nunca uma data inventada. */
function dataBR_(v, anoPadrao){
  if(v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, "America/Sao_Paulo", "yyyy-MM-dd");
  var t = String(v == null ? "" : v).trim();
  if(!t) return "";
  var p = t.split(/[\/\-\.]/);
  if(p.length === 3){
    var d = ("0" + p[0]).slice(-2), m = ("0" + p[1]).slice(-2), a = p[2];
    if(a.length === 2) a = "20" + a;
    return /^\d{4}$/.test(a) ? a + "-" + m + "-" + d : "";
  }
  if(p.length === 2){
    if(p[1].length === 4) return p[1] + "-" + ("0" + p[0]).slice(-2) + "-01";   // mês/ano
    return anoPadrao + "-" + ("0" + p[1]).slice(-2) + "-" + ("0" + p[0]).slice(-2);
  }
  return "";
}

/* ---------- LEITURA DE UMA ABA ----------
   O cabeçalho não está sempre na primeira linha e os nomes mudam de aba
   para aba, então procuramos a linha de cabeçalho e mapeamos por nome.
   Célula mesclada devolve valor só na primeira linha do bloco: por isso
   nome, empresa e telefone são arrastados para baixo. */
function colunas_(linha){
  var c = {};
  for(var i = 0; i < linha.length; i++){
    var h = semAcento_(linha[i]);
    if(!h) continue;
    if(c.nome     == null && /^nome( completo)?$/.test(h))                 c.nome = i;
    if(c.empresa  == null && /^(nome da empresa|empresa)/.test(h))         c.empresa = i;
    if(c.quemE    == null && /quem e|o que faz/.test(h))                   c.quemE = i;
    if(c.segmento == null && /^segmento$|empresa ?\/ ?segmento/.test(h))   c.segmento = i;
    if(c.tel      == null && /whatsapp|telefone|celular/.test(h))          c.tel = i;
    if(c.dia      == null && /^dia$|^data$/.test(h))                       c.dia = i;
    if(c.situacao == null && /situacao|observac|o que aconteceu/.test(h))  c.situacao = i;
    if(c.contato1 == null && /1º contato|1o contato|primeiro contato/.test(h)) c.contato1 = i;
    if(c.contato2 == null && /2º contato|2o contato|2° contato|segundo contato/.test(h)) c.contato2 = i;
    if(c.conv     == null && /conversao/.test(h))                          c.conv = i;
  }
  return c;
}
function temCabecalho_(c){
  return (c.nome != null || c.empresa != null) && (c.tel != null || c.quemE != null || c.segmento != null);
}
function celula_(L, i){ return i == null ? "" : String(L[i] == null ? "" : L[i]).trim(); }

function lerProspAba_(sh, ano, fonte, acc){
  var val = sh.getDataRange().getValues();
  if(val.length < 2) return;

  var hi = -1, col = null;
  for(var r = 0; r < Math.min(val.length, 12); r++){
    var c = colunas_(val[r]);
    if(temCabecalho_(c)){ hi = r; col = c; break; }
  }
  if(hi < 0){ Logger.log('Aba "' + sh.getName() + '" sem cabeçalho reconhecível, ignorada.'); return; }

  var atual = null;    // bloco mesclado em andamento
  for(var r = hi + 1; r < val.length; r++){
    var L = val[r];

    var nome = celula_(L, col.nome);
    var emp  = celula_(L, col.empresa) || celula_(L, col.quemE) || celula_(L, col.segmento);
    var tel  = telLimpo_(celula_(L, col.tel));
    var seg  = (col.segmento != null && col.segmento !== col.empresa) ? celula_(L, col.segmento) : "";

    if(nome || emp || tel){
      var chave = tel ? ("t" + tel) : ("n" + pedaco_(emp || nome, 48));
      if(chave === "n"){ atual = null; continue; }
      if(!acc.leads[chave]){
        acc.leads[chave] = {
          chave:    chave,
          contato:  nome,
          empresa:  emp || nome,
          whatsapp: tel,
          nota:     (seg && seg !== emp) ? seg : "",
          entrada:  "",
          ganho:    false,
          fonte:    fonte + " · " + sh.getName()
        };
      }
      atual = acc.leads[chave];
      if(!atual.contato && nome) atual.contato = nome;
      if(!atual.whatsapp && tel) atual.whatsapp = tel;
    }
    if(!atual) continue;

    /* conversão marcada na planilha: virou cliente */
    if(col.conv != null && /^(true|verdadeiro|sim|x)$/i.test(celula_(L, col.conv))) atual.ganho = true;

    /* toque com dia e o que aconteceu (PROSPECÇÃO 2026) */
    var dia = dataBR_(col.dia != null ? L[col.dia] : "", ano);
    var oq  = celula_(L, col.situacao);
    if(dia && oq) guardaToque_(acc, atual, dia, oq, fonte);

    /* as duas colunas de data da planilha de 2025 também são toques */
    var d1 = dataBR_(col.contato1 != null ? L[col.contato1] : "", ano);
    if(d1) guardaToque_(acc, atual, d1, "o cliente procurou a MK3", fonte);
    var d2 = dataBR_(col.contato2 != null ? L[col.contato2] : "", ano);
    if(d2) guardaToque_(acc, atual, d2, "a MK3 fez o segundo contato", fonte);
  }
}
function guardaToque_(acc, lead, data, oque, fonte){
  var k = chaveOk_(lead.chave + "|" + data + "|" + pedaco_(oque, 40));
  if(acc.jaNesta[k]) return;
  acc.jaNesta[k] = true;
  acc.toques.push({ k: k, lead: lead.chave, data: data, oque: String(oque).slice(0, 400), fonte: fonte });
  if(!lead.entrada || data < lead.entrada) lead.entrada = data;
}

function lerProspeccao_(){
  var acc = { leads: {}, toques: [], jaNesta: {} };
  PROSPECCAO.forEach(function(p){
    var ss;
    try { ss = SpreadsheetApp.openById(p.id); }
    catch(e){ Logger.log("Não consegui abrir " + p.nome + ": " + e.message); return; }
    ss.getSheets().forEach(function(sh){ lerProspAba_(sh, p.ano, p.nome, acc); });
  });
  return acc;
}

/* ---------- ROTINA PRINCIPAL ---------- */
function sincronizarProspeccao(){
  var acc = lerProspeccao_();
  var vistos = fbGet_(NO_FUNIL + "/vistos") || {};
  var agora = Utilities.formatDate(new Date(), "America/Sao_Paulo", "yyyy-MM-dd'T'HH:mm:ssXXX");
  var novosL = 0, novosT = 0;

  Object.keys(acc.leads).forEach(function(chave){
    var L = acc.leads[chave];
    var k = chaveOk_("lead|" + chave);
    if(vistos[k]) return;
    fbPut_(NO_FUNIL + "/entrada/" + k, {
      k: k, tipo: "lead", lead: chave, quando: agora, fonte: L.fonte,
      dados: {
        empresa:  L.empresa,
        contato:  L.contato,
        whatsapp: L.whatsapp,
        entrada:  L.entrada,
        ganho:    L.ganho,
        nota:     L.nota
      }
    });
    fbPut_(NO_FUNIL + "/vistos/" + k, true);
    novosL++;
  });

  acc.toques.forEach(function(t){
    if(vistos[t.k]) return;
    fbPut_(NO_FUNIL + "/entrada/" + t.k, {
      k: t.k, tipo: "toque", lead: t.lead, quando: agora, fonte: t.fonte,
      dados: { data: t.data, oque: t.oque }
    });
    fbPut_(NO_FUNIL + "/vistos/" + t.k, true);
    novosT++;
  });

  Logger.log("Prospecção: li " + Object.keys(acc.leads).length + " pessoas e " +
             acc.toques.length + " toques. Novidade mandada: " +
             novosL + " leads e " + novosT + " toques.");
}

/* ---------- CONFERÊNCIA (rode à mão, não escreve nada) ---------- */
function conferirProspeccao(){
  var acc = lerProspeccao_();
  var ks = Object.keys(acc.leads);
  Logger.log(ks.length + " pessoas, " + acc.toques.length + " toques.");
  Logger.log("Sem telefone aproveitável: " +
             ks.filter(function(k){ return !acc.leads[k].whatsapp; }).length);
  ks.slice(0, 5).forEach(function(k){ Logger.log(JSON.stringify(acc.leads[k])); });
  acc.toques.slice(0, 5).forEach(function(t){ Logger.log(JSON.stringify(t)); });
}

/* ---------- RECOMEÇAR DO ZERO (cuidado) ----------
   Apaga a caixa de entrada e a memória do que já foi mandado. Serve
   quando a leitura da planilha mudou e você quer reimportar tudo. Os
   leads que o painel já absorveu continuam lá: isto não apaga a base. */
function limparMemoriaProspeccao(){
  fbPut_(NO_FUNIL + "/entrada", null);
  fbPut_(NO_FUNIL + "/vistos", null);
  Logger.log("Caixa de entrada e memória zeradas. O próximo sincronizarProspeccao() manda tudo de novo.");
}
