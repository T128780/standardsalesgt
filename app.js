// Standard Repuestos GT — App Logic
// v20: Rediseño de lujo. Misma lógica de envío a Google Sheets + WhatsApp.
//      Se agregan las funciones de paneles (admin, vendedor y accesos) que
//      la versión anterior referenciaba pero nunca incluyó.

const WA_VENDEDOR_PRUEBA = "50230317750";
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyh_HwnZ_vEbboRVvcsJfMoq78K6LUMscsChJPwfQ7YsMzZ8V2Pj_Ia_b250ShbUfcI/exec";

function catalogos() {
  try {
    if (typeof CAT !== "undefined") return CAT;
  } catch (error) {}
  return window.CAT || { marcas: {}, categorias: {}, departamentos: {}, cilindraje: {} };
}

const DB = {
  getSolicitudes: () => JSON.parse(localStorage.getItem("srgt_solicitudes") || "[]"),
  saveSolicitudes: (items) => localStorage.setItem("srgt_solicitudes", JSON.stringify(items)),
  getVendedores: () => JSON.parse(localStorage.getItem("srgt_vendedores") || "[]"),
  saveVendedores: (items) => localStorage.setItem("srgt_vendedores", JSON.stringify(items)),
  getAccesos: () => JSON.parse(localStorage.getItem("srgt_accesos") || "[]"),
  saveAccesos: (items) => localStorage.setItem("srgt_accesos", JSON.stringify(items)),
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
  const cat = catalogos();
  const values = Object.keys(cat.marcas || {}).sort();
  setOptions(select, "Marca", values);
}

function buildLineas(marcaSelect, lineaSelect) {
  const cat = catalogos();
  const marca = marcaSelect?.value || "";
  const values = marca && cat.marcas?.[marca] ? cat.marcas[marca] : [];
  setOptions(lineaSelect, "Línea / Modelo", values);
}

function buildCategorias(select) {
  const cat = catalogos();
  const values = Object.keys(cat.categorias || {}).sort();
  setOptions(select, "Categoría del repuesto", values);
}

function buildPartes(categoriaSelect, parteSelect) {
  const cat = catalogos();
  const categoria = categoriaSelect?.value || "";
  const values = categoria && cat.categorias?.[categoria] ? cat.categorias[categoria] : [];
  setOptions(parteSelect, "Parte específica", values);
}

function buildDeptos(select) {
  const cat = catalogos();
  const values = Object.keys(cat.departamentos || {}).sort();
  setOptions(select, "Departamento", values);
}

function buildMunicipios(deptoSelect, muniSelect) {
  const cat = catalogos();
  const depto = deptoSelect?.value || "";
  const values = depto && cat.departamentos?.[depto] ? cat.departamentos[depto] : [];
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
  const cat = catalogos();
  const values = Object.keys(cat.cilindraje || {}).sort((a, b) => Number(a) - Number(b));
  setOptions(select, "No sé", values.map((v) => `${v}`));
}

function syncCC(cilindrajeSelect, ccSelect) {
  if (!ccSelect) return;
  const cat = catalogos();
  const value = cilindrajeSelect?.value || "";
  ccSelect.value = value && cat.cilindraje?.[value] ? cat.cilindraje[value] : "";
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

  await fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    body: params
  });
}

