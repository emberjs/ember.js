/*globals EmberDev */
import { VERSION } from 'ember';
import { ENV, context } from 'ember-environment';
import {
  run,
  libraries,
  getDebugFunction,
  setDebugFunction
} from 'ember-metal';
import Application from '../../system/application';
import DefaultResolver from '../../system/resolver';
import {
  Router,
  NoneLocation,
  Route as EmberRoute
} from 'ember-routing';
import { jQuery } from 'ember-views';
import {
  Controller,
  Object as EmberObject,
  setNamespaceSearchDisabled,
  _loaded
} from 'ember-runtime';
import { compile } from 'ember-template-compiler';
import { setTemplates, setTemplate } from 'ember-glimmer';
import { privatize as P } from 'container';
import {
  verifyInjection,
  verifyRegistration
} from '../test-helpers/registry-check';

let { trim } = jQuery;

let app, application, originalLookup, originalDebug, originalWarn;

QUnit.module('Ember.Application', {
  setup() {
    originalLookup = context.lookup;
    originalDebug = getDebugFunction('debug');
    originalWarn = getDebugFunction('warn');

    jQuery('#qunit-fixture').html('<div id=\'one\'><div id=\'one-child\'>HI</div></div><div id=\'two\'>HI</div>');
    application = run(() => Application.create({ rootElement: '#one', router: null }));
  },

  teardown() {
    jQuery('#qunit-fixture').empty();
    setDebugFunction('debug', originalDebug);
    setDebugFunction('warn', originalWarn);

    context.lookup = originalLookup;

    if (application) {
      run(application, 'destroy');
    }

    if (app) {
      run(app, 'destroy');
    }
  }
});

QUnit.test('you can make a new application in a non-overlapping element', function() {
  app = run(() => Application.create({ rootElement: '#two', router: null }));

  run(app, 'destroy');
  ok(true, 'should not raise');
});

QUnit.test('you cannot make a new application that is a parent of an existing application', function() {
  expectAssertion(() => {
    run(() => Application.create({ rootElement: '#qunit-fixture' }));
  });
});

QUnit.test('you cannot make a new application that is a descendant of an existing application', function() {
  expectAssertion(() => {
    run(() => Application.create({ rootElement: '#one-child' }));
  });
});

QUnit.test('you cannot make a new application that is a duplicate of an existing application', function() {
  expectAssertion(() => {
    run(() => Application.create({ rootElement: '#one' }));
  });
});

QUnit.test('you cannot make two default applications without a rootElement error', function() {
  expectAssertion(() => {
    run(() => Application.create({ router: false }));
  });
});

QUnit.test('acts like a namespace', function() {
  let lookup = context.lookup = {};

  app = run(() => {
    return lookup.TestApp = Application.create({ rootElement: '#two', router: false });
  });

  setNamespaceSearchDisabled(false);
  app.Foo = EmberObject.extend();
  equal(app.Foo.toString(), 'TestApp.Foo', 'Classes pick up their parent namespace');
});

QUnit.test('includes deprecated access to `application.registry`', function() {
  expect(3);

  ok(typeof application.registry.register === 'function', '#registry.register is available as a function');

  application.__registry__.register = function() {
    ok(true, '#register alias is called correctly');
  };

  expectDeprecation(() => {
    application.registry.register();
  }, /Using `Application.registry.register` is deprecated. Please use `Application.register` instead./);
});

