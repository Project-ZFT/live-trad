// Guest page: join with the host's code, choose a language, read the live translation and hear it read aloud.
import { guestRelay, cleanCode } from './relay.js';
import { LANGS, ORDER } from './languages.js';

const T = {
  nl: {
    title: 'Live vertaling', joinTitle: 'Volg de dienst in je eigen taal', joinText: 'Typ de code die de kerk je geeft (of scan de QR-code).',
    code: 'Code', join: 'Deelnemen', connecting: 'Verbinden…', notFound: 'Deze code is (nog) niet actief. Controleer de code of wacht tot de vertaling start – we proberen het automatisch opnieuw.',
    offline: 'Geen verbinding… opnieuw proberen', choose: 'Kies je taal', connectedTo: 'Verbonden met', waiting: 'Wachten…', live: 'Live', paused: 'Pauze',
    listen: '🎧 Luister naar de vertaling', stop: '⏸ Geluid uit', hint: 'Sluit je oortjes aan en laat dit scherm aan. De tekst wordt voorgelezen door een computerstem.',
    speed: 'Snelheid', readVerses: 'Bijbelverzen ook voorlezen', newest: '↓ Nieuwste', footer: 'Automatische vertaling uit het Roemeens – kan fouten bevatten.',
    language: 'Taal', otherCode: 'Andere code', emptyWait: 'Wachten op de spreker…', emptySmall: 'De vertaling verschijnt hier automatisch.',
    audioOn: 'Het geluid staat aan.', noTTS: 'Deze telefoon kan geen tekst voorlezen. Je kunt de tekst wel lezen.', badCode: 'Typ de code (minstens 4 tekens).', auto: 'automatisch vertaald',
    notOffered: 'Deze taal wordt hier (nog) niet aangeboden. Kies een andere taal.', bible: 'Bijbel', pickTitle: 'Kies je taal',
  },
  fr: {
    title: 'Traduction en direct', joinTitle: 'Suivez le culte dans votre langue', joinText: 'Tapez le code donné par l’église (ou scannez le code QR).',
    code: 'Code', join: 'Rejoindre', connecting: 'Connexion…', notFound: 'Ce code n’est pas (encore) actif. Vérifiez le code ou attendez que la traduction commence – nouvel essai automatique.',
    offline: 'Pas de connexion… nouvel essai', choose: 'Choisissez votre langue', connectedTo: 'Connecté à', waiting: 'En attente…', live: 'En direct', paused: 'En pause',
    listen: '🎧 Écouter la traduction', stop: '⏸ Couper le son', hint: 'Branchez vos écouteurs et laissez l’écran allumé. Le texte est lu par une voix de synthèse.',
    speed: 'Vitesse', readVerses: 'Lire aussi les versets bibliques', newest: '↓ Plus récent', footer: 'Traduction automatique du roumain – peut contenir des erreurs.',
    language: 'Langue', otherCode: 'Autre code', emptyWait: 'En attente de l’orateur…', emptySmall: 'La traduction apparaît ici automatiquement.',
    audioOn: 'Le son est activé.', noTTS: 'Ce téléphone ne peut pas lire le texte à voix haute. Vous pouvez toujours le lire.', badCode: 'Tapez le code (au moins 4 caractères).', auto: 'traduit automatiquement',
    notOffered: 'Cette langue n’est pas (encore) proposée ici. Choisissez-en une autre.', bible: 'Bible', pickTitle: 'Choisissez votre langue',
  },
  en: {
    title: 'Live translation', joinTitle: 'Follow the service in your language', joinText: 'Type the code the church gives you (or scan the QR code).',
    code: 'Code', join: 'Join', connecting: 'Connecting…', notFound: 'This code is not active (yet). Check the code or wait until the translation starts – retrying automatically.',
    offline: 'No connection… retrying', choose: 'Choose your language', connectedTo: 'Connected to', waiting: 'Waiting…', live: 'Live', paused: 'Paused',
    listen: '🎧 Listen to the translation', stop: '⏸ Audio off', hint: 'Plug in your earphones and keep this screen on. The text is read aloud by a computer voice.',
    speed: 'Speed', readVerses: 'Also read Bible verses aloud', newest: '↓ Newest', footer: 'Automatic translation from Romanian – may contain mistakes.',
    language: 'Language', otherCode: 'Other code', emptyWait: 'Waiting for the speaker…', emptySmall: 'The translation appears here automatically.',
    audioOn: 'Audio is on.', noTTS: 'This phone cannot read text aloud. You can still read it.', badCode: 'Type the code (at least 4 characters).', auto: 'automatic translation',
    notOffered: 'This language is not offered here (yet). Please choose another one.', bible: 'Bible', pickTitle: 'Choose your language',
  },
  de: {
    title: 'Live-Übersetzung', joinTitle: 'Verfolge den Gottesdienst in deiner Sprache', joinText: 'Gib den Code ein, den die Gemeinde dir gibt (oder scanne den QR-Code).',
    code: 'Code', join: 'Beitreten', connecting: 'Verbinden…', notFound: 'Dieser Code ist (noch) nicht aktiv. Prüfe den Code oder warte, bis die Übersetzung beginnt – neuer Versuch läuft automatisch.',
    offline: 'Keine Verbindung… neuer Versuch', choose: 'Wähle deine Sprache', connectedTo: 'Verbunden mit', waiting: 'Warten…', live: 'Live', paused: 'Pause',
    listen: '🎧 Übersetzung anhören', stop: '⏸ Ton aus', hint: 'Stecke deine Kopfhörer ein und lass den Bildschirm an. Der Text wird von einer Computerstimme vorgelesen.',
    speed: 'Tempo', readVerses: 'Bibelverse auch vorlesen', newest: '↓ Neueste', footer: 'Automatische Übersetzung aus dem Rumänischen – kann Fehler enthalten.',
    language: 'Sprache', otherCode: 'Anderer Code', emptyWait: 'Warten auf den Prediger…', emptySmall: 'Die Übersetzung erscheint hier automatisch.',
    audioOn: 'Der Ton ist an.', noTTS: 'Dieses Telefon kann keinen Text vorlesen. Du kannst ihn trotzdem lesen.', badCode: 'Gib den Code ein (mindestens 4 Zeichen).', auto: 'automatisch übersetzt',
    notOffered: 'Diese Sprache wird hier (noch) nicht angeboten. Wähle eine andere.', bible: 'Bibel', pickTitle: 'Wähle deine Sprache',
  },
  es: {
    title: 'Traducción en directo', joinTitle: 'Sigue el culto en tu idioma', joinText: 'Escribe el código que te da la iglesia (o escanea el código QR).',
    code: 'Código', join: 'Entrar', connecting: 'Conectando…', notFound: 'Este código no está activo (todavía). Revisa el código o espera a que empiece la traducción – reintentando automáticamente.',
    offline: 'Sin conexión… reintentando', choose: 'Elige tu idioma', connectedTo: 'Conectado a', waiting: 'Esperando…', live: 'En directo', paused: 'En pausa',
    listen: '🎧 Escuchar la traducción', stop: '⏸ Quitar el audio', hint: 'Conecta tus auriculares y deja la pantalla encendida. Una voz sintética lee el texto.',
    speed: 'Velocidad', readVerses: 'Leer también los versículos', newest: '↓ Lo más nuevo', footer: 'Traducción automática del rumano – puede contener errores.',
    language: 'Idioma', otherCode: 'Otro código', emptyWait: 'Esperando al predicador…', emptySmall: 'La traducción aparece aquí automáticamente.',
    audioOn: 'El audio está activado.', noTTS: 'Este teléfono no puede leer texto en voz alta. Aún puedes leerlo.', badCode: 'Escribe el código (al menos 4 caracteres).', auto: 'traducción automática',
    notOffered: 'Este idioma no se ofrece aquí (todavía). Elige otro.', bible: 'Biblia', pickTitle: 'Elige tu idioma',
  },
  ro: {
    title: 'Traducere live', joinTitle: 'Urmărește slujba în limba ta', joinText: 'Scrie codul primit de la biserică (sau scanează codul QR).',
    code: 'Cod', join: 'Intră', connecting: 'Mă conectez…', notFound: 'Codul nu este (încă) activ. Verifică codul sau așteaptă să înceapă traducerea – reîncerc automat.',
    offline: 'Fără legătură… reîncerc', choose: 'Alege limba', connectedTo: 'Conectat la', waiting: 'Așteptăm…', live: 'Live', paused: 'Pauză',
    listen: '🎧 Ascultă', stop: '⏸ Oprește sunetul', hint: 'Conectează căștile și lasă ecranul aprins. Textul este citit de o voce sintetică.',
    speed: 'Viteză', readVerses: 'Citește și versetele', newest: '↓ Cele mai noi', footer: 'Text recunoscut automat – poate conține greșeli.',
    language: 'Limba', otherCode: 'Alt cod', emptyWait: 'Așteptăm vorbitorul…', emptySmall: 'Textul apare aici automat.',
    audioOn: 'Sunetul este pornit.', noTTS: 'Acest telefon nu poate citi textul cu voce tare. Îl poți citi.', badCode: 'Scrie codul (cel puțin 4 caractere).', auto: 'traducere automată',
    notOffered: 'Această limbă nu este (încă) oferită aici. Alege alta.', bible: 'Biblia', pickTitle: 'Alege limba',
  },
};

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem('cl.inv.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('cl.inv.' + k, JSON.stringify(v)); } catch (e) { /* no storage */ } },
};

