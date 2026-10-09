'use strict';

Views.cashier = {
  title: 'Facturación',
  render(el, q) {
    const s = Store.state, term = (q.q || '').toLowerCase();
    const filt = r => !term || `${Store.guestName(r.guestId)} ${r.room} ${r.conf}`.toLowerCase().includes(term);
    const inhouse = s.reservations.filter(r => r.status === 'inhouse' && filt(r)).sort((a, b) => a.room.localeCompare(b.room));
    const closed = s.reservations.filter(r => ['checkedout', 'noshow'].includes(r.status) && (s.folios[r.id] || []).length && filt(r))
      .sort((a, b) => b.departure.localeCompare(a.departure)).slice(0, 25);
    const cols = [
      { label: 'Hab.', html: r => `<b>${esc(r.room || '—')}</b>` },
      { label: 'Huésped', html: r => `<a href="#/folio?id=${r.id}">${esc(Store.guestName(r.guestId))}</a>` },
      { label: 'Conf.', val: r => r.conf }, { label: 'Llegada', val: r => D.fmt(r.arrival) }, { label: 'Salida', val: r => D.fmt(r.departure) },
      { label: 'Cargos', cls: 'num', val: r => money((s.folios[r.id] || []).filter(t => t.amount > 0).reduce((a, t) => a + t.amount, 0)) },
      { label: 'Saldo', cls: 'num', html: r => { const b = Store.balance(r.id); return `<b class="${b > 0.004 ? 'neg' : ''}">${money(b)}</b>`; } },
      { label: '', html: r => `<a class="btn btn-sm" href="#/folio?id=${r.id}">Abrir folio</a>` }
    ];
    el.innerHTML = `
      ${UI.header('Facturación / Folios', `<input id="cs-q" placeholder="Nombre, hab. o conf." value="${esc(q.q || '')}">`)}
      <section class="panel"><h2>Huéspedes en casa</h2>${UI.table(cols, inhouse, { empty: 'Sin resultados' })}</section>
      <section class="panel"><h2>Folios cerrados recientes</h2>${UI.table(cols, closed, { empty: 'Sin resultados' })}</section>`;
    $('#cs-q').onkeydown = e => { if (e.key === 'Enter') location.hash = `#/cashier?q=${encodeURIComponent(e.target.value)}`; };
  }
};

