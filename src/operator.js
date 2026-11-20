// Host page: listens to the preacher (Romanian), shows the verses on the projection screen as soon as they are heard,
// translates what is said for the guests' phones, and sends them the same verses from the Bible of their own language.
import * as Ref from './references.js';
import * as Quotes from './quotes.js';
import * as Account from './account.js';
import { createLive } from './live.js';
import { qrSvg } from './qr.js';
import { LANGS, TRANSLATED } from './languages.js';
import * as Bibles from './bibles.js';
import { createAudioIn } from './audio-in.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem('cl.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('cl.' + k, JSON.stringify(v)); } catch (e) { /* works without storage too */ } },
};
const clock = () => new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
const same = (a, b) => a && b && a.b === b.b && a.c === b.c && (a.v || 1) === (b.v || 1) && (a.v2 || 0) === (b.v2 || 0);

let B = null; // B[book][chapter-1][verse-1] – Romanian (Cornilescu)

const st = {
  live: null, // { b, c, from, to } sent to the guests
  until: null, // last verse of a requested passage that was longer than MAX_VERSES
  visible: false,
  ctx: null, // last reference (shown or detected), for "versetul 17"
  auto: store.get('auto', true),
  transcript: store.get('transcriere', false),
  quotes: store.get('citate', true),
  theme: Object.assign({ fundal: 'negru', pozitie: 'centru', font: 'sans', scara: 1, numere: true, limba2: '' }, store.get('tema2', {})),
  detected: [],
};

const verseText = (b, c, v) => B[b][c - 1][v - 1];
const verseCount = (b, c) => B[b][c - 1].length;

// ───────── what fits on one screen ─────────
const second = () => (st.theme.limba2 && Bibles.get(st.theme.limba2) ? st.theme.limba2 : null);
function passageEnd(b, c, from, limit) {
  const low = st.theme.pozitie === 'jos', two = !!second();
  const budget = (low ? 230 : 400) * (two ? 0.55 : 1), most = low || two ? 2 : 4;
  let to = from, chars = verseText(b, c, from).length;
  while (to < limit && to - from + 1 < most && chars + verseText(b, c, to + 1).length <= budget) {
    chars += verseText(b, c, to + 1).length;
    to++;
  }
  return to;
}
function loadSecond() {
  const l = st.theme.limba2;
  if (l && !Bibles.get(l)) Bibles.load(l).then(reflow);
}
function reflow() {
  const L = st.live;
  if (L) { const keep = st.visible; show({ b: L.b, c: L.c, v: L.from, v2: st.until || L.to }); st.visible = keep; update(); } else send();
}

// ───────── the verse on screen (and on the guests' phones) ─────────
function show(r, source) {
  if (!B) return;
  const max = verseCount(r.b, r.c);
  const from = Math.min(r.v || 1, max);
  const until = r.v2 ? Math.min(r.v2, max) : from;
  const to = passageEnd(r.b, r.c, from, until);
  st.live = { b: r.b, c: r.c, from, to };
  st.until = until > to ? until : null;
  st.visible = true;
  st.ctx = { b: r.b, c: r.c };
  update();
}

function next() {
  const L = st.live;
  if (!L) return;
  if (L.to < verseCount(L.b, L.c)) {
    const from = L.to + 1;
    const limit = st.until && st.until >= from ? st.until : from;
    const to = passageEnd(L.b, L.c, from, limit);
    st.live = { b: L.b, c: L.c, from, to };
    if (!st.until || to >= st.until) st.until = null;
  } else if (L.c < B[L.b].length) {
    st.live = { b: L.b, c: L.c + 1, from: 1, to: 1 }; st.until = null;
  } else if (L.b < B.length - 1) {
    st.live = { b: L.b + 1, c: 1, from: 1, to: 1 }; st.until = null;
  } else return;
  afterMove();
}

