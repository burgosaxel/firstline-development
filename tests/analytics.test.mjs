import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../script.js', import.meta.url), 'utf8');

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
  constructor(values) {
    super();
    this.formValues = values;
    this.submitButton = new MockElement();
    this.submitButton.textContent = 'Start My Project';
    this.resetCount = 0;
  }

  checkValidity() {
    return true;
  }

  reportValidity() {
    throw new Error('unexpected validation report');
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

function load({ pathname = '/', form = null, fetchImpl = async () => ({ ok: true, json: async () => ({ ok: true }) }) } = {}) {
  const hashWork = new MockElement({ attributes: { href: '#work' } });
  const hashUnsafe = new MockElement({ attributes: { href: '#not[a-valid-selector' } });
  const contacts = [
    new MockElement({ attributes: { href: '/connect' }, classes: ['nav-cta'] }),
    new MockElement({ attributes: { href: '/connect' }, classes: ['hero-actions'] }),
    new MockElement({ attributes: { href: '/connect' }, classes: ['sales-cta'] }),
    new MockElement({ attributes: { href: '/connect' }, classes: ['final-cta'] })
  ];
  const projects = ['bloom_infive', 'ebanisteria_cad', 'tripletas_la_union'].map((projectKey) => new MockElement({ dataset: { projectKey } }));
  const header = new MockElement({ classes: ['site-header'] });
  const menuToggle = new MockElement();
  const portfolioGrid = new MockElement();
  const successState = new MockElement();
  const formError = new MockElement();
  const footer = new MockElement();
  const targets = new Map([['#work', new MockElement()]]);
  const scrollCalls = [];
  const historyCalls = [];
  const document = {
    clickListeners: [],
    documentElement: {},
    addEventListener(type, listener) {
      this.clickListeners.push([type, listener]);
    },
    getElementById(id) {
      return { 'portfolio-grid': portfolioGrid, 'contact-form': form, 'success-state': successState, 'form-error': formError }[id] || null;
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
      return [];
    }
  };
  header.querySelectorAll = () => [];
  const window = {
    location: { pathname },
    matchMedia: () => ({ matches: false }),
    scrollY: 10,
    scrollTo: (options) => scrollCalls.push(options)
  };
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
  return { contacts, context, document, formError, hashUnsafe, hashWork, historyCalls, portfolioGrid, projects, scrollCalls, successState, window };
}

function capture(analytics) {
  const records = [];
  analytics.setOfflineSink((record) => records.push(record));
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

test('page identity is allowlisted and initialization records one view per document', () => {
  const app = load();
  const records = capture(app.window.FirstLineAnalytics);
  const pageDocument = {};
  assert.equal(app.window.FirstLineAnalytics.initializeDocument(pageDocument, '/pricing.html'), true);
  assert.equal(app.window.FirstLineAnalytics.initializeDocument(pageDocument, '/pricing.html'), false);
  assert.equal(app.window.FirstLineAnalytics.initializeDocument({}, '/unapproved.html'), false);
  assert.deepEqual(plain(records), [{ schema_version: 1, name: 'page_view', params: { page: 'pricing' } }]);
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
    { schema_version: 1, name: 'contact_cta_click', params: { placement: 'hero' } },
    { schema_version: 1, name: 'contact_cta_click', params: { placement: 'sales' } },
    { schema_version: 1, name: 'contact_cta_click', params: { placement: 'final' } },
    { schema_version: 1, name: 'portfolio_project_click', params: { project: 'bloom_infive' } },
    { schema_version: 1, name: 'portfolio_project_click', params: { project: 'ebanisteria_cad' } },
    { schema_version: 1, name: 'portfolio_project_click', params: { project: 'tripletas_la_union' } }
  ]);
});

for (const scenario of [
  { name: 'success', response: { ok: true, json: async () => ({ ok: true }) }, expected: ['inquiry_submit_attempt', 'inquiry_submit_success'], reset: 1 },
  { name: 'HTTP failure', response: { ok: false, json: async () => ({ ok: true, error: 'private server detail' }) }, expected: ['inquiry_submit_attempt', 'inquiry_submit_error:server'], reset: 0 },
  { name: 'result failure', response: { ok: true, json: async () => ({ ok: false, error: 'private response detail' }) }, expected: ['inquiry_submit_attempt', 'inquiry_submit_error:response'], reset: 0 },
  { name: 'malformed response', response: { ok: true, json: async () => { throw new Error('not JSON'); } }, expected: ['inquiry_submit_attempt', 'inquiry_submit_error:response'], reset: 0 },
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
