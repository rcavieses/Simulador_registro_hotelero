'use strict';

const Profiles = {
  /* Selector de perfil de huésped (usado desde reservas) */
  pick(onPick) {
    const s = Store.state;
    Modal.open({
      title: 'Buscar perfil de huésped', wide: true,
      body: `<input id="pk-q" placeholder="Apellido, nombre, email o documento"><div id="pk-res"></div>`,
      footer: `<button class="btn" id="pk-new">Nuevo perfil</button><button class="btn" data-close>Cerrar</button>`,
      onMount(m, close) {
        const run = () => {
          const t = $('#pk-q', m).value.toLowerCase();
          const list = s.guests.filter(g => !t || `${g.last} ${g.first} ${g.email} ${g.doc}`.toLowerCase().includes(t)).slice(0, 30);
          $('#pk-res', m).innerHTML = UI.table([
            { label: 'Nombre', html: g => `<b>${esc(g.last)}, ${esc(g.first)}</b> ${UI.vip(g)}` },
            { label: 'Email', val: g => g.email }, { label: 'Doc.', val: g => g.doc }, { label: 'País', val: g => g.nationality },
            { label: '', html: g => `<button class="btn btn-sm btn-primary" data-g="${g.id}">Seleccionar</button>` }
          ], list, { empty: 'Sin coincidencias' });
          $$('[data-g]', m).forEach(b => b.onclick = () => { close(); onPick(Store.guest(b.dataset.g)); });
        };
        $('#pk-q', m).oninput = run; run();
        $('#pk-new', m).onclick = () => { close(); Profiles.edit(null, onPick); };
      }
    });
  },

  edit(g, onSave) {
    const s = Store.state, x = g || { first: '', last: '', email: '', phone: '', docType: 'Pasaporte', doc: '', nationality: 'Chile', birth: '', address: '', city: '', vip: '', companyId: '', prefs: '', notes: '' };
    Modal.open({
      title: g ? `Perfil · ${g.last}, ${g.first}` : 'Nuevo perfil de huésped', wide: true,
      body: `<form id="pf-form" class="f3">
        <label>Apellidos*<input name="last" value="${esc(x.last)}" required></label>
        <label>Nombre*<input name="first" value="${esc(x.first)}" required></label>
        <label>VIP<select name="vip">${['', 'VIP1', 'VIP2', 'VIP3'].map(v => `<option ${v === x.vip ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label>Email<input type="email" name="email" value="${esc(x.email)}"></label>
        <label>Teléfono<input name="phone" value="${esc(x.phone)}"></label>
        <label>Fecha nac.<input type="date" name="birth" value="${esc(x.birth)}"></label>
        <label>Tipo doc.<select name="docType">${['Pasaporte', 'DNI / Cédula', 'RUT', 'Licencia'].map(v => `<option ${v === x.docType ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label>Nº documento<input name="doc" value="${esc(x.doc)}"></label>
        <label>Nacionalidad<input name="nationality" value="${esc(x.nationality)}"></label>
        <label>Dirección<input name="address" value="${esc(x.address)}"></label>
        <label>Ciudad<input name="city" value="${esc(x.city)}"></label>
        <label>Empresa<select name="companyId"><option value="">—</option>${options(s.companies.filter(c => c.kind === 'empresa'), x.companyId, 'id', c => c.name)}</select></label>
        <label class="span-all">Preferencias<input name="prefs" value="${esc(x.prefs)}" placeholder="Piso alto, almohada extra..."></label>
        <label class="span-all">Notas<textarea name="notes" rows="2">${esc(x.notes)}</textarea></label>
      </form>`,
      footer: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="pf-ok">Guardar</button>`,
      onMount(m, close) {
        $('#pf-ok', m).onclick = () => {
          const f = $('#pf-form', m);
          if (!f.reportValidity()) return;
          const d = formData(f);
          let gg;
          if (g) { Object.assign(g, d); gg = g; Store.log('Perfil modificado', `${g.last}, ${g.first}`); }
          else {
            const dup = s.guests.find(o => o.email && d.email && o.email.toLowerCase() === d.email.toLowerCase());
            if (dup) { toast(`Ya existe un perfil con ese email: ${dup.last}, ${dup.first}`, 'error'); return; }
            gg = { id: Store.id('G'), createdAt: s.businessDate, ...d };
            s.guests.push(gg);
            Store.log('Perfil creado', `${gg.last}, ${gg.first}`);
          }
          Store.save(); close(); toast('Perfil guardado', 'ok');
          if (onSave) onSave(gg);
        };
      }
    });
  }
};

Views.profiles = {
  title: 'Perfiles de huéspedes',
  render(el, q) {
    const s = Store.state, t = (q.q || '').toLowerCase();
    const stays = id => s.reservations.filter(r => r.guestId === id && ['checkedout', 'inhouse'].includes(r.status)).length;
    const list = s.guests.filter(g => !t || `${g.last} ${g.first} ${g.email} ${g.doc} ${g.nationality}`.toLowerCase().includes(t))
      .sort((a, b) => a.last.localeCompare(b.last));
    el.innerHTML = `
      ${UI.header('Perfiles de huéspedes', `<input id="pf-q" placeholder="Buscar..." value="${esc(q.q || '')}"><button class="btn btn-primary" id="pf-new">+ Nuevo perfil</button>`)}
      <section class="panel"><p class="muted small">${list.length} perfil(es)</p>
        ${UI.table([
          { label: 'Nombre', html: g => `<a href="#/profile?id=${g.id}"><b>${esc(g.last)}, ${esc(g.first)}</b></a> ${UI.vip(g)}` },
          { label: 'Email', val: g => g.email }, { label: 'Teléfono', val: g => g.phone }, { label: 'Documento', val: g => g.doc },
          { label: 'Nacionalidad', val: g => g.nationality }, { label: 'Empresa', val: g => Store.company(g.companyId)?.name || '' },
          { label: 'Estadías', cls: 'num', val: g => stays(g.id) }
        ], list)}
      </section>`;
    $('#pf-q').onkeydown = e => { if (e.key === 'Enter') location.hash = `#/profiles?q=${encodeURIComponent(e.target.value)}`; };
    $('#pf-new').onclick = () => Profiles.edit(null, g => { location.hash = `#/profile?id=${g.id}`; });
  }
};

Views.profile = {
  title: 'Perfil',
  render(el, q) {
    const s = Store.state, g = Store.guest(q.id);
    if (!g) { el.innerHTML = UI.empty('Perfil no encontrado'); return; }
    const hist = s.reservations.filter(r => r.guestId === g.id).sort((a, b) => b.arrival.localeCompare(a.arrival));
    const done = hist.filter(r => r.status === 'checkedout');
    const revenue = done.reduce((t, r) => t + (s.folios[r.id] || []).filter(x => x.amount > 0 && x.code !== '8000').reduce((a, x) => a + x.amount, 0), 0);
    const nights = done.reduce((t, r) => t + D.diff(r.arrival, r.departure), 0);
    el.innerHTML = `
      ${UI.header(`${g.last}, ${g.first}`, `<button class="btn" id="pf-edit">Editar</button><a class="btn btn-primary" href="#/reservation?guest=${g.id}">Nueva reserva</a>`)}
      <div class="kpis">${UI.kpi('Estadías', done.length)}${UI.kpi('Noches', nights)}${UI.kpi('Ingresos', money(revenue))}${UI.kpi('Próximas', hist.filter(r => r.status === 'reserved').length)}</div>
      <div class="cols-2">
        <section class="panel"><h2>Datos</h2>
          <table class="kv"><tr><th>Email</th><td>${esc(g.email)}</td></tr><tr><th>Teléfono</th><td>${esc(g.phone)}</td></tr>
          <tr><th>Documento</th><td>${esc(g.docType)} ${esc(g.doc)}</td></tr><tr><th>Nacionalidad</th><td>${esc(g.nationality)}</td></tr>
          <tr><th>Nacimiento</th><td>${D.fmt(g.birth)}</td></tr><tr><th>Dirección</th><td>${esc(g.address)} ${esc(g.city)}</td></tr>
          <tr><th>Empresa</th><td>${esc(Store.company(g.companyId)?.name || '—')}</td></tr><tr><th>VIP</th><td>${esc(g.vip || '—')}</td></tr></table>
        </section>
        <section class="panel"><h2>Preferencias y notas</h2><p>${esc(g.prefs || 'Sin preferencias registradas')}</p><p class="muted">${esc(g.notes || '')}</p></section>
      </div>
      <section class="panel"><h2>Historial de reservas</h2>${UI.table(UI.resRowCols().filter(c => c.label !== 'Huésped'), hist, { empty: 'Sin reservas' })}</section>`;
    $('#pf-edit').onclick = () => Profiles.edit(g, () => App.refresh());
  }
};

Views.companies = {
  title: 'Empresas y agencias',
  render(el) {
    const s = Store.state;
    const prod = id => s.reservations.filter(r => (r.companyId === id || r.agentId === id) && r.status !== 'cancelled');
    el.innerHTML = `
      ${UI.header('Empresas y agencias', `<button class="btn btn-primary" id="co-new">+ Nueva</button>`)}
      <section class="panel">${UI.table([
        { label: 'Nombre', html: c => `<b>${esc(c.name)}</b>` }, { label: 'Tipo', val: c => c.kind }, { label: 'RUT / Tax ID', val: c => c.taxId },
        { label: 'Email', val: c => c.email }, { label: 'Tarifa', val: c => c.rate }, { label: 'Crédito (CxC)', val: c => c.ar ? 'Sí' : 'No' },
        { label: 'Reservas', cls: 'num', val: c => prod(c.id).length },
        { label: 'Room nights', cls: 'num', val: c => prod(c.id).reduce((t, r) => t + D.diff(r.arrival, r.departure), 0) },
        { label: '', html: c => `<button class="btn btn-sm" data-ed="${c.id}">Editar</button>` }
      ], s.companies)}</section>`;
    const edit = c => {
      const x = c || { kind: 'empresa', name: '', taxId: '', email: '', phone: '', rate: 'CORP', ar: false };
      Modal.open({
        title: c ? `Editar ${c.name}` : 'Nueva empresa / agencia',
        body: `<form id="co-form" class="f2">
          <label>Nombre*<input name="name" value="${esc(x.name)}" required></label>
          <label>Tipo<select name="kind"><option ${x.kind === 'empresa' ? 'selected' : ''}>empresa</option><option ${x.kind === 'agencia' ? 'selected' : ''}>agencia</option></select></label>
          <label>RUT / Tax ID<input name="taxId" value="${esc(x.taxId)}"></label>
          <label>Email<input name="email" value="${esc(x.email)}"></label>
          <label>Teléfono<input name="phone" value="${esc(x.phone)}"></label>
          <label>Tarifa negociada<select name="rate">${options(s.rateCodes, x.rate)}</select></label>
          <label class="check"><input type="checkbox" name="ar" value="1" ${x.ar ? 'checked' : ''}> Habilitada para crédito (City Ledger)</label></form>`,
        footer: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="co-ok">Guardar</button>`,
        onMount(m, close) {
          $('#co-ok', m).onclick = () => {
            const f = $('#co-form', m); if (!f.reportValidity()) return;
            const d = formData(f); d.ar = !!d.ar;
            if (c) Object.assign(c, d); else s.companies.push({ id: Store.id(d.kind === 'agencia' ? 'A' : 'C'), ...d });
            Store.log(c ? 'Empresa modificada' : 'Empresa creada', d.name); Store.save(); close(); App.refresh();
          };
        }
      });
    };
    $('#co-new').onclick = () => edit(null);
    $$('[data-ed]', el).forEach(b => b.onclick = () => edit(Store.company(b.dataset.ed)));
  }
};
