// Recognises verses read aloud without their reference, by matching the last words heard against the Bible text.

const COMMON_LIMIT = 500; // words in more verses than this don't pick candidates
const STRICT = { score: 4.6, hits: 5 }; // a quote out of nowhere
const RELAXED = { score: 3.0, hits: 4 }; // continuing the passage on screen
const MARGIN = 0.9; // how far the best must lead the second

let idx = null;

/** books[b][c][v] = text; split(text) = normalised words. */
export function prepare(books, split) {
  const vocab = new Map();
  const perVerse = [];
  const where = [];
  const chapterStart = [];
  let total = 0;
  books.forEach((chapters, b) => {
    chapterStart.push([]);
    chapters.forEach((verses, c) => {
      chapterStart[b].push(perVerse.length);
      verses.forEach((text, v) => {
        const ids = [];
        for (const w of split(text)) {
          if (!/^[a-z0-9]+$/.test(w)) continue;
          let id = vocab.get(w);
          if (id === undefined) { id = vocab.size; vocab.set(w, id); }
          ids.push(id);
        }
        perVerse.push(ids);
        where.push([b, c + 1, v + 1]);
        total += ids.length;
      });
    });
  });
  const n = perVerse.length, words = vocab.size;
  const start = new Int32Array(n + 1), seq = new Int32Array(total), docs = new Int32Array(words);
  let p = 0;
  perVerse.forEach((ids, i) => {
    start[i] = p;
    new Set(ids).forEach((id) => { docs[id]++; });
    for (const id of ids) seq[p++] = id;
  });
  start[n] = p;
  const postStart = new Int32Array(words + 1);
  for (let id = 0; id < words; id++) postStart[id + 1] = postStart[id] + docs[id];
  const posts = new Int32Array(postStart[words]);
  const fill = new Int32Array(words);
  perVerse.forEach((ids, i) => new Set(ids).forEach((id) => { posts[postStart[id] + fill[id]++] = i; }));
  const weight = new Float32Array(words);
  for (let id = 0; id < words; id++) weight[id] = Math.min(1.5, Math.max(0.12, Math.log10(n / docs[id]) / 2));
  idx = { n, vocab, start, seq, docs, postStart, posts, weight, where, chapterStart };
}

export const ready = () => !!idx;

// best local alignment of the heard words against one verse (gaps cost, rare words count most)
function align(heard, verse) {
  const s = idx.start[verse], m = idx.start[verse + 1] - s;
  let prevScore = new Float32Array(m + 1), prevHits = new Int16Array(m + 1);
  let curScore = new Float32Array(m + 1), curHits = new Int16Array(m + 1);
  let best = 0, bestHits = 0, bestEnd = -1;
  for (let i = 1; i <= heard.length; i++) {
    const w = heard[i - 1];
    curScore[0] = 0; curHits[0] = 0;
    for (let j = 1; j <= m; j++) {
      let sc, hits;
      if (w >= 0 && w === idx.seq[s + j - 1]) { sc = prevScore[j - 1] + idx.weight[w]; hits = prevHits[j - 1] + 1; }
      else { sc = prevScore[j - 1] - 0.5; hits = prevHits[j - 1]; }
      if (prevScore[j] - 0.35 > sc) { sc = prevScore[j] - 0.35; hits = prevHits[j]; }
      if (curScore[j - 1] - 0.35 > sc) { sc = curScore[j - 1] - 0.35; hits = curHits[j - 1]; }
      if (sc <= 0) { sc = 0; hits = 0; }
      curScore[j] = sc; curHits[j] = hits;
      if (sc > best) { best = sc; bestHits = hits; bestEnd = i - 1; }
    }
    [prevScore, curScore] = [curScore, prevScore];
    [prevHits, curHits] = [curHits, prevHits];
  }
  return { verse, score: best, hits: bestHits, end: bestEnd };
}

function result(r, next) {
  const [b, c, v] = idx.where[r.verse];
  return { b, c, v, score: r.score, hits: r.hits, end: r.end, next };
}

/**
 * words = last normalised words heard; ctx = { b, c, v, from } (the verse(s) on screen).
 * Returns { b, c, v, score, hits, end, next } or null.
 */
export function match(words, ctx) {
  if (!idx) return null;
  const heard = words.map((w) => { const id = idx.vocab.get(w); return id === undefined ? -1 : id; });
  const tally = new Map();
  for (const id of new Set(heard)) {
    if (id < 0 || idx.docs[id] > COMMON_LIMIT) continue;
    for (let k = idx.postStart[id]; k < idx.postStart[id + 1]; k++) {
      const verse = idx.posts[k];
      tally.set(verse, (tally.get(verse) || 0) + idx.weight[id]);
    }
  }
  const candidates = [...tally].filter((x) => x[1] >= 1.5).sort((a, b) => b[1] - a[1]).slice(0, 40).map((x) => x[0]);
  const following = new Set(), onScreen = new Set();
  if (ctx && ctx.b != null) {
    const at = idx.chapterStart[ctx.b][ctx.c - 1] + ctx.v - 1;
    for (let d = 1; d <= 2; d++) if (at + d < idx.n) { following.add(at + d); if (!candidates.includes(at + d)) candidates.push(at + d); }
    for (let u = at - (ctx.v - (ctx.from || ctx.v)); u <= at; u++) { onScreen.add(u); if (!candidates.includes(u)) candidates.push(u); }
  }
  let best = null, second = null, current = null;
  for (const verse of candidates) {
    const r = align(heard, verse);
    const bar = following.has(verse) || onScreen.has(verse) ? RELAXED : STRICT;
    r.next = following.has(verse);
    r.ok = r.score >= bar.score && r.hits >= bar.hits;
    if (onScreen.has(verse) && r.ok && (!current || r.score > current.score)) current = r;
    if (!best || r.score > best.score) { second = best; best = r; } else if (!second || r.score > second.score) second = r;
  }
  if (!best) return null;
  if (current && current.score >= best.score - 0.5) return result(current, false); // still reading what is on screen
  if (second && second.ok && second.next && !best.next && second.score >= best.score - 0.3) [best, second] = [second, best];
  if (!best.ok) return null;
  if (second && !best.next && best.score - second.score < MARGIN && best.score < STRICT.score + 2) return null; // too ambiguous
  return result(best, best.next);
}
