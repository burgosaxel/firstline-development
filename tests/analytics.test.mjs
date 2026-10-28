import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../script.js', import.meta.url), 'utf8');
const privacySource = await readFile(new URL('../privacy.html', import.meta.url), 'utf8');

class MockElement {
  constructor({ attributes = {}, classes = [], dataset = {} } = {}) {
    this.attributes = new Map(Object.entries(attributes));
    this.classes = new Set(classes);
    this.dataset = dataset;
    this.listeners = new Map();
    this.classList = {
      add: (name) => this.classes.add(name),
      contains: (name) => this.classes.has(name),
      remove: (name) => this.classes.delete(name),
      toggle: (name) => {
        const has = this.classes.has(name);
        if (has) this.classes.delete(name);
        else this.classes.add(name);
        return !has;
      }
    };
    this.style = {};
    this.hidden = false;
    this.textContent = '';
  }

  addEventListener(type, listener) {
    this.listeners.set(type, [...(this.listeners.get(type) || []), listener]);
  }

  async emit(type, event = {}) {
    for (const listener of this.listeners.get(type) || []) await listener({ preventDefault() {}, target: this, ...event });
  }

  getAttribute(name) {
    return this.attributes.get(name) || null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  closest(selector) {
    return selector.startsWith('.') && this.classes.has(selector.slice(1)) ? this : null;
  }

  contains(node) {
    return node === this;
  }

  getBoundingClientRect() {
    return { height: 50, top: 300 };
  }
}

class MockForm extends MockElement {
  constructor(values, valid = true) {
    super();
    this.formValues = values;
    this.valid = valid;
    this.submitButton = new MockElement();
    this.submitButton.textContent = 'Start My Project';
    this.resetCount = 0;
  }

  checkValidity() {
    return this.valid;
  }

  reportValidity() {
    this.reportedValidity = true;
  }

  querySelector(selector) {
    return selector === 'button[type="submit"]' ? this.submitButton : null;
  }

  reset() {
    this.resetCount += 1;
  }
}

class MockFormData {
  constructor(form) {
    this.values = form.formValues;
  }

