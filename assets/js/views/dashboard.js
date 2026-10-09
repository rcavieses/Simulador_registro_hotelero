'use strict';

Views.dashboard = {
  title: 'Inicio',
  render(el) {
    const s = Store.state, bd = s.businessDate, st = Store.stats(bd);
    const chk = Store.auditChecks();
    const arrPend = chk.arrivals, depPend = chk.departures;
    const rooms = s.rooms;
    const cnt = (fo, hks) => rooms.filter(r => r.fo === fo && hks.includes(r.hk)).length;
    const forecast = Array.from({ length: 14 }, (_, i) => Store.stats(D.add(bd, i)));

    el.innerHTML = `
      ${UI.header(`Bienvenido, ${App.user.name}`, `<span class="muted">${D.dow(bd)} ${D.fmt(bd)} · ${esc(s.hotel.city)}</span>`)}
      <div class="kpis">
        ${UI.kpi('Ocupación hoy', `${st.occPct.toFixed(1)}%`, `${st.occupied} de ${st.total - st.ooo} hab.`)}
        ${UI.kpi('Llegadas', `${arrPend.length}`, `pendientes de ${st.arrivals}`)}
        ${UI.kpi('Salidas', `${depPend.length}`, `pendientes de ${st.departures}`)}
        ${UI.kpi('En casa', `${s.reservations.filter(r => r.status === 'inhouse').length}`, `${st.persons} personas`)}
        ${UI.kpi('ADR', money(st.adr), 'tarifa promedio')}
        ${UI.kpi('RevPAR', money(st.revpar), 'ingreso por hab. disp.')}
      </div>
      <div class="cols-3">
        <section class="panel">
          <h2>Estado de habitaciones</h2>
          <div class="hk-summary">
            <a href="#/roomplan?f=vc" class="hks hk-clean"><b>${cnt('vacant', ['clean', 'inspected'])}</b>Vacías limpias</a>
            <a href="#/roomplan?f=vd" class="hks hk-dirty"><b>${cnt('vacant', ['dirty'])}</b>Vacías sucias</a>
            <a href="#/roomplan?f=oc" class="hks hk-occ"><b>${cnt('occupied', ['clean', 'inspected'])}</b>Ocupadas limpias</a>
            <a href="#/roomplan?f=od" class="hks hk-occd"><b>${cnt('occupied', ['dirty'])}</b>Ocupadas sucias</a>
            <a href="#/ooo" class="hks hk-ooo"><b>${rooms.filter(r => ['ooo', 'oos'].includes(r.hk)).length}</b>Fuera de orden/servicio</a>
          </div>
        </section>
        <section class="panel span-2">
          <h2>Pronóstico de ocupación · 14 días</h2>
          <div class="bars">
            ${forecast.map(f => `<div class="bar" title="${D.fmt(f.date)}: ${f.occupied} hab. (${f.occPct.toFixed(0)}%)">
              <div class="bar-fill ${f.occPct >= 85 ? 'hi' : f.occPct >= 60 ? 'mid' : ''}" style="height:${Math.min(100, f.occPct)}%"></div>
              <span class="bar-val">${f.occPct.toFixed(0)}%</span><span class="bar-lbl">${D.dow(f.date)}<br>${D.short(f.date)}</span></div>`).join('')}
          </div>
        </section>
      </div>
      <div class="cols-2">
        <section class="panel">
          <h2>Llegadas pendientes <a class="small" href="#/arrivals">ver todas</a></h2>
          ${UI.table([
            { label: 'Huésped', html: r => `<a href="#/reservation?id=${r.id}">${esc(Store.guestName(r.guestId))}</a> ${UI.vip(Store.guest(r.guestId))}` },
            { label: 'Tipo', val: r => r.roomType }, { label: 'Hab.', val: r => r.room || '—' },
            { label: 'ETA', val: r => r.eta || '' }, { label: 'Noches', cls: 'num', val: r => D.diff(r.arrival, r.departure) }
          ], arrPend.slice(0, 8), { empty: 'No hay llegadas pendientes' })}
        </section>
        <section class="panel">
          <h2>Salidas pendientes <a class="small" href="#/departures">ver todas</a></h2>
          ${UI.table([
            { label: 'Hab.', val: r => r.room },
            { label: 'Huésped', html: r => `<a href="#/folio?id=${r.id}">${esc(Store.guestName(r.guestId))}</a>` },
            { label: 'Saldo', cls: 'num', val: r => money(Store.balance(r.id)) }
          ], depPend.slice(0, 8), { empty: 'No hay salidas pendientes' })}
        </section>
      </div>
      <section class="panel">
        <h2>Actividad reciente</h2>
        ${UI.table([
          { label: 'Fecha/hora', val: l => l.at }, { label: 'Usuario', val: l => l.user },
          { label: 'Acción', val: l => l.action }, { label: 'Ref.', val: l => l.ref }
        ], s.log.slice(0, 8))}
      </section>`;
  }
};
