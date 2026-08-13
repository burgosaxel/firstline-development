const portfolioData = [
  {
    name: 'BLOOM.INFIVE',
    industry: 'Blog & Personal Brand',
    description: 'A gentle, faith-rooted motherhood blog built for stories, author connection, and newsletter growth.',
    features: ['Responsive desktop and mobile design', 'Blog publishing structure', 'Author introduction', 'Newsletter pathway', 'Soft editorial layout', 'Clear reading flow'],
    url: 'https://bloominfive.blog/',
    screenshots: {
      desktop: 'assets/bloominfive-desktop.png',
      mobile: 'assets/bloominfive-mobile.png'
    }
  },
  {
    name: 'Ebanister\u00eda CAD',
    industry: 'Home Services & Custom Carpentry',
    description: 'A polished service website for custom kitchens, closets, entertainment centers, and remodeling work in Puerto Rico.',
    features: ['Responsive desktop and mobile design', 'Service-focused homepage', 'Quote request CTA', 'Project gallery pathway', 'Spanish-language content', 'Local business positioning'],
    url: 'https://www.ebanisteriacad.com/',
    screenshots: {
      desktop: 'assets/ebanisteriacad-desktop.png',
      mobile: 'assets/ebanisteriacad-mobile.png'
    }
  }
];

const portfolioGrid = document.getElementById('portfolio-grid');
if (portfolioGrid) {
  portfolioGrid.innerHTML = portfolioData
    .map(
      (project) => {
        const isExternal = /^https?:\/\//.test(project.url);
        const linkAttrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
        const previewMarkup = project.screenshots
          ? `
            <div class="project-preview has-screenshots">
              <div class="preview-desktop screenshot-frame">
                <img src="${project.screenshots.desktop}" alt="${project.name} desktop website screenshot" />
              </div>
              <div class="preview-mobile screenshot-frame">
                <img src="${project.screenshots.mobile}" alt="${project.name} mobile website screenshot" />
              </div>
            </div>
          `
          : `
            <div class="project-preview">
              <div class="preview-desktop">
                <div class="preview-window-bar" aria-hidden="true">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div class="preview-window-body">
                  <div class="preview-sidebar" aria-hidden="true"></div>
                  <div class="preview-content">
                    <div class="bars" aria-hidden="true">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <div class="cards" aria-hidden="true">
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="preview-mobile">
                <div class="preview-phone">
                  <div class="phone-top" aria-hidden="true"></div>
                  <div class="phone-visual" aria-hidden="true">
                    <span class="block"></span>
                    <span class="block"></span>
                    <span class="block"></span>
                  </div>
                </div>
              </div>
            </div>
          `;

        return `
        <article class="project-card reveal">
          ${previewMarkup}

          <div class="project-info">
            <span class="project-meta">${project.industry}</span>
            <h3>${project.name}</h3>
            <p>${project.description}</p>
            <ul class="feature-list">
              ${project.features.map((feature) => `<li>${feature}</li>`).join('')}
            </ul>
            <div class="project-actions">
              <a class="button button-primary" href="${project.url}"${linkAttrs}>View Website</a>
            </div>
          </div>
        </article>
      `;
      }
    )
    .join('');
}

const header = document.querySelector('.site-header');
const menuToggle = document.querySelector('.menu-toggle');
const homeLinks = document.querySelectorAll('.brand[href="#top"]');
const anchorLinks = document.querySelectorAll('a[href^="#"]:not(.brand)');

const closeMobileMenu = () => {
  if (!header || !menuToggle) return;

  header.classList.remove('is-open');
  menuToggle.setAttribute('aria-expanded', 'false');
};

const getHeaderOffset = () => {
  if (!header) return 0;

  if (window.matchMedia('(min-width: 981px)').matches) {
    return 85;
  }

  return Math.ceil(header.getBoundingClientRect().height) + 8;
};

homeLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    closeMobileMenu();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

anchorLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    const hash = link.getAttribute('href');
    if (!hash || hash === '#') return;

    const target = document.querySelector(hash);
    if (!target) return;

    event.preventDefault();
    closeMobileMenu();

    const headerOffset = getHeaderOffset();
    const targetTop = target.getBoundingClientRect().top + window.scrollY - headerOffset;

    window.scrollTo({ top: Math.max(targetTop, 0), behavior: 'smooth' });
    history.pushState(null, '', hash);
  });
});

if (menuToggle && header) {
  menuToggle.addEventListener('click', () => {
    const isOpen = header.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  header.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      closeMobileMenu();
    });
  });

  document.addEventListener('click', (event) => {
    if (!header.classList.contains('is-open')) return;
    if (header.contains(event.target)) return;

    closeMobileMenu();
  });
}

const form = document.getElementById('contact-form');
const successState = document.getElementById('success-state');

if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const projectType = formData.get('projectType') || 'Not specified';
    const name = formData.get('name') || 'There';

    form.setAttribute('hidden', 'hidden');
    form.style.display = 'none';

    if (successState) {
      successState.hidden = false;
      successState.innerHTML = `
        <div class="success-icon" aria-hidden="true">\u2713</div>
        <h3>Thanks, ${name}.</h3>
        <p>Your inquiry has been received. We&apos;ll be in touch soon.</p>
      `;
    }
  });
}

const revealItems = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 }
);

revealItems.forEach((item) => revealObserver.observe(item));

const yearNode = document.querySelector('.footer-bottom p');
if (yearNode) {
  yearNode.textContent = `\u00a9 ${new Date().getFullYear()} FirstLine Development. All rights reserved.`;
}