QUnit.test('builds a registry', function() {
  strictEqual(application.resolveRegistration('application:main'), application, `application:main is registered`);
  deepEqual(application.registeredOptionsForType('component'), { singleton: false }, `optionsForType 'component'`);
  deepEqual(application.registeredOptionsForType('view'), { singleton: false }, `optionsForType 'view'`);
  verifyRegistration(application, 'controller:basic');
  verifyRegistration(application, '-view-registry:main');
  verifyInjection(application, 'view', '_viewRegistry', '-view-registry:main');
  verifyInjection(application, 'route', '_topLevelViewTemplate', 'template:-outlet');
  verifyRegistration(application, 'route:basic');
  verifyRegistration(application, 'event_dispatcher:main');
  verifyInjection(application, 'router:main', 'namespace', 'application:main');
  verifyInjection(application, 'view:-outlet', 'namespace', 'application:main');

  verifyRegistration(application, 'location:auto');
  verifyRegistration(application, 'location:hash');
  verifyRegistration(application, 'location:history');
  verifyRegistration(application, 'location:none');

  verifyInjection(application, 'controller', 'target', 'router:main');
  verifyInjection(application, 'controller', 'namespace', 'application:main');

  verifyRegistration(application, P`-bucket-cache:main`);
  verifyInjection(application, 'router', '_bucketCache', P`-bucket-cache:main`);
  verifyInjection(application, 'route', '_bucketCache', P`-bucket-cache:main`);

  verifyInjection(application, 'route', 'router', 'router:main');

  verifyRegistration(application, 'component:-text-field');
  verifyRegistration(application, 'component:-text-area');
  verifyRegistration(application, 'component:-checkbox');
  verifyRegistration(application, 'component:link-to');

  verifyRegistration(application, 'service:-routing');
  verifyInjection(application, 'service:-routing', 'router', 'router:main');

  // DEBUGGING
  verifyRegistration(application, 'resolver-for-debugging:main');
  verifyInjection(application, 'container-debug-adapter:main', 'resolver', 'resolver-for-debugging:main');
  verifyInjection(application, 'data-adapter:main', 'containerDebugAdapter', 'container-debug-adapter:main');
  verifyRegistration(application, 'container-debug-adapter:main');
  verifyRegistration(application, 'component-lookup:main');

  verifyRegistration(application, 'service:-glimmer-environment');
  verifyRegistration(application, 'service:-dom-changes');
  verifyRegistration(application, 'service:-dom-tree-construction');
  verifyInjection(application, 'service:-glimmer-environment', 'appendOperations', 'service:-dom-tree-construction');
  verifyInjection(application, 'service:-glimmer-environment', 'updateOperations', 'service:-dom-changes');
  verifyInjection(application, 'renderer', 'env', 'service:-glimmer-environment');
  verifyRegistration(application, 'view:-outlet');
  verifyRegistration(application, 'renderer:-dom');
  verifyRegistration(application, 'renderer:-inert');
  verifyRegistration(application, P`template:components/-default`);
  verifyRegistration(application, 'template:-outlet');
  verifyInjection(application, 'view:-outlet', 'template', 'template:-outlet');
  verifyInjection(application, 'template', 'env', 'service:-glimmer-environment');
  deepEqual(application.registeredOptionsForType('helper'), { instantiate: false }, `optionsForType 'helper'`);
});

const originalLogVersion = ENV.LOG_VERSION;

QUnit.module('Ember.Application initialization', {
  teardown() {
    if (app) {
      run(app, 'destroy');
    }
    setTemplates({});
    ENV.LOG_VERSION = originalLogVersion;
  }
});

QUnit.test('initialized application goes to initial route', function() {
  run(() => {
    app = Application.create({
      rootElement: '#qunit-fixture'
    });

    app.Router.reopen({
      location: 'none'
    });

    app.register('template:application',
      compile('{{outlet}}')
    );

    setTemplate('index', compile(
      '<h1>Hi from index</h1>'
    ));
  });

  equal(jQuery('#qunit-fixture h1').text(), 'Hi from index');
});

QUnit.test('ready hook is called before routing begins', function() {
  expect(2);

  run(() => {
    function registerRoute(application, name, callback) {
      let route = EmberRoute.extend({
        activate: callback
      });

      application.register('route:' + name, route);
    }

    let MyApplication = Application.extend({
      ready() {
        registerRoute(this, 'index', () => {
          ok(true, 'last-minute route is activated');
        });
      }
    });

    app = MyApplication.create({
      rootElement: '#qunit-fixture'
    });

    app.Router.reopen({
      location: 'none'
    });

    registerRoute(app, 'application', () => ok(true, 'normal route is activated'));
  });
});

