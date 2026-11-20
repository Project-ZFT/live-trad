// Projection screen: shows what the operator sends (verse, song stanza, translation band) and fits it to the screen.
const preview = /[?&]previz=1/.test(location.search);
if (preview) document.body.classList.add('previz');
const $ = (id) => document.getElementById(id);
const stage = $('scena'), box = $('cutie'), elText = $('text'), elText2 = $('text2'), elRef = $('ref');
let state = null, lastId = null, shownSig = '', fadeTimer = null;
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// largest font size at which the text still fits (binary search)
function fit() {
  if (!state) return;
  const cs = getComputedStyle(stage);
  const W = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  let H = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const low = state.tema && state.tema.pozitie === 'jos';
  if (low) H = window.innerHeight * 0.36;
  const scale = (state.tema && state.tema.scara) || 1;
  let lo = 8, hi = window.innerHeight * (low ? 0.06 : 0.092) * scale;
  const fits = () => box.offsetHeight <= H && box.scrollWidth <= W + 1;
  box.style.fontSize = hi + 'px';
  if (fits()) return;
  for (let k = 0; k < 12; k++) {
    const mid = (lo + hi) / 2;
    box.style.fontSize = mid + 'px';
    if (fits()) lo = mid; else hi = mid;
  }
  box.style.fontSize = lo + 'px';
}

function applyTheme(t) {
  t = t || {};
  const c = document.body.classList;
  ['tema-negru', 'tema-albastru', 'tema-alb', 'tema-verde', 'poz-jos', 'font-serif'].forEach((x) => c.remove(x));
  c.add('tema-' + (t.fundal || 'negru'));
  if (t.pozitie === 'jos') c.add('poz-jos');
  if (t.font === 'serif') c.add('font-serif');
  c.toggle('cu-sub', !!(state && state.subEcran));
}

const subBox = $('subCutie'), subText = $('subText');
let lastSubId = null, subTimer = null;
function showBand(m) {
  if (m.id === lastSubId) return;
  lastSubId = m.id;
  const done = (m.finale || []).join(' '), cur = m.curent || '';
  subText.innerHTML = '<span>' + esc(done) + '</span>' + (cur ? ' <span class="c">' + esc(cur) + '</span>' : '');
  clearTimeout(subTimer);
  if (!done && !cur) { subBox.classList.remove('vizibil'); return; }
  subBox.classList.add('vizibil');
  subTimer = setTimeout(() => subBox.classList.remove('vizibil'), 12000); // fades after a pause in speech
}

function fill() {
  const v = state.versete || [];
  const song = !!state.cantare;
  const line = (t) => (song ? esc(t).replace(/\n/g, '<br>') : esc(t));
  box.classList.toggle('cantare', song);
  const nums = (list) => !song && state.tema && state.tema.numere && list.length > 1;
  elText.innerHTML = v.map((x) => (nums(v) ? '<sup>' + x.n + '</sup>' : '') + line(x.t)).join(' ');
  const v2 = state.versete2 || [];
  elText2.innerHTML = v2.map((x) => (nums(v2) ? '<sup>' + x.n + '</sup>' : '') + line(x.t)).join(' ');
  elText2.style.display = v2.length ? '' : 'none';
  elRef.textContent = (state.ref || '') + (state.ref2 ? '   ·   ' + state.ref2 : '');
  fit();
}

function receive(m) {
  if (m && m.tip === 'sub') { showBand(m); return; }
  if (!m || m.tip !== 'stare' || m.id === lastId) return;
  lastId = m.id;
  state = m;
  applyTheme(m.tema);
  if (!m.subEcran) subBox.classList.remove('vizibil');
  const showing = m.vizibil && m.versete && m.versete.length;
  const sig = showing ? (m.cheie || m.ref) + '|' + m.versete.length : '';
  clearTimeout(fadeTimer);
  if (!showing) { box.classList.remove('vizibil'); shownSig = ''; return; }
  if (sig === shownSig) { fill(); box.classList.add('vizibil'); return; }
  shownSig = sig;
  if (box.classList.contains('vizibil')) {
    box.classList.remove('vizibil');
    fadeTimer = setTimeout(() => { fill(); box.classList.add('vizibil'); }, 170);
  } else {
    fill();
    box.classList.add('vizibil');
  }
}

let channel = null;
try { channel = new BroadcastChannel('cuvant-live'); channel.onmessage = (e) => receive(e.data); } catch (e) { /* direct messages only */ }
window.addEventListener('message', (e) => receive(e.data));
function toOperator(m) {
  const target = preview ? window.parent : window.opener;
  try { if (target && target !== window) target.postMessage(m, '*'); } catch (e) { /* gone */ }
  if (!preview && channel) { try { channel.postMessage(m); } catch (e) { /* ignored */ } }
}
toOperator({ tip: 'gata' });

window.addEventListener('resize', fit);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

if (!preview) {
  let t = null;
  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
  };
  document.addEventListener('mousemove', () => {
    document.body.classList.add('soarece');
    clearTimeout(t);
    t = setTimeout(() => document.body.classList.remove('soarece'), 2500);
  });
  document.addEventListener('dblclick', fullscreen);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') { fullscreen(); return; }
    toOperator({ tip: 'tasta', tasta: e.key });
  });
}
