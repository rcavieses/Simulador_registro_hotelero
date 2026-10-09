'use strict';

/* ---------- Búsqueda de reservas ---------- */
Views.reservations = {
  title: 'Buscar reservas',
  render(el, q) {
    const s = Store.state;
    el.innerHTML = `
      ${UI.header('Buscar reservas', `<a class="btn btn-primary" href="#/reservation">+ Nueva reserva <kbd>F2</kbd></a>`)}
      <form class="filters panel" id="rs-form">
        <label>Nombre / conf. / hab.<input name="q" value="${esc(q.q || '')}"></label>
        <label>Llegada desde<input type="date" name="from" value="${esc(q.from || '')}"></label>
        <label>Llegada hasta<input type="date" name="to" value="${esc(q.to || '')}"></label>
        <label>Estado<select name="status"><option value="">Activas (reservadas y en casa)</option>
          ${Object.entries(STATUS_LABEL).map(([k, v]) => `<option value="${k}" ${q.status === k ? 'selected' : ''}>${v}</option>`).join('')}
          <option value="all" ${q.status === 'all' || q.all ? 'selected' : ''}>Todas</option></select></label>
        <label>Empresa / agencia<select name="company"><option value="">Todas</option>${options(s.companies, q.company, 'id', c => c.name)}</select></label>
        <button class="btn">Buscar</button>
      </form>
      <section class="panel" id="rs-results"></section>`;
    const run = () => {
      const f = formData($('#rs-form'));
      const term = (f.q || '').toLowerCase();
      let list = s.reservations.filter(r => {
        if (f.status === 'all') { /* todas */ } else if (f.status) { if (r.status !== f.status) return false; } else if (!['reserved', 'inhouse'].includes(r.status)) return false;
        if (f.from && r.arrival < f.from) return false;
        if (f.to && r.arrival > f.to) return false;
        if (f.company && r.companyId !== f.company && r.agentId !== f.company) return false;
        if (term) {
          const g = Store.guest(r.guestId);
          const hay = `${g?.first} ${g?.last} ${r.conf} ${r.room} ${g?.email}`.toLowerCase();
          if (!hay.includes(term)) return false;
        }
        return true;
      }).sort((a, b) => a.arrival.localeCompare(b.arrival));
      $('#rs-results').innerHTML = `<p class="muted small">${list.length} reserva(s)</p>` + UI.table(UI.resRowCols(), list, { empty: 'No se encontraron reservas con esos criterios' });
    };
    $('#rs-form').onsubmit = e => { e.preventDefault(); run(); };
    run();
  }
};