QUnit.test('initialize application via initialize call', function() {
  run(() => {
    app = Application.create({
      rootElement: '#qunit-fixture'
    });

    app.Router.reopen({
      location: 'none'
    });

    setTemplate('application', compile(
      '<h1>Hello!</h1>'
    ));
  });

  // This is not a public way to access the container; we just
  // need to make some assertions about the created router
  let router = app.__container__.lookup('router:main');
  equal(router instanceof Router, true, 'Router was set from initialize call');
  equal(router.location instanceof NoneLocation, true, 'Location was set from location implementation name');
});

QUnit.test('initialize application with stateManager via initialize call from Router class', function() {
  run(() => {
    app = Application.create({
      rootElement: '#qunit-fixture'
    });

    app.Router.reopen({
      location: 'none'
    });

    app.register('template:application', compile('<h1>Hello!</h1>'));
  });

  let router = app.__container__.lookup('router:main');
  equal(router instanceof Router, true, 'Router was set from initialize call');
  equal(jQuery('#qunit-fixture h1').text(), 'Hello!');
});

QUnit.test('ApplicationView is inserted into the page', function() {
  run(() => {
    app = Application.create({
      rootElement: '#qunit-fixture'
    });

    setTemplate('application', compile('<h1>Hello!</h1>'));

    app.ApplicationController = Controller.extend();

    app.Router.reopen({
      location: 'none'
    });
  });

  equal(jQuery('#qunit-fixture h1').text(), 'Hello!');
});

QUnit.test('Minimal Application initialized with just an application template', function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars">Hello World</script>');
  app = run(() => {
    return Application.create({
      rootElement: '#qunit-fixture'
    });
  });

  equal(trim(jQuery('#qunit-fixture').text()), 'Hello World');
});

QUnit.test('enable log of libraries with an ENV var', function() {
  if (EmberDev && EmberDev.runningProdBuild) {
    ok(true, 'Logging does not occur in production builds');
    return;
  }

  let messages = [];

  ENV.LOG_VERSION = true;

  setDebugFunction('debug', message => messages.push(message));

  libraries.register('my-lib', '2.0.0a');

  app = run(() => {
    return Application.create({
      rootElement: '#qunit-fixture'
    });
  });

  equal(messages[1], 'Ember  : ' + VERSION);
  equal(messages[2], 'jQuery : ' + jQuery().jquery);
  equal(messages[3], 'my-lib : ' + '2.0.0a');

  libraries.deRegister('my-lib');
});

QUnit.test('disable log version of libraries with an ENV var', function() {
  let logged = false;

  ENV.LOG_VERSION = false;

  setDebugFunction('debug', () => logged = true);

  jQuery('#qunit-fixture').empty();

  run(() => {
    app = Application.create({
      rootElement: '#qunit-fixture'
    });

    app.Router.reopen({
      location: 'none'
    });
  });

  ok(!logged, 'library version logging skipped');
});

QUnit.test('can resolve custom router', function() {
  let CustomRouter = Router.extend();

  let Resolver = DefaultResolver.extend({
    resolveMain(parsedName) {
      if (parsedName.type === 'router') {
        return CustomRouter;
      } else {
        return this._super(parsedName);
      }
    }
  });

  app = run(() => {
    return Application.create({
      Resolver
    });
  });

  ok(app.__container__.lookup('router:main') instanceof CustomRouter, 'application resolved the correct router');
});

QUnit.test('can specify custom router', function() {
  app = run(() => {
    return Application.create({
      Router: Router.extend()
    });
  });

  ok(app.__container__.lookup('router:main') instanceof Router, 'application resolved the correct router');
});

QUnit.test('does not leak itself in onLoad._loaded', function() {
  equal(_loaded.application, undefined);
  let app = run(Application, 'create');
  equal(_loaded.application, app);
  run(app, 'destroy');
  equal(_loaded.application, undefined);
});

QUnit.test('can build a registry via Ember.Application.buildRegistry() --- simulates ember-test-helpers', function(assert) {
  let namespace = EmberObject.create({
    Resolver: { create: function() { } }
  });

  let registry = Application.buildRegistry(namespace);

  assert.equal(registry.resolve('application:main'), namespace);
});
