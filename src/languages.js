// The languages guests can follow: name, Romanian name (host page), voice, and the Bible used for verses.
// The Bibles are public-domain translations close to Cornilescu (e.g. they keep the word "repentance" for pocăință).

export const LANGS = {
  ro: { name: 'Română', ro: 'română', short: 'RO', voice: 'ro-RO', bible: 'data/biblia-ro.json' },
  fr: { name: 'Français', ro: 'franceză', short: 'FR', voice: 'fr-BE', voices: ['fr-BE', 'fr-FR'], bible: 'data/biblia-fr.json' },
  nl: { name: 'Nederlands', ro: 'neerlandeză', short: 'NL', voice: 'nl-BE', voices: ['nl-BE', 'nl-NL'], bible: 'data/biblia-nl.json' },
  de: { name: 'Deutsch', ro: 'germană', short: 'DE', voice: 'de-DE', bible: 'data/biblia-de.json' },
  en: { name: 'English', ro: 'engleză', short: 'EN', voice: 'en-GB', voices: ['en-GB', 'en-US'], bible: 'data/biblia-en.json' },
  es: { name: 'Español', ro: 'spaniolă', short: 'ES', voice: 'es-ES', bible: 'data/biblia-es.json' },
};
export const ORDER = ['ro', 'fr', 'nl', 'de', 'en', 'es'];
export const TRANSLATED = ['fr', 'nl', 'de', 'en', 'es'];

const list = (s) => s.split('|');
export const BOOKS = {
  de: list('1. Mose|2. Mose|3. Mose|4. Mose|5. Mose|Josua|Richter|Rut|1. Samuel|2. Samuel|1. Könige|2. Könige|1. Chronik|2. Chronik|Esra|Nehemia|Ester|Hiob|Psalm|Sprüche|Prediger|Hoheslied|Jesaja|Jeremia|Klagelieder|Hesekiel|Daniel|Hosea|Joel|Amos|Obadja|Jona|Micha|Nahum|Habakuk|Zefanja|Haggai|Sacharja|Maleachi|Matthäus|Markus|Lukas|Johannes|Apostelgeschichte|Römer|1. Korinther|2. Korinther|Galater|Epheser|Philipper|Kolosser|1. Thessalonicher|2. Thessalonicher|1. Timotheus|2. Timotheus|Titus|Philemon|Hebräer|Jakobus|1. Petrus|2. Petrus|1. Johannes|2. Johannes|3. Johannes|Judas|Offenbarung'),
  en: list('Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalm|Proverbs|Ecclesiastes|Song of Songs|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation'),
  fr: list('Genèse|Exode|Lévitique|Nombres|Deutéronome|Josué|Juges|Ruth|1 Samuel|2 Samuel|1 Rois|2 Rois|1 Chroniques|2 Chroniques|Esdras|Néhémie|Esther|Job|Psaume|Proverbes|Ecclésiaste|Cantique des cantiques|Ésaïe|Jérémie|Lamentations|Ézéchiel|Daniel|Osée|Joël|Amos|Abdias|Jonas|Michée|Nahum|Habacuc|Sophonie|Aggée|Zacharie|Malachie|Matthieu|Marc|Luc|Jean|Actes|Romains|1 Corinthiens|2 Corinthiens|Galates|Éphésiens|Philippiens|Colossiens|1 Thessaloniciens|2 Thessaloniciens|1 Timothée|2 Timothée|Tite|Philémon|Hébreux|Jacques|1 Pierre|2 Pierre|1 Jean|2 Jean|3 Jean|Jude|Apocalypse'),
  es: list('Génesis|Éxodo|Levítico|Números|Deuteronomio|Josué|Jueces|Rut|1 Samuel|2 Samuel|1 Reyes|2 Reyes|1 Crónicas|2 Crónicas|Esdras|Nehemías|Ester|Job|Salmo|Proverbios|Eclesiastés|Cantares|Isaías|Jeremías|Lamentaciones|Ezequiel|Daniel|Oseas|Joel|Amós|Abdías|Jonás|Miqueas|Nahúm|Habacuc|Sofonías|Hageo|Zacarías|Malaquías|Mateo|Marcos|Lucas|Juan|Hechos|Romanos|1 Corintios|2 Corintios|Gálatas|Efesios|Filipenses|Colosenses|1 Tesalonicenses|2 Tesalonicenses|1 Timoteo|2 Timoteo|Tito|Filemón|Hebreos|Santiago|1 Pedro|2 Pedro|1 Juan|2 Juan|3 Juan|Judas|Apocalipsis'),
};

export function refIn(lang, r) {
  const names = BOOKS[lang];
  if (!names) return null;
  let s = names[r.b] + ' ' + r.c;
  if (r.v != null) s += ':' + r.v + (r.v2 != null && r.v2 > r.v ? '-' + r.v2 : '');
  return s;
}
