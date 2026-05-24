// Standard Repuestos GT — App Logic
// v15: MVP funcional. Envía formulario comprador a Google Sheets con URLSearchParams.

const WA_VENDEDOR_PRUEBA = "50230317750";
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyh_HwnZ_vEbboRVvcsJfMoq78K6LUMscsChJPwfQ7YsMzZ8V2Pj_Ia_b250ShbUfcI/exec";

const DB = {
  getSolicitudes: () => JSON.parse(localStorage.getItem("srgt_solicitudes") || "[]"),
  saveSolicitudes: (items) => localStorage.setItem("srgt_solicitudes", JSON.stringify(items)),
  getVendedores: () => JSON.parse(localStorage.getItem("srgt_vendedores") || "[]"),
  saveVendedores: (items) => localStorage.setItem("srgt_vendedores", JSON.stringify(items)),
  addSolicitud: (item) => {
    const items = DB.getSolicitudes();
    items.unshift(item);
    DB.saveSolicitudes(items);
  },
  addVendedor: (item) => {
    const items = DB.getVendedores();
    items.unshift(item);
    DB.saveVendedores(items);
  },
  updateVendedor: (id, data) => {
    const items = DB.getVendedores();
    const index = items.findIndex((v) => v.id === id);
    if (index >= 0) {
      items[index] = { ...items[index], ...data };
      DB.saveVendedores(items);
    }
  }
};

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function toast(message, type = "success") {
  let container = document.getElementById("toasts");
  if (!container) {
    container = document.createElement("div");
    container.id = "toasts";
    document.body.appendChild(container);
  }

  const item = document.createElement("div");
  item.className = `toast toast-${type}`;
  item.textContent = message;
  container.appendChild(item);

  setTimeout(() => item.classList.add("show"), 10);
  setTimeout(() => {
    item.classList.remove("show");
    setTimeout(() => item.remove(), 300);
  }, 3500);
}

function showPage(id) {
  document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
  const target = document.getElementById(id);
  if (target) {
    target.classList.add("active");
    window.scrollTo(0, 0);
  }

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.page === id);
  });

  document.getElementById("mobile-menu")?.classList.remove("open");
}

function setOptions(select, placeholder, values) {
  if (!select) return;
  select.innerHTML = `<option value="">${placeholder}</option>`;
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function buildMarcas(select) {
  const values = Object.keys(window.CAT?.marcas || {}).sort();
  setOptions(select, "Marca", values);
}

function buildLineas(marcaSelect, lineaSelect) {
  const marca = marcaSelect?.value || "";
  const values = marca && window.CAT?.marcas?.[marca] ? window.CAT.marcas[marca] : [];
  setOptions(lineaSelect, "Línea / Modelo", values);
}

function buildCategorias(select) {
  const values = Object.keys(window.CAT?.categorias || {}).sort();
  setOptions(select, "Categoría del repuesto", values);
}

function buildPartes(categoriaSelect, parteSelect) {
  const categoria = categoriaSelect?.value || "";
  const values = categoria && window.CAT?.categorias?.[categoria] ? window.CAT.categorias[categoria] : [];
  setOptions(parteSelect, "Parte específica", values);
}

function buildDeptos(select) {
  const values = Object.keys(window.CAT?.departamentos || {}).sort();
  setOptions(select, "Departamento", values);
}

function buildMunicipios(deptoSelect, muniSelect) {
  const depto = deptoSelect?.value || "";
  const values = depto && window.CAT?.departamentos?.[depto] ? window.CAT.departamentos[depto] : [];
  setOptions(muniSelect, "Municipio", values);
}

function buildYearOptions(select) {
  if (!select) return;
  const current = new Date().getFullYear();
  select.innerHTML = '<option value="">Año</option>';
  for (let year = current; year >= 1980; year -= 1) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    select.appendChild(option);
  }
}

function buildCilindraje(select) {
  const values = Object.keys(window.CAT?.cilindraje || {}).sort((a, b) => Number(a) - Number(b));
  setOptions(select, "No sé", values.map((v) => `${v}`));
}