const browserLang = (navigator.language || 'en').slice(0, 2).toLowerCase();
let ui = store.get('ui', T[browserLang] ? browserLang : 'en');
let lang = store.get('lang', null);
let relay = null, code = '', pendingCode = '', hello = null, connState = 'connecting', hostListening = false;
const t = (k) => (T[ui] || T.en)[k];

// ───────── texts ─────────
function texts() {
  document.documentElement.lang = ui;
  document.title = t('title');
  $('titlu').textContent = hello ? (hello.host + ' · ' + hello.church) : t('title');
  $('tCodTitlu').textContent = t('joinTitle');
  $('tCodText').textContent = t('joinText');
  $('tCod').textContent = t('code');
  $('btnIntra').textContent = t('join');
  $('tConectatLa').textContent = hello ? t('connectedTo') : '';
  $('tAlege').textContent = lang ? t('choose') : ORDER.map((l) => T[l].pickTitle).filter((x, i, a) => a.indexOf(x) === i).slice(0, 3).join(' · ');
  $('btnAltCod').textContent = t('otherCode');
  $('tViteza').textContent = t('speed');
  $('tCitesteVersete').textContent = t('readVerses');
  $('tGol').textContent = t('emptyWait');
  $('tGolMic').textContent = t('emptySmall');
  $('jos').textContent = t('newest');
  $('tSubsol').textContent = lang === 'ro' ? T.ro.footer : t('footer');
  $('indiciuAudio').textContent = t('hint');
  $('btnLimba').textContent = (lang ? LANGS[lang].short + ' · ' : '') + t('language');
  listenButton();
  drawStatus();
}