  get(name) {
    return this.values[name] || '';
  }
}

const formValues = {
  name: 'Ada Example',
  businessName: 'Example Studio',
  email: 'ada@example.test',
  phone: '+1-555-0100',
  currentWebsite: 'https://private.example.test/path?x=1',
  projectType: 'I need a new website',
  businessNeed: 'A private business need',
  message: 'A private message',
  website: ''
};

function load({
  hostname = 'localhost',
  pathname = '/',
  form = null,
  fetchImpl = async () => ({ ok: true, json: async () => ({ ok: true }) }),
  preseedAnalytics = null,
  preseedAnalyticsDescriptor = null,
  storedConsent = null,
  testConfig = null
} = {}) {
  const hashWork = new MockElement({ attributes: { href: '#work' } });
  const hashUnsafe = new MockElement({ attributes: { href: '#not[a-valid-selector' } });
  const contacts = [
    new MockElement({ attributes: { href: '/connect' }, classes: ['nav-cta'] }),
    new MockElement({ attributes: { href: '/connect' }, classes: ['nav-cta'] }),
    new MockElement({ attributes: { href: '/connect' }, classes: ['nav-cta'] }),
    new MockElement({ attributes: { href: '/connect' }, classes: ['nav-cta'] }),
    new MockElement({ attributes: { href: '/connect' }, classes: ['hero-actions'] }),
    new MockElement({ attributes: { href: '/connect' }, classes: ['sales-cta'] }),
    new MockElement({ attributes: { href: '/connect' }, classes: ['final-cta'] }),
    new MockElement({ attributes: { href: '/connect' }, classes: ['pricing-cta'] })
  ];
  const projects = ['bloom_infive', 'ebanisteria_cad', 'tripletas_la_union'].map((projectKey) => new MockElement({ dataset: { projectKey } }));
  const header = new MockElement({ classes: ['site-header'] });
  const menuToggle = new MockElement();
  const portfolioGrid = new MockElement();
  const successState = new MockElement();
  const formError = new MockElement();
  const footer = new MockElement();
  const consentNotice = new MockElement();
  const acceptAnalytics = new MockElement();
  const rejectAnalytics = new MockElement();
  const preferences = new MockElement();
  const appendedScripts = [];
  const storage = new Map(storedConsent ? [['firstline-analytics-consent', storedConsent]] : []);
  const targets = new Map([['#work', new MockElement()]]);
  const scrollCalls = [];
  const historyCalls = [];
  const document = {
    clickListeners: [],
    documentElement: {},
    head: { appendChild: (node) => { appendedScripts.push(node); return node; } },
    addEventListener(type, listener) {
      this.clickListeners.push([type, listener]);
    },
    createElement(tagName) {
      return tagName === 'script' ? new MockElement() : new MockElement();
    },
    getElementById(id) {
      return {
        'portfolio-grid': portfolioGrid,
        'contact-form': form,
        'success-state': successState,
        'form-error': formError,
        'analytics-consent-notice': consentNotice,
        'accept-analytics': acceptAnalytics,
        'reject-analytics': rejectAnalytics
      }[id] || null;
    },
    querySelector(selector) {
      if (selector === '.site-header') return header;
      if (selector === '.menu-toggle') return menuToggle;
      if (selector === '.footer-bottom p') return footer;
      if (selector === 'button[type="submit"]') return form?.submitButton || null;
      if (selector.includes('not[')) throw new SyntaxError('invalid selector');
      return targets.get(selector) || null;
    },
    querySelectorAll(selector) {
      if (selector === '.brand[href="#top"]') return [];
      if (selector === 'a[href^="#"]:not(.brand)') return [hashWork, hashUnsafe];
      if (selector === 'a[href="/connect"]') return contacts;
      if (selector === '[data-project-key]') return projects;
      if (selector === '.reveal') return [];
      if (selector === '[data-analytics-preferences]') return [preferences];
      return [];
    }
  };
  header.querySelectorAll = () => [];
  const window = {
    location: { hostname, pathname },
    localStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, String(value)) },
    matchMedia: () => ({ matches: false }),
    scrollY: 10,
    scrollTo: (options) => scrollCalls.push(options)
  };
  if (preseedAnalyticsDescriptor) {
    Object.defineProperty(window, 'FirstLineAnalytics', preseedAnalyticsDescriptor);
  } else if (preseedAnalytics) {
    window.FirstLineAnalytics = preseedAnalytics;
  }
  if (testConfig) window.__FirstLineAnalyticsTestConfig = testConfig;
  const context = vm.createContext({
    Array,
    FormData: MockFormData,
    IntersectionObserver: class { observe() {} unobserve() {} },
    JSON,
    Map,
    Math,
    Object,
    String,
    WeakSet,
    console,
    document,
    fetch: fetchImpl,
    history: { pushState: (...args) => historyCalls.push(args) },
    window
  });
  vm.runInContext(source, context, { filename: 'script.js' });
  return { acceptAnalytics, appendedScripts, consentNotice, contacts, context, document, formError, hashUnsafe, hashWork, historyCalls, portfolioGrid, preferences, projects, rejectAnalytics, scrollCalls, storage, successState, window };
}

function capture(analytics) {
  const records = [];
  assert.equal(analytics.setOfflineSink((record) => records.push(record)), true);
  return records;
}

const plain = (value) => JSON.parse(JSON.stringify(value));

test('disabled default has no sink or transport, and accepted records are copied and immutable', () => {
  let fetchCalls = 0;
  const app = load({ fetchImpl: async () => { fetchCalls += 1; throw new Error('unexpected request'); } });
  const analytics = app.window.FirstLineAnalytics;
  assert.equal(fetchCalls, 0);
  assert.equal(analytics.track('page_view', { page: 'home' }), true);
  assert.equal(fetchCalls, 0);

  let sinkMutationRejected = false;
  const records = [];
  analytics.setOfflineSink((record) => {
    try {
      record.params.section = 'about';
    } catch {
      sinkMutationRejected = true;
    }
    records.push(record);
  });
  const supplied = { section: 'work' };
  assert.equal(analytics.track('section_navigation', supplied), true);
  supplied.section = 'about';
  assert.deepEqual(plain(records[0]), { schema_version: 1, name: 'section_navigation', params: { section: 'work' } });
  assert.equal(Object.isFrozen(records[0]), true);
  assert.equal(Object.isFrozen(records[0].params), true);
  assert.throws(() => { records[0].params.section = 'about'; }, TypeError);
  assert.equal(sinkMutationRejected, true);
  assert.equal(analytics.track('section_navigation', { section: 'private message' }), false);
  assert.equal(analytics.track('unknown_event', {}), false);
  assert.equal(fetchCalls, 0);
});

