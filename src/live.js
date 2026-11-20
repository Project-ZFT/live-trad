// Live translation for guests: cuts what is heard into phrases, translates each phrase (Chrome's built-in
// translator, on this computer) into the languages guests follow, and sends it to their phones.
// Bible verses are not machine-translated: each guest gets them from the Bible of their own language.
import { hostRelay } from './relay.js';
import { LANGS, TRANSLATED, refIn } from './languages.js';
import * as Bibles from './bibles.js';

const SOURCE = 'ro';
const MAX_LEN = 280; // longer lines are split
const MIN_WORDS = 4; // a shorter piece doesn't translate well on its own
const UNSTABLE_TAIL = 2; // the last words heard can still change
const MAX_WORDS = 22; // cut anyway beyond this
const LIVE_EVERY = 600; // ms between two updates of the line being spoken (shown on the phones, not read aloud)
const STRONG = new Set(['dar', 'insa', 'iar', 'deci', 'asadar', 'fiindca', 'caci', 'deoarece', 'pentru', 'atunci', 'apoi', 'iata', 'astfel', 'cand', 'daca', 'desi', 'totusi']);
const WEAK = new Set(['si', 'ca', 'care', 'sau', 'ori', 'unde', 'cum', 'ci']);
const bare = (w) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');

const withTimeout = (p, ms, msg) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(msg)), ms))]);

/** Where to cut the phrase being spoken: number of words to send now, 0 = no good place yet. */
export function cutPoint(words, sent, force) {
  const last = words.length - UNSTABLE_TAIL, first = sent + MIN_WORDS;
  if (last < first) return 0;
  for (let k = last; k >= first; k--) if (/[.!?;:]$/.test(words[k - 1])) return k;
  for (let k = last; k >= first; k--) if (STRONG.has(bare(words[k]))) return k;
  for (let k = last; k >= first; k--) if (/,$/.test(words[k - 1])) return k;
  for (let k = last; k >= first; k--) if (WEAK.has(bare(words[k]))) return k;
  return force ? last : 0;
}