async function enviarSolicitudVendedor(vendedor) {
  const params = new URLSearchParams();

  params.append("accion", "registrar_vendedor");
  params.append("origenLead", "web_standard_repuestos_gt");
  params.append("estado", "Pendiente");
  params.append("nombreComercial", vendedor.nombre);
  params.append("nombreContacto", vendedor.encargado);
  params.append("whatsapp", vendedor.whatsapp);
  params.append("departamento", vendedor.depto);
  params.append("municipio", vendedor.muni);
  params.append("zona", vendedor.zona);
  params.append("marcas", vendedor.marcas.join(", "));
  params.append("lineas", vendedor.lineas.join(", "));
  params.append("categorias", vendedor.categorias.join(", "));
  params.append("condicion", vendedor.condicionPiezas);
  params.append("plan", vendedor.plan);
  params.append("entregas", vendedor.entregas);
  params.append("observaciones", vendedor.observaciones);

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
    var __cbC = document.getElementById('consent-comprador');
    if (__cbC && !__cbC.checked) { alert('Debes aceptar los Términos y el Aviso de Privacidad para enviar tu solicitud.'); __cbC.focus(); return; }
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
      toast("Solicitud registrada. Vendedores compatibles podrán contactarte por WhatsApp.");
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
    Object.keys(catalogos().marcas || {}).sort().forEach((marca) => {
      const label = document.createElement("label");
      label.className = "check-pill";
      label.innerHTML = `<input type="checkbox" name="marcas" value="${marca}"><span>${marca}</span>`;
      marcasWrap.appendChild(label);
    });
  }

  const categoriasWrap = document.getElementById("vend-categorias");
  if (categoriasWrap && categoriasWrap.children.length === 0) {
    Object.keys(catalogos().categorias || {}).sort().forEach((categoria) => {
      const label = document.createElement("label");
      label.className = "check-pill";
      label.innerHTML = `<input type="checkbox" name="vcat" value="${categoria}"><span>${categoria}</span>`;
      categoriasWrap.appendChild(label);
    });
  }

  // Selector de marca para filtrar líneas
  const filtro = document.getElementById("vend-marca-filtro");
  if (filtro && filtro.options.length <= 1) {
    Object.keys(catalogos().marcas || {}).sort().forEach((marca) => {
      const option = document.createElement("option");
      option.value = marca;
      option.textContent = marca;
      filtro.appendChild(option);
    });
  }

  buildDeptos(form.querySelector('[name="vdepto"]'));
  form.querySelector('[name="vdepto"]')?.addEventListener("change", function () {
    buildMunicipios(this, form.querySelector('[name="vmuni"]'));
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    var __cbV = document.getElementById('consent-vendedor');
    if (__cbV && !__cbV.checked) { alert('Debes aceptar los Términos y el Aviso de Privacidad para enviar tu solicitud.'); __cbV.focus(); return; }
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
      lineas: [...vendLineasSeleccionadas],
      categorias: [...form.querySelectorAll('[name="vcat"]:checked')].map((input) => input.value),
      condicionPiezas: getFormValue(form, "vcondicion"),
      plan: getFormValue(form, "vplan"),
      envios: form.querySelector('[name="venvios"]')?.checked || false,
      entregas: getFormValue(form, "ventregasDetalle") ||
        (form.querySelector('[name="ventregas"]')?.checked ? "Sí" : "No"),
      observaciones: getFormValue(form, "vobservaciones")
    };

    if (!vendedor.nombre || !vendedor.whatsapp || !vendedor.depto) {
      toast("Completa: Nombre comercial, WhatsApp y Departamento", "error");
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton?.innerHTML;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Enviando solicitud...";
    }

    try {
      await enviarSolicitudVendedor(vendedor);
      DB.addVendedor(vendedor);
      toast("¡Solicitud de adhesión enviada! Te contactaremos pronto.");
      form.reset();
      vendLineasSeleccionadas.clear();
      renderLineasVendedor();
      showPage("page-vendedor-ok");
    } catch (error) {
      console.error("Error enviando solicitud de vendedor", error);
      toast("No se pudo enviar la solicitud. Intenta de nuevo.", "error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
      }
    }
  });
}

/* ══════════════════════════════════════════════════════════════
   LÍNEAS DEL VENDEDOR (filtro por marca + líneas personalizadas)
   ══════════════════════════════════════════════════════════════ */

const vendLineasSeleccionadas = new Set();

function syncLineasHidden() {
  const hidden = document.getElementById("vlineas-selected");
  if (hidden) hidden.value = [...vendLineasSeleccionadas].join(", ");
}

function renderLineasVendedor() {
  const wrap = document.getElementById("vend-lineas");
  if (!wrap) return;

  const marca = document.getElementById("vend-marca-filtro")?.value || "";
  const cat = catalogos();
  const deMarca = marca && cat.marcas?.[marca] ? cat.marcas[marca] : [];

  // Mostramos las líneas de la marca filtrada + todas las ya seleccionadas
  const visibles = [...new Set([...deMarca, ...vendLineasSeleccionadas])].sort();

  wrap.innerHTML = "";
  if (visibles.length === 0) {
    wrap.innerHTML = '<p class="muted" style="padding:6px">Selecciona una marca arriba para ver sus líneas.</p>';
    return;
  }

  visibles.forEach((linea) => {
    const label = document.createElement("label");
    label.className = "check-pill";
    const checked = vendLineasSeleccionadas.has(linea) ? "checked" : "";
    label.innerHTML = `<input type="checkbox" value="${linea}" ${checked}><span>${linea}</span>`;
    label.querySelector("input").addEventListener("change", function () {
      if (this.checked) vendLineasSeleccionadas.add(linea);
      else vendLineasSeleccionadas.delete(linea);
      syncLineasHidden();
    });
    wrap.appendChild(label);
  });
  syncLineasHidden();
}