test('page identity accepts deployed clean URLs and .html aliases exactly once, but rejects unknown paths', () => {
  for (const [pathname, page] of [
    ['', 'home'], ['/', 'home'], ['/index.html', 'home'],
    ['/pricing', 'pricing'], ['/pricing.html', 'pricing'],
    ['/privacy', 'privacy'], ['/privacy.html', 'privacy'],
    ['/terms', 'terms'], ['/terms.html', 'terms']
  ]) {
    const app = load();
    const records = capture(app.window.FirstLineAnalytics);
    const pageDocument = {};
    assert.equal(app.window.FirstLineAnalytics.initializeDocument(pageDocument, pathname), true, pathname);
    assert.equal(app.window.FirstLineAnalytics.initializeDocument(pageDocument, pathname), false, pathname);
    assert.deepEqual(plain(records), [{ schema_version: 1, name: 'page_view', params: { page } }], pathname);
  }
  const app = load();
  const records = capture(app.window.FirstLineAnalytics);
  assert.equal(app.window.FirstLineAnalytics.initializeDocument({}, '/unapproved'), false);
  assert.equal(records.length, 0);
});

test('production origins reject offline sink injection without changing accepted event behavior', () => {
  const app = load({ hostname: 'firstline-development.web.app' });
  const analytics = app.window.FirstLineAnalytics;
  const records = [];
  assert.equal(typeof analytics.setOfflineSink, 'undefined');
  assert.equal(analytics.track('page_view', { page: 'home' }), true);
  assert.deepEqual(records, []);
});

test('production replaces configurable pre-seeded analytics globals without invoking them', async () => {
  const calls = [];
  const hostile = {
    initializeDocument: () => calls.push('initializeDocument'),
    setOfflineSink: () => { calls.push('setOfflineSink'); return true; },
    track: () => calls.push('track')
  };
  const app = load({ hostname: 'firstline-development.web.app', preseedAnalytics: hostile });
  const analytics = app.window.FirstLineAnalytics;
  assert.notEqual(analytics, hostile);
  assert.equal(typeof analytics.setOfflineSink, 'undefined');
  assert.equal(Object.isFrozen(analytics), true);
  await app.hashWork.emit('click');
  await app.contacts[7].emit('click');
  assert.deepEqual(calls, []);
  assert.deepEqual(app.historyCalls, [[null, '', '#work']]);
});

test('non-configurable hostile analytics globals are never invoked and do not break visitor flow', async () => {
  const calls = [];
  const hostile = {
    initializeDocument: () => calls.push('initializeDocument'),
    setOfflineSink: () => { calls.push('setOfflineSink'); return true; },
    track: () => calls.push('track')
  };
  const app = load({
    hostname: 'firstline-development.web.app',
    preseedAnalyticsDescriptor: { configurable: false, enumerable: true, value: hostile, writable: false }
  });
  assert.equal(app.window.FirstLineAnalytics, hostile);
  await app.hashWork.emit('click');
  await app.contacts[7].emit('click');
  assert.deepEqual(calls, []);
  assert.deepEqual(app.historyCalls, [[null, '', '#work']]);
});

test('repeated production evaluation keeps hostile state untrusted and exact loopback matching fails closed', async () => {
  const calls = [];
  const hostile = {
    initializeDocument: () => calls.push('initializeDocument'),
    setOfflineSink: () => { calls.push('setOfflineSink'); return true; },
    track: () => calls.push('track')
  };
  const app = load({ hostname: 'firstline-development.web.app', preseedAnalytics: hostile });
  vm.runInContext(source, app.context, { filename: 'script.js' });
  await app.hashWork.emit('click');
  assert.deepEqual(calls, []);
  assert.equal(app.historyCalls.length, 1);
  for (const hostname of ['localhost.example.test', 'localhost:3000', 'evil-localhost', '127.0.0.1.example.test', '[::1].example.test', 'user@localhost']) {
    const lookalike = load({ hostname });
    assert.equal(typeof lookalike.window.FirstLineAnalytics.setOfflineSink, 'undefined', hostname);
  }
});

