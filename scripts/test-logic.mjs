// Quick checks of the reference reader, quote matcher and phrase cutting: node scripts/test-logic.mjs
import { readFileSync } from 'node:fs';
import * as Ref from '../src/references.js';
import * as Quotes from '../src/quotes.js';

const B = JSON.parse(readFileSync(new URL('../public/data/biblia-ro.json', import.meta.url))).books;
Ref.setShape(B);
let fail = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + ' → ' + JSON.stringify(got) + (ok ? '' : ' (want ' + JSON.stringify(want) + ')'));
};
const one = (text, ctx, opts) => {
  const r = Ref.find(text, ctx, opts).refs.pop();
  return r ? Ref.format(r) : null;
};
check('spoken', one('Ioan capitolul trei versetul șaisprezece'), 'Ioan 3:16');
check('typed', one('1cor 13 4-7', null, { typed: true }), '1 Corinteni 13:4-7');
check('epistle', one('a doua epistolă către corinteni capitolul cinci versetul 17'), '2 Corinteni 5:17');
check('psalm', one('psalmul douăzeci și trei'), 'Psalmul 23');
check('psalm 119', one('Psalmul o sută nouăsprezece versetul 105'), 'Psalmul 119:105');
check('range', one('Romani 8 de la versetul 28 până la 30'), 'Romani 8:28-30');
check('jude', one('Iuda 3'), 'Iuda 1:3');
check('run together', one('Ioan 316'), 'Ioan 3:16');
check('relative', one('versetul 17', { b: 42, c: 3 }), 'Ioan 3:17');
check('verse of', one('versetul 16 din Ioan 3'), 'Ioan 3:16');
check('1 ioan', one('întâia epistolă a lui Ioan capitolul 1 versetul 9'), '1 Ioan 1:9');
check('roman', one('Isaia capitolul LIII versetul 5'), 'Isaia 53:5');
check('nothing', one('astăzi vorbim despre dragoste'), null);
check('command', Ref.command('te rog versetul următor'), 'next');

Quotes.prepare(B, Ref.tokens);
const words = Ref.tokens('fiindcă atât de mult a iubit Dumnezeu lumea că a dat pe singurul Lui Fiu').filter((w) => /^[a-z0-9]+$/.test(w));
const m = Quotes.match(words, null);
check('quote', m ? Ref.format(m) : null, 'Ioan 3:16');

process.exit(fail ? 1 : 0);
