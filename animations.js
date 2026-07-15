// STANDARD SALES GT — Animaciones (v20)
// Sin librerías externas: IntersectionObserver + transiciones CSS.

(function () {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  initHero();
})();
