/* =====================================================================
   PONTE: planilha de leads do Meta  ->  Firebase  ->  portal do cliente

   Onde instalar: na planilha LEADS_SUELEM (Extensões > Apps Script),
   não no projeto da agenda. Um script só atende todos os clientes:
   as outras planilhas são abertas pelo ID, na lista PLANILHAS abaixo.

   O que ela faz:
   - lê a aba de leads,
   - normaliza o telefone (a planilha traz quatro formatos diferentes),
   - descarta os leads de teste do Meta,
   - descobre sozinha qual é o link ativo do cliente hoje,
   - e escreve no nó daquele link, para o portal ver na hora.

   Se você trocar o link do cliente no painel, esta ponte acompanha:
   ela lê o token atual do próprio banco antes de escrever.
   ===================================================================== */

/* ---------- CONFIGURAÇÃO ---------- */
var DB      = "https://painel-mk3-default-rtdb.firebaseio.com";
var PULAR   = [];              // abas a ignorar, se um dia houver alguma de apoio

/* Cliente do painel  ->  ID da planilha de leads dele.
   Cliente novo: acrescente uma linha aqui e rode instalar() de novo. */
var PLANILHAS = {
  "suelem":  "1vfW01ZxJRoUabKWHL_kibO23H0O3JeBwO8ut0Iy6igw",
  "cynthia": "1ejd6C0TfLHJ3LdSY5nv5ihuOT0cNw_TzbZtWtdlDLck"
};

/* O segredo do banco NÃO fica escrito aqui.
   Guarde uma vez em Configurações do projeto > Propriedades do script,
   com o nome FIREBASE_SECRET. */
function segredo_(){
  var s = PropertiesService.getScriptProperties().getProperty("FIREBASE_SECRET");
  if(!s) throw new Error("Falta a propriedade FIREBASE_SECRET nas configurações do script.");
  return s;
}

