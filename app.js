// ═══════════════════════════════════════════
//  STANDARD REPUESTOS GT — App Logic
// ═══════════════════════════════════════════

const WA_VENDEDOR_PRUEBA = "50230317750";
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyh_HwnZ_vEbboRVvcsJfMoq78K6LUMscsChJPwfQ7YsMzZ8V2Pj_Ia_b250ShbUfcI/exec";

// ─── STORAGE ────────────────────────────────
const DB = {
  getSolicitudes: () => JSON.parse(localStorage.getItem('srgt_solicitudes') || '[]'),
  saveSolicitudes: (d) => localStorage.setItem('srgt_solicitudes', JSON.stringify(d)),
  getVendedores: () => JSON.parse(localStorage.getItem('srgt_vendedores') || '[]'),
  saveVendedores: (d) => localStorage.setItem('srgt_vendedores', JSON.stringify(d)),
  addSolicitud: (s) => { const a = DB.getSolicitudes(); a.unshift(s); DB.saveSolicitudes(a); },
  addVendedor: (v) => { const a = DB.getVendedores(); a.unshift(v); DB.saveVendedores(a); },
  updateVendedor: (id, data) => {
    const a = DB.getVendedores();
    const i = a.findIndex(v => v.id === id);
    if (i >= 0) { a[i] = { ...a[i], ...data }; DB.saveVendedores(a); }
  }
};

// ─── NAVIGATION ─────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) { el.classList.add('active'); window.scrollTo(0, 0); }
  // nav active state
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === id);
  });
}

// ─── TOASTS ─────────────────────────────────
function toast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.getElementById('toasts').appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

// ─── ID GENERATOR ───────────────────────────
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// ─── YEAR OPTIONS ───────────────────────────
function buildYearOptions(sel) {
  const y = new Date().getFullYear();
  sel.innerHTML = '<option value="">Año</option>';
  for (let i = y; i >= 1980; i--) {
    sel.innerHTML += `<option value="${i}">${i}</option>`;
  }
}

// ─── CASCADE SELECTS ────────────────────────
function buildMarcas(sel) {
  sel.innerHTML = '<option value="">Marca</option>';
  Object.keys(CAT.marcas).sort().forEach(m => {
    sel.innerHTML += `<option value="${m}">${m}</option>`;
  });
}

function buildLineas(marcaSel, lineaSel) {
  const marca = marcaSel.value;
  lineaSel.innerHTML = '<option value="">Línea / Modelo</option>';
  if (marca && CAT.marcas[marca]) {
    CAT.marcas[marca].forEach(l => {
      lineaSel.innerHTML += `<option value="${l}">${l}</option>`;
    });
  }
}

function buildCategorias(sel) {
  sel.innerHTML = '<option value="">Categoría del repuesto</option>';
  Object.keys(CAT.categorias).forEach(c => {
    sel.innerHTML += `<option value="${c}">${c}</option>`;
  });
}

function buildPartes(catSel, parteSel) {
  const cat = catSel.value;
  parteSel.innerHTML = '<option value="">Parte específica</option>';
  if (cat && CAT.categorias[cat]) {
    CAT.categorias[cat].forEach(p => {
      parteSel.innerHTML += `<option value="${p}">${p}</option>`;
    });
  }
}

function buildDeptos(sel) {
  sel.innerHTML = '<option value="">Departamento</option>';
  Object.keys(CAT.departamentos).sort().forEach(d => {
    sel.innerHTML += `<option value="${d}">${d}</option>`;
  });
}

function buildMunicipios(deptoSel, muniSel) {
  const depto = deptoSel.value;
  muniSel.innerHTML = '<option value="">Municipio</option>';
  if (depto && CAT.departamentos[depto]) {
    CAT.departamentos[depto].forEach(m => {
      muniSel.innerHTML += `<option value="${m}">${m}</option>`;
    });
  }
}

function buildCilindraje(sel) {
  sel.innerHTML = '<option value="">No sé</option>';
  Object.keys(CAT.cilindraje).forEach(k => {
    sel.innerHTML += `<option value="${k}">${k}L</option>`;
  });
}

function syncCC(cilSel, ccSel) {
  const cil = cilSel.value;
  ccSel.value = cil ? (CAT.cilindraje[cil] || '') : '';
}