function syncCC(cilindrajeSelect, ccSelect) {
  if (!ccSelect) return;
  const value = cilindrajeSelect?.value || "";
  ccSelect.value = value && window.CAT?.cilindraje?.[value] ? window.CAT.cilindraje[value] : "";
}

function getFormValue(form, name) {
  const checked = form.querySelector(`[name="${name}"]:checked`);
  if (checked) return String(checked.value || "").trim();

  const field = form.elements.namedItem(name);
  if (!field) return "";
  if (typeof field.value === "string") return field.value.trim();
  return "";
}

function appendAliases(params, canonical, value, aliases = []) {
  const cleanValue = value == null ? "" : String(value);
  params.append(canonical, cleanValue);
  aliases.forEach((alias) => params.append(alias, cleanValue));
}

function buildWAMessage(s) {
  return `🔧 NUEVA SOLICITUD — STANDARD REPUESTOS GT\n\n` +
    `Repuesto: ${s.parte || s.categoria}\n` +
    `Categoría: ${s.categoria}\n` +
    `Condición: ${s.condicion || "No especificada"}\n` +
    `Vehículo: ${s.marca} ${s.linea} ${s.anio}\n` +
    `Ubicación: ${s.muni || ""}, ${s.depto || ""}\n` +
    `Comprador: ${s.nombre}\n` +
    `WhatsApp: ${s.waComprador}\n` +
    `Urgencia: ${s.urgencia}\n` +
    `${s.detalles ? `Detalles: ${s.detalles}\n` : ""}` +
    `${s.comentarios ? `Comentarios: ${s.comentarios}\n` : ""}`;
}

function abrirWhatsApp(telefono, mensaje) {
  const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank");
}

async function enviarSolicitudAGoogleSheets(sheetPayload) {
  const params = new URLSearchParams();

  appendAliases(params, "nombre", sheetPayload.nombre, ["Nombre"]);
  appendAliases(params, "whatsapp", sheetPayload.whatsapp, ["WhatsApp", "waComprador"]);
  appendAliases(params, "marca", sheetPayload.marca, ["Marca"]);
  appendAliases(params, "linea", sheetPayload.linea, ["Linea", "Línea"]);
  appendAliases(params, "categoria", sheetPayload.categoria, ["Categoria", "Categoría"]);
  appendAliases(params, "parte", sheetPayload.parte, ["Parte"]);
  appendAliases(params, "anio", sheetPayload.anio, ["Año", "año", "Anio"]);
  appendAliases(params, "depto", sheetPayload.depto, ["Depto", "Departamento"]);
  appendAliases(params, "urgencia", sheetPayload.urgencia, ["Urgencia"]);
  appendAliases(params, "condicion", sheetPayload.condicion, ["Condicion", "Condición"]);
  appendAliases(params, "notas", sheetPayload.notas, ["Notas", "mensaje", "Mensaje"]);

  console.log("Payload Google Sheets:", Object.fromEntries(params.entries()));

  await fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    body: params
  });
}

function resetCompradorForm(form) {
  form.reset();
  buildMarcas(form.querySelector('[name="marca"]'));
  buildCategorias(form.querySelector('[name="categoria"]'));
  buildDeptos(form.querySelector('[name="depto"]'));
  buildCilindraje(form.querySelector('[name="cilindraje"]'));
  buildYearOptions(form.querySelector('[name="anio"]'));
  setOptions(form.querySelector('[name="linea"]'), "Línea / Modelo", []);
  setOptions(form.querySelector('[name="parte"]'), "Parte específica", []);
  setOptions(form.querySelector('[name="muni"]'), "Municipio", []);

  const urgencia = form.elements.namedItem("urgencia");
  if (urgencia) urgencia.value = "Media";
  document.querySelectorAll(".urgencia-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.val === "Media");
  });
}

