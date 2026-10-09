'use strict';

/* ---------- Auditoría nocturna ---------- */
Views.audit = {
  title: 'Auditoría nocturna',
  render(el) {
    const s = Store.state, bd = s.businessDate, chk = Store.auditChecks();
    const projected = chk.inhouse.reduce((t, r) => t + r.rate, 0);
    const step = (ok, title, body) => `<div class="audit-step ${ok ? 'ok' : 'bad'}"><span class="ico">${ok ? '✔' : '✖'}</span><div><b>${title}</b><div>${body}</div></div></div>`;
    el.innerHTML = `
      ${UI.header(`Auditoría nocturna · ${D.dow(bd)} ${D.fmt(bd)}`)}
      <section class="panel">
        <h2>Verificaciones previas</h2>
        ${step(!chk.departures.length, `Salidas pendientes: ${chk.departures.length}`, chk.departures.length
          ? `Debe hacer check-out o extender estas estadías: ${chk.departures.map(r => `<a href="#/folio?id=${r.id}">${esc(r.room)}</a>`).join(', ')}` : 'Todas las salidas del día fueron procesadas.')}
        ${step(true, `Llegadas no presentadas: ${chk.arrivals.length}`, chk.arrivals.length
          ? `Se marcarán como <b>No show</b>: ${chk.arrivals.map(r => `<a href="#/reservation?id=${r.id}">${esc(r.conf)}</a>`).join(', ')}` : 'Todas las llegadas fueron registradas.')}
        ${step(true, `Cargos de alojamiento: ${chk.inhouse.length} habitación(es)`, `Se cargará alojamiento + IVA a cada folio en casa. Total estimado ${money(projected)} + ${money(projected * s.hotel.taxRate / 100)} IVA.`)}
        ${step(true, 'Estado de habitaciones', 'Las habitaciones ocupadas pasarán a estado <b>Sucia</b> para el nuevo día.')}
        <form id="au-form" class="audit-run">
          <label class="check"><input type="checkbox" name="noShowCharge" value="1" checked> Cobrar una noche a los no show garantizados</label>
          <button class="btn btn-primary" ${chk.departures.length ? 'disabled' : ''}>Ejecutar auditoría y avanzar a ${D.fmt(D.add(bd, 1))}</button>
        </form>
      </section>
      <section class="panel"><h2>Historial de cierres</h2>
        ${UI.table([
          { label: 'Fecha', val: a => D.fmt(a.date) }, { label: 'Ocupadas', cls: 'num', val: a => a.occupied },
          { label: 'Ocupación', cls: 'num', val: a => `${a.occupancy}%` }, { label: 'Ingreso hab.', cls: 'num', val: a => money(a.roomRevenue) },
          { label: 'ADR', cls: 'num', val: a => money(a.adr) }, { label: 'RevPAR', cls: 'num', val: a => money(a.revpar) },
          { label: 'No shows', cls: 'num', val: a => a.noShows.length }, { label: 'Cerrado', val: a => `${a.at} · ${a.user}` }
        ], s.audits, { empty: 'Aún no se ha ejecutado ninguna auditoría' })}
      </section>`;
    $('#au-form').onsubmit = e => {
      e.preventDefault();
      const d = formData(e.target);
      Modal.confirm('Cerrar el día', `Se cerrará la fecha de negocio <b>${D.fmt(bd)}</b>. Esta acción no se puede deshacer.`, () => {
        try {
          const r = Store.runAudit({ noShowCharge: !!d.noShowCharge });
          Modal.open({
            title: 'Auditoría completada',
            body: `<table class="kv"><tr><th>Fecha cerrada</th><td>${D.fmt(r.date)}</td></tr><tr><th>Habitaciones cargadas</th><td>${r.posted}</td></tr>
              <tr><th>Ingreso habitaciones</th><td>${money(r.roomRevenue)}</td></tr><tr><th>IVA</th><td>${money(r.taxes)}</td></tr>
              <tr><th>Ocupación</th><td>${r.occupancy}%</td></tr><tr><th>ADR / RevPAR</th><td>${money(r.adr)} / ${money(r.revpar)}</td></tr>
              <tr><th>No shows</th><td>${r.noShows.join(', ') || '—'}</td></tr><tr><th>Nueva fecha de negocio</th><td><b>${D.fmt(Store.state.businessDate)}</b></td></tr></table>`,
            footer: '<button class="btn btn-primary" data-close>Aceptar</button>'
          });
          App.refresh();
        } catch (err) { toast(err.message, 'error'); }
      }, 'Cerrar día');
    };
  }
};

