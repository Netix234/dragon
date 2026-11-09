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

// Поступове появление элементов при прокрутке.
// Для каждого экрана задан свой тип анимации и задержка между элементами.
if ('IntersectionObserver' in window) {
  const revealGroups = [
    {
      selector: '#home .hero-copy, #home .hero-visual',
      className: 'reveal-hero',
      step: 150
    },
    {
      selector: '#story .section-topline, #story .story-image-wrap',
      className: 'reveal-story-image',
      step: 160
    },
    {
      selector: '#story .story-copy > *',
      className: 'reveal-story-text',
      step: 120
    },
    {
      selector: '#menu > .section-topline, #menu .menu-heading > *',
      className: 'reveal-menu-heading',
      step: 140
    },
    {
      selector: '#menu .menu-card',
      className: 'reveal-menu-card',
      step: 170
    },
    {
      selector: '#menu .visit-banner',
      className: 'reveal-visit',
      step: 0
    },
    {
      selector: '.footer > *',
      className: 'reveal-footer',
      step: 110
    }
  ];

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle('is-in-view', entry.isIntersecting);
    });
  }, {
    threshold: 0.14,
    rootMargin: '0px 0px -7% 0px'
  });

  revealGroups.forEach((group) => {
    document.querySelectorAll(group.selector).forEach((element, index) => {
      element.classList.add('reveal-item', group.className);
      element.style.setProperty('--reveal-delay', `${index * group.step}ms`);
      revealObserver.observe(element);
    });
  });
}
