// Zeitreihen (Weltbank) laden und auswerten: Werte, Skalen, Länder-Typ.

let cache = null;

export async function loadSeries() {
  if (cache) return cache;
  const get = (p) => fetch(p).then((r) => { if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`); return r.json(); });
  const [wb, owid, donut, topo] = await Promise.all([
    get('data/series/worldbank.json'),
    get('data/series/owid.json').catch(() => null),
    get('data/series/doughnut.json').catch(() => null),
    get('assets/vendor/countries-110m.json'),
  ]);
  // Quellen zusammenführen: gleiche Struktur values[kennzahl][land][jahr]
  for (const id of Object.keys(wb.meta.indicators)) Object.assign(wb.meta.indicators[id], { source: 'Weltbank', fetched: wb.meta.fetched });
  if (owid) {
    Object.assign(wb.values, owid.values);
    for (const [id, m] of Object.entries(owid.meta.indicators)) wb.meta.indicators[id] = { ...m, source: 'Our World in Data', fetched: owid.meta.fetched };
  }
  if (donut) addDonutCounts(wb, donut);
  const numToIso = new Map();
  for (const [iso, c] of Object.entries(wb.countries)) if (c.num) numToIso.set(String(c.num).padStart(3, '0'), iso);
  const features = topojson.feature(topo, topo.objects.countries).features;
  for (const f of features) {
    f.properties.iso = f.id ? numToIso.get(String(f.id).padStart(3, '0')) : (f.properties.name === 'Kosovo' ? 'XKX' : null);
  }
  const years = [];
  for (let y = wb.meta.years[0]; y <= wb.meta.years[1]; y++) years.push(y);
  cache = { wb, features, years, donut };
  return cache;
}

export function val(S, ind, iso, year) {
  return S.wb.values[ind]?.[iso]?.[year] ?? null;
}

/** Letztes verfügbares Jahr für eine Kennzahl (über alle Länder). */
export function lastYear(S, ind) {
  return S.wb.meta.indicators[ind]?.last_year || S.wb.meta.years[1];
}

/** Jüngstes Jahr mit guter Abdeckung (≥ 85 % der besten Jahresabdeckung) für alle angegebenen Kennzahlen. */
export function goodYear(S, inds) {
  let best = S.wb.meta.years[1];
  for (const ind of inds) {
    const counts = {};
    for (const byYear of Object.values(S.wb.values[ind] || {})) for (const y of Object.keys(byYear)) counts[y] = (counts[y] || 0) + 1;
    const max = Math.max(0, ...Object.values(counts));
    const ok = Object.entries(counts).filter(([, n]) => n >= 0.85 * max).map(([y]) => Number(y));
    if (ok.length) best = Math.min(best, Math.max(...ok));
  }
  return best;
}

/** Robuster Wertebereich (5.–95. Perzentil über alle Jahre), damit Farben über die Zeit vergleichbar bleiben. */
export function robustExtent(S, ind) {
  const all = [];
  for (const byYear of Object.values(S.wb.values[ind] || {})) for (const v of Object.values(byYear)) all.push(v);
  all.sort((a, b) => a - b);
  if (!all.length) return [0, 1];
  return [d3.quantileSorted(all, 0.05), d3.quantileSorted(all, 0.95)];
}

export function series(S, ind, iso) {
  const byYear = S.wb.values[ind]?.[iso] || {};
  return Object.entries(byYear).map(([y, v]) => ({ year: Number(y), value: v })).sort((a, b) => a.year - b.year);
}

/** Wert im Jahr oder – falls fehlend – der jüngste Wert davor (max. 3 Jahre), mit Angabe des Jahres. */
export function valNear(S, ind, iso, year, maxBack = 3) {
  for (let y = year; y >= year - maxBack; y--) {
    const v = val(S, ind, iso, y);
    if (v !== null) return { value: v, year: y };
  }
  return null;
}

/**
 * Länder-Typ nach der Heuristik aus docs/05_kennzahlen.md.
 * Schwellen sind bewusst einfach und offen dokumentiert – eine Einordnung, kein Urteil.
 */
export const TYPES = {
  demand: { label: 'Nachfrageschwäche wird exportiert', short: 'Nachfrageschwäche', text: 'Überschuss bei niedrigem privaten Konsum: Die Bevölkerung kauft deutlich weniger, als das Land produziert (Muster China).' },
  resource: { label: 'Rohstoff-Überschuss', short: 'Rohstoff', text: 'Überschuss vor allem aus Rohstoffexporten (hohe Rohstoffrenten). Entscheidend ist, ob die Einnahmen in einen Zukunftsfonds fließen (Norwegen) oder bei einer Elite landen.' },
  invest: { label: 'Spar- bzw. Investitionsüberhang', short: 'Investitionsschwäche', text: 'Überschuss trotz mittlerem Konsum: Im Inland wird zu wenig investiert, Ersparnis fließt ins Ausland (Muster Deutschland).' },
  surplus: { label: 'Überschuss (sonstiger)', short: 'Überschuss', text: 'Überschuss ohne eindeutiges Muster in den verfügbaren Kennzahlen.' },
  deficit: { label: 'Defizit mit hohem Konsum', short: 'Konsum auf Pump', text: 'Defizit bei hohem Konsum: Das Land kauft mehr, als es verkauft, und finanziert die Differenz mit Kapitalzuflüssen bzw. Schulden (Muster USA).' },
  deficit_other: { label: 'Defizit (sonstiger)', short: 'Defizit', text: 'Defizit ohne hohen Konsum, z. B. durch hohe Investitionen, Importabhängigkeit oder Krisen.' },
  balanced: { label: 'Annähernd ausgeglichen', short: 'ausgeglichen', text: 'Leistungsbilanz innerhalb von ±2 % des BIP.' },
};

export function classify(S, iso, year) {
  const ca = valNear(S, 'ca_gdp', iso, year);
  if (!ca) return null;
  const cons = valNear(S, 'hh_cons', iso, year)?.value ?? null;
  const rents = valNear(S, 'resource_rents', iso, year)?.value ?? null;
  const gcf = valNear(S, 'gcf_gdp', iso, year)?.value ?? null;
  let type;
  if (ca.value > 2) {
    if (rents !== null && rents >= 10) type = 'resource';
    else if (cons !== null && cons < 45) type = 'demand';
    else if (gcf !== null && gcf < 23) type = 'invest';
    else type = 'surplus';
  } else if (ca.value < -2) {
    type = cons !== null && cons >= 60 ? 'deficit' : 'deficit_other';
  } else type = 'balanced';
  return { type, ca: ca.value, cons, rents, gcf, year: ca.year };
}

export function fmt(v, unit = '') {
  if (v === null || v === undefined || Number.isNaN(v)) return '–';
  const s = Math.abs(v) >= 100 ? d3.format(',.0f')(v) : d3.format(',.1f')(v);
  return `${s.replace(/,/g, '.').replace(/\.(\d)$/, ',$1')}${unit ? ` ${unit}` : ''}`;
}

/** Abgeleitete Kennzahlen aus dem Donut-Datensatz: Anzahl erreichter sozialer Ziele / überschrittener Grenzen. */
function addDonutCounts(wb, donut) {
  const social = {}, eco = {};
  let last = 0;
  for (const [iso, byYear] of Object.entries(donut.social)) {
    for (const [y, vals] of Object.entries(byYear)) {
      const known = vals.filter((v) => v !== null);
      if (known.length >= 9) (social[iso] ||= {})[y] = known.filter((v) => v >= 1).length;
      last = Math.max(last, Number(y));
    }
  }
  for (const [iso, byYear] of Object.entries(donut.bio)) {
    for (const [y, vals] of Object.entries(byYear)) {
      const known = vals.filter((v) => v !== null);
      if (known.length >= 5) (eco[iso] ||= {})[y] = known.filter((v) => v > 1).length;
    }
  }
  wb.values.donut_social = social;
  wb.values.donut_eco = eco;
  wb.meta.indicators.donut_social = { name: 'Donut: erreichte soziale Ziele', unit: 'Anzahl', last_year: last, source: 'Universität Leeds (Fanning u. a. 2022)' };
  wb.meta.indicators.donut_eco = { name: 'Donut: überschrittene Grenzen', unit: 'Anzahl', last_year: last, source: 'Universität Leeds (Fanning u. a. 2022)' };
}
