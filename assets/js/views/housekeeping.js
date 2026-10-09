'use strict';

Views.housekeeping = {
  title: 'Ama de llaves',
  render(el, q) {
    const s = Store.state, bd = s.businessDate;
    const resStatus = rm => {
      const ih = Store.inhouseByRoom(rm.no);
      if (ih) return ih.departure <= bd ? 'Salida' : 'Continúa';
      if (s.reservations.some(r => r.room === rm.no && r.status === 'reserved' && r.arrival === bd)) return 'Llegada';
      if (s.reservations.some(r => r.room === rm.no && r.status === 'checkedout' && r.departure === bd)) return 'Salió';
      return '';
    };
    const list = s.rooms.filter(r => (!q.floor || String(r.floor) === q.floor) && (!q.hk || r.hk === q.hk) && (!q.att || r.attendant === q.att) && (!q.fo || r.fo === q.fo));
    const count = hk => s.rooms.filter(r => r.hk === hk).length;
    el.innerHTML = `
      ${UI.header('Ama de llaves', `<button class="btn" id="hk-print">Hoja de trabajo</button>`)}
      <div class="kpis">${Object.keys(HK_LABEL).map(h => UI.kpi(HK_LABEL[h], count(h))).join('')}</div>
      <form class="filters panel" id="hk-f">
        <label>Piso<select name="floor"><option value="">Todos</option>${[1, 2, 3, 4].map(f => `<option ${q.floor == f ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
        <label>Estado HK<select name="hk"><option value="">Todos</option>${Object.entries(HK_LABEL).map(([k, v]) => `<option value="${k}" ${q.hk === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label>Estado FO<select name="fo"><option value="">Todos</option><option value="vacant" ${q.fo === 'vacant' ? 'selected' : ''}>Vacía</option><option value="occupied" ${q.fo === 'occupied' ? 'selected' : ''}>Ocupada</option></select></label>
        <label>Camarera<select name="att"><option value="">Todas</option>${s.attendants.map(a => `<option ${q.att === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select></label>
        <button class="btn">Filtrar</button>
      </form>
      <section class="panel">
        <div class="bulk">
          <label class="check"><input type="checkbox" id="hk-all"> Seleccionar todo</label>
          <span>Cambiar seleccionadas a:</span>
          ${['inspected', 'clean', 'dirty'].map(h => `<button class="btn btn-sm" data-bulk="${h}">${HK_LABEL[h]}</button>`).join('')}
          <span>Asignar a:</span><select id="hk-att">${s.attendants.map(a => `<option>${esc(a)}</option>`).join('')}</select><button class="btn btn-sm" id="hk-assign">Asignar</button>
        </div>
        ${UI.table([
          { label: '', html: r => `<input type="checkbox" class="hk-sel" value="${r.no}">` },
          { label: 'Hab.', html: r => `<b>${r.no}</b>` }, { label: 'Tipo', val: r => r.type }, { label: 'Piso', val: r => r.floor },
          { label: 'FO', val: r => r.fo === 'occupied' ? 'Ocupada' : 'Vacía' },
          { label: 'Estado HK', html: r => UI.hkTag(r.hk) },
          { label: 'Reserva', val: r => resStatus(r) },
          { label: 'Camarera', val: r => r.attendant },
          { label: 'Nota', html: r => `<input class="hk-note" data-no="${r.no}" value="${esc(r.note)}" placeholder="—">` },
          { label: 'Cambiar', html: r => ['ooo', 'oos'].includes(r.hk) ? '<a href="#/ooo">Gestionar</a>' : ['inspected', 'clean', 'dirty'].filter(h => h !== r.hk).map(h => `<button class="btn btn-xs" data-no="${r.no}" data-hk="${h}">${HK_LABEL[h]}</button>`).join(' ') }
        ], list)}
      </section>`;
    $('#hk-f').onsubmit = e => { e.preventDefault(); location.hash = '#/housekeeping?' + new URLSearchParams(formData(e.target)); };
    $('#hk-all').onchange = e => $$('.hk-sel', el).forEach(c => { c.checked = e.target.checked; });
    const selected = () => $$('.hk-sel:checked', el).map(c => c.value);
    $$('[data-bulk]', el).forEach(b => b.onclick = () => {
      const sel = selected().filter(no => !['ooo', 'oos'].includes(Store.room(no).hk));
      if (!sel.length) { toast('Seleccione habitaciones', 'error'); return; }
      sel.forEach(no => Store.setHK(no, b.dataset.bulk));
      toast(`${sel.length} habitación(es) → ${HK_LABEL[b.dataset.bulk]}`, 'ok'); App.refresh();
    });
    $('#hk-assign').onclick = () => {
      const sel = selected();
      if (!sel.length) { toast('Seleccione habitaciones', 'error'); return; }
      sel.forEach(no => { Store.room(no).attendant = $('#hk-att').value; });
      Store.save(); toast('Asignación actualizada', 'ok'); App.refresh();
    };
    $$('[data-hk]', el).forEach(b => b.onclick = () => { Store.setHK(b.dataset.no, b.dataset.hk); App.refresh(); });
    $$('.hk-note', el).forEach(i => i.onchange = () => { Store.room(i.dataset.no).note = i.value; Store.save(); toast(`Nota guardada (${i.dataset.no})`, 'ok'); });
    $('#hk-print').onclick = () => {
      printHTML('Hoja de trabajo de ama de llaves', s.attendants.map(a => {
        const rs = s.rooms.filter(r => r.attendant === a);
        return `<h4>${esc(a)} · ${rs.length} hab.</h4><table class="grid"><thead><tr><th>Hab.</th><th>Tipo</th><th>FO</th><th>HK</th><th>Reserva</th><th>Nota</th><th>Hecho</th></tr></thead><tbody>
          ${rs.map(r => `<tr><td>${r.no}</td><td>${r.type}</td><td>${r.fo === 'occupied' ? 'OC' : 'VA'}</td><td>${HK_LABEL[r.hk]}</td><td>${resStatus(r)}</td><td>${esc(r.note)}</td><td>☐</td></tr>`).join('')}</tbody></table>`;
      }).join(''));
    };
  }
};

Views.ooo = {
  title: 'Fuera de orden / servicio',
  render(el) {
    const s = Store.state, bd = s.businessDate;
    const list = s.rooms.filter(r => r.ooo || ['ooo', 'oos'].includes(r.hk));
    el.innerHTML = `
      ${UI.header('Fuera de orden / servicio')}
      <section class="panel"><h2>Bloquear habitación</h2>
        <form class="filters" id="ooo-f">
          <label>Habitación<select name="no">${s.rooms.map(r => `<option>${r.no}</option>`).join('')}</select></label>
          <label>Tipo<select name="kind"><option value="ooo">Fuera de orden (resta inventario)</option><option value="oos">Fuera de servicio (no resta)</option></select></label>
          <label>Desde<input type="date" name="from" value="${bd}"></label>
          <label>Hasta<input type="date" name="to" value="${D.add(bd, 2)}"></label>
          <label>Motivo<input name="reason" required placeholder="Ej.: pintura, plomería"></label>
          <button class="btn btn-primary">Bloquear</button>
        </form>
      </section>
      <section class="panel"><h2>Habitaciones bloqueadas</h2>
        ${UI.table([
          { label: 'Hab.', html: r => `<b>${r.no}</b>` }, { label: 'Tipo', val: r => r.type }, { label: 'Estado', html: r => UI.hkTag(r.hk) },
          { label: 'Desde', val: r => r.ooo ? D.fmt(r.ooo.from) : '' }, { label: 'Hasta', val: r => r.ooo ? D.fmt(r.ooo.to) : '' },
          { label: 'Motivo', val: r => r.ooo?.reason || r.note },
          { label: '', html: r => `<button class="btn btn-sm" data-rel="${r.no}">Liberar</button>` }
        ], list, { empty: 'No hay habitaciones bloqueadas' })}
      </section>`;
    $('#ooo-f').onsubmit = e => {
      e.preventDefault();
      const d = formData(e.target);
      try {
        if (d.kind === 'ooo') Store.setOOO(d.no, d.from, d.to, d.reason);
        else { Store.setHK(d.no, 'oos'); Store.room(d.no).note = d.reason; Store.save(); }
        toast(`Habitación ${d.no} bloqueada`, 'ok'); App.refresh();
      } catch (err) { toast(err.message, 'error'); }
    };
    $$('[data-rel]', el).forEach(b => b.onclick = () => { const rm = Store.room(b.dataset.rel); rm.ooo = null; Store.setHK(rm.no, 'dirty'); toast(`Habitación ${rm.no} liberada (queda sucia)`, 'ok'); App.refresh(); });
  }
};
