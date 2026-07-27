/* Gera /c/<token>/index.html — uma página por cliente, só com os dados dele.
   Uso: node gerar_portais.js            (mantém tokens existentes em portais.json)
        node gerar_portais.js --novo ID  (regenera o token de um cliente = revoga o link antigo) */
const fs=require("fs"), path=require("path"), crypto=require("crypto"), vm=require("vm");

const raiz=__dirname;
const ctx={console};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(raiz,"dados.js"),"utf8")+"\nthis.__C=CLIENTES;",ctx);
const CLIENTES=ctx.__C;

const arqTokens=path.join(raiz,"portais.json");
let mapa={};
try{ mapa=JSON.parse(fs.readFileSync(arqTokens,"utf8")); }catch(e){}

const novoAlvo=(process.argv.indexOf("--novo")>=0)?process.argv[process.argv.indexOf("--novo")+1]:null;
CLIENTES.forEach(c=>{
  if(!mapa[c.id] || c.id===novoAlvo){
    if(mapa[c.id] && c.id===novoAlvo){
      const antigo=path.join(raiz,"c",mapa[c.id].token);
      if(fs.existsSync(antigo)) fs.rmSync(antigo,{recursive:true,force:true});
    }
    mapa[c.id]={token:crypto.randomBytes(16).toString("hex"), historico:!!(mapa[c.id]&&mapa[c.id].historico)};
  }
});
fs.writeFileSync(arqTokens, JSON.stringify(mapa,null,2));

const motor=fs.readFileSync(path.join(raiz,"motor.js"),"utf8");
const regrasSrc=motor.slice(0, motor.indexOf("/* ================= INTERFACE ================= */"));
const portalJs=fs.readFileSync(path.join(raiz,"portal.js"),"utf8");
const portalCss=fs.readFileSync(path.join(raiz,"portal.css"),"utf8");

fs.mkdirSync(path.join(raiz,"c"),{recursive:true});
CLIENTES.forEach(c=>{
  const cfg=mapa[c.id];
  const dir=path.join(raiz,"c",cfg.token);
  fs.mkdirSync(dir,{recursive:true});
  /* remove tudo que é interno/sensível antes de publicar */
  const pub=JSON.parse(JSON.stringify(c));
  ["mensalidade","contrato","justificados","inicioContrato","plano","segmento","marca"].forEach(k=>delete pub[k]);
  /* nada de financeiro/fornecedor/interno */
  pub.tarefasExtras=(pub.tarefasExtras||[]).filter(t=>{
    const txt=((t.tarefa||"")+" "+(t.detalhe||"")).toLowerCase();
    return !(t.fase==="Contrato" || /^pag_|^fotos_/.test(t.id||"") || /r\$|pagar|fornecedor|mensalidade|contrato|nota fiscal/.test(txt));
  });
  /* marcos: sem número de contrato nem valores */
  pub.marcos=(pub.marcos||[]).map(mm=>{
    const lim=x=>String(x||"").replace(/CS\s*\d{3,}[\/\d]*/gi,"").replace(/R\$\s*[\d.,]+/g,"").replace(/\s{2,}/g," ").trim().replace(/[·\-–]\s*$/,"").trim();
    return {data:mm.data, titulo:lim(mm.titulo), detalhe:lim(mm.detalhe)};
  }).filter(mm=>mm.titulo);
  const html=`<!DOCTYPE html>
<html lang="pt-BR"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive, noai, noimageai">
<title>${c.nome} · Acompanhamento MK3</title>
<style>${portalCss}</style></head><body>
<div class="wrap"><header><div class="marca">MK<span>3</span></div><div class="hoje" id="hoje"></div></header>
<h1 id="titulo"></h1><div id="view"></div>
<footer>Acompanhamento gerado pela MK3. Prazos contam dias úteis. Link pessoal, não compartilhe.</footer></div>
<script>const CLIENTES=[${JSON.stringify(pub)}];const MOSTRA_HISTORICO=${cfg.historico?"true":"false"};</script>
<script>${regrasSrc}</script>
<script>${portalJs}</script>
</body></html>`;
  fs.writeFileSync(path.join(dir,"index.html"), html);
  console.log(c.nome.padEnd(20), "/c/"+cfg.token+"/", cfg.historico?"[com histórico]":"");
});
