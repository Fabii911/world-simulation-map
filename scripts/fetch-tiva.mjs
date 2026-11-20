// Herkunft der Wertschöpfung in Exporten (OECD Trade in Value Added, TiVA, Dataflow DF_EXGRVA).
// Je Exportland und Branche: gesamte Exporte, inländische Wertschöpfung und die größten ausländischen Herkunftsländer.
// Ausgabe: data/series/tiva.json. Keine Schlüssel nötig. Ausführen: npm run fetch:tiva
// Hinweis: Die OECD-Schnittstelle antwortet mit HTTP 500, wenn „Accept-Language: *“ gesendet wird (Standard von fetch).
import { writeFileSync } from 'node:fs';

const BASE = 'https://sdmx.oecd.org/sti-public/rest/data/OECD.STI.PIE,DSD_TIVA_EXGRVA@DF_EXGRVA,1.2';
const FIRST_YEAR = 2005;
const EXPORTERS = ['DEU', 'FRA', 'ITA', 'ESP', 'NLD', 'POL', 'CZE', 'HUN', 'SVK', 'AUT', 'SWE', 'BEL', 'USA', 'GBR', 'JPN', 'KOR', 'MEX', 'CAN', 'TUR', 'IND', 'BRA', 'CHN'];
const ACTIVITIES = {
  C: 'Verarbeitendes Gewerbe insgesamt', C20: 'Chemie', C21: 'Pharma', C24: 'Metallerzeugung', C26: 'Elektronik, Optik',
  C27: 'Elektrische Ausrüstung', C28: 'Maschinenbau', C29: 'Kraftfahrzeuge',
};
const AGG = /^(W|WX|OECD|G20|E|EU|EA|APEC|ASEAN|NAFTA|MERCOSUR|S\d|A\d|F\d|O|D$|S$|A$|F$)/; // Aggregate, keine Länder

function parseCSV(text) {
  const [head, ...rows] = text.trim().split(/\r?\n/);
  const h = head.split(',');
  return rows.map((line) => { const v = line.split(','); return Object.fromEntries(h.map((k, i) => [k, v[i]])); });
}

async function get(url, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'world-simulation-map-data-fetch', 'Accept-Language': 'en' }, signal: AbortSignal.timeout(180_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (i === tries) throw e;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** i));
    }
  }
}

const out = {};
let lastYear = 0;
for (const ex of EXPORTERS) {
  const url = `${BASE}/EXGRVA.._T.${ex}.${Object.keys(ACTIVITIES).join('+')}..A?startPeriod=${FIRST_YEAR}&format=csvfile`;
  const rows = parseCSV(await get(url));
  out[ex] = {};
  for (const act of Object.keys(ACTIVITIES)) {
    const ra = rows.filter((r) => r.EXPORTING_ACTIVITY === act);
    const byYear = {};
    for (const r of ra) {
      const y = Number(r.TIME_PERIOD), v = Number(r.OBS_VALUE);
      if (!Number.isFinite(v)) continue;
      (byYear[y] ||= {})[r.VALUE_ADDED_SOURCE_AREA] = v;
      lastYear = Math.max(lastYear, y);
    }
    const series = {};
    for (const [y, src] of Object.entries(byYear)) {
      const total = src.W;
      if (!total) continue;
      const foreign = Object.entries(src).filter(([a]) => a !== ex && !AGG.test(a) && a.length === 3).sort((a, b) => b[1] - a[1]);
      series[y] = {
        total: Math.round(total), dom: Math.round(src[ex] || 0),
        cn: Math.round(src.CHN || 0), top: foreign.slice(0, 8).map(([a, v]) => [a, Math.round(v)]),
      };
    }
    out[ex][act] = series;
  }
  console.log(`${ex}: ${rows.length} Werte`);
}

writeFileSync(new URL('../data/series/tiva.json', import.meta.url), JSON.stringify({
  meta: { source: 'OECD Trade in Value Added (TiVA), Origin of value added in gross exports (DF_EXGRVA)', url: 'https://www.oecd.org/en/topics/sub-issues/trade-in-value-added.html',
    license: 'OECD Terms and Conditions (Weiterverwendung mit Quellenangabe)', fetched: new Date().toISOString().slice(0, 10), unit: 'Mio. USD',
    first_year: FIRST_YEAR, last_year: lastYear, activities: ACTIVITIES, exporters: EXPORTERS },
  data: out,
}));
console.log(`✓ ${EXPORTERS.length} Exportländer × ${Object.keys(ACTIVITIES).length} Branchen, ${FIRST_YEAR}–${lastYear} → data/series/tiva.json`);
