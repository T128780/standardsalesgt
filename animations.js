// STANDARD SALES GT — Interacciones visuales y sonoras (v24)
// Lucide para iconografía; Web Audio solo después de una acción del usuario.

(function () {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function renderIcons() {
    if (!window.lucide) return;
    window.lucide.createIcons({
      attrs: {
        "aria-hidden": "true",
        "stroke-width": "1.65"
      }
    });
  }

  function initConfirmationSound() {
    const button = document.getElementById("sound-toggle");
    const form = document.getElementById("form-comprador");
    const confirmation = document.getElementById("page-confirmacion");
    if (!button || !confirmation) return;

    const storageKey = "srgt_confirmation_sound";
    let soundEnabled = localStorage.getItem(storageKey) !== "off";
    let audioContext = null;
    let confirmationWasActive = confirmation.classList.contains("active");

    function prepareAudio() {
      if (!soundEnabled) return null;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      if (!audioContext) audioContext = new AudioContextClass();
      if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
      return audioContext;
    }

    function updateButton() {
      const label = `Sonido de confirmación: ${soundEnabled ? "activado" : "desactivado"}`;
      button.setAttribute("aria-label", label);
      button.setAttribute("aria-pressed", String(soundEnabled));
      button.title = label;
      button.innerHTML = `<i data-lucide="${soundEnabled ? "volume-2" : "volume-x"}" aria-hidden="true"></i>`;
      renderIcons();
    }

    function playSuccessSound() {
      const context = prepareAudio();
      if (!context || context.state !== "running") return;

      const start = context.currentTime + 0.02;
      [
        { frequency: 587.33, delay: 0, duration: 0.34, peak: 0.035 },
        { frequency: 880, delay: 0.11, duration: 0.42, peak: 0.026 }
      ].forEach(({ frequency, delay, duration, peak }) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const noteStart = start + delay;

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, noteStart);
        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.exponentialRampToValueAtTime(peak, noteStart + 0.035);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(noteStart);
        oscillator.stop(noteStart + duration + 0.02);
      });
    }

    button.addEventListener("click", () => {
      soundEnabled = !soundEnabled;
      localStorage.setItem(storageKey, soundEnabled ? "on" : "off");
      if (soundEnabled) prepareAudio();
      updateButton();
    });

    form?.querySelector('button[type="submit"]')?.addEventListener("pointerdown", prepareAudio, { passive: true });

    new MutationObserver(() => {
      const isActive = confirmation.classList.contains("active");
      if (isActive && !confirmationWasActive) playSuccessSound();
      confirmationWasActive = isActive;
    }).observe(confirmation, { attributes: true, attributeFilter: ["class"] });

    updateButton();
  }

  // Navbar: fondo sólido al hacer scroll
  const navbar = document.getElementById("navbar");
  if (navbar) {
    window.addEventListener("scroll", () => {
      navbar.classList.toggle("scrolled", window.scrollY > 50);
    }, { passive: true });
  }

  // Entrada del hero (escalonada)
  function initHero() {
    const ids = ["heroBadge", "heroTitle", "heroSubtitle", "heroCtas", "heroStats"];
    ids.forEach((id, index) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (prefersReduced) { el.classList.add("in"); return; }
      setTimeout(() => el.classList.add("in"), 250 + index * 160);
    });
  }

  // Contadores animados
  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix !== undefined ? el.dataset.suffix : "";

    if (target === 0) { el.textContent = "Q0"; return; }
    if (prefersReduced) { el.textContent = `${prefix}${target}${suffix}`; return; }

    const duration = 1800;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = `${prefix}${Math.round(target * eased)}${suffix}`;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  document.querySelectorAll(".stat-num[data-target]").forEach((el) => {
    counterObserver.observe(el);
  });

  // Reveal al hacer scroll
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;

      if (el.classList.contains("reveal-stagger")) {
        // Escalonar dentro del mismo contenedor
        const siblings = [...el.parentElement.querySelectorAll(".reveal-stagger")];
        const index = siblings.indexOf(el);
        setTimeout(() => el.classList.add("in"), index * 110);
      } else {
        el.classList.add("in");
      }
      revealObserver.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

  document.querySelectorAll(".reveal, .reveal-stagger").forEach((el) => {
    if (prefersReduced) { el.classList.add("in"); return; }
    revealObserver.observe(el);
  });

  renderIcons();
  initConfirmationSound();
  initHero();
})();
