// Невелике інтерактивне мобільне меню
const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');

menuToggle.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('is-open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.textContent = isOpen ? '×' : '☰';
});

nav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    nav.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.textContent = '☰';
  });
});

// Анімація появи контенту другого екрана при прокручуванні
const storyCopy = document.querySelector('.story-copy');
if ('IntersectionObserver' in window && storyCopy) {
  storyCopy.style.opacity = '0';
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        storyCopy.classList.add('reveal-on-scroll');
        storyCopy.style.opacity = '1';
        observer.unobserve(storyCopy);
      }
    });
  }, { threshold: 0.2 });
  observer.observe(storyCopy);
}

// На телефоні контент з'являється під час прокручування та зникає,
// коли користувач прокручує його за межі екрана. При поверненні — з'являється знову.
const mobileScrollItems = document.querySelectorAll(
  '.hero-copy, .hero-visual, .story-image-wrap, .story-copy, ' +
  '.menu-heading, .menu-card, .visit-banner, .footer > *'
);

if ('IntersectionObserver' in window && mobileScrollItems.length) {
  const mobileScrollObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle('is-visible', entry.isIntersecting);
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -5% 0px'
  });

  const enableMobileScrollEffects = () => {
    const isMobile = window.matchMedia('(max-width: 760px)').matches;
    mobileScrollItems.forEach((item) => {
      if (isMobile) {
        item.classList.add('mobile-scroll-effect');
        mobileScrollObserver.observe(item);
      } else {
        mobileScrollObserver.unobserve(item);
        item.classList.remove('mobile-scroll-effect', 'is-visible');
      }
    });
  };

  enableMobileScrollEffects();
  window.addEventListener('resize', enableMobileScrollEffects, { passive: true });
}

