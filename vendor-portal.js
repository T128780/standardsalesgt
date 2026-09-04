"use strict";

const VENDOR_SESSION_KEY = "standard_sales_vendor_session";
let vendorSession = null;
let vendorProfile = null;
let adminChangesLoading = false;

function vendorApi(action, data = {}) {
  const params = new URLSearchParams({ accion: action });
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) params.append(key, String(value));
  });
  params.append("userAgent", navigator.userAgent || "");
  return fetch(GOOGLE_SCRIPT_URL, { method: "POST", body: params })
    .then(response => {
      if (!response.ok) throw new Error("No se pudo conectar con el portal.");
      return response.json();
    })
    .then(result => {
      if (!result.ok) throw new Error(result.error || "La operación no pudo completarse.");
      return result;
    });
}

function saveVendorSession(session) {
  vendorSession = session;
  if (session) sessionStorage.setItem(VENDOR_SESSION_KEY, JSON.stringify(session));
  else sessionStorage.removeItem(VENDOR_SESSION_KEY);
}

function restoreVendorSession() {
  try {
    vendorSession = JSON.parse(sessionStorage.getItem(VENDOR_SESSION_KEY) || "null");
  } catch (error) {
    saveVendorSession(null);
  }
  return vendorSession;
}

function toggleVendorPasswordVisibility(inputId, button) {
  const input = document.getElementById(inputId);
  if (!input || !button) return;
  const willShow = input.type === "password";
  input.type = willShow ? "text" : "password";
  const label = willShow ? "Ocultar contraseña" : "Mostrar contraseña";
  button.setAttribute("aria-label", label);
  button.setAttribute("title", label);
  button.setAttribute("aria-pressed", String(willShow));
  button.innerHTML = `<i data-lucide="${willShow ? "eye-off" : "eye"}" aria-hidden="true"></i>`;
  if (window.lucide) window.lucide.createIcons();
}
window.toggleVendorPasswordVisibility = toggleVendorPasswordVisibility;

window.checkVendorLogin = async function checkVendorLoginSecure() {
  const userInput = document.getElementById("vendor-user");
  const passInput = document.getElementById("vendor-pass");
  const errorEl = document.getElementById("vendor-error");
  const button = document.getElementById("vendor-login-button");
  const user = userInput?.value.trim() || "";
  const password = passInput?.value || "";
  if (!user || !password) {
    if (errorEl) {
      errorEl.textContent = "Ingresa usuario y contraseña.";
      errorEl.style.display = "block";
    }
    return;
  }
  if (button) {
    button.disabled = true;
    button.textContent = "Verificando...";
  }
  try {
    const result = await vendorApi("vendedor_login", { usuario: user, clave: password });
    saveVendorSession({
      token: result.token,
      expiresAt: Date.now() + Number(result.expiresIn || 7200) * 1000,
      requiereCambioClave: Boolean(result.requiereCambioClave),
      vendedor: result.vendedor || {}
    });
    userInput.value = "";
    passInput.value = "";
    if (errorEl) errorEl.style.display = "none";
    showPage("page-panel-vendedor");
    await loadVendorPortal();
  } catch (error) {
    if (errorEl) {
      errorEl.textContent = error.message || "Usuario o clave incorrectos.";
      errorEl.style.display = "block";
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Ingresar";
    }
  }
};

async function vendorLogout() {
  const token = vendorSession?.token;
  saveVendorSession(null);
  vendorProfile = null;
  if (token) vendorApi("vendedor_logout", { token }).catch(() => {});
  location.hash = "vendedor";
  showPage("page-vendor-login");
}
window.vendorLogout = vendorLogout;

function requireLocalVendorSession() {
  const session = vendorSession || restoreVendorSession();
  if (!session?.token || Number(session.expiresAt) <= Date.now()) {
    saveVendorSession(null);
    showPage("page-vendor-login");
    throw new Error("Sesión vencida.");
  }
  return session;
}

async function loadVendorPortal() {
  const session = requireLocalVendorSession();
  document.getElementById("vendor-panel-title").textContent =
    session.vendedor?.nombreComercial || "Panel del vendedor";
  const required = document.getElementById("vendor-password-required");
  const content = document.getElementById("vendor-portal-content");
  required.hidden = !session.requiereCambioClave;
  content.hidden = session.requiereCambioClave;
  document.querySelector(".vendor-tabs").hidden = session.requiereCambioClave;
  if (session.requiereCambioClave) return;
  await Promise.all([loadVendorLeads(), loadVendorProfile()]);
}