/* ---------- Reportes ---------- */
const REPORTS = {
  arrivals: { name: 'Llegadas', params: ['date'], run(p) {
    const list = Store.state.reservations.filter(r => r.arrival === p.date && !['cancelled'].includes(r.status));
    return UI.table(UI.resRowCols(), list, { empty: 'Sin llegadas' });
  } },
  departures: { name: 'Salidas', params: ['date'], run(p) {
    const list = Store.state.reservations.filter(r => r.departure === p.date && ['inhouse', 'checkedout'].includes(r.status));
    return UI.table([...UI.resRowCols(), { label: 'Saldo', cls: 'num', val: r => money(Store.balance(r.id)) }], list, { empty: 'Sin salidas' });
  } },
  inhouse: { name: 'Huéspedes en casa', params: [], run() {
    const list = Store.state.reservations.filter(r => r.status === 'inhouse').sort((a, b) => a.room.localeCompare(b.room));
    return UI.table([...UI.resRowCols(), { label: 'Saldo', cls: 'num', val: r => money(Store.balance(r.id)) }], list);
  } },
  forecast: { name: 'Pronóstico de ocupación', params: ['from', 'days'], run(p) {
    const rows = Array.from({ length: Number(p.days) || 30 }, (_, i) => Store.stats(D.add(p.from, i)));
    const t = rows.reduce((a, r) => ({ occ: a.occ + r.occupied, rev: a.rev + r.revenue, av: a.av + r.total - r.ooo }), { occ: 0, rev: 0, av: 0 });
    return UI.table([
      { label: 'Fecha', val: r => `${D.dow(r.date)} ${D.fmt(r.date)}` }, { label: 'Llegadas', cls: 'num', val: r => r.arrivals },
      { label: 'Salidas', cls: 'num', val: r => r.departures }, { label: 'Ocupadas', cls: 'num', val: r => r.occupied },
      { label: 'Disponibles', cls: 'num', val: r => r.available }, { label: 'OOO', cls: 'num', val: r => r.ooo },
      { label: 'Ocup. %', cls: 'num', html: r => `<div class="minibar"><i style="width:${Math.min(100, r.occPct)}%"></i><span>${r.occPct.toFixed(1)}%</span></div>` },
      { label: 'Personas', cls: 'num', val: r => r.persons }, { label: 'Ingreso hab.', cls: 'num', val: r => money(r.revenue) }, { label: 'ADR', cls: 'num', val: r => money(r.adr) }
    ], rows, { foot: `<tr><td colspan="3">Totales</td><td class="num">${t.occ}</td><td colspan="2"></td><td class="num">${(t.occ / (t.av || 1) * 100).toFixed(1)}%</td><td></td><td class="num">${money(t.rev)}</td><td class="num">${money(t.occ ? t.rev / t.occ : 0)}</td></tr>` });
  } },
  revenue: { name: 'Ingresos por código de transacción', params: ['from', 'to'], run(p) {
    const s = Store.state, agg = {};
    Object.values(s.folios).flat().filter(t => t.date >= p.from && t.date <= p.to).forEach(t => { agg[t.code] = (agg[t.code] || 0) + t.amount; });
    const rows = Object.keys(agg).sort().map(code => ({ code, tc: Store.trx(code), total: agg[code] }));
    const sum = type => rows.filter(r => r.tc.type === type).reduce((a, r) => a + r.total, 0);
    return UI.table([{ label: 'Código', val: r => r.code }, { label: 'Descripción', val: r => r.tc.name }, { label: 'Grupo', val: r => r.tc.group }, { label: 'Importe', cls: 'num', val: r => money(r.total) }], rows, {
      empty: 'Sin movimientos en el periodo',
      foot: `<tr><td colspan="3">Total cargos (neto)</td><td class="num">${money(sum('charge'))}</td></tr><tr><td colspan="3">Total impuestos</td><td class="num">${money(sum('tax'))}</td></tr><tr><td colspan="3">Total pagos</td><td class="num">${money(-sum('payment'))}</td></tr>`
    });
  } },
  hk: { name: 'Estado de habitaciones', params: [], run() {
    return UI.table([{ label: 'Hab.', val: r => r.no }, { label: 'Tipo', val: r => r.type }, { label: 'FO', val: r => r.fo === 'occupied' ? 'Ocupada' : 'Vacía' },
      { label: 'HK', html: r => UI.hkTag(r.hk) }, { label: 'Camarera', val: r => r.attendant }, { label: 'Nota', val: r => r.ooo?.reason || r.note }], Store.state.rooms);
  } },
  cancellations: { name: 'Cancelaciones y no shows', params: [], run() {
    const list = Store.state.reservations.filter(r => ['cancelled', 'noshow'].includes(r.status));
    return UI.table([...UI.resRowCols(), { label: 'Motivo', val: r => r.cancelReason || '' }], list, { empty: 'Sin cancelaciones ni no shows' });
  } },
  nationality: { name: 'Huéspedes por nacionalidad', params: [], run() {
    const s = Store.state, agg = {};
    s.reservations.filter(r => ['inhouse', 'checkedout'].includes(r.status)).forEach(r => {
      const n = Store.guest(r.guestId)?.nationality || '—';
      agg[n] = agg[n] || { n, stays: 0, nights: 0 };
      agg[n].stays++; agg[n].nights += D.diff(r.arrival, r.departure);
    });
    const rows = Object.values(agg).sort((a, b) => b.nights - a.nights);
    const max = Math.max(1, ...rows.map(r => r.nights));
    return UI.table([{ label: 'Nacionalidad', val: r => r.n }, { label: 'Estadías', cls: 'num', val: r => r.stays }, { label: 'Noches', cls: 'num', val: r => r.nights },
      { label: '', html: r => `<div class="minibar"><i style="width:${r.nights / max * 100}%"></i></div>` }], rows);
  } },
  manager: { name: 'Reporte gerencial (cierres)', params: [], run() {
    const a = Store.state.audits;
    return UI.table([{ label: 'Fecha', val: x => D.fmt(x.date) }, { label: 'Ocupación', cls: 'num', val: x => `${x.occupancy}%` }, { label: 'Hab. ocupadas', cls: 'num', val: x => x.occupied },
      { label: 'Ingreso hab.', cls: 'num', val: x => money(x.roomRevenue) }, { label: 'ADR', cls: 'num', val: x => money(x.adr) }, { label: 'RevPAR', cls: 'num', val: x => money(x.revpar) }], a,
      { empty: 'Ejecute la auditoría nocturna para generar datos de cierre.' });
  } }
};

