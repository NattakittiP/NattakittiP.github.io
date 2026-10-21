(() => {
  'use strict';
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#primary-nav');
  menu.addEventListener('click', () => {
    const expanded = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(expanded));
    menu.setAttribute('aria-label', expanded ? 'Close navigation' : 'Open navigation');
    nav.classList.toggle('is-open', expanded);
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('is-open');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Open navigation');
  }));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      nav.classList.remove('is-open');
      menu.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-label', 'Open navigation');
    }
  });
  const allAbstracts = [...document.querySelectorAll('#research .work-details')];
  const expandButton = document.querySelector('#expand-research');
  const syncExpand = () => {
    const allOpen = allAbstracts.every(detail => detail.open);
    expandButton.setAttribute('aria-expanded', String(allOpen));
    expandButton.innerHTML = `${allOpen ? 'Collapse' : 'Expand'} all abstracts <span aria-hidden="true">${allOpen ? '−' : '+'}</span>`;
  };
  expandButton.addEventListener('click', () => {
    const nextOpen = !allAbstracts.every(detail => detail.open);
    allAbstracts.forEach(detail => { detail.open = nextOpen; });
    syncExpand();
  });
  allAbstracts.forEach(detail => detail.addEventListener('toggle', syncExpand));
  const figureObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const image = entry.target.querySelector('img');
      image.src = image.dataset.src;
      figureObserver.unobserve(entry.target);
    });
  }, {rootMargin: '450px 0px'}) : null;
  document.querySelectorAll('.work-figure').forEach(figure => {
    const image = figure.querySelector('img');
    const imageLink = figure.querySelector('.figure-image-link');
    const placeholder = figure.querySelector('.figure-placeholder');
    const title = figure.closest('.work').querySelector('.work-title').textContent.trim();
    const showFigure = () => { image.hidden = false; imageLink.hidden = false; placeholder.hidden = true; image.alt = title; };
    const revealFigure = async () => {
      try { if (typeof image.decode === 'function') await image.decode(); } catch (_) { /* A loaded image can still be displayed. */ }
      showFigure();
    };
    image.addEventListener('load', revealFigure);
    image.addEventListener('error', () => { image.hidden = true; imageLink.hidden = true; placeholder.hidden = false; });
    const imagePath = window.PROFILE_FIGURES?.[figure.dataset.figure];
    if (typeof imagePath === 'string' && imagePath.trim()) {
      imageLink.href = imagePath;
      imageLink.setAttribute('aria-label', `View figure: ${title}`);
      if (figureObserver) {
        image.dataset.src = imagePath;
        figureObserver.observe(figure);
      } else image.src = imagePath;
    }
    if (image.complete && image.naturalWidth) revealFigure();
  });
  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();
  const links = [...nav.querySelectorAll('a')];
  if ('IntersectionObserver' in window) {
    const sections = [...document.querySelectorAll('main>section[id]')];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        links.forEach(link => {
          if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, {rootMargin: '-15% 0px -65% 0px', threshold: 0});
    sections.forEach(section => observer.observe(section));
  }
})();
