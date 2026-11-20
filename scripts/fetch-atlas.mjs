// Lädt Exporte nach Land × HS-Kapitel × Jahr aus dem Atlas of Economic Complexity (Harvard Growth Lab).
// Datensatz: International Trade Data (HS, 92), doi:10.7910/DVN/T4CHWJ, Lizenz CC0 1.0.
// Ausgabe: data/series/trade.json (Werte in Mio. USD). Keine Schlüssel nötig.
// Ausführen: npm run fetch:atlas
import { writeFileSync } from 'node:fs';

const API = 'https://atlas.hks.harvard.edu/api/graphql';
const FIRST_YEAR = 2000;
const MIN_EXPORTS_MUSD = 1000; // nur Länder mit mind. 1 Mrd. USD Warenexporten im letzten Jahr

// Deutsche Kurzbezeichnungen: Sektoren (Atlas-Gliederung) und HS-Kapitel
const SECTORS = {
  0: 'Textilien, Bekleidung, Möbel', 1: 'Agrar, Lebensmittel, Holz', 2: 'Stein, Glas, Edelmetalle', 3: 'Rohstoffe, Energie',
  4: 'Metalle', 5: 'Chemie, Kunststoffe', 6: 'Fahrzeuge', 7: 'Maschinen, Geräte', 8: 'Elektronik', 9: 'Sonstiges',
};
const CHAPTERS = {
  '01': 'Lebende Tiere', '02': 'Fleisch', '03': 'Fisch', '04': 'Milchprodukte, Eier, Honig', '05': 'Andere tierische Erzeugnisse',
  '06': 'Pflanzen, Blumen', '07': 'Gemüse', '08': 'Obst, Nüsse', '09': 'Kaffee, Tee, Gewürze', '10': 'Getreide',
  '11': 'Mehl, Stärke, Malz', '12': 'Ölsaaten', '13': 'Pflanzensäfte, Harze', '14': 'Andere pflanzliche Stoffe',
  '15': 'Fette und Öle', '16': 'Fleisch- und Fischzubereitungen', '17': 'Zucker, Süßwaren', '18': 'Kakao',
  '19': 'Getreide- und Backwaren', '20': 'Obst- und Gemüsezubereitungen', '21': 'Verschiedene Lebensmittel', '22': 'Getränke',
  '23': 'Futtermittel', '24': 'Tabak', '25': 'Salz, Zement, Steine', '26': 'Erze', '27': 'Öl, Gas, Kohle',
  '28': 'Anorganische Chemie', '29': 'Organische Chemie', '30': 'Pharmazeutika', '31': 'Düngemittel', '32': 'Farben, Lacke',
  '33': 'Kosmetik, ätherische Öle', '34': 'Seifen, Wachse', '35': 'Leime, Enzyme', '36': 'Sprengstoffe', '37': 'Foto- und Filmwaren',
  '38': 'Sonstige chemische Erzeugnisse', '39': 'Kunststoffe', '40': 'Kautschuk', '41': 'Häute, Leder', '42': 'Lederwaren',
  '43': 'Pelze', '44': 'Holz', '45': 'Kork', '46': 'Flechtwaren', '47': 'Zellstoff', '48': 'Papier, Pappe', '49': 'Druckerzeugnisse',
  '50': 'Seide', '51': 'Wolle', '52': 'Baumwolle', '53': 'Andere Pflanzenfasern', '54': 'Synthetische Filamente',
  '55': 'Synthetische Spinnfasern', '56': 'Watte, Vliesstoffe', '57': 'Teppiche', '58': 'Spezialgewebe', '59': 'Beschichtete Gewebe',
  '60': 'Gewirke', '61': 'Bekleidung (gewirkt)', '62': 'Bekleidung (nicht gewirkt)', '63': 'Andere Textilwaren', '64': 'Schuhe',
  '65': 'Kopfbedeckungen', '66': 'Schirme', '67': 'Federn, Daunen', '68': 'Stein- und Zementwaren', '69': 'Keramik',
  '70': 'Glas', '71': 'Edelmetalle, Edelsteine', '72': 'Eisen und Stahl', '73': 'Waren aus Eisen und Stahl', '74': 'Kupfer',
  '75': 'Nickel', '76': 'Aluminium', '78': 'Blei', '79': 'Zink', '80': 'Zinn', '81': 'Andere unedle Metalle', '82': 'Werkzeuge, Besteck',
  '83': 'Sonstige Metallwaren', '84': 'Maschinen', '85': 'Elektrotechnik, Elektronik', '86': 'Schienenfahrzeuge',
  '87': 'Kraftfahrzeuge und Teile', '88': 'Luftfahrzeuge', '89': 'Schiffe', '90': 'Optik, Mess- und Medizintechnik', '91': 'Uhren',
  '92': 'Musikinstrumente', '93': 'Waffen, Munition', '94': 'Möbel, Leuchten', '95': 'Spielzeug, Sportgeräte',
  '96': 'Sonstige Fertigwaren', '97': 'Kunst, Antiquitäten', '99': 'Nicht zugeordnet',
};