// ─── WHATSAPP MESSAGE ────────────────────────
function buildWAMessage(s) {
  return `🔧 *NUEVA SOLICITUD — STANDARD REPUESTOS GT*

📋 *REPUESTO SOLICITADO*
• Pieza: ${s.parte || s.categoria}
• Categoría: ${s.categoria}
• Condición deseada: ${s.condicion}
${s.detalles ? `• Detalles: ${s.detalles}` : ''}

🚗 *VEHÍCULO*
• Marca: ${s.marca}
• Línea / Modelo: ${s.linea}
• Año: ${s.anio}
• Origen: ${s.origen}
• Timón: ${s.timon}
• Combustible: ${s.combustible}

⚙️ *DATOS TÉCNICOS*
• Tracción: ${s.traccion}
• Transmisión: ${s.transmision}
• Cilindraje: ${s.cilindraje ? s.cilindraje + 'L' : 'No especificado'}
• CC: ${s.cc || 'No especificado'}

📍 *UBICACIÓN BUSCADA*
• Departamento: ${s.depto}
• Municipio: ${s.muni}
${s.zona ? `• Zona: ${s.zona}` : ''}

👤 *COMPRADOR*
• Nombre: ${s.nombre}
• WhatsApp: ${s.waComprador}
• Urgencia: ${s.urgencia}
${s.comentarios ? `• Comentarios: ${s.comentarios}` : ''}

✅ Por favor contacte al comprador directamente por WhatsApp al número indicado.
_Solicitud generada por Standard Repuestos GT_`;
}

function abrirWhatsApp(telefono, mensaje) {
  const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
}

// ─── FORMULARIO COMPRADOR ────────────────────
function initFormComprador() {
  const form = document.getElementById('form-comprador');
  if (!form) return;

  // Build selects
  buildMarcas(form.querySelector('[name="marca"]'));
  buildCategorias(form.querySelector('[name="categoria"]'));
  buildDeptos(form.querySelector('[name="depto"]'));
  buildCilindraje(form.querySelector('[name="cilindraje"]'));
  buildYearOptions(form.querySelector('[name="anio"]'));

  // Cascade events
  form.querySelector('[name="marca"]').addEventListener('change', function () {
    buildLineas(this, form.querySelector('[name="linea"]'));
  });
  form.querySelector('[name="categoria"]').addEventListener('change', function () {
    buildPartes(this, form.querySelector('[name="parte"]'));
  });
  form.querySelector('[name="depto"]').addEventListener('change', function () {
    buildMunicipios(this, form.querySelector('[name="muni"]'));
  });
  form.querySelector('[name="cilindraje"]').addEventListener('change', function () {
    syncCC(this, form.querySelector('[name="cc"]'));
  });

  // Submit
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const getValue = (name) => {
      const field = form.elements.namedItem(name);
      if (!field) return '';
      if (field instanceof RadioNodeList) return field.value || '';
      return (field.value || '').trim();
    };
    const notas = [getValue('detalles'), getValue('comentarios')].filter(Boolean).join(' | ');
    const sheetPayload = {
      nombre: getValue('nombre'),
      whatsapp: getValue('waComprador'),
      marca: getValue('marca'),
      linea: getValue('linea'),
      categoria: getValue('categoria'),
      parte: getValue('parte'),
      anio: getValue('anio'),
      depto: getValue('depto'),
      urgencia: getValue('urgencia') || 'Media',
      condicion: getValue('condicion'),
      notas
    };
    const solicitud = {
      id: genId(),
      fecha: new Date().toISOString(),
      estado: 'nueva',
      // vehículo
      marca: sheetPayload.marca,
      linea: sheetPayload.linea,
      anio: sheetPayload.anio,
      origen: getValue('origen'),
      timon: getValue('timon'),
      combustible: getValue('combustible'),
      // técnico
      traccion: getValue('traccion'),
      transmision: getValue('transmision'),
      cilindraje: getValue('cilindraje'),
      cc: getValue('cc'),
      // repuesto
      categoria: sheetPayload.categoria,
      parte: sheetPayload.parte,
      condicion: sheetPayload.condicion,
      detalles: getValue('detalles'),
      // ubicación
      depto: sheetPayload.depto,
      muni: getValue('muni'),
      zona: getValue('zona'),
      // comprador
      nombre: sheetPayload.nombre,
      waComprador: sheetPayload.whatsapp,
      urgencia: sheetPayload.urgencia,
      comentarios: getValue('comentarios')
    };

    // Validación básica
    if (!solicitud.marca || !solicitud.categoria || !solicitud.nombre || !solicitud.waComprador) {
      toast('Completa los campos requeridos: Marca, Categoría, Nombre y WhatsApp', 'error');
      return;
    }

    DB.addSolicitud(solicitud);

    const data = new FormData();
    data.append("nombre", sheetPayload.nombre);
    data.append("whatsapp", sheetPayload.whatsapp);
    data.append("marca", sheetPayload.marca);
    data.append("linea", sheetPayload.linea);
    data.append("categoria", sheetPayload.categoria);
    data.append("parte", sheetPayload.parte);
    data.append("anio", sheetPayload.anio);
    data.append("depto", sheetPayload.depto);
    data.append("urgencia", sheetPayload.urgencia);
    data.append("condicion", sheetPayload.condicion);
    data.append("notas", sheetPayload.notas);

    console.log("Datos enviados a Google Sheets:", sheetPayload);

    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      body: data
    });

    toast("Solicitud enviada correctamente. Te contactaremos por WhatsApp.");
    form.reset();
    // rebuild selects
    buildMarcas(form.querySelector('[name="marca"]'));
    buildCategorias(form.querySelector('[name="categoria"]'));
    buildDeptos(form.querySelector('[name="depto"]'));
    buildCilindraje(form.querySelector('[name="cilindraje"]'));
    buildYearOptions(form.querySelector('[name="anio"]'));
    form.querySelector('[name="linea"]').innerHTML = '<option value="">Línea / Modelo</option>';
    form.querySelector('[name="parte"]').innerHTML = '<option value="">Parte específica</option>';
    form.querySelector('[name="muni"]').innerHTML = '<option value="">Municipio</option>';
  });
}

