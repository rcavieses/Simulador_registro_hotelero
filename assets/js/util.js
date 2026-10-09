/* Utilidades generales: fechas, formato, DOM, modales y avisos */
'use strict';

const pad = n => String(n).padStart(2, '0');

const D = {
  parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); },
  iso(d) { return d.toISOString().slice(0, 10); },
  add(s, n) { const d = D.parse(s); d.setUTCDate(d.getUTCDate() + n); return D.iso(d); },
  diff(a, b) { return Math.round((D.parse(b) - D.parse(a)) / 86400000); },
  today() { const n = new Date(); return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`; },
  fmt(s) { if (!s) return ''; const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; },
  dow(s) { return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][D.parse(s).getUTCDay()]; },
  short(s) { const [, m, d] = s.split('-'); return `${d}/${m}`; },
  range(from, to) { const out = []; for (let d = from; d < to; d = D.add(d, 1)) out.push(d); return out; },
  stamp() { const n = new Date(); return `${D.today()} ${pad(n.getHours())}:${pad(n.getMinutes())}`; }
};

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function money(n) {
  const cur = (typeof Store !== 'undefined' && Store.state) ? Store.state.hotel.currency : 'USD';
  return `${cur} ${Number(n || 0).toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const round2 = n => Math.round(n * 100) / 100;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* Generador pseudoaleatorio determinista para la semilla de datos */
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function formData(form) {
  const o = {};
  new FormData(form).forEach((v, k) => { o[k] = typeof v === 'string' ? v.trim() : v; });
  return o;
}

function options(list, selected, valueKey = 'code', labelFn = x => `${x.code} - ${x.name}`) {
  return list.map(x => `<option value="${esc(x[valueKey])}" ${String(x[valueKey]) === String(selected) ? 'selected' : ''}>${esc(labelFn(x))}</option>`).join('');
}

/* ---------- Avisos ---------- */
function toast(msg, type = 'info') {
  const box = $('#toasts');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.classList.add('out'), 3200);
  setTimeout(() => t.remove(), 3700);
}

/* ---------- Modales ---------- */
const Modal = {
  open({ title, body, footer = '', wide = false, onMount }) {
    const root = $('#modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true">
        <div class="modal-head"><span>${esc(title)}</span><button class="modal-x" title="Cerrar (Esc)">×</button></div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
      </div>`;
    root.appendChild(wrap);
    const close = () => wrap.remove();
    wrap.querySelector('.modal-x').onclick = close;
    wrap.addEventListener('mousedown', e => { if (e.target === wrap) close(); });
    $$('[data-close]', wrap).forEach(b => b.onclick = close);
    const first = wrap.querySelector('input:not([type=hidden]):not([readonly]), select, textarea');
    if (first) setTimeout(() => first.focus(), 30);
    if (onMount) onMount(wrap, close);
    return { el: wrap, close };
  },
  closeTop() { const all = $$('#modal-root .modal-backdrop'); if (all.length) all[all.length - 1].remove(); },
  confirm(title, msg, onYes, yesLabel = 'Aceptar') {
    Modal.open({
      title, body: `<p>${msg}</p>`,
      footer: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="mc-yes">${esc(yesLabel)}</button>`,
      onMount(el, close) { $('#mc-yes', el).onclick = () => { close(); onYes(); }; }
    });
  }
};

document.addEventListener('keydown', e => { if (e.key === 'Escape') Modal.closeTop(); });

function printHTML(title, html) {
  const area = $('#print-area');
  area.innerHTML = `<div class="print-doc"><h2>${esc(Store.state.hotel.name)}</h2><h3>${esc(title)}</h3>${html}
    <p class="muted small">Impreso ${D.stamp()} por ${esc(App.user?.name || '')} · Fecha de negocio ${D.fmt(Store.state.businessDate)}</p></div>`;
  window.print();
}
