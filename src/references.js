// Finds Bible references in Romanian speech or typed text ("Ioan capitolul trei versetul 16", "1cor 13 4-7").

// Display name, spoken forms, typed abbreviations. Numbered books get their forms from GROUPS.
const BOOKS = [
  ['Geneza', 'geneza genesa genezei facerea', 'gen gn fac'],
  ['Exodul', 'exodul exod exodului iesirea', 'ex exo'],
  ['Leviticul', 'leviticul levitic leviticului', 'lev lv'],
  ['Numeri', 'numeri numerii', 'num nm'],
  ['Deuteronomul', 'deuteronomul deuteronom deuteronomului', 'deut deu dt'],
  ['Iosua', 'iosua', 'ios'],
  ['Judecătorii', 'judecatorii judecatori judecatorilor', 'jud'],
  ['Rut', 'rut ruth', ''],
  ['1 Samuel', '', ''], ['2 Samuel', '', ''],
  ['1 Împărați', '', ''], ['2 Împărați', '', ''],
  ['1 Cronici', '', ''], ['2 Cronici', '', ''],
  ['Ezra', 'ezra esdra', 'ezr'],
  ['Neemia', 'neemia nehemia', 'neem ne'],
  ['Estera', 'estera', 'est'],
  ['Iov', 'iov iob', ''],
  ['Psalmii', 'psalmii psalmul psalm psalmi psalmilor psalmului', 'ps'],
  ['Proverbele', 'proverbele proverbe proverbelor pildele pilde pildelor', 'prov pr'],
  ['Eclesiastul', 'eclesiastul eclesiast ecleziastul ecleziast eclesiastului', 'ecl ec'],
  ['Cântarea Cântărilor', 'cantarea_cantarilor cantarea cantari', 'cant'],
  ['Isaia', 'isaia', 'is isa'],
  ['Ieremia', 'ieremia', 'ier'],
  ['Plângerile lui Ieremia', 'plangerile_lui_ieremia plangerile plangeri', 'plang pl'],
  ['Ezechiel', 'ezechiel iezechiel', 'ezec ez'],
  ['Daniel', 'daniel', 'dan dn'],
  ['Osea', 'osea', 'os'],
  ['Ioel', 'ioel', ''],
  ['Amos', 'amos', 'am'],
  ['Obadia', 'obadia abdia', 'ob'],
  ['Iona', 'iona', ''],
  ['Mica', 'mica miheia', 'mic'],
  ['Naum', 'naum', ''],
  ['Habacuc', 'habacuc habakuk avacum', 'hab'],
  ['Țefania', 'tefania sefania', 'tef'],
  ['Hagai', 'hagai', 'hag'],
  ['Zaharia', 'zaharia', 'zah'],
  ['Maleahi', 'maleahi malahia', 'mal'],
  ['Matei', 'matei', 'mt mat'],
  ['Marcu', 'marcu', 'mc mar'],
  ['Luca', 'luca', 'lc luc'],
  ['Ioan', '', ''],
  ['Faptele Apostolilor', 'faptele_apostolilor faptele fapte', 'fa fap'],
  ['Romani', 'romani romanilor', 'rom ro'],
  ['1 Corinteni', '', ''], ['2 Corinteni', '', ''],
  ['Galateni', 'galateni galatenilor', 'gal'],
  ['Efeseni', 'efeseni efesenilor', 'ef efe'],
  ['Filipeni', 'filipeni filipenilor', 'fil flp'],
  ['Coloseni', 'coloseni colosenilor', 'col'],
  ['1 Tesaloniceni', '', ''], ['2 Tesaloniceni', '', ''],
  ['1 Timotei', '', ''], ['2 Timotei', '', ''],
  ['Tit', 'tit titus', ''],
  ['Filimon', 'filimon', 'flm'],
  ['Evrei', 'evrei evreilor', 'evr ev'],
  ['Iacov', 'iacov iacob', 'iac'],
  ['1 Petru', '', ''], ['2 Petru', '', ''],
  ['1 Ioan', '', ''], ['2 Ioan', '', ''], ['3 Ioan', '', ''],
  ['Iuda', 'iuda', ''],
  ['Apocalipsa', 'apocalipsa apocalipsei apocalipsa_lui_ioan', 'apoc ap'],
];