function initFormComprador() {
  const form = document.getElementById("form-comprador");
  if (!form || form.dataset.initialized === "true") return;
  form.dataset.initialized = "true";

  buildMarcas(form.querySelector('[name="marca"]'));
  buildCategorias(form.querySelector('[name="categoria"]'));
  buildDeptos(form.querySelector('[name="depto"]'));
  buildCilindraje(form.querySelector('[name="cilindraje"]'));
  buildYearOptions(form.querySelector('[name="anio"]'));

  form.querySelector('[name="marca"]')?.addEventListener("change", function () {
    buildLineas(this, form.querySelector('[name="linea"]'));
  });

  form.querySelector('[name="categoria"]')?.addEventListener("change", function () {
    buildPartes(this, form.querySelector('[name="parte"]'));
  });

  form.querySelector('[name="depto"]')?.addEventListener("change", function () {
    buildMunicipios(this, form.querySelector('[name="muni"]'));
  });

  form.querySelector('[name="cilindraje"]')?.addEventListener("change", function () {
    syncCC(this, form.querySelector('[name="cc"]'));
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    event.stopPropagation();

    const notas = [getFormValue(form, "detalles"), getFormValue(form, "comentarios")]
      .filter(Boolean)
      .join(" | ");

    const sheetPayload = {
      nombre: getFormValue(form, "nombre"),
      whatsapp: getFormValue(form, "waComprador"),
      marca: getFormValue(form, "marca"),
      linea: getFormValue(form, "linea"),
      categoria: getFormValue(form, "categoria"),
      parte: getFormValue(form, "parte"),
      anio: getFormValue(form, "anio"),
      depto: getFormValue(form, "depto"),
      urgencia: getFormValue(form, "urgencia") || "Media",
      condicion: getFormValue(form, "condicion"),
      notas
    };

    if (!sheetPayload.marca || !sheetPayload.categoria || !sheetPayload.nombre || !sheetPayload.whatsapp) {
      toast("Completa los campos requeridos: Marca, Categoría, Nombre y WhatsApp", "error");
      return;
    }

    const solicitud = {
      id: genId(),
      fecha: new Date().toISOString(),
      estado: "nueva",
      marca: sheetPayload.marca,
      linea: sheetPayload.linea,
      anio: sheetPayload.anio,
      origen: getFormValue(form, "origen"),
      timon: getFormValue(form, "timon"),
      combustible: getFormValue(form, "combustible"),
      traccion: getFormValue(form, "traccion"),
      transmision: getFormValue(form, "transmision"),
      cilindraje: getFormValue(form, "cilindraje"),
      cc: getFormValue(form, "cc"),
      categoria: sheetPayload.categoria,
      parte: sheetPayload.parte,
      condicion: sheetPayload.condicion,
      detalles: getFormValue(form, "detalles"),
      depto: sheetPayload.depto,
      muni: getFormValue(form, "muni"),
      zona: getFormValue(form, "zona"),
      nombre: sheetPayload.nombre,
      waComprador: sheetPayload.whatsapp,
      urgencia: sheetPayload.urgencia,
      comentarios: getFormValue(form, "comentarios")
    };

    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton?.innerHTML;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Enviando solicitud...";
    }

    try {
      DB.addSolicitud(solicitud);
      await enviarSolicitudAGoogleSheets(sheetPayload);
      toast("Solicitud enviada correctamente. Te contactaremos por WhatsApp.");
      resetCompradorForm(form);
      showPage("page-confirmacion");
    } catch (error) {
      console.error("Error enviando a Google Sheets", error);
      toast("No se pudo enviar la solicitud. Intenta de nuevo.", "error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
      }
    }
  });
}

