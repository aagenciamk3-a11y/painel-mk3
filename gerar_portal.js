/* Gera UMA unica pagina /c/index.html, igual para todos os clientes.
   O token nao aparece em lugar nenhum do repositorio: ele vem no endereco,
   depois do #, e o navegador nunca o envia ao servidor. A pagina le o token,
   busca no Firebase o no painel/publico/<token> e monta tudo a partir dali.

   Uso: node gerar_portal.js */
const fs=require("fs"), path=require("path");

const raiz=__dirname;
const DB_URL="https://painel-mk3-default-rtdb.firebaseio.com";

const motor=fs.readFileSync(path.join(raiz,"motor.js"),"utf8");
const regrasSrc=motor.slice(0, motor.indexOf("/* ================= INTERFACE ================= */"));
const portalJs=fs.readFileSync(path.join(raiz,"portal.js"),"utf8");
const portalCss=fs.readFileSync(path.join(raiz,"portal.css"),"utf8");

const html=`<!DOCTYPE html>
<html lang="pt-BR"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive, noai, noimageai">
<meta name="referrer" content="no-referrer">
<title>Acompanhamento MK3</title>
<style>${portalCss}</style></head><body>
<div class="wrap">
  <header><div class="marca">MK<span>3</span></div><div class="hoje" id="hoje"></div></header>
  <div id="view"><div class="bloco"><h2>Carregando…</h2></div></div>
  <footer>Acompanhamento gerado pela MK3. Prazos contam dias úteis. Link pessoal, não compartilhe.</footer>
</div>
<script>
/* o token vive so no fragmento do endereco: nao vai para o servidor,
   nao entra no log de acesso e nao existe dentro do repositorio */
var MEU_TOKEN=(function(){
  var h=String(location.hash||"").replace(/^#/,"");
  var m=h.match(/(?:^|&)t=([A-Za-z0-9_-]{8,})/);
  return m?m[1]:"";
})();
var MK3_DB=${JSON.stringify(DB_URL)};
var CLIENTES=[], CLIENTE_ID="", MOSTRA_HISTORICO=false;
</script>
<script>${regrasSrc}</script>
<script>${portalJs}</script>
</body></html>`;

fs.mkdirSync(path.join(raiz,"c"),{recursive:true});
fs.writeFileSync(path.join(raiz,"c","index.html"), html);
console.log("c/index.html gerado ("+(html.length/1024).toFixed(0)+" KB).");
console.log("Os links sao montados pelo painel, em Visao do cliente.");