function filtrarLineasVendedor() {
  renderLineasVendedor();
}

function agregarLineaCustom() {
  const input = document.getElementById("vend-linea-custom-input");
  const valor = (input?.value || "").trim();
  if (!valor) {
    toast("Escribe el nombre de la línea que quieres agregar", "error");
    return;
  }
  vendLineasSeleccionadas.add(valor);
  if (input) input.value = "";
  renderLineasVendedor();
  toast(`Línea "${valor}" agregada`);
}

/* ══════════════════════════════════════════════════════════════
   COMPROBANTE DE PAGO (vista previa local)
   ══════════════════════════════════════════════════════════════ */

function mostrarComprobante(input) {
  const preview = document.getElementById("comprobante-preview");
  if (!preview) return;
  const file = input.files && input.files[0];
  if (!file) { preview.style.display = "none"; return; }

  if (file.size > 5 * 1024 * 1024) {
    toast("El archivo supera los 5MB. Usa una imagen más liviana.", "error");
    input.value = "";
    preview.style.display = "none";
    return;
  }

  preview.style.display = "block";
  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;background:rgba(201,162,75,.07);border:1px solid rgba(232,206,140,.25);border-radius:4px;padding:10px 12px">
          <img src="${e.target.result}" alt="Comprobante" style="width:54px;height:54px;object-fit:cover;border-radius:3px">
          <div style="font-size:13px;color:#EAE5D9;font-weight:600">${file.name}<br><small style="color:#A89F8C;font-weight:500">Listo para enviar ✓</small></div>
        </div>`;
    };
    reader.readAsDataURL(file);
  } else {
    preview.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;background:rgba(201,162,75,.07);border:1px solid rgba(232,206,140,.25);border-radius:4px;padding:10px 12px">
        <span style="font-size:26px">🧾</span>
        <div style="font-size:13px;color:#EAE5D9;font-weight:600">${file.name}<br><small style="color:#A89F8C;font-weight:500">Listo para enviar ✓</small></div>
      </div>`;
  }
}

function handleComprobanteDrop(event) {
  event.preventDefault();
  document.getElementById("comprobante-drop")?.classList.remove("over");
  const fileInput = document.getElementById("comprobante-file");
  if (fileInput && event.dataTransfer.files.length > 0) {
    fileInput.files = event.dataTransfer.files;
    mostrarComprobante(fileInput);
  }
}

/* ══════════════════════════════════════════════════════════════
   LOGIN ADMIN (con bloqueo tras 3 intentos, según guía)
   ══════════════════════════════════════════════════════════════ */

let adminIntentosFallidos = 0;
let adminBloqueadoHasta = 0;
let adminSessionPassword = "";
let adminPendingRequests = [];

/* ══════════════════════════════════════════════════════════════
   LOGIN VENDEDOR (usuarios creados en la pestaña Accesos)
   ══════════════════════════════════════════════════════════════ */

async function adminRequest(action, data = {}) {
  const params = new URLSearchParams();
  params.append("accion", action);
  params.append("adminPassword", adminSessionPassword);
  Object.entries(data).forEach(([key, value]) => params.append(key, String(value)));

  const response = await fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    body: params
  });

  if (!response.ok) throw new Error("No se pudo conectar con el panel administrativo.");
  const result = await response.json();
  if (!result.ok) throw new Error(result.error || "La operación no pudo completarse.");
  return result;
}