function prev() {
  const L = st.live;
  if (!L) return;
  st.until = null;
  if (L.from > 1) st.live = { b: L.b, c: L.c, from: L.from - 1, to: L.from - 1 };
  else if (L.c > 1) { const n = verseCount(L.b, L.c - 1); st.live = { b: L.b, c: L.c - 1, from: n, to: n }; }
  else if (L.b > 0) { const c = B[L.b - 1].length, n = verseCount(L.b - 1, c); st.live = { b: L.b - 1, c, from: n, to: n }; }
  else return;
  afterMove();
}

function afterMove() {
  st.visible = true;
  st.ctx = { b: st.live.b, c: st.live.c };
  update();
}

function hide(force) {
  if (!st.live) return;
  st.visible = force === true ? false : !st.visible;
  update();
}

// ───────── link with the projection screen ─────────
const sessionId = Math.random().toString(36).slice(2);
let msgCount = 0, screenWin = null, channel = null;
try { channel = new BroadcastChannel('cuvant-live'); } catch (e) { /* direct link only */ }

function post(m, preview) {
  if (screenWin && !screenWin.closed) { try { screenWin.postMessage(m, '*'); } catch (e) { /* closed */ } }
  if (channel) { try { channel.postMessage(m); } catch (e) { /* ignored */ } }
  try { $('previz').contentWindow.postMessage(preview || m, '*'); } catch (e) { /* still loading */ }
}

function send() {
  const L = st.live;
  const m = { tip: 'stare', id: sessionId + '-' + ++msgCount, vizibil: st.visible && !!L, tema: st.theme, subEcran: false, ref: '', versete: [] };
  if (L) {
    const refObj = { b: L.b, c: L.c, v: L.from, v2: L.to };
    m.ref = Ref.format(refObj);
    for (let v = L.from; v <= L.to; v++) m.versete.push({ n: v, t: verseText(L.b, L.c, v) });
    m.cheie = L.b + ':' + L.c + ':' + L.from + '-' + L.to;
    const l2 = second();
    const two = l2 && Bibles.verses(l2, refObj);
    if (two) { m.versete2 = two.verses; m.ref2 = two.ref; }
    // the guests get the verse at the same moment, each from the Bible of their language
    live.verse(m.vizibil ? { key: m.cheie, refRo: m.ref, textRo: m.versete.map((x) => x.t).join(' '), refObj } : null);
  } else live.verse(null);
  // the preview shows the verse even when the screen is hidden
  post(m, Object.assign({}, m, { id: m.id + 'p', vizibil: !!L }));
}

function openScreen() {
  if (screenWin && !screenWin.closed) { screenWin.focus(); return; }
  screenWin = window.open('ecran.html', 'cuvant-ecran', 'popup,width=1280,height=720');
  if (!screenWin) {
    $('stareEcran').textContent = 'Browserul a blocat fereastra – permite ferestrele pop-up pentru această pagină.';
    return;
  }
  // move it to the second monitor (projector) when there is one
  if ('getScreenDetails' in window) {
    window.getScreenDetails().then((d) => {
      const other = d.screens.find((x) => x !== d.currentScreen);
      if (other && screenWin && !screenWin.closed) {
        screenWin.moveTo(other.availLeft, other.availTop);
        screenWin.resizeTo(other.availWidth, other.availHeight);
      }
    }).catch(() => { /* no permission: moved by hand */ });
  }
  screenState();
}
function screenState() {
  const open = screenWin && !screenWin.closed;
  $('stareEcran').textContent = open ? 'Ecran deschis – mută-l pe proiector și apasă F' : '';
  label($('btnEcran'), open ? 'Adu ecranul în față' : 'Deschide ecranul de proiecție', 'Ecran');
}
function received(d) {
  if (!d) return;
  if (d.tip === 'gata') { send(); screenState(); } else if (d.tip === 'tasta') key(d.tasta);
}
window.addEventListener('message', (e) => received(e.data));
if (channel) channel.onmessage = (e) => received(e.data);
setInterval(screenState, 2000);

