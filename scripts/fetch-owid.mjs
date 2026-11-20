// Lädt alle Kennzahlen mit „owid_slug“ aus data/indicators.json von Our World in Data (CC BY 4.0)
// und schreibt sie nach data/series/owid.json. Keine Schlüssel nötig.
// Ausführen: npm run fetch:owid
import { readFileSync, writeFileSync } from 'node:fs';

const FIRST_YEAR = 1990;
const root = new URL('..', import.meta.url);
const catalog = JSON.parse(readFileSync(new URL('data/indicators.json', root), 'utf8'));
const iso = JSON.parse(readFileSync(new URL('data/iso-codes.json', root), 'utf8'));

async function getText(url, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'world-simulation-map-data-fetch' }, signal: AbortSignal.timeout(90_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (i === tries) throw new Error(`${url}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
    }
  }
}

// Einfacher CSV-Parser (Felder in Anführungszeichen mit Kommas werden unterstützt)
function parseCSV(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    const out = []; let cur = ''; let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
    }
    out.push(cur); rows.push(out);
  }
  return rows;
}

const values = {}, meta = {}, failed = [];
for (const ind of catalog.indicators.filter((i) => i.owid_slug)) {
  const url = `https://ourworldindata.org/grapher/${ind.owid_slug}.csv?v=1&csvType=full&useColumnShortNames=true`;
  let rows;
  try { rows = parseCSV(await getText(url)); } catch (e) { console.warn(`⚠ ${ind.id} übersprungen: ${e.message}`); failed.push(ind.id); continue; }
  const [head, ...data] = rows;
  const ci = head.indexOf('code'), yi = head.indexOf('year'), vi = 3; // erste Wertespalte
  const byCountry = {}; let n = 0, maxYear = 0;
  for (const r of data) {
    const code = r[ci], y = Number(r[yi]), v = Number(r[vi]);
    if (!iso[code] || y < FIRST_YEAR || r[vi] === '' || !Number.isFinite(v)) continue;
    const digits = Math.abs(v) >= 100 ? 0 : 3;
    (byCountry[code] ||= {})[y] = Number(v.toFixed(digits));
    n++; maxYear = Math.max(maxYear, y);
  }
  if (!n) { console.warn(`⚠ ${ind.id}: keine Länderwerte`); failed.push(ind.id); continue; }
  values[ind.id] = byCountry;
  meta[ind.id] = { slug: ind.owid_slug, column: head[vi], name: ind.name, unit: ind.unit, observations: n, last_year: maxYear };
  console.log(`${ind.id.padEnd(14)} ${ind.owid_slug.padEnd(45)} ${String(n).padStart(6)} Werte, bis ${maxYear}`);
}

writeFileSync(new URL('data/series/owid.json', root), JSON.stringify({
  meta: { failed, source: 'Our World in Data (CC BY 4.0) mit den jeweils genannten Primärquellen', url: 'https://ourworldindata.org', fetched: new Date().toISOString().slice(0, 10), indicators: meta },
  values,
}));
console.log(`✓ ${Object.keys(values).length} Kennzahlen → data/series/owid.json`);
if (failed.length) console.warn(`⚠ Nicht geladen: ${failed.join(', ')}`);
