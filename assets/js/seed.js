/* Datos de demostración. Todo se genera relativo a la fecha actual. */
'use strict';

const Seed = {
  create() {
    const r = rng(20261009);
    const pick = arr => arr[Math.floor(r() * arr.length)];
    const between = (a, b) => a + Math.floor(r() * (b - a + 1));
    const bd = D.today();

    const roomTypes = [
      { code: 'STD', name: 'Estándar', maxOcc: 2, beds: '1 King / 2 Twin', desc: 'Habitación estándar 24 m²' },
      { code: 'SUP', name: 'Superior', maxOcc: 3, beds: '1 King + sofá cama', desc: 'Vista a la ciudad 30 m²' },
      { code: 'JS', name: 'Junior Suite', maxOcc: 3, beds: '1 King', desc: 'Sala de estar integrada 42 m²' },
      { code: 'STE', name: 'Suite', maxOcc: 4, beds: '1 King + 2 Twin', desc: 'Suite de dos ambientes 65 m²' }
    ];

    const rooms = [];
    for (let f = 1; f <= 4; f++) {
      for (let i = 1; i <= 10; i++) {
        const type = i <= 4 ? 'STD' : i <= 7 ? 'SUP' : i <= 9 ? 'JS' : 'STE';
        rooms.push({ no: `${f}${pad(i)}`, type, floor: f, hk: 'inspected', fo: 'vacant', attendant: '', note: '', ooo: null });
      }
    }

    const rateCodes = [
      { code: 'RACK', name: 'Tarifa Rack', desc: 'Tarifa pública sin descuento', breakfast: false, active: true, prices: { STD: 120, SUP: 150, JS: 210, STE: 320 } },
      { code: 'BAR', name: 'Mejor tarifa disponible', desc: 'Flexible, cancelación 24 h', breakfast: false, active: true, prices: { STD: 108, SUP: 135, JS: 189, STE: 288 } },
      { code: 'BB', name: 'Alojamiento y desayuno', desc: 'Incluye desayuno buffet', breakfast: true, active: true, prices: { STD: 135, SUP: 165, JS: 225, STE: 340 } },
      { code: 'CORP', name: 'Corporativa', desc: 'Empresas con convenio', breakfast: true, active: true, prices: { STD: 96, SUP: 120, JS: 168, STE: 256 } },
      { code: 'NRF', name: 'No reembolsable', desc: 'Prepago, sin cambios', breakfast: false, active: true, prices: { STD: 95, SUP: 118, JS: 165, STE: 250 } }
    ];

    const trxCodes = [
      { code: '1000', name: 'Alojamiento', type: 'charge', group: 'Habitaciones', taxable: true },
      { code: '1100', name: 'No show', type: 'charge', group: 'Habitaciones', taxable: true },
      { code: '2000', name: 'Restaurante', type: 'charge', group: 'Alimentos y bebidas', taxable: true },
      { code: '2010', name: 'Bar', type: 'charge', group: 'Alimentos y bebidas', taxable: true },
      { code: '2020', name: 'Room service', type: 'charge', group: 'Alimentos y bebidas', taxable: true },
      { code: '2030', name: 'Desayuno', type: 'charge', group: 'Alimentos y bebidas', taxable: true },
      { code: '3000', name: 'Minibar', type: 'charge', group: 'Otros ingresos', taxable: true },
      { code: '4000', name: 'Lavandería', type: 'charge', group: 'Otros ingresos', taxable: true },
      { code: '5000', name: 'Spa', type: 'charge', group: 'Otros ingresos', taxable: true },
      { code: '6000', name: 'Estacionamiento', type: 'charge', group: 'Otros ingresos', taxable: true },
      { code: '7000', name: 'Misceláneos', type: 'charge', group: 'Otros ingresos', taxable: false },
      { code: '8000', name: 'Impuesto (IVA)', type: 'tax', group: 'Impuestos', taxable: false },
      { code: '9000', name: 'Efectivo', type: 'payment', group: 'Pagos', taxable: false },
      { code: '9010', name: 'Tarjeta Visa', type: 'payment', group: 'Pagos', taxable: false },
      { code: '9020', name: 'Tarjeta Mastercard', type: 'payment', group: 'Pagos', taxable: false },
      { code: '9030', name: 'Tarjeta Amex', type: 'payment', group: 'Pagos', taxable: false },
      { code: '9040', name: 'Transferencia', type: 'payment', group: 'Pagos', taxable: false },
      { code: '9050', name: 'Cuenta por cobrar (City Ledger)', type: 'payment', group: 'Pagos', taxable: false }
    ];

    const companies = [
      { id: 'C1', kind: 'empresa', name: 'Andes Minería S.A.', taxId: '76.123.456-7', email: 'viajes@andesmineria.com', phone: '+56 2 2345 6789', rate: 'CORP', ar: true },
      { id: 'C2', kind: 'empresa', name: 'TecnoSur Ltda.', taxId: '77.987.654-3', email: 'admin@tecnosur.com', phone: '+56 2 2111 2222', rate: 'CORP', ar: true },
      { id: 'C3', kind: 'empresa', name: 'Banco Pacífico', taxId: '97.000.111-2', email: 'eventos@bpacifico.com', phone: '+51 1 444 5555', rate: 'CORP', ar: false },
      { id: 'A1', kind: 'agencia', name: 'Viajes Cóndor', taxId: '78.555.444-1', email: 'reservas@viajescondor.com', phone: '+56 2 2999 0000', rate: 'BAR', ar: true },
      { id: 'A2', kind: 'agencia', name: 'Booking.com', taxId: 'NL-805734958', email: 'hotel@booking.com', phone: '', rate: 'BAR', ar: false },
      { id: 'A3', kind: 'agencia', name: 'Expedia', taxId: 'US-91-1996083', email: 'hotel@expedia.com', phone: '', rate: 'BAR', ar: false }
    ];

    const first = ['María', 'José', 'Camila', 'Diego', 'Valentina', 'Matías', 'Sofía', 'Benjamín', 'Isidora', 'Tomás', 'Fernanda', 'Lucas', 'Javiera', 'Martín', 'Antonia', 'Joaquín', 'Catalina', 'Sebastián', 'Florencia', 'Nicolás', 'John', 'Emma', 'Lukas', 'Chloé', 'Marco', 'Ana', 'Pedro', 'Lucía', 'Carlos', 'Elena'];
    const last = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres', 'Araya', 'Flores', 'Smith', 'Müller', 'Dubois', 'Rossi', 'Castro', 'Vargas'];
    const nats = ['Chile', 'Chile', 'Chile', 'Argentina', 'Perú', 'México', 'Colombia', 'Brasil', 'España', 'Estados Unidos', 'Alemania', 'Francia', 'Italia'];

    const guests = [];
    for (let i = 1; i <= 48; i++) {
      const fn = pick(first), ln = pick(last);
      guests.push({
        id: 'G' + i, first: fn, last: ln,
        email: `${fn}.${ln}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + i + '@mail.com',
        phone: '+56 9 ' + between(1000, 9999) + ' ' + between(1000, 9999),
        docType: 'Pasaporte', doc: String(between(10000000, 99999999)),
        nationality: pick(nats), birth: `${between(1955, 2002)}-${pad(between(1, 12))}-${pad(between(1, 28))}`,
        address: '', city: '', vip: r() < 0.12 ? pick(['VIP1', 'VIP2', 'VIP3']) : '',
        companyId: r() < 0.25 ? pick(['C1', 'C2', 'C3']) : '',
        prefs: r() < 0.3 ? pick(['Piso alto', 'Lejos del ascensor', 'Almohada extra', 'Cama king', 'No fumador']) : '',
        notes: '', createdAt: bd
      });
    }

    const state = {
      version: 1,
      seq: 5000,
      businessDate: bd,
      hotel: { name: 'Hotel Demo', code: 'DEMO', address: 'Av. Principal 1234', city: 'Santiago', country: 'Chile', phone: '+56 2 2000 0000', email: 'reservas@hoteldemo.com', currency: 'USD', taxRate: 19, checkIn: '15:00', checkOut: '12:00' },
      users: [
        { username: 'admin', password: 'admin', name: 'Administrador', role: 'admin', active: true },
        { username: 'recepcion', password: 'recepcion', name: 'Ana Recepción', role: 'recepcion', active: true },
        { username: 'reservas', password: 'reservas', name: 'Raúl Reservas', role: 'reservas', active: true },
        { username: 'hk', password: 'hk', name: 'Hilda Housekeeping', role: 'housekeeping', active: true },
        { username: 'auditor', password: 'auditor', name: 'Nicolás Auditor', role: 'auditor', active: true }
      ],
      roomTypes, rooms, rateCodes, trxCodes, companies, guests,
      reservations: [], folios: {}, audits: [], log: [],
      attendants: ['Rosa', 'Carmen', 'Luis', 'Patricia']
    };

    const free = (type, arr, dep) => rooms.filter(rm => rm.type === type).find(rm =>
      !state.reservations.some(x => x.room === rm.no && ['reserved', 'inhouse'].includes(x.status) && x.arrival < dep && arr < x.departure));

    let conf = 100100;
    const order = guests.map(g => [r(), g]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    let gi = 0;
    const mk = (opts) => {
      const g = order[gi++ % order.length];
      const type = opts.type || pick(['STD', 'STD', 'STD', 'SUP', 'SUP', 'JS', 'STE']);
      const rate = opts.rate || (g.companyId ? 'CORP' : pick(['BAR', 'BAR', 'BB', 'RACK', 'NRF']));
      const res = {
        id: 'R' + (++state.seq), conf: String(++conf), guestId: g.id,
        companyId: g.companyId || '', agentId: rate === 'BAR' && r() < 0.4 ? pick(['A1', 'A2', 'A3']) : '',
        arrival: opts.arrival, departure: opts.departure, roomType: type, room: '',
        rateCode: rate, rate: state.rateCodes.find(x => x.code === rate).prices[type],
        adults: between(1, 2), children: r() < 0.15 ? 1 : 0,
        status: opts.status, source: pick(['Teléfono', 'Email', 'Web', 'OTA', 'Walk-in', 'Agencia']),
        guarantee: pick(['Tarjeta de crédito', 'Depósito', 'Cuenta empresa', 'Sin garantía']),
        eta: pick(['14:00', '15:00', '16:00', '18:00', '20:00', '']), notes: '', specials: g.prefs || '',
        createdBy: 'admin', createdAt: D.add(bd, -between(5, 40)), checkedInAt: '', checkedOutAt: ''
      };
      if (opts.assign) {
        const rm = free(type, res.arrival, res.departure);
        if (!rm) return null;
        res.room = rm.no;
      }
      state.reservations.push(res);
      state.folios[res.id] = [];
      return res;
    };

    const post = (res, date, code, amount, desc) => {
      const tc = trxCodes.find(t => t.code === code);
      const id = 'T' + (++state.seq);
      state.folios[res.id].push({ id, date, code, desc: desc || tc.name, amount: round2(amount), user: 'auditor', ref: '' });
      if (tc.taxable) {
        state.folios[res.id].push({ id: 'T' + (++state.seq), date, code: '8000', desc: `IVA ${tc.name}`, amount: round2(amount * state.hotel.taxRate / 100), user: 'auditor', ref: '', parent: id });
      }
    };

    // Historial: estadías ya cerradas
    for (let i = 0; i < 14; i++) {
      const arr = D.add(bd, -between(6, 30));
      const res = mk({ arrival: arr, departure: D.add(arr, between(1, 4)), status: 'checkedout', assign: true });
      if (!res) continue;
      res.checkedInAt = res.arrival + ' 15:20'; res.checkedOutAt = res.departure + ' 11:40';
      D.range(res.arrival, res.departure).forEach(d => post(res, d, '1000', res.rate, `Alojamiento ${res.rateCode}`));
      if (r() < 0.6) post(res, res.arrival, '2000', between(20, 90));
      const bal = state.folios[res.id].reduce((s, t) => s + t.amount, 0);
      state.folios[res.id].push({ id: 'T' + (++state.seq), date: res.departure, code: '9010', desc: 'Tarjeta Visa', amount: -round2(bal), user: 'recepcion', ref: 'XXXX-' + between(1000, 9999) });
    }

    // Huéspedes en casa (algunos salen hoy)
    for (let i = 0; i < 20; i++) {
      const arr = D.add(bd, -between(1, 4));
      const dep = i < 6 ? bd : D.add(bd, between(1, 5));
      const res = mk({ arrival: arr, departure: dep, status: 'inhouse', assign: true });
      if (!res) continue;
      res.checkedInAt = res.arrival + ' ' + pick(['14:10', '15:35', '17:02', '21:48']);
      D.range(res.arrival, bd).forEach(d => post(res, d, '1000', res.rate, `Alojamiento ${res.rateCode}`));
      if (r() < 0.6) post(res, D.add(bd, -1), pick(['2000', '2010', '2020', '3000', '4000']), between(12, 85));
      if (r() < 0.35) {
        state.folios[res.id].push({ id: 'T' + (++state.seq), date: res.arrival, code: '9010', desc: 'Depósito tarjeta', amount: -res.rate, user: 'recepcion', ref: 'XXXX-' + between(1000, 9999) });
      }
    }

    // Llegadas de hoy
    for (let i = 0; i < 8; i++) mk({ arrival: bd, departure: D.add(bd, between(1, 4)), status: 'reserved', assign: i < 3 });

    // Reservas futuras
    for (let i = 0; i < 34; i++) {
      const arr = D.add(bd, between(1, 28));
      mk({ arrival: arr, departure: D.add(arr, between(1, 6)), status: 'reserved', assign: r() < 0.25 });
    }

    // Una cancelada
    const cx = mk({ arrival: D.add(bd, 3), departure: D.add(bd, 5), status: 'cancelled' });
    if (cx) { cx.cancelReason = 'Cambio de planes del huésped'; cx.cancelNo = 'CX' + cx.conf; }

    // Estados de habitaciones
    state.reservations.filter(x => x.status === 'inhouse').forEach(x => {
      const rm = rooms.find(y => y.no === x.room);
      rm.fo = 'occupied';
      rm.hk = r() < 0.55 ? 'dirty' : 'clean';
    });
    rooms.filter(x => x.fo === 'vacant').forEach(x => { x.hk = pick(['inspected', 'inspected', 'clean', 'clean', 'dirty']); });
    const oooRoom = rooms.find(x => x.no === '307');
    if (!state.reservations.some(x => x.room === '307')) {
      oooRoom.hk = 'ooo'; oooRoom.ooo = { from: D.add(bd, -1), to: D.add(bd, 3), reason: 'Filtración en baño' };
    }
    rooms.forEach((x, i) => { x.attendant = state.attendants[Math.floor(i / 10)]; });

    state.log.push({ at: D.stamp(), user: 'sistema', action: 'Datos de demostración generados', ref: '' });
    return state;
  }
};