// ───────── drawing ─────────
function label(el, long, short) {
  el.innerHTML = '<span class="lung">' + esc(long) + '</span><span class="scurt">' + esc(short) + '</span>';
}

function update() {
  send();
  const L = st.live;
  $('refCurenta').textContent = L ? Ref.format({ b: L.b, c: L.c, v: L.from, v2: L.to }) : '—';
  const on = st.visible && !!L;
  const badge = $('insemnLive');
  badge.textContent = on ? 'PE ECRAN' : 'ASCUNS';
  badge.classList.toggle('live', on);
  $('btnAscunde').textContent = on || !L ? 'Ascunde' : 'Arată';
  drawLists();
}

function excerpt(r) {
  const t = verseText(r.b, r.c, r.v || 1);
  return t.length > 70 ? t.slice(0, 70) + '…' : t;
}
const onScreen = (r) => { const L = st.live; return st.visible && !!L && L.b === r.b && L.c === r.c && L.from === (r.v || 1); };

function drawLists() {
  if (!B) return;
  $('detectii').innerHTML = st.detected.length
    ? st.detected.map((d, i) => `<div class="rand ${onScreen(d.r) ? 'pe-ecran' : ''}" data-i="${i}"><div class="corp"><div class="titlu">${esc(Ref.format(d.r))}</div><div class="extras">${d.text ? '„' + esc(d.text) + '”' : esc(excerpt(d.r))}</div></div><span class="eticheta">${d.kind ? d.kind + ' · ' : ''}${d.time}</span></div>`).join('')
    : '<div class="gol">Încă nimic.</div>';
}
$('detectii').addEventListener('click', (e) => {
  const row = e.target.closest('.rand');
  if (row) show(st.detected[+row.dataset.i].r, 'voce');
});

// ───────── search ─────────
let INDEX = null;
function index() {
  if (INDEX || !B) return INDEX || [];
  INDEX = [];
  for (let b = 0; b < B.length; b++) for (let c = 0; c < B[b].length; c++) for (let v = 0; v < B[b][c].length; v++) {
    INDEX.push({ b, c: c + 1, v: v + 1, t: Ref.plain(B[b][c][v]) });
  }
  return INDEX;
}

let suggestions = [], picked = 0;
function search(q) {
  const out = [];
  q = q.trim();
  if (!q || !B) return out;
  const ctx = st.ctx ? { b: st.ctx.b, c: st.ctx.c } : null;
  Ref.find(q, ctx, { typed: true }).refs.forEach((r) => out.push(r));
  const words = Ref.plain(q).replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter((w) => w.length >= 2);
  if (!out.length && words.length && words.join('').length >= 3) {
    const phrase = words.join(' ');
    const exact = [], rest = [];
    for (const e of index()) {
      if (!words.every((w) => e.t.includes(w))) continue;
      (e.t.includes(phrase) ? exact : rest).push({ b: e.b, c: e.c, v: e.v });
      if (exact.length >= 8) break;
    }
    exact.concat(rest).slice(0, 8).forEach((r) => out.push(r));
  }
  return out;
}

function drawSuggestions() {
  const el = $('sugestii');
  el.hidden = !suggestions.length;
  el.innerHTML = suggestions.map((r, i) => `<div class="sugestie ${i === picked ? 'ales' : ''}" data-i="${i}"><b>${esc(Ref.format(r))}</b><span>${esc(verseText(r.b, r.c, r.v || 1))}</span></div>`).join('');
}
$('cauta').addEventListener('input', (e) => { suggestions = search(e.target.value); picked = 0; drawSuggestions(); });
$('cauta').addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' && suggestions.length) { picked = (picked + 1) % suggestions.length; drawSuggestions(); e.preventDefault(); }
  else if (e.key === 'ArrowUp' && suggestions.length) { picked = (picked - 1 + suggestions.length) % suggestions.length; drawSuggestions(); e.preventDefault(); }
  else if (e.key === 'Enter' && suggestions[picked]) { pickSuggestion(picked); e.preventDefault(); }
  else if (e.key === 'Escape') { e.target.value = ''; suggestions = []; drawSuggestions(); e.target.blur(); }
});
$('sugestii').addEventListener('mousedown', (e) => {
  const s = e.target.closest('.sugestie');
  if (s) { pickSuggestion(+s.dataset.i); e.preventDefault(); }
});
function pickSuggestion(i) {
  show(suggestions[i], 'căutare');
  $('cauta').value = '';
  suggestions = [];
  drawSuggestions();
}