// Books sharing a name, told apart by "întâi / a doua / a treia" (or 1, 2, 3) said before them.
const GROUPS = [
  { spoken: 'samuel', typed: 'sam sm', books: [8, 9] },
  { spoken: 'imparati imparatilor regi regilor', typed: 'imp', books: [10, 11] },
  { spoken: 'cronici cronicilor', typed: 'cron cr', books: [12, 13] },
  { spoken: 'corinteni corintenilor', typed: 'cor co', books: [45, 46] },
  { spoken: 'tesaloniceni tesalonicenilor', typed: 'tes tesal', books: [51, 52] },
  { spoken: 'timotei', typed: 'tim', books: [53, 54] },
  { spoken: 'petru', typed: 'pet pt', books: [59, 60] },
  { spoken: 'ioan ion', typed: 'io in ioa', books: [61, 62, 63], fallback: 42 },
];

export const BOOK_NAMES = BOOKS.map((b) => b[0]);
const PSALMS = 18;

const spokenMap = new Map();
const typedMap = new Map();
let longestName = 1;
function register(map, list, value) {
  for (const raw of list.split(/\s+/)) {
    if (!raw) continue;
    const key = raw.replace(/_/g, ' ');
    longestName = Math.max(longestName, key.split(' ').length);
    if (!map.has(key)) map.set(key, value);
  }
}
BOOKS.forEach((b, i) => { register(spokenMap, b[1], { book: i }); register(typedMap, b[2], { book: i }); });
GROUPS.forEach((g) => { register(spokenMap, g.spoken, { group: g }); register(typedMap, g.typed, { group: g }); });
const FUZZY_KEYS = [...spokenMap.keys()].filter((k) => k.length >= 6 && !k.includes(' '));
const NOT_BOOKS = new Set(['numere', 'numerele', 'romana', 'romane', 'romanii', 'evreii', 'faptul', 'faptei']);

const ONES = {
  zero: 0, unu: 1, una: 1, doi: 2, doua: 2, trei: 3, patru: 4, cinci: 5, sase: 6, sapte: 7, opt: 8, noua: 9, zece: 10,
  unsprezece: 11, unspe: 11, doisprezece: 12, douasprezece: 12, doispe: 12, douaspe: 12, treisprezece: 13, treispe: 13,
  paisprezece: 14, paispe: 14, cincisprezece: 15, cinsprezece: 15, cinspe: 15, saisprezece: 16, saispe: 16,
  saptesprezece: 17, saptespe: 17, optsprezece: 18, optisprezece: 18, optspe: 18, optispe: 18, nouasprezece: 19, nouaspe: 19,
};
const TENS = { douazeci: 20, treizeci: 30, patruzeci: 40, cincizeci: 50, saizeci: 60, saptezeci: 70, optzeci: 80, nouazeci: 90 };
const ORDINALS = { 1: 1, 2: 2, 3: 3, i: 1, ii: 2, iii: 3, intai: 1, intaia: 1, intaiul: 1, prima: 1, primul: 1, doilea: 2, doua: 2, treilea: 3, treia: 3 };
const FILLERS = new Set(['epistola', 'epistolei', 'a', 'al', 'lui', 'catre', 'cartea', 'carte', 'cartii', 'sfantului', 'sfintului', 'apostolului', 'apostol', 'pavel', 'soborniceasca']);
const BEFORE_CHAPTER = new Set(['la', 'in', 'din', 'de', 'tot', 'cartea']);
const BEFORE_VERSE = new Set(['de', 'la', 'cu', 'si', 'din', 'incepand']);
const RANGE_WORDS = new Set(['pana', 'la', 'in', 'versetul', 'inclusiv']);
const PRONOUN_TAIL = new Set(['am', 'ai', 'a', 'au', 'ati', 'as', 'ar', 'o']);
const PSALM_WORDS = new Set(['psalmul', 'psalm', 'psalmului', 'psalmi', 'psalmii']);

const isChapterWord = (t) => !!t && (t === 'cap' || t.startsWith('capitol'));
const isVerseWord = (t) => !!t && (t === 'vers' || t === 'versul' || t.startsWith('verset'));
const isNumber = (t) => typeof t === 'string' && /^\d{1,4}$/.test(t);