// ─── ADHESIÓN VENDEDOR ───────────────────────
function initFormVendedor() {
  const form = document.getElementById('form-vendedor');
  if (!form) return;

  // Build marcas checkboxes
  const marcasWrap = document.getElementById('vend-marcas');
  if (marcasWrap) {
    Object.keys(CAT.marcas).sort().forEach(m => {
      const label = document.createElement('label');
      label.className = 'check-pill';
      label.innerHTML = `<input type="checkbox" name="marcas" value="${m}"><span>${m}</span>`;
      marcasWrap.appendChild(label);
    });
  }

  // Build categorias checkboxes
  const catWrap = document.getElementById('vend-categorias');
  if (catWrap) {
    Object.keys(CAT.categorias).forEach(c => {
      const label = document.createElement('label');
      label.className = 'check-pill';
      label.innerHTML = `<input type="checkbox" name="vcat" value="${c}"><span>${c}</span>`;
      catWrap.appendChild(label);
    });
  }

  buildDeptos(form.querySelector('[name="vdepto"]'));
  form.querySelector('[name="vdepto"]').addEventListener('change', function () {
    buildMunicipios(this, form.querySelector('[name="vmuni"]'));
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const fd = new FormData(form);
    const marcas = [...form.querySelectorAll('[name="marcas"]:checked')].map(i => i.value);
    const vcats = [...form.querySelectorAll('[name="vcat"]:checked')].map(i => i.value);
    const vendedor = {
      id: genId(),
      fecha: new Date().toISOString(),
      estado: 'pendiente',
      nombre: fd.get('vnombre') || '',
      tipo: fd.get('vtipo') || '',
      encargado: fd.get('vencargado') || '',
      whatsapp: fd.get('vwhatsapp') || '',
      email: fd.get('vemail') || '',
      nit: fd.get('vnit') || '',
      direccion: fd.get('vdireccion') || '',
      depto: fd.get('vdepto') || '',
      muni: fd.get('vmuni') || '',
      zona: fd.get('vzona') || '',
      horario: fd.get('vhorario') || '',
      marcas,
      categorias: vcats,
      condicionPiezas: fd.get('vcondicion') || '',
      traccion: fd.get('vtraccion') || '',
      envios: form.querySelector('[name="venvios"]')?.checked || false,
      entregas: form.querySelector('[name="ventregas"]')?.checked || false
    };

    if (!vendedor.nombre || !vendedor.whatsapp || !vendedor.depto) {
      toast('Completa: Nombre comercial, WhatsApp y Departamento', 'error');
      return;
    }

    DB.addVendedor(vendedor);
    toast('¡Solicitud de adhesión enviada! Te contactaremos pronto.');
    form.reset();
    showPage('page-vendedor-ok');
  });
}