// ───────── speech recognition ─────────
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, listening = false, session = 0, pendingBook = null, netErrors = 0;
const handled = {};
const finals = [];

const listenText = () => 'Ascult… rostește o referință sau citește un verset.';
function micState(text, cls) {
  const el = $('stareMic');
  el.textContent = text;
  el.className = 'stare' + (cls ? ' ' + cls : '');
}
function micButton() {
  $('btnMic').textContent = listening ? 'Oprește ascultarea' : 'Pornește ascultarea';
  $('btnMic').classList.toggle('asculta', listening);
  $('btnMic').classList.toggle('principal', !listening);
  live.setListening(listening);
}

// ───────── sound source (built-in mic, jack input, USB sound card…) ─────────
const audioIn = createAudioIn({
  onLevel(level, clipping) {
    const bar = $('nivelBara');
    bar.style.width = Math.round(level * 100) + '%';
    bar.className = clipping || level > 0.92 ? 'prea' : level < 0.25 ? 'slab' : '';
  },
  onDevices(list, current) {
    const sel = $('sursaAudio');
    sel.innerHTML = '<option value="">Microfonul implicit (din Windows)</option>'
      + list.map((d, i) => `<option value="${esc(d.deviceId)}">${esc(d.label || 'Intrare audio ' + (i + 1))}</option>`).join('');
    sel.value = list.some((d) => d.deviceId === current) ? current : '';
  },
});
$('optEcou').checked = audioIn.echo;
$('optEcou').addEventListener('change', (e) => {
  audioIn.setEcho(e.target.checked);
  if (listening && rec) rec.stop(); // restarts by itself with the new setting
});
$('sursaAudio').addEventListener('change', (e) => {
  audioIn.setDevice(e.target.value);
  if (listening && rec) rec.stop(); // restarts by itself with the new source
});

async function startSession() {
  session++;
  const s = session;
  let track = null;
  try { track = await audioIn.track(); } catch (e) {
    listening = false;
    micButton();
    micState(e && e.name === 'NotAllowedError' ? 'Microfonul e blocat. Permite accesul la microfon din bara de adrese și pornește din nou.' : 'Nu pot deschide sursa audio aleasă. Verifică cablul sau alege altă sursă.', 'eroare');
    return;
  }
  if (!listening || s !== session) return;
  rec = new SR();
  rec.lang = 'ro-RO';
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 3;
  rec.onstart = () => { netErrors = 0; micState(listenText(), 'activ'); };
  rec.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      const alts = [];
      for (let k = 0; k < res.length; k++) alts.push(res[k].transcript);
      heard(s + ':' + i, alts, res.isFinal);
    }
  };
  rec.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      listening = false;
      micState('Microfonul e blocat. Permite accesul la microfon din bara de adrese și pornește din nou.', 'eroare');
    } else if (e.error === 'audio-capture') {
      listening = false;
      micState('Nu găsesc niciun microfon conectat.', 'eroare');
    } else if (e.error === 'network') {
      netErrors++;
      micState('Fără legătură la internet – recunoașterea vocală are nevoie de internet. Reîncerc…', 'eroare');
    }
  };
  rec.onend = () => {
    if (listening) setTimeout(() => { if (listening) startSession(); }, netErrors ? Math.min(5000, 1000 * netErrors) : 250);
    else { micButton(); if (!$('stareMic').classList.contains('eroare')) micState('Microfonul este oprit.'); }
  };
  // the chosen source, without echo cancellation (Chrome 135+); older versions listen to the default microphone
  try { rec.start(track); } catch (e) { try { rec.start(); } catch (x) { /* already running */ } }
}