function step(name) {
  $('pasCod').hidden = name !== 'code';
  $('pasLimba').hidden = name !== 'lang';
  $('pasLive').hidden = name !== 'live';
  const liveStep = name === 'live';
  $('mic').hidden = $('mare').hidden = !liveStep;
  $('stare').hidden = name === 'code' || !relay;
}

function drawStatus() {
  const el = $('stare');
  const ok = connState === 'connected';
  el.classList.toggle('live', ok && hostListening);
  el.classList.toggle('rau', !ok);
  $('stareText').textContent = !ok ? (connState === 'notfound' ? t('waiting') : connState === 'offline' ? t('offline') : t('connecting'))
    : hostListening ? t('live') : t('paused');
}

function message(text, info) {
  const el = $('mesajCod');
  el.hidden = !text;
  el.textContent = text || '';
  el.classList.toggle('info', !!info);
}

// ───────── joining ─────────
function join(c) {
  code = cleanCode(c);
  if (code.length < 4) { message(t('badCode')); return; }
  store.set('code', code);
  if (relay) relay.stop();
  hello = null;
  clearLines();
  message(t('connecting'), true);
  relay = guestRelay({ code, onState: onConn, onMessage });
  relay.setLang(lang);
}

function onConn(kind) {
  connState = kind;
  drawStatus();
  if (!hello) {
    if (kind === 'notfound') message(t('notFound'));
    else if (kind === 'offline') message(t('offline'), true);
    else if (kind === 'connecting') message(t('connecting'), true);
  }
}

$('formCod').addEventListener('submit', (e) => {
  e.preventDefault();
  unlockAudio(false);
  join($('cod').value);
});
$('btnAltCod').addEventListener('click', leave);
function leave() {
  if (relay) relay.stop();
  relay = null; hello = null; pendingCode = '';
  stopSpeaking();
  message('');
  texts();
  step('code');
  $('cod').focus();
}

// The language is chosen first: the whole page, the text and the voice are then in that language.
const offeredHere = (l) => !hello || (hello.langs || []).includes(l);
function chooseLangs(note) {
  $('numeGazda').textContent = hello ? hello.host + ' – ' + hello.church : '';
  $('limbiInvitat').innerHTML = ORDER.map((l) => `<button type="button" data-l="${l}" ${offeredHere(l) ? '' : 'disabled'} class="${l === lang ? 'ales' : ''}">${LANGS[l].name}<span>${LANGS[l].short}</span></button>`).join('');
  const m = $('mesajLimba');
  m.hidden = !note;
  m.textContent = note || '';
  $('btnAltCod').hidden = !hello;
  step('lang');
}
$('limbiInvitat').addEventListener('click', (e) => {
  const b = e.target.closest('[data-l]');
  if (!b || b.disabled) return;
  unlockAudio(false);
  pickLang(b.dataset.l);
});
function pickLang(l) {
  lang = l;
  store.set('lang', l);
  ui = l;
  store.set('ui', ui);
  texts();
  if (hello) { clearLines(); relay.setLang(l); step('live'); keepAwake(); return; }
  step('code');
  if (pendingCode) { const c = pendingCode; pendingCode = ''; join(c); } else $('cod').focus();
}
$('btnLimba').addEventListener('click', () => {
  stopSpeaking();
  chooseLangs();
});

