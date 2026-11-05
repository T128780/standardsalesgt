/* Luna V1 — asistente web de Standard Sales (módulo aislado).
   - No envía formularios ni llama registrar_comprador.
   - Todo el contenido de usuario/IA se renderiza con textContent. */
(function () {
  "use strict";
  if (window.__lunaWebAssistant) return;
  window.__lunaWebAssistant = true;

  var DISABLED_KEY = "standard_sales_luna_disabled";
  var SESSION_KEY = "standard_sales_session_id";
  var WHATSAPP_URL = "https://wa.me/50255212375";
  var MAX_MESSAGE = 500;
  var MAX_HISTORY = 8;
  var MAX_HISTORY_CONTENT = 300;
  var REQUEST_TIMEOUT_MS = 20000;
  var GREETING = "Hola 👋 Soy Luna, la asistente de Standard Sales. ¿Estás buscando un repuesto o querés vender?";
  var FALLBACK_TEXT = "No pude responder en este momento, pero puedo ayudarte a continuar.";
  var PREFILL_NOTICE = "Revisá los datos y enviá cuando estés listo.";
  var HIDDEN_ON_PAGES = { "page-admin": true, "page-admin-login": true };

  var history = [];
  var busy = false;
  var disabled = false;
  var els = {};

  function storageGet(key) {
    try { return window.sessionStorage.getItem(key); } catch (e) { return null; }
  }
  function storageSet(key, value) {
    try { window.sessionStorage.setItem(key, value); } catch (e) {}
  }

  function getSessionId() {
    try {
      if (typeof getOrCreateStorageId === "function") {
        return getOrCreateStorageId(window.sessionStorage, SESSION_KEY, "session");
      }
    } catch (e) {}
    return storageGet(SESSION_KEY) || "";
  }

  function getEndpoint() {
    try {
      if (typeof GOOGLE_SCRIPT_URL !== "undefined") return GOOGLE_SCRIPT_URL;
    } catch (e) {}
    return "";
  }

  function activePageId() {
    var page = document.querySelector(".page.active");
    return page ? page.id : "";
  }

  function getPageContext() {
    var id = activePageId();
    if (id === "page-solicitud") return "buyer_form";
    if (id === "page-vendedor") return "seller_form";
    if (id === "page-vendor-login" || id === "page-panel-vendedor") return "vendor_portal";
    return "home";
  }

  function goToPage(id) {
    if (typeof showPage === "function") showPage(id);
  }

  function openWhatsApp() {
    try { window.open(WHATSAPP_URL, "_blank", "noopener"); } catch (e) {}
  }

  function isMobile() {
    return window.matchMedia ? window.matchMedia("(max-width: 640px)").matches : window.innerWidth <= 640;
  }

  function clip(value, max) {
    return String(value == null ? "" : value).slice(0, max);
  }

  /* ---------- DOM ---------- */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function build() {
    var root = el("div", "luna-root");
    root.id = "luna-assistant";

    var fab = el("button", "luna-fab");
    fab.type = "button";
    fab.id = "luna-fab";
    fab.setAttribute("aria-expanded", "false");
    fab.setAttribute("aria-controls", "luna-panel");
    fab.setAttribute("aria-label", "Abrir Luna, asistente de Standard Sales");
    fab.appendChild(el("span", "luna-fab-dot"));
    fab.appendChild(el("span", "luna-fab-label", "Luna"));
    fab.appendChild(el("span", "luna-fab-badge", "IA"));

    var panel = el("div", "luna-panel");
    panel.id = "luna-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    panel.setAttribute("aria-label", "Luna, asistente de Standard Sales");
    panel.hidden = true;

    var header = el("div", "luna-header");
    var titles = el("div", "luna-titles");
    var title = el("div", "luna-title", "Luna");
    title.appendChild(el("span", "luna-title-badge", "IA"));
    titles.appendChild(title);
    titles.appendChild(el("div", "luna-subtitle", "Asistente de Standard Sales"));
    var headerBtns = el("div", "luna-header-btns");
    var minBtn = el("button", "luna-icon-btn luna-min", "–");
    minBtn.type = "button";
    minBtn.setAttribute("aria-label", "Minimizar");
    var expandBtn = el("button", "luna-icon-btn luna-expand", "⤢");
    expandBtn.type = "button";
    expandBtn.setAttribute("aria-label", "Expandir ventana de Luna");
    expandBtn.setAttribute("aria-pressed", "false");
    expandBtn.title = "Expandir ventana";
    var closeBtn = el("button", "luna-icon-btn luna-close", "×");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Cerrar");
    headerBtns.appendChild(minBtn);
    headerBtns.appendChild(expandBtn);
    headerBtns.appendChild(closeBtn);
    header.appendChild(titles);
    header.appendChild(headerBtns);

    var log = el("div", "luna-log");
    log.setAttribute("role", "log");
    log.setAttribute("aria-live", "polite");

    var typing = el("div", "luna-typing", "Luna está escribiendo…");
    typing.hidden = true;

    var form = el("form", "luna-input-row");
    form.setAttribute("novalidate", "");
    var input = el("input", "luna-input");
    input.type = "text";
    input.maxLength = MAX_MESSAGE;
    input.setAttribute("aria-label", "Escribe tu mensaje para Luna");
    input.placeholder = "Escribe tu mensaje…";
    input.autocomplete = "off";
    var send = el("button", "luna-send", "Enviar");
    send.type = "submit";
    form.appendChild(input);
    form.appendChild(send);

    panel.appendChild(header);
    panel.appendChild(log);
    panel.appendChild(typing);
    panel.appendChild(form);
    root.appendChild(panel);
    root.appendChild(fab);
    document.body.appendChild(root);
    document.body.classList.add("luna-enabled");

    els = { root: root, fab: fab, panel: panel, log: log, typing: typing, form: form, input: input, send: send, minBtn: minBtn, expandBtn: expandBtn };

    fab.addEventListener("click", function () { panel.hidden ? openPanel() : closePanel(); });
    minBtn.addEventListener("click", function () { toggleMinimized(); });
    expandBtn.addEventListener("click", function () { toggleExpanded(); });
    closeBtn.addEventListener("click", function () { closePanel(); });
    panel.addEventListener("keydown", function (event) {
      if (event.key === "Escape") { event.stopPropagation(); closePanel(); }
    });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      event.stopPropagation();
      sendMessage(input.value);
    });

    addMessage("assistant", GREETING);
    addQuickActions([
      { label: "Busco un repuesto", send: "Busco un repuesto" },
      { label: "Quiero vender", send: "Quiero vender" },
      { label: "¿Cómo funciona?", send: "¿Cómo funciona?" },
      { label: "Hablar con alguien", run: openWhatsApp }
    ]);
  }

  function openPanel() {
    if (disabled || !els.panel) return;
    els.panel.hidden = false;
    els.root.classList.add("luna-open");
    els.root.classList.remove("luna-minimized");
    els.minBtn.textContent = "–";
    els.minBtn.setAttribute("aria-label", "Minimizar");
    els.fab.setAttribute("aria-expanded", "true");
    scrollLog();
    try { els.input.focus(); } catch (e) {}
  }

  function toggleMinimized() {
    if (!els.panel || els.panel.hidden) return;
    var minimized = els.root.classList.toggle("luna-minimized");
    els.minBtn.textContent = minimized ? "▢" : "–";
    els.minBtn.setAttribute("aria-label", minimized ? "Restaurar ventana de Luna" : "Minimizar");
    els.minBtn.title = minimized ? "Restaurar" : "Minimizar";
    if (!minimized) {
      scrollLog();
      try { els.input.focus(); } catch (e) {}
    }
  }

  function toggleExpanded() {
    if (!els.panel || els.panel.hidden) return;
    els.root.classList.remove("luna-minimized");
    els.minBtn.textContent = "–";
    els.minBtn.setAttribute("aria-label", "Minimizar");
    var expanded = els.root.classList.toggle("luna-expanded");
    els.expandBtn.textContent = expanded ? "⤡" : "⤢";
    els.expandBtn.setAttribute("aria-label", expanded ? "Restaurar tamaño de Luna" : "Expandir ventana de Luna");
    els.expandBtn.setAttribute("aria-pressed", String(expanded));
    els.expandBtn.title = expanded ? "Tamaño normal" : "Expandir ventana";
    scrollLog();
  }

  function closePanel() {
    if (!els.panel) return;
    els.panel.hidden = true;
    els.root.classList.remove("luna-open", "luna-minimized", "luna-expanded");
    els.minBtn.textContent = "–";
    els.minBtn.setAttribute("aria-label", "Minimizar");
    els.expandBtn.textContent = "⤢";
    els.expandBtn.setAttribute("aria-label", "Expandir ventana de Luna");
    els.expandBtn.setAttribute("aria-pressed", "false");
    els.expandBtn.title = "Expandir ventana";
    els.fab.setAttribute("aria-expanded", "false");
    try { els.fab.focus(); } catch (e) {}
  }

  function disableForSession() {
    disabled = true;
    storageSet(DISABLED_KEY, "1");
    if (els.root && els.root.parentNode) els.root.parentNode.removeChild(els.root);
    document.body.classList.remove("luna-enabled");
  }

  function scrollLog() {
    if (els.log) els.log.scrollTop = els.log.scrollHeight;
  }

  function addMessage(role, text, extraClass) {
    var bubble = el("div", "luna-msg luna-msg-" + role + (extraClass ? " " + extraClass : ""));
    bubble.textContent = String(text == null ? "" : text);
    els.log.appendChild(bubble);
    scrollLog();
    return bubble;
  }

  function addQuickActions(actions) {
    var wrap = el("div", "luna-quick");
    actions.forEach(function (action) {
      var btn = el("button", "luna-chip", action.label);
      btn.type = "button";
      btn.addEventListener("click", function () {
        if (action.run) { action.run(); return; }
        if (action.send) sendMessage(action.send);
      });
      wrap.appendChild(btn);
    });
    els.log.appendChild(wrap);
    scrollLog();
  }

  function addFallbackActions() {
    addQuickActions([
      { label: "Solicitar repuesto", run: function () { openBuyerForm(null); } },
      { label: "Soy vendedor", run: function () { openSellerForm(); } },
      { label: "Contactar por WhatsApp", run: openWhatsApp }
    ]);
  }

  function setBusy(value) {
    busy = value;
    els.typing.hidden = !value;
    els.send.disabled = value;
    els.input.disabled = value;
    els.log.querySelectorAll(".luna-chip").forEach(function (b) { b.disabled = value; });
    if (!value) { try { els.input.focus(); } catch (e) {} }
    scrollLog();
  }

  /* ---------- Red ---------- */

  function requestReply(message, sentHistory) {
    var endpoint = getEndpoint();
    if (!endpoint || typeof fetch !== "function") return Promise.resolve(null);
    var params = new URLSearchParams();
    params.append("accion", "assistant_web_chat");
    params.append("message", message);
    params.append("history", JSON.stringify(sentHistory));
    params.append("sessionId", getSessionId());
    params.append("pageContext", getPageContext());

    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT_MS) : null;
    var options = { method: "POST", body: params };
    if (controller) options.signal = controller.signal;

    return fetch(endpoint, options)
      .then(function (response) {
        if (!response || !response.ok) return null;
        return response.json().catch(function () { return null; });
      })
      .catch(function () { return null; })
      .then(function (data) {
        if (timer) clearTimeout(timer);
        return data && typeof data === "object" ? data : null;
      });
  }

  function sendMessage(raw) {
    if (busy || disabled) return;
    var message = clip(String(raw || "").trim(), MAX_MESSAGE);
    if (!message) return;
    els.input.value = "";
    addMessage("user", message);
    var sentHistory = history.slice(-MAX_HISTORY);
    setBusy(true);
    requestReply(message, sentHistory).then(function (data) {
      setBusy(false);
      handleResponse(message, data);
    }, function () {
      setBusy(false);
      handleResponse(message, null);
    });
  }

  function pushHistory(role, content) {
    history.push({ role: role, content: clip(content, MAX_HISTORY_CONTENT) });
    if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
  }

  function handleResponse(message, data) {
    if (data && data.ok === true && data.enabled === false) {
      disableForSession();
      return;
    }
    pushHistory("user", message);
    var reply = data && data.ok === true && data.reply && typeof data.reply === "object" ? data.reply : null;
    var text = reply && typeof reply.text === "string" && reply.text.trim() ? reply.text.trim() : "";

    if (!reply || data.source === "fallback" || data.source === "rate_limit") {
      var shown = text || FALLBACK_TEXT;
      addMessage("assistant", shown);
      pushHistory("assistant", shown);
      addFallbackActions();
      return;
    }

    addMessage("assistant", text || FALLBACK_TEXT);
    pushHistory("assistant", text || FALLBACK_TEXT);
    runAction(reply);
  }

  function runAction(reply) {
    var action = reply.action;
    if (action === "open_buyer_form" || (reply.readyToOpenForm === true && reply.intent === "buyer" && action !== "open_seller_form" && action !== "open_whatsapp")) {
      openBuyerForm(reply.prefill || null);
    } else if (action === "open_seller_form") {
      openSellerForm();
    } else if (action === "open_whatsapp") {
      openWhatsApp();
    }
  }

  /* ---------- Formularios ---------- */

  function openSellerForm() {
    goToPage("page-vendedor");
    if (isMobile()) closePanel();
  }

  function norm(value) {
    return String(value == null ? "" : value)
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function catalog() {
    try { if (typeof catalogos === "function") return catalogos() || {}; } catch (e) {}
    return window.CAT || {};
  }

  function findOption(select, value, aliasMap) {
    if (!select) return null;
    var key = norm(value);
    if (!key) return null;
    var keys = [key];
    if (aliasMap && aliasMap[key]) keys.push(norm(aliasMap[key]));
    var options = Array.prototype.slice.call(select.options || []);
    for (var i = 0; i < options.length; i++) {
      if (options[i].value && keys.indexOf(norm(options[i].value)) !== -1) return options[i];
    }
    return null;
  }

  function fire(node, type) {
    node.dispatchEvent(new Event(type, { bubbles: true }));
  }

  function setControl(node, value) {
    node.value = value;
    fire(node, "input");
    fire(node, "change");
  }

  function isEmpty(node) {
    return !node || !String(node.value || "").trim();
  }

  var CONDITION_SYNONYMS = {
    "nueva": "Nueva", "nuevo": "Nueva",
    "usada": "Usada", "usado": "Usada",
    "reconstruida": "Reconstruida", "reconstruido": "Reconstruida",
    "me es indiferente": "Me es indiferente", "indiferente": "Me es indiferente", "cualquiera": "Me es indiferente"
  };

  function prefillBuyerForm(form, prefill) {
    var p = prefill || {};
    var cat = catalog();
    var get = function (name) { return form.querySelector('[name="' + name + '"]'); };
    var filled = [];

    var marcaSel = get("marca");
    var lineaSel = get("linea");
    var marcaVal = clip(p.marca, 80).trim();
    var lineaVal = clip(p.linea, 80).trim();

    if (marcaSel && marcaVal) {
      var marcaOpt = findOption(marcaSel, marcaVal, cat.aliasesMarca);
      if (marcaOpt) {
        setControl(marcaSel, marcaOpt.value);
        filled.push("marca");
      } else if (findOption(marcaSel, "Otra marca")) {
        setControl(marcaSel, "Otra marca");
        var marcaOtra = get("marcaOtra");
        if (marcaOtra) { setControl(marcaOtra, marcaVal); filled.push("marcaOtra"); }
      }
    }

    if (lineaSel && lineaVal && marcaSel && marcaSel.value) {
      var search = document.getElementById("buyer-linea-search");
      if (search && search.value) setControl(search, "");
      var lineaOpt = findOption(lineaSel, lineaVal, cat.aliases);
      if (lineaOpt && lineaOpt.value !== "Otra línea / modelo") {
        setControl(lineaSel, lineaOpt.value);
        filled.push("linea");
      } else if (findOption(lineaSel, "Otra línea / modelo")) {
        setControl(lineaSel, "Otra línea / modelo");
        var lineaOtra = get("lineaOtra");
        if (lineaOtra) { setControl(lineaOtra, lineaVal); filled.push("lineaOtra"); }
      }
    }

    var anioSel = get("anio");
    var anioVal = String(p.anio == null ? "" : p.anio).trim();
    if (anioSel && /^\d{4}$/.test(anioVal)) {
      var anioOpt = findOption(anioSel, anioVal);
      if (anioOpt) { setControl(anioSel, anioOpt.value); filled.push("anio"); }
    }

    var catSel = get("categoria");
    if (catSel && p.categoria) {
      var catOpt = findOption(catSel, p.categoria);
      if (catOpt) { setControl(catSel, catOpt.value); filled.push("categoria"); }
    }

    var piezaVal = clip(p.pieza, 120).trim();
    if (piezaVal) {
      var parteSel = get("parte");
      var parteOpt = parteSel && catSel && catSel.value ? findOption(parteSel, piezaVal) : null;
      if (parteOpt) {
        setControl(parteSel, parteOpt.value);
        filled.push("parte");
      } else if (parteSel && catSel && catSel.value && findOption(parteSel, "Otro") && get("parteOtra")) {
        setControl(parteSel, "Otro");
        setControl(get("parteOtra"), piezaVal);
        filled.push("parteOtra");
      } else {
        var detalles = get("detalles");
        if (detalles && isEmpty(detalles)) { setControl(detalles, "Pieza buscada: " + piezaVal); filled.push("detalles"); }
      }
    }

    var condKey = norm(p.condicion);
    var condVal = CONDITION_SYNONYMS[condKey];
    if (condVal) {
      var radios = form.querySelectorAll('input[type="radio"][name="condicion"]');
      Array.prototype.forEach.call(radios, function (radio) {
        if (radio.value === condVal) {
          radio.checked = true;
          fire(radio, "change");
          filled.push("condicion");
        }
      });
    }
    // departamento: el formulario comprador no tiene ese campo; se ignora.
    return filled;
  }

  function firstMissing(form) {
    var get = function (name) { return form.querySelector('[name="' + name + '"]'); };
    var order = ["nombre", "waComprador", "marca"];
    for (var i = 0; i < order.length; i++) {
      var node = get(order[i]);
      if (node && isEmpty(node)) return node;
    }
    var marca = get("marca");
    if (marca && marca.value === "Otra marca" && isEmpty(get("marcaOtra"))) return get("marcaOtra");
    var linea = get("linea");
    if (linea && isEmpty(linea)) return linea;
    if (linea && linea.value === "Otra línea / modelo" && isEmpty(get("lineaOtra"))) return get("lineaOtra");
    var categoria = get("categoria");
    if (categoria && isEmpty(categoria)) return categoria;
    var parte = get("parte");
    if (parte && isEmpty(parte)) return parte;
    if (parte && parte.value === "Otro" && isEmpty(get("parteOtra"))) return get("parteOtra");
    return null;
  }

  function openBuyerForm(prefill) {
    goToPage("page-solicitud");
    var form = document.getElementById("form-comprador");
    if (!form) return;
    try {
      if (form.dataset.initialized !== "true" && typeof initFormComprador === "function") initFormComprador();
    } catch (e) {}
    var filled = [];
    if (prefill && typeof prefill === "object") {
      try { filled = prefillBuyerForm(form, prefill); } catch (e) { filled = []; }
    }
    var target = firstMissing(form) || form;
    try { target.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
    if (filled.length) {
      addMessage("assistant", PREFILL_NOTICE, "luna-notice");
    }
    if (isMobile()) {
      closePanel();
      if (filled.length && typeof toast === "function") {
        try { toast(PREFILL_NOTICE, "success"); } catch (e) {}
      }
    }
    if (target !== form) {
      try { target.focus({ preventScroll: true }); } catch (e) {}
    }
  }

  /* ---------- Visibilidad por página ---------- */

  function syncVisibility() {
    if (!els.root) return;
    var hide = !!HIDDEN_ON_PAGES[activePageId()];
    els.root.classList.toggle("luna-hidden-page", hide);
    if (hide && !els.panel.hidden) closePanel();
  }

  function init() {
    if (storageGet(DISABLED_KEY) === "1") { disabled = true; return; }
    if (!document.body || document.getElementById("luna-assistant")) return;
    build();
    syncVisibility();
    if (typeof MutationObserver === "function") {
      var observer = new MutationObserver(syncVisibility);
      document.querySelectorAll(".page").forEach(function (page) {
        observer.observe(page, { attributes: true, attributeFilter: ["class"] });
      });
    }
  }

  window.LunaWebAssistant = { open: openPanel, close: closePanel };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