// ─── PANEL VENDEDOR (demo) ───────────────────
function renderPanelVendedor() {
  const solicitudes = DB.getSolicitudes();
  const lista = document.getElementById('panel-solicitudes');
  if (!lista) return;

  if (solicitudes.length === 0) {
    lista.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>Aún no hay solicitudes.<br>¡Comparte el link para recibir leads!</p></div>';
    return;
  }

  lista.innerHTML = '';
  solicitudes.forEach(s => {
    const card = document.createElement('div');
    card.className = 'solicitud-card';
    const msg = buildWAMessage(s);
    card.innerHTML = `
      <div class="sol-header">
        <div class="sol-pieza">${s.parte || s.categoria}</div>
        <span class="badge badge-${s.urgencia === 'Alta' ? 'danger' : s.urgencia === 'Media' ? 'warning' : 'info'}">${s.urgencia}</span>
      </div>
      <div class="sol-meta">
        <span>🚗 ${s.marca} ${s.linea} ${s.anio}</span>
        <span>⚙️ ${s.condicion}</span>
        <span>📍 ${s.muni}, ${s.depto}</span>
      </div>
      <div class="sol-specs">
        <span><b>Tracción:</b> ${s.traccion || '—'}</span>
        <span><b>Trans.:</b> ${s.transmision || '—'}</span>
        <span><b>Cilind.:</b> ${s.cilindraje ? s.cilindraje + 'L' : '—'}</span>
        <span><b>Origen:</b> ${s.origen || '—'}</span>
        <span><b>Combust.:</b> ${s.combustible || '—'}</span>
        <span><b>Timón:</b> ${s.timon || '—'}</span>
      </div>
      ${s.detalles ? `<div class="sol-notas">📝 ${s.detalles}</div>` : ''}
      <div class="sol-comprador">
        <span>👤 <b>${s.nombre}</b></span>
        <span>📱 ${s.waComprador}</span>
        <span class="sol-fecha">${new Date(s.fecha).toLocaleDateString('es-GT')}</span>
      </div>
      <button class="btn-wa" onclick="abrirWhatsApp('502${s.waComprador.replace(/\D/g,'')}', \`${msg.replace(/`/g, '\\`')}\`)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.559 4.14 1.535 5.874L0 24l6.335-1.52A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.004-1.367l-.358-.214-3.762.902.952-3.67-.234-.376A9.818 9.818 0 1121.818 12 9.83 9.83 0 0112 21.818z"/></svg>
        Contactar por WhatsApp
      </button>`;
    lista.appendChild(card);
  });
}

// ─── PANEL ADMIN ─────────────────────────────
function renderPanelAdmin() {
  renderAdminSolicitudes();
  renderAdminVendedores();
  renderAdminMetricas();
}

