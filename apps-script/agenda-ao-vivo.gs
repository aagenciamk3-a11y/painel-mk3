/**
 * AGENDA AO VIVO — ponte entre o Google Agenda da MK3 e o Painel de Prazos
 * =========================================================================
 * O painel lê a agenda por aqui a cada minuto (doGet) e cria compromissos
 * por aqui (doPost). Este script só entrega e grava os dados: quem descobre
 * de qual cliente e de quem é cada evento é o próprio painel. Entrou ou saiu
 * cliente? Não precisa mexer aqui.
 *
 * COMO PUBLICAR (uma vez só, logado na conta aagencia.mk3@gmail.com)
 * 1. script.google.com > Novo projeto. Cole este arquivo inteiro.
 * 2. À esquerda, em "Serviços", clique em + e adicione "Google Calendar API"
 *    (é ele que traz o link do Meet e cria eventos com Meet).
 * 3. No seletor de função, escolha  configurar  e clique em Executar.
 *    Autorize o acesso. O log mostra a CHAVE (guarde para o passo 6).
 * 4. Implantar > Nova implantação > tipo "App da Web".
 *      Executar como: Eu (aagencia.mk3@gmail.com)
 *      Quem pode acessar: Qualquer pessoa
 * 5. Copie o endereço que termina em /exec.
 * 6. No painel: Administração > Agenda ao vivo. Cole o endereço e a chave.
 *    Isso fica salvo para a equipe toda: ninguém mais precisa digitar nada.
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
const CACHE_SEG = 25;               // a equipe toda lendo a cada minuto não estoura a cota

/** Rode uma vez: cria a chave que o painel usa para criar eventos. */
function configurar() {
  const props = PropertiesService.getScriptProperties();
  let chave = props.getProperty('CHAVE');
  if (!chave) {
    chave = Utilities.getUuid().replace(/-/g, '');
    props.setProperty('CHAVE', chave);
  }
  // testa o acesso à agenda e ao serviço avançado
  Calendar.Events.list(AGENDA_ID, { maxResults: 1, timeMin: new Date().toISOString() });
  Logger.log('Tudo certo. CHAVE para colar no painel: ' + chave);
}

/** Leitura: o painel chama a cada minuto. */
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

  const resposta = { lido: Utilities.formatDate(agora, FUSO, 'dd/MM HH:mm'), eventos: saida };
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
    titulo: ev.summary || '(sem título)',
    meet: meet,
    tagCliente: tag('cliente'),
    tagResp: tag('resp'),
    convidados: convidados
  };
  if (ev.start.date) {                       // dia inteiro (o fim do Google é exclusivo)
    const out = [];
    let d = ev.start.date;
    for (let i = 0; i < 31 && d < ev.end.date; i++) {
      out.push(Object.assign({}, base, { id: base.id + (i ? '#' + i : ''), dia: d, hora: '', fim: '', diaInteiro: true }));
      d = somaDia_(d);
    }
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

/** Criação: o painel manda {chave, titulo, dia, hora, fim, cliente, responsavel, convidados, avisar, meet, obs}. */
function doPost(e) {
  let p;
  try { p = JSON.parse(e.postData.contents); } catch (x) { return json_({ ok: false, erro: 'pedido ilegível' }); }
  const chave = PropertiesService.getScriptProperties().getProperty('CHAVE');
  if (!chave || p.chave !== chave) return json_({ ok: false, erro: 'chave da agenda não confere (Administração > Agenda ao vivo)' });
  if (!p.titulo || !/^\d{4}-\d{2}-\d{2}$/.test(String(p.dia || ''))) return json_({ ok: false, erro: 'falta título ou dia' });

  const linhas = [];
  if (p.obs) linhas.push(String(p.obs));
  if (p.cliente) linhas.push('#cliente:' + p.cliente);
  if (p.responsavel) linhas.push('#resp:' + p.responsavel);
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
  const emails = String(p.convidados || '').split(/[,;\s]+/).filter(x => /@/.test(x));
  if (emails.length) ev.attendees = emails.map(x => ({ email: x }));
  if (p.meet) ev.conferenceData = { createRequest: { requestId: Utilities.getUuid(), conferenceSolutionKey: { type: 'hangoutsMeet' } } };

  const criado = Calendar.Events.insert(ev, AGENDA_ID, {
    sendUpdates: p.avisar ? 'all' : 'none',
    conferenceDataVersion: p.meet ? 1 : 0
  });
  CacheService.getScriptCache().remove('eventos');    // a próxima leitura já traz o evento novo
  return json_({ ok: true, id: criado.iCalUID || criado.id, meet: criado.hangoutLink || '' });
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