/* ---------- Ficha de reserva (nueva / edición) ---------- */
Views.reservation = {
  title: 'Reserva',
  render(el, q) {
    const s = Store.state, bd = s.businessDate;
    const existing = q.id ? Store.res(q.id) : null;
    const walkin = q.walkin === '1';
    const r = existing ? { ...existing } : {
      guestId: q.guest || '', companyId: '', agentId: '', arrival: q.arrival || bd, departure: D.add(q.arrival || bd, 1),
      roomType: q.type || (q.room ? Store.room(q.room).type : 'STD'), room: q.room || '', rateCode: 'BAR', rate: 0,
      adults: 1, children: 0, source: walkin ? 'Walk-in' : 'Teléfono', guarantee: 'Tarjeta de crédito', eta: '', specials: '', notes: ''
    };
    if (!existing) r.rate = Store.rate(r.rateCode).prices[r.roomType];
    const locked = existing && !['reserved', 'inhouse'].includes(existing.status);
    const inhouse = existing && existing.status === 'inhouse';
    const g = Store.guest(r.guestId);

    const actions = existing ? `
      ${existing.status === 'reserved' && existing.arrival === bd ? `<button class="btn btn-primary" id="act-ci">Check-in</button>` : ''}
      ${['inhouse', 'checkedout', 'noshow'].includes(existing.status) || s.folios[existing.id]?.length ? `<a class="btn" href="#/folio?id=${existing.id}">Folio</a>` : ''}
      <button class="btn" id="act-print">Confirmación</button>
      ${existing.status === 'reserved' ? `<button class="btn btn-danger" id="act-cancel">Cancelar</button>` : ''}
      ${existing.status === 'cancelled' ? `<button class="btn" id="act-reinstate">Reactivar</button>` : ''}` : '';

    el.innerHTML = `
      ${UI.header(existing ? `Reserva ${existing.conf}` : walkin ? 'Walk-in' : 'Nueva reserva', actions)}
      ${existing ? `<div class="res-banner">${UI.statusTag(existing.status)} Creada ${D.fmt(existing.createdAt)} por ${esc(existing.createdBy)}
        ${existing.checkedInAt ? ` · Check-in ${esc(existing.checkedInAt)}` : ''}${existing.checkedOutAt ? ` · Check-out ${esc(existing.checkedOutAt)}` : ''}
        ${existing.cancelNo ? ` · Cancelación ${esc(existing.cancelNo)}: ${esc(existing.cancelReason)}` : ''}</div>` : ''}
      <form id="res-form" class="res-grid">
        <fieldset class="panel">
          <legend>Huésped</legend>
          <input type="hidden" name="guestId" value="${esc(r.guestId)}">
          <div class="guest-box" id="guest-box">${g ? Views.reservation.guestCard(g) : '<span class="muted">Sin perfil asignado</span>'}</div>
          <div class="row-btns">
            <button type="button" class="btn btn-sm" id="pick-guest" ${locked ? 'disabled' : ''}>Buscar perfil</button>
            <button type="button" class="btn btn-sm" id="new-guest" ${locked ? 'disabled' : ''}>Nuevo perfil</button>
          </div>
          <label>Empresa<select name="companyId"><option value="">—</option>${options(s.companies.filter(c => c.kind === 'empresa'), r.companyId, 'id', c => c.name)}</select></label>
          <label>Agencia<select name="agentId"><option value="">—</option>${options(s.companies.filter(c => c.kind === 'agencia'), r.agentId, 'id', c => c.name)}</select></label>
        </fieldset>
        <fieldset class="panel">
          <legend>Estadía</legend>
          <div class="f2">
            <label>Llegada<input type="date" name="arrival" value="${r.arrival}" ${inhouse || walkin ? 'readonly' : ''} required></label>
            <label>Salida<input type="date" name="departure" value="${r.departure}" required></label>
            <label>Noches<input type="number" id="nights" min="1" value="${D.diff(r.arrival, r.departure)}"></label>
            <label>ETA<input type="time" name="eta" value="${esc(r.eta)}"></label>
            <label>Adultos<input type="number" name="adults" min="1" max="6" value="${r.adults}"></label>
            <label>Niños<input type="number" name="children" min="0" max="6" value="${r.children || 0}"></label>
          </div>
          <div class="f2">
            <label>Tipo hab.<select name="roomType" ${inhouse ? 'disabled' : ''}>${options(s.roomTypes, r.roomType)}</select></label>
            <label>Habitación<select name="room" ${inhouse ? 'disabled' : ''}></select></label>
          </div>
          <div id="avail-hint" class="hint"></div>
        </fieldset>
        <fieldset class="panel">
          <legend>Tarifa y garantía</legend>
          <div class="f2">
            <label>Código tarifa<select name="rateCode">${options(s.rateCodes.filter(x => x.active || x.code === r.rateCode), r.rateCode)}</select></label>
            <label>Tarifa / noche<input type="number" step="0.01" name="rate" value="${r.rate}"></label>
            <label>Origen<select name="source">${['Teléfono', 'Email', 'Web', 'OTA', 'Walk-in', 'Agencia', 'Empresa'].map(x => `<option ${x === r.source ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
            <label>Garantía<select name="guarantee">${['Tarjeta de crédito', 'Depósito', 'Cuenta empresa', 'Sin garantía'].map(x => `<option ${x === r.guarantee ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
          </div>
          <div class="totals" id="res-total"></div>
        </fieldset>
        <fieldset class="panel span-all">
          <legend>Comentarios</legend>
          <div class="f2">
            <label>Peticiones especiales<input name="specials" value="${esc(r.specials)}"></label>
            <label>Notas internas<input name="notes" value="${esc(r.notes)}"></label>
          </div>
          ${!existing ? `<label class="check"><input type="checkbox" name="overbook" value="1"> Permitir sobreventa</label>` : ''}
          <div class="form-actions">
            ${locked ? '<span class="muted">Reserva cerrada: sólo lectura.</span>' : `<button class="btn btn-primary">${existing ? 'Guardar cambios' : walkin ? 'Crear y registrar llegada' : 'Crear reserva'}</button>`}
            <a class="btn" href="#/reservations">Volver</a>
          </div>
        </fieldset>
      </form>`;

    const form = $('#res-form');
    if (locked) $$('input, select', form).forEach(i => { i.disabled = true; });
    const F = n => form.elements[n];

    const refresh = (setRate) => {
      const arr = F('arrival').value, dep = F('departure').value;
      if (setRate) F('rate').value = Store.rate(F('rateCode').value).prices[F('roomType').value];
      if (arr && dep && arr < dep) {
        $('#nights').value = D.diff(arr, dep);
        const type = F('roomType').value, ign = existing?.id;
        const free = Store.freeRooms(type, arr, dep, ign);
        const cur = F('room').value || r.room;
        F('room').innerHTML = `<option value="">Sin asignar</option>` + free.map(rm => {
          const occ = rm.fo === 'occupied' && rm.no !== (existing?.room) ? ' (ocupada)' : '';
          return `<option value="${rm.no}" ${rm.no === cur ? 'selected' : ''}>${rm.no} · ${HK_LABEL[rm.hk]}${occ}</option>`;
        }).join('') + (cur && !free.some(x => x.no === cur) ? `<option value="${cur}" selected>${cur}</option>` : '');
        const av = Store.minAvailability(type, arr, dep, ign);
        $('#avail-hint').innerHTML = `Disponibles <b>${type}</b> en el periodo: <b class="${av <= 0 ? 'neg' : ''}">${av}</b> · Habitaciones libres para asignar: ${free.length}`;
        const n = D.diff(arr, dep), rate = Number(F('rate').value) || 0, tax = rate * n * s.hotel.taxRate / 100;
        $('#res-total').innerHTML = `<div><span>${n} noche(s) × ${money(rate)}</span><b>${money(rate * n)}</b></div>
          <div><span>IVA ${s.hotel.taxRate}%</span><b>${money(tax)}</b></div><div class="grand"><span>Total estadía</span><b>${money(rate * n + tax)}</b></div>`;
      }
    };
    $('#nights').oninput = e => { const n = Math.max(1, Number(e.target.value) || 1); F('departure').value = D.add(F('arrival').value, n); refresh(); };
    ['arrival', 'departure'].forEach(n => F(n).onchange = () => refresh());
    ['roomType', 'rateCode'].forEach(n => F(n).onchange = () => { if (n === 'roomType') F('room').value = ''; refresh(true); });
    F('rate').oninput = () => refresh();
    F('companyId').onchange = () => { const c = Store.company(F('companyId').value); if (c?.rate) { F('rateCode').value = c.rate; refresh(true); } };
    refresh();

    const setGuest = gg => {
      F('guestId').value = gg.id;
      $('#guest-box').innerHTML = Views.reservation.guestCard(gg);
      if (gg.companyId) { F('companyId').value = gg.companyId; F('companyId').onchange(); }
    };
    $('#pick-guest').onclick = () => Profiles.pick(setGuest);
    $('#new-guest').onclick = () => Profiles.edit(null, setGuest);

    form.onsubmit = e => {
      e.preventDefault();
      const d = formData(form);
      if (!d.guestId) { toast('Asigne un perfil de huésped', 'error'); return; }
      if (inhouse) { d.roomType = existing.roomType; d.room = existing.room; }
      if (Number(d.adults) + Number(d.children || 0) > Store.roomType(d.roomType).maxOcc + 1) { toast('La ocupación excede la capacidad del tipo de habitación', 'error'); return; }
      try {
        const res = Store.saveReservation(d, existing?.id);
        if (walkin) {
          if (!res.room) { toast('Asigne una habitación para el walk-in', 'error'); location.hash = `#/reservation?id=${res.id}`; return; }
          Store.checkIn(res.id, res.room);
          toast(`Walk-in registrado en habitación ${res.room}`, 'ok');
          location.hash = `#/folio?id=${res.id}`;
          return;
        }
        toast(existing ? 'Reserva actualizada' : `Reserva creada · Confirmación ${res.conf}`, 'ok');
        if (existing) App.refresh(); else location.hash = `#/reservation?id=${res.id}`;
      } catch (err) { toast(err.message, 'error'); }
    };

    if (existing) {
      $('#act-ci') && ($('#act-ci').onclick = () => FrontDesk.checkInDialog(existing));
      $('#act-cancel') && ($('#act-cancel').onclick = () => Views.reservation.cancelDialog(existing));
      $('#act-reinstate') && ($('#act-reinstate').onclick = () => { try { Store.reinstate(existing.id); toast('Reserva reactivada', 'ok'); App.refresh(); } catch (e) { toast(e.message, 'error'); } });
      $('#act-print').onclick = () => Views.reservation.printConfirmation(existing);
    }
  },

  guestCard(g) {
    return `<div class="gcard"><b>${esc(g.last)}, ${esc(g.first)}</b> ${UI.vip(g)}
      <div class="small">${esc(g.email)} · ${esc(g.phone)}</div>
      <div class="small muted">${esc(g.docType)} ${esc(g.doc)} · ${esc(g.nationality)}${g.prefs ? ` · Pref.: ${esc(g.prefs)}` : ''}</div>
      ${App.can('profile') ? `<a class="small" href="#/profile?id=${g.id}">Ver perfil</a>` : ''}</div>`;
  },

  cancelDialog(res) {
    Modal.open({
      title: `Cancelar reserva ${res.conf}`,
      body: `<form id="cx-form"><label>Motivo de cancelación<select name="reason">
        <option>Cambio de planes del huésped</option><option>Encontró otra opción</option><option>Error en reserva</option><option>Cancelación por la agencia</option><option>Otro</option></select></label></form>`,
      footer: `<button class="btn" data-close>Volver</button><button class="btn btn-danger" id="cx-ok">Cancelar reserva</button>`,
      onMount(m, close) {
        $('#cx-ok', m).onclick = () => {
          try { Store.cancelReservation(res.id, formData($('#cx-form', m)).reason); close(); toast(`Reserva cancelada · CX${res.conf}`, 'ok'); App.refresh(); } catch (e) { toast(e.message, 'error'); }
        };
      }
    });
  },

  printConfirmation(r) {
    const g = Store.guest(r.guestId), h = Store.state.hotel, n = D.diff(r.arrival, r.departure);
    printHTML(`Confirmación de reserva Nº ${r.conf}`, `
      <p>Estimado/a ${esc(g.first)} ${esc(g.last)}:</p>
      <p>Nos complace confirmar su reserva con los siguientes detalles:</p>
      <table class="kv"><tr><th>Llegada</th><td>${D.dow(r.arrival)} ${D.fmt(r.arrival)} (check-in ${esc(h.checkIn)})</td></tr>
      <tr><th>Salida</th><td>${D.dow(r.departure)} ${D.fmt(r.departure)} (check-out ${esc(h.checkOut)})</td></tr>
      <tr><th>Noches</th><td>${n}</td></tr><tr><th>Habitación</th><td>${esc(Store.roomType(r.roomType).name)}</td></tr>
      <tr><th>Tarifa</th><td>${esc(Store.rate(r.rateCode)?.name || r.rateCode)} · ${money(r.rate)} por noche + IVA</td></tr>
      <tr><th>Huéspedes</th><td>${r.adults} adulto(s), ${r.children || 0} niño(s)</td></tr>
      <tr><th>Garantía</th><td>${esc(r.guarantee)}</td></tr></table>
      <p>${esc(h.name)} · ${esc(h.address)}, ${esc(h.city)} · ${esc(h.phone)} · ${esc(h.email)}</p>`);
  }
};

/* ---------- Disponibilidad ---------- */
Views.availability = {
  title: 'Disponibilidad',
  render(el, q) {
    const s = Store.state, start = q.start || s.businessDate, days = D.range(start, D.add(start, 14));
    el.innerHTML = `
      ${UI.header('Disponibilidad por tipo de habitación', `
        <a class="btn btn-sm" href="#/availability?start=${D.add(start, -14)}">◀ 14 días</a>
        <input type="date" id="av-start" value="${start}">
        <a class="btn btn-sm" href="#/availability?start=${D.add(start, 14)}">14 días ▶</a>`)}
      <section class="panel">
        <div class="table-wrap"><table class="grid avail">
          <thead><tr><th>Tipo</th>${days.map(d => `<th class="${d === s.businessDate ? 'today' : ''}">${D.dow(d)}<br>${D.short(d)}</th>`).join('')}</tr></thead>
          <tbody>
            ${s.roomTypes.map(t => `<tr><th>${t.code}<small> ${esc(t.name)} (${Store.roomsOfType(t.code).length})</small></th>${days.map(d => {
              const a = Store.availability(t.code, d);
              return `<td class="num av ${a <= 0 ? 'av-0' : a <= 2 ? 'av-low' : ''}" data-type="${t.code}" data-date="${d}" title="Clic para reservar">${a}</td>`;
            }).join('')}</tr>`).join('')}
            <tr class="tot"><th>Total disponible</th>${days.map(d => `<td class="num">${s.roomTypes.reduce((t, x) => t + Store.availability(x.code, d), 0)}</td>`).join('')}</tr>
            <tr class="tot"><th>% ocupación</th>${days.map(d => `<td class="num">${Store.stats(d).occPct.toFixed(0)}%</td>`).join('')}</tr>
          </tbody></table></div>
        <p class="muted small">Haga clic en una celda para crear una reserva con ese tipo y fecha.</p>
      </section>
      <section class="panel"><h2>Tarifas vigentes</h2>
        ${UI.table([{ label: 'Código', val: r => r.code }, { label: 'Nombre', val: r => r.name }, ...s.roomTypes.map(t => ({ label: t.code, cls: 'num', val: r => money(r.prices[t.code]) }))], s.rateCodes.filter(r => r.active))}
      </section>`;
    $('#av-start').onchange = e => { location.hash = `#/availability?start=${e.target.value}`; };
    $$('td.av', el).forEach(td => td.onclick = () => {
      if (td.dataset.date < s.businessDate) return;
      location.hash = `#/reservation?type=${td.dataset.type}&arrival=${td.dataset.date}`;
    });
  }
};

/* ---------- Rack de reservas (tape chart) ---------- */
Views.rack = {
  title: 'Rack de reservas',
  render(el, q) {
    const s = Store.state, start = q.start || D.add(s.businessDate, -1), N = 21;
    const days = D.range(start, D.add(start, N)), end = D.add(start, N);
    const typeF = q.type || '';
    const rooms = s.rooms.filter(r => !typeF || r.type === typeF);
    const unassigned = s.reservations.filter(r => r.status === 'reserved' && !r.room && r.arrival < end && r.departure > start);
    const canBook = App.can('reservation');

    el.innerHTML = `
      ${UI.header('Rack de reservas', `
        <select id="rk-type"><option value="">Todos los tipos</option>${options(s.roomTypes, typeF)}</select>
        <a class="btn btn-sm" href="#/rack?start=${D.add(start, -7)}&type=${typeF}">◀ Semana</a>
        <a class="btn btn-sm" href="#/rack?type=${typeF}">Hoy</a>
        <a class="btn btn-sm" href="#/rack?start=${D.add(start, 7)}&type=${typeF}">Semana ▶</a>`)}
      <div class="legend"><span class="lg st-reserved">Reservada</span><span class="lg st-inhouse">En casa</span><span class="lg st-checkedout">Salida</span><span class="lg lg-ooo">Fuera de orden</span></div>
      <section class="panel rack-wrap">
        <div class="rack" style="--days:${N}">
          <div class="rk-head rk-room">Hab.</div>
          ${days.map(d => `<div class="rk-head ${d === s.businessDate ? 'today' : ''} ${['Sáb', 'Dom'].includes(D.dow(d)) ? 'we' : ''}">${D.dow(d)}<br>${D.short(d)}</div>`).join('')}
          ${rooms.map((rm, i) => {
            const row = i + 2;
            const resv = s.reservations.filter(r => r.room === rm.no && ['reserved', 'inhouse', 'checkedout'].includes(r.status) && r.arrival < end && r.departure > start);
            const cells = days.map((d, j) => `<div class="rk-cell ${d === s.businessDate ? 'today' : ''}" style="grid-row:${row};grid-column:${j + 2}" data-room="${rm.no}" data-date="${d}"></div>`).join('');
            const bars = resv.map(r => {
              const a = Math.max(0, D.diff(start, r.arrival)), b = Math.min(N, D.diff(start, r.departure));
              return `<a class="rk-bar st-${r.status}" href="#/reservation?id=${r.id}" style="grid-row:${row};grid-column:${a + 2}/${b + 2}" title="${esc(Store.guestName(r.guestId))} · ${D.fmt(r.arrival)}–${D.fmt(r.departure)} · ${r.rateCode}">${esc(Store.guest(r.guestId)?.last || '')}</a>`;
            }).join('');
            const ooo = rm.ooo && rm.ooo.from < end && rm.ooo.to > start ? (() => {
              const a = Math.max(0, D.diff(start, rm.ooo.from)), b = Math.min(N, D.diff(start, rm.ooo.to));
              return `<div class="rk-bar lg-ooo" style="grid-row:${row};grid-column:${a + 2}/${b + 2}" title="${esc(rm.ooo.reason)}">OOO</div>`;
            })() : '';
            return `<div class="rk-room" style="grid-row:${row}"><b>${rm.no}</b> <small>${rm.type}</small> <i class="dot hk-${rm.hk}" title="${HK_LABEL[rm.hk]}"></i></div>${cells}${bars}${ooo}`;
          }).join('')}
        </div>
      </section>
      <section class="panel"><h2>Reservas sin habitación asignada en el periodo (${unassigned.length})</h2>
        ${UI.table(UI.resRowCols(), unassigned.sort((a, b) => a.arrival.localeCompare(b.arrival)), { empty: 'Todas las reservas tienen habitación asignada' })}
      </section>`;
    $('#rk-type').onchange = e => { location.hash = `#/rack?start=${start}&type=${e.target.value}`; };
    if (canBook) $$('.rk-cell', el).forEach(c => c.ondblclick = () => {
      if (c.dataset.date < s.businessDate) return;
      location.hash = `#/reservation?room=${c.dataset.room}&arrival=${c.dataset.date}`;
    });
  }
};
