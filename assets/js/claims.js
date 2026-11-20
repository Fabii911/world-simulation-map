// Faktencheck: alle geprüften Aussagen mit Bewertung.
import { RATINGS, esc, ratingBadge } from './data.js';

let D = null;
const active = new Set(Object.keys(RATINGS));
const $ = (id) => document.getElementById(id);

export function initClaims(data) {
  D = data;
  const counts = {};
  for (const c of D.model.claims) counts[c.rating] = (counts[c.rating] || 0) + 1;
  const box = $('fc-filter');
  for (const [key, r] of Object.entries(RATINGS)) {
    if (!counts[key]) continue;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.setAttribute('aria-pressed', 'true'); b.dataset.rating = key;
    b.innerHTML = `${r.icon} ${esc(r.label)} <span class="muted">${counts[key]}</span>`;
    b.addEventListener('click', () => {
      if (active.has(key)) active.delete(key); else active.add(key);
      b.setAttribute('aria-pressed', String(active.has(key)));
      render();
    });
    box.appendChild(b);
  }
  $('fc-search').addEventListener('input', render);
  $('info-ratings').innerHTML = Object.keys(RATINGS).map((k) => ratingBadge(k)).join(' ');
  render();
}

function render() {
  const q = $('fc-search').value.trim().toLowerCase();
  const list = D.model.claims.filter((c) => active.has(c.rating) && (!q || `${c.id} ${c.text} ${c.note || ''}`.toLowerCase().includes(q)));
  $('fc-list').innerHTML = list.map((c) => {
    const edges = D.edgesByClaim.get(c.id) || [];
    const edgeTxt = edges.map((e) => `<a href="#netz/${e.from}">${esc(D.nodeById.get(e.from).label)}</a> → ${esc(D.nodeById.get(e.to).label)}`).join(' · ');
    return `<article class="claim" id="claim-${c.id}">
      <div class="cid">${c.id}</div>
      <div class="ctext">${esc(c.text)}</div>
      <div>${ratingBadge(c.rating)}</div>
      <div class="cmeta">${c.note ? `${esc(c.note)}<br>` : ''}Ausführlich: <code>docs/${esc(c.doc)}</code>${edges.length ? `<br>Stützt im Netz: ${edgeTxt}` : ''}</div>
    </article>`;
  }).join('') || '<p class="muted">Keine Aussage passt zum Filter.</p>';
}

export function focusClaim(id) {
  const el = document.getElementById(`claim-${id}`);
  if (!el) return;
  el.scrollIntoView({ block: 'center' });
  el.style.outline = '2px solid var(--accent)';
  setTimeout(() => { el.style.outline = ''; }, 2000);
}