async function checkAdminLogin() {
  const input = document.getElementById("admin-password");
  const errorEl = document.getElementById("admin-error");
  const button = document.getElementById("admin-login-button");
  if (!input) return;

  const ahora = Date.now();
  if (ahora < adminBloqueadoHasta) {
    const segundos = Math.ceil((adminBloqueadoHasta - ahora) / 1000);
    if (errorEl) {
      errorEl.textContent = `Demasiados intentos. Espera ${segundos} segundos.`;
      errorEl.style.display = "block";
    }
    return;
  }

  const password = input.value;
  if (!password) {
    if (errorEl) {
      errorEl.textContent = "Ingresa la contraseña administrativa.";
      errorEl.style.display = "block";
    }
    return;
  }

  const originalText = button?.textContent || "Ingresar";
  if (button) {
    button.disabled = true;
    button.textContent = "Verificando...";
  }

  adminSessionPassword = password;

  try {
    const result = await adminRequest("admin_listar_solicitudes_vendedores");
    adminIntentosFallidos = 0;
    adminPendingRequests = Array.isArray(result.solicitudes) ? result.solicitudes : [];
    input.value = "";
    if (errorEl) errorEl.style.display = "none";
    showPage("page-admin");
    renderPanelAdmin();
  } catch (error) {
    adminSessionPassword = "";
    adminIntentosFallidos += 1;

    if (adminIntentosFallidos >= 3) {
      adminBloqueadoHasta = ahora + 30000;
      adminIntentosFallidos = 0;
      if (errorEl) errorEl.textContent = "Demasiados intentos. Espera 30 segundos.";
    } else if (errorEl) {
      errorEl.textContent = error.message || "Contraseña incorrecta.";
    }

    if (errorEl) errorEl.style.display = "block";
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
}

function toggleAdminPasswordVisibility() {
  const input = document.getElementById("admin-password");
  const button = document.getElementById("admin-password-toggle");
  if (!input || !button) return;

  const willShow = input.type === "password";
  input.type = willShow ? "text" : "password";
  button.setAttribute("aria-label", willShow ? "Ocultar contraseña" : "Mostrar contraseña");
  button.setAttribute("aria-pressed", String(willShow));
  button.setAttribute("title", willShow ? "Ocultar contraseña" : "Mostrar contraseña");
  button.innerHTML = `<i data-lucide="${willShow ? "eye-off" : "eye"}" aria-hidden="true"></i>`;
  window.lucide?.createIcons();
  input.focus();
}

function checkVendorLogin() {
  const userInput = document.getElementById("vendor-user");
  const passInput = document.getElementById("vendor-pass");
  const errorEl = document.getElementById("vendor-error");
  if (!userInput || !passInput) return;

  const user = userInput.value.trim();
  const pass = passInput.value;
  const acceso = DB.getAccesos().find((a) => a.user === user && a.pass === pass && a.activo);

  if (acceso) {
    if (errorEl) errorEl.style.display = "none";
    userInput.value = "";
    passInput.value = "";
    showPage("page-panel-vendedor");
    renderPanelVendedor();
    toast(`Bienvenido, ${acceso.nombre}`);
  } else if (errorEl) {
    errorEl.style.display = "block";
  }
}

/* ══════════════════════════════════════════════════════════════
   GESTIÓN DE ACCESOS (pestaña Accesos del panel admin)
   ══════════════════════════════════════════════════════════════ */

function mostrarMsgAcceso(texto, esError) {
  const msg = document.getElementById("acceso-msg");
  if (!msg) return;
  msg.textContent = texto;
  msg.style.display = "block";
  msg.style.color = esError ? "#E0655A" : "#7FB069";
  msg.style.fontWeight = "700";
}

function agregarVendedorAcceso() {
  const nombre = (document.getElementById("new-nombre")?.value || "").trim();
  const plan = document.getElementById("new-plan")?.value || "Pro";
  const user = (document.getElementById("new-user")?.value || "").trim();
  const pass = (document.getElementById("new-pass")?.value || "").trim();

  if (!nombre || !user || !pass) {
    mostrarMsgAcceso("Completa: nombre del negocio, usuario y contraseña.", true);
    return;
  }
  if (/\s/.test(user)) {
    mostrarMsgAcceso("El usuario no debe llevar espacios.", true);
    return;
  }

  const accesos = DB.getAccesos();
  if (accesos.some((a) => a.user === user)) {
    mostrarMsgAcceso(`El usuario "${user}" ya existe. Elige otro.`, true);
    return;
  }

  accesos.unshift({ id: genId(), nombre, plan, user, pass, activo: true, fecha: new Date().toISOString() });
  DB.saveAccesos(accesos);
  mostrarMsgAcceso(`Vendedor agregado. Usuario: ${user}`, false);

  ["new-nombre", "new-user", "new-pass"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  renderListaAccesos();
}

function toggleAcceso(id) {
  const accesos = DB.getAccesos();
  const acceso = accesos.find((a) => a.id === id);
  if (!acceso) return;
  acceso.activo = !acceso.activo;
  DB.saveAccesos(accesos);
  toast(acceso.activo ? `Acceso de "${acceso.nombre}" reactivado` : `Acceso de "${acceso.nombre}" desactivado`);
  renderListaAccesos();
}

function renderListaAccesos() {
  const lista = document.getElementById("lista-accesos");
  if (!lista) return;
  const accesos = DB.getAccesos();

  if (accesos.length === 0) {
    lista.innerHTML = '<div class="empty-state" style="padding:34px 20px"><p>Aún no has creado usuarios de vendedores.</p></div>';
    return;
  }

  lista.innerHTML = accesos.map((a) => `
    <div class="acceso-row">
      <div class="a-info">
        <span class="a-nombre">${a.nombre}</span>
        <span class="a-user">Usuario: ${a.user} · Contraseña: ${a.pass}</span>
      </div>
      <span class="a-plan">${a.plan}</span>
      <span class="a-estado ${a.activo ? "on" : "off"}">${a.activo ? "● Activo" : "● Inactivo"}</span>
      <button class="btn-ghost" onclick="toggleAcceso('${a.id}')">${a.activo ? "Desactivar" : "Reactivar"}</button>
    </div>
  `).join("");
}

/* ══════════════════════════════════════════════════════════════
   PANELES
   ══════════════════════════════════════════════════════════════ */

function renderPanelVendedor() {
  const solicitudes = DB.getSolicitudes();
  const total = document.getElementById("v-total");
  const altas = document.getElementById("v-alta");
  if (total) total.textContent = solicitudes.length;
  if (altas) altas.textContent = solicitudes.filter((s) => s.urgencia === "Alta").length;

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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatAdminDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? escapeHtml(value || "Sin fecha")
    : date.toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });
}

