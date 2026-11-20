// Einstieg: Daten laden, Ansichten initialisieren, Hash-Navigation.
import { loadData, eventYear } from './data.js';
import { initGraph, resizeGraph, fitGraph, selectNode, selectLoop, highlightNodes, setYear } from './graph.js';
import { initTimeline } from './timeline.js';
import { initClaims, focusClaim } from './claims.js';
import { initWorldmap, selectCountry } from './worldmap.js';
import { initDiagnose, focusCountry } from './diagnose.js';
import { initSimulation } from './simulation.js';
import { initPressure, focusPressureCountry } from './pressure.js';
import { initChains, showChain } from './chains.js';
import { initPerspective, setPerspective } from './perspective.js';

const VIEWS = ['karte', 'diagnose', 'druck', 'sicht', 'netz', 'ketten', 'sim', 'zeit', 'fakten', 'info'];
let data = null;
let graphReady = false;
let mapReady = null;
let diagReady = null;
let simReady = false;
let pressureReady = null;
let chainsReady = null;
let perspectiveReady = null;

function parseHash() {
  const [view, arg] = location.hash.replace(/^#/, '').split('/');
  return { view: VIEWS.includes(view) ? view : 'karte', arg: arg ? decodeURIComponent(arg) : null };
}

function show(view) {
  for (const v of VIEWS) document.getElementById(`view-${v}`).hidden = v !== view;
  document.querySelectorAll('.tabs a').forEach((a) => a.setAttribute('aria-selected', String(a.dataset.view === view)));
}

function seriesError(err, id) {
  document.getElementById(id).innerHTML = `<p style="padding:16px">Zeitreihen konnten nicht geladen werden (${err.message}).</p>`;
}

async function route() {
  const { view, arg } = parseHash();
  show(view);
  if (view === 'karte') {
    mapReady ||= initWorldmap(data, (n) => { location.hash = `#netz/${n}`; }).catch((e) => seriesError(e, 'worldmap'));
    await mapReady;
    if (arg) selectCountry(arg);
  }
  if (view === 'diagnose') {
    diagReady ||= initDiagnose().catch((e) => seriesError(e, 'diagnose'));
    await diagReady;
    if (arg) focusCountry(arg);
  }
  if (view === 'druck') {
    pressureReady ||= initPressure().catch((e) => seriesError(e, 'pr-matrix'));
    await pressureReady;
    if (arg) focusPressureCountry(arg);
  }
  if (view === 'sicht') {
    perspectiveReady ||= initPerspective(data).catch((e) => seriesError(e, 'pv-profile'));
    await perspectiveReady;
    if (arg) setPerspective(arg);
  }
  if (view === 'ketten') {
    chainsReady ||= initChains(data).catch((e) => { document.getElementById('ch-main').innerHTML = `<p>Ketten konnten nicht geladen werden (${e.message}).</p>`; });
    await chainsReady;
    if (arg) showChain(arg);
  }
  if (view === 'netz') {
    if (!graphReady) { initGraph(data); graphReady = true; }
    resizeGraph();
    if (arg?.startsWith('loop:')) selectLoop(arg.slice(5));
    else if (arg) selectNode(arg);
  }
  if (view === 'sim' && !simReady) { initSimulation(data); simReady = true; }
  if (view === 'fakten' && arg) focusClaim(arg);
}

async function renderSources() {
  try {
    const [src, wb, ow] = await Promise.all(['data/sources.json', 'data/series/worldbank.json', 'data/series/owid.json']
      .map((p) => fetch(p).then((r) => (r.ok ? r.json() : null)).catch(() => null)));
    if (!src) return;
    const fetched = { worldbank: wb?.meta?.fetched, owid: ow?.meta?.fetched };
    const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const link = (u) => (/^https?:/.test(u) ? `<a href="${esc(u)}" rel="noopener">${esc(u.replace(/^https?:\/\//, ''))}</a>` : `<code>${esc(u)}</code>`);
    document.getElementById('info-sources').innerHTML = `<table><thead><tr><th>Quelle</th><th>Verwendung</th><th>Lizenz</th><th>Aktualisierung</th></tr></thead><tbody>
      ${src.sources.map((s) => `<tr><td><b>${esc(s.name)}</b><br>${esc(s.publisher)}<br>${link(s.url)}</td><td>${esc(s.used_for)}</td><td>${esc(s.license)}</td>
        <td>${esc(s.update)}${fetched[s.id] ? `<br><span class="muted">zuletzt abgerufen: ${esc(fetched[s.id])}</span>` : ''}</td></tr>`).join('')}
      </tbody></table>`;
  } catch { /* Quellenliste ist optional */ }
}

async function main() {
  try {
    data = await loadData();
  } catch (err) {
    document.querySelector('main').innerHTML = `<p style="padding:20px">Daten konnten nicht geladen werden (${err.message}). Die Seite muss über einen Webserver geöffnet werden, z. B. <code>npm run serve</code>.</p>`;
    return;
  }
  initTimeline(data, (ev) => {
    location.hash = '#netz';
    // nach dem Umschalten (route) Jahr setzen und Größen hervorheben
    setTimeout(() => { setYear(eventYear(ev)); highlightNodes(ev.affects, `${ev.date.slice(0, 4)}: ${ev.title}`); }, 50);
  });
  initClaims(data);
  renderSources();
  window.addEventListener('hashchange', route);
  await route();
  if (graphReady) setTimeout(fitGraph, 0);
  document.body.dataset.ready = 'true';
}

main();
