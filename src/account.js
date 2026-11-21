// The host's church login: church name, e-mail, the host's own name (Elim 1, Elim 2…) and their own guest code.
import { plain } from './references.js';

const KEY = 'cl.gazda';
const LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function randomPart(n) {
  const v = new Uint8Array(n);
  crypto.getRandomValues(v);
  return Array.from(v, (x) => LETTERS[x % LETTERS.length]).join('');
}

export function makeCode(host) {
  const slug = plain(host).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'GAZDA';
  return slug + '-' + randomPart(4);
}

export function load() {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (a && a.church && a.host && a.code) return a;
  } catch (e) { /* nothing saved */ }
  return null;
}

export function save(a) {
  try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) { /* no storage */ }
  return a;
}

export function clear() {
  try { localStorage.removeItem(KEY); } catch (e) { /* no storage */ }
}

export const validEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s).trim());

/** The address guests open; the code is filled in for them. */
export function guestLink(code) {
  const clean = String(code || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const root = new URL('./', document.baseURI);
  return new URL('join/?c=' + encodeURIComponent(clean), root).href;
}
export function guestHome() {
  return new URL('join/', new URL('./', document.baseURI)).href;
}