function renderPanelAdmin() {
  if (!adminSessionPassword) {
    showPage("page-admin-login");
    return;
  }

  const total = adminPendingRequests.length;
  const totalEl = document.getElementById("admin-total-sol");
  const pendingEl = document.getElementById("admin-pend-vend");
  if (totalEl) totalEl.textContent = total;
  if (pendingEl) pendingEl.textContent = total;
  renderAdminSolicitudesVendedores();
}

function renderAdminSolicitudesVendedores() {
  const container = document.getElementById("admin-solicitudes");
  if (!container) return;

  if (adminPendingRequests.length === 0) {
    container.innerHTML = `
      <div class="empty-state admin-empty-state">
        <i data-lucide="inbox"></i>
        <p>No hay solicitudes pendientes.</p>
      </div>`;
    window.lucide?.createIcons();
    return;
  }

  container.innerHTML = `<div class="admin-request-list">${adminPendingRequests.map((request) => {
    const rowNumber = Number(request.rowNumber);
    return `
      <article class="admin-request-card">
        <header class="admin-request-head">
          <div>
            <p class="admin-request-kicker">Solicitud pendiente</p>
            <h4>${escapeHtml(request.nombreComercial || "Sin nombre comercial")}</h4>
          </div>
          <div class="admin-request-summary">
            <span class="badge">${escapeHtml(request.plan || "Básico")}</span>
            <time>${formatAdminDate(request.fecha)}</time>
          </div>
        </header>
        <dl class="admin-request-grid">
          <div><dt>Contacto</dt><dd>${escapeHtml(request.nombreContacto || "—")}</dd></div>
          <div><dt>WhatsApp</dt><dd>${escapeHtml(request.whatsapp || "—")}</dd></div>
          <div><dt>Departamento</dt><dd>${escapeHtml(request.departamento || "—")}</dd></div>
          <div><dt>Municipio / zona</dt><dd>${escapeHtml([request.municipio, request.zona].filter(Boolean).join(" · ") || "—")}</dd></div>
          <div><dt>Marcas</dt><dd>${escapeHtml(request.marcas || "Todas")}</dd></div>
          <div><dt>Categorías</dt><dd>${escapeHtml(request.categorias || "Todas")}</dd></div>
          <div><dt>Condición</dt><dd>${escapeHtml(request.condicion || "Todas")}</dd></div>
          <div><dt>Entregas</dt><dd>${escapeHtml(request.entregas || "—")}</dd></div>
        </dl>
        ${request.observaciones ? `<p class="admin-request-notes"><strong>Observaciones:</strong> ${escapeHtml(request.observaciones)}</p>` : ""}
        <footer class="admin-request-actions">
          <button class="btn-admin-approve" type="button" onclick="aprobarSolicitudAdmin(${rowNumber})">
            <i data-lucide="check"></i><span>Aprobar vendedor</span>
          </button>
          <button class="btn-admin-reject" type="button" onclick="rechazarSolicitudAdmin(${rowNumber})">
            <i data-lucide="x"></i><span>Rechazar</span>
          </button>
        </footer>
      </article>`;
  }).join("")}</div>`;

  window.lucide?.createIcons();
}

