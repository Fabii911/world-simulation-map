// Kettenansicht: Ursache-Wirkungs-Ketten Schritt für Schritt, mit Literatur- und Datenbeleg je Schritt.
import { esc, domainColor, weightAt } from './data.js';
import { loadEvidence, assess, evidenceBadge, literatureBadge, renderEvidence, setValidity } from './evidence.js';

let D = null, chains = [], current = null, selectedStep = 0;
const $ = (id) => document.getElementById(id);

export async function initChains(data) {
  D = data;
  const [cj] = await Promise.all([fetch('data/chains.json').then((r) => r.json()), loadEvidence()]);
  setValidity(D.validityByEdge);
  chains = cj.chains.map((c) => ({ ...c, steps: c.steps.map((s) => ({ ...s, edge: edgeOf(s.from, s.to) })) }));

  $('ch-list').innerHTML = chains.map((c) => `<button type="button" class="chip" data-chain="${c.id}" aria-pressed="false">${esc(c.title)}</button>`).join('');
  $('ch-list').querySelectorAll('[data-chain]').forEach((b) => b.addEventListener('click', () => showChain(b.dataset.chain)));

  const opts = [...D.model.nodes].sort((a, b) => a.label.localeCompare(b.label, 'de')).map((n) => `<option value="${n.id}">${esc(n.label)}</option>`).join('');
  $('ch-from').innerHTML = opts; $('ch-to').innerHTML = opts;
  $('ch-from').value = 'CN_SOC'; $('ch-to').value = 'NAT';
  $('ch-find').addEventListener('click', () => findPath($('ch-from').value, $('ch-to').value));
  showChain(chains[0].id);
}

const edgeOf = (a, b) => D.model.edges.find((e) => e.from === a && e.to === b);
const sign = (e) => Math.sign(weightAt(e, 2026, D.validityByEdge)) || 1;

