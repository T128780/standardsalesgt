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
    categorias: "Categorías", procedencia: "Procedencia",
    condicion: "Condición", departamento: "Departamento"
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

async function submitVendorProfileChange(form) {
  const data = new FormData(form);
  const changes = {};
  ["origenes", "marcas", "lineas", "categorias", "procedencia", "condicion", "departamento", "plan"]
    .forEach(key => {
      const value = String(data.get(key) || "").trim();
      if (value) changes[key] = value;
    });
  if (!Object.keys(changes).length) {
    toast("Indica al menos un cambio.", "error");
    return;
  }
  const session = requireLocalVendorSession();
  await vendorApi("vendedor_solicitar_cambio_perfil", {
    token: session.token,
    detalleCompleto: JSON.stringify(changes),
    observaciones: String(data.get("observaciones") || "")
  });
  form.reset();
  toast("Solicitud enviada para revisión.");
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

function renderAdminVendorChanges(items) {
  const container = document.getElementById("admin-vendor-changes");
  if (!container) return;
  container.replaceChildren();
  if (!items.length) {
    container.textContent = "No hay cambios pendientes.";
    return;
  }
  items.forEach(item => {
    const article = document.createElement("article");
    article.className = "admin-vendor-change";
    const title = document.createElement("h4");
    const detail = document.createElement("p");
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
    actions.append(approve, reject);
    article.append(title, detail, requested, actions);
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
