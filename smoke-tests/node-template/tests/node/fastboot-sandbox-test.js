import SimpleDOM from 'simple-dom';
import Application from 'ember-source/@ember/application/index.js';
import EmberRouter from 'ember-source/@ember/routing/router.js';
import { run } from 'ember-source/@ember/runloop/index.js';
import { precompile } from 'ember-source/ember-template-compiler/index.js';
import { createTemplateFactory } from 'ember-source/@ember/template-factory/index.js';

function compile(templateString, options) {
  let templateSpec = precompile(templateString, options);
  return createTemplateFactory(JSON.parse(templateSpec));
}

// This is based on what fastboot-server does
let HTMLSerializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);

async function fastbootVisit(app, url) {
  let doc = new SimpleDOM.Document();
  let rootElement = doc.body;
  let options = { isBrowser: false, document: doc, rootElement: rootElement };

  await app.boot();

  let instance = await app.buildInstance();

  try {
    await instance.boot(options);
    await instance.visit(url, options);

    return {
      url: instance.getURL(),
      title: doc.title,
      body: HTMLSerializer.serialize(rootElement),
    };
  } finally {
    instance.destroy();
  }
}

QUnit.module('Ember.Application - visit() Integration Tests', function (hooks) {
  let app;

  hooks.afterEach(function () {
    if (app) {
      run(app, 'destroy');
      app = null;
    }
  });

  QUnit.test('FastBoot: basic', async function (assert) {
    let Router = class extends EmberRouter {};
    Router.map(function () {
      this.route('a');
      this.route('b');
    });

    let registry = {
      'router:main': Router,
      'template:application': compile('<h1>Hello world!</h1>\n{{outlet}}'),
    };

    app = class extends Application {}.create({
      autoboot: false,
      Resolver: {
        create: () => ({
          resolve(name) {
            return registry[name];
          },
        }),
      },
    });

    let result = await fastbootVisit(app, '/');

    assert.equal(result.url, '/', 'landed on correct url');
    assert.equal(
      result.body,
      '<body><h1>Hello world!</h1>\n<!----></body>',
      'results in expected HTML'
    );
  });
});
