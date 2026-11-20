// Prüft die Datendateien auf Konsistenz (Referenzen, Pflichtfelder, Wertebereiche).
import { readFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const errors = [];
const err = (m) => errors.push(m);

const model = read('data/model.json');
const timeline = read('data/timeline.json');
const indicators = read('data/indicators.json');

const RATINGS = new Set(['supported', 'partial', 'contested', 'false', 'unverifiable']);
const dup = (arr, what) => { const s = new Set(); for (const x of arr) { if (s.has(x)) err(`Doppelte ${what}: ${x}`); s.add(x); } return s; };

const nodeIds = dup(model.nodes.map((n) => n.id), 'Knoten-ID');
const claimIds = dup(model.claims.map((c) => c.id), 'Aussage-ID');
for (const n of model.nodes) {
  if (!n.label) err(`Knoten ${n.id} ohne label`);
  if (!n.domain) err(`Knoten ${n.id} ohne domain`);
  if (!n.description) err(`Knoten ${n.id} ohne description`);
}
dup(model.edges.map((e) => `${e.from}>${e.to}`), 'Kante');
for (const e of model.edges) {
  const k = `${e.from}>${e.to}`;
  if (!nodeIds.has(e.from)) err(`Kante ${k}: unbekannter Startknoten`);
  if (!nodeIds.has(e.to)) err(`Kante ${k}: unbekannter Zielknoten`);
  if (!['+', '-'].includes(e.polarity)) err(`Kante ${k}: Polarität ${e.polarity}`);
  if (!(e.confidence >= 0 && e.confidence <= 1)) err(`Kante ${k}: confidence außerhalb 0..1`);
  if (!(e.weight >= -1 && e.weight <= 1)) err(`Kante ${k}: weight außerhalb -1..1`);
  if ((e.polarity === '+') !== (e.weight >= 0)) err(`Kante ${k}: Polarität passt nicht zum Vorzeichen des Gewichts`);
  for (const c of e.claims) if (!claimIds.has(c)) err(`Kante ${k}: unbekannte Aussage ${c}`);
}
for (const c of model.claims) if (!RATINGS.has(c.rating)) err(`Aussage ${c.id}: Bewertung ${c.rating}`);
for (const l of model.loops || []) for (const n of l.nodes) if (!nodeIds.has(n)) err(`Schleife ${l.id}: unbekannter Knoten ${n}`);

dup(timeline.events.map((e) => e.id), 'Ereignis-ID');
for (const ev of timeline.events) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ev.date) || Number.isNaN(Date.parse(ev.date))) err(`Ereignis ${ev.id}: ungültiges Datum ${ev.date}`);
  for (const n of ev.affects) if (!nodeIds.has(n)) err(`Ereignis ${ev.id}: unbekannter Knoten ${n}`);
}
const edgeKeys = new Set(model.edges.map((e) => `${e.from}>${e.to}`));
for (const v of timeline.edge_validity || []) {
  if (!edgeKeys.has(`${v.from}>${v.to}`)) err(`edge_validity ${v.from}>${v.to}: Kante existiert nicht`);
  for (const p of v.valid) if (!(p.weight >= -1 && p.weight <= 1)) err(`edge_validity ${v.from}>${v.to}: Gewicht außerhalb -1..1`);
}
for (const s of timeline.series || []) if (!nodeIds.has(s.node)) err(`Zeitreihe ${s.indicator}: unbekannter Knoten ${s.node}`);

dup(indicators.indicators.map((i) => i.id), 'Kennzahl-ID');
for (const i of indicators.indicators) {
  if (!indicators.meta.dimensions[i.dimension]) err(`Kennzahl ${i.id}: unbekannte Dimension ${i.dimension}`);
  for (const n of i.model_nodes) if (!nodeIds.has(n)) err(`Kennzahl ${i.id}: unbekannter Knoten ${n}`);
}