export function showChain(id) {
  const c = chains.find((x) => x.id === id);
  if (!c) return;
  $('ch-list').querySelectorAll('[data-chain]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.chain === id)));
  current = c;
  const firstWithData = c.steps.findIndex((s) => assess(s.edge).status !== 'none');
  selectedStep = firstWithData >= 0 ? firstWithData : 0;
  render();
}

function render() {
  const c = current;
  const linear = c.steps.every((s, i) => i === 0 || s.from === c.steps[i - 1].to);
  const net = c.steps.reduce((p, s) => p * sign(s.edge), 1);
  const weakest = c.steps.reduce((m, s) => (s.edge.confidence < m.edge.confidence ? s : m), c.steps[0]);
  const as = c.steps.map((s) => assess(s.edge));
  const cnt = (st) => as.filter((a) => a.status === st).length;
  const lit = c.steps.filter((s) => s.edge.claims.length).length;
  const first = D.nodeById.get(c.steps[0].from), last = D.nodeById.get(c.steps.at(-1).to);

  $('ch-main').innerHTML = `<h2>${esc(c.title)}</h2>
    ${c.question ? `<p class="muted">${esc(c.question)}</p>` : ''}
    <div class="ch-summary">
      ${linear ? `<div><span class="muted">Gesamtrichtung</span><br><b>Mehr ${esc(first.label)} → ${net < 0 ? 'weniger' : 'mehr'} ${esc(last.label)}</b></div>` : '<div><span class="muted">Gesamtrichtung</span><br><b>verzweigte Kette</b></div>'}
      <div><span class="muted">Schwächstes Glied</span><br><b>${esc(D.nodeById.get(weakest.from).label)} → ${esc(D.nodeById.get(weakest.to).label)}</b> (${Math.round(weakest.edge.confidence * 100)} %)</div>
      <div><span class="muted">Belege</span><br><b>${lit}/${c.steps.length}</b> mit Literatur · <b>${cnt('fits')}</b> Daten passen · <b>${cnt('contradicts')}</b> widersprechen · <b>${cnt('unclear') + cnt('few')}</b> unklar · <b>${cnt('none')}</b> ohne Daten</div>
    </div>
    <ol class="ch-steps">
      ${c.steps.map((s, i) => {
        const a = as[i], from = D.nodeById.get(s.from), to = D.nodeById.get(s.to), sg = sign(s.edge);
        const branch = i > 0 && s.from !== c.steps[i - 1].to;
        return `<li class="ch-step${i === selectedStep ? ' sel' : ''}" data-step="${i}">
          ${i === 0 || branch ? `${branch ? '<div class="ch-branch">zugleich:</div>' : ''}${nodePill(from)}` : ''}
          <button type="button" class="ch-link" data-step="${i}" aria-label="Schritt ${i + 1}: Belege anzeigen">
            <span class="ch-arrow ${sg < 0 ? 'neg' : 'pos'}">${sg < 0 ? '−' : '+'}</span>
            <span class="ch-text">${esc(s.text)}
              <span class="ch-badges">${literatureBadge(s.edge, D.claimById)} ${evidenceBadge(a)}${s.edge.delay ? ' <span class="ev-badge ev-none">⏱ mit Verzögerung</span>' : ''}</span>
            </span>
          </button>
          ${nodePill(to)}
        </li>`;
      }).join('')}
    </ol>
    <p class="muted">+ heißt: mehr der oberen Größe führt zu mehr der unteren. − heißt: zu weniger. Die Gesamtrichtung ergibt sich aus dem Produkt der Vorzeichen.
      <a href="#netz/${c.steps[0].from}">Im Wirkungsnetz zeigen</a></p>`;
  $('ch-main').querySelectorAll('.ch-link').forEach((b) => b.addEventListener('click', () => { selectedStep = Number(b.dataset.step); render(); }));
  renderStep();
}

function nodePill(n) {
  return `<div class="ch-node"><span class="swatch" style="background:${domainColor(n.domain)}"></span><b>${esc(n.label)}</b><span class="muted"> · ${esc(n.description)}</span></div>`;
}

function renderStep() {
  const s = current.steps[selectedStep];
  const from = D.nodeById.get(s.from), to = D.nodeById.get(s.to);
  const el = $('ch-panel');
  el.innerHTML = `<h2>Schritt ${selectedStep + 1}: ${esc(from.label)} → ${esc(to.label)}</h2><div id="ch-evidence"></div>`;
  renderEvidence(document.getElementById('ch-evidence'), s.edge, D);
}

/** Kürzeste Pfade zwischen zwei Größen (bis 6 Schritte), sortiert nach Produkt der Sicherheiten. */
export function findPaths(fromId, toId, maxLen = 6, limit = 3) {
  const out = new Map();
  for (const e of D.model.edges) { if (!out.has(e.from)) out.set(e.from, []); out.get(e.from).push(e); }
  const found = [];
  let frontier = [[fromId]];
  for (let depth = 0; depth < maxLen && !found.length; depth++) {
    const next = [];
    for (const path of frontier) {
      for (const e of out.get(path.at(-1)) || []) {
        if (path.includes(e.to)) continue;
        const p = [...path, e.to];
        if (e.to === toId) found.push(p); else next.push(p);
      }
    }
    frontier = next.length > 20000 ? next.slice(0, 20000) : next;
  }
  const score = (p) => p.slice(1).reduce((s, n, i) => s * edgeOf(p[i], n).confidence, 1);
  return found.sort((a, b) => score(b) - score(a)).slice(0, limit).map((p) => ({ path: p, score: score(p) }));
}

function findPath(a, b) {
  $('ch-list').querySelectorAll('[data-chain]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
  if (a === b) { $('ch-main').innerHTML = '<p class="muted">Start und Ziel sind gleich.</p>'; return; }
  const paths = findPaths(a, b);
  if (!paths.length) {
    $('ch-main').innerHTML = `<h2>Kein Pfad gefunden</h2><p>Im Wirkungsnetz führt keine Kette (bis 6 Schritte) von <b>${esc(D.nodeById.get(a).label)}</b> zu <b>${esc(D.nodeById.get(b).label)}</b>.</p>`;
    $('ch-panel').innerHTML = '';
    return;
  }
  const make = (p, k) => ({
    id: `pfad-${k}`, title: `Pfad ${k + 1}: ${D.nodeById.get(a).label} → ${D.nodeById.get(b).label}`,
    question: `${p.path.length - 1} Schritte · Produkt der Sicherheiten ${Math.round(p.score * 100)} %${paths.length > 1 ? ` · ${paths.length} kürzeste Pfade gefunden` : ''}`,
    steps: p.path.slice(1).map((n, i) => {
      const e = edgeOf(p.path[i], n);
      const claim = e.claims.map((c) => D.claimById.get(c)).find(Boolean);
      return { from: p.path[i], to: n, edge: e, text: claim ? claim.text : `Mehr ${D.nodeById.get(p.path[i]).label} → ${sign(e) < 0 ? 'weniger' : 'mehr'} ${D.nodeById.get(n).label}` };
    }),
  });
  const alts = paths.map(make);
  current = alts[0];
  selectedStep = 0;
  render();
  if (alts.length > 1) {
    const nav = document.createElement('div');
    nav.className = 'chips ch-alts';
    nav.innerHTML = alts.map((x, i) => `<button type="button" class="chip" aria-pressed="${i === 0}" data-alt="${i}">${esc(x.title.split(':')[0])}</button>`).join('');
    $('ch-main').prepend(nav);
    nav.querySelectorAll('[data-alt]').forEach((btn) => btn.addEventListener('click', () => {
      current = alts[Number(btn.dataset.alt)]; selectedStep = 0; render();
      $('ch-main').prepend(nav);
      nav.querySelectorAll('[data-alt]').forEach((x) => x.setAttribute('aria-pressed', String(x === btn)));
    }));
  }
}
