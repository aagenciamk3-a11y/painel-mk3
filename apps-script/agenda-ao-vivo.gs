/**
 * AGENDA AO VIVO — ponte entre o Google Agenda da MK3 e o Painel de Prazos
 * =========================================================================
 * O painel lê a agenda por aqui a cada 20 segundos (doGet) e cria, edita ou
 * apaga compromissos por aqui (doPost). Este script só entrega e grava os
 * dados: quem descobre de qual cliente e de quem é cada evento é o próprio
 * painel. Entrou ou saiu cliente? Não precisa mexer aqui.
 *
 * COMO PUBLICAR (uma vez só, logado na conta aagencia.mk3@gmail.com)
 * 1. script.google.com > Novo projeto. Cole este arquivo inteiro.
 * 2. À esquerda, em "Serviços", clique em + e adicione "Google Calendar API".
 * 3. Rode a função  configurar  e autorize o acesso.
 * 4. Implantar > Nova implantação > tipo "App da Web".
 *      Executar como: Eu (aagencia.mk3@gmail.com)
 *      Quem pode acessar: Qualquer pessoa
 * 5. Rode  configurar  de novo (ou  conectarPainel ): grava o endereço e a chave
 *    no painel, para a equipe toda. Ninguém precisa copiar nem colar nada.
 *
 * Financeiro: salve o e-mail da Bia em Configurações do projeto > Propriedades do script,
 * com o nome EMAIL_FINANCEIRO. Compromisso e prazo do financeiro chegam para ela por e-mail.
 *
 * Para atualizar o código depois SEM trocar o endereço:
 * Implantar > Gerenciar implantações > lápis > Versão: "Nova versão".
 *
 * Não guarde e-mails, senhas nem nomes de clientes neste arquivo:
 * ele fica no repositório do painel, que é público.
 */

const AGENDA_ID = 'primary';        // a agenda principal da conta que publica
const FUSO = 'America/Sao_Paulo';
const DIAS_ANTES = 45;              // quanto do passado o painel enxerga
const DIAS_DEPOIS = 180;            // quanto do futuro
const CACHE_SEG = 10;               // a equipe toda lendo a cada 20 s não estoura a cota
const BANCO_PAINEL = 'https://painel-mk3-default-rtdb.firebaseio.com/painel/estado.json';

/** Rode uma vez: cria a chave que o painel usa para gravar na agenda. */
function configurar() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('CHAVE')) props.setProperty('CHAVE', Utilities.getUuid().replace(/-/g, ''));
  // testa o acesso à agenda e ao serviço avançado
  Calendar.Events.list(AGENDA_ID, { maxResults: 1, timeMin: new Date().toISOString() });
  if (/\/exec$/.test(enderecoPublicado_())) { conectarPainel(); return; }   // já implantado: liga o painel na mesma hora
  Logger.log('Agenda acessível e chave criada. Agora implante como App da Web e rode configurar de novo (ou conectarPainel).');
}

/** Rode depois de implantar: o painel passa a usar este script, para todo mundo. */
function conectarPainel() {
  const chave = PropertiesService.getScriptProperties().getProperty('CHAVE');
  if (!chave) throw new Error('Rode configurar primeiro.');
  const url = enderecoPublicado_();
  if (!/\/exec$/.test(url)) throw new Error('Implante como App da Web antes. Se já implantou, copie o URL do App da Web (termina em /exec) e salve em Configurações do projeto > Propriedades do script, com o nome URL. Recebi: ' + url);
  const r = UrlFetchApp.fetch(BANCO_PAINEL, {
    method: 'patch', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ agendaUrl: url, agendaChave: chave })
  });
  if (r.getResponseCode() !== 200) throw new Error('O banco do painel recusou: ' + r.getResponseCode() + ' ' + r.getContentText());
  Logger.log('Painel conectado. Endereço: ' + url);
}

/** O endereço /exec da implantação. Rodando pelo editor, o Google às vezes só devolve o /dev:
 *  nesse caso vale o que estiver salvo na propriedade URL. */
function enderecoPublicado_() {
  const url = ScriptApp.getService().getUrl() || '';
  if (/\/exec$/.test(url)) return url;
  return PropertiesService.getScriptProperties().getProperty('URL') || url;
}