Views.folio = {
  title: 'Folio',
  render(el, q) {
    const s = Store.state, res = Store.res(q.id);
    if (!res) { el.innerHTML = UI.empty('Folio no encontrado'); return; }
    const g = Store.guest(res.guestId), f = s.folios[res.id] || [], bal = Store.balance(res.id);
    const open = res.status === 'inhouse' || (res.status === 'noshow' && Math.abs(bal) > 0.004) || (res.status === 'checkedout' && Math.abs(bal) > 0.004);
    const charges = f.filter(t => t.amount > 0).reduce((a, t) => a + t.amount, 0);
    const pays = f.filter(t => t.amount < 0).reduce((a, t) => a + t.amount, 0);
    el.innerHTML = `
      ${UI.header(`Folio · Hab. ${res.room || '—'} · ${Store.guestName(res.guestId)}`, `
        ${open ? `<button class="btn" id="fo-post">Cargo</button><button class="btn" id="fo-pay">Pago</button>` : ''}
        <button class="btn" id="fo-print">Imprimir factura</button>
        ${res.status === 'inhouse' ? `<button class="btn btn-primary" id="fo-co">Check-out</button>` : ''}
        <a class="btn" href="#/reservation?id=${res.id}">Reserva</a>`)}
      <div class="folio-head panel">
        <div><span>Huésped</span><b>${esc(g.first)} ${esc(g.last)}</b> ${UI.vip(g)}</div>
        <div><span>Confirmación</span><b>${esc(res.conf)}</b></div>
        <div><span>Estadía</span><b>${D.fmt(res.arrival)} → ${D.fmt(res.departure)}</b></div>
        <div><span>Tarifa</span><b>${esc(res.rateCode)} ${money(res.rate)}</b></div>
        <div><span>Empresa</span><b>${esc(Store.company(res.companyId)?.name || '—')}</b></div>
        <div><span>Estado</span>${UI.statusTag(res.status)}</div>
      </div>
      <section class="panel">
        ${UI.table([
          { label: 'Fecha', val: t => D.fmt(t.date) }, { label: 'Código', val: t => t.code },
          { label: 'Descripción', html: t => `<span class="${t.voided ? 'strike' : ''}">${esc(t.desc)}</span>${t.ref && !t.correction ? ` <small class="muted">${esc(t.ref)}</small>` : ''}` },
          { label: 'Usuario', val: t => t.user },
          { label: 'Cargo', cls: 'num', val: t => t.amount > 0 ? money(t.amount) : '' },
          { label: 'Abono', cls: 'num', val: t => t.amount < 0 ? money(-t.amount) : '' },
          { label: '', html: t => open && !t.voided && !t.correction && t.code !== '8000' ? `<button class="btn btn-xs" data-void="${t.id}" title="Corregir">✕</button>` : '' }
        ], f, {
          empty: 'El folio no tiene movimientos',
          foot: `<tr><td colspan="4">Totales</td><td class="num">${money(charges)}</td><td class="num">${money(-pays)}</td><td></td></tr>
                 <tr class="grand"><td colspan="4">Saldo</td><td colspan="2" class="num ${bal > 0.004 ? 'neg' : 'pos'}">${money(bal)}</td><td></td></tr>`
        })}
      </section>`;

    $('#fo-print').onclick = () => Views.folio.printInvoice(res);
    if (!open) { if (res.status === 'inhouse') $('#fo-co').onclick = () => FrontDesk.checkOutDialog(res); return; }
    $('#fo-post').onclick = () => Views.folio.postDialog(res, 'charge');
    $('#fo-pay').onclick = () => Views.folio.postDialog(res, 'payment');
    if ($('#fo-co')) $('#fo-co').onclick = () => FrontDesk.checkOutDialog(res);
    $$('[data-void]', el).forEach(b => b.onclick = () => {
      Modal.open({
        title: 'Corrección de transacción',
        body: `<form id="vd-form"><label>Motivo<input name="reason" required placeholder="Ej.: cargo duplicado"></label></form>`,
        footer: `<button class="btn" data-close>Cancelar</button><button class="btn btn-danger" id="vd-ok">Corregir</button>`,
        onMount(m, close) {
          $('#vd-ok', m).onclick = () => {
            const { reason } = formData($('#vd-form', m));
            if (!reason) { toast('Indique el motivo', 'error'); return; }
            try {
              Store.voidTrx(res.id, b.dataset.void, reason);
              close(); toast('Transacción corregida', 'ok'); App.refresh();
            } catch (e) { toast(e.message, 'error'); }
          };
        }
      });
    });
    if (q.settle === '1' && bal > 0.004) Views.folio.postDialog(res, 'payment');
  },

  postDialog(res, kind) {
    const s = Store.state, bal = Store.balance(res.id);
    const codes = s.trxCodes.filter(t => t.type === kind && t.code !== '1100');
    Modal.open({
      title: kind === 'payment' ? `Registrar pago · Saldo ${money(bal)}` : 'Registrar cargo',
      body: `<form id="pt-form">
        <label>Código<select name="code">${options(codes, kind === 'payment' ? '9010' : '2000', 'code', t => `${t.code} - ${t.name}`)}</select></label>
        <div class="f2">
          <label>Monto<input type="number" step="0.01" min="0.01" name="amount" value="${kind === 'payment' && bal > 0 ? bal.toFixed(2) : ''}" required></label>
          ${kind === 'charge' ? `<label>Cantidad<input type="number" name="qty" min="1" value="1"></label>` : `<label>Referencia / voucher<input name="ref" placeholder="Últimos 4 dígitos, Nº transf..."></label>`}
        </div>
        <label>Descripción (opcional)<input name="desc"></label>
        ${kind === 'charge' ? `<p class="hint">Se agregará IVA ${s.hotel.taxRate}% automáticamente si el código es gravable.</p>` : ''}
      </form>`,
      footer: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" id="pt-ok">Registrar</button>`,
      onMount(m, close) {
        $('#pt-ok', m).onclick = () => {
          const d = formData($('#pt-form', m));
          if (d.code === '9050' && !res.companyId && !res.agentId) { toast('City Ledger requiere empresa o agencia en la reserva', 'error'); return; }
          try { Store.post(res.id, d); close(); toast(kind === 'payment' ? 'Pago registrado' : 'Cargo registrado', 'ok'); location.hash = `#/folio?id=${res.id}`; App.refresh(); } catch (e) { toast(e.message, 'error'); }
        };
      }
    });
  },

  printInvoice(res) {
    const s = Store.state, g = Store.guest(res.guestId), c = Store.company(res.companyId), f = (s.folios[res.id] || []).filter(t => !t.voided && !t.correction);
    const net = f.filter(t => t.amount > 0 && t.code !== '8000').reduce((a, t) => a + t.amount, 0);
    const tax = f.filter(t => t.code === '8000').reduce((a, t) => a + t.amount, 0);
    const paid = f.filter(t => t.amount < 0).reduce((a, t) => a + t.amount, 0);
    printHTML(`Factura / Folio Nº ${res.conf}`, `
      <table class="kv"><tr><th>Cliente</th><td>${esc(c ? c.name : `${g.first} ${g.last}`)}</td><th>RUT / ID</th><td>${esc(c ? c.taxId : g.doc)}</td></tr>
      <tr><th>Huésped</th><td>${esc(g.first)} ${esc(g.last)}</td><th>Habitación</th><td>${esc(res.room)}</td></tr>
      <tr><th>Llegada</th><td>${D.fmt(res.arrival)}</td><th>Salida</th><td>${D.fmt(res.departure)}</td></tr></table>
      <table class="grid"><thead><tr><th>Fecha</th><th>Descripción</th><th class="num">Cargo</th><th class="num">Abono</th></tr></thead><tbody>
      ${f.map(t => `<tr><td>${D.fmt(t.date)}</td><td>${esc(t.desc)}</td><td class="num">${t.amount > 0 ? money(t.amount) : ''}</td><td class="num">${t.amount < 0 ? money(-t.amount) : ''}</td></tr>`).join('')}
      </tbody></table>
      <table class="kv totals-print"><tr><th>Neto</th><td class="num">${money(net)}</td></tr><tr><th>IVA ${s.hotel.taxRate}%</th><td class="num">${money(tax)}</td></tr>
      <tr><th>Total</th><td class="num">${money(net + tax)}</td></tr><tr><th>Pagado</th><td class="num">${money(-paid)}</td></tr><tr><th>Saldo</th><td class="num"><b>${money(net + tax + paid)}</b></td></tr></table>`);
  }
};