$('btnMic').addEventListener('click', () => {
  if (!SR) {
    micState('Acest browser nu are recunoaștere vocală. Deschide pagina în Google Chrome sau Microsoft Edge.', 'eroare');
    return;
  }
  listening = !listening;
  micButton();
  if (listening) { micState('Pornesc microfonul…'); startSession(); } else { if (rec) rec.stop(); audioIn.close(); }
});

function showTranscript(text, final) {
  if (!st.transcript) return; // nothing said is shown or kept unless asked for
  if (final) { finals.push(text); if (finals.length > 6) finals.shift(); }
  const el = $('transcriere');
  el.innerHTML = finals.map((t) => `<span class="final">${esc(t)}</span>`).join('') + (final ? '' : `<span class="provizoriu">${esc(text)}</span>`);
  el.scrollTop = el.scrollHeight;
}

// ───────── verses quoted without a reference ─────────
const win = { finals: [], interim: [], base: 0, used: 0 };
const totalWords = () => win.base + win.finals.length + win.interim.length;

function prepareQuotes() {
  if (st.quotes && B && !Quotes.ready()) Quotes.prepare(B, Ref.tokens);
}

function remember(text, final) {
  const words = Ref.tokens(text).filter((x) => /^[a-z0-9]+$/.test(x));
  const now = Date.now();
  if (final) { words.forEach((w) => win.finals.push({ w, t: now })); win.interim = []; } else win.interim = words;
  while (win.finals.length > 60 || (win.finals.length && now - win.finals[0].t > 30000)) { win.finals.shift(); win.base++; }
}

function findQuote() {
  if (!st.quotes || !Quotes.ready()) return;
  const all = win.finals.map((x) => x.w).concat(win.interim);
  const total = win.base + all.length;
  if (win.used > total) win.used = total;
  const start = Math.max(win.used, total - 28, win.base);
  const words = all.slice(start - win.base);
  if (words.length < 4) return;
  const L = st.live;
  const m = Quotes.match(words, L ? { b: L.b, c: L.c, v: L.to, from: L.from } : null);
  if (!m) return;
  win.used = start + m.end + 1;
  if (L && st.visible && L.b === m.b && L.c === m.c && m.v >= L.from && m.v <= L.to) return; // already sent
  const r = { b: m.b, c: m.c, v: m.v };
  if (!same(st.detected[0] && st.detected[0].r, r)) {
    st.detected.unshift({ key: 'citat', r, text: '', time: clock(), kind: 'citat' });
    st.detected.length = Math.min(st.detected.length, 30);
  }
  st.ctx = { b: m.b, c: m.c };
  if (!st.auto) { drawLists(); return; }
  if (L && st.visible && m.next && m.v === L.to + 1) next(); // the reader moved on to the next verse
  else show(r, 'citat');
}

function heard(key, alts, final) {
  const text = (alts[0] || '').trim();
  if (!text) return;
  showTranscript(text, final);
  remember(text, final);
  live.heard(text, final, key);
  if (!B) return;
  // a spoken reference wins; words before it no longer count for quotes
  if (findReference(key, alts, final, text)) { win.used = totalWords(); return; }
  findQuote();
}

