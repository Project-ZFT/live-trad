// The Bible of each guest language, loaded on the host's computer when a guest follows that language.
// All files share the Romanian (Cornilescu) numbering; `alt` gives the local numbers where they differ (Dutch psalms).
import { LANGS, refIn } from './languages.js';
import { format } from './references.js';

const loaded = new Map(); // lang → data
const loading = new Map(); // lang → Promise

export function bibleUrl(lang) {
  const bible = LANGS[lang] && LANGS[lang].bible;
  if (!bible) return null;
  const root = /\/join\/(?:index\.html)?(?:[?#].*)?$/.test(location.pathname)
    ? new URL('../', document.baseURI)
    : new URL('./', document.baseURI);
  return new URL(bible, root).href;
}

export function load(lang) {
  if (loaded.has(lang)) return Promise.resolve(loaded.get(lang));
  if (!loading.has(lang)) {
    const L = LANGS[lang];
    if (!L || !L.bible) return Promise.resolve(null);
    const url = bibleUrl(lang);
    loading.set(lang, fetch(url).then((r) => {
      if (!r.ok) throw new Error('Biblia nu este disponibilă la ' + url + ' (' + r.status + ')');
      return r.json();
    }).then((d) => { loaded.set(lang, d); return d; })
      .catch(() => null).finally(() => loading.delete(lang)));
  }
  return loading.get(lang);
}

export const get = (lang) => loaded.get(lang) || null;

/** The passage r = { b, c, v, v2 } in the Bible of `lang`: { ref, text, version } or null if not loaded / empty. */
export function passage(lang, r) {
  const d = get(lang);
  if (!d || !d.books[r.b] || !d.books[r.b][r.c - 1]) return null;
  const ch = d.books[r.b][r.c - 1];
  const from = r.v || 1, to = Math.min(r.v2 || from, ch.length);
  const parts = [], marks = [];
  let last = null;
  for (let v = from; v <= to; v++) {
    const t = ch[v - 1];
    marks.push((d.alt && d.alt[r.b + ':' + r.c + ':' + v]) || [r.c, v, r.c, v]);
    if (t && t !== last) { parts.push(t); last = t; }
  }
  if (!parts.length) return null;
  let ref;
  if (lang === 'ro') ref = format({ b: r.b, c: r.c, v: from, v2: to > from ? to : undefined });
  else {
    const p = marks[0], u = marks[marks.length - 1];
    const name = d.bookNames ? (r.b === 18 ? 'Psalm' : d.bookNames[r.b]) : refIn(lang, { b: r.b, c: 1 }).replace(/ 1$/, '');
    ref = name + ' ' + p[0] + ':' + p[1] + (u[2] !== p[0] ? '–' + u[2] + ':' + u[3] : u[3] !== p[1] ? '-' + u[3] : '');
  }
  return { ref, text: parts.join(' '), version: d.name };
}

/** Verse by verse, with the local verse numbers for guest reading and audio. */
export function verses(lang, r) {
  const d = get(lang);
  const p = passage(lang, r);
  if (!d || !p) return null;
  const ch = d.books[r.b][r.c - 1];
  const out = [];
  let last = null;
  for (let v = r.v || 1; v <= Math.min(r.v2 || r.v || 1, ch.length); v++) {
    const t = ch[v - 1];
    const a = (d.alt && d.alt[r.b + ':' + r.c + ':' + v]) || [r.c, v];
    if (t && t !== last) { out.push({ n: a[1], t }); last = t; }
  }
  return { ref: p.ref, verses: out };
}