Views.ledger = {
  title: 'Cuentas por cobrar',
  render(el) {
    const s = Store.state;
    const rows = [];
    s.reservations.forEach(r => (s.folios[r.id] || []).filter(t => t.code === '9050').forEach(t => {
      rows.push({ res: r, t, acc: Store.company(r.companyId) || Store.company(r.agentId) });
    }));
    const byAcc = {};
    rows.forEach(x => { const k = x.acc?.id || '—'; byAcc[k] = (byAcc[k] || 0) - x.t.amount; });
    el.innerHTML = `
      ${UI.header('Cuentas por cobrar (City Ledger)')}
      <section class="panel"><h2>Saldos por cuenta</h2>
        ${UI.table([{ label: 'Cuenta', val: k => Store.company(k)?.name || k }, { label: 'Tipo', val: k => Store.company(k)?.kind || '' }, { label: 'Saldo', cls: 'num', val: k => money(byAcc[k]) }],
          Object.keys(byAcc), { empty: 'No hay transferencias a City Ledger. Use el código 9050 en un folio con empresa.' })}
      </section>
      <section class="panel"><h2>Detalle</h2>
        ${UI.table([{ label: 'Fecha', val: x => D.fmt(x.t.date) }, { label: 'Cuenta', val: x => x.acc?.name || '' },
          { label: 'Huésped', html: x => `<a href="#/folio?id=${x.res.id}">${esc(Store.guestName(x.res.guestId))}</a>` },
          { label: 'Conf.', val: x => x.res.conf }, { label: 'Importe', cls: 'num', val: x => money(-x.t.amount) }], rows)}
      </section>`;
  }
};
