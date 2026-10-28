(() => {
const boundDocuments = window.__firstLineBoundDocuments || (window.__firstLineBoundDocuments = new WeakSet());
if (boundDocuments.has(document)) return;
boundDocuments.add(document);

const analytics = (() => {
  const pageByPath = Object.freeze({
    '': 'home',
    '/': 'home',
    '/index.html': 'home',
    '/pricing': 'pricing',
    '/pricing.html': 'pricing',
    '/privacy': 'privacy',
    '/privacy.html': 'privacy',
    '/terms': 'terms',
    '/terms.html': 'terms'
  });
  const contract = Object.freeze({
    page_view: Object.freeze({ page: Object.freeze(['home', 'pricing', 'privacy', 'terms']) }),
    section_navigation: Object.freeze({ section: Object.freeze(['work', 'services', 'process', 'about']) }),
    contact_cta_click: Object.freeze({ placement: Object.freeze(['nav', 'hero', 'sales', 'final', 'pricing']) }),
    portfolio_project_click: Object.freeze({ project: Object.freeze(['bloom_infive', 'ebanisteria_cad', 'tripletas_la_union']) }),
    inquiry_submit_attempt: Object.freeze({}),
    inquiry_submit_success: Object.freeze({}),
    inquiry_submit_error: Object.freeze({ reason: Object.freeze(['network', 'server', 'response']) })
  });
  const viewedDocuments = new WeakSet();
  const productionHosts = Object.freeze(['firstlinedev.com', 'www.firstlinedev.com', 'firstline-development.web.app']);
  const loopbackHosts = Object.freeze(['localhost', '127.0.0.1', '[::1]']);
  // Intentionally non-working until the owner supplies the verified production web-stream ID.
  const measurementId = 'G-PRODUCTION-ID-REQUIRED';
  const consentStorageKey = 'firstline-analytics-consent';
  const canUseOfflineSink = loopbackHosts.includes(window.location.hostname);
  const isProductionHost = productionHosts.includes(window.location.hostname);
  let offlineSink = null;
  let currentPage = null;
  let providerLoaded = false;
  let providerLoadStarted = false;
  let providerPageViewSent = false;
  const getStoredConsent = () => {
    try {
      const value = window.localStorage?.getItem(consentStorageKey);
      return value === 'accepted' || value === 'rejected' ? value : 'unknown';
    } catch {
      return 'unknown';
    }
  };
  let consent = getStoredConsent();
  const setStoredConsent = (value) => {
    consent = value;
    try { window.localStorage?.setItem(consentStorageKey, value); } catch { /* storage is optional */ }
  };
  const productionConfig = Object.freeze({ measurementId, activationGate: false });
  const getActivationConfig = () => {
    if (!canUseOfflineSink) return productionConfig;
    const testConfig = window.__FirstLineAnalyticsTestConfig;
    return testConfig && typeof testConfig === 'object' ? testConfig : productionConfig;
  };
  const hasApprovedConfiguration = (config) => Boolean(
    config && config.activationGate === true && typeof config.measurementId === 'string' &&
    /^G-[A-Z0-9]{6,15}$/.test(config.measurementId) && config.measurementId !== measurementId &&
    (isProductionHost || canUseOfflineSink)
  );
  const canonicalPageLocation = () => `https://firstlinedev.com${window.location.pathname || '/'}`;
  const dispatchToProvider = (name, params) => {
    if (!providerLoaded || consent !== 'accepted' || typeof window.gtag !== 'function') return false;
    const providerParams = name === 'page_view'
      ? { page: params.page, page_location: canonicalPageLocation(), page_referrer: '' }
      : params;
    try { window.gtag('event', name, providerParams); return true; } catch { return false; }
  };
  const loadProviderScript = (config) => {
    if (providerLoadStarted || !document.createElement || !document.head?.appendChild) return false;
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.measurementId)}`;
    script.referrerPolicy = 'no-referrer';
    document.head.appendChild(script);
    providerLoadStarted = true;
    return true;
  };
  const activateProvider = () => {
    const config = getActivationConfig();
    if (consent !== 'accepted' || providerLoaded || !hasApprovedConfiguration(config)) return false;
    window.dataLayer = Array.isArray(window.dataLayer) ? window.dataLayer : [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', config.measurementId, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, page_referrer: '' });
    if (!loadProviderScript(config)) return false;
    providerLoaded = true;
    if (currentPage && !providerPageViewSent) providerPageViewSent = dispatchToProvider('page_view', { page: currentPage });
    return true;
  };

  const sanitize = (name, params = {}) => {
    const allowedParams = contract[name];
    if (!allowedParams || !params || typeof params !== 'object' || Array.isArray(params)) return null;

    const keys = Object.keys(params);
    const allowedKeys = Object.keys(allowedParams);
    if (keys.length !== allowedKeys.length || keys.some((key) => !Object.hasOwn(allowedParams, key))) return null;

    const sanitized = {};
    for (const key of allowedKeys) {
      if (!allowedParams[key].includes(params[key])) return null;
      sanitized[key] = params[key];
    }

    return Object.freeze(sanitized);
  };

  const track = (name, params) => {
    const sanitized = sanitize(name, params);
    if (!sanitized) return false;

    const record = Object.freeze({ schema_version: 1, name, params: sanitized });
    if (offlineSink) {
      try {
        offlineSink(record);
      } catch {
        // Local test instrumentation must never affect visitor workflows.
      }
    }
    dispatchToProvider(name, sanitized);
    return true;
  };

  const initializeDocument = (documentNode, pathname) => {
    if (viewedDocuments.has(documentNode)) return false;
    viewedDocuments.add(documentNode);
    const page = pageByPath[pathname || ''];
    if (page) currentPage = page;
    return page ? track('page_view', { page }) : false;
  };

  const ownedAnalytics = Object.freeze({
    contract,
    initializeDocument,
    setOfflineSink(sink) {
      if (!canUseOfflineSink) return false;
      offlineSink = typeof sink === 'function' ? sink : null;
      return true;
    },
    getConsent() {
      return consent;
    },
    setConsent(value) {
      if (value !== 'accepted' && value !== 'rejected') return false;
      const previousConsent = consent;
      if (value === 'rejected' && providerLoaded && typeof window.gtag === 'function') {
        try {
          window.gtag('consent', 'update', { analytics_storage: 'denied' });
        } catch {
          // Consent withdrawal must not break visitor workflows.
        }
      }
      setStoredConsent(value);
      if (value === 'accepted') {
        if (providerLoaded && previousConsent !== 'accepted' && typeof window.gtag === 'function') {
          try {
            window.gtag('consent', 'update', { analytics_storage: 'granted' });
          } catch {
            // Re-consent must not break visitor workflows.
          }
        } else {
          activateProvider();
        }
      }
      return true;
    },
    track
  });
  const productionFacade = Object.freeze({ contract, getConsent: ownedAnalytics.getConsent, initializeDocument, setConsent: ownedAnalytics.setConsent, track });
  const exposedAnalytics = canUseOfflineSink ? ownedAnalytics : productionFacade;
  const existingDescriptor = Object.getOwnPropertyDescriptor(window, 'FirstLineAnalytics');

  if (!existingDescriptor || existingDescriptor.configurable) {
    try {
      Object.defineProperty(window, 'FirstLineAnalytics', {
        configurable: false,
        enumerable: true,
        value: exposedAnalytics,
        writable: false
      });
    } catch {
      // A hostile or incompatible global must not affect the owned seam.
    }
  }

  return ownedAnalytics;
})();

analytics.initializeDocument(document, window.location.pathname);

const syncConsentUi = () => {
  const notice = document.getElementById('analytics-consent-notice');
  const preferences = document.querySelectorAll?.('[data-analytics-preferences]') || [];
  const choice = analytics.getConsent();
  if (notice) notice.hidden = choice !== 'unknown';
  preferences.forEach((button) => {
    button.textContent = choice === 'accepted' ? 'Privacy Preferences (analytics on)' : 'Privacy Preferences';
  });
};

const chooseAnalyticsConsent = (value) => {
  analytics.setConsent(value);
  syncConsentUi();
};

document.getElementById('accept-analytics')?.addEventListener('click', () => chooseAnalyticsConsent('accepted'));
document.getElementById('reject-analytics')?.addEventListener('click', () => chooseAnalyticsConsent('rejected'));
(document.querySelectorAll?.('[data-analytics-preferences]') || []).forEach((button) => {
  button.addEventListener('click', () => {
    const notice = document.getElementById('analytics-consent-notice');
    if (notice) {
      notice.hidden = false;
      document.getElementById('accept-analytics')?.focus?.();
    }
  });
});
syncConsentUi();

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
  },
  {
    name: 'Tripletas La Union',
    industry: 'Food & Beverage',
    description: 'A bold Spanish-language restaurant website built for fast ordering, location details, menu browsing, and late-night customer action.',
    features: ['Responsive desktop and mobile design', 'Spanish-language content', 'Order-by-phone CTA', 'Menu pathway', 'Location details', 'Bold local brand style'],
    url: 'https://tripletaslaunion.com/',
    screenshots: {
      desktop: 'assets/tripletas-la-union-desktop.png',
      mobile: 'assets/tripletas-la-union-mobile.jpg'
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
              <a class="button button-primary" data-project-key="${project.name === 'BLOOM.INFIVE' ? 'bloom_infive' : project.name === 'Ebanistería CAD' ? 'ebanisteria_cad' : 'tripletas_la_union'}" href="${project.url}"${linkAttrs}>View Website</a>
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

    let target;
    try {
      target = document.querySelector(hash);
    } catch {
      return;
    }
    if (!target) return;

    event.preventDefault();
    closeMobileMenu();

    const headerOffset = getHeaderOffset();
    const targetTop = target.getBoundingClientRect().top + window.scrollY - headerOffset;

    window.scrollTo({ top: Math.max(targetTop, 0), behavior: 'smooth' });
    history.pushState(null, '', hash);

    const section = {
      '#work': 'work',
      '#services': 'services',
      '#process': 'process',
      '#about': 'about'
    }[hash];
    if (section) analytics.track('section_navigation', { section });
  });
});

const contactPlacements = new Map([
  ['nav-cta', 'nav'],
  ['hero-actions', 'hero'],
  ['sales-cta', 'sales'],
  ['final-cta', 'final'],
  ['pricing-cta', 'pricing']
]);

document.querySelectorAll('a[href="/connect"]').forEach((link) => {
  link.addEventListener('click', () => {
    const placement = [...contactPlacements].find(([className]) => link.closest(`.${className}`));
    if (placement) analytics.track('contact_cta_click', { placement: placement[1] });
  });
});

document.querySelectorAll('[data-project-key]').forEach((link) => {
  link.addEventListener('click', () => {
    analytics.track('portfolio_project_click', { project: link.dataset.projectKey });
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
const formError = document.getElementById('form-error');
const CONTACT_ENDPOINT = 'https://us-east1-firstline-development.cloudfunctions.net/submitContactForm';

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (!CONTACT_ENDPOINT) {
      if (formError) {
        formError.hidden = false;
        formError.textContent = 'The contact form is not ready yet. Please try again later.';
      }
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.textContent : '';
    const formData = new FormData(form);
    const name = formData.get('name') || 'there';
    const payload = {
      name: formData.get('name') || '',
      businessName: formData.get('businessName') || '',
      email: formData.get('email') || '',
      phone: formData.get('phone') || '',
      currentWebsite: formData.get('currentWebsite') || '',
      projectType: formData.get('projectType') || '',
      businessNeed: formData.get('businessNeed') || '',
      message: formData.get('message') || '',
      website: formData.get('website') || ''
    };

    if (formError) {
      formError.hidden = true;
      formError.textContent = '';
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending...';
    }

    analytics.track('inquiry_submit_attempt');
    let submitFailureReason = null;

    try {
      const response = await fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      let result = null;
      if (typeof response.json === 'function') {
        try {
          result = await response.json();
        } catch {
          result = null;
        }
      }

      if (!response.ok) {
        submitFailureReason = 'server';
        throw new Error(result?.error || 'Unable to send your message right now.');
      }

      if (!result || result.ok !== true) {
        submitFailureReason = 'response';
        throw new Error(result?.error || 'Unable to send your message right now.');
      }

      analytics.track('inquiry_submit_success');

      form.reset();
      form.setAttribute('hidden', 'hidden');
      form.style.display = 'none';

      if (successState) {
        successState.hidden = false;
        successState.innerHTML = `
          <div class="success-icon" aria-hidden="true">\u2713</div>
          <h3>Thanks, ${escapeHtml(name)}.</h3>
          <p>Your inquiry has been received. We&apos;ll be in touch soon.</p>
        `;
      }
    } catch (error) {
      analytics.track('inquiry_submit_error', { reason: submitFailureReason || 'network' });
      if (formError) {
        formError.hidden = false;
        formError.textContent = error.message || 'Unable to send your message right now. Please try again.';
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
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
})();
