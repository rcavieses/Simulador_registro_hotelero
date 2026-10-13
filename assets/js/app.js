/* Shell de la aplicación: sesión, menú, enrutador y atajos de teclado */
'use strict';

const Views = {};

const ROLES_ALL = ['admin', 'recepcion', 'reservas', 'housekeeping', 'auditor'];
const FO = ['admin', 'recepcion'];
const RSV = ['admin', 'recepcion', 'reservas'];

const MENU = [
  { label: 'Reservaciones', items: [
    { route: 'reservation', label: 'Nueva reserva', key: 'F2', roles: RSV },
    { route: 'reservations', label: 'Buscar reservas', key: 'F3', roles: RSV },
    { route: 'availability', label: 'Disponibilidad', roles: RSV },
    { route: 'rack', label: 'Rack de reservas (Tape chart)', roles: ROLES_ALL }
  ] },
  { label: 'Recepción', items: [
    { route: 'arrivals', label: 'Llegadas', key: 'F5', roles: FO },
    { route: 'inhouse', label: 'Huéspedes en casa', key: 'F6', roles: FO },
    { route: 'departures', label: 'Salidas', key: 'F7', roles: FO },
    { route: 'walkin', label: 'Walk-in', roles: FO },
    { route: 'roomplan', label: 'Plano de habitaciones', roles: ROLES_ALL }
  ] },
  { label: 'Caja', items: [
    { route: 'cashier', label: 'Facturación / Folios', key: 'F8', roles: ['admin', 'recepcion', 'auditor'] },
    { route: 'ledger', label: 'Cuentas por cobrar', roles: ['admin', 'auditor'] }
  ] },
  { label: 'Habitaciones', items: [
    { route: 'housekeeping', label: 'Ama de llaves', key: 'F9', roles: ['admin', 'recepcion', 'housekeeping'] },
    { route: 'ooo', label: 'Fuera de orden / servicio', roles: ['admin', 'housekeeping'] }
  ] },
  { label: 'Perfiles', items: [
    { route: 'profiles', label: 'Huéspedes', roles: RSV },
    { route: 'companies', label: 'Empresas y agencias', roles: RSV }
  ] },
  { label: 'Fin de día', items: [
    { route: 'audit', label: 'Auditoría nocturna', roles: ['admin', 'auditor'] },
    { route: 'reports', label: 'Reportes', key: 'F10', roles: ['admin', 'recepcion', 'reservas', 'auditor'] }
  ] },
  { label: 'Configuración', items: [
    { route: 'settings', label: 'Datos del hotel', roles: ['admin'] },
    { route: 'rates', label: 'Tipos de habitación y tarifas', roles: ['admin', 'reservas'] },
    { route: 'users', label: 'Usuarios y roles', roles: ['admin'] },
    { route: 'log', label: 'Bitácora de actividad', roles: ['admin', 'auditor'] }
  ] }
];

const ROUTE_ROLES = { dashboard: ROLES_ALL };
MENU.forEach(m => m.items.forEach(i => { ROUTE_ROLES[i.route] = i.roles; }));
ROUTE_ROLES.profile = RSV;
ROUTE_ROLES.contact = ROLES_ALL;
ROUTE_ROLES.folio = ['admin', 'recepcion', 'auditor'];

