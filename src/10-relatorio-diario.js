/* ================= RELATORIO DIARIO (para a reuniao de pendencias) =================
   Usado pelo relatorio.js (rotina diaria do Claudinho) e pode ser chamado no console.
   Le TODAS/CLIENTES/ESTADO ja montados (rebuild) e devolve o que precisa de conversa. */
function relatorioDiario(){
  const hoje=iso(HOJE);
  const soma=(isoD,n)=>{ const x=d(isoD); x.setDate(x.getDate()+n); return iso(x); };
  const item=t=>({cliente:t.cliente, clienteId:t.clienteId, id:t.id, tarefa:t.tarefa, data:t.data,
    dias:dias(t.data), resp:t.resp||"", areas:t.areas||[t.area], demanda:t.clienteId==="_dem"});
  const abertas=TODAS.filter(t=>t.data && t.st && t.st.k!=="ok");
  const atrasadas=abertas.filter(t=>t.st.k==="atrasado"||t.st.k==="replan").map(item)
    .sort((a,b)=>String(a.cliente).localeCompare(String(b.cliente))||a.data.localeCompare(b.data));
  /* agrupa por cliente e mes: "Setembro inteiro da Dinha sem marcar" vira uma pergunta so */
  const grupos={};
  atrasadas.forEach(x=>{ const k=x.cliente+"|"+x.data.slice(0,7); (grupos[k]=grupos[k]||{cliente:x.cliente,mes:x.data.slice(0,7),itens:[]}).itens.push(x); });
  const hojeEAmanha=abertas.filter(t=>t.data===hoje||t.data===soma(hoje,1)).map(item);
  const contratos=CLIENTES.filter(c=>c.vencimentoContrato && c.vencimentoContrato>=hoje && c.vencimentoContrato<=soma(hoje,30))
    .map(c=>({cliente:c.nome, id:c.id, vence:c.vencimentoContrato, dias:dias(c.vencimentoContrato),
      contrato:c.contrato||"", semRenovacao:!!c.semRenovacao}));
  const pagamentos=abertas.filter(t=>/^pag_/.test(t.id) && t.data>=hoje && t.data<=soma(hoje,7)).map(item);
  const desde=new Date(Date.now()-36*3600e3).toISOString();
  const concluidasRecentes=(ESTADO.log||[]).filter(l=>l.acao==="concluir" && l.ts>=desde)
    .map(l=>({quem:l.quem||"", tarefa:l.nome||"", cliente:l.cliente||"", ts:l.ts}));
  return { hoje:hoje, totalAtrasadas:atrasadas.length, grupos:Object.values(grupos), atrasadas:atrasadas,
    hojeEAmanha:hojeEAmanha, contratos:contratos, pagamentos:pagamentos, concluidasRecentes:concluidasRecentes };
}
/* texto curto para a descricao do evento da reuniao */
function textoReuniao(r){
  const M=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const mes=ym=>M[Number(ym.slice(5,7))-1];
  const L=[];
  L.push("Reunião de pendências do Painel de Prazos. Abra o chat do projeto JARVIS e diga: reunião de pendências.");
  if(r.contratos.length){ L.push(""); L.push("CONTRATOS");
    r.contratos.forEach(c=>L.push("• "+c.cliente+": "+(c.semRenovacao?"encerra":"vence")+" em "+c.dias+" dia"+(c.dias===1?"":"s")+" ("+fmt(c.vence)+")")); }
  if(r.grupos.length){ L.push(""); L.push("ATRASADAS NO PAINEL ("+r.totalAtrasadas+"): feitas e não marcadas, ou atrasadas de verdade?");
    r.grupos.slice().sort((a,b)=>b.itens.length-a.itens.length).forEach(g=>{
      L.push("• "+g.cliente+" · "+mes(g.mes)+": "+g.itens.length+" ("+g.itens.slice(0,4).map(x=>x.tarefa).join("; ")+(g.itens.length>4?"; ...":"")+")"); }); }
  if(r.hojeEAmanha.length){ L.push(""); L.push("HOJE E AMANHÃ");
    r.hojeEAmanha.forEach(x=>L.push("• "+(x.data===r.hoje?"hoje":"amanhã")+" · "+x.cliente+": "+x.tarefa)); }
  if(r.pagamentos.length){ L.push(""); L.push("PAGAMENTOS EM 7 DIAS");
    r.pagamentos.forEach(x=>L.push("• "+fmt(x.data)+" · "+x.cliente+": "+x.tarefa)); }
  return L.join("\n");
}
