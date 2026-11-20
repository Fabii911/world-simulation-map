// Wirkungsnetz (Causal Loop Diagram) mit Cytoscape.
import { DOMAINS, cssVar, domainColor, esc, ratingBadge, weightAt, periodNoteAt, eventYear } from './data.js';

let cy = null;
let D = null;
let year = 2026;
const hiddenDomains = new Set();

const $ = (id) => document.getElementById(id);

export function initGraph(data) {
  D = data;
  const usedDomains = [...new Set(D.model.nodes.map((n) => n.domain))];

  // Startpositionen: jedes Thema als Cluster auf einem Kreis, danach verfeinert cose das Layout.
  const R = 520;
  const pos = {};
  usedDomains.forEach((d, i) => {
    const members = D.model.nodes.filter((n) => n.domain === d);
    const a = (2 * Math.PI * i) / usedDomains.length;
    const cx = R * Math.cos(a), cy0 = R * Math.sin(a);
    const r = 45 * Math.sqrt(members.length);
    members.forEach((n, j) => {
      const b = (2 * Math.PI * j) / members.length;
      pos[n.id] = { x: cx + r * Math.cos(b), y: cy0 + r * Math.sin(b) };
    });
  });

  const elements = [];
  for (const n of D.model.nodes) {
    elements.push({ data: { id: n.id, label: n.label, domain: n.domain }, position: pos[n.id], classes: 'var' });
  }
  for (const e of D.model.edges) {
    elements.push({
      data: { id: `e:${e.key}`, source: e.from, target: e.to, key: e.key, conf: e.confidence },
      classes: e.delay ? 'delay' : '',
    });
  }

  cy = cytoscape({
    container: $('cy'),
    elements,
    wheelSensitivity: 0.25,
    minZoom: 0.2,
    maxZoom: 3,
    style: buildStyle(),
    layout: { name: 'cose', animate: false, randomize: false, nodeRepulsion: () => 60000, idealEdgeLength: () => 110, edgeElasticity: () => 60, gravity: 0.35, numIter: 1500, padding: 30, nodeOverlap: 20 },
  });

  window.__cy = cy; // für Tests und Fehlersuche
  applyYear(year);

  cy.on('tap', 'node.var', (ev) => selectNode(ev.target.id()));
  cy.on('tap', 'edge', (ev) => selectEdge(ev.target.data('key')));
  cy.on('tap', (ev) => { if (ev.target === cy) clearSelection(); });

  // Werkzeugleiste
  const loopSel = $('net-loop');
  for (const l of D.model.loops || []) {
    const o = document.createElement('option');
    o.value = l.id; o.textContent = `${l.id} – ${l.name}`;
    loopSel.appendChild(o);
  }
  loopSel.addEventListener('change', () => (loopSel.value ? selectLoop(loopSel.value) : clearSelection()));

  $('net-search').addEventListener('input', (ev) => searchNodes(ev.target.value));
  $('net-search').addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      const hit = cy.nodes('.var.search-hit').first();
      if (hit.nonempty()) selectNode(hit.id());
    }
  });
  const yr = $('net-year');
  yr.addEventListener('input', () => { year = Number(yr.value); $('net-year-out').value = year; applyYear(year); });
  $('net-reset').addEventListener('click', () => {
    $('net-search').value = ''; loopSel.value = ''; hiddenDomains.clear();
    yr.value = 2026; year = 2026; $('net-year-out').value = 2026; applyYear(year);
    renderDomainFilter(usedDomains); applyDomainFilter(); clearSelection(); cy.fit(undefined, 20);
  });

  renderDomainFilter(usedDomains);
  renderLegend();
  showIntro();
}