// Zeitreihen (falls vorhanden)
let seriesInfo = '';
try {
  const wb = read('data/series/worldbank.json');
  const indIds = new Set(indicators.indicators.map((i) => i.id));
  for (const id of Object.keys(wb.values)) if (!indIds.has(id)) err(`worldbank.json: Kennzahl ${id} fehlt im Katalog`);
  for (const [id, byC] of Object.entries(wb.values)) {
    for (const [iso, byY] of Object.entries(byC)) {
      if (!wb.countries[iso]) err(`worldbank.json: ${id} enthält unbekanntes Land ${iso}`);
      for (const [y, v] of Object.entries(byY)) if (typeof v !== 'number' || !Number.isFinite(v) || !/^\d{4}$/.test(y)) err(`worldbank.json: ${id}/${iso}/${y} ungültig`);
    }
  }
  const noNum = Object.entries(wb.countries).filter(([, c]) => !c.num).map(([iso]) => iso);
  seriesInfo = `, Zeitreihen: ${Object.keys(wb.values).length} Kennzahlen für ${Object.keys(wb.countries).length} Länder (ohne Kartencode: ${noNum.length})`;
} catch (e) {
  if (e.code !== 'ENOENT') err(`worldbank.json: ${e.message}`);
}
try {
  const ow = read('data/series/owid.json');
  const indIds = new Set(indicators.indicators.map((i) => i.id));
  for (const id of Object.keys(ow.values)) if (!indIds.has(id)) err(`owid.json: Kennzahl ${id} fehlt im Katalog`);
  seriesInfo += `, OWID: ${Object.keys(ow.values).length} Kennzahlen`;
} catch (e) { if (e.code !== 'ENOENT') err(`owid.json: ${e.message}`); }
try {
  const dn = read('data/series/doughnut.json');
  if (dn.meta.bio_labels.length !== 6 || dn.meta.social_labels.length !== 11) err('doughnut.json: unerwartete Anzahl an Dimensionen');
  for (const [iso, byY] of Object.entries(dn.bio)) for (const [y, v] of Object.entries(byY)) if (v.length !== 6) err(`doughnut.json: ${iso}/${y} unvollständig`);
  seriesInfo += `, Donut: ${Object.keys(dn.bio).length} Länder`;
} catch (e) { if (e.code !== 'ENOENT') err(`doughnut.json: ${e.message}`); }

try {
  const ch = read('data/chains.json');
  const ek = new Set(model.edges.map((e) => `${e.from}>${e.to}`));
  for (const c of ch.chains) for (const st of c.steps) if (!ek.has(`${st.from}>${st.to}`)) err(`chains.json: ${c.id} enthält Schritt ${st.from}>${st.to} ohne Wirkung im Modell`);
  const ev = read('data/evidence.json');
  const ind = new Set(indicators.indicators.map((i) => i.id));
  for (const [k, spec] of Object.entries(ev.edges)) {
    if (!ek.has(k)) err(`evidence.json: Wirkung ${k} existiert nicht`);
    for (const side of ['x', 'y']) {
      const sp = spec[side];
      if (!sp || !['series', 'trade'].includes(sp.source)) err(`evidence.json: ${k}.${side} ungültige Quelle`);
      else if (sp.source === 'series' && !ind.has(sp.ind)) err(`evidence.json: ${k}.${side} unbekannte Kennzahl ${sp.ind}`);
    }
  }
  seriesInfo += `, Ketten: ${ch.chains.length}, Datenbelege: ${Object.keys(ev.edges).length}`;
} catch (e) { err(`chains/evidence: ${e.message}`); }
try {
  const tr = read('data/series/trade.json');
  const n = tr.meta.years.length;
  for (const [ch, a] of Object.entries(tr.world)) { if (!tr.meta.chapters[ch]) err(`trade.json: unbekanntes Kapitel ${ch}`); if (a.length !== n) err(`trade.json: Welt/${ch} falsche Länge`); }
  if (!tr.countries.CHN) err('trade.json: China fehlt');
  for (const [iso, chs] of Object.entries(tr.countries)) for (const [ch, a] of Object.entries(chs)) if (a.length !== n || a.some((v) => !Number.isInteger(v) || v < 0)) err(`trade.json: ${iso}/${ch} ungültig`);
  seriesInfo += `, Handel: ${Object.keys(tr.countries).length} Länder × ${Object.keys(tr.meta.chapters).length} Kapitel, ${tr.meta.years[0]}–${tr.meta.years.at(-1)}`;
} catch (e) { if (e.code !== 'ENOENT') err(`trade.json: ${e.message}`); }
try {
  const src = read('data/sources.json');
  for (const s of src.sources) for (const k of ['id', 'name', 'publisher', 'url', 'license', 'used_for', 'update']) if (!s[k]) err(`sources.json: ${s.id || '?'} ohne ${k}`);
} catch (e) { err(`sources.json: ${e.message}`); }

if (errors.length) {
  console.error(`✗ ${errors.length} Fehler:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`✓ Daten konsistent: ${model.nodes.length} Knoten, ${model.edges.length} Kanten, ${model.claims.length} Aussagen, ${(model.loops || []).length} Schleifen, ${timeline.events.length} Ereignisse, ${indicators.indicators.length} Kennzahlen${seriesInfo}`);