/** Leitura: o painel chama a cada 20 segundos, com a aba aberta. */
function doGet() {
  const cache = CacheService.getScriptCache();
  const guardado = cache.get('eventos');
  if (guardado) return json_(JSON.parse(guardado));

  const agora = new Date();
  const ini = new Date(agora.getTime() - DIAS_ANTES * 864e5);
  const fim = new Date(agora.getTime() + DIAS_DEPOIS * 864e5);
  const saida = [];
  let pagina;
  do {
    const r = Calendar.Events.list(AGENDA_ID, {
      timeMin: ini.toISOString(), timeMax: fim.toISOString(),
      singleEvents: true, orderBy: 'startTime', maxResults: 2500, pageToken: pagina
    });
    (r.items || []).forEach(ev => {
      if (ev.status === 'cancelled') return;
      if (ev.eventType && ['workingLocation', 'outOfOffice', 'focusTime'].indexOf(ev.eventType) >= 0) return;
      eventoParaPainel_(ev).forEach(x => saida.push(x));
    });
    pagina = r.nextPageToken;
  } while (pagina);

  const resposta = { lido: Utilities.formatDate(agora, FUSO, 'dd/MM HH:mm'), eventos: saida,
    financeiro: emailsFinanceiro_().length > 0 };   // o painel só manda prazo financeiro quando a Bia está configurada
  try { cache.put('eventos', JSON.stringify(resposta), CACHE_SEG); } catch (e) {}
  return json_(resposta);
}

/** Um evento do Google vira um (ou, se ocupar vários dias inteiros, vários) item do painel. */
function eventoParaPainel_(ev) {
  const desc = String(ev.description || '');
  const tag = nome => { const m = desc.match(new RegExp('#' + nome + ':\\s*([^\\n#<]+)', 'i')); return m ? m[1].trim() : ''; };
  const meet = ev.hangoutLink ||
    ((ev.conferenceData && ev.conferenceData.entryPoints) || []).filter(p => p.entryPointType === 'video').map(p => p.uri)[0] || '';
  // so a parte antes do @ de cada convidado: o painel reconhece a equipe por ela
  const convidados = (ev.attendees || []).filter(a => !a.self && !a.resource)
    .map(a => String(a.email || '').split('@')[0].toLowerCase()).filter(Boolean);
  const base = {
    id: ev.iCalUID || ev.id,
    gid: ev.id,                       // o id que o Google usa para editar e apagar
    titulo: ev.summary || '(sem título)',
    meet: meet,
    tagCliente: tag('cliente'),
    tagResp: tag('resp'),
    tagArea: tag('area'),
    obs: obsDe_(desc),                // a descrição sem as marcas, para editar sem perder nada
    convidados: convidados
  };
  if (ev.start.date) {                       // dia inteiro (o fim do Google é exclusivo)
    const out = [];
    let d = ev.start.date;
    for (let i = 0; i < 31 && d < ev.end.date; i++) {
      out.push(Object.assign({}, base, { id: base.id + (i ? '#' + i : ''), dia: d, hora: '', fim: '', diaInteiro: true }));
      d = somaDia_(d);
    }
    if (out.length > 1) out.forEach(x => { x.varios = true; });   // vários dias: o painel manda editar no Google
    return out;
  }
  const a = new Date(ev.start.dateTime), b = new Date(ev.end.dateTime);
  return [Object.assign({}, base, {
    dia: Utilities.formatDate(a, FUSO, 'yyyy-MM-dd'),
    hora: Utilities.formatDate(a, FUSO, 'HH:mm'),
    fim: Utilities.formatDate(b, FUSO, 'HH:mm'),
    diaInteiro: false
  })];
}

/** Gravação: o painel manda {chave, acao, gid, titulo, dia, hora, fim, cliente, responsavel, convidados, avisar, meet, obs}.
 *  acao: 'criar' (padrão), 'editar' (com gid) ou 'apagar' (com gid). */
