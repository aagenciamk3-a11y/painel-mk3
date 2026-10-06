/* Monta o motor.js juntando os arquivos de src/ em ordem (01, 02, ...).
   O site continua carregando um motor.js so; a divisao e para editar e revisar com calma.

   Uso:  node montar.js            -> grava motor.js
         node montar.js --conferir -> so confere se motor.js esta igual aos fontes (sai com erro se nao) */
const fs=require("fs"), path=require("path");
const raiz=__dirname, dir=path.join(raiz,"src");
const partes=fs.readdirSync(dir).filter(f=>/^\d\d-.+\.js$/.test(f)).sort();
const corpo=partes.map(f=>fs.readFileSync(path.join(dir,f),"utf8")).join("");
const alvo=path.join(raiz,"motor.js");
if(process.argv.includes("--conferir")){
  const atual=fs.existsSync(alvo)?fs.readFileSync(alvo,"utf8"):"";
  if(atual!==corpo){
    console.error("motor.js esta diferente de src/. Edite os arquivos em src/ e rode: node montar.js");
    process.exit(1);
  }
  console.log("motor.js confere com src/ ("+partes.length+" arquivos).");
} else {
  fs.writeFileSync(alvo,corpo);
  console.log("motor.js montado a partir de "+partes.length+" arquivos de src/ ("+Math.round(corpo.length/1024)+" KB).");
}
