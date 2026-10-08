/* Relatorio diario do painel, para a rotina do Claudinho.
   Uso: node relatorio.js estado.json [--texto]
   estado.json = copia do banco (painel/estado), que o script do Google salva no Drive a cada hora. */
const vm=require("vm"), fs=require("fs"), path=require("path");
const arq=process.argv[2];
if(!arq){ console.error("uso: node relatorio.js estado.json [--texto]"); process.exit(1); }
const el=()=>({style:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},setAttribute(){},appendChild(){},
  addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],innerHTML:"",dataset:{}});
const ctx={console,setTimeout:()=>0,clearTimeout,setInterval:()=>0,clearInterval,Date,Math,JSON,String,Number,Boolean,Array,Object,
  RegExp,Promise,isNaN,parseInt,parseFloat,encodeURIComponent,decodeURIComponent,Proxy,Set,Map,Error,
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},location:{hash:"",pathname:"/",href:""},history:{pushState(){},replaceState(){}},
  document:{getElementById:()=>el(),querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>el(),addEventListener(){},body:el(),documentElement:el()},
  window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){}})},navigator:{}};
ctx.window.document=ctx.document; vm.createContext(ctx);
for(const f of ["dados.js","motor.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname,f),"utf8"),ctx,{filename:f});
ctx.__bruto=fs.readFileSync(arq,"utf8");
vm.runInContext(`ESTADO=normalizarEstado(JSON.parse(__bruto)); rebuild();`,ctx);
const r=vm.runInContext(`relatorioDiario()`,ctx);
if(process.argv.includes("--texto")){ ctx.__r=r; console.log(vm.runInContext(`textoReuniao(__r)`,ctx)); }
else console.log(JSON.stringify(r,null,1));