Views.reports = {
  title: 'Reportes',
  render(el, q) {
    const bd = Store.state.businessDate, key = REPORTS[q.r] ? q.r : 'arrivals', rep = REPORTS[key];
    const p = { date: q.date || bd, from: q.from || (key === 'revenue' ? D.add(bd, -30) : bd), to: q.to || bd, days: q.days || 30 };
    const inputs = { date: `<label>Fecha<input type="date" name="date" value="${p.date}"></label>`, from: `<label>Desde<input type="date" name="from" value="${p.from}"></label>`,
      to: `<label>Hasta<input type="date" name="to" value="${p.to}"></label>`, days: `<label>Días<input type="number" name="days" min="1" max="90" value="${p.days}"></label>` };
    el.innerHTML = `
      ${UI.header('Reportes')}
      <div class="reports">
        <nav class="panel rep-list">${Object.entries(REPORTS).map(([k, r]) => `<a href="#/reports?r=${k}" class="${k === key ? 'active' : ''}">${esc(r.name)}</a>`).join('')}</nav>
        <section class="panel rep-body">
          <div class="view-head"><h2>${esc(rep.name)}</h2><div class="view-actions"><button class="btn" id="rp-csv">CSV</button><button class="btn" id="rp-print">Imprimir</button></div></div>
          ${rep.params.length ? `<form class="filters" id="rp-f"><input type="hidden" name="r" value="${key}">${rep.params.map(x => inputs[x]).join('')}<button class="btn">Generar</button></form>` : ''}
          <div id="rp-out">${rep.run(p)}</div>
        </section>
      </div>`;
    if ($('#rp-f')) $('#rp-f').onsubmit = e => { e.preventDefault(); location.hash = '#/reports?' + new URLSearchParams(formData(e.target)); };
    $('#rp-print').onclick = () => printHTML(rep.name, $('#rp-out').innerHTML);
    $('#rp-csv').onclick = () => {
      const table = $('#rp-out table');
      if (!table) { toast('No hay datos para exportar', 'error'); return; }
      const csv = $$('tr', table).map(tr => $$('th,td', tr).map(c => `"${c.innerText.replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
      a.download = `${key}_${bd}.csv`; a.click();
    };
  }
};

/* ---------- Configuración ---------- */
Views.settings = {
  title: 'Datos del hotel',
  render(el) {
    const h = Store.state.hotel;
    el.innerHTML = `
      ${UI.header('Datos del hotel')}
      <section class="panel"><form id="st-form" class="f3">
        <label>Nombre<input name="name" value="${esc(h.name)}" required></label>
        <label>Código propiedad<input name="code" value="${esc(h.code)}" maxlength="6"></label>
        <label>Moneda<input name="currency" value="${esc(h.currency)}" maxlength="4"></label>
        <label>Dirección<input name="address" value="${esc(h.address)}"></label>
        <label>Ciudad<input name="city" value="${esc(h.city)}"></label>
        <label>País<input name="country" value="${esc(h.country)}"></label>
        <label>Teléfono<input name="phone" value="${esc(h.phone)}"></label>
        <label>Email<input name="email" value="${esc(h.email)}"></label>
        <label>IVA %<input type="number" step="0.01" name="taxRate" value="${h.taxRate}"></label>
        <label>Hora check-in<input type="time" name="checkIn" value="${esc(h.checkIn)}"></label>
        <label>Hora check-out<input type="time" name="checkOut" value="${esc(h.checkOut)}"></label>
        <div class="form-actions span-all"><button class="btn btn-primary">Guardar</button></div>
      </form></section>
      <section class="panel"><h2>Datos de la demo</h2>
        <p class="muted">La demo guarda la información en el navegador (localStorage). Puede exportarla como JSON para migrarla a la versión con Google.</p>
        <div class="row-btns">
          <button class="btn" id="st-export">Exportar JSON</button>
          <label class="btn">Importar JSON<input type="file" id="st-import" accept="application/json" hidden></label>
          <button class="btn btn-danger" id="st-reset">Reiniciar datos de demostración</button>
        </div>
      </section>`;
    $('#st-form').onsubmit = e => {
      e.preventDefault();
      const d = formData(e.target); d.taxRate = Number(d.taxRate);
      Object.assign(h, d); Store.log('Datos del hotel actualizados'); Store.save(); toast('Configuración guardada', 'ok'); App.showApp();
    };
    $('#st-export').onclick = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(Store.state, null, 2)], { type: 'application/json' }));
      a.download = `pms_${Store.state.businessDate}.json`; a.click();
    };
    $('#st-import').onchange = e => {
      const file = e.target.files[0]; if (!file) return;
      file.text().then(t => {
        try { const data = JSON.parse(t); if (!data.rooms || !data.reservations) throw new Error(); Store.state = data; Store.save(); toast('Datos importados', 'ok'); App.showApp(); }
        catch (err) { toast('Archivo inválido', 'error'); }
      });
    };
    $('#st-reset').onclick = () => Modal.confirm('Reiniciar demo', 'Se borrarán todos los cambios y se regenerarán los datos de ejemplo.', () => {
      Store.reset(); toast('Datos reiniciados', 'ok'); App.user = Store.state.users.find(u => u.username === App.user.username) || Store.state.users[0]; App.showApp();
    }, 'Reiniciar');
  }
};

Views.rates = {
  title: 'Tipos de habitación y tarifas',
  render(el) {
    const s = Store.state, edit = App.user.role === 'admin' || App.user.role === 'reservas';
    el.innerHTML = `
      ${UI.header('Tipos de habitación y tarifas')}
      <section class="panel"><h2>Tipos de habitación</h2>
        ${UI.table([{ label: 'Código', val: t => t.code }, { label: 'Nombre', val: t => t.name }, { label: 'Camas', val: t => t.beds },
          { label: 'Ocup. máx.', cls: 'num', val: t => t.maxOcc }, { label: 'Habitaciones', cls: 'num', val: t => Store.roomsOfType(t.code).length },
          { label: 'Descripción', val: t => t.desc }], s.roomTypes)}
      </section>
      <section class="panel"><h2>Códigos de tarifa ${edit ? '<button class="btn btn-sm" id="rt-new">+ Nueva tarifa</button>' : ''}</h2>
        <form id="rt-form"><div class="table-wrap"><table class="grid">
          <thead><tr><th>Código</th><th>Nombre</th><th>Desayuno</th><th>Activa</th>${s.roomTypes.map(t => `<th class="num">${t.code}</th>`).join('')}</tr></thead>
          <tbody>${s.rateCodes.map((r, i) => `<tr><td><b>${esc(r.code)}</b></td><td><input name="name_${i}" value="${esc(r.name)}"></td>
            <td><input type="checkbox" name="bf_${i}" ${r.breakfast ? 'checked' : ''}></td><td><input type="checkbox" name="ac_${i}" ${r.active ? 'checked' : ''}></td>
            ${s.roomTypes.map(t => `<td class="num"><input class="num-in" type="number" step="0.01" name="p_${i}_${t.code}" value="${r.prices[t.code]}"></td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>${edit ? '<div class="form-actions"><button class="btn btn-primary">Guardar tarifas</button></div>' : ''}</form>
      </section>
      <section class="panel"><h2>Códigos de transacción</h2>
        ${UI.table([{ label: 'Código', val: t => t.code }, { label: 'Descripción', val: t => t.name }, { label: 'Tipo', val: t => ({ charge: 'Cargo', payment: 'Pago', tax: 'Impuesto' })[t.type] },
          { label: 'Grupo', val: t => t.group }, { label: 'Gravable', val: t => t.taxable ? 'Sí' : 'No' }], s.trxCodes)}
      </section>`;
    if (!edit) { $$('#rt-form input').forEach(i => { i.disabled = true; }); return; }
    $('#rt-form').onsubmit = e => {
      e.preventDefault();
      const f = e.target.elements;
      s.rateCodes.forEach((r, i) => {
        r.name = f[`name_${i}`].value; r.breakfast = f[`bf_${i}`].checked; r.active = f[`ac_${i}`].checked;
        s.roomTypes.forEach(t => { r.prices[t.code] = Number(f[`p_${i}_${t.code}`].value) || 0; });
      });
      Store.log('Tarifas actualizadas'); Store.save(); toast('Tarifas guardadas', 'ok');
    };
    $('#rt-new').onclick = () => Modal.open({
      title: 'Nueva tarifa',
      body: `<form id="nr-form" class="f2"><label>Código<input name="code" required maxlength="8"></label><label>Nombre<input name="name" required></label>
        <label>Basada en<select name="base">${options(s.rateCodes, 'RACK')}</select></label><label>Ajuste %<input type="number" name="pct" value="-10"></label></form>`,
      footer: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="nr-ok">Crear</button>`,
      onMount(m, close) {
        $('#nr-ok', m).onclick = () => {
          const fm = $('#nr-form', m); if (!fm.reportValidity()) return;
          const d = formData(fm); d.code = d.code.toUpperCase();
          if (Store.rate(d.code)) { toast('Ese código ya existe', 'error'); return; }
          const base = Store.rate(d.base), prices = {};
          s.roomTypes.forEach(t => { prices[t.code] = round2(base.prices[t.code] * (1 + Number(d.pct) / 100)); });
          s.rateCodes.push({ code: d.code, name: d.name, desc: `Derivada de ${base.code} ${d.pct}%`, breakfast: base.breakfast, active: true, prices });
          Store.log('Tarifa creada', d.code); Store.save(); close(); App.refresh();
        };
      }
    });
  }
};

Views.users = {
  title: 'Usuarios y roles',
  render(el) {
    const s = Store.state;
    const perms = Object.entries(ROLE_LABEL).map(([role, label]) => ({ role, label, items: MENU.flatMap(m => m.items).filter(i => i.roles.includes(role)).map(i => i.label) }));
    el.innerHTML = `
      ${UI.header('Usuarios y roles', `<button class="btn btn-primary" id="us-new">+ Nuevo usuario</button>`)}
      <section class="panel">${UI.table([
        { label: 'Usuario', html: u => `<b>${esc(u.username)}</b>` }, { label: 'Nombre', val: u => u.name }, { label: 'Rol', val: u => ROLE_LABEL[u.role] },
        { label: 'Estado', html: u => u.active ? '<span class="tag st-inhouse">Activo</span>' : '<span class="tag st-cancelled">Inactivo</span>' },
        { label: '', html: u => `<button class="btn btn-sm" data-ed="${esc(u.username)}">Editar</button>` }
      ], s.users)}</section>
      <section class="panel"><h2>Permisos por rol</h2>
        ${UI.table([{ label: 'Rol', html: p => `<b>${esc(p.label)}</b>` }, { label: 'Funciones', val: p => p.items.join(' · ') }], perms)}
        <p class="hint">En la versión conectada los usuarios iniciarán sesión con su cuenta de Google y el administrador asignará el rol.</p>
      </section>`;
    const edit = u => Modal.open({
      title: u ? `Editar ${u.username}` : 'Nuevo usuario',
      body: `<form id="us-form" class="f2">
        <label>Usuario<input name="username" value="${esc(u?.username || '')}" ${u ? 'readonly' : ''} required></label>
        <label>Nombre<input name="name" value="${esc(u?.name || '')}" required></label>
        <label>Rol<select name="role">${Object.entries(ROLE_LABEL).map(([k, v]) => `<option value="${k}" ${u?.role === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label>Contraseña<input name="password" type="password" placeholder="${u ? 'Sin cambios' : ''}" ${u ? '' : 'required'}></label>
        <label class="check"><input type="checkbox" name="active" value="1" ${!u || u.active ? 'checked' : ''}> Activo</label></form>`,
      footer: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="us-ok">Guardar</button>`,
      onMount(m, close) {
        $('#us-ok', m).onclick = () => {
          const fm = $('#us-form', m); if (!fm.reportValidity()) return;
          const d = formData(fm); d.active = !!d.active;
          if (u) {
            if (u.username === App.user.username && (!d.active || d.role !== 'admin')) { toast('No puede desactivar ni quitar el rol admin a su propio usuario', 'error'); return; }
            if (!d.password) delete d.password;
            Object.assign(u, d);
          } else {
            if (s.users.some(x => x.username === d.username)) { toast('El usuario ya existe', 'error'); return; }
            s.users.push(d);
          }
          Store.log(u ? 'Usuario modificado' : 'Usuario creado', d.username); Store.save(); close(); App.refresh();
        };
      }
    });
    $('#us-new').onclick = () => edit(null);
    $$('[data-ed]', el).forEach(b => b.onclick = () => edit(s.users.find(x => x.username === b.dataset.ed)));
  }
};

Views.log = {
  title: 'Bitácora',
  render(el, q) {
    const t = (q.q || '').toLowerCase();
    const list = Store.state.log.filter(l => !t || `${l.user} ${l.action} ${l.ref}`.toLowerCase().includes(t));
    el.innerHTML = `
      ${UI.header('Bitácora de actividad', `<input id="lg-q" placeholder="Filtrar..." value="${esc(q.q || '')}">`)}
      <section class="panel">${UI.table([{ label: 'Fecha/hora', val: l => l.at }, { label: 'Usuario', val: l => l.user }, { label: 'Acción', val: l => l.action }, { label: 'Ref.', val: l => l.ref }], list)}</section>`;
    $('#lg-q').onkeydown = e => { if (e.key === 'Enter') location.hash = `#/log?q=${encodeURIComponent(e.target.value)}`; };
  }
};