function doPost(e) {
  let p;
  try { p = JSON.parse(e.postData.contents); } catch (x) { return json_({ ok: false, erro: 'pedido ilegível' }); }
  const chave = PropertiesService.getScriptProperties().getProperty('CHAVE');
  if (!chave || p.chave !== chave) return json_({ ok: false, erro: 'chave da agenda não confere (Administração > Agenda ao vivo)' });
  const cache = CacheService.getScriptCache();
  if (p.acao === 'apagar') {
    if (!p.gid) return json_({ ok: false, erro: 'falta o evento' });
    Calendar.Events.remove(AGENDA_ID, String(p.gid), { sendUpdates: p.avisar ? 'all' : 'none' });
    cache.remove('eventos');
    return json_({ ok: true });
  }
  if (!p.titulo || !/^\d{4}-\d{2}-\d{2}$/.test(String(p.dia || ''))) return json_({ ok: false, erro: 'falta título ou dia' });

  const linhas = [];
  if (p.obs) linhas.push(String(p.obs));
  if (p.cliente) linhas.push('#cliente:' + p.cliente);
  if (p.responsavel) linhas.push('#resp:' + p.responsavel);
  if (p.area) linhas.push('#area:' + p.area);
  const ev = { summary: String(p.titulo), description: linhas.join('\n') };

  const hora = String(p.hora || '');
  if (/^\d{2}:\d{2}$/.test(hora)) {
    const fim = /^\d{2}:\d{2}$/.test(String(p.fim || '')) ? p.fim : somaHora_(hora);
    ev.start = { dateTime: p.dia + 'T' + hora + ':00', timeZone: FUSO };
    ev.end = { dateTime: p.dia + 'T' + fim + ':00', timeZone: FUSO };
  } else {
    ev.start = { date: p.dia };
    ev.end = { date: somaDia_(p.dia) };
  }
  let emails = String(p.convidados || '').split(/[,;\s]+/).filter(x => /@/.test(x));
  // financeiro: quem está na propriedade EMAIL_FINANCEIRO (a Bia) entra como convidado e recebe por e-mail
  const fin = p.area === 'fin' ? emailsFinanceiro_() : [];
  fin.forEach(x => { if (emails.indexOf(x) < 0) emails.push(x); });
  // editar não tira quem já estava convidado
  if (p.acao === 'editar' && p.gid && emails.length) {
    try {
      (Calendar.Events.get(AGENDA_ID, String(p.gid)).attendees || []).forEach(a => {
        if (a.email && emails.indexOf(a.email) < 0) emails.push(a.email);
      });
    } catch (x) {}
  }
  if (emails.length) ev.attendees = emails.map(x => ({ email: x }));
  if (p.meet) ev.conferenceData = { createRequest: { requestId: Utilities.getUuid(), conferenceSolutionKey: { type: 'hangoutsMeet' } } };

  const opcoes = { sendUpdates: (p.avisar || fin.length) ? 'all' : 'none', conferenceDataVersion: p.meet ? 1 : 0 };
  const criado = (p.acao === 'editar' && p.gid)
    ? Calendar.Events.patch(ev, AGENDA_ID, String(p.gid), opcoes)
    : Calendar.Events.insert(ev, AGENDA_ID, opcoes);
  cache.remove('eventos');                            // a próxima leitura já traz o evento novo
  return json_({ ok: true, id: criado.iCalUID || criado.id, gid: criado.id || '', meet: criado.hangoutLink || '' });
}

function obsDe_(desc) {
  return String(desc || '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/#(cliente|resp):[^\n#]*/gi, '')
    .split('\n').map(l => l.trim()).filter(Boolean).join(' · ').slice(0, 1000);
}
/** E-mails do financeiro: Configurações do projeto > Propriedades do script > EMAIL_FINANCEIRO
 *  (fica só aqui, fora do repositório e fora do banco do painel). Vários: separe por vírgula. */
function emailsFinanceiro_() {
  return String(PropertiesService.getScriptProperties().getProperty('EMAIL_FINANCEIRO') || '')
    .split(/[,;\s]+/).filter(x => /@/.test(x));
}
function somaDia_(iso) {
  const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
function somaHora_(hhmm) {
  const h = Number(hhmm.slice(0, 2)) + 1;
  if (h > 23) return '23:59';                        // não atravessa a meia-noite
  return String(h).padStart(2, '0') + ':' + hhmm.slice(3, 5);
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
