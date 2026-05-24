// STANDARD REPUESTOS GT - GSAP animations
// Inspirado en el plan de animaciones de Kimi

(function () {
  if (typeof gsap === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  // Navbar scroll
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });

  // Hero entrance timeline
  function initHeroAnimations() {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      ['heroBadge','heroTitle','heroSubtitle','heroCtas','heroStats'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.style.opacity = '1'; el.style.transform = 'none'; }
      });
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    tl.to('#heroBadge',    { y: 0, opacity: 1, duration: 0.6, delay: 0.3 })
      .to('#heroTitle',    { y: 0, opacity: 1, duration: 0.8 }, '-=0.3')
      .to('#heroSubtitle', { y: 0, opacity: 1, duration: 0.6 }, '-=0.4')
      .to('#heroCtas',     { y: 0, opacity: 1, duration: 0.6 }, '-=0.3')
      .to('#heroStats',    { y: 0, opacity: 1, duration: 0.6 }, '-=0.3');
  }

  // Animated counters
  function initCounters() {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.querySelectorAll('.stat-num[data-target]').forEach(el => {
      const target = parseInt(el.dataset.target);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix !== undefined ? el.dataset.suffix : '';

      if (target === 0) {
        el.textContent = 'Q0';
        return;
      }

      if (prefersReduced) {
        el.textContent = `${prefix}${target}${suffix}`;
        return;
      }

      const obj = { value: 0 };
      gsap.to(obj, {
        value: target,
        duration: 2,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        onUpdate: () => {
          el.textContent = `${prefix}${Math.round(obj.value)}${suffix}`;
        },
      });
    });
  }

  // Scroll reveal
  function initScrollReveal() {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Single reveal elements
    document.querySelectorAll('.reveal').forEach(el => {
      if (prefersReduced) {
        el.style.opacity = '1';
        el.style.transform = 'none';
        return;
      }
      gsap.to(el, {
        y: 0,
        opacity: 1,
        duration: 0.7,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      });
    });

    // Staggered reveal (for grids of cards)
    const staggerGroups = {};
    document.querySelectorAll('.reveal-stagger').forEach(el => {
      const parent = el.parentElement;
      if (!staggerGroups[parent]) staggerGroups[parent] = [];
      staggerGroups[parent].push(el);
    });

    Object.values(staggerGroups).forEach(group => {
      if (prefersReduced) {
        group.forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
        return;
      }
      gsap.to(group, {
        y: 0,
        opacity: 1,
        duration: 0.6,
        ease: 'power2.out',
        stagger: 0.13,
        scrollTrigger: {
          trigger: group[0].parentElement,
          start: 'top 75%',
          toggleActions: 'play none none none',
        },
      });
    });
  }

  // Urgency bar entrance
  function initUrgencyBar() {
    gsap.from('#urgencyBar', {
      y: -10,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '#urgencyBar',
        start: 'top 90%',
        toggleActions: 'play none none none',
      },
    });
  }

  // Init
  function init() {
    initHeroAnimations();
    initCounters();
    initScrollReveal();
    initUrgencyBar();
  }

  // Run on page show (handles SPA navigation)
  init();

  // Re-init ScrollTrigger when landing page is shown
  const originalShowPage = window.showPage;
  if (typeof originalShowPage === 'function') {
    window.showPage = function (id) {
      originalShowPage(id);
      if (id === 'page-landing') {
        setTimeout(() => {
          ScrollTrigger.refresh();
        }, 100);
      }
    };
  }

})();