// ───────── messages from the host ─────────
function onMessage(m) {
  if (m.t === 'hello') {
    hello = m;
    hostListening = !!m.listening;
    message('');
    texts();
    if (lang && offeredHere(lang)) { relay.setLang(lang); step('live'); keepAwake(); } else chooseLangs(lang ? t('notOffered') : '');
    drawStatus();
  } else if (m.t === 'history') {
    clearLines();
    (m.lines || []).forEach((l) => addLine(l, false));
    showVerse(m.verse, false);
    typing(!!m.typing);
    hostListening = !!m.listening;
    drawStatus();
  } else if (m.t === 'line') {
    addLine(m, true);
  } else if (m.t === 'partial') {
    current.textContent = m.text || '…';
    current.hidden = !m.text;
    if (m.text) empty.hidden = true;
    afterChange();
  } else if (m.t === 'verse') {
    showVerse(m.verse, true);
  } else if (m.t === 'typing') {
    typing(!!m.on);
  } else if (m.t === 'state') {
    hostListening = !!m.listening;
    drawStatus();
    if (hello && m.langs) hello.langs = m.langs;
  } else if (m.t === 'bye') {
    hostListening = false;
    drawStatus();
  }
}

// ───────── text ─────────
const list = $('lista'), current = $('curent'), empty = $('gol');
let stuck = true;
const toBottom = () => { list.scrollTop = list.scrollHeight; };
list.addEventListener('scroll', () => {
  stuck = list.scrollHeight - list.scrollTop - list.clientHeight < 60;
  $('jos').hidden = stuck;
});
$('jos').addEventListener('click', () => { stuck = true; toBottom(); $('jos').hidden = true; });
const afterChange = () => { if (stuck) toBottom(); else $('jos').hidden = false; };

function clearLines() {
  list.querySelectorAll('p:not(#curent)').forEach((p) => p.remove());
  empty.hidden = false;
  current.hidden = true;
  $('verset').hidden = true;
  lastVerseSig = '';
}

function addLine(l, fresh) {
  if (!l || !l.text) return;
  empty.hidden = true;
  const p = document.createElement('p');
  p.textContent = l.text;
  list.insertBefore(p, current);
  current.textContent = '…'; // the line being spoken starts again
  const all = list.querySelectorAll('p:not(#curent)');
  all.forEach((x, i) => x.classList.toggle('vechi', i < all.length - 3));
  if (all.length > 200) all[0].remove();
  afterChange();
  if (fresh) say(l.text, p);
}

function typing(on) {
  current.hidden = !on;
  if (!on) current.textContent = '…';
  if (on) { empty.hidden = true; afterChange(); }
}

let lastVerseSig = '';
function showVerse(v, fresh) {
  const el = $('verset');
  el.hidden = !(v && v.text);
  if (!v || !v.text) { lastVerseSig = ''; return; }
  el.textContent = v.text;
  const b = document.createElement('b');
  b.textContent = v.ref || '';
  el.appendChild(b);
  if (v.version && !v.auto) {
    const s = document.createElement('small');
    s.textContent = v.version;
    el.appendChild(s);
  }
  if (v.auto) {
    const s = document.createElement('small');
    s.textContent = t('auto');
    el.appendChild(s);
  }
  const sig = (v.ref || '') + '|' + v.text.length;
  if (fresh && sig !== lastVerseSig && $('citesteVersete').checked) say((v.ref ? v.ref + '. ' : '') + v.text, null, true);
  lastVerseSig = sig;
}

// text size, remembered on the phone
let size = store.get('marime', 22);
function applySize() {
  size = Math.max(15, Math.min(44, size));
  document.documentElement.style.setProperty('--size', size + 'px');
  store.set('marime', size);
}
applySize();
$('mic').addEventListener('click', () => { size -= 2; applySize(); });
$('mare').addEventListener('click', () => { size += 2; applySize(); });