test('each exact approved loopback hostname retains local sink injection', () => {
  for (const hostname of ['localhost', '127.0.0.1', '[::1]']) {
    const app = load({ hostname });
    const records = [];
    assert.equal(app.window.FirstLineAnalytics.setOfflineSink((record) => records.push(record)), true, hostname);
    assert.equal(app.window.FirstLineAnalytics.track('page_view', { page: 'home' }), true, hostname);
    assert.equal(records.length, 1, hostname);
  }
});

test('a throwing local-test sink cannot block hash navigation, successful submission, error UI, or later actions', async () => {
  const successfulForm = new MockForm(formValues);
  let successfulRequests = 0;
  const successfulApp = load({
    form: successfulForm,
    fetchImpl: async () => {
      successfulRequests += 1;
      return { ok: true, json: async () => ({ ok: true }) };
    }
  });
  assert.equal(successfulApp.window.FirstLineAnalytics.setOfflineSink(() => { throw new Error('offline sink failure'); }), true);
  await successfulApp.hashWork.emit('click');
  await successfulForm.emit('submit');
  await successfulApp.contacts[7].emit('click', { target: new MockElement() });
  assert.equal(successfulRequests, 1);
  assert.equal(successfulForm.resetCount, 1);
  assert.equal(successfulApp.historyCalls.length, 1);
  assert.equal(successfulApp.successState.hidden, false);

  const failedForm = new MockForm(formValues);
  let failedRequests = 0;
  const failedApp = load({
    form: failedForm,
    fetchImpl: async () => {
      failedRequests += 1;
      throw new Error('network unavailable');
    }
  });
  assert.equal(failedApp.window.FirstLineAnalytics.setOfflineSink(() => { throw new Error('offline sink failure'); }), true);
  await failedForm.emit('submit');
  assert.equal(failedRequests, 1);
  assert.equal(failedApp.formError.hidden, false);
  assert.equal(failedApp.formError.textContent, 'network unavailable');
});

test('invalid form interactions retain browser validation behavior and emit no submission event or request', async () => {
  const form = new MockForm(formValues, false);
  let requests = 0;
  const app = load({ form, fetchImpl: async () => { requests += 1; return { ok: true, json: async () => ({ ok: true }) }; } });
  const records = capture(app.window.FirstLineAnalytics);
  await form.emit('submit');
  assert.equal(form.reportedValidity, true);
  assert.equal(requests, 0);
  assert.deepEqual(records, []);
});

test('hash navigation preserves scrolling and history, excludes unsafe hashes, and re-evaluation does not duplicate listeners', async () => {
  const app = load();
  const records = capture(app.window.FirstLineAnalytics);
  await app.hashWork.emit('click');
  assert.deepEqual(app.historyCalls, [[null, '', '#work']]);
  assert.deepEqual(plain(app.scrollCalls), [{ top: 252, behavior: 'smooth' }]);
  assert.deepEqual(plain(records), [{ schema_version: 1, name: 'section_navigation', params: { section: 'work' } }]);

  await app.hashUnsafe.emit('click');
  assert.equal(records.length, 1);
  assert.equal(app.historyCalls.length, 1);
  vm.runInContext(source, app.context, { filename: 'script.js' });
  await app.hashWork.emit('click');
  assert.equal(records.length, 2);
  assert.equal(app.historyCalls.length, 2);
});