function findReference(key, alts, final, text) {
  const ctx = {};
  if (st.ctx) { ctx.b = st.ctx.b; ctx.c = st.ctx.c; }
  if (pendingBook && Date.now() - pendingBook.t < 12000) ctx.pendingBook = pendingBook.b;
  let res = null, used = text;
  for (const a of final ? alts : [alts[0]]) {
    const g = Ref.find(a, ctx);
    if (g.refs.length) { res = g; used = a.trim(); break; }
    if (!res) res = g;
  }
  if (final && res.pendingBook != null) pendingBook = { b: res.pendingBook, t: Date.now() };
  if (!res.refs.length) return false;
  const r = res.refs[res.refs.length - 1];
  if (!final && r.v == null) return false; // chapter without verse: wait for the end of the phrase
  pendingBook = null;
  const sig = [r.b, r.c, r.v, r.v2].join(':');
  if (handled[key] === sig) return false; // same reference already handled: the rest may be reading
  handled[key] = sig;
  const ref = { b: r.b, c: r.c };
  if (r.v != null) ref.v = r.v;
  if (r.v2 != null) ref.v2 = r.v2;
  const d = { key, r: ref, text: !st.transcript ? '' : used.length > 80 ? '…' + used.slice(-80) : used, time: clock() };
  if (st.detected[0] && st.detected[0].key === key) st.detected[0] = d; else st.detected.unshift(d);
  st.detected.length = Math.min(st.detected.length, 30);
  st.ctx = { b: r.b, c: r.c };
  if (st.auto) show(ref, 'voce'); else drawLists();
  return true;
}


let tryCount = 0;
function tryPhrase() {
  const t = $('proba').value.trim();
  if (t) heard('proba:' + ++tryCount, [t], true);
  $('proba').value = '';
}
$('formProba').addEventListener('submit', (e) => { e.preventDefault(); tryPhrase(); });

// ───────── buttons, options, keys ─────────
$('btnEcran').addEventListener('click', openScreen);
$('btnInainte').addEventListener('click', next);
$('btnInapoi').addEventListener('click', prev);
$('btnAscunde').addEventListener('click', () => hide());

$('optAuto').checked = st.auto;
$('optAuto').addEventListener('change', (e) => { st.auto = e.target.checked; store.set('auto', st.auto); });
$('optCitate').checked = st.quotes;
$('optCitate').addEventListener('change', (e) => {
  st.quotes = e.target.checked;
  store.set('citate', st.quotes);
  win.used = totalWords();
  prepareQuotes();
});
$('optTranscriere').checked = st.transcript;
$('zonaTranscriere').hidden = !st.transcript;
$('optTranscriere').addEventListener('change', (e) => {
  st.transcript = e.target.checked;
  store.set('transcriere', st.transcript);
  $('zonaTranscriere').hidden = !st.transcript;
  if (!st.transcript) {
    finals.length = 0;
    $('transcriere').innerHTML = '';
    st.detected.forEach((d) => { d.text = ''; });
    drawLists();
  }
});

const themeFields = { temaFundal: 'fundal', temaPozitie: 'pozitie', temaFont: 'font', temaScara: 'scara', temaNumere: 'numere', temaLimba2: 'limba2' };
Object.keys(themeFields).forEach((id) => {
  const el = $(id), k = themeFields[id];
  if (el.type === 'checkbox') el.checked = !!st.theme[k]; else el.value = st.theme[k];
  el.addEventListener('input', () => {
    st.theme[k] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value;
    store.set('tema2', st.theme);
    if (k === 'limba2') loadSecond();
    if (k === 'pozitie' || k === 'limba2') reflow(); else send();
  });
});

function key(k) {
  if (k === 'ArrowRight' || k === 'PageDown' || k === ' ') next();
  else if (k === 'ArrowLeft' || k === 'PageUp') prev();
  else if (k === 'b' || k === 'B') hide();
  else if (k === 'Escape') hide(true);
  else return false;
  return true;
}
document.addEventListener('keydown', (e) => {
  const t = e.target;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if ($('dlgBiserica').open) return;
  if (t.tagName === 'INPUT' && t.type !== 'checkbox' && t.type !== 'range') return;
  if (t.tagName === 'SELECT' || t.tagName === 'TEXTAREA') return;
  if (e.key === '/') { $('cauta').focus(); e.preventDefault(); return; }
  if (t.tagName === 'BUTTON' && e.key === ' ') return;
  if (key(e.key)) e.preventDefault();
});

