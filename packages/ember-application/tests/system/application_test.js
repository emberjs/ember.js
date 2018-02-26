/*globals EmberDev */
import { VERSION } from 'ember';
import { ENV, context } from 'ember-environment';
import { libraries } from 'ember-metal';
import {
  getDebugFunction,
  setDebugFunction
} from 'ember-debug';
import Application from '../../system/application';
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
import { setTemplates } from 'ember-glimmer';
import { privatize as P } from 'container';
import {
  verifyInjection,
  verifyRegistration
} from '../test-helpers/registry-check';
import { assign } from 'ember-utils';
import {
  moduleFor,
  ApplicationTestCase,
  AbstractTestCase,
  AutobootApplicationTestCase,
  DefaultResolverApplicationTestCase
} from 'internal-test-helpers';

let secondApp;

moduleFor('Ember.Application, autobooting multiple apps', class extends ApplicationTestCase {
  constructor() {
    jQuery('#qunit-fixture').html(`
      <div id="one">
        <div id="one-child">HI</div>
      </div>
      <div id="two">HI</div>
    `);
    super();
  }

  get applicationOptions() {
    return assign(super.applicationOptions, {
      rootElement: '#one',
      router: null,
      autoboot: true
    });
  }

  createSecondApplication(options) {
    let myOptions = assign(this.applicationOptions, options);
    return this.secondApp = Application.create(myOptions);
  }

  teardown() {
    super.teardown();

    if (this.secondApp) {
      this.runTask(() => this.secondApp.destroy());
    }
  }

  [`@test you can make a new application in a non-overlapping element`](assert) {
    let app = this.runTask(() => this.createSecondApplication({
      rootElement: '#two'
    }));

    this.runTask(() => app.destroy());
    assert.ok(true, 'should not raise');
  }

  [`@test you cannot make a new application that is a parent of an existing application`]() {
    expectAssertion(() => {
      this.runTask(() => this.createSecondApplication({
        rootElement: this.applicationOptions.rootElement
      }));
    });
  }

  [`@test you cannot make a new application that is a descendant of an existing application`]() {
    expectAssertion(() => {
      this.runTask(() => this.createSecondApplication({
        rootElement: '#one-child'
      }));
    });
  }

  [`@test you cannot make a new application that is a duplicate of an existing application`]() {
    expectAssertion(() => {
      this.runTask(() => this.createSecondApplication({
        rootElement: '#one'
      }));
    });
  }

  [`@test you cannot make two default applications without a rootElement error`]() {
    expectAssertion(() => {
      this.runTask(() => this.createSecondApplication());
    });
  }
});

moduleFor('Ember.Application', class extends ApplicationTestCase {

  ['@test includes deprecated access to `application.registry`'](assert) {
    assert.expect(3);

    assert.ok(typeof this.application.registry.register === 'function', '#registry.register is available as a function');

    this.application.__registry__.register = function() {
      assert.ok(true, '#register alias is called correctly');
    };

    expectDeprecation(() => {
      this.application.registry.register();
    }, /Using `Application.registry.register` is deprecated. Please use `Application.register` instead./);
  }

  [`@test builds a registry`](assert) {
    let {application} = this;
    assert.strictEqual(application.resolveRegistration('application:main'), application, `application:main is registered`);
    assert.deepEqual(application.registeredOptionsForType('component'), { singleton: false }, `optionsForType 'component'`);
    assert.deepEqual(application.registeredOptionsForType('view'), { singleton: false }, `optionsForType 'view'`);
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
    assert.deepEqual(application.registeredOptionsForType('helper'), { instantiate: false }, `optionsForType 'helper'`);
  }

});

moduleFor('Ember.Application, default resolver with autoboot', class extends DefaultResolverApplicationTestCase {

  constructor() {
    super();
    this.originalLookup = context.lookup;
  }

  teardown() {
    context.lookup = this.originalLookup;
    super.teardown();
    setTemplates({});
  }

  get applicationOptions() {
    return assign(super.applicationOptions, {
      autoboot: true
    });
  }

  [`@test acts like a namespace`](assert) {
    let lookup = context.lookup = {};

    lookup.TestApp = this.runTask(() => this.createApplication());

    setNamespaceSearchDisabled(false);
    let Foo = this.application.Foo = EmberObject.extend();
    assert.equal(Foo.toString(), 'TestApp.Foo', 'Classes pick up their parent namespace');
  }

  [`@test can specify custom router`](assert) {
    let MyRouter = Router.extend();
    this.runTask(() => {
      this.createApplication()
      this.application.Router = MyRouter;
    });

    assert.ok(
      this.application.__deprecatedInstance__.lookup('router:main') instanceof MyRouter,
      'application resolved the correct router'
    );
  }

  [`@test Minimal Application initialized with just an application template`](assert) {
    this.$().html('<script type="text/x-handlebars">Hello World</script>');
    this.runTask(() => this.createApplication());

    assert.equal(this.$().text().trim(), 'Hello World');
  }

});