async function cargarSolicitudesAdmin() {
  if (!adminSessionPassword) {
    showPage("page-admin-login");
    return;
  }

  const container = document.getElementById("admin-solicitudes");
  const button = document.getElementById("btn-refresh-admin");
  if (container) container.innerHTML = '<div class="admin-loading"><span class="spinner"></span>Actualizando solicitudes...</div>';
  if (button) button.disabled = true;

  try {
    const result = await adminRequest("admin_listar_solicitudes_vendedores");
    adminPendingRequests = Array.isArray(result.solicitudes) ? result.solicitudes : [];
    renderPanelAdmin();
  } catch (error) {
    if (container) container.innerHTML = `<div class="empty-state"><p>${escapeHtml(error.message)}</p></div>`;
    toast(error.message || "No se pudieron actualizar las solicitudes.", "error");
  } finally {
    if (button) button.disabled = false;
  }
}

async function aprobarSolicitudAdmin(rowNumber) {
  if (!Number.isInteger(rowNumber) || rowNumber < 2) return;
  if (!window.confirm("¿Aprobar este vendedor y activarlo para recibir leads?")) return;

  try {
    await adminRequest("admin_aprobar_vendedor", { rowNumber });
    toast("Vendedor aprobado y activado.");
    await cargarSolicitudesAdmin();
  } catch (error) {
    toast(error.message || "No se pudo aprobar al vendedor.", "error");
  }
}

async function rechazarSolicitudAdmin(rowNumber) {
  if (!Number.isInteger(rowNumber) || rowNumber < 2) return;
  if (!window.confirm("¿Marcar esta solicitud como rechazada? La fila se conservará en Sheets.")) return;

  try {
    await adminRequest("admin_rechazar_vendedor", { rowNumber });
    toast("Solicitud marcada como rechazada.");
    await cargarSolicitudesAdmin();
  } catch (error) {
    toast(error.message || "No se pudo rechazar la solicitud.", "error");
  }
}

function cerrarSesionAdmin() {
  adminSessionPassword = "";
  adminPendingRequests = [];
  const input = document.getElementById("admin-password");
  if (input) input.value = "";
  showPage("page-admin-login");
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
      <div class="sol-header">
        <div class="sol-pieza">${v.nombre}</div>
        ${v.plan ? `<span class="badge">${v.plan}</span>` : ""}
      </div>
      <div class="sol-meta">
        <span>📱 ${v.whatsapp}</span>
        <span>📍 ${v.muni || ""}, ${v.depto || ""}</span>
        ${v.tipo ? `<span>🏪 ${v.tipo}</span>` : ""}
      </div>
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
    document.getElementById("hamburger")?.classList.toggle("open");
  });
}

/* ══════════════════════════════════════════════════════════════
   RUTAS OCULTAS: #admin y #panel (según guía de administración)
   ══════════════════════════════════════════════════════════════ */

function manejarHash() {
  const hash = (window.location.hash || "").toLowerCase();
  if (hash === "#admin") showPage("page-admin-login");
  else if (hash === "#panel") showPage("page-vendor-login");
}

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupUrgenciaButtons();
  initFormComprador();
  initFormVendedor();
  renderLineasVendedor();

  // Panel vendedor
  document.getElementById("btn-export-sol")?.addEventListener("click", exportarSolicitudes);

  // Panel admin conectado a Google Sheets
  document.getElementById("btn-refresh-admin")?.addEventListener("click", cargarSolicitudesAdmin);
  document.getElementById("btn-logout-admin")?.addEventListener("click", cerrarSesionAdmin);

  showPage("page-landing");
  manejarHash();
  window.addEventListener("hashchange", manejarHash);
});