const App = {
  user: null,

  init() {
    Store.load();
    try { const u = sessionStorage.getItem('pms_user'); if (u) this.user = Store.state.users.find(x => x.username === u && x.active) || null; } catch (e) { /* sin sesión */ }
    this.user ? this.showApp() : this.showLogin();
    window.addEventListener('hashchange', () => this.route());
    document.addEventListener('keydown', e => this.hotkey(e));
  },

  /* ---------- Sesión ---------- */
  showLogin() {
    document.body.className = 'is-login';
    $('#app').innerHTML = `
      <div class="login-wrap">
        <div class="login-card">
          <div class="login-brand"><div class="logo">PMS</div><div><h1>Property Management System</h1><p>${esc(Store.state.hotel.name)} · Demo</p></div></div>
          <form id="login-form" autocomplete="off">
            <label>Usuario<input name="username" required></label>
            <label>Contraseña<input name="password" type="password" required></label>
            <label>Propiedad<select disabled><option>${esc(Store.state.hotel.code)} - ${esc(Store.state.hotel.name)}</option></select></label>
            <button class="btn btn-primary btn-block">Iniciar sesión</button>
          </form>
          <div class="or"><span>o</span></div>
          <button class="btn btn-google btn-block" id="google-btn">
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.3 5.7c4.3-4 7-9.9 7-17.2z"/><path fill="#FBBC05" d="M10.6 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2 1.4-4.7 2.3-8.6 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>
            Continuar con Google</button>
          <div class="demo-users">
            <p>Usuarios de demostración (clic para entrar):</p>
            ${Store.state.users.filter(u => u.active).map(u => `<button class="chip" data-u="${esc(u.username)}" data-p="${esc(u.password)}">${esc(u.username)} <small>${esc(ROLE_LABEL[u.role])}</small></button>`).join('')}
          </div>
        </div>
        <p class="login-foot">Desarrollado por <b>${esc(VENDOR.name)}</b> · <a href="#" id="login-contact">¿Quieres este sistema? Contáctanos</a><br>Demo · los datos se guardan sólo en este navegador</p>
      </div>`;
    $('#login-form').onsubmit = e => {
      e.preventDefault();
      const { username, password } = formData(e.target);
      this.login(username, password);
    };
    $$('.demo-users .chip').forEach(b => b.onclick = () => this.login(b.dataset.u, b.dataset.p));
    $('#login-contact').onclick = e => {
      e.preventDefault();
      Modal.open({ title: `Contacto · ${VENDOR.name}`, wide: true, body: Contact.html(), onMount: m => Contact.bind(m) });
    };
    $('#google-btn').onclick = () => toast('El inicio de sesión con Google estará disponible en la versión conectada (Firebase Auth).', 'info');
  },

  login(username, password) {
    const u = Store.state.users.find(x => x.username === username && x.password === password && x.active);
    if (!u) { toast('Usuario o contraseña incorrectos', 'error'); return; }
    this.user = u;
    try { sessionStorage.setItem('pms_user', u.username); } catch (e) { /* ignorar */ }
    Store.log('Inicio de sesión');
    Store.save();
    if (!location.hash || location.hash === '#/') location.hash = '#/dashboard';
    this.showApp();
  },

  logout() {
    Store.log('Cierre de sesión');
    Store.save();
    this.user = null;
    try { sessionStorage.removeItem('pms_user'); } catch (e) { /* ignorar */ }
    this.showLogin();
  },

  can(route) { return (ROUTE_ROLES[route] || ['admin']).includes(this.user.role); },

  /* ---------- Shell ---------- */
  showApp() {
    document.body.className = 'is-app';
    $('#app').innerHTML = `
      <header class="titlebar">
        <div class="tb-left"><span class="logo sm">PMS</span><strong>${esc(Store.state.hotel.name)}</strong></div>
        <div class="tb-right">
          <span class="bd-pill" title="Fecha de negocio">Fecha de negocio: <b id="bd-label"></b></span>
          <span>${esc(this.user.name)} <small>(${esc(ROLE_LABEL[this.user.role])})</small></span>
          <button class="btn btn-sm btn-ghost" id="logout">Salir</button>
        </div>
      </header>
      <nav class="menubar" id="menubar">
        <button class="menu-burger" id="burger" aria-label="Menú">☰</button>
        <a href="#/dashboard" class="menu-top home">Inicio</a>
        ${MENU.map(m => {
          const items = m.items.filter(i => i.roles.includes(this.user.role));
          if (!items.length) return '';
          return `<div class="menu-top" tabindex="0">${esc(m.label)}<div class="menu-drop">
            ${items.map(i => `<a href="#/${i.route}">${esc(i.label)}${i.key ? `<kbd>${i.key}</kbd>` : ''}</a>`).join('')}
          </div></div>`;
        }).join('')}
        <a href="#/contact" class="menu-top">Contacto</a>
        <div class="menu-search"><input id="quick-search" placeholder="Buscar huésped, conf. o hab..." aria-label="Búsqueda rápida"></div>
      </nav>
      <main id="view"></main>
      <footer class="statusbar">
        <span id="sb-route"></span>
        <span class="sb-keys">F2 Nueva · F3 Buscar · F5 Llegadas · F6 En casa · F7 Salidas · F8 Caja · F9 HK · F10 Reportes</span>
        <span>${esc(Store.state.hotel.code)} · ${esc(this.user.username)} · Desarrollado por <a href="#/contact">${esc(VENDOR.name)}</a></span>
      </footer>`;
    $('#logout').onclick = () => this.logout();
    $('#burger').onclick = () => $('#menubar').classList.toggle('open');
    $$('.menu-drop a').forEach(a => a.addEventListener('click', () => { $('#menubar').classList.remove('open'); document.activeElement.blur(); }));
    $('#quick-search').addEventListener('keydown', e => {
      if (e.key === 'Enter') { location.hash = `#/reservations?q=${encodeURIComponent(e.target.value)}&all=1`; e.target.value = ''; }
    });
    this.route();
  },

  route() {
    if (!this.user) return;
    const [path, qs] = (location.hash.slice(2) || 'dashboard').split('?');
    const q = Object.fromEntries(new URLSearchParams(qs || ''));
    const name = Views[path] ? path : 'dashboard';
    const view = $('#view');
    if (!this.can(name)) {
      view.innerHTML = `<div class="panel"><h2>Acceso restringido</h2><p>Su rol (${esc(ROLE_LABEL[this.user.role])}) no tiene permiso para esta función.</p></div>`;
      return;
    }
    $('#bd-label').textContent = `${D.dow(Store.state.businessDate)} ${D.fmt(Store.state.businessDate)}`;
    $('#sb-route').textContent = Views[name].title;
    document.title = `${Views[name].title} · PMS`;
    view.innerHTML = '';
    view.scrollTop = 0;
    Views[name].render(view, q);
  },

  refresh() { this.route(); },

  go(route) { if (location.hash === '#/' + route) this.route(); else location.hash = '#/' + route; },

  hotkey(e) {
    if (!this.user || $('#modal-root').children.length) return;
    const map = { F2: 'reservation', F3: 'reservations', F5: 'arrivals', F6: 'inhouse', F7: 'departures', F8: 'cashier', F9: 'housekeeping', F10: 'reports' };
    if (map[e.key]) {
      e.preventDefault();
      if (this.can(map[e.key])) this.go(map[e.key]); else toast('Sin permiso para esta función', 'error');
    }
  }
};