function buildStyle() {
  const ink = cssVar('--ink'), ink2 = cssVar('--ink-2'), surface = cssVar('--surface');
  const pos = cssVar('--pos'), neg = cssVar('--neg'), border = cssVar('--axis');
  return [
    { selector: 'node.domain', style: {
      'background-opacity': 0.04, 'background-color': (n) => domainColor(n.data('domain')),
      'border-width': 1, 'border-color': (n) => domainColor(n.data('domain')), 'border-opacity': 0.5,
      label: 'data(label)', 'text-valign': 'top', 'text-halign': 'center', 'font-size': 13, 'font-weight': 600,
      color: ink2, 'text-margin-y': -4, shape: 'round-rectangle', padding: 14,
    } },
    { selector: 'node.var', style: {
      'background-color': (n) => domainColor(n.data('domain')), width: 18, height: 18,
      'border-width': 2, 'border-color': surface,
      label: 'data(label)', 'font-size': 11, color: ink, 'text-wrap': 'wrap', 'text-max-width': 110,
      'text-valign': 'bottom', 'text-margin-y': 3, 'text-background-color': surface, 'text-background-opacity': 0.75, 'text-background-padding': 1,
    } },
    { selector: 'edge', style: {
      width: (e) => 1 + 2.5 * e.data('conf'), 'curve-style': 'bezier', 'target-arrow-shape': 'triangle', 'arrow-scale': 0.9,
      'line-color': pos, 'target-arrow-color': pos, label: 'data(sign)', 'font-size': 12, 'font-weight': 700,
      color: pos, 'text-background-color': surface, 'text-background-opacity': 1, 'text-background-padding': 1, opacity: 0.8,
    } },
    { selector: 'edge.neg', style: { 'line-color': neg, 'target-arrow-color': neg, color: neg } },
    { selector: 'edge.delay', style: { 'line-style': 'dashed', 'line-dash-pattern': [2, 4] } },
    { selector: 'edge.inactive', style: { opacity: 0.12, label: '' } },
    { selector: '.faded', style: { opacity: 0.12 } },
    { selector: 'node.domain.faded', style: { opacity: 0.35 } },
    { selector: 'node.var.hl', style: { 'border-color': ink, 'border-width': 3, width: 24, height: 24, 'font-weight': 700 } },
    { selector: 'edge.hl', style: { opacity: 1, 'z-index': 10 } },
    { selector: 'node.var.event-hit', style: { 'underlay-color': cssVar('--warning'), 'underlay-opacity': 0.55, 'underlay-padding': 7, 'underlay-shape': 'ellipse' } },
    { selector: 'node.var.search-hit', style: { 'border-color': cssVar('--accent'), 'border-width': 4 } },
    { selector: '.hidden', style: { display: 'none' } },
    { selector: ':selected', style: { 'overlay-opacity': 0 } },
    { selector: 'core', style: { 'active-bg-opacity': 0 } },
    { selector: 'node.domain:active', style: { 'overlay-opacity': 0 } },
    { selector: 'edge:active', style: { 'overlay-color': border, 'overlay-opacity': 0.15 } },
  ];
}

/** Jahr anwenden: zeitlich wechselnde Wirkungen + Ereignisse des Jahres markieren. */
export function applyYear(y) {
  if (!cy) return;
  cy.batch(() => {
    for (const e of D.model.edges) {
      const w = weightAt(e, y, D.validityByEdge);
      const el = cy.getElementById(`e:${e.key}`);
      el.data('sign', w < 0 ? '−' : '+');
      el.toggleClass('neg', w < 0);
      el.toggleClass('inactive', Math.abs(w) < 0.15);
    }
    cy.nodes('.var').removeClass('event-hit');
    for (const ev of D.timeline.events) {
      const ey = eventYear(ev);
      if (ey === y) ev.affects.forEach((n) => cy.getElementById(n).addClass('event-hit'));
    }
  });
}

export function resizeGraph() {
  if (!cy) return;
  cy.resize();
}

export function fitGraph() { if (cy) cy.fit(undefined, 20); }

function renderDomainFilter(domains) {
  const box = $('domain-filter');
  box.innerHTML = '';
  for (const d of domains) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.setAttribute('aria-pressed', String(!hiddenDomains.has(d)));
    b.innerHTML = `<span class="swatch" style="background:${domainColor(d)}"></span>${esc(DOMAINS[d] || d)}`;
    b.addEventListener('click', () => {
      if (hiddenDomains.has(d)) hiddenDomains.delete(d); else hiddenDomains.add(d);
      b.setAttribute('aria-pressed', String(!hiddenDomains.has(d)));
      applyDomainFilter();
    });
    box.appendChild(b);
  }
}

function applyDomainFilter() {
  cy.batch(() => {
    cy.nodes().forEach((n) => n.toggleClass('hidden', hiddenDomains.has(n.data('domain'))));
  });
}

function renderLegend() {
  const pos = 'var(--pos)', neg = 'var(--neg)';
  const line = (color, dash = '') => `<svg width="34" height="10" aria-hidden="true"><line x1="0" y1="5" x2="26" y2="5" stroke="${color}" stroke-width="2" ${dash}/><path d="M26,1 L34,5 L26,9 Z" fill="${color}"/></svg>`;
  $('net-legend').innerHTML = `
    <span>${line(pos)} <b>+</b> gleichgerichtet (mehr A → mehr B)</span>
    <span>${line(neg)} <b>−</b> gegengerichtet (mehr A → weniger B)</span>
    <span>${line(pos, 'stroke-dasharray="2 4"')} mit Verzögerung</span>
    <span>Strichstärke = Sicherheit der Wirkung</span>
    <span><span class="swatch" style="background:var(--warning)"></span> Ereignis im gewählten Jahr</span>`;
}