async function loadVendorLeads() {
  const session = requireLocalVendorSession();
  const container = document.getElementById("panel-solicitudes");
  try {
    const result = await vendorApi("vendedor_mis_leads", { token: session.token });
    renderVendorMetrics(result.metricas || {});
    renderVendorLeads(result.leads || []);
  } catch (error) {
    if (container) container.textContent = error.message;
    if (/sesión|suspendida|cancelada/i.test(error.message)) vendorLogout();
  }
}

function setVendorText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value === "" || value == null ? "-" : String(value);
}

function renderVendorMetrics(metrics) {
  setVendorText("v-total", Number(metrics.total) || 0);
  setVendorText("v-today", Number(metrics.hoy) || 0);
  setVendorText("v-7d", Number(metrics.ultimos7Dias) || 0);
  setVendorText("v-30d", Number(metrics.ultimos30Dias) || 0);
  setVendorText("v-top-brand", metrics.marcaMasSolicitada || "-");
  setVendorText("v-top-category", metrics.categoriaMasSolicitada || "-");
}

function addDetail(dl, label, value) {
  if (!value) return;
  const wrapper = document.createElement("div");
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");
  dt.textContent = label;
  dd.textContent = String(value);
  wrapper.append(dt, dd);
  dl.appendChild(wrapper);
}

function renderVendorLeads(leads) {
  const container = document.getElementById("panel-solicitudes");
  if (!container) return;
  container.replaceChildren();
  if (!leads.length) {
    const empty = document.createElement("div");
    empty.className = "admin-inline-empty";
    empty.textContent = "Aún no has recibido solicitudes.";
    container.appendChild(empty);
    return;
  }
  leads.forEach(lead => {
    const article = document.createElement("article");
    article.className = "vendor-lead-card";
    const head = document.createElement("header");
    const title = document.createElement("h3");
    const date = document.createElement("time");
    title.textContent = lead.parte || lead.categoria || "Solicitud";
    date.textContent = lead.fecha ? new Date(lead.fecha).toLocaleString("es-GT") : "";
    head.append(title, date);
    const dl = document.createElement("dl");
    [
      ["Comprador", lead.nombreComprador], ["WhatsApp", lead.whatsappComprador],
      ["Vehículo", [lead.marca, lead.linea, lead.anio].filter(Boolean).join(" ")],
      ["Categoría", lead.categoria], ["Condición", lead.condicion],
      ["Departamento", lead.departamento], ["Urgencia", lead.urgencia],
      ["Estado", lead.estadoEnvio], ["Message ID", lead.messageId],
      ["Observaciones", lead.observaciones]
    ].forEach(([label, value]) => addDetail(dl, label, value));
    article.append(head, dl);
    container.appendChild(article);
  });
}

async function loadVendorProfile() {
  const session = requireLocalVendorSession();
  const result = await vendorApi("vendedor_mi_perfil", { token: session.token });
  vendorProfile = result.perfil || {};
  const container = document.getElementById("vendor-profile");
  if (!container) return;
  container.replaceChildren();
  const labels = {
    nombreComercial: "Nombre comercial", whatsapp: "WhatsApp", plan: "Plan",
    estado: "Estado", estadoMembresia: "Estado membresía",
    fechaInscripcion: "Fecha de inscripción", fechaVencimiento: "Vencimiento",
    origenes: "Orígenes", marcas: "Marcas", lineas: "Líneas",
    categorias: "Categorías", piezasSuspension: "Piezas suspensión",
    otraPiezaSuspension: "Otra pieza suspensión", procedencia: "Procedencia",
    condicion: "Condición", departamento: "Departamento",
    entregas: "Entregas / cobertura", municipio: "Municipio", zona: "Zona"
  };
  Object.entries(labels).forEach(([key, label]) => {
    const item = document.createElement("div");
    const term = document.createElement("span");
    const value = document.createElement("strong");
    term.textContent = label;
    const rawValue = vendorProfile[key];
    value.textContent = ["fechaInscripcion", "fechaVencimiento"].includes(key)
      ? formatVendorDate(rawValue)
      : rawValue || "Sin configurar";
    item.append(term, value);
    container.appendChild(item);
  });
  populateVendorProfileEditor();
}

