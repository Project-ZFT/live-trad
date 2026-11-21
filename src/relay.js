// Direct connection between the host's computer and the guests' phones (WebRTC through the public PeerJS meeting point).
import { Peer } from 'peerjs';

const PREFIX = 'cuvantlive-';
export const peerIdFor = (code) => PREFIX + String(code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
export const cleanCode = (code) => String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const KEEP_LINES = 40;
const PEER_OPTIONS = {
  host: '0.peerjs.com',
  port: 443,
  path: '/',
  key: 'peerjs',
  secure: true,
  debug: 0,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ],
    iceCandidatePoolSize: 10,
  },
};

/**
 * Host side. info = { church, host }; events: onStatus(text, kind), onGuests(countsByLang), onJoin(lang).
 */
export function hostRelay({ code, info, langs, onStatus, onGuests, onJoin }) {
  const guests = new Set();
  const lines = {}; // lang → [{ id, text }]
  const verses = {}; // lang → { ref, text } | null
  let typing = false, listening = false, offered = langs.slice(), peer = null, closed = false, seq = 0, retry = null;

  const send = (conn, msg) => { try { if (conn.open) conn.send(msg); } catch (e) { /* phone went away */ } };
  const toLang = (lang, msg) => guests.forEach((g) => { if (g.lang === lang) send(g.conn, msg); });
  const toAll = (msg) => guests.forEach((g) => send(g.conn, msg));
  const counts = () => {
    const c = {};
    guests.forEach((g) => { if (g.lang) c[g.lang] = (c[g.lang] || 0) + 1; });
    return c;
  };
  const changed = () => onGuests && onGuests(counts());

  function welcome(g) {
    send(g.conn, { t: 'hello', church: info.church, host: info.host, langs: offered, listening });
  }

  function attach(conn) {
    const g = { conn, lang: null, seen: Date.now() };
    conn.on('open', () => { guests.add(g); welcome(g); changed(); });
    conn.on('data', (m) => {
      g.seen = Date.now();
      if (!m || typeof m !== 'object') return;
      if (m.t === 'lang' && typeof m.lang === 'string' && /^[a-z]{2}$/.test(m.lang)) {
        g.lang = m.lang;
        changed();
        if (onJoin) onJoin(m.lang);
        send(conn, { t: 'history', lines: (lines[m.lang] || []).slice(-KEEP_LINES), verse: verses[m.lang] || null, typing, listening });
      }
    });
    const gone = () => { if (guests.delete(g)) changed(); };
    conn.on('close', gone);
    conn.on('error', gone);
  }

  function open() {
    if (closed) return;
    onStatus && onStatus('Mă conectez…');
    peer = new Peer(peerIdFor(code), PEER_OPTIONS);
    peer.on('open', () => onStatus && onStatus('ok'));
    peer.on('connection', attach);
    peer.on('disconnected', () => { if (!closed) setTimeout(() => { try { peer.reconnect(); } catch (e) { /* retried below */ } }, 1500); });
    peer.on('error', (e) => {
      if (closed) return;
      if (e.type === 'unavailable-id') {
        onStatus && onStatus('Codul ' + code + ' este deja folosit (poate în altă fereastră deschisă). Închide cealaltă fereastră; reîncerc…', 'eroare');
      } else if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error' || e.type === 'socket-closed') {
        onStatus && onStatus('Fără legătură cu serviciul de conectare (internet?). Reîncerc…', 'eroare');
      } else if (e.type === 'browser-incompatible') {
        onStatus && onStatus('Acest browser nu poate trimite textul pe telefoane.', 'eroare'); return;
      } else return; // problems with one phone are not the host's problem
      clearTimeout(retry);
      retry = setTimeout(() => { try { peer.destroy(); } catch (x) { /* already gone */ } open(); }, 6000);
    });
  }
  open();

  // keep-alive, and drop phones that went silent
  const beat = setInterval(() => {
    const now = Date.now();
    guests.forEach((g) => { if (now - g.seen > 70000) { guests.delete(g); try { g.conn.close(); } catch (e) { /* gone */ } changed(); } });
    toAll({ t: 'ping' });
  }, 15000);

  return {
    line(lang, text) {
      const l = { id: ++seq + '-' + Date.now().toString(36), text };
      (lines[lang] = lines[lang] || []).push(l);
      if (lines[lang].length > KEEP_LINES) lines[lang].shift();
      toLang(lang, { t: 'line', ...l });
    },
    verse(lang, v) { verses[lang] = v; toLang(lang, { t: 'verse', verse: v }); },
    hasVerse: (lang) => lang in verses,
    typing(on) { if (on === typing) return; typing = on; toAll({ t: 'typing', on }); },
    listening(on) { listening = !!on; toAll({ t: 'state', listening, langs: offered }); },
    offer(list) { offered = list.slice(); toAll({ t: 'state', listening, langs: offered }); },
    langsInUse() { return Object.keys(counts()); },
    counts,
    stop() {
      closed = true;
      clearInterval(beat);
      clearTimeout(retry);
      toAll({ t: 'bye' });
      setTimeout(() => { try { peer && peer.destroy(); } catch (e) { /* gone */ } }, 300);
    },
  };
}

/**
 * Guest side. events: onState(kind, detail), onMessage(msg). kind: connecting | connected | notfound | offline.
 */
export function guestRelay({ code, onState, onMessage }) {
  let peer = null, conn = null, lang = null, stopped = false, lastSeen = 0, timer = null, watchdog = null, tries = 0;

  function connect() {
    if (stopped) return;
    clearTimeout(timer);
    onState('connecting');
    if (!peer || peer.destroyed) {
      peer = new Peer(PEER_OPTIONS);
      peer.on('open', dial);
      peer.on('disconnected', () => { if (!stopped) try { peer.reconnect(); } catch (e) { /* new peer next time */ } });
      peer.on('error', (e) => {
        if (stopped) return;
        if (e.type === 'peer-unavailable') onState('notfound');
        else onState('offline');
        later();
      });
    } else if (peer.open) dial();
  }

  function later() {
    clearTimeout(timer);
    tries++;
    timer = setTimeout(connect, Math.min(10000, 2000 + tries * 1000));
  }

  function dial() {
    if (stopped) return;
    if (conn) { try { conn.close(); } catch (e) { /* old one */ } }
    const c = peer.connect(peerIdFor(code), { reliable: true });
    conn = c;
    const opening = setTimeout(() => { if (conn === c && !c.open) { onState('offline'); later(); } }, 30000);
    c.on('open', () => {
      clearTimeout(opening);
      tries = 0;
      lastSeen = Date.now();
      onState('connected');
      if (lang) c.send({ t: 'lang', lang });
    });
    c.on('data', (m) => { lastSeen = Date.now(); if (m && m.t !== 'ping') onMessage(m); });
    c.on('close', () => { if (conn === c && !stopped) { onState('offline'); later(); } });
    c.on('error', () => { if (conn === c && !stopped) { onState('offline'); later(); } });
  }

  watchdog = setInterval(() => {
    if (conn && conn.open) {
      try { conn.send({ t: 'ping' }); } catch (e) { /* closing */ }
      if (Date.now() - lastSeen > 50000) { onState('offline'); dial(); }
    }
  }, 15000);

  connect();
  return {
    setLang(l) { lang = l; if (conn && conn.open) conn.send({ t: 'lang', lang: l }); },
    retryNow() { tries = 0; connect(); },
    stop() { stopped = true; clearInterval(watchdog); clearTimeout(timer); try { peer && peer.destroy(); } catch (e) { /* gone */ } },
  };
}