function setPanel(html) { $('net-panel').innerHTML = html; bindPanelLinks(); }

function bindPanelLinks() {
  $('net-panel').querySelectorAll('[data-node]').forEach((b) => b.addEventListener('click', () => selectNode(b.dataset.node)));
  $('net-panel').querySelectorAll('[data-edge]').forEach((b) => b.addEventListener('click', () => selectEdge(b.dataset.edge)));
  $('net-panel').querySelectorAll('[data-loop]').forEach((b) => b.addEventListener('click', () => { $('net-loop').value = b.dataset.loop; selectLoop(b.dataset.loop); }));
}

function showIntro() {
  setPanel(`<h2>Wirkungsnetz</h2>
    <p>${D.model.nodes.length} Größen, ${D.model.edges.length} Wirkungen, ${D.model.claims.length} geprüfte Aussagen.</p>
    <p>Klick auf eine <b>Größe</b> zeigt ihre Ursachen und Folgen. Klick auf einen <b>Pfeil</b> zeigt die Begründung und die Aussagen, auf denen er beruht.</p>
    <p>Mit dem Regler <b>Stand</b> siehst du, welche Wirkungen sich über die Zeit verändert haben und welche Ereignisse im Jahr stattfanden.</p>
    <h3>Rückkopplungsschleifen</h3>
    <ul>${(D.model.loops || []).map((l) => `<li><button class="linklike" data-loop="${l.id}">${l.id} ${esc(l.name)}</button></li>`).join('')}</ul>`);
}

function clearSelection() {
  cy.elements().removeClass('faded hl');
  showIntro();
}

function focus(eles) {
  cy.elements().addClass('faded').removeClass('hl');
  eles.removeClass('faded').addClass('hl');
  eles.parents().removeClass('faded');
}

function edgeLine(e, from) {
  const w = weightAt(e, year, D.validityByEdge);
  const other = from ? e.to : e.from;
  const sign = w < 0 ? '<span class="pol neg">−</span>' : '<span class="pol pos">+</span>';
  return `<li>${sign} <button class="linklike" data-node="${other}">${esc(D.nodeById.get(other).label)}</button>
    <button class="linklike muted" data-edge="${e.key}" title="Begründung">(warum?)</button></li>`;
}

export function selectNode(id) {
  const n = D.nodeById.get(id);
  if (!n || !cy) return;
  const ele = cy.getElementById(id);
  focus(ele.closedNeighborhood());
  ele.addClass('hl');
  cy.animate({ center: { eles: ele }, duration: 250 });

  const out = D.model.edges.filter((e) => e.from === id);
  const inc = D.model.edges.filter((e) => e.to === id);
  const loops = (D.model.loops || []).filter((l) => l.nodes.includes(id));
  const events = D.eventsByNode.get(id) || [];
  const inds = D.indicatorsByNode.get(id) || [];
  setPanel(`<h2>${esc(n.label)}</h2>
    <p><span class="swatch" style="background:${domainColor(n.domain)}"></span> ${esc(DOMAINS[n.domain] || n.domain)}</p>
    <p>${esc(n.description || '')}</p>
    <h3>Wirkt auf (${out.length})</h3><ul>${out.map((e) => edgeLine(e, true)).join('') || '<li class="muted">–</li>'}</ul>
    <h3>Wird beeinflusst von (${inc.length})</h3><ul>${inc.map((e) => edgeLine(e, false)).join('') || '<li class="muted">–</li>'}</ul>
    ${loops.length ? `<h3>Teil von Schleifen</h3><ul>${loops.map((l) => `<li><button class="linklike" data-loop="${l.id}">${l.id} ${esc(l.name)}</button></li>`).join('')}</ul>` : ''}
    ${events.length ? `<h3>Ereignisse</h3><ul>${events.map((ev) => `<li><span class="muted">${ev.date.slice(0, 4)}</span> ${esc(ev.title)}</li>`).join('')}</ul>` : ''}
    ${inds.length ? `<h3>Kennzahlen (folgen in Etappe 2)</h3><ul>${inds.map((i) => `<li>${esc(i.name)} <span class="muted">(${esc(i.source)})</span></li>`).join('')}</ul>` : ''}`);
}