// ───────── reading aloud (the phone's synthetic voice) ─────────
const synth = window.speechSynthesis;
let listening = false, queue = [], speaking = false, unlocked = false;
$('viteza').value = String(store.get('viteza', 1));
$('viteza').addEventListener('change', () => store.set('viteza', +$('viteza').value));
$('citesteVersete').checked = store.get('versete', true);
$('citesteVersete').addEventListener('change', () => store.set('versete', $('citesteVersete').checked));

function bestVoice(l) {
  if (!synth) return null;
  const wants = (LANGS[l].voices || [LANGS[l].voice]).map((x) => x.toLowerCase());
  const all = synth.getVoices().filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith(l));
  let best = null, bestScore = -1;
  for (const v of all) {
    let s = 0;
    if (/natural|neural|premium|enhanced|online|wavenet|studio/i.test(v.name)) s += 4;
    if (/google|siri/i.test(v.name)) s += 2;
    const k = wants.indexOf(v.lang.replace('_', '-').toLowerCase());
    if (k >= 0) s += 3 - Math.min(k, 2); // the local variant first (fr-BE, nl-BE…), then the others
    if (v.default) s += 1;
    if (s > bestScore) { best = v; bestScore = s; }
  }
  return best;
}
if (synth && 'onvoiceschanged' in synth) synth.onvoiceschanged = () => {};

function unlockAudio(speakIt) {
  if (!synth || unlocked && !speakIt) return;
  try {
    const u = new SpeechSynthesisUtterance(speakIt && lang ? T[lang].audioOn : ' ');
    u.lang = LANGS[lang || 'en'].voice;
    const v = lang && bestVoice(lang);
    if (v) u.voice = v;
    u.volume = speakIt ? 1 : 0;
    synth.speak(u);
    unlocked = true;
  } catch (e) { /* not supported */ }
}

function say(text, el, isVerse) {
  if (!listening || !synth || !lang) return;
  queue.push({ text, el, isVerse });
  // falling behind the speaker: skip the oldest phrases
  while (queue.length > 3) queue.shift();
  pump();
}

function pump() {
  if (speaking || !queue.length || !listening) return;
  const item = queue.shift();
  const u = new SpeechSynthesisUtterance(item.text);
  u.lang = LANGS[lang].voice;
  const v = bestVoice(lang);
  if (v) u.voice = v;
  const base = +$('viteza').value || 1;
  // a little faster when phrases are waiting, so the voice stays close to the speaker
  u.rate = Math.min(2, base * (queue.length >= 2 ? 1.25 : queue.length === 1 ? 1.12 : 1));
  speaking = true;
  if (item.el) item.el.classList.add('vorbit');
  const done = () => {
    if (item.el) item.el.classList.remove('vorbit');
    speaking = false;
    pump();
  };
  u.onend = done;
  u.onerror = done;
  synth.speak(u);
}

function stopSpeaking() {
  queue = [];
  speaking = false;
  if (synth) synth.cancel();
  list.querySelectorAll('p.vorbit').forEach((p) => p.classList.remove('vorbit'));
}

function listenButton() {
  const b = $('btnAsculta');
  b.textContent = listening ? t('stop') : t('listen');
  b.classList.toggle('pornit', listening);
  $('optiuniAudio').hidden = !listening;
  $('indiciuAudio').hidden = listening;
}
$('btnAsculta').addEventListener('click', () => {
  if (!synth) { $('indiciuAudio').hidden = false; $('indiciuAudio').textContent = t('noTTS'); return; }
  listening = !listening;
  stopSpeaking();
  if (listening) unlockAudio(true);
  listenButton();
  keepAwake();
});

// keep the phone screen on (speech stops on many phones when the screen locks)
let lock = null;
function keepAwake() {
  if (!('wakeLock' in navigator) || lock || document.visibilityState !== 'visible') return;
  navigator.wakeLock.request('screen').then((l) => { lock = l; l.addEventListener('release', () => { lock = null; }); }).catch(() => {});
}
document.addEventListener('visibilitychange', keepAwake);
document.addEventListener('click', keepAwake);

// ───────── start ─────────
const fromLink = new URLSearchParams(location.search).get('c');
if (lang && !LANGS[lang]) lang = null;
if (lang) ui = lang;
texts();
const startCode = cleanCode(fromLink || store.get('code', ''));
if (startCode) $('cod').value = startCode.length > 4 ? startCode.replace(/^(.*)(.{4})$/, '$1-$2') : startCode;
const autoJoin = fromLink && startCode.length >= 4;
if (!lang) { if (autoJoin) pendingCode = startCode; chooseLangs(); }
else { step('code'); if (autoJoin) join(startCode); }
