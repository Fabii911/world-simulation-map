// Lädt alle Kennzahlen mit Weltbank-Code aus data/indicators.json über die offene Weltbank-API
// und schreibt sie kompakt nach data/series/worldbank.json. Keine Schlüssel nötig.
// Ausführen: npm run fetch:worldbank
import { readFileSync, writeFileSync } from 'node:fs';

const FIRST_YEAR = 1990;
const LAST_YEAR = new Date().getFullYear();
const API = 'https://api.worldbank.org/v2';
const root = new URL('..', import.meta.url);
const catalog = JSON.parse(readFileSync(new URL('data/indicators.json', root), 'utf8'));
const iso = JSON.parse(readFileSync(new URL('data/iso-codes.json', root), 'utf8'));

async function getJSON(url, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'world-simulation-map-data-fetch' }, signal: AbortSignal.timeout(90_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === tries) throw new Error(`${url}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
    }
  }
}

const wbIndicators = catalog.indicators.filter((i) => i.source.includes('Weltbank') && /^[A-Z]{2}\.[A-Z0-9.]+$/.test(i.source_code));

// Länder (ohne Aggregate wie „Euro area“, „World“)
const [, countryList] = await getJSON(`${API}/country?format=json&per_page=400`);
const countries = {};
for (const c of countryList) {
  if (c.region.id === 'NA') continue;
  countries[c.id] = { name: iso[c.id]?.de || c.name, name_en: c.name, region: c.region.value, income: c.incomeLevel.value, num: iso[c.id]?.num ?? null };
}

const values = {};
const meta = {};
const failed = [];
for (const ind of wbIndicators) {
  const url = `${API}/country/all/indicator/${ind.source_code}?format=json&date=${FIRST_YEAR}:${LAST_YEAR}&per_page=20000`;
  let info, rows;
  try {
    [info, rows] = await getJSON(url);
  } catch (e) {
    console.warn(`⚠ ${ind.id} (${ind.source_code}) übersprungen: ${e.message}`);
    failed.push(ind.id);
    continue;
  }
  const byCountry = {};
  let n = 0, maxYear = 0;
  for (const r of rows || []) {
    const id = r.countryiso3code;
    if (!countries[id] || r.value === null) continue;
    const y = Number(r.date);
    (byCountry[id] ||= {})[y] = Math.round(r.value * 100) / 100;
    n++; maxYear = Math.max(maxYear, y);
  }
  values[ind.id] = byCountry;
  meta[ind.id] = { code: ind.source_code, name: ind.name, unit: ind.unit, observations: n, last_year: maxYear, source_updated: info.lastupdated };
  console.log(`${ind.id.padEnd(14)} ${ind.source_code.padEnd(20)} ${String(n).padStart(6)} Werte, bis ${maxYear}`);
}

const out = {
  meta: { failed, source: 'Weltbank, World Development Indicators (CC BY 4.0)', url: 'https://data.worldbank.org', fetched: new Date().toISOString().slice(0, 10), years: [FIRST_YEAR, LAST_YEAR], indicators: meta },
  countries,
  values,
};
writeFileSync(new URL('data/series/worldbank.json', root), JSON.stringify(out));
console.log(`✓ ${Object.keys(countries).length} Länder, ${Object.keys(values).length} Kennzahlen → data/series/worldbank.json`);
if (failed.length) console.warn(`⚠ Nicht geladen: ${failed.join(', ')} – beim nächsten Lauf erneut versuchen`);