test('real contact and portfolio callsites use only approved coarse enums', async () => {
  const app = load();
  const records = capture(app.window.FirstLineAnalytics);
  for (const contact of app.contacts) await contact.emit('click');
  for (const project of app.projects) await project.emit('click');
  assert.deepEqual(plain(records), [
    { schema_version: 1, name: 'contact_cta_click', params: { placement: 'nav' } },
    { schema_version: 1, name: 'contact_cta_click', params: { placement: 'nav' } },
    { schema_version: 1, name: 'contact_cta_click', params: { placement: 'nav' } },
    { schema_version: 1, name: 'contact_cta_click', params: { placement: 'nav' } },
    { schema_version: 1, name: 'contact_cta_click', params: { placement: 'hero' } },
    { schema_version: 1, name: 'contact_cta_click', params: { placement: 'sales' } },
    { schema_version: 1, name: 'contact_cta_click', params: { placement: 'final' } },
    { schema_version: 1, name: 'contact_cta_click', params: { placement: 'pricing' } },
    { schema_version: 1, name: 'portfolio_project_click', params: { project: 'bloom_infive' } },
    { schema_version: 1, name: 'portfolio_project_click', params: { project: 'ebanisteria_cad' } },
    { schema_version: 1, name: 'portfolio_project_click', params: { project: 'tripletas_la_union' } }
  ]);
});

for (const scenario of [
  { name: 'success', response: { ok: true, json: async () => ({ ok: true }) }, expected: ['inquiry_submit_attempt', 'inquiry_submit_success'], reset: 1 },
  { name: 'HTTP failure', response: { ok: false, json: async () => ({ ok: true, error: 'private server detail' }) }, expected: ['inquiry_submit_attempt', 'inquiry_submit_error:server'], reset: 0 },
  { name: 'false result', response: { ok: true, json: async () => ({ ok: false, error: 'private response detail' }) }, expected: ['inquiry_submit_attempt', 'inquiry_submit_error:response'], reset: 0 },
  { name: 'missing result.ok', response: { ok: true, json: async () => ({}) }, expected: ['inquiry_submit_attempt', 'inquiry_submit_error:response'], reset: 0 },
  { name: 'rejected response.json', response: { ok: true, json: async () => { throw new Error('not JSON'); } }, expected: ['inquiry_submit_attempt', 'inquiry_submit_error:response'], reset: 0 },
  { name: 'missing response.json', response: { ok: true }, expected: ['inquiry_submit_attempt', 'inquiry_submit_error:response'], reset: 0 },
  { name: 'network failure', error: new Error('private network detail'), expected: ['inquiry_submit_attempt', 'inquiry_submit_error:network'], reset: 0 }
]) {
  test(`inquiry ${scenario.name} preserves endpoint flow and records only coarse semantics`, async () => {
    const form = new MockForm(formValues);
    const requests = [];
    const app = load({
      form,
      fetchImpl: async (url, options) => {
        requests.push({ url, options });
        if (scenario.error) throw scenario.error;
        return scenario.response;
      }
    });
    const records = capture(app.window.FirstLineAnalytics);
    await form.emit('submit');
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, 'https://us-east1-firstline-development.cloudfunctions.net/submitContactForm');
    assert.equal(form.resetCount, scenario.reset);
    assert.deepEqual(records.map((record) => `${record.name}${record.params.reason ? `:${record.params.reason}` : ''}`), scenario.expected);
    const serialized = JSON.stringify(records);
    for (const privateValue of Object.values(formValues).filter(Boolean)) assert.equal(serialized.includes(privateValue), false);
    assert.equal(serialized.includes(requests[0].url), false);
  });
}

test('unknown and rejected consent never configure a provider, including after interactions', async () => {
  const app = load();
  assert.equal(app.window.FirstLineAnalytics.getConsent(), 'unknown');
  assert.equal(app.consentNotice.hidden, false);
  assert.equal(app.window.dataLayer, undefined);
  assert.equal(app.appendedScripts.length, 0);
  await app.contacts[0].emit('click');
  await app.rejectAnalytics.emit('click');
  assert.equal(app.window.FirstLineAnalytics.getConsent(), 'rejected');
  assert.equal(app.storage.get('firstline-analytics-consent'), 'rejected');
  assert.equal(app.consentNotice.hidden, true);
  await app.hashWork.emit('click');
  assert.equal(app.window.dataLayer, undefined);
  assert.equal(app.appendedScripts.length, 0);
});

test('acceptance fails closed with the placeholder ID or a non-production host', async () => {
  const placeholder = load();
  await placeholder.acceptAnalytics.emit('click');
  assert.equal(placeholder.window.FirstLineAnalytics.getConsent(), 'accepted');
  assert.equal(placeholder.window.dataLayer, undefined);

  const nonProduction = load({ hostname: 'preview.example.test', testConfig: { measurementId: 'G-TEST12345', activationGate: true } });
  await nonProduction.acceptAnalytics.emit('click');
  assert.equal(nonProduction.window.dataLayer, undefined);
});

