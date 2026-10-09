'use strict';

const FrontDesk = {
  checkInDialog(res) {
    const s = Store.state, g = Store.guest(res.guestId);
    const roomOpts = showAll => {
      const list = Store.freeRooms(showAll ? '' : res.roomType, res.arrival, res.departure, res.id).filter(r => r.fo === 'vacant');
      return list.map(r => `<option value="${r.no}" ${r.no === res.room ? 'selected' : ''}>${r.no} · ${r.type} · ${HK_LABEL[r.hk]}</option>`).join('');
    };
    Modal.open({
      title: `Check-in · ${res.conf}`,
      body: `
        <div class="gcard"><b>${esc(g.last)}, ${esc(g.first)}</b> ${UI.vip(g)}<div class="small">${D.fmt(res.arrival)} → ${D.fmt(res.departure)} · ${D.diff(res.arrival, res.departure)} noche(s) · ${res.roomType} · ${res.rateCode} ${money(res.rate)}</div>
        ${res.specials ? `<div class="small">Peticiones: ${esc(res.specials)}</div>` : ''}</div>
        <form id="ci-form">
          <label>Habitación<select name="room" id="ci-room">${roomOpts(false)}</select></label>
          <label class="check"><input type="checkbox" id="ci-all"> Mostrar otros tipos (upgrade)</label>
          <div id="ci-warn" class="hint"></div>
          <div class="f2">
            <label>Documento<input name="doc" value="${esc(g.doc)}" required></label>
            <label>Nacionalidad<input name="nationality" value="${esc(g.nationality)}"></label>
          </div>
          <label class="check"><input type="checkbox" name="card" value="1" checked> Imprimir tarjeta de registro</label>
        </form>`,
      footer: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="ci-ok">Registrar llegada</button>`,
      onMount(m, close) {
        const sel = $('#ci-room', m);
        const warn = () => {
          const rm = Store.room(sel.value);
          $('#ci-warn', m).innerHTML = !rm ? '<span class="neg">No hay habitaciones vacías disponibles de este tipo.</span>'
            : rm.hk === 'dirty' ? '<span class="neg">Atención: la habitación está SUCIA.</span>'
            : rm.type !== res.roomType ? `Upgrade/cambio de tipo: ${res.roomType} → ${rm.type}` : `Habitación ${HK_LABEL[rm.hk].toLowerCase()}.`;
        };
        $('#ci-all', m).onchange = e => { sel.innerHTML = roomOpts(e.target.checked); warn(); };
        sel.onchange = warn; warn();
        $('#ci-ok', m).onclick = () => {
          const d = formData($('#ci-form', m));
          if (!d.room) { toast('Seleccione una habitación', 'error'); return; }
          try {
            g.doc = d.doc; g.nationality = d.nationality;
            const rm = Store.room(d.room);
            if (rm.type !== res.roomType) res.roomType = rm.type;
            Store.checkIn(res.id, d.room);
            close();
            toast(`Check-in realizado · Habitación ${d.room}`, 'ok');
            if (d.card) FrontDesk.printRegCard(res);
            App.refresh();
          } catch (e) { toast(e.message, 'error'); }
        };
      }
    });
  },

  printRegCard(res) {
    const g = Store.guest(res.guestId), c = Store.company(res.companyId);
    printHTML('Tarjeta de registro', `
      <table class="kv"><tr><th>Confirmación</th><td>${esc(res.conf)}</td><th>Habitación</th><td>${esc(res.room)}</td></tr>
      <tr><th>Apellidos</th><td>${esc(g.last)}</td><th>Nombre</th><td>${esc(g.first)}</td></tr>
      <tr><th>Documento</th><td>${esc(g.docType)} ${esc(g.doc)}</td><th>Nacionalidad</th><td>${esc(g.nationality)}</td></tr>
      <tr><th>Email</th><td>${esc(g.email)}</td><th>Teléfono</th><td>${esc(g.phone)}</td></tr>
      <tr><th>Llegada</th><td>${D.fmt(res.arrival)}</td><th>Salida</th><td>${D.fmt(res.departure)}</td></tr>
      <tr><th>Tarifa</th><td>${esc(res.rateCode)} ${money(res.rate)}</td><th>Empresa</th><td>${esc(c?.name || '')}</td></tr></table>
      <p class="small">Declaro conocer y aceptar las políticas del hotel. Check-out ${esc(Store.state.hotel.checkOut)} h.</p>
      <p style="margin-top:60px">______________________________<br>Firma del huésped</p>`);
  },

  checkOutDialog(res) {
    const bal = Store.balance(res.id);
    if (Math.abs(bal) > 0.004) {
      toast(`Saldo pendiente ${money(bal)}. Liquide el folio antes del check-out.`, 'error');
      location.hash = `#/folio?id=${res.id}&settle=1`;
      return;
    }
    const early = res.departure > Store.state.businessDate;
    Modal.confirm('Check-out', `¿Confirmar salida de <b>${esc(Store.guestName(res.guestId))}</b> de la habitación <b>${esc(res.room)}</b>?${early ? '<br><span class="neg">Salida anticipada: la fecha de salida se ajustará a hoy.</span>' : ''}`, () => {
      try { Store.checkOut(res.id); toast(`Check-out realizado · Hab. ${res.room}`, 'ok'); App.refresh(); } catch (e) { toast(e.message, 'error'); }
    }, 'Check-out');
  },

  moveDialog(res) {
    const free = Store.freeRooms('', Store.state.businessDate, res.departure, res.id).filter(r => r.fo === 'vacant' && r.no !== res.room);
    Modal.open({
      title: `Cambio de habitación · ${res.room}`,
      body: `<form id="mv-form"><label>Nueva habitación<select name="room">${free.map(r => `<option value="${r.no}">${r.no} · ${r.type} · ${HK_LABEL[r.hk]}</option>`).join('')}</select></label>
        <label>Motivo<input name="reason" placeholder="Ej.: ruido, upgrade, mantenimiento"></label></form>`,
      footer: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="mv-ok">Mover</button>`,
      onMount(m, close) {
        $('#mv-ok', m).onclick = () => {
          const d = formData($('#mv-form', m));
          try { Store.moveRoom(res.id, d.room, d.reason); close(); toast(`Huésped movido a ${d.room}`, 'ok'); App.refresh(); } catch (e) { toast(e.message, 'error'); }
        };
      }
    });
  },

  bindActions(el, list) {
    $$('[data-act]', el).forEach(b => b.onclick = () => {
      const res = list.find(r => r.id === b.dataset.id);
      ({ ci: FrontDesk.checkInDialog, co: FrontDesk.checkOutDialog, mv: FrontDesk.moveDialog, card: FrontDesk.printRegCard })[b.dataset.act](res);
    });
  }
};

Views.arrivals = {
  title: 'Llegadas',
  render(el, q) {
    const s = Store.state, bd = s.businessDate;
    const all = s.reservations.filter(r => r.arrival === bd && ['reserved', 'inhouse'].includes(r.status));
    const showDone = q.done === '1';
    const list = all.filter(r => showDone || r.status === 'reserved').sort((a, b) => (a.eta || '99').localeCompare(b.eta || '99'));
    el.innerHTML = `
      ${UI.header(`Llegadas · ${D.fmt(bd)}`, `
        <a class="btn btn-sm" href="#/arrivals${showDone ? '' : '?done=1'}">${showDone ? 'Ocultar registradas' : 'Mostrar registradas'}</a>
        <a class="btn btn-primary" href="#/walkin">Walk-in</a>`)}
      <div class="kpis">${UI.kpi('Esperadas', all.length)}${UI.kpi('Pendientes', all.filter(r => r.status === 'reserved').length)}${UI.kpi('Registradas', all.filter(r => r.status === 'inhouse').length)}
        ${UI.kpi('Sin habitación', all.filter(r => !r.room).length)}${UI.kpi('VIP', all.filter(r => Store.guest(r.guestId)?.vip).length)}</div>
      <section class="panel">
        ${UI.table([...UI.resRowCols().filter(c => !['Llegada', 'Estado'].includes(c.label)),
          { label: 'ETA', val: r => r.eta || '' },
          { label: 'Hab. estado', html: r => r.room ? UI.hkTag(Store.room(r.room).hk) : '' },
          { label: 'Acciones', html: r => r.status === 'reserved'
            ? `<button class="btn btn-sm btn-primary" data-act="ci" data-id="${r.id}">Check-in</button>`
            : `${UI.statusTag(r.status)} <button class="btn btn-sm" data-act="card" data-id="${r.id}">Tarjeta</button>` }
        ], list, { empty: 'No hay llegadas pendientes para hoy' })}
      </section>`;
    FrontDesk.bindActions(el, list);
  }
};

Views.inhouse = {
  title: 'Huéspedes en casa',
  render(el, q) {
    const s = Store.state;
    const term = (q.q || '').toLowerCase();
    const list = s.reservations.filter(r => r.status === 'inhouse' && (!term || `${Store.guestName(r.guestId)} ${r.room}`.toLowerCase().includes(term)))
      .sort((a, b) => a.room.localeCompare(b.room));
    el.innerHTML = `
      ${UI.header('Huéspedes en casa', `<input id="ih-q" placeholder="Filtrar nombre/hab." value="${esc(q.q || '')}">`)}
      <section class="panel">
        <p class="muted small">${list.length} habitación(es) ocupada(s) · ${list.reduce((t, r) => t + r.adults + (r.children || 0), 0)} persona(s)</p>
        ${UI.table([
          { label: 'Hab.', html: r => `<b>${esc(r.room)}</b>` },
          { label: 'Huésped', html: r => `<a href="#/reservation?id=${r.id}">${esc(Store.guestName(r.guestId))}</a> ${UI.vip(Store.guest(r.guestId))}` },
          { label: 'Empresa', val: r => Store.company(r.companyId)?.name || '' },
          { label: 'Llegada', val: r => D.fmt(r.arrival) }, { label: 'Salida', val: r => D.fmt(r.departure) },
          { label: 'Tarifa', val: r => `${r.rateCode} ${money(r.rate)}` },
          { label: 'Saldo', cls: 'num', html: r => { const b = Store.balance(r.id); return `<span class="${b > 0 ? 'neg' : ''}">${money(b)}</span>`; } },
          { label: 'Acciones', html: r => `<a class="btn btn-sm" href="#/folio?id=${r.id}">Folio</a>
            <button class="btn btn-sm" data-act="mv" data-id="${r.id}">Mover</button>
            <a class="btn btn-sm" href="#/reservation?id=${r.id}">Extender</a>` }
        ], list, { empty: 'No hay huéspedes en casa' })}
      </section>`;
    $('#ih-q').onkeydown = e => { if (e.key === 'Enter') location.hash = `#/inhouse?q=${encodeURIComponent(e.target.value)}`; };
    FrontDesk.bindActions(el, list);
  }
};

Views.departures = {
  title: 'Salidas',
  render(el) {
    const s = Store.state, bd = s.businessDate;
    const pending = s.reservations.filter(r => r.status === 'inhouse' && r.departure <= bd).sort((a, b) => a.room.localeCompare(b.room));
    const done = s.reservations.filter(r => r.status === 'checkedout' && r.departure === bd);
    el.innerHTML = `
      ${UI.header(`Salidas · ${D.fmt(bd)}`)}
      <div class="kpis">${UI.kpi('Pendientes', pending.length)}${UI.kpi('Realizadas', done.length)}${UI.kpi('Saldo pendiente', money(pending.reduce((t, r) => t + Store.balance(r.id), 0)))}</div>
      <section class="panel"><h2>Pendientes de salida</h2>
        ${UI.table([
          { label: 'Hab.', html: r => `<b>${esc(r.room)}</b>` },
          { label: 'Huésped', html: r => `<a href="#/reservation?id=${r.id}">${esc(Store.guestName(r.guestId))}</a>` },
          { label: 'Llegada', val: r => D.fmt(r.arrival) }, { label: 'Noches', cls: 'num', val: r => D.diff(r.arrival, r.departure) },
          { label: 'Saldo', cls: 'num', html: r => { const b = Store.balance(r.id); return `<b class="${b > 0 ? 'neg' : 'pos'}">${money(b)}</b>`; } },
          { label: 'Acciones', html: r => `<a class="btn btn-sm" href="#/folio?id=${r.id}">Folio</a> <button class="btn btn-sm btn-primary" data-act="co" data-id="${r.id}">Check-out</button>` }
        ], pending, { empty: 'No hay salidas pendientes' })}
      </section>
      <section class="panel"><h2>Salidas realizadas</h2>
        ${UI.table([
          { label: 'Hab.', val: r => r.room }, { label: 'Huésped', html: r => `<a href="#/folio?id=${r.id}">${esc(Store.guestName(r.guestId))}</a>` },
          { label: 'Check-out', val: r => r.checkedOutAt }, { label: 'Estado HK', html: r => UI.hkTag(Store.room(r.room).hk) }
        ], done, { empty: 'Aún no hay salidas' })}
      </section>`;
    FrontDesk.bindActions(el, pending);
  }
};

Views.walkin = {
  title: 'Walk-in',
  render(el, q) { Views.reservation.render(el, { ...q, walkin: '1', arrival: Store.state.businessDate }); }
};

/* ---------- Plano de habitaciones ---------- */
Views.roomplan = {
  title: 'Plano de habitaciones',
  render(el, q) {
    const s = Store.state, f = q.f || '';
    const match = r => !f || (f === 'vc' && r.fo === 'vacant' && ['clean', 'inspected'].includes(r.hk)) || (f === 'vd' && r.fo === 'vacant' && r.hk === 'dirty')
      || (f === 'oc' && r.fo === 'occupied' && ['clean', 'inspected'].includes(r.hk)) || (f === 'od' && r.fo === 'occupied' && r.hk === 'dirty');
    const floors = [...new Set(s.rooms.map(r => r.floor))];
    const bd = s.businessDate;
    el.innerHTML = `
      ${UI.header('Plano de habitaciones', `
        ${[['', 'Todas'], ['vc', 'Vacías limpias'], ['vd', 'Vacías sucias'], ['oc', 'Ocupadas limpias'], ['od', 'Ocupadas sucias']].map(([k, v]) => `<a class="btn btn-sm ${f === k ? 'btn-primary' : ''}" href="#/roomplan?f=${k}">${v}</a>`).join('')}`)}
      <div class="legend"><span class="lg hk-inspected">Inspeccionada</span><span class="lg hk-clean">Limpia</span><span class="lg hk-dirty">Sucia</span><span class="lg hk-ooo">Fuera de orden</span><span class="lg hk-oos">Fuera de servicio</span><span class="lg occ">● Ocupada</span><span class="lg">↘ Sale hoy</span><span class="lg">↗ Llega hoy</span></div>
      ${floors.map(fl => `<section class="panel"><h2>Piso ${fl}</h2><div class="tiles">
        ${s.rooms.filter(r => r.floor === fl).map(r => {
          const ih = Store.inhouseByRoom(r.no);
          const arr = s.reservations.find(x => x.room === r.no && x.status === 'reserved' && x.arrival === bd);
          return `<button class="tile hk-${r.hk} ${r.fo} ${match(r) ? '' : 'dim'}" data-no="${r.no}">
            <b>${r.no}</b><small>${r.type}</small>
            <span class="tile-g">${ih ? esc(Store.guest(ih.guestId).last) : arr ? '↗ ' + esc(Store.guest(arr.guestId).last) : '&nbsp;'}</span>
            <span class="tile-s">${r.fo === 'occupied' ? '●' : '○'} ${HK_LABEL[r.hk]}${ih && ih.departure <= bd ? ' ↘' : ''}</span></button>`;
        }).join('')}</div></section>`).join('')}`;
    $$('.tile', el).forEach(t => t.onclick = () => Views.roomplan.roomDialog(t.dataset.no));
  },

  roomDialog(no) {
    const rm = Store.room(no), t = Store.roomType(rm.type), ih = Store.inhouseByRoom(no), s = Store.state;
    const next = s.reservations.filter(r => r.room === no && r.status === 'reserved').sort((a, b) => a.arrival.localeCompare(b.arrival))[0];
    const canHK = App.can('housekeeping');
    Modal.open({
      title: `Habitación ${no} · ${t.name}`,
      body: `
        <table class="kv"><tr><th>Tipo</th><td>${esc(t.code)} – ${esc(t.name)} (${esc(t.beds)})</td></tr>
        <tr><th>Estado FO</th><td>${rm.fo === 'occupied' ? 'Ocupada' : 'Vacía'}</td></tr>
        <tr><th>Estado HK</th><td>${UI.hkTag(rm.hk)}</td></tr>
        <tr><th>Camarera</th><td>${esc(rm.attendant)}</td></tr>
        ${rm.ooo ? `<tr><th>Fuera de orden</th><td>${D.fmt(rm.ooo.from)} – ${D.fmt(rm.ooo.to)}: ${esc(rm.ooo.reason)}</td></tr>` : ''}
        <tr><th>Huésped actual</th><td>${ih ? `<a href="#/reservation?id=${ih.id}">${esc(Store.guestName(ih.guestId))}</a> hasta ${D.fmt(ih.departure)}` : '—'}</td></tr>
        <tr><th>Próxima llegada</th><td>${next ? `<a href="#/reservation?id=${next.id}">${esc(Store.guestName(next.guestId))}</a> ${D.fmt(next.arrival)}` : '—'}</td></tr>
        ${rm.note ? `<tr><th>Nota</th><td>${esc(rm.note)}</td></tr>` : ''}</table>
        ${canHK ? `<div class="row-btns">${['inspected', 'clean', 'dirty'].map(h => `<button class="btn btn-sm hkb" data-hk="${h}">${HK_LABEL[h]}</button>`).join('')}</div>` : ''}`,
      footer: `${ih && App.can('folio') ? `<a class="btn" href="#/folio?id=${ih.id}">Folio</a>` : ''}
        ${!ih && App.can('reservation') && !rm.ooo ? `<a class="btn btn-primary" href="#/walkin?room=${no}">Walk-in en esta hab.</a>` : ''}
        <button class="btn" data-close>Cerrar</button>`,
      onMount(m, close) {
        $$('a', m).forEach(a => a.addEventListener('click', close));
        $$('.hkb', m).forEach(b => b.onclick = () => {
          try { Store.setHK(no, b.dataset.hk); close(); toast(`Hab. ${no}: ${HK_LABEL[b.dataset.hk]}`, 'ok'); App.refresh(); } catch (e) { toast(e.message, 'error'); }
        });
      }
    });
  }
};
