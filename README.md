# Simulador de registro hotelero · PMS (demo)

Demo de un **Property Management System** hotelero de desarrollo propio de **Marine Data Lab**. Es una aplicación web estática (HTML + CSS + JavaScript sin dependencias) pensada para publicarse en **GitHub Pages**. Es el prototipo funcional de la futura versión conectada a los servicios de Google.

> Los datos se guardan en el `localStorage` de tu navegador. Cada visitante tiene su propia copia, y puedes reiniciarla desde *Configuración → Datos del hotel*.

## Probar la demo

**En local:**

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

**En GitHub Pages:** *Settings → Pages → Build and deployment → Source: Deploy from a branch*, selecciona la rama y la carpeta `/ (root)`. El sitio queda en `https://<usuario>.github.io/Simulador_registro_hotelero/`.

### Usuarios de demostración

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin` | Administrador (acceso total) |
| `recepcion` | `recepcion` | Recepción: llegadas, salidas, caja, reservas |
| `reservas` | `reservas` | Reservas y perfiles |
| `hk` | `hk` | Ama de llaves |
| `auditor` | `auditor` | Auditoría nocturna, caja y reportes |

## Módulos incluidos

| Menú | Funciones |
|---|---|
| **Reservaciones** | Nueva reserva (perfil, empresa/agencia, fechas, tipo y habitación, tarifa, garantía, total con IVA), búsqueda con filtros, disponibilidad por tipo para 14 días, *rack* de reservas (tape chart, doble clic para reservar), confirmación imprimible, cancelación y reactivación |
| **Recepción** | Llegadas con check-in (asignación de habitación, upgrade, aviso de habitación sucia, tarjeta de registro), huéspedes en casa, cambio de habitación, salidas con check-out (exige saldo cero), walk-in, plano de habitaciones por piso |
| **Caja** | Folios con cargos (IVA automático), pagos (efectivo, tarjetas, transferencia, City Ledger), correcciones con motivo, factura imprimible, cuentas por cobrar |
| **Habitaciones** | Ama de llaves: estados limpia/sucia/inspeccionada, cambios masivos, asignación de camareras, notas, hoja de trabajo. Fuera de orden y fuera de servicio con rango de fechas |
| **Perfiles** | Huéspedes (datos, documento, VIP, preferencias, historial y gasto) y empresas/agencias con tarifa negociada y crédito |
| **Fin de día** | Auditoría nocturna: verifica salidas pendientes, marca no-shows (con cargo opcional), carga alojamiento e IVA, pasa las habitaciones ocupadas a sucias y avanza la fecha de negocio. Reportes de llegadas, salidas, en casa, pronóstico, ingresos por código, estado de habitaciones, cancelaciones, nacionalidades y reporte gerencial, todos imprimibles y exportables a CSV |
| **Configuración** | Datos del hotel (moneda, IVA, horarios), tipos de habitación, tarifas, códigos de transacción, usuarios y permisos por rol, bitácora, exportar/importar JSON |

Atajos de teclado: `F2` nueva reserva · `F3` buscar · `F5` llegadas · `F6` en casa · `F7` salidas · `F8` caja · `F9` ama de llaves · `F10` reportes · `Esc` cierra ventanas.

## Estructura

```
index.html
assets/css/pms.css
assets/js/
  util.js         utilidades (fechas, formato, modales, avisos)
  seed.js         datos de demostración (40 habitaciones, perfiles, reservas)
  store.js        capa de datos y lógica de negocio (único punto de persistencia)
  app.js          sesión, menú, roles, enrutador y atajos
  views/          una vista por módulo
```

Toda la lógica de negocio (disponibilidad, check-in/out, folios, auditoría) vive en `store.js`, y las vistas sólo llaman a esas funciones. Así la persistencia se puede reemplazar sin reescribir la interfaz.

## Hoja de ruta: versión con servicios de Google

1. **Autenticación**: Google Sign-In con Firebase Authentication. El administrador aprueba cuentas y asigna roles, guardados como *custom claims* o en una colección `users`.
2. **Base de datos**: Cloud Firestore con colecciones `hotels/{id}/rooms`, `reservations`, `guests`, `companies`, `folios/{resId}/transactions`, `audits` y `log`. `Store.load/save` se reemplaza por un adaptador Firestore con escucha en tiempo real, para que varios recepcionistas trabajen a la vez.
3. **Reglas de seguridad** de Firestore por rol, equivalentes a la tabla de permisos actual.
4. **Operaciones críticas** (auditoría nocturna, numeración de confirmaciones y facturas) en Cloud Functions con transacciones.
5. **Integraciones**: Gmail API para confirmaciones y facturas por email, Google Calendar para el calendario de llegadas y grupos, Google Sheets para exportar reportes y Google Drive para guardar documentos escaneados y facturas PDF.
6. **Hosting**: Firebase Hosting o seguir en GitHub Pages, porque la app sigue siendo estática.
7. **Migración**: *Exportar JSON* desde la demo e importarlo en Firestore con un script.

## Contacto y licencias

Sistema desarrollado por **Marine Data Lab**. Para comprar una licencia, agendar una demostración o pedir personalizaciones, escribe a [rcavieses@gmail.com](mailto:rcavieses@gmail.com) o usa la pestaña **Contacto** de la aplicación.