test('privacy preferences reopens the equal choice controls after rejection', async () => {
  const app = load();
  await app.rejectAnalytics.emit('click');
  assert.equal(app.consentNotice.hidden, true);
  await app.preferences.emit('click');
  assert.equal(app.consentNotice.hidden, false);
  await app.acceptAnalytics.emit('click');
  assert.equal(app.window.FirstLineAnalytics.getConsent(), 'accepted');
  assert.equal(app.appendedScripts.length, 0);
});

test('privacy page renders the same operable analytics choice surface as the persistent preferences control', () => {
  assert.match(privacySource, /<button class="privacy-preferences" type="button" data-analytics-preferences>Privacy Preferences<\/button>/);
  assert.match(privacySource, /<section id="analytics-consent-notice"[\s\S]*?<button id="accept-analytics"[\s\S]*?<button id="reject-analytics"/);
});

test('re-evaluation before acceptance registers one analytics UI listener set and one provider activation path', async () => {
  const app = load({ testConfig: { measurementId: 'G-TEST12345', activationGate: true } });
  const listenerCount = (element, type) => (element.listeners.get(type) || []).length;
  vm.runInContext(source, app.context, { filename: 'script.js' });
  assert.equal(listenerCount(app.acceptAnalytics, 'click'), 1);
  assert.equal(listenerCount(app.rejectAnalytics, 'click'), 1);
  assert.equal(listenerCount(app.preferences, 'click'), 1);
  await app.acceptAnalytics.emit('click');
  const calls = app.window.dataLayer.map((args) => plain(Array.from(args)));
  assert.equal(app.appendedScripts.length, 1);
  assert.equal(calls.filter(([command]) => command === 'config').length, 1);
  assert.equal(calls.filter(([command, name]) => command === 'event' && name === 'page_view').length, 1);
});

test('accepted exact-loopback test configuration owns one loader, one manual page view, and suppresses referrers', async () => {
  const app = load({ testConfig: { measurementId: 'G-TEST12345', activationGate: true } });
  await app.acceptAnalytics.emit('click');
  const calls = app.window.dataLayer.map((args) => plain(Array.from(args)));
  assert.equal(JSON.stringify(calls.slice(0, 2)), JSON.stringify([
    ['consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }],
    ['consent', 'update', { analytics_storage: 'granted' }]
  ]));
  assert.equal(calls[2][0], 'js');
  assert.equal(JSON.stringify(calls[3]), JSON.stringify(['config', 'G-TEST12345', { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, page_referrer: '' }]));
  assert.equal(JSON.stringify(calls[4]), JSON.stringify(['event', 'page_view', { page: 'home', page_location: 'https://firstlinedev.com/', page_referrer: '' }]));
  assert.equal(app.appendedScripts.length, 1);
  assert.equal(app.appendedScripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-TEST12345');
  assert.equal(app.appendedScripts[0].referrerPolicy, 'no-referrer');
  await app.acceptAnalytics.emit('click');
  assert.equal(app.window.dataLayer.length, 5);
  await app.preferences.emit('click');
  assert.equal(app.consentNotice.hidden, false);
  assert.equal(app.window.FirstLineAnalytics.getConsent(), 'accepted');
  await app.rejectAnalytics.emit('click');
  assert.equal(app.window.FirstLineAnalytics.getConsent(), 'rejected');
  assert.deepEqual(plain(Array.from(app.window.dataLayer[5])), ['consent', 'update', { analytics_storage: 'denied' }]);
  assert.equal(app.window.FirstLineAnalytics.track('section_navigation', { section: 'work' }), true);
  assert.equal(app.window.dataLayer.length, 6);
  await app.preferences.emit('click');
  await app.acceptAnalytics.emit('click');
  assert.deepEqual(plain(Array.from(app.window.dataLayer[6])), ['consent', 'update', { analytics_storage: 'granted' }]);
  assert.equal(app.appendedScripts.length, 1);
});