moduleFor('Ember.Application, autobooting', class extends AutobootApplicationTestCase {

  constructor() {
    super();
    this.originalLogVersion = ENV.LOG_VERSION;
    this.originalDebug = getDebugFunction('debug');
    this.originalWarn = getDebugFunction('warn');
  }

  teardown() {
    setDebugFunction('warn', this.originalWarn);
    setDebugFunction('debug', this.originalDebug);
    ENV.LOG_VERSION = this.originalLogVersion;
    super.teardown();
  }

  [`@test initialized application goes to initial route`](assert) {
    this.runTask(() => {
      this.createApplication();
      this.addTemplate('application', '{{outlet}}');
      this.addTemplate('index', '<h1>Hi from index</h1>');
    });

    assert.equal(this.$('h1').text(), 'Hi from index');
  }

  [`@test ready hook is called before routing begins`](assert) {
    assert.expect(2);

    this.runTask(() => {
      function registerRoute(application, name, callback) {
        let route = EmberRoute.extend({
          activate: callback
        });

        application.register('route:' + name, route);
      }

      let MyApplication = Application.extend({
        ready() {
          registerRoute(this, 'index', () => {
            assert.ok(true, 'last-minute route is activated');
          });
        }
      });

      let app = this.createApplication({}, MyApplication);

      registerRoute(app, 'application', () => ok(true, 'normal route is activated'));
    });
  }

  [`@test initialize application via initialize call`](assert) {
    this.runTask(() => this.createApplication());
    // This is not a public way to access the container; we just
    // need to make some assertions about the created router
    let router = this.applicationInstance.lookup('router:main');
    assert.equal(router instanceof Router, true, 'Router was set from initialize call');
    assert.equal(router.location instanceof NoneLocation, true, 'Location was set from location implementation name');
  }

  [`@test initialize application with stateManager via initialize call from Router class`](assert) {
    this.runTask(() => {
      this.createApplication();
      this.addTemplate('application', '<h1>Hello!</h1>');
    });
    // This is not a public way to access the container; we just
    // need to make some assertions about the created router
    let router = this.application.__deprecatedInstance__.lookup('router:main');
    assert.equal(router instanceof Router, true, 'Router was set from initialize call');
    assert.equal(this.$('h1').text(), 'Hello!');
  }

  [`@test Application Controller backs the appplication template`](assert) {
    this.runTask(() => {
      this.createApplication();
      this.addTemplate('application', '<h1>{{greeting}}</h1>');
      this.add('controller:application', Controller.extend({
        greeting: 'Hello!'
      }));
    });
    assert.equal(this.$('h1').text(), 'Hello!');
  }

  [`@test enable log of libraries with an ENV var`](assert) {
    if (EmberDev && EmberDev.runningProdBuild) {
      assert.ok(true, 'Logging does not occur in production builds');
      return;
    }

    let messages = [];

    ENV.LOG_VERSION = true;

    setDebugFunction('debug', message => messages.push(message));

    libraries.register('my-lib', '2.0.0a');

    this.runTask(() => this.createApplication());

    assert.equal(messages[1], 'Ember  : ' + VERSION);
    assert.equal(messages[2], 'jQuery : ' + jQuery().jquery);
    assert.equal(messages[3], 'my-lib : ' + '2.0.0a');

    libraries.deRegister('my-lib');
  }

  [`@test disable log of version of libraries with an ENV var`](assert) {
    let logged = false;

    ENV.LOG_VERSION = false;

    setDebugFunction('debug', () => logged = true);

    this.runTask(() => this.createApplication());

    assert.ok(!logged, 'library version logging skipped');
  }

  [`@test can resolve custom router`](assert) {
    let CustomRouter = Router.extend();

    this.runTask(() => {
      this.createApplication();
      this.add('router:main', CustomRouter);
    });

    assert.ok(
      this.application.__deprecatedInstance__.lookup('router:main') instanceof CustomRouter,
      'application resolved the correct router'
    );
  }

  [`@test does not leak itself in onLoad._loaded`](assert) {
    assert.equal(_loaded.application, undefined);
    this.runTask(() => this.createApplication());
    assert.equal(_loaded.application, this.application);
    this.runTask(() => this.application.destroy());
    assert.equal(_loaded.application, undefined);
  }

  [`@test can build a registry via Ember.Application.buildRegistry() --- simulates ember-test-helpers`](assert) {
    let namespace = EmberObject.create({
      Resolver: { create: function() { } }
    });

    let registry = Application.buildRegistry(namespace);

    assert.equal(registry.resolve('application:main'), namespace);
  }

});

moduleFor('Ember.Application#buildRegistry', class extends AbstractTestCase {

  [`@test can build a registry via Ember.Application.buildRegistry() --- simulates ember-test-helpers`](assert) {
    let namespace = EmberObject.create({
      Resolver: { create() { } }
    });

    let registry = Application.buildRegistry(namespace);

    assert.equal(registry.resolve('application:main'), namespace);
  }

});