function formatVendorDate(value) {
  if (!value) return "Sin configurar";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function switchVendorTab(tab) {
  document.querySelectorAll("[data-vendor-tab]").forEach(button => {
    button.classList.toggle("active", button.dataset.vendorTab === tab);
  });
  document.querySelectorAll("[data-vendor-view]").forEach(view => {
    view.hidden = view.dataset.vendorView !== tab;
  });
  if (tab === "changes") populateVendorProfileEditor();
}

async function submitVendorPassword(form) {
  const data = new FormData(form);
  const password = String(data.get("claveNueva") || "");
  if (password !== String(data.get("confirmacion") || "")) {
    toast("Las claves no coinciden.", "error");
    return;
  }
  const session = requireLocalVendorSession();
  await vendorApi("vendedor_cambiar_clave", { token: session.token, claveNueva: password });
  session.requiereCambioClave = false;
  saveVendorSession(session);
  form.reset();
  toast("Clave actualizada.");
  await loadVendorPortal();
}

const vendorEditLineasSeleccionadas = new Set();
const vendorEditLineasManuales = new Set();

function sellerEditConfig() {
  return window.SRGT_SELLER_FORM_CONFIG || {
    brandGroups: {},
    categories: [],
    originTitles: {},
    linesByBrand: {}
  };
}

function splitVendorList(value) {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
  return String(value || "")
    .split(/[,;\n|]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeVendorOption(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function getVendorProfileValue(...keys) {
  if (!vendorProfile) return "";
  for (const key of keys) {
    const value = vendorProfile[key];
    if (value !== undefined && value !== null && String(value).trim()) return value;
  }
  return "";
}

function getVendorEditBrandLines(brand) {
  const helpers = window.SRGT_SELLER_FORM_HELPERS || {};
  if (typeof helpers.getSellerBrandLines === "function") return helpers.getSellerBrandLines(brand);
  const config = sellerEditConfig();
  return config.linesByBrand[brand] || [];
}

function inferVendorEditOrigins(brands) {
  const config = sellerEditConfig();
  const origins = [];
  Object.entries(config.brandGroups).forEach(([origin, originBrands]) => {
    if (brands.some(brand => originBrands.includes(brand))) origins.push(origin);
  });
  return origins;
}

function setVendorEditChecked(form, name, values) {
  const normalized = new Set(values.map(normalizeVendorOption));
  form.querySelectorAll(`input[name="${name}"]`).forEach(input => {
    input.checked = normalized.has(normalizeVendorOption(input.value));
  });
}

function setVendorEditRadio(form, name, value) {
  const normalized = normalizeVendorOption(value);
  form.querySelectorAll(`input[name="${name}"]`).forEach(input => {
    input.checked = normalized && normalizeVendorOption(input.value) === normalized;
  });
}

function setVendorEditValue(form, name, value) {
  const field = form.elements.namedItem(name);
  if (field && "value" in field) field.value = value || "";
}

function syncVendorEditLines() {
  const selectedHidden = document.getElementById("vendor-edit-vlineas-selected");
  const manualHidden = document.getElementById("vendor-edit-vlineas-manuales");
  const list = document.getElementById("vendor-edit-lineas-manuales-list");
  if (selectedHidden) selectedHidden.value = [...vendorEditLineasSeleccionadas].join(", ");
  if (manualHidden) manualHidden.value = [...vendorEditLineasManuales].join(", ");
  if (!list) return;
  list.replaceChildren();
  vendorEditLineasManuales.forEach(linea => {
    const chip = document.createElement("button");
    const close = document.createElement("span");
    chip.type = "button";
    chip.className = "manual-line-chip";
    chip.dataset.vendorEditLinea = linea;
    chip.append(document.createTextNode(linea));
    close.setAttribute("aria-hidden", "true");
    close.textContent = "×";
    chip.appendChild(close);
    list.appendChild(chip);
  });
}

function renderVendorEditBrands(form) {
  const config = sellerEditConfig();
  const wrap = document.getElementById("vendor-edit-marcas");
  const label = document.getElementById("vendor-edit-marcas-label");
  if (!wrap) return;
  const selectedOrigins = [...form.querySelectorAll('input[name="vorigenes"]:checked')].map(input => input.value);
  const selectedBrands = new Set([...form.querySelectorAll('input[name="marcas"]:checked')].map(input => input.value));
  const allowedBrands = new Set(selectedOrigins.flatMap(origin => config.brandGroups[origin] || []));
  selectedBrands.forEach(brand => {
    if (!allowedBrands.has(brand)) selectedBrands.delete(brand);
  });
  wrap.replaceChildren();
  if (label) label.hidden = selectedOrigins.length === 0;
  selectedOrigins.forEach(origin => {
    const group = document.createElement("section");
    const title = document.createElement("h4");
    const pills = document.createElement("div");
    group.className = "seller-brand-group";
    title.textContent = config.originTitles[origin] || origin;
    pills.className = "check-pills";
    (config.brandGroups[origin] || []).forEach(marca => {
      const item = document.createElement("label");
      item.className = "check-pill";
      item.innerHTML = `<input type="checkbox" name="marcas" value="${marca}"><span>${marca}</span>`;
      item.querySelector("input").checked = selectedBrands.has(marca);
      pills.appendChild(item);
    });
    group.append(title, pills);
    wrap.appendChild(group);
  });
  renderVendorEditLines(form);
}

function renderVendorEditLines(form) {
  const wrap = document.getElementById("vendor-edit-lineas");
  if (!wrap) return;
  wrap.replaceChildren();
  const selectedBrands = [...form.querySelectorAll('input[name="marcas"]:checked')].map(input => input.value);
  selectedBrands.forEach(marca => {
    const group = document.createElement("section");
    const title = document.createElement("h4");
    const pills = document.createElement("div");
    group.className = "seller-brand-group seller-line-group";
    title.textContent = `Líneas ${marca}`;
    pills.className = "check-pills";
    getVendorEditBrandLines(marca).forEach(linea => {
      const item = document.createElement("label");
      item.className = "check-pill";
      item.innerHTML = `<input type="checkbox" name="vlineaCatalogo" value="${linea}" data-marca="${marca}"><span>${linea}</span>`;
      item.querySelector("input").checked = vendorEditLineasSeleccionadas.has(linea);
      pills.appendChild(item);
    });
    group.append(title, pills);
    wrap.appendChild(group);
  });
  syncVendorEditLines();
}

function renameVendorInventoryId(form, currentId, editId) {
  const element = form.querySelector(`#${currentId}`);
  if (element) element.id = editId;
}

function ensureVendorInventoryMatrixForm() {
  const host = document.getElementById("vendor-inventory-form-host");
  if (!host) return document.getElementById("vendor-profile-change-form");
  const current = document.getElementById("vendor-profile-change-form");
  if (current) return current;

  const source = document.getElementById("form-vendedor");
  if (!source) {
    host.textContent = "No se encontró el formulario matriz de vendedor.";
    return null;
  }

  const form = source.cloneNode(true);
  form.id = "vendor-profile-change-form";
  form.className = "seller-edit-form";
  form.dataset.formMode = "edicionPerfilVendedor";
  form.dataset.initialized = "";
  form.removeAttribute("onsubmit");

  form.querySelector('[name="website"]')?.closest("div")?.remove();
  form.querySelector('[name="formStartedAt"]')?.remove();
  form.querySelector('[name="vplan"]')?.closest(".form-section")?.remove();
  form.querySelector("#seccion-comprobante")?.remove();

  renameVendorInventoryId(form, "vend-origenes", "vendor-edit-origenes");
  renameVendorInventoryId(form, "vend-marcas-label", "vendor-edit-marcas-label");
  renameVendorInventoryId(form, "vend-marcas", "vendor-edit-marcas");
  renameVendorInventoryId(form, "vend-lineas", "vendor-edit-lineas");
  renameVendorInventoryId(form, "vend-lineas-custom", "vendor-edit-lineas-custom");
  renameVendorInventoryId(form, "vend-linea-custom-input", "vendor-edit-linea-custom-input");
  renameVendorInventoryId(form, "vend-lineas-manuales-list", "vendor-edit-lineas-manuales-list");
  renameVendorInventoryId(form, "vlineas-selected", "vendor-edit-vlineas-selected");
  renameVendorInventoryId(form, "vlineas-manuales", "vendor-edit-vlineas-manuales");
  renameVendorInventoryId(form, "vend-categorias", "vendor-edit-categorias");

  ["vendor-edit-origenes", "vendor-edit-marcas", "vendor-edit-lineas", "vendor-edit-categorias", "vendor-edit-lineas-manuales-list"].forEach(id => {
    const element = form.querySelector(`#${id}`);
    if (element) element.replaceChildren();
  });
  const brandLabel = form.querySelector("#vendor-edit-marcas-label");
  if (brandLabel) brandLabel.hidden = true;
  const addLineButton = form.querySelector("#vendor-edit-lineas-custom button");
  if (addLineButton) {
    addLineButton.id = "vendor-edit-add-line";
    addLineButton.removeAttribute("onclick");
  }

  const whatsapp = form.elements.namedItem("vwhatsapp");
  if (whatsapp) {
    whatsapp.readOnly = true;
    whatsapp.setAttribute("aria-readonly", "true");
    whatsapp.closest(".form-group")?.querySelector("label")?.replaceChildren(document.createTextNode("WhatsApp de login"));
  }

  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.innerHTML = 'Guardar inventario actualizado <span class="btn-arrow">-&gt;</span>';
  const footnote = form.querySelector(".form-footnote");
  if (footnote) footnote.textContent = "Perfil actualizado correctamente. Tus nuevos parámetros ya serán tomados en cuenta para futuras solicitudes.";

  host.replaceChildren(form);
  return form;
}

function initVendorProfileEditorForm() {
  const form = ensureVendorInventoryMatrixForm();
  if (!form || form.dataset.inventoryInitialized === "true") return;
  form.dataset.inventoryInitialized = "true";
  const config = sellerEditConfig();
  const origenes = document.getElementById("vendor-edit-origenes");
  const categorias = document.getElementById("vendor-edit-categorias");
  if (origenes) {
    Object.keys(config.brandGroups).forEach(origin => {
      const label = document.createElement("label");
      label.className = "check-pill";
      label.innerHTML = `<input type="checkbox" name="vorigenes" value="${origin}"><span>${origin}</span>`;
      origenes.appendChild(label);
    });
    origenes.addEventListener("change", () => renderVendorEditBrands(form));
  }
  document.getElementById("vendor-edit-marcas")?.addEventListener("change", event => {
    const input = event.target.closest('input[name="marcas"]');
    if (!input) return;
    if (!input.checked) getVendorEditBrandLines(input.value).forEach(linea => vendorEditLineasSeleccionadas.delete(linea));
    renderVendorEditLines(form);
  });
  document.getElementById("vendor-edit-lineas")?.addEventListener("change", event => {
    const input = event.target.closest('input[name="vlineaCatalogo"]');
    if (!input) return;
    if (input.checked) vendorEditLineasSeleccionadas.add(input.value);
    else vendorEditLineasSeleccionadas.delete(input.value);
    syncVendorEditLines();
  });
  document.getElementById("vendor-edit-add-line")?.addEventListener("click", () => {
    const input = document.getElementById("vendor-edit-linea-custom-input");
    const value = String(input?.value || "").trim();
    if (!value) {
      toast("Escribe el nombre de la línea que quieres agregar", "error");
      return;
    }
    vendorEditLineasManuales.add(value);
    if (input) input.value = "";
    syncVendorEditLines();
    toast(`Línea "${value}" agregada`);
  });
  document.getElementById("vendor-edit-lineas-manuales-list")?.addEventListener("click", event => {
    const chip = event.target.closest("[data-vendor-edit-linea]");
    if (!chip) return;
    vendorEditLineasManuales.delete(chip.dataset.vendorEditLinea || "");
    syncVendorEditLines();
  });
  if (categorias) {
    config.categories.forEach(categoria => {
      const label = document.createElement("label");
      label.className = "check-pill";
      label.innerHTML = `<input type="checkbox" name="vcat" value="${categoria}"><span>${categoria}</span>`;
      categorias.appendChild(label);
    });
  }
  const helpers = window.SRGT_SELLER_FORM_HELPERS || {};
  if (typeof helpers.buildDeptos === "function") helpers.buildDeptos(form.querySelector('[name="vdepto"]'));
  form.querySelector('[name="vdepto"]')?.addEventListener("change", function () {
    if (typeof helpers.buildMunicipios === "function") helpers.buildMunicipios(this, form.querySelector('[name="vmuni"]'));
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    submitVendorProfileChange(form).catch(error => toast(error.message, "error"));
  });
}

function collectVendorProfileEditorChanges(form) {
  const selectedLineas = [...vendorEditLineasSeleccionadas];
  const manualLineas = [...vendorEditLineasManuales];
  return {
    nombreComercial: String(form.elements.namedItem("vnombre")?.value || "").trim(),
    tipo: String(form.querySelector('input[name="vtipo"]:checked')?.value || "").trim(),
    nombreContacto: String(form.elements.namedItem("vencargado")?.value || "").trim(),
    email: String(form.elements.namedItem("vemail")?.value || "").trim(),
    nit: String(form.elements.namedItem("vnit")?.value || "").trim(),
    direccion: String(form.elements.namedItem("vdireccion")?.value || "").trim(),
    origenes: [...form.querySelectorAll('input[name="vorigenes"]:checked')].map(input => input.value).join(", "),
    marcas: [...form.querySelectorAll('input[name="marcas"]:checked')].map(input => input.value).join(", "),
    lineas: selectedLineas.concat(manualLineas).join(", "),
    lineasSeleccionadas: selectedLineas.join(", "),
    lineasManuales: manualLineas.join(", "),
    categorias: [...form.querySelectorAll('input[name="vcat"]:checked')].map(input => input.value).join(", "),
    piezasSuspension: getVendorProfileValue("piezasSuspension"),
    otraPiezaSuspension: getVendorProfileValue("otraPiezaSuspension"),
    procedencia: String(form.querySelector('input[name="vprocedencia"]:checked')?.value || "").trim(),
    condicion: String(form.querySelector('input[name="vcondicion"]:checked')?.value || "").trim(),
    departamento: String(form.elements.namedItem("vdepto")?.value || "").trim(),
    entregas: String(form.elements.namedItem("ventregasDetalle")?.value || "").trim() ||
      (form.elements.namedItem("ventregas")?.checked ? "Sí" : "No"),
    municipio: String(form.elements.namedItem("vmuni")?.value || "").trim(),
    zona: String(form.elements.namedItem("vzona")?.value || "").trim(),
    horario: String(form.elements.namedItem("vhorario")?.value || "").trim()
  };
}

async function submitVendorProfileChange(form) {
  const changes = collectVendorProfileEditorChanges(form);
  if (!changes.departamento || !changes.origenes || !changes.marcas || !changes.categorias) {
    toast("Completa departamento, orígenes, marcas y categorías.", "error");
    return;
  }
  const session = requireLocalVendorSession();
  const submitButton = form.querySelector('button[type="submit"]');
  const originalText = submitButton?.innerHTML;
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Guardando inventario...";
  }
  try {
    const result = await vendorApi("vendedor_actualizar_perfil", {
      token: session.token,
      detalleCompleto: JSON.stringify(changes),
      observaciones: String(form.elements.namedItem("vobservaciones")?.value || "")
    });
    vendorProfile = result.perfil || vendorProfile;
    populateVendorProfileEditor();
    await loadVendorProfile();
    toast(result.message || "Perfil actualizado correctamente. Tus nuevos parámetros ya serán tomados en cuenta para futuras solicitudes.");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = originalText;
    }
  }
}

function populateVendorProfileEditor() {
  const form = document.getElementById("vendor-profile-change-form");
  if (!form || !vendorProfile) return;
  initVendorProfileEditorForm();
  setVendorEditValue(form, "vnombre", getVendorProfileValue("nombreComercial", "nombre"));
  setVendorEditValue(form, "vencargado", getVendorProfileValue("nombreContacto", "encargado"));
  setVendorEditValue(form, "vwhatsapp", getVendorProfileValue("whatsapp"));
  setVendorEditValue(form, "vemail", getVendorProfileValue("email", "correo"));
  setVendorEditValue(form, "vnit", getVendorProfileValue("nit"));
  setVendorEditValue(form, "vdireccion", getVendorProfileValue("direccion"));
  setVendorEditValue(form, "vzona", getVendorProfileValue("zona"));
  setVendorEditValue(form, "vhorario", getVendorProfileValue("horario"));
  setVendorEditRadio(form, "vtipo", getVendorProfileValue("tipo", "tipoVendedor"));

  const marcas = splitVendorList(getVendorProfileValue("marcas"));
  const origenes = splitVendorList(getVendorProfileValue("origenes", "origen")).length
    ? splitVendorList(getVendorProfileValue("origenes", "origen"))
    : inferVendorEditOrigins(marcas);
  setVendorEditChecked(form, "vorigenes", origenes);
  renderVendorEditBrands(form);
  setVendorEditChecked(form, "marcas", marcas);

  vendorEditLineasSeleccionadas.clear();
  vendorEditLineasManuales.clear();
  const catalogLines = new Set(marcas.flatMap(marca => getVendorEditBrandLines(marca)));
  splitVendorList(getVendorProfileValue("lineas", "lineasSeleccionadas", "Lineas", "Líneas")).forEach(linea => {
    if (catalogLines.has(linea)) vendorEditLineasSeleccionadas.add(linea);
    else vendorEditLineasManuales.add(linea);
  });
  splitVendorList(getVendorProfileValue("lineasManuales", "lineasManual")).forEach(linea => vendorEditLineasManuales.add(linea));
  renderVendorEditLines(form);

  setVendorEditChecked(form, "vcat", splitVendorList(getVendorProfileValue("categorias")));
  setVendorEditRadio(form, "vprocedencia", getVendorProfileValue("procedencia"));
  setVendorEditRadio(form, "vcondicion", getVendorProfileValue("condicion", "condicionPiezas"));

  const depto = getVendorProfileValue("departamento", "depto");
  const deptoField = form.elements.namedItem("vdepto");
  const muniField = form.elements.namedItem("vmuni");
  if (deptoField) {
    deptoField.value = depto;
    const helpers = window.SRGT_SELLER_FORM_HELPERS || {};
    if (typeof helpers.buildMunicipios === "function") helpers.buildMunicipios(deptoField, muniField);
  }
  if (muniField) muniField.value = getVendorProfileValue("municipio", "muni") || "";

  const entregas = String(getVendorProfileValue("entregas", "cobertura") || "");
  const enviosField = form.elements.namedItem("venvios");
  const entregasField = form.elements.namedItem("ventregas");
  const detalleField = form.elements.namedItem("ventregasDetalle");
  if (enviosField) enviosField.checked = /env[ií]o|toda guatemala|capital y departamentos/i.test(entregas);
  if (entregasField) entregasField.checked = !/^no$/i.test(entregas) && Boolean(entregas);
  if (detalleField) detalleField.value = entregas;
  const observations = form.elements.namedItem("vobservaciones");
  if (observations) observations.value = "";
}

async function loadAdminVendorChanges() {
  if (!adminSessionPassword || adminChangesLoading) return;
  const container = document.getElementById("admin-vendor-changes");
  if (!container) return;
  adminChangesLoading = true;
  try {
    const result = await adminRequest("admin_listar_cambios_vendedor");
    renderAdminVendorChanges(result.solicitudes || []);
  } catch (error) {
    container.textContent = error.message || "No se pudieron cargar los cambios.";
  } finally {
    adminChangesLoading = false;
  }
}

function parseVendorChangeValue(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function firstVendorChangeValue(...values) {
  return values.find(value => value !== undefined && value !== null && String(value).trim()) || "";
}

function formatVendorChangeList(value, fallback = "No especificado") {
  const items = Array.isArray(value)
    ? value
    : String(value || "")
      .split(/[,;\n|]+/)
      .map(item => item.trim())
      .filter(Boolean);
  return items.length ? items.join(", ") : fallback;
}

function getVendorChangeLines(item, requestedData, currentData) {
  const isLineChange = String(item.campoSolicitado || item.campo || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("line");
  const current = firstVendorChangeValue(
    item.lineasActuales,
    item.lineasAntes,
    item.lineasOriginales,
    currentData.lineas,
    currentData.Lineas,
    currentData["Líneas"],
    item.lineas
  );
  const requested = firstVendorChangeValue(
    item.lineasSolicitadas,
    item.lineasNuevas,
    requestedData.lineas,
    requestedData.Lineas,
    requestedData["Líneas"],
    isLineChange ? item.valorSolicitado : ""
  );
  return {
    current: formatVendorChangeList(current),
    requested: formatVendorChangeList(requested)
  };
}

function renderAdminVendorChanges(items) {
  const container = document.getElementById("admin-vendor-changes");
  if (!container) return;
  container.replaceChildren();
  if (!items.length) {
    container.textContent = "No hay cambios pendientes.";
    return;
  }
  items.forEach(item => {
    const requestedData = parseVendorChangeValue(item.detalleCompleto || item.valorSolicitado || item.solicitado);
    const currentData = parseVendorChangeValue(item.valorActual || item.actual || item.antes || item.perfilActual);
    const lineValues = getVendorChangeLines(item, requestedData, currentData);
    const article = document.createElement("article");
    article.className = "admin-vendor-change";
    const title = document.createElement("h4");
    const detail = document.createElement("p");
    const comparison = document.createElement("dl");
    const requested = document.createElement("pre");
    const actions = document.createElement("div");
    const approve = document.createElement("button");
    const reject = document.createElement("button");
    title.textContent = item.nombreComercial || item.vendedorId;
    detail.textContent = `${item.whatsapp || ""} · ${item.campoSolicitado || "Perfil"}`;
    requested.textContent = item.valorSolicitado || "";
    approve.textContent = "Aprobar cambio";
    approve.className = "btn-admin-approve";
    reject.textContent = "Rechazar cambio";
    reject.className = "btn-admin-reject";
    approve.onclick = () => decideVendorChange(item.rowNumber, true);
    reject.onclick = () => decideVendorChange(item.rowNumber, false);
    comparison.className = "admin-vendor-change-comparison";
    [
      ["Líneas actuales", lineValues.current],
      ["Líneas solicitadas", lineValues.requested]
    ].forEach(([label, value]) => {
      const wrap = document.createElement("div");
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = label;
      description.textContent = value;
      wrap.append(term, description);
      comparison.appendChild(wrap);
    });
    actions.append(approve, reject);
    article.append(title, detail, comparison, requested, actions);
    container.appendChild(article);
  });
}

async function decideVendorChange(rowNumber, approve) {
  const verb = approve ? "aprobar" : "rechazar";
  if (!window.confirm(`¿${verb[0].toUpperCase() + verb.slice(1)} esta solicitud?`)) return;
  try {
    await adminRequest(approve ? "admin_aprobar_cambio_vendedor" : "admin_rechazar_cambio_vendedor", { rowNumber });
    toast(approve ? "Cambio aprobado." : "Cambio rechazado.");
    await loadAdminVendorChanges();
    if (approve) await cargarDashboardAdmin();
  } catch (error) {
    toast(error.message || "No se pudo procesar la solicitud.", "error");
  }
}

function routeVendorPortal() {
  if (!["#vendedor", "#panel"].includes(location.hash.toLowerCase())) return;
  if (restoreVendorSession() && vendorSession.expiresAt > Date.now()) {
    showPage("page-panel-vendedor");
    loadVendorPortal().catch(error => toast(error.message, "error"));
  } else {
    showPage("page-vendor-login");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-vendor-tab]").forEach(button => {
    button.addEventListener("click", () => switchVendorTab(button.dataset.vendorTab));
  });
  document.getElementById("vendor-required-password-form")?.addEventListener("submit", event => {
    event.preventDefault();
    submitVendorPassword(event.currentTarget).catch(error => toast(error.message, "error"));
  });
  document.getElementById("vendor-password-form")?.addEventListener("submit", event => {
    event.preventDefault();
    submitVendorPassword(event.currentTarget).catch(error => toast(error.message, "error"));
  });
  document.getElementById("vendor-profile-change-form")?.addEventListener("submit", event => {
    event.preventDefault();
    submitVendorProfileChange(event.currentTarget).catch(error => toast(error.message, "error"));
  });
  const observer = new MutationObserver(() => {
    if (document.getElementById("page-admin")?.classList.contains("active")) {
      loadAdminVendorChanges();
    }
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class"]
  });
  routeVendorPortal();
});

window.addEventListener("hashchange", routeVendorPortal);