// ───────── live translation for guests ─────────
function subState(text, kind) {
  const el = $('stareSub');
  el.textContent = text;
  el.className = 'stare' + (kind ? ' ' + kind : '');
}
const live = createLive({
  onStatus: subState,
  onPreview(t) {
    const el = $('ultimSub');
    el.hidden = !t;
    el.textContent = t;
  },
  onGuests(counts) {
    const el = $('invitati');
    const langs = Object.keys(counts);
    const total = langs.reduce((s, l) => s + counts[l], 0);
    el.hidden = !live.phones;
    el.innerHTML = total
      ? 'Invitați conectați: <b>' + total + '</b> — ' + langs.map((l) => LANGS[l].short + ' ' + counts[l]).join(' · ')
      : 'Niciun invitat conectat încă.';
  },
  onDropped(langs) {
    langs.forEach((l) => { const box = document.querySelector('#limbi input[value="' + l + '"]'); if (box) box.checked = false; });
  },
  isListening: () => listening,
});

const delay = store.get('intarziere2', 2);
$('optIntarziere').value = String(delay);
live.setDelay(delay);
$('optIntarziere').addEventListener('change', (e) => { live.setDelay(+e.target.value); store.set('intarziere2', +e.target.value); });

const offered = () => [...document.querySelectorAll('#limbi input')].filter((x) => x.checked).map((x) => x.value);
const savedLangs = store.get('limbi6', TRANSLATED);
document.querySelectorAll('#limbi input').forEach((box) => {
  box.checked = savedLangs.includes(box.value);
  box.addEventListener('change', () => {
    const list = offered();
    store.set('limbi6', list);
    live.setOffered(list);
  });
});
live.setOffered(offered()).catch(() => {});

function showQR() {
  const acc = Account.load();
  $('zonaQR').hidden = !(acc && live.phones);
  if (!acc || !live.phones) return;
  const link = Account.guestLink(acc.code);
  $('qrMic').innerHTML = qrSvg(link);
  $('codAcces').textContent = acc.code;
  $('linkSub').textContent = link;
  $('btnQRMare').href = 'qr.html?c=' + encodeURIComponent(acc.code);
}

function startPhones(fromClick) {
  const acc = Account.load();
  if (!acc) {
    $('optSubtitrare').checked = false;
    openAccount('Conectează întâi biserica: invitații intră cu codul gazdei.', true);
    return Promise.resolve();
  }
  $('optSubtitrare').checked = true;
  return live.startPhones(acc).then(() => {
    store.set('subtitrare', true);
    showQR();
    $('invitati').hidden = false;
    $('limbi').hidden = false;
    live.verse(null);
    send();
  }).catch(() => {
    $('optSubtitrare').checked = false;
    if (!fromClick) subState('Bifează din nou ca să pornești traducerea pe telefoane.');
  });
}
function stopPhones() {
  live.stopPhones();
  store.set('subtitrare', false);
  $('zonaQR').hidden = true;
  $('invitati').hidden = true;
  $('limbi').hidden = !Account.load();
  $('ultimSub').hidden = true;
}
$('optSubtitrare').addEventListener('change', (e) => { if (e.target.checked) startPhones(true); else stopPhones(); });

$('btnCopiazaLink').addEventListener('click', () => {
  const acc = Account.load();
  if (!acc) return;
  const b = $('btnCopiazaLink');
  navigator.clipboard.writeText(Account.guestLink(acc.code)).then(() => {
    b.textContent = 'Copiat';
    setTimeout(() => { b.textContent = 'Copiază linkul'; }, 1500);
  }).catch(() => { /* link is shown next to it */ });
});

