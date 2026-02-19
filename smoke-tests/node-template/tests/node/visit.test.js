import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import SimpleDOM from 'simple-dom';
import { createAppContext } from './helpers/setup-app.js';

function assertHTMLMatches(actualHTML, expectedHTML) {
  assert.ok(actualHTML.match(expectedHTML), actualHTML + ' matches ' + expectedHTML);
}

let HTMLSerializer;

// This is based on what fastboot-server does
function fastbootVisit(App, url) {
  if (!HTMLSerializer) {
    HTMLSerializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);
  }
  let doc = new SimpleDOM.Document();
  let rootElement = doc.body;
  let options = { isBrowser: false, document: doc, rootElement: rootElement };

  return App.visit(url, options).then(function (instance) {
    try {
      return {
        url: instance.getURL(),
        title: doc.title,
        body: HTMLSerializer.serialize(rootElement),
      };
    } finally {
      instance.destroy();
    }
  });
}

function assertFastbootResult(expected) {
  return function (actual) {
    assert.equal(actual.url, expected.url);
    assertHTMLMatches(actual.body, expected.body);
  };
}

describe('Ember.Application - visit() Integration Tests', () => {
  let ctx;

  beforeEach(async () => {
    ctx = await createAppContext();
  });

  afterEach(() => {
    ctx.destroy();
  });

  test('FastBoot: basic', async () => {
    ctx.routes(function () {
      this.route('a');
      this.route('b');
    });

    ctx.template('application', '<h1>Hello world</h1>\n{{outlet}}');
    ctx.template('a', '<h2>Welcome to {{x-foo page="A"}}</h2>');
    ctx.template('b', '<h2>{{x-foo page="B"}}</h2>');

    let initCalled = false;
    let didInsertElementCalled = false;

    ctx.component(
      'x-foo',
      {
        tagName: 'span',
        init: function () {
          this._super();
          initCalled = true;
        },
        didInsertElement: function () {
          didInsertElementCalled = true;
        },
      },
      'Page {{this.page}}'
    );

    let App = ctx.createApplication();

    const [resultA, resultB] = await Promise.all([
      fastbootVisit(App, '/a'),
      fastbootVisit(App, '/b'),
    ]);

    assertFastbootResult({
      url: '/a',
      body: '<h1>Hello world</h1>\n<h2>Welcome to <span id=".+" class="ember-view">Page A</span></h2>',
    })(resultA);

    assertFastbootResult({
      url: '/b',
      body: '<h1>Hello world</h1>\n<h2><span id=".+" class="ember-view">Page B</span></h2>',
    })(resultB);

    assert.ok(initCalled, 'Component#init should be called');
    assert.ok(!didInsertElementCalled, 'Component#didInsertElement should not be called');
  });

  test('FastBoot: redirect', async () => {
    ctx.routes(function () {
      this.route('a');
      this.route('b');
      this.route('c');
    });

    ctx.template('a', '<h1>Hello from A</h1>');
    ctx.template('b', '<h1>Hello from B</h1>');
    ctx.template('c', '<h1>Hello from C</h1>');

    ctx.route('a', {
      beforeModel: function () {
        this.router.replaceWith('b');
      },
    });

    ctx.route('b', {
      afterModel: function () {
        this.router.transitionTo('c');
      },
    });

    let App = ctx.createApplication();

    const [resultA, resultB] = await Promise.all([
      fastbootVisit(App, '/a'),
      fastbootVisit(App, '/b'),
    ]);

    assertFastbootResult({
      url: '/c',
      body: '<h1>Hello from C</h1>',
    })(resultA);

    assertFastbootResult({
      url: '/c',
      body: '<h1>Hello from C</h1>',
    })(resultB);
  });

  test('FastBoot: attributes are sanitized', async () => {
    ctx.template('application', '<a href={{this.test}}></a>');

    ctx.controller('application', {
      test: 'javascript:alert("hello")',
    });

    let App = ctx.createApplication();

    const result = await fastbootVisit(App, '/');
    assertFastbootResult({
      url: '/',
      body: '<a href="unsafe:javascript:alert\\(&quot;hello&quot;\\)"></a>',
    })(result);
  });

  test('FastBoot: route error', async () => {
    ctx.routes(function () {
      this.route('a');
      this.route('b');
    });

    ctx.template('a', '<h1>Hello from A</h1>');
    ctx.template('b', '<h1>Hello from B</h1>');

    ctx.route('a', {
      beforeModel: function () {
        throw new Error('Error from A');
      },
    });

    ctx.route('b', {
      afterModel: function () {
        throw new Error('Error from B');
      },
    });

    let App = ctx.createApplication();

    // Route errors propagate as synchronous throws via backburner's queue flush,
    // so we need to catch them as either sync or async errors.
    try {
      await fastbootVisit(App, '/a');
      assert.ok(false, 'It should not render route a');
    } catch (error) {
      assert.equal(error.message, 'Error from A');
    }

    try {
      await fastbootVisit(App, '/b');
      assert.ok(false, 'It should not render route b');
    } catch (error) {
      assert.equal(error.message, 'Error from B');
    }
  });

  test('FastBoot: route error template', async () => {
    ctx.routes(function () {
      this.route('a');
    });

    ctx.template('error', '<p>Error template rendered!</p>');
    ctx.template('a', '<h1>Hello from A</h1>');

    ctx.route('a', {
      model: function () {
        throw new Error('Error from A');
      },
    });

    let App = ctx.createApplication();

    const result = await fastbootVisit(App, '/a');
    assertFastbootResult({
      url: '/a',
      body: '<p>Error template rendered!</p>',
    })(result);
  });

  test('Resource-discovery setup', async () => {
    class Network {
      constructor() {
        this.requests = [];
      }
      fetch(url) {
        this.requests.push(url);
        return Promise.resolve();
      }
    }

    ctx.routes(function () {
      this.route('a');
      this.route('b');
      this.route('c');
      this.route('d');
      this.route('e');
    });

    let network;

    ctx.route('a', {
      model: function () { return network.fetch('/a'); },
      afterModel: function () { this.router.replaceWith('b'); },
    });

    ctx.route('b', {
      model: function () { return network.fetch('/b'); },
      afterModel: function () { this.router.replaceWith('c'); },
    });

    ctx.route('c', {
      model: function () { return network.fetch('/c'); },
    });

    ctx.route('d', {
      model: function () { return network.fetch('/d'); },
      afterModel: function () { this.router.replaceWith('e'); },
    });

    ctx.route('e', {
      model: function () { return network.fetch('/e'); },
    });

    ctx.template('a', '{{x-foo}}');
    ctx.template('b', '{{x-foo}}');
    ctx.template('c', '{{x-foo}}');
    ctx.template('d', '{{x-foo}}');
    ctx.template('e', '{{x-foo}}');

    let xFooInstances = 0;

    ctx.component('x-foo', {
      init: function () {
        this._super();
        xFooInstances++;
      },
    });

    let App = ctx.createApplication();

    async function assertResources(url, resources) {
      network = new Network();

      let instance = await App.visit(url, { isBrowser: false, shouldRender: false });
      try {
        let viewRegistry = instance.lookup('-view-registry:main');
        assert.equal(Object.keys(viewRegistry).length, 0, 'did not create any views');
        assert.deepEqual(network.requests, resources);
      } finally {
        instance.destroy();
      }
    }

    await assertResources('/a', ['/a', '/b', '/c']);
    await assertResources('/b', ['/b', '/c']);
    await assertResources('/c', ['/c']);
    await assertResources('/d', ['/d', '/e']);
    await assertResources('/e', ['/e']);

    assert.equal(xFooInstances, 0, 'it should not create any x-foo components');
  });

  test('FastBoot: tagless components can render', async () => {
    ctx.template('application', "<div class='my-context'>{{my-component}}</div>");
    ctx.component('my-component', { tagName: '' }, '<h1>hello world</h1>');

    let App = ctx.createApplication();

    const result = await fastbootVisit(App, '/');
    assertFastbootResult({
      url: '/',
      body: /<div class="my-context"><h1>hello world<\/h1><\/div>/,
    })(result);
  });
});
