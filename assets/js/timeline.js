// Zeitleiste mit d3: Ereignisse in Bahnen je Thema, zoom- und verschiebbar.
import { DOMAINS, domainColor, esc } from './data.js';

let D = null;
let onShowInGraph = null;
let svg, gRoot, x0, x, zoom, width = 800, height = 400, selectedId = null;
const M = { top: 16, right: 20, bottom: 28, left: 160 };
const LANE_ORDER = ['historisch', 'sicherheit', 'russland', 'europa', 'china', 'politik', 'querschnitt', 'technologie', 'marktmacht', 'oekologie'];
const parseDate = d3.timeParse('%Y-%m-%d');
const fmtDate = d3.timeFormat('%d.%m.%Y');

const $ = (id) => document.getElementById(id);

export function initTimeline(data, showInGraph) {
  D = data;
  onShowInGraph = showInGraph;
  D.timeline.events.forEach((ev) => { ev._d = parseDate(ev.date); });
  const lanes = LANE_ORDER.filter((l) => D.timeline.events.some((e) => e.domain === l));
  const box = $('timeline');
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip'; tooltip.hidden = true; box.appendChild(tooltip);

  svg = d3.select(box).append('svg').attr('role', 'img').attr('aria-label', 'Zeitleiste der Ereignisse');
  const clipId = 'tl-clip';
  svg.append('defs').append('clipPath').attr('id', clipId).append('rect');
  gRoot = svg.append('g');
  const gGrid = gRoot.append('g').attr('class', 'tl-grid');
  const gAxis = gRoot.append('g').attr('class', 'tl-axis');
  const gLanes = gRoot.append('g');
  const gEvents = gRoot.append('g').attr('clip-path', `url(#${clipId})`);

  x0 = d3.scaleTime().domain([new Date(1900, 0, 1), new Date(2027, 0, 1)]);
  x = x0.copy();
  const y = d3.scaleBand().domain(lanes).paddingInner(0.1);

  function layout() {
    width = box.clientWidth || 800;
    height = Math.max(box.clientHeight || 400, 60 + lanes.length * 42);
    svg.attr('viewBox', `0 0 ${width} ${height}`);
    x0.range([M.left, width - M.right]);
    x.range([M.left, width - M.right]);
    y.range([M.top, height - M.bottom]);
    svg.select(`#${clipId} rect`).attr('x', M.left - 8).attr('y', 0).attr('width', width - M.left - M.right + 16).attr('height', height);
    zoom.translateExtent([[M.left, 0], [width - M.right, height]]).extent([[M.left, 0], [width - M.right, height]]);
    gLanes.selectAll('text').data(lanes).join('text')
      .attr('class', 'tl-lane-label').attr('x', M.left - 12).attr('y', (d) => y(d) + y.bandwidth() / 2)
      .attr('text-anchor', 'end').attr('dominant-baseline', 'middle').text((d) => DOMAINS[d] || d);
    gLanes.selectAll('line').data(lanes).join('line')
      .attr('x1', M.left).attr('x2', width - M.right)
      .attr('y1', (d) => y(d) + y.bandwidth() / 2).attr('y2', (d) => y(d) + y.bandwidth() / 2)
      .attr('stroke', 'var(--grid)');
    render();
  }

  function render() {
    gAxis.attr('transform', `translate(0,${height - M.bottom})`).call(d3.axisBottom(x).ticks(Math.max(4, Math.floor(width / 90))).tickSizeOuter(0));
    gGrid.selectAll('line').data(x.ticks(Math.max(4, Math.floor(width / 90)))).join('line')
      .attr('x1', (d) => x(d)).attr('x2', (d) => x(d)).attr('y1', M.top).attr('y2', height - M.bottom);

    const evs = gEvents.selectAll('g.tl-ev').data(D.timeline.events, (d) => d.id).join((enter) => {
      const g = enter.append('g').attr('class', 'tl-ev').attr('tabindex', 0).attr('role', 'button')
        .attr('aria-label', (d) => `${d.date}: ${d.title}`);
      g.append('circle').attr('r', 7).attr('fill', (d) => domainColor(d.domain));
      g.append('text').attr('y', -11).attr('text-anchor', 'middle');
      g.on('mouseenter', (ev, d) => {
        tooltip.hidden = false;
        tooltip.innerHTML = `<b>${fmtDate(d._d)}</b><br>${esc(d.title)}`;
      }).on('mousemove', (ev) => {
        const r = box.getBoundingClientRect();
        let left = ev.clientX - r.left + 12;
        if (left > r.width - 290) left = ev.clientX - r.left - 290;
        tooltip.style.left = `${left}px`; tooltip.style.top = `${ev.clientY - r.top + 12}px`;
      }).on('mouseleave', () => { tooltip.hidden = true; })
        .on('click', (ev, d) => selectEvent(d.id))
        .on('keydown', (ev, d) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); selectEvent(d.id); } });
      return g;
    });
    evs.attr('transform', (d) => `translate(${x(d._d)},${y(d.domain) + y.bandwidth() / 2})`)
      .classed('sel', (d) => d.id === selectedId);

    // Beschriftungen nur, wenn genug Platz ist (keine Überlappung je Bahn)
    const lastRight = new Map();
    const sorted = [...D.timeline.events].sort((a, b) => a._d - b._d);
    const show = new Set();
    for (const d of sorted) {
      const px = x(d._d);
      if (px < M.left || px > width - M.right) continue;
      const label = shortTitle(d.title);
      const w = label.length * 5.6;
      const prev = lastRight.get(d.domain) ?? -Infinity;
      if (px - w / 2 > prev + 6) { show.add(d.id); lastRight.set(d.domain, px + w / 2); }
    }
    evs.select('text').text((d) => (show.has(d.id) ? shortTitle(d.title) : ''));
  }

  zoom = d3.zoom().scaleExtent([1, 60]).on('zoom', (ev) => {
    x = ev.transform.rescaleX(x0);
    render();
  });
  svg.call(zoom).on('dblclick.zoom', null);

  $('tl-reset').addEventListener('click', () => svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity));
  $('tl-recent').addEventListener('click', () => zoomTo(new Date(1990, 0, 1), new Date(2027, 0, 1)));

  new ResizeObserver(() => layout()).observe(box);
  layout();
  renderTable();
  showIntro();

  function zoomTo(a, b) {
    const k = (x0.range()[1] - x0.range()[0]) / (x0(b) - x0(a));
    const t = d3.zoomIdentity.translate(M.left - k * x0(a), 0).scale(k);
    svg.transition().duration(400).call(zoom.transform, t);
  }
  initTimeline.zoomTo = zoomTo;
  initTimeline.render = render;
}

