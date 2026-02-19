/**
 * ESM port of tests/node/fastboot-sandbox-test.js
 *
 * The original test loaded Ember via vm.Script in a sandbox, simulating
 * FastBoot's execution model with the AMD bundle. In the ESM world,
 * we test that Ember can be dynamically imported and used to boot an app
 * with SimpleDOM, which is the ESM equivalent of the FastBoot sandbox pattern.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import SimpleDOM from 'simple-dom';
import Application from 'ember-source/@ember/application/index.js';
import EmberObject from 'ember-source/@ember/object/index.js';
import EmberRouter from 'ember-source/@ember/routing/router.js';
import { run } from 'ember-source/@ember/runloop/index.js';
import { precompile } from 'ember-source/ember-template-compiler/index.js';
import { createTemplateFactory } from 'ember-source/@ember/template-factory/index.js';

const HTMLSerializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);

function compile(templateString, options) {
  let templateSpec = precompile(templateString, options);
  return createTemplateFactory(JSON.parse(templateSpec));
}

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

describe('FastBoot sandbox ESM equivalent', () => {
  test('FastBoot: basic', async () => {
    let Router = class extends EmberRouter {};
    Router.map(function () {
      this.route('a');
      this.route('b');
    });

    let registry = {
      'router:main': Router,
      'template:application': compile('<h1>Hello world!</h1>\n{{outlet}}'),
    };

    class Resolver extends EmberObject {
      resolve(specifier) {
        return registry[specifier];
      }
    }

    let app = class extends Application {}.create({
      autoboot: false,
      Resolver,
    });

    let result = await fastbootVisit(app, '/');

    assert.equal(result.url, '/', 'landed on correct url');
    assert.equal(
      result.body,
      '<body><h1>Hello world!</h1>\n<!----></body>',
      'results in expected HTML'
    );

    run(app, 'destroy');
  });
});
