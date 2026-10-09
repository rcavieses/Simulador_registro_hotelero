/*
 * Capa de datos + lógica de negocio del PMS.
 * En la demo todo vive en localStorage. Para la versión con servicios de Google
 * basta con reemplazar Store.load/Store.save por un adaptador (Firestore / Sheets);
 * el resto de la aplicación sólo usa las funciones de este archivo.
 */
'use strict';

const DB_KEY = 'pms_opera_demo_v1';

const Store = {
  state: null,

  load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      this.state = raw ? JSON.parse(raw) : Seed.create();
    } catch (e) { this.state = Seed.create(); }
    this.save();
  },
  save() { try { localStorage.setItem(DB_KEY, JSON.stringify(this.state)); } catch (e) { /* almacenamiento no disponible */ } },
  reset() { this.state = Seed.create(); this.save(); },
  id(prefix) { this.state.seq++; return prefix + this.state.seq; },
  log(action, ref = '') {
    this.state.log.unshift({ at: D.stamp(), user: App.user?.username || 'sistema', action, ref });
    this.state.log.length = Math.min(this.state.log.length, 500);
  },

  /* ---------- Búsquedas ---------- */
  guest(id) { return this.state.guests.find(g => g.id === id); },
  company(id) { return this.state.companies.find(c => c.id === id); },
  room(no) { return this.state.rooms.find(r => r.no === no); },
  roomType(code) { return this.state.roomTypes.find(t => t.code === code); },
  rate(code) { return this.state.rateCodes.find(r => r.code === code); },
  trx(code) { return this.state.trxCodes.find(t => t.code === code); },
  res(id) { return this.state.reservations.find(r => r.id === id || r.conf === id); },
  guestName(id) { const g = this.guest(id); return g ? `${g.last}, ${g.first}` : '—'; },
  inhouseByRoom(no) { return this.state.reservations.find(r => r.room === no && r.status === 'inhouse'); },

  /* ---------- Disponibilidad ---------- */
  isOOO(room, date) { return room.ooo && room.ooo.from <= date && date < room.ooo.to; },
  roomsOfType(type) { return this.state.rooms.filter(r => r.type === type); },
  occupiedOn(type, date, ignoreId) {
    return this.state.reservations.filter(r => r.id !== ignoreId && r.roomType === type && ['reserved', 'inhouse'].includes(r.status) && r.arrival <= date && date < r.departure).length;
  },
  availability(type, date, ignoreId) {
    const rooms = this.roomsOfType(type);
    const ooo = rooms.filter(r => this.isOOO(r, date)).length;
    return rooms.length - ooo - this.occupiedOn(type, date, ignoreId);
  },
  minAvailability(type, arr, dep, ignoreId) {
    return Math.min(...D.range(arr, dep).map(d => this.availability(type, d, ignoreId)));
  },
  roomFree(no, arr, dep, ignoreId) {
    const rm = this.room(no);
    if (D.range(arr, dep).some(d => this.isOOO(rm, d))) return false;
    return !this.state.reservations.some(r => r.id !== ignoreId && r.room === no && ['reserved', 'inhouse'].includes(r.status) && r.arrival < dep && arr < r.departure);
  },
  freeRooms(type, arr, dep, ignoreId) {
    return this.state.rooms.filter(r => (!type || r.type === type) && this.roomFree(r.no, arr, dep, ignoreId));
  },

  /* ---------- Reservas ---------- */
  saveReservation(data, existingId) {
    const s = this.state;
    if (data.arrival >= data.departure) throw new Error('La salida debe ser posterior a la llegada.');
    if (!existingId && data.arrival < s.businessDate) throw new Error('La llegada no puede ser anterior a la fecha de negocio.');
    if (data.room && !this.roomFree(data.room, data.arrival, data.departure, existingId)) throw new Error(`La habitación ${data.room} no está disponible en esas fechas.`);
    if (!data.room && this.minAvailability(data.roomType, data.arrival, data.departure, existingId) <= 0 && !data.overbook) {
      throw new Error('No hay disponibilidad para ese tipo de habitación. Marque "Permitir sobreventa" para continuar.');
    }
    delete data.overbook;
    data.rate = Number(data.rate); data.adults = Number(data.adults); data.children = Number(data.children || 0);
    if (existingId) {
      const res = this.res(existingId);
      Object.assign(res, data);
      this.log('Reserva modificada', res.conf);
      this.save();
      return res;
    }
    const res = Object.assign({
      id: this.id('R'), conf: String(100100 + s.seq), status: 'reserved', createdBy: App.user.username, createdAt: s.businessDate,
      checkedInAt: '', checkedOutAt: ''
    }, data);
    s.reservations.push(res);
    s.folios[res.id] = [];
    this.log('Reserva creada', res.conf);
    this.save();
    return res;
  },
  cancelReservation(id, reason) {
    const res = this.res(id);
    if (res.status !== 'reserved') throw new Error('Sólo se pueden cancelar reservas pendientes de llegada.');
    res.status = 'cancelled'; res.cancelReason = reason; res.cancelNo = 'CX' + res.conf; res.room = '';
    this.log('Reserva cancelada', res.conf);
    this.save();
  },
  reinstate(id) {
    const res = this.res(id);
    if (res.arrival < this.state.businessDate) throw new Error('No se puede reactivar una reserva con llegada pasada.');
    res.status = 'reserved'; res.cancelReason = ''; res.cancelNo = '';
    this.log('Reserva reactivada', res.conf);
    this.save();
  },

  /* ---------- Recepción ---------- */
  checkIn(id, roomNo) {
    const s = this.state, res = this.res(id), rm = this.room(roomNo);
    if (res.status !== 'reserved') throw new Error('La reserva no está pendiente de llegada.');
    if (res.arrival !== s.businessDate) throw new Error('Sólo se puede registrar la llegada en la fecha de llegada.');
    if (!rm) throw new Error('Habitación inexistente.');
    if (rm.fo === 'occupied') throw new Error(`La habitación ${roomNo} está ocupada.`);
    if (!this.roomFree(roomNo, res.arrival, res.departure, res.id)) throw new Error(`La habitación ${roomNo} tiene otra reserva asignada en esas fechas.`);
    res.room = roomNo; res.status = 'inhouse'; res.checkedInAt = D.stamp();
    rm.fo = 'occupied';
    this.log(`Check-in hab. ${roomNo}`, res.conf);
    this.save();
  },
  balance(id) { return round2((this.state.folios[id] || []).reduce((t, x) => t + x.amount, 0)); },
  checkOut(id) {
    const res = this.res(id);
    if (res.status !== 'inhouse') throw new Error('El huésped no está en casa.');
    if (Math.abs(this.balance(id)) > 0.004) throw new Error('El folio debe tener saldo cero para hacer check-out.');
    res.status = 'checkedout'; res.checkedOutAt = D.stamp();
    if (res.departure > this.state.businessDate) res.departure = this.state.businessDate === res.arrival ? D.add(res.arrival, 1) : this.state.businessDate;
    const rm = this.room(res.room);
    rm.fo = 'vacant'; rm.hk = 'dirty';
    this.log(`Check-out hab. ${res.room}`, res.conf);
    this.save();
  },
  moveRoom(id, newRoom, reason) {
    const res = this.res(id), oldRm = this.room(res.room), newRm = this.room(newRoom);
    if (newRm.fo === 'occupied' || !this.roomFree(newRoom, this.state.businessDate, res.departure, res.id)) throw new Error('La habitación destino no está disponible.');
    oldRm.fo = 'vacant'; oldRm.hk = 'dirty';
    newRm.fo = 'occupied';
    const from = res.room;
    res.room = newRoom; res.roomType = newRm.type;
    this.log(`Cambio de habitación ${from} → ${newRoom} (${reason || 'sin motivo'})`, res.conf);
    this.save();
  },

  /* ---------- Caja ---------- */
  post(id, { code, amount, desc, ref = '', qty = 1 }) {
    const s = this.state, tc = this.trx(code);
    if (!tc) throw new Error('Código de transacción inválido.');
    amount = Number(amount) * Number(qty || 1);
    if (!amount) throw new Error('Monto inválido.');
    if (tc.type === 'payment') amount = -Math.abs(amount);
    const f = s.folios[id] || (s.folios[id] = []);
    const main = { id: this.id('T'), date: s.businessDate, code, desc: desc || tc.name, amount: round2(amount), user: App.user.username, ref };
    f.push(main);
    if (tc.taxable) {
      f.push({ id: this.id('T'), date: s.businessDate, code: '8000', desc: `IVA ${tc.name}`, amount: round2(amount * s.hotel.taxRate / 100), user: App.user.username, ref, parent: main.id });
    }
    this.log(`Cargo ${code} ${desc || tc.name} ${money(amount)}`, this.res(id)?.conf);
    this.save();
  },
  voidTrx(id, trxId, reason) {
    const f = this.state.folios[id], t = f.find(x => x.id === trxId);
    if (!t || t.voided) throw new Error('Transacción no encontrada.');
    // La transacción y su impuesto asociado se corrigen juntos
    [t, ...f.filter(x => x.parent === t.id && !x.voided)].forEach(x => {
      x.voided = true;
      f.push({ id: this.id('T'), date: this.state.businessDate, code: x.code, desc: `Corrección: ${x.desc} (${reason})`, amount: -x.amount, user: App.user.username, ref: x.id, correction: true });
    });
    this.log(`Corrección de transacción ${t.id}`, this.res(id)?.conf);
    this.save();
  },

  /* ---------- Ama de llaves ---------- */
  setHK(no, hk) {
    const rm = this.room(no);
    if (hk === 'ooo' || hk === 'oos') {
      if (rm.fo === 'occupied') throw new Error('No se puede bloquear una habitación ocupada.');
    }
    if (rm.hk === 'ooo' && hk !== 'ooo') rm.ooo = null;
    rm.hk = hk;
    this.log(`Hab. ${no} → ${HK_LABEL[hk]}`);
    this.save();
  },
  setOOO(no, from, to, reason) {
    const rm = this.room(no);
    if (from >= to) throw new Error('Rango de fechas inválido.');
    if (rm.fo === 'occupied' && from <= this.state.businessDate) throw new Error('La habitación está ocupada.');
    rm.ooo = { from, to, reason };
    if (from <= this.state.businessDate) rm.hk = 'ooo';
    this.log(`Hab. ${no} fuera de servicio ${D.fmt(from)}–${D.fmt(to)}: ${reason}`);
    this.save();
  },

  /* ---------- Auditoría nocturna ---------- */
  auditChecks() {
    const s = this.state, bd = s.businessDate;
    return {
      arrivals: s.reservations.filter(r => r.status === 'reserved' && r.arrival === bd),
      departures: s.reservations.filter(r => r.status === 'inhouse' && r.departure <= bd),
      inhouse: s.reservations.filter(r => r.status === 'inhouse' && r.departure > bd)
    };
  },
  runAudit({ noShowCharge }) {
    const s = this.state, bd = s.businessDate, chk = this.auditChecks();
    if (chk.departures.length) throw new Error('Hay salidas pendientes. Extienda la estadía o haga check-out antes de cerrar el día.');
    const summary = { date: bd, noShows: [], roomRevenue: 0, taxes: 0, posted: 0, occupied: chk.inhouse.length, rooms: s.rooms.length, at: D.stamp(), user: App.user.username };
    chk.arrivals.forEach(r => {
      r.status = 'noshow'; r.room = '';
      summary.noShows.push(r.conf);
      if (noShowCharge && ['Tarjeta de crédito', 'Depósito', 'Cuenta empresa'].includes(r.guarantee)) {
        this.post(r.id, { code: '1100', amount: r.rate, desc: `No show ${D.fmt(bd)}` });
      }
    });
    chk.inhouse.forEach(r => {
      this.post(r.id, { code: '1000', amount: r.rate, desc: `Alojamiento ${r.rateCode} ${D.fmt(bd)}` });
      summary.roomRevenue += r.rate;
      summary.taxes += round2(r.rate * s.hotel.taxRate / 100);
      summary.posted++;
      const rm = this.room(r.room);
      if (rm) rm.hk = 'dirty';
    });
    summary.roomRevenue = round2(summary.roomRevenue);
    summary.taxes = round2(summary.taxes);
    summary.occupancy = round2(summary.occupied / s.rooms.length * 100);
    summary.adr = summary.occupied ? round2(summary.roomRevenue / summary.occupied) : 0;
    summary.revpar = round2(summary.roomRevenue / s.rooms.length);
    s.audits.unshift(summary);
    s.businessDate = D.add(bd, 1);
    // Actualizar habitaciones fuera de servicio según la nueva fecha
    s.rooms.forEach(rm => {
      if (rm.ooo && rm.ooo.to <= s.businessDate) { rm.ooo = null; if (rm.hk === 'ooo') rm.hk = 'dirty'; }
      else if (rm.ooo && rm.ooo.from <= s.businessDate) rm.hk = 'ooo';
    });
    this.log(`Auditoría nocturna cerrada ${D.fmt(bd)}`);
    this.save();
    return summary;
  },

  /* ---------- Estadísticas ---------- */
  stats(date) {
    const s = this.state;
    const total = s.rooms.length;
    const ooo = s.rooms.filter(r => this.isOOO(r, date)).length;
    const occ = s.reservations.filter(r => ['reserved', 'inhouse'].includes(r.status) && r.arrival <= date && date < r.departure);
    const rev = occ.reduce((t, r) => t + r.rate, 0);
    return {
      date, total, ooo, occupied: occ.length, available: total - ooo - occ.length,
      occPct: total ? occ.length / (total - ooo || 1) * 100 : 0,
      revenue: rev, adr: occ.length ? rev / occ.length : 0, revpar: rev / total,
      arrivals: s.reservations.filter(r => ['reserved', 'inhouse', 'checkedout'].includes(r.status) && r.arrival === date).length,
      departures: s.reservations.filter(r => ['inhouse', 'checkedout'].includes(r.status) && r.departure === date).length,
      persons: occ.reduce((t, r) => t + r.adults + (r.children || 0), 0)
    };
  }
};

const HK_LABEL = { clean: 'Limpia', dirty: 'Sucia', inspected: 'Inspeccionada', ooo: 'Fuera de orden', oos: 'Fuera de servicio' };
const STATUS_LABEL = { reserved: 'Reservada', inhouse: 'En casa', checkedout: 'Salida', cancelled: 'Cancelada', noshow: 'No show' };
const ROLE_LABEL = { admin: 'Administrador', recepcion: 'Recepción', reservas: 'Reservas', housekeeping: 'Ama de llaves', auditor: 'Auditor / Contabilidad' };