function shortTitle(t) {
  const s = t.split(/ [–(:]/)[0];
  return s.length > 38 ? `${s.slice(0, 36)}…` : s;
}

function showIntro() {
  $('tl-panel').innerHTML = `<h2>Zeitleiste</h2>
    <p>${D.timeline.events.length} Ereignisse von ${D.timeline.events[0].date.slice(0, 4)} bis heute, jeweils verknüpft mit den Größen im Wirkungsnetz, die sie verändert haben.</p>
    <p>Die historischen Ereignisse (1906–1987) dienen als Vergleichspunkte: Wettrüsten, Verflechtung, Zollspiralen, Abrüstung.</p>
    <p class="muted">Alle Daten sind als „zu belegen“ markiert, bis sie gegen Primärquellen geprüft sind.</p>`;
}

export function selectEvent(id) {
  const ev = D.timeline.events.find((e) => e.id === id);
  if (!ev) return;
  selectedId = id;
  if (initTimeline.render) initTimeline.render();
  const panel = $('tl-panel');
  panel.innerHTML = `<h2>${esc(ev.title)}</h2>
    <p><b>${fmtDate(ev._d)}</b> · <span class="swatch" style="background:${domainColor(ev.domain)}"></span> ${esc(DOMAINS[ev.domain] || ev.domain)}</p>
    <p>${esc(ev.note)}</p>
    <h3>Betroffene Größen</h3>
    <ul>${ev.affects.map((n) => `<li>${esc(D.nodeById.get(n)?.label || n)}</li>`).join('') || '<li class="muted">keine direkte Verknüpfung (Vergleichspunkt)</li>'}</ul>
    ${ev.affects.length ? '<p><button type="button" id="tl-to-graph">Im Wirkungsnetz zeigen</button></p>' : ''}
    <p class="muted">Status: ${esc(ev.status)}</p>`;
  const btn = document.getElementById('tl-to-graph');
  if (btn) btn.addEventListener('click', () => onShowInGraph(ev));
}

function renderTable() {
  const rows = [...D.timeline.events].sort((a, b) => a._d - b._d).map((ev) => `<tr>
      <td class="num">${fmtDate(ev._d)}</td><td>${esc(DOMAINS[ev.domain] || ev.domain)}</td><td>${esc(ev.title)}</td>
      <td>${ev.affects.map((n) => esc(D.nodeById.get(n)?.label || n)).join(', ')}</td></tr>`).join('');
  $('tl-table').innerHTML = `<table><thead><tr><th>Datum</th><th>Thema</th><th>Ereignis</th><th>Betroffene Größen</th></tr></thead><tbody>${rows}</tbody></table>`;
}
