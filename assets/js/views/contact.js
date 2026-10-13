'use strict';

const VENDOR = { name: 'Marine Data Lab', email: 'rcavieses@gmail.com' };

/* Formulario de contacto comercial: sin backend, abre el correo del visitante con el mensaje redactado */
const Contact = {
  html() {
    return `
      <div class="contact">
        <section class="panel contact-hero">
          <h2>¿Quieres este sistema para tu hotel?</h2>
          <p>Este PMS es un desarrollo propio de <b>${esc(VENDOR.name)}</b>. Lo adaptamos a tu propiedad y lo dejamos funcionando con tus cuentas de Google.</p>
          <ul class="contact-list">
            <li>Licencia para tu hotel o cadena</li>
            <li>Inicio de sesión con Google y datos en la nube, compartidos por todo tu equipo</li>
            <li>Configuración de habitaciones, tarifas, impuestos y usuarios</li>
            <li>Confirmaciones y facturas por email, reportes en Google Sheets</li>
            <li>Personalizaciones y capacitación del personal</li>
          </ul>
          <div class="row-btns">
            <a class="btn btn-primary" href="mailto:${VENDOR.email}?subject=${encodeURIComponent('Consulta por el sistema PMS')}">✉ ${esc(VENDOR.email)}</a>
            <button type="button" class="btn" id="ct-copy">Copiar email</button>
          </div>
        </section>
        <section class="panel">
          <h2>Solicitar información</h2>
          <form id="ct-form" class="f2">
            <label>Nombre*<input name="name" required></label>
            <label>Email*<input type="email" name="email" required></label>
            <label>Hotel / empresa<input name="hotel"></label>
            <label>Teléfono / WhatsApp<input name="phone"></label>
            <label>Ciudad y país<input name="city"></label>
            <label>Nº de habitaciones<input type="number" min="1" name="rooms"></label>
            <label class="span-all">Me interesa<select name="interest">
              <option>Comprar una licencia</option><option>Agendar una demostración guiada</option>
              <option>Personalizar el sistema</option><option>Otra consulta</option></select></label>
            <label class="span-all">Mensaje<textarea name="message" rows="4" placeholder="Cuéntanos sobre tu hotel y lo que necesitas"></textarea></label>
            <div class="form-actions span-all"><button class="btn btn-primary">Enviar consulta</button>
              <span class="hint">Se abrirá tu aplicación de correo con el mensaje listo para enviar.</span></div>
          </form>
        </section>
      </div>`;
  },

  bind(root) {
    $('#ct-copy', root).onclick = () => {
      navigator.clipboard?.writeText(VENDOR.email).then(() => toast('Email copiado', 'ok'), () => toast(VENDOR.email));
    };
    $('#ct-form', root).onsubmit = e => {
      e.preventDefault();
      const d = formData(e.target);
      const body = [
        `Nombre: ${d.name}`, `Email: ${d.email}`, `Hotel / empresa: ${d.hotel}`, `Teléfono: ${d.phone}`,
        `Ciudad y país: ${d.city}`, `Habitaciones: ${d.rooms}`, `Interés: ${d.interest}`, '', d.message
      ].join('\n');
      const subject = `PMS · ${d.interest}${d.hotel ? ' · ' + d.hotel : ''}`;
      window.location.href = `mailto:${VENDOR.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      toast('Abriendo tu correo para enviar la consulta…', 'ok');
    };
  }
};

Views.contact = {
  title: 'Contacto',
  render(el) {
    el.innerHTML = UI.header('Contacto · compra del sistema') + Contact.html();
    Contact.bind(el);
  }
};