export function selectEdge(key) {
  const e = D.model.edges.find((x) => x.key === key);
  if (!e) return;
  const ele = cy.getElementById(`e:${key}`);
  focus(ele.union(ele.connectedNodes()));
  const a = D.nodeById.get(e.from), b = D.nodeById.get(e.to);
  const w = weightAt(e, year, D.validityByEdge);
  const note = periodNoteAt(e, year, D.validityByEdge);
  const periods = D.validityByEdge.get(e.key);
  const claims = e.claims.map((c) => D.claimById.get(c)).filter(Boolean);
  setPanel(`<h2>${esc(a.label)} → ${esc(b.label)}</h2>
    <p>${w < 0 ? `Mehr <b>${esc(a.label)}</b> führt zu <b>weniger</b> ${esc(b.label)}.` : `Mehr <b>${esc(a.label)}</b> führt zu <b>mehr</b> ${esc(b.label)}.`}</p>
    <dl class="kv">
      <dt>Polarität</dt><dd>${w < 0 ? '<span class="pol neg">−</span> gegengerichtet' : '<span class="pol pos">+</span> gleichgerichtet'}</dd>
      <dt>Verzögerung</dt><dd>${e.delay ? 'ja' : 'nein'}</dd>
      <dt>Sicherheit</dt><dd>${Math.round(e.confidence * 100)} %</dd>
      <dt>Gewicht (${year})</dt><dd>${w.toFixed(2)} <span class="muted">(Skala −1 … +1, Schätzung)</span></dd>
    </dl>
    ${periods ? `<h3>Veränderung über die Zeit</h3><ul>${periods.map((p) => `<li>${p.from}–${p.to ?? 'heute'}: Gewicht ${p.weight} – ${esc(p.note)}</li>`).join('')}</ul>${note ? `<p class="muted">Aktuell gewählt: ${esc(note)}</p>` : ''}` : ''}
    <h3>Begründet durch</h3>
    <ul>${claims.map((c) => `<li><a href="#fakten/${c.id}">${c.id}</a> ${ratingBadge(c.rating)}<br>${esc(c.text)}</li>`).join('') || '<li class="muted">noch keine geprüfte Aussage</li>'}</ul>
    <p><button class="linklike" data-node="${a.id}">← ${esc(a.label)}</button> · <button class="linklike" data-node="${b.id}">${esc(b.label)} →</button></p>`);
}

export function selectLoop(id) {
  const l = (D.model.loops || []).find((x) => x.id === id);
  if (!l) return;
  const set = new Set(l.nodes);
  const nodes = cy.nodes('.var').filter((n) => set.has(n.id()));
  const edges = cy.edges().filter((e) => set.has(e.data('source')) && set.has(e.data('target')));
  focus(nodes.union(edges));
  cy.animate({ fit: { eles: nodes, padding: 80 }, duration: 300 });
  setPanel(`<h2>${l.id} – ${esc(l.name)}</h2>
    <p><b>${l.type === 'R' ? 'Verstärkende Schleife (Teufels- bzw. Engelskreis)' : 'Ausgleichende Schleife'}</b></p>
    <p>${esc(l.text)}</p>
    <h3>Beteiligte Größen</h3>
    <ul>${l.nodes.map((n) => `<li><button class="linklike" data-node="${n}">${esc(D.nodeById.get(n).label)}</button></li>`).join('')}</ul>`);
}

function searchNodes(q) {
  const s = q.trim().toLowerCase();
  cy.batch(() => {
    cy.nodes('.var').forEach((n) => {
      const hit = s.length > 1 && (n.data('label').toLowerCase().includes(s) || n.id().toLowerCase().includes(s));
      n.toggleClass('search-hit', hit);
    });
  });
}

/** Mehrere Größen hervorheben (z. B. aus der Zeitleiste). */
export function highlightNodes(ids, title) {
  const set = new Set(ids);
  const nodes = cy.nodes('.var').filter((n) => set.has(n.id()));
  focus(nodes);
  if (nodes.nonempty()) cy.animate({ fit: { eles: nodes, padding: 120 }, duration: 300 });
  setPanel(`<h2>${esc(title || 'Auswahl')}</h2><ul>${ids.map((n) => `<li><button class="linklike" data-node="${n}">${esc(D.nodeById.get(n)?.label || n)}</button></li>`).join('')}</ul>`);
}

export function setYear(y) {
  year = y; $('net-year').value = y; $('net-year-out').value = y; applyYear(y);
}

export function getCy() { return cy; }
