// Importe kritischer Güter nach Lieferland (Atlas of Economic Complexity, HS92, 4-Steller, CC0).
// Je Importland und Produkt: Importwert, eigene Exporte, Anteil Chinas, Lieferkonzentration (HHI), größte Lieferländer.
// Ausgabe: data/series/dependencies.json. Ausführen: npm run fetch:dependencies
import { readFileSync, writeFileSync } from 'node:fs';

const API = 'https://atlas.hks.harvard.edu/api/graphql';
const FIRST_YEAR = 2010;
const IMPORTERS = ['DEU', 'FRA', 'ITA', 'ESP', 'NLD', 'POL', 'AUT', 'CZE', 'SWE', 'BEL', 'USA', 'GBR', 'JPN', 'KOR', 'CHN', 'IND',
  'BRA', 'MEX', 'CAN', 'AUS', 'TUR', 'CHE', 'IDN', 'VNM', 'ZAF', 'SAU', 'RUS'];
// Kritische Güter (Auswahl angelehnt an die Analyse strategischer Abhängigkeiten der EU-Kommission, SWD(2021) 352)
const PRODUCTS = {
  '8507': ['Batterien und Akkus', 'Energiewende'], '8541': ['Halbleiterbauelemente, Solarzellen', 'Energiewende'],
  '8504': ['Transformatoren, Wechselrichter', 'Energiewende'], '8502': ['Stromaggregate, Windturbinen', 'Energiewende'],
  '8505': ['Magnete (u. a. Permanentmagnete)', 'Energiewende'], '2804': ['Silizium u. a. Elemente', 'Energiewende'],
  '2805': ['Seltenerdmetalle', 'Kritische Rohstoffe'], '2846': ['Seltenerdverbindungen', 'Kritische Rohstoffe'],
  '2504': ['Naturgraphit', 'Kritische Rohstoffe'], '8112': ['Gallium, Germanium u. a. Metalle', 'Kritische Rohstoffe'],
  '2836': ['Carbonate (u. a. Lithiumcarbonat)', 'Kritische Rohstoffe'], '8105': ['Kobalt', 'Kritische Rohstoffe'],
  '8110': ['Antimon', 'Kritische Rohstoffe'], '8102': ['Molybdän', 'Kritische Rohstoffe'],
  '8542': ['Integrierte Schaltungen (Chips)', 'Elektronik'], '8471': ['Computer', 'Elektronik'], '8517': ['Telefone, Netzwerktechnik', 'Elektronik'],
  '2941': ['Antibiotika', 'Gesundheit'], '3004': ['Arzneimittel (dosiert)', 'Gesundheit'], '2936': ['Vitamine', 'Gesundheit'], '3002': ['Impfstoffe, Blutprodukte', 'Gesundheit'],
  '2709': ['Erdöl', 'Energie'], '2711': ['Erdgas, Flüssiggas', 'Energie'], '2701': ['Steinkohle', 'Energie'],
  '3102': ['Stickstoffdünger', 'Ernährung'], '3104': ['Kalidünger', 'Ernährung'], '1001': ['Weizen', 'Ernährung'], '1201': ['Sojabohnen', 'Ernährung'],
  '8703': ['Pkw', 'Fahrzeuge'], '8708': ['Kfz-Teile', 'Fahrzeuge'],
};

async function gql(query, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'world-simulation-map-data-fetch' }, body: JSON.stringify({ query }), signal: AbortSignal.timeout(120_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      if (j.errors) throw new Error(j.errors.map((e) => e.message).join('; '));
      return j.data;
    } catch (e) {
      if (i === tries) throw e;
      await new Promise((r) => setTimeout(r, 1500 * 2 ** i));
    }
  }
}

const { productHs92 } = await gql('{ productHs92(productLevel: 4) { productId code } }');
const pid = Object.fromEntries(productHs92.map((p) => [p.code, Number(p.productId.replace('product-HS92-', ''))]));
for (const code of Object.keys(PRODUCTS)) if (!pid[code]) throw new Error(`Produkt ${code} nicht im Atlas`);
const { locationCountry } = await gql('{ locationCountry { countryId iso3Code } }');
const isoOf = Object.fromEntries(locationCountry.map((c) => [c.countryId, c.iso3Code]));
const numOf = Object.fromEntries(locationCountry.map((c) => [c.iso3Code, c.countryId.replace('country-', '')]));

// Letztes Jahr mit Daten bestimmen (Deutschland, Batterien)
const probe = await gql(`{ countryCountryProductYear(productClass: HS92, productLevel: 4, countryId: ${numOf.DEU}, productId: ${pid['8507']}, yearMin: 2015, yearMax: 2030) { year importValue } }`);
const lastYear = Math.max(...probe.countryCountryProductYear.filter((r) => r.importValue > 0).map((r) => r.year));
const years = []; for (let y = FIRST_YEAR; y <= lastYear; y++) years.push(y);
const r1 = (v) => Math.round(v * 1000) / 1000;

const data = {};
let calls = 0;
for (const imp of IMPORTERS) {
  data[imp] = {};
  for (const code of Object.keys(PRODUCTS)) {
    const q = `{ countryCountryProductYear(productClass: HS92, productLevel: 4, countryId: ${numOf[imp]}, productId: ${pid[code]}, yearMin: ${FIRST_YEAR}, yearMax: ${lastYear}) { partnerCountryId year exportValue importValue } }`;
    const rows = (await gql(q)).countryCountryProductYear; calls++;
    const M = [], X = [], cn = [], hhi = [], top = {};
    for (const y of years) {
      const ry = rows.filter((r) => r.year === y);
      const m = ry.reduce((s, r) => s + (r.importValue || 0), 0), x = ry.reduce((s, r) => s + (r.exportValue || 0), 0);
      M.push(Math.round(m / 1e6)); X.push(Math.round(x / 1e6));
      const shares = ry.filter((r) => r.importValue > 0).map((r) => [isoOf[r.partnerCountryId] || r.partnerCountryId, r.importValue / m]).sort((a, b) => b[1] - a[1]);
      cn.push(m ? r1(shares.find((s) => s[0] === 'CHN')?.[1] || 0) : null);
      hhi.push(m ? r1(shares.reduce((s, [, v]) => s + v * v, 0)) : null);
      if (y === lastYear || y === 2015) top[y] = shares.slice(0, 6).map(([c, v]) => [c, r1(v)]);
    }
    data[imp][code] = { M, X, cn, hhi, top };
  }
  console.log(`${imp}: ${Object.keys(PRODUCTS).length} Produkte`);
}

writeFileSync(new URL('../data/series/dependencies.json', import.meta.url), JSON.stringify({
  meta: { source: 'Growth Lab at Harvard University: International Trade Data (HS, 92), Atlas of Economic Complexity', doi: '10.7910/DVN/T4CHWJ', license: 'CC0 1.0',
    fetched: new Date().toISOString().slice(0, 10), unit: 'Mio. USD', years, importers: IMPORTERS,
    products: Object.fromEntries(Object.entries(PRODUCTS).map(([c, [name, group]]) => [c, { name, group }])) },
  data,
}));
console.log(`✓ ${IMPORTERS.length} Importländer × ${Object.keys(PRODUCTS).length} Produkte, ${years[0]}–${lastYear}, ${calls} Abfragen → data/series/dependencies.json`);
