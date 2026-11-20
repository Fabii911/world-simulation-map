// Laden der Daten und gemeinsame Nachschlagetabellen.

export const DOMAINS = {
  europa: 'Europa / Deutschland',
  russland: 'Russland',
  oekologie: 'Ökologie',
  china: 'China',
  marktmacht: 'Marktmacht',
  politik: 'Politik',
  technologie: 'Technologie',
  querschnitt: 'Querschnitt',
  historisch: 'Historisch',
  sicherheit: 'Sicherheit',
};

export const RATINGS = {
  supported: { icon: '✅', label: 'belegt' },
  partial: { icon: '🟡', label: 'teilweise' },
  contested: { icon: '🟠', label: 'umstritten / spekulativ' },
  false: { icon: '❌', label: 'falsch / vertauscht' },
  unverifiable: { icon: '❓', label: 'nicht prüfbar' },
};

export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function domainColor(domain) {
  return cssVar(`--d-${domain}`) || cssVar('--muted');
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function ratingBadge(rating) {
  const r = RATINGS[rating] || RATINGS.unverifiable;
  return `<span class="rating r-${esc(rating)}"><span class="dot" aria-hidden="true"></span>${r.icon} ${esc(r.label)}</span>`;
}

async function getJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

export async function loadData() {
  const [model, timeline, indicators] = await Promise.all([
    getJSON('data/model.json'),
    getJSON('data/timeline.json'),
    getJSON('data/indicators.json'),
  ]);

  const nodeById = new Map(model.nodes.map((n) => [n.id, n]));
  const claimById = new Map(model.claims.map((c) => [c.id, c]));
  const edgeKey = (e) => `${e.from}>${e.to}`;
  model.edges.forEach((e) => { e.key = edgeKey(e); });

  const edgesByClaim = new Map();
  for (const e of model.edges) {
    for (const c of e.claims) {
      if (!edgesByClaim.has(c)) edgesByClaim.set(c, []);
      edgesByClaim.get(c).push(e);
    }
  }
  const eventsByNode = new Map();
  for (const ev of timeline.events) {
    for (const n of ev.affects) {
      if (!eventsByNode.has(n)) eventsByNode.set(n, []);
      eventsByNode.get(n).push(ev);
    }
  }
  const indicatorsByNode = new Map();
  for (const ind of indicators.indicators) {
    for (const n of ind.model_nodes) {
      if (!indicatorsByNode.has(n)) indicatorsByNode.set(n, []);
      indicatorsByNode.get(n).push(ind);
    }
  }
  const validityByEdge = new Map((timeline.edge_validity || []).map((v) => [`${v.from}>${v.to}`, v.valid]));

  return { model, timeline, indicators, nodeById, claimById, edgesByClaim, eventsByNode, indicatorsByNode, validityByEdge };
}

/** Gewicht einer Kante in einem bestimmten Jahr (zeitlich wechselnde Wirkungen). */
export function weightAt(edge, year, validityByEdge) {
  const periods = validityByEdge.get(edge.key);
  if (!periods) return edge.weight;
  for (const p of periods) {
    const to = p.to ?? Infinity;
    if (year >= p.from && year < to) return p.weight;
  }
  return 0; // vor Beginn der ersten Periode: Wirkung existiert noch nicht
}

export function periodNoteAt(edge, year, validityByEdge) {
  const periods = validityByEdge.get(edge.key);
  if (!periods) return null;
  return periods.find((p) => year >= p.from && year < (p.to ?? Infinity))?.note ?? null;
}

export function eventYear(ev) {
  return Number(ev.date.slice(0, 4));
}