let shape = null; // shape[book][chapter-1] = verse count
export function setShape(books) { shape = books.map((b) => b.map((c) => c.length)); }
const chapterCount = (b) => (shape ? shape[b].length : 150);
const verseCount = (b, c) => (shape ? shape[b][c - 1] || 0 : 176);

export function plain(text) {
  return String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function romanValue(w) {
  if (!w || !/^c?(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/.test(w)) return 0;
  const val = { i: 1, v: 5, x: 10, l: 50, c: 100 };
  let sum = 0;
  for (let k = 0; k < w.length; k++) {
    const a = val[w[k]], b = val[w[k + 1]] || 0;
    sum += a < b ? -a : a;
  }
  return sum;
}

// "al treilea" / "al șaisprezecelea" → the number
function stripOrdinalSuffix(w) {
  if (w.length <= 4 || !w.endsWith('lea')) return w;
  let base = w.slice(0, -3);
  if (ONES[base] == null && TENS[base] == null && base.endsWith('u')) base = base.slice(0, -1);
  if (ONES[base] != null) return String(ONES[base]);
  if (TENS[base] != null) return base;
  return w;
}

const digitOf = (w) => (ONES[w] >= 1 && ONES[w] <= 9 ? ONES[w] : /^[1-9]$/.test(w || '') ? +w : 0);

function wordsToNumbers(words) {
  const out = [];
  const t = words.map(stripOrdinalSuffix);
  for (let i = 0; i < t.length; i++) {
    const w = t[i];
    const prev = out[out.length - 1];
    const afterMarker = isChapterWord(prev) || isVerseWord(prev) || PSALM_WORDS.has(prev);
    if (w === 'lea' && isNumber(prev)) continue;
    if (w === 'al' && afterMarker) continue;
    if (afterMarker) {
      if (w === 'intai' || w === 'intaiul' || w === 'primul') { out.push('1'); continue; }
      const allowRoman = !isVerseWord(prev) && !(w.length === 1 && PRONOUN_TAIL.has(t[i + 1]));
      const r = allowRoman ? romanValue(w) : 0;
      if (r) { out.push(String(r)); continue; }
    }
    if (w === 'suta') {
      let value = 100, j = i + 1;
      if (out[out.length - 1] === 'o') out.pop();
      if (TENS[t[j]] != null) {
        value += TENS[t[j]]; j++;
        if (t[j] === 'si' && digitOf(t[j + 1])) { value += digitOf(t[j + 1]); j += 2; }
      } else if (ONES[t[j]] != null) { value += ONES[t[j]]; j++; } else if (isNumber(t[j]) && +t[j] < 100) { value += +t[j]; j++; }
      out.push(String(value)); i = j - 1; continue;
    }
    if (TENS[w] != null) {
      let value = TENS[w], j = i + 1;
      if (t[j] === 'si' && digitOf(t[j + 1])) { value += digitOf(t[j + 1]); j += 2; }
      out.push(String(value)); i = j - 1; continue;
    }
    if (ONES[w] != null) {
      // "nouă" also means "new"/"us": only a number where a number is expected
      if (w === 'noua' || w === 'una') {
        if (!(isNumber(prev) || prev === ':' || prev === 'cu' || prev === 'la' || prev === 'pana' || isVerseWord(prev) || isChapterWord(prev))) { out.push(w); continue; }
      }
      out.push(String(ONES[w])); continue;
    }
    out.push(w);
  }
  return out;
}

/** Normalised word list: lower case, no diacritics, numbers as digits, ":" between chapter and verse, "~" for ranges. */
export function tokens(text) {
  let s = plain(text);
  s = s.replace(/(\d)\s*[:.,]\s*(?=\d)/g, '$1 \u0001 ');
  s = s.replace(/(\d)\s*[-–—]\s*(?=\d)/g, '$1 \u0002 ');
  s = s.replace(/(\d)(?=[a-z])/g, '$1 ').replace(/([a-z])(?=\d)/g, '$1 ');
  s = s.replace(/[^a-z0-9\u0001\u0002]+/g, ' ').trim();
  if (!s) return [];
  return wordsToNumbers(s.split(' ').map((t) => (t === '\u0001' ? ':' : t === '\u0002' ? '~' : t)));
}

function editDistanceAtMostOne(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function matchBook(tok, i, typed) {
  for (let len = Math.min(longestName, tok.length - i); len >= 1; len--) {
    const key = tok.slice(i, i + len).join(' ');
    const hit = spokenMap.get(key) || (typed && len === 1 ? typedMap.get(key) : null);
    if (hit) return { hit, len };
  }
  const w = tok[i];
  if (!/^[a-z]+$/.test(w)) return null;
  if (typed && w.length >= 2) {
    for (const [key, hit] of spokenMap) if (!key.includes(' ') && key.startsWith(w)) return { hit, len: 1, loose: true };
  }
  if (w.length >= 6 && !NOT_BOOKS.has(w)) {
    for (const key of FUZZY_KEYS) if (editDistanceAtMostOne(w, key)) return { hit: spokenMap.get(key), len: 1, loose: true };
  }
  return null;
}

// Which concrete book(s) a match can be, most likely first.
function bookOptions(tok, i, hit) {
  if (hit.book != null) return [{ book: hit.book, start: i }];
  const g = hit.group;
  const fallback = g.fallback != null ? g.fallback : g.books[0];
  const options = [];
  let ord = ORDINALS[tok[i - 1]];
  let start = i - 1;
  if (!ord) {
    let j = i - 1, steps = 0;
    while (j >= 0 && steps < 6 && FILLERS.has(tok[j])) { j--; steps++; }
    if (steps > 0 && ORDINALS[tok[j]] && !/^i+$/.test(tok[j])) { ord = ORDINALS[tok[j]]; start = j; }
  }
  if (ord && g.books[ord - 1] != null) options.push({ book: g.books[ord - 1], start });
  options.push({ book: fallback, start: i });
  return options;
}

function readRange(tok, k, v) {
  if (tok[k] === '~' && isNumber(tok[k + 1])) return { v, v2: +tok[k + 1], end: k + 2 };
  if (tok[k] === 'si' && isNumber(tok[k + 1]) && +tok[k + 1] === v + 1) return { v, v2: v + 1, end: k + 2 };
  let p = k, steps = 0, saysUntil = false;
  while (steps < 4 && RANGE_WORDS.has(tok[p])) { if (tok[p] === 'la' || tok[p] === 'pana') saysUntil = true; p++; steps++; }
  if (saysUntil && isNumber(tok[p]) && +tok[p] > v) return { v, v2: +tok[p], end: p + 1 };
  return { v, end: k };
}

function readVerse(tok, k) {
  if (tok[k] === ':' && isNumber(tok[k + 1])) return readRange(tok, k + 2, +tok[k + 1]);
  if (isNumber(tok[k])) return readRange(tok, k + 1, +tok[k]);
  let p = k, steps = 0;
  while (steps < 3 && BEFORE_VERSE.has(tok[p])) { p++; steps++; }
  if (isVerseWord(tok[p])) {
    p++;
    let m = 0;
    while (m < 2 && (tok[p] === 'de' || tok[p] === 'la')) { p++; m++; }
    if (isNumber(tok[p])) return readRange(tok, p + 1, +tok[p]);
    return { end: k };
  }
  const lead = tok.slice(k, p).join(' ');
  if ((lead === 'cu' || lead === 'de la') && isNumber(tok[p])) return readRange(tok, p + 1, +tok[p]);
  return { end: k };
}

function check(b, c, v, v2) {
  if (c < 1 || c > chapterCount(b)) return null;
  if (v == null) return { b, c };
  const max = verseCount(b, c);
  if (v < 1 || v > max) return null;
  const r = { b, c, v };
  if (v2 != null && v2 > v) r.v2 = Math.min(v2, max);
  return r;
}

function readAfterBook(tok, k, b) {
  let j = k, steps = 0;
  while (steps < 3 && (BEFORE_CHAPTER.has(tok[j]) || isChapterWord(tok[j]))) { j++; steps++; }
  if (!isNumber(tok[j])) return null;
  let c = +tok[j];
  const vr = readVerse(tok, j + 1);
  let v = vr.v;
  const v2 = vr.v2;
  if (v == null && chapterCount(b) === 1 && c > 1) { v = c; c = 1; } // "Iuda 3" = Iuda 1:3
  else if (v == null && c > chapterCount(b)) {
    // "Ioan 316": chapter and verse run together
    const s = String(c);
    let found = null;
    for (let cut = 1; cut < s.length && !found; cut++) {
      const cc = +s.slice(0, cut), vv = +s.slice(cut);
      if (s[cut] !== '0' && check(b, cc, vv)) found = [cc, vv];
    }
    if (!found) return null;
    [c, v] = found;
  }
  const r = check(b, c, v, v2);
  if (!r) return null;
  r.end = vr.end;
  return r;
}

/**
 * All references in a text.
 * ctx: { b, c } = what is on screen (for "versetul 17", "capitolul 4"); pendingBook = a book named just before, without chapter.
 * opts.typed = typed text (accepts abbreviations such as "1cor 13 4-7").
 */
export function find(text, ctx, opts) {
  const typed = !!(opts && opts.typed);
  const tok = tokens(text);
  const refs = [];
  let current = ctx && ctx.b != null ? { b: ctx.b, c: ctx.c || 1 } : null;
  let waiting = ctx && ctx.pendingBook != null ? { b: ctx.pendingBook, at: -1, fromBefore: true } : null;
  let lastWaiting = null;
  let i = 0;
  while (i < tok.length) {
    const m = matchBook(tok, i, typed);
    if (m) {
      const options = bookOptions(tok, i, m.hit);
      let r = null;
      for (const o of options) {
        const t = readAfterBook(tok, i + m.len, o.book);
        if (t) { r = t; r.start = o.start; break; }
      }
      if (r) {
        if (r.v == null) {
          // "versetul 16 din Ioan 3"
          let j = r.start - 1, steps = 0;
          while (steps < 2 && ['din', 'de', 'la', 'in'].includes(tok[j])) { j--; steps++; }
          if (isNumber(tok[j]) && isVerseWord(tok[j - 1])) {
            const rr = check(r.b, r.c, +tok[j]);
            if (rr) {
              r.v = rr.v;
              const last = refs[refs.length - 1];
              if (last && last.relative && last.end === j + 1) refs.pop();
            }
          }
        }
        refs.push(r);
        current = { b: r.b, c: r.c };
        waiting = null; lastWaiting = null;
        i = r.end; continue;
      }
      if (!m.loose) { waiting = { b: options[0].book, at: i + m.len }; lastWaiting = waiting; }
      i += m.len; continue;
    }
    const t = tok[i];
    if (isChapterWord(t) && isNumber(tok[i + 1])) {
      let b = null;
      if (waiting && (waiting.fromBefore ? i <= 3 : i - waiting.at <= 3)) b = waiting.b;
      else if (current) b = current.b;
      if (b != null) {
        const r = readAfterBook(tok, i, b);
        if (r) {
          r.start = i; r.relative = true;
          refs.push(r); current = { b: r.b, c: r.c }; waiting = null; lastWaiting = null;
          i = r.end; continue;
        }
      }
    } else if (isVerseWord(t) && current) {
      let p = i + 1, steps = 0;
      while (steps < 2 && (tok[p] === 'de' || tok[p] === 'la')) { p++; steps++; }
      if (isNumber(tok[p])) {
        const rg = readRange(tok, p + 1, +tok[p]);
        const r = check(current.b, current.c, rg.v, rg.v2);
        if (r) {
          r.start = i; r.end = rg.end; r.relative = true;
          refs.push(r);
          i = r.end; continue;
        }
      }
    }
    i++;
  }
  const pendingBook = lastWaiting && tok.length - lastWaiting.at <= 2 ? lastWaiting.b : null;
  return { refs, pendingBook };
}

/** Spoken commands: next / previous verse, hide. */
export function command(text) {
  const s = ' ' + tokens(text).join(' ') + ' ';
  if (/ (versetul urmator|urmatorul verset|versetul care urmeaza) /.test(s)) return 'next';
  if (/ (versetul anterior|versetul precedent|versetul dinainte) /.test(s)) return 'prev';
  if (/ (ascunde versetul|ascunde ecranul|inchide versetul) /.test(s)) return 'hide';
  return null;
}

export function format(r, names) {
  const list = names || BOOK_NAMES;
  const name = !names && r.b === PSALMS ? 'Psalmul' : list[r.b];
  let s = name + ' ' + r.c;
  if (r.v != null) {
    s += ':' + r.v;
    if (r.v2 != null && r.v2 > r.v) s += '-' + r.v2;
  }
  return s;
}