async function gql(query, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'world-simulation-map-data-fetch' },
        body: JSON.stringify({ query }), signal: AbortSignal.timeout(120_000),
      });
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

const { productHs92 } = await gql('{ productHs92(productLevel: 2) { productId code productType topParent { code } } }');
const goods = productHs92.filter((p) => p.productType === 'good');
const chapterById = new Map(goods.map((p) => [p.productId, p.code]));
const sectorOf = Object.fromEntries(goods.map((p) => [p.code, Number(p.topParent.code)]));
for (const p of goods) if (!CHAPTERS[p.code]) throw new Error(`Kein deutscher Name für Kapitel ${p.code}`);

// Letztes Jahr mit Handelsdaten (die Jahresliste der API kann weiter reichen als die Daten)
const { year } = await gql('{ year { year } }');
const maxYear = Math.max(...year.map((y) => y.year));
const probe = await gql(`{ productYear(productClass: HS92, productLevel: 2, yearMin: ${maxYear - 3}, yearMax: ${maxYear}) { year exportValue } }`);
const lastYear = Math.max(...probe.productYear.filter((r) => r.exportValue > 0).map((r) => r.year));
const years = []; for (let y = FIRST_YEAR; y <= lastYear; y++) years.push(y);
const yi = new Map(years.map((y, i) => [y, i]));

function toArrays(rows) {
  const out = {};
  for (const r of rows) {
    const ch = chapterById.get(r.productId);
    if (!ch || !yi.has(r.year) || !r.exportValue) continue;
    (out[ch] ||= new Array(years.length).fill(0))[yi.get(r.year)] = Math.round(r.exportValue / 1e6);
  }
  return out;
}

// Welt je Kapitel
const { productYear } = await gql(`{ productYear(productClass: HS92, productLevel: 2, yearMin: ${FIRST_YEAR}, yearMax: ${lastYear}) { productId year exportValue } }`);
const world = toArrays(productYear);

// Länder
const { locationCountry } = await gql('{ locationCountry { countryId iso3Code } }');
const countries = {};
let n = 0, skipped = 0, failed = [];
for (const c of locationCountry) {
  const num = c.countryId.replace('country-', '');
  let data;
  try {
    data = await gql(`{ countryProductYear(productClass: HS92, productLevel: 2, countryId: ${num}, yearMin: ${FIRST_YEAR}, yearMax: ${lastYear}) { productId year exportValue } }`);
  } catch (e) { failed.push(c.iso3Code); continue; }
  const arr = toArrays(data.countryProductYear);
  const last = Object.values(arr).reduce((s, a) => s + a[years.length - 1], 0);
  if (last < MIN_EXPORTS_MUSD) { skipped++; continue; }
  countries[c.iso3Code] = arr; n++;
  if (n % 25 === 0) console.log(`… ${n} Länder`);
}

const out = {
  meta: {
    source: 'Growth Lab at Harvard University: International Trade Data (HS, 92), Atlas of Economic Complexity',
    doi: '10.7910/DVN/T4CHWJ', license: 'CC0 1.0', url: 'https://atlas.hks.harvard.edu',
    fetched: new Date().toISOString().slice(0, 10), unit: 'Mio. USD (laufende Preise), Warenexporte',
    years, sectors: SECTORS, chapters: Object.fromEntries(goods.map((p) => [p.code, { name: CHAPTERS[p.code], sector: sectorOf[p.code] }])),
    min_exports_musd: MIN_EXPORTS_MUSD, failed,
  },
  world, countries,
};
writeFileSync(new URL('../data/series/trade.json', import.meta.url), JSON.stringify(out));
console.log(`✓ ${n} Länder (≥ ${MIN_EXPORTS_MUSD} Mio. USD), ${skipped} kleinere ausgelassen, ${goods.length} Kapitel, ${years[0]}–${lastYear} → data/series/trade.json`);
if (failed.length) console.warn(`⚠ Nicht geladen: ${failed.join(', ')}`);