/* Componentes compartidos entre vistas */
const UI = {
  header(title, actions = '') {
    return `<div class="view-head"><h1>${esc(title)}</h1><div class="view-actions">${actions}</div></div>`;
  },
  statusTag(st) { return `<span class="tag st-${st}">${STATUS_LABEL[st] || st}</span>`; },
  hkTag(hk) { return `<span class="tag hk-${hk}">${HK_LABEL[hk]}</span>`; },
  vip(g) { return g && g.vip ? `<span class="tag vip">${esc(g.vip)}</span>` : ''; },
  empty(msg) { return `<div class="empty">${esc(msg)}</div>`; },
  table(cols, rows, opts = {}) {
    if (!rows.length) return UI.empty(opts.empty || 'Sin registros');
    return `<div class="table-wrap"><table class="grid ${opts.cls || ''}">
      <thead><tr>${cols.map(c => `<th class="${c.cls || ''}">${esc(c.label)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r => `<tr ${opts.rowAttr ? opts.rowAttr(r) : ''}>${cols.map(c => `<td class="${c.cls || ''}">${c.html ? c.html(r) : esc(c.val(r))}</td>`).join('')}</tr>`).join('')}</tbody>
      ${opts.foot ? `<tfoot>${opts.foot}</tfoot>` : ''}
    </table></div>`;
  },
  kpi(label, value, sub = '') { return `<div class="kpi"><span>${esc(label)}</span><b>${value}</b>${sub ? `<small>${sub}</small>` : ''}</div>`; },
  resRowCols() {
    return [
      { label: 'Conf.', html: r => `<a href="#/reservation?id=${r.id}">${esc(r.conf)}</a>` },
      { label: 'Huésped', html: r => `${esc(Store.guestName(r.guestId))} ${UI.vip(Store.guest(r.guestId))}` },
      { label: 'Llegada', val: r => D.fmt(r.arrival) },
      { label: 'Salida', val: r => D.fmt(r.departure) },
      { label: 'Noches', cls: 'num', val: r => D.diff(r.arrival, r.departure) },
      { label: 'Tipo', val: r => r.roomType },
      { label: 'Hab.', html: r => r.room ? `<b>${esc(r.room)}</b>` : '<span class="muted">—</span>' },
      { label: 'Tarifa', val: r => r.rateCode },
      { label: 'Importe', cls: 'num', val: r => money(r.rate) },
      { label: 'Pax', cls: 'num', val: r => `${r.adults}/${r.children || 0}` },
      { label: 'Estado', html: r => UI.statusTag(r.status) }
    ];
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