function initFormVendedor() {
  const form = document.getElementById("form-vendedor");
  if (!form || form.dataset.initialized === "true") return;
  form.dataset.initialized = "true";

  const marcasWrap = document.getElementById("vend-marcas");
  if (marcasWrap && marcasWrap.children.length === 0) {
    Object.keys(window.CAT?.marcas || {}).sort().forEach((marca) => {
      const label = document.createElement("label");
      label.className = "check-pill";
      label.innerHTML = `<input type="checkbox" name="marcas" value="${marca}"><span>${marca}</span>`;
      marcasWrap.appendChild(label);
    });
  }

  const categoriasWrap = document.getElementById("vend-categorias");
  if (categoriasWrap && categoriasWrap.children.length === 0) {
    Object.keys(window.CAT?.categorias || {}).sort().forEach((categoria) => {
      const label = document.createElement("label");
      label.className = "check-pill";
      label.innerHTML = `<input type="checkbox" name="vcat" value="${categoria}"><span>${categoria}</span>`;
      categoriasWrap.appendChild(label);
    });
  }

  buildDeptos(form.querySelector('[name="vdepto"]'));
  form.querySelector('[name="vdepto"]')?.addEventListener("change", function () {
    buildMunicipios(this, form.querySelector('[name="vmuni"]'));
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const vendedor = {
      id: genId(),
      fecha: new Date().toISOString(),
      estado: "pendiente",
      nombre: getFormValue(form, "vnombre"),
      tipo: getFormValue(form, "vtipo"),
      encargado: getFormValue(form, "vencargado"),
      whatsapp: getFormValue(form, "vwhatsapp"),
      email: getFormValue(form, "vemail"),
      nit: getFormValue(form, "vnit"),
      direccion: getFormValue(form, "vdireccion"),
      depto: getFormValue(form, "vdepto"),
      muni: getFormValue(form, "vmuni"),
      zona: getFormValue(form, "vzona"),
      horario: getFormValue(form, "vhorario"),
      marcas: [...form.querySelectorAll('[name="marcas"]:checked')].map((input) => input.value),
      categorias: [...form.querySelectorAll('[name="vcat"]:checked')].map((input) => input.value),
      condicionPiezas: getFormValue(form, "vcondicion"),
      traccion: getFormValue(form, "vtraccion"),
      envios: form.querySelector('[name="venvios"]')?.checked || false,
      entregas: form.querySelector('[name="ventregas"]')?.checked || false
    };

    if (!vendedor.nombre || !vendedor.whatsapp || !vendedor.depto) {
      toast("Completa: Nombre comercial, WhatsApp y Departamento", "error");
      return;
    }

    DB.addVendedor(vendedor);
    toast("¡Solicitud de adhesión enviada! Te contactaremos pronto.");
    form.reset();
    showPage("page-vendedor-ok");
  });
}

function renderPanelVendedor() {
  const solicitudes = DB.getSolicitudes();
  const lista = document.getElementById("panel-solicitudes");
  if (!lista) return;

  if (solicitudes.length === 0) {
    lista.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>Aún no hay solicitudes.</p></div>';
    return;
  }

  lista.innerHTML = solicitudes.map((s) => `
    <div class="solicitud-card">
      <div class="sol-header">
        <div class="sol-pieza">${s.parte || s.categoria}</div>
        <span class="badge">${s.urgencia || "Media"}</span>
      </div>
      <div class="sol-meta">
        <span>🚗 ${s.marca || ""} ${s.linea || ""} ${s.anio || ""}</span>
        <span>📍 ${s.muni || ""}, ${s.depto || ""}</span>
        <span>👤 ${s.nombre || ""} · ${s.waComprador || ""}</span>
      </div>
    </div>
  `).join("");
}

function renderPanelAdmin() {
  renderAdminSolicitudes();
  renderAdminVendedores();
  renderAdminMetricas();
}