// ───────── church / host login ─────────
let startAfterLogin = false;
function accountButton() {
  const acc = Account.load();
  const b = $('btnBiserica');
  label(b, acc ? acc.host + ' · ' + acc.code : 'Conectează biserica', acc ? acc.code : 'Biserica');
  b.classList.toggle('conectat', !!acc);
  b.title = acc ? acc.church + ' – ' + acc.email : 'Conectează-te ca biserică gazdă';
  $('limbi').hidden = !acc; // the host picks the guests' languages once the church is connected
}
function accountState(text, kind) {
  const el = $('contStare');
  el.textContent = text || '';
  el.className = 'stare' + (kind ? ' ' + kind : '');
}
function openAccount(message, thenStart) {
  const acc = Account.load();
  startAfterLogin = !!thenStart;
  $('contTitlu').textContent = acc ? 'Biserica gazdă' : 'Conectează biserica';
  $('contFormular').hidden = !!acc;
  $('contIntro').hidden = !!acc;
  $('contConectat').hidden = !acc;
  $('btnCodNou').hidden = $('btnDeconectare').hidden = !acc;
  $('btnSalveazaCont').textContent = acc ? 'Gata' : 'Conectează';
  if (acc) {
    $('contVBiserica').textContent = acc.church;
    $('contVEmail').textContent = acc.email;
    $('contVGazda').textContent = acc.host;
    $('contVCod').textContent = acc.code;
    $('contLink').textContent = Account.guestHome();
  } else {
    $('contBiserica').value = store.get('ultimaBiserica', '');
    $('contEmail').value = store.get('ultimEmail', '');
    $('contGazda').value = '';
  }
  accountState(message || '', message ? 'eroare' : '');
  $('dlgBiserica').showModal();
}
$('btnBiserica').addEventListener('click', () => openAccount());
$('btnInchideCont').addEventListener('click', () => $('dlgBiserica').close());
$('formBiserica').addEventListener('submit', (e) => {
  e.preventDefault();
  let acc = Account.load();
  if (!acc) {
    const church = $('contBiserica').value.trim(), email = $('contEmail').value.trim(), host = $('contGazda').value.trim();
    if (!church) { accountState('Scrie numele bisericii.', 'eroare'); $('contBiserica').focus(); return; }
    if (!Account.validEmail(email)) { accountState('Scrie o adresă de e-mail validă.', 'eroare'); $('contEmail').focus(); return; }
    if (!host) { accountState('Scrie numele gazdei (de ex. Elim 1).', 'eroare'); $('contGazda').focus(); return; }
    acc = Account.save({ church, email, host, code: Account.makeCode(host), since: Date.now() });
    store.set('ultimaBiserica', church);
    store.set('ultimEmail', email);
    accountButton();
  }
  $('dlgBiserica').close();
  if (startAfterLogin) { startAfterLogin = false; startPhones(true); }
});
$('btnCodNou').addEventListener('click', () => {
  const acc = Account.load();
  if (!acc || !confirm('Faci un cod nou? Invitații vor trebui să intre cu noul cod.')) return;
  acc.code = Account.makeCode(acc.host);
  Account.save(acc);
  accountButton();
  openAccount();
  if (live.phones) { live.stopPhones(); startPhones(true); }
});
$('btnDeconectare').addEventListener('click', () => {
  if (!confirm('Deconectezi biserica de pe acest calculator?')) return;
  stopPhones();
  $('optSubtitrare').checked = false;
  Account.clear();
  accountButton();
  $('dlgBiserica').close();
});
accountButton();

// ───────── start ─────────
if (!SR) micState('Pentru recunoaștere vocală deschide pagina în Google Chrome sau Microsoft Edge.', 'eroare');

fetch('data/biblia-ro.json').then((r) => r.json()).then((d) => {
  B = d.books;
  Ref.setShape(B);
  $('traducere').textContent = d.name;
  loadSecond();
  update();
  setTimeout(index, 800);
  setTimeout(prepareQuotes, 1200);
  if (store.get('subtitrare', false) && Account.load()) startPhones(false);
}).catch(() => {
  micState('Nu pot încărca textul Bibliei. Reîncarcă pagina.', 'eroare');
});
