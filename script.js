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
