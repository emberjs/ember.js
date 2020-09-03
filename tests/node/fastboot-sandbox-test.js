const fs = require('fs');
const vm = require('vm');
const SimpleDOM = require('simple-dom');
const { emberPath, loadEmber, clearEmber } = require('./helpers/load-ember');

// This is based on what fastboot-server does
let HTMLSerializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);

async function fastbootVisit(context, url) {
  let doc = new SimpleDOM.Document();
  let rootElement = doc.body;
  let options = { isBrowser: false, document: doc, rootElement: rootElement };

  let { app } = context;

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

// essentially doing the same as what is done in FastBoot 3.1.0
// https://github.com/ember-fastboot/fastboot/blob/v3.1.0/src/sandbox.js
function buildSandboxContext(precompile) {
  let URL = require('url');

  let sandbox = {
    console,
    setTimeout,
    clearTimeout,
    URL,

    // Convince jQuery not to assume it's in a browser
    module: { exports: {} },
  };

  // Set the global as `window`
  sandbox.window = sandbox;
  sandbox.window.self = sandbox;

  let context = vm.createContext(sandbox);

  let environmentSetupScript = new vm.Script(
    `
var EmberENV = {
  _TEMPLATE_ONLY_GLIMMER_COMPONENTS: true,
  _APPLICATION_TEMPLATE_WRAPPER: false,
  _DEFAULT_ASYNC_OBSERVERS: true,
  _JQUERY_INTEGRATION: false,
};`,
    { filename: 'prepend.js' }
  );
  environmentSetupScript.runInContext(context);

  let emberSource = fs.readFileSync(emberPath, { encoding: 'utf-8' });
  let emberScript = new vm.Script(emberSource, { filename: emberPath });
  emberScript.runInContext(context);

  let applicationSource = `
class Router extends Ember.Router {}
Router.map(function() {
  this.route('a');
  this.route('b');
});

const registry = {
  'router:main': Router,
  'template:application': ${precompile('<h1>Hello world!</h1>\n{{outlet}}')}
};

class Resolver extends Ember.Object {
  resolve(specifier) {
    return registry[specifier];
  }
}

var app = Ember.Application.extend().create({
  autoboot: false,
  Resolver,
});
`;
  let appScript = new vm.Script(applicationSource, { filename: 'app.js' });
  appScript.runInContext(context);

  return context;
}

QUnit.module('Ember.Application - visit() Integration Tests', function(hooks) {
  hooks.beforeEach(function() {
    let { precompile } = loadEmber();
    this.context = buildSandboxContext(precompile);
  });

  hooks.afterEach(function() {
    clearEmber();
  });

  QUnit.test('FastBoot: basic', async function(assert) {
    let result = await fastbootVisit(this.context, '/');

    assert.equal(result.url, '/', 'landed on correct url');
    assert.equal(
      result.body,
      '<body><h1>Hello world!</h1>\n<!----></body>',
      'results in expected HTML'
    );
  });
});