function renderAdminSolicitudes() {
  const solicitudes = DB.getSolicitudes();
  const el = document.getElementById('admin-solicitudes');
  if (!el) return;

  document.getElementById('admin-total-sol').textContent = solicitudes.length;

  if (solicitudes.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>Sin solicitudes aún.</p></div>';
    return;
  }

  el.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr>
          <th>Fecha</th><th>Pieza</th><th>Marca</th><th>Línea</th><th>Año</th>
          <th>Condición</th><th>Ubicación</th><th>Comprador</th><th>Urgencia</th><th>Acción</th>
        </tr></thead>
        <tbody>
          ${solicitudes.map(s => `<tr>
            <td>${new Date(s.fecha).toLocaleDateString('es-GT')}</td>
            <td><b>${s.parte || s.categoria}</b></td>
            <td>${s.marca}</td><td>${s.linea}</td><td>${s.anio}</td>
            <td>${s.condicion}</td>
            <td>${s.muni}, ${s.depto}</td>
            <td>${s.nombre}<br><small>${s.waComprador}</small></td>
            <td><span class="badge badge-${s.urgencia === 'Alta' ? 'danger' : s.urgencia === 'Media' ? 'warning' : 'info'}">${s.urgencia}</span></td>
            <td><button class="btn-sm btn-wa-sm" onclick="abrirWhatsApp('${WA_VENDEDOR_PRUEBA}','${buildWAMessage(s).replace(/'/g,"\\'")}')">WA</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function renderAdminVendedores() {
  const vendedores = DB.getVendedores();
  const el = document.getElementById('admin-vendedores');
  if (!el) return;

  document.getElementById('admin-total-vend').textContent = vendedores.length;
  document.getElementById('admin-pend-vend').textContent = vendedores.filter(v => v.estado === 'pendiente').length;

  if (vendedores.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🏪</div><p>Sin vendedores registrados.</p></div>';
    return;
  }

  el.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr>
          <th>Nombre</th><th>Tipo</th><th>WhatsApp</th><th>Depto.</th><th>Estado</th><th>Acciones</th>
        </tr></thead>
        <tbody>
          ${vendedores.map(v => `<tr>
            <td><b>${v.nombre}</b><br><small>${v.encargado}</small></td>
            <td>${v.tipo}</td>
            <td>${v.whatsapp}</td>
            <td>${v.muni}, ${v.depto}</td>
            <td><span class="badge badge-estado-${v.estado}">${v.estado}</span></td>
            <td class="admin-actions">
              <button class="btn-sm btn-success" onclick="cambiarEstadoVendedor('${v.id}','aprobado')">Aprobar</button>
              <button class="btn-sm btn-info" onclick="cambiarEstadoVendedor('${v.id}','verificado')">Verificar</button>
              <button class="btn-sm btn-warning" onclick="cambiarEstadoVendedor('${v.id}','suspendido')">Suspender</button>
              <button class="btn-sm btn-danger" onclick="cambiarEstadoVendedor('${v.id}','rechazado')">Rechazar</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function cambiarEstadoVendedor(id, estado) {
  DB.updateVendedor(id, { estado });
  toast(`Vendedor marcado como: ${estado}`);
  renderAdminVendedores();
}

function renderAdminMetricas() {
  const solicitudes = DB.getSolicitudes();
  const marcasCount = {};
  const catCount = {};
  const condCount = {};
  const muniCount = {};

  solicitudes.forEach(s => {
    marcasCount[s.marca] = (marcasCount[s.marca] || 0) + 1;
    catCount[s.categoria] = (catCount[s.categoria] || 0) + 1;
    condCount[s.condicion] = (condCount[s.condicion] || 0) + 1;
    const loc = s.muni || s.depto;
    muniCount[loc] = (muniCount[loc] || 0) + 1;
  });

  const topMarcas = Object.entries(marcasCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const elMarcas = document.getElementById('metricas-marcas');
  if (elMarcas) {
    elMarcas.innerHTML = topMarcas.length
      ? topMarcas.map(([m, c]) => `<div class="metric-row"><span>${m}</span><span class="metric-val">${c}</span></div>`).join('')
      : '<p class="muted">Sin datos</p>';
  }
  const elCat = document.getElementById('metricas-cat');
  if (elCat) {
    elCat.innerHTML = topCat.length
      ? topCat.map(([c, n]) => `<div class="metric-row"><span>${c}</span><span class="metric-val">${n}</span></div>`).join('')
      : '<p class="muted">Sin datos</p>';
  }
}

// ─── EXPORT JSON ─────────────────────────────
function exportarSolicitudes() {
  const data = DB.getSolicitudes();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `solicitudes_srgt_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Exportación descargada');
}

function exportarVendedores() {
  const data = DB.getVendedores();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vendedores_srgt_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Exportación descargada');
}

// ─── DEMO DATA ───────────────────────────────
function cargarDemoData() {
  const demos = [
    { id: genId(), fecha: new Date(Date.now() - 86400000).toISOString(), estado: 'nueva', marca: 'Toyota', linea: 'Corolla', anio: '2010', origen: 'Importado de Estados Unidos', timon: 'Timón izquierdo', combustible: 'Gasolina', traccion: 'Delantera / FWD', transmision: 'Automática', cilindraje: '1.8', cc: '1800', categoria: 'Motor', parte: 'Alternador', condicion: 'Usada', detalles: '', depto: 'Guatemala', muni: 'Mixco', zona: '4', nombre: 'Carlos García', waComprador: '50255551234', urgencia: 'Alta', comentarios: 'Lo necesito para mañana' },
    { id: genId(), fecha: new Date(Date.now() - 172800000).toISOString(), estado: 'nueva', marca: 'Honda', linea: 'Civic', anio: '2015', origen: 'Agencia Guatemala', timon: 'Timón izquierdo', combustible: 'Gasolina', traccion: 'Delantera / FWD', transmision: 'Automática', cilindraje: '1.5', cc: '1500', categoria: 'Suspensión', parte: 'Shock delantero', condicion: 'Nueva', detalles: 'Derecho', depto: 'Guatemala', muni: 'Guatemala', zona: '10', nombre: 'María López', waComprador: '50288889876', urgencia: 'Media', comentarios: '' },
    { id: genId(), fecha: new Date(Date.now() - 259200000).toISOString(), estado: 'nueva', marca: 'Nissan', linea: 'Frontier', anio: '2012', origen: 'Importado de Estados Unidos', timon: 'Timón izquierdo', combustible: 'Diésel', traccion: '4x4', transmision: 'Mecánica', cilindraje: '2.5', cc: '2500', categoria: 'Frenos', parte: 'Disco de freno', condicion: 'Me es indiferente', detalles: 'Delantero', depto: 'Sacatepéquez', muni: 'Antigua Guatemala', zona: '', nombre: 'Jorge Pérez', waComprador: '50244441111', urgencia: 'Baja', comentarios: 'Con o sin pastillas' }
  ];
  DB.saveSolicitudes(demos);

  const demoVend = [
    { id: genId(), fecha: new Date().toISOString(), estado: 'pendiente', nombre: 'Repuestos El Gallito', tipo: 'Yonker', encargado: 'Roberto Juárez', whatsapp: '50230317750', email: 'gallito@gmail.com', nit: '', direccion: '5a Calle 3-20 Zona 3', depto: 'Guatemala', muni: 'Guatemala', zona: '3', horario: 'Lunes a Sábado 8am-6pm', marcas: ['Toyota', 'Honda', 'Nissan'], categorias: ['Motor', 'Suspensión', 'Frenos'], condicionPiezas: 'Todas', traccion: '', envios: true, entregas: false },
    { id: genId(), fecha: new Date().toISOString(), estado: 'aprobado', nombre: 'Deshuasadero Villa Nueva', tipo: 'Yonker', encargado: 'Ana Morales', whatsapp: '50255554321', email: '', nit: '', direccion: '12 Av 8-15', depto: 'Guatemala', muni: 'Villa Nueva', zona: '', horario: 'Lunes a Viernes 7am-5pm', marcas: ['Mitsubishi', 'Suzuki', 'Chevrolet'], categorias: ['Carrocería', 'Eléctrico', 'Interior'], condicionPiezas: 'Usada', traccion: '', envios: false, entregas: true }
  ];
  DB.saveVendedores(demoVend);
  toast('Datos de demo cargados correctamente');
}

// ─── INIT ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Nav links
  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const page = el.dataset.page;
      if (page === 'page-panel-vendedor') renderPanelVendedor();
      if (page === 'page-admin') renderPanelAdmin();
      showPage(page);
      // close mobile menu
      document.getElementById('mobile-menu')?.classList.remove('open');
    });
  });

  // Hamburger
  document.getElementById('hamburger')?.addEventListener('click', () => {
    document.getElementById('mobile-menu')?.classList.toggle('open');
  });

  // Init forms
  initFormComprador();
  initFormVendedor();

  // Export buttons
  document.getElementById('btn-export-sol')?.addEventListener('click', exportarSolicitudes);
  document.getElementById('btn-export-vend')?.addEventListener('click', exportarVendedores);
  document.getElementById('btn-demo-data')?.addEventListener('click', () => {
    cargarDemoData();
    renderPanelAdmin();
    renderPanelVendedor();
  });

  // Urgencia selector
  document.querySelectorAll('.urgencia-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.urgencia-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      document.querySelector('[name="urgencia"]').value = this.dataset.val;
    });
  });

  // Show landing by default
  showPage('page-landing');
});