function splitLong(text) {
  const out = [];
  let rest = text.trim();
  while (rest.length > MAX_LEN) {
    let cut = rest.lastIndexOf(' ', MAX_LEN);
    const stop = Math.max(rest.lastIndexOf('. ', MAX_LEN), rest.lastIndexOf('? ', MAX_LEN), rest.lastIndexOf('! ', MAX_LEN));
    if (stop > MAX_LEN / 2) cut = stop + 1;
    if (cut < 40) cut = MAX_LEN;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}

export function createLive(hooks) {
  const S = {
    phones: false, starting: false, delay: 2,
    offered: TRANSLATED.slice(), failed: [], lastError: '', relay: null, account: null,
    queue: Promise.resolve(), timer: null, lastVerse: null, verseCache: new Map(),
  };
  const translators = new Map(); // lang → Translator
  const preparing = new Map(); // lang → Promise
  const status = (text, kind) => hooks.onStatus && hooks.onStatus(text, kind || '');

  async function makeTranslator(lang) {
    if (!('Translator' in self)) throw new Error('Acest browser nu are traducător încorporat. Folosește Google Chrome pe calculator, adus la zi.');
    const opts = { sourceLanguage: SOURCE, targetLanguage: lang };
    const avail = await withTimeout(self.Translator.availability(opts), 15000, 'Traducătorul din Chrome nu răspunde. Repornește Chrome și încearcă din nou.');
    if (avail === 'unavailable') throw new Error('Chrome nu poate traduce din română în ' + LANGS[lang].ro + ' pe acest calculator.');
    if (avail !== 'available') status('Chrome pregătește traducerea în ' + LANGS[lang].ro + '. Prima dată poate dura câteva minute – lasă pagina deschisă…');
    return withTimeout(self.Translator.create({
      ...opts,
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          if (e.loaded < 1) status('Chrome descarcă modelul pentru ' + LANGS[lang].ro + ' (o singură dată)… ' + Math.round(e.loaded * 100) + '%');
        });
      },
    }), 10 * 60 * 1000, 'Descărcarea modelului de traducere durează prea mult. Verifică internetul și încearcă din nou.');
  }

  function ensure(lang) {
    if (lang === SOURCE || translators.has(lang)) return Promise.resolve();
    if (!preparing.has(lang)) {
      preparing.set(lang, makeTranslator(lang).then((t) => { translators.set(lang, t); }).finally(() => preparing.delete(lang)));
    }
    return preparing.get(lang);
  }

  async function translate(text, lang) {
    if (lang === SOURCE) return text;
    await ensure(lang);
    return String((await translators.get(lang).translate(text)) || '').trim().slice(0, 680);
  }

  const working = () => S.phones;

  // While a verse is shown and the preacher reads it, his reading is not machine-translated:
  // the guests get (and hear) that verse from the Bible of their own language instead.
  const words = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter((w) => w.length >= 3);
  let verseWords = null, verseWordsKey = '';
  function isReadingVerse(text) {
    const v = S.lastVerse;
    if (!v) return false;
    if (verseWordsKey !== v.key) { verseWords = new Set(words(v.textRo)); verseWordsKey = v.key; }
    const w = words(text);
    if (w.length < 3) return false;
    const inVerse = w.filter((x) => verseWords.has(x)).length;
    return inVerse / w.length >= 0.6;
  }
  function needed() {
    if (!S.phones || !S.relay) return [];
    return S.relay.langsInUse().filter((l) => S.offered.includes(l) || l === SOURCE);
  }

  function summary() {
    if (!working()) { status('Traducerea pentru invitați e oprită.'); return; }
    const where = 'telefoane (cod ' + S.account.code + ')';
    if (S.phones && S.failed.length) {
      const warning = S.offered.length
        ? 'Chrome nu poate traduce (încă) în: ' + S.failed.map((l) => LANGS[l].ro).join(', ') + '. Bifează din nou limba ca să mai încerce.'
        : S.lastError + ' Invitații pot urmări doar textul în română.';
      status('Pornită pe ' + where + '. ' + warning, 'eroare');
      return;
    }
    status('Traducerea e pornită pe ' + where + '. Merge cât timp ascultarea e pornită.', 'activ');
  }

  function fail(e) { status(e && e.message ? e.message : String(e), 'eroare'); throw e; }

  // everything is sent in order, so lines arrive in the order they were spoken
  function enqueue(job) {
    S.queue = S.queue.then(job).catch((e) => { if (working()) status('Problemă la traducere: ' + (e && e.message ? e.message : e), 'eroare'); });
  }

  function sendLine(text) {
    if (isReadingVerse(text)) { if (hooks.onPreview) hooks.onPreview('(verset citit – invitații îl primesc din Biblia lor)'); return; }
    enqueue(async () => {
      const langs = needed();
      for (const piece of splitLong(text)) {
        for (const lang of langs) {
          const t = await translate(piece, lang);
          if (!t) continue;
          if (S.phones && S.relay) S.relay.line(lang, t);
          if (hooks.onPreview) hooks.onPreview(LANGS[lang].short + ': ' + t);
        }
      }
    });
  }

  // ───── phrase being spoken ─────
  const P = { key: null, words: [], sent: 0, since: 0 };
  // the words not yet sent are translated as they come, so the guests read along almost at once
  const partial = { busy: false, last: 0, text: '' };
  function livePart() {
    if (partial.busy || !S.relay || Date.now() - partial.last < LIVE_EVERY) return;
    const text = P.words.slice(P.sent).join(' ');
    if (!text || text === partial.text || P.words.length - P.sent < 2 || isReadingVerse(text)) return;
    partial.busy = true; partial.last = Date.now(); partial.text = text;
    const key = P.key, from = P.sent;
    Promise.all(needed().map(async (lang) => {
      const t = await translate(text, lang);
      // dropped if that part was meanwhile sent as a finished line
      if (t && P.key === key && P.sent === from && S.relay) S.relay.partial(lang, t);
    })).catch(() => {}).finally(() => { partial.busy = false; });
  }
  function tick() {
    S.timer = null;
    if (!working() || P.key === null) return;
    livePart();
    const open = P.words.length - P.sent;
    const age = Date.now() - P.since, wait = S.delay * 1000;
    if (open >= MIN_WORDS + UNSTABLE_TAIL && (age >= wait || open >= MAX_WORDS)) {
      const k = cutPoint(P.words, P.sent, age >= wait + 3000 || open >= MAX_WORDS);
      if (k) {
        sendLine(P.words.slice(P.sent, k).join(' '));
        P.sent = k;
        P.since = Date.now();
      }
    }
    S.timer = setTimeout(tick, 200);
  }

  function heard(text, final, key) {
    if (!working() || !text) return;
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (key !== P.key) { P.key = key; P.sent = 0; P.since = Date.now(); }
    P.words = words;
    if (final) {
      const rest = words.slice(Math.min(P.sent, words.length)).join(' ');
      P.key = null; P.words = []; P.sent = 0;
      clearTimeout(S.timer); S.timer = null;
      partial.text = '';
      if (rest) sendLine(rest);
      if (S.relay) S.relay.typing(false);
      return;
    }
    if (S.relay) S.relay.typing(true);
    livePart();
    if (!S.timer) S.timer = setTimeout(tick, 200);
  }

  function pause() {
    P.key = null; P.words = []; P.sent = 0;
    clearTimeout(S.timer); S.timer = null;
    if (S.relay) S.relay.typing(false);
  }

  // ───── Bible verse being read, for the phones ─────
  async function verseFor(lang, v) {
    if (!v) return null;
    await Bibles.load(lang);
    const p = Bibles.passage(lang, v.refObj);
    if (p) return p;
    if (lang === SOURCE) return { ref: v.refRo, text: v.textRo };
    // this Bible has no text here (a verse some versions leave out): translate the Romanian one
    const ck = v.key + '|' + lang;
    if (!S.verseCache.has(ck)) {
      const text = await translate(v.textRo, lang);
      if (S.verseCache.size > 300) S.verseCache.clear();
      S.verseCache.set(ck, text);
    }
    const ref = v.refObj ? refIn(lang, v.refObj) || v.refRo : v.refRo;
    return { ref, text: S.verseCache.get(ck), auto: true };
  }

  // a verse does not wait behind the phrases being translated: it goes out at once
  function pushVerse(lang) {
    const v = S.lastVerse;
    verseFor(lang, v).then((out) => { if (S.relay && S.lastVerse === v) S.relay.verse(lang, out); })
      .catch((e) => status('Problemă la verset: ' + (e && e.message ? e.message : e), 'eroare'));
  }

  function verse(v) {
    const sig = v ? v.key + '|' + v.textRo.length : '';
    const old = S.lastVerse ? S.lastVerse.key + '|' + S.lastVerse.textRo.length : '';
    S.lastVerse = v;
    if (S.relay && v) {
      S.relay.typing(false);
      S.relay.langsInUse().forEach((lang) => S.relay.partial(lang, ''));
    }
    if (sig === old || !S.phones || !S.relay) return;
    S.relay.langsInUse().forEach(pushVerse);
  }

  // ───── turning things on and off ─────
  async function startPhones(account) {
    if (S.phones || S.starting) return;
    S.starting = true;
    try {
      S.account = account;
      // the translators first: downloading a model has to start straight from the click
      const results = await Promise.allSettled(S.offered.map(ensure));
      const failed = results.map((r, i) => (r.status === 'rejected' ? S.offered[i] : null)).filter(Boolean);
      const firstError = failed.length ? results.find((r) => r.status === 'rejected').reason : null;
      S.failed = failed;
      S.lastError = firstError ? firstError.message || String(firstError) : '';
      if (failed.length) S.offered = S.offered.filter((l) => !failed.includes(l));
      S.relay = hostRelay({
        code: account.code,
        info: { church: account.church, host: account.host },
        langs: S.offered.concat(SOURCE),
        onStatus: (text, kind) => { if (text === 'ok') summary(); else status(text, kind); },
        onGuests: (counts) => hooks.onGuests && hooks.onGuests(counts),
        onJoin: (lang) => { Bibles.load(lang); if (S.lastVerse) pushVerse(lang); },
      });
      S.relay.listening(!!hooks.isListening && hooks.isListening());
      // every offered Bible is loaded now, so a verse reaches the phones without waiting
      [SOURCE].concat(S.offered).forEach((l) => Bibles.load(l));
      S.phones = true;
      // without a translator the guests can still follow the Romanian text; say clearly what is missing
      if (failed.length && hooks.onDropped) hooks.onDropped(failed);
      summary();
    } catch (e) {
      fail(e);
    } finally {
      S.starting = false;
    }
  }

  function stopPhones() {
    if (!S.phones) return;
    S.phones = false;
    if (S.relay) S.relay.stop();
    S.relay = null;
    if (hooks.onGuests) hooks.onGuests({});
    summary();
  }

  return {
    startPhones, stopPhones, heard, pause, verse,
    setDelay(sec) { S.delay = Math.max(1, Math.min(15, +sec || 5)); },
    async setOffered(list) {
      S.offered = list.slice();
      if (!S.phones) return; // translators are prepared when the host turns translation on (needs a click)
      // called from a click on a language box, so a missing model may be downloaded now
      const results = await Promise.allSettled(list.map(ensure));
      S.failed = list.filter((l, i) => results[i].status === 'rejected');
      const bad = results.find((r) => r.status === 'rejected');
      S.lastError = bad ? (bad.reason && bad.reason.message) || String(bad.reason) : '';
      S.offered = list.filter((l) => !S.failed.includes(l));
      if (S.relay) S.relay.offer(S.offered.concat(SOURCE));
      if (S.failed.length && hooks.onDropped) hooks.onDropped(S.failed);
      summary();
    },
    setListening(on) { if (S.relay) S.relay.listening(on); },
    get phones() { return S.phones; },
  };
}