function renderAdminSolicitudes() {
  const solicitudes = DB.getSolicitudes();
  const total = document.getElementById("admin-total-sol");
  if (total) total.textContent = solicitudes.length;

  const container = document.getElementById("admin-solicitudes");
  if (!container) return;

  if (solicitudes.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>Sin solicitudes aún.</p></div>';
    return;
  }

  container.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>Fecha</th><th>Pieza</th><th>Marca</th><th>Línea</th><th>Año</th><th>Comprador</th><th>Urgencia</th></tr></thead>
        <tbody>
          ${solicitudes.map((s) => `
            <tr>
              <td>${new Date(s.fecha).toLocaleDateString("es-GT")}</td>
              <td>${s.parte || s.categoria || ""}</td>
              <td>${s.marca || ""}</td>
              <td>${s.linea || ""}</td>
              <td>${s.anio || ""}</td>
              <td>${s.nombre || ""}<br><small>${s.waComprador || ""}</small></td>
              <td>${s.urgencia || "Media"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>`;
}

function renderAdminVendedores() {
  const vendedores = DB.getVendedores();
  const total = document.getElementById("admin-total-vend");
  const pendientes = document.getElementById("admin-pend-vend");
  if (total) total.textContent = vendedores.length;
  if (pendientes) pendientes.textContent = vendedores.filter((v) => v.estado === "pendiente").length;

  const container = document.getElementById("admin-vendedores");
  if (!container) return;

  if (vendedores.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🏪</div><p>Sin vendedores registrados.</p></div>';
    return;
  }

  container.innerHTML = vendedores.map((v) => `
    <div class="solicitud-card">
      <b>${v.nombre}</b><br>
      <span>${v.whatsapp} · ${v.muni || ""}, ${v.depto || ""}</span>
    </div>
  `).join("");
}

function renderAdminMetricas() {
  const solicitudes = DB.getSolicitudes();
  const marcas = {};
  const categorias = {};
  solicitudes.forEach((s) => {
    if (s.marca) marcas[s.marca] = (marcas[s.marca] || 0) + 1;
    if (s.categoria) categorias[s.categoria] = (categorias[s.categoria] || 0) + 1;
  });

  const renderRows = (obj) => Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, value]) => `<div class="metric-row"><span>${key}</span><span class="metric-val">${value}</span></div>`)
    .join("") || '<p class="muted">Sin datos</p>';

  const marcasEl = document.getElementById("metricas-marcas");
  const catEl = document.getElementById("metricas-cat");
  if (marcasEl) marcasEl.innerHTML = renderRows(marcas);
  if (catEl) catEl.innerHTML = renderRows(categorias);
}

function cambiarEstadoVendedor(id, estado) {
  DB.updateVendedor(id, { estado });
  toast(`Vendedor marcado como: ${estado}`);
  renderAdminVendedores();
}

function exportarSolicitudes() {
  const blob = new Blob([JSON.stringify(DB.getSolicitudes(), null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `solicitudes_srgt_${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportarVendedores() {
  const blob = new Blob([JSON.stringify(DB.getVendedores(), null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `vendedores_srgt_${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function cargarDemoData() {
  DB.saveSolicitudes([
    {
      id: genId(),
      fecha: new Date().toISOString(),
      estado: "nueva",
      marca: "Toyota",
      linea: "Corolla",
      anio: "2010",
      categoria: "Motor",
      parte: "Alternador",
      condicion: "Usada",
      depto: "Guatemala",
      muni: "Guatemala",
      nombre: "Cliente Demo",
      waComprador: "50255551234",
      urgencia: "Alta"
    }
  ]);
  toast("Datos de demo cargados");
  renderPanelVendedor();
  renderPanelAdmin();
}

function setupUrgenciaButtons() {
  document.querySelectorAll(".urgencia-btn").forEach((button) => {
    button.addEventListener("click", function () {
      document.querySelectorAll(".urgencia-btn").forEach((btn) => btn.classList.remove("active"));
      this.classList.add("active");
      const hidden = document.querySelector('[name="urgencia"]');
      if (hidden) hidden.value = this.dataset.val || "Media";
    });
  });
}

function setupNavigation() {
  document.querySelectorAll("[data-page]").forEach((element) => {
    element.addEventListener("click", (event) => {
      event.preventDefault();
      const page = element.dataset.page;
      if (page === "page-panel-vendedor") renderPanelVendedor();
      if (page === "page-admin") renderPanelAdmin();
      showPage(page);
    });
  });

  document.getElementById("hamburger")?.addEventListener("click", () => {
    document.getElementById("mobile-menu")?.classList.toggle("open");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupUrgenciaButtons();
  initFormComprador();
  initFormVendedor();

  document.getElementById("btn-export-sol")?.addEventListener("click", exportarSolicitudes);
  document.getElementById("btn-export-vend")?.addEventListener("click", exportarVendedores);
  document.getElementById("btn-demo-data")?.addEventListener("click", cargarDemoData);

  showPage("page-landing");
});