/* ---------- INSTALAÇÃO (rode uma vez) ---------- */
function instalar(){
  var ss = SpreadsheetApp.getActive();
  ScriptApp.getProjectTriggers().forEach(function(t){ ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("sincronizar").forSpreadsheet(ss).onChange().create();
  ScriptApp.newTrigger("sincronizar").timeBased().everyMinutes(5).create();
  sincronizar();
  Logger.log("Ponte instalada: dispara a cada mudança e a cada 5 minutos.");
}

/* ---------- NORMALIZAÇÃO ---------- */
function telLimpo_(v){
  var n = String(v==null?"":v).replace(/^p:/,"").replace(/[^0-9]/g,"");
  if(!n) return "";
  if(n.length >= 12 && n.slice(0,2) === "55") n = n.slice(2);
  if(n.length === 10) n = n.slice(0,2) + "9" + n.slice(2);   // fixo antigo de celular
  return n.length === 11 ? n : "";
}
function ehTeste_(linha){
  var txt = JSON.stringify(linha).toLowerCase();
  return txt.indexOf("test lead") >= 0 || txt.indexOf("dummy data") >= 0;
}
function limpaId_(v){ return String(v==null?"":v).replace(/^l:/,"").replace(/[^A-Za-z0-9_-]/g,""); }

/* ---------- LEITURA DA PLANILHA ----------
   A planilha e organizada por mes ("Maio - Julho", "08. Agosto", ...).
   Lemos TODAS as abas e juntamos, porque o mes novo entra numa aba nova. */
function lerAba_(sh, out){
  var val = sh.getDataRange().getValues();
  if(val.length < 2) return 0;

  var cab = val[0].map(function(c){ return String(c).trim().toLowerCase(); });
  var col = function(nome){ return cab.indexOf(nome); };
  // o Meta exporta ora em portugues, ora em ingles: aceitamos os dois
  var qualquer = function(lista){
    for (var a = 0; a < lista.length; a++){ var p = col(lista[a]); if (p >= 0) return p; }
    return -1;
  };

  var iId   = qualquer(["id"]),
      iQdo  = qualquer(["created_time", "data_de_criação", "data_de_criacao"]),
      iAd   = qualquer(["ad_name", "nome_do_anúncio", "nome_do_anuncio"]),
      iSet  = qualquer(["adset_name", "nome_do_conjunto_de_anúncios", "nome_do_conjunto"]),
      iPlat = qualquer(["platform", "plataforma"]),
      iNome = qualquer(["nome_completo", "full_name", "nome"]),
      iTel  = qualquer(["número_de_telefone", "numero_de_telefone", "phone_number", "telefone"]);

  // a pergunta personalizada muda de campanha para campanha:
  // e qualquer coluna que nao seja uma das conhecidas
  var conhecidas = ["id","created_time","ad_id","ad_name","adset_id","adset_name",
    "campaign_id","campaign_name","form_id","form_name","is_organic","platform",
    "lead_status","nome_completo","full_name","nome","número_de_telefone",
    "numero_de_telefone","phone_number","telefone","data_de_criação","data_de_criacao"];
  var iResp = -1, rotuloResp = "";
  for (var k = 0; k < cab.length; k++){
    if (cab[k] && conhecidas.indexOf(cab[k]) < 0){ iResp = k; rotuloResp = String(val[0][k]); break; }
  }

  // aba sem o cabecalho esperado e ignorada, em vez de derrubar a rotina inteira
  if(iId < 0 || iNome < 0 || iTel < 0){
    Logger.log("Aba \"" + sh.getName() + "\" fora do padrao, ignorada. Cabecalho lido: " + cab.join(", "));
    return 0;
  }

  var n = 0;
  for(var r = 1; r < val.length; r++){
    var L = val[r];
    if(!L[iId] && !L[iNome]) continue;
    if(ehTeste_(L)) continue;

    var id = limpaId_(L[iId]) || (sh.getSheetId() + "r" + r);
    var quando = L[iQdo];
    if(quando instanceof Date) quando = Utilities.formatDate(quando, "America/Sao_Paulo", "yyyy-MM-dd'T'HH:mm:ssXXX");
    else quando = String(quando || "");

    out[id] = {
      nome:      String(L[iNome] || "").trim(),
      tel:       telLimpo_(L[iTel]),
      telBruto:  String(L[iTel] || "").replace(/^p:/,""),
      anuncio:   iAd  >= 0 ? String(L[iAd]  || "") : "",
      conjunto:  iSet >= 0 ? String(L[iSet] || "") : "",
      plataforma:iPlat>= 0 ? String(L[iPlat]|| "") : "",
      resposta:  iResp >= 0 ? String(L[iResp] || "").slice(0,200) : "",
      pergunta:  rotuloResp,
      quando:    quando,
      aba:       sh.getName()
    };
    n++;
  }
  return n;
}
function lerLeads_(ss){
  var out = {};
  ss.getSheets().forEach(function(sh){
    if(PULAR.indexOf(sh.getName()) >= 0) return;
    var n = lerAba_(sh, out);
    Logger.log("Aba \"" + sh.getName() + "\": " + n + " leads.");
  });
  return out;
}

/* ---------- FIREBASE ---------- */
function fbGet_(caminho){
  var u = DB + "/" + caminho + ".json?auth=" + segredo_();
  var r = UrlFetchApp.fetch(u, {muteHttpExceptions:true});
  if(r.getResponseCode() !== 200) return null;
  var t = r.getContentText();
  return (t === "null" || !t) ? null : JSON.parse(t);
}
function fbPut_(caminho, obj){
  var u = DB + "/" + caminho + ".json?auth=" + segredo_();
  var r = UrlFetchApp.fetch(u, {
    method:"put", contentType:"application/json",
    payload:JSON.stringify(obj), muteHttpExceptions:true
  });
  if(r.getResponseCode() >= 300)
    throw new Error("Firebase respondeu " + r.getResponseCode() + ": " + r.getContentText().slice(0,200));
}

/* qual é o link ativo do cliente agora */
function tokenAtivo_(cliente){
  var p = fbGet_("painel/estado/portais/" + cliente);
  return (p && p.ativo) ? p.ativo : null;
}

/* ---------- ROTINA PRINCIPAL ---------- */
function sincronizar(){
  Object.keys(PLANILHAS).forEach(function(cliente){
    try { sincronizarCliente_(cliente); }
    catch(e){ Logger.log("Cliente " + cliente + " falhou: " + e.message); }
  });
}
function sincronizarCliente_(cliente){
  var ss;
  try { ss = SpreadsheetApp.openById(PLANILHAS[cliente]); }
  catch(e){ throw new Error("não consegui abrir a planilha (" + e.message + ")"); }

  var leads = lerLeads_(ss);
  var n = Object.keys(leads).length;

  // cópia interna, sempre: é a fonte da verdade e não depende do link
  fbPut_("painel/leads/" + cliente, leads);

  var tk = tokenAtivo_(cliente);
  if(!tk){
    Logger.log(cliente + ": li " + n + " leads e guardei em painel/leads/" + cliente +
               ". Ainda não há link gerado no painel, então não publiquei no portal.");
    return;
  }
  // só o nó de leads: não encosta em nada que o painel publica
  fbPut_("painel/publico/" + tk + "/leads", leads);
  Logger.log(cliente + ": publiquei " + n + " leads no portal.");
}

/* ---------- CONFERÊNCIA (rode à mão para testar) ---------- */
function conferir(){
  Object.keys(PLANILHAS).forEach(function(cliente){
    var leads = lerLeads_(SpreadsheetApp.openById(PLANILHAS[cliente]));
    var ks = Object.keys(leads);
    var semTel = ks.filter(function(k){ return !leads[k].tel; });
    Logger.log(cliente + ": " + ks.length + " leads, " + semTel.length + " sem telefone aproveitável.");
    if(ks.length) Logger.log("  exemplo: " + JSON.stringify(leads[ks[ks.length-1]]));
  });
}
