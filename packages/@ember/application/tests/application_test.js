import { DEBUG } from '@glimmer/env';
import VERSION from 'ember/version';
import { ENV, context } from '@ember/-internals/environment';
import { libraries } from '@ember/-internals/metal';
import { getDebugFunction, setDebugFunction } from '@ember/debug';
import { Router, NoneLocation, Route as EmberRoute } from '@ember/-internals/routing';
import { jQueryDisabled, jQuery } from '@ember/-internals/views';
import { _loaded } from '@ember/application';
import Controller from '@ember/controller';
import { Object as EmberObject } from '@ember/-internals/runtime';
import { setTemplates } from '@ember/-internals/glimmer';
import { privatize as P } from '@ember/-internals/container';
import { assign } from '@ember/polyfills';
import {
  moduleFor,
  ApplicationTestCase,
  AbstractTestCase,
  AutobootApplicationTestCase,
  DefaultResolverApplicationTestCase,
  verifyInjection,
  verifyRegistration,
  runTask,
} from 'internal-test-helpers';
import { run } from '@ember/runloop';
import Application from '..';

moduleFor(
  'Application, autobooting multiple apps',
  class extends ApplicationTestCase {
    get fixture() {
      return `
      <div id="one">
        <div id="one-child">HI</div>
      </div>
      <div id="two">HI</div>
    `;
    }

    get applicationOptions() {
      return assign(super.applicationOptions, {
        rootElement: '#one',
        router: null,
        autoboot: true,
      });
    }

    createSecondApplication(options) {
      let myOptions = assign(this.applicationOptions, options);
      return (this.secondApp = Application.create(myOptions));
    }

    teardown() {
      super.teardown();

      if (this.secondApp) {
        runTask(() => this.secondApp.destroy());
      }
    }

    [`@test you can make a new application in a non-overlapping element`](assert) {
      let app = runTask(() =>
        this.createSecondApplication({
          rootElement: '#two',
        })
      );

      runTask(() => app.destroy());
      assert.ok(true, 'should not raise');
    }

    [`@test you cannot make a new application that is a parent of an existing application`]() {
      expectAssertion(() => {
        runTask(() =>
          this.createSecondApplication({
            rootElement: this.applicationOptions.rootElement,
          })
        );
      });
    }

    [`@test you cannot make a new application that is a descendant of an existing application`]() {
      expectAssertion(() => {
        runTask(() =>
          this.createSecondApplication({
            rootElement: '#one-child',
          })
        );
      });
    }

    [`@test you cannot make a new application that is a duplicate of an existing application`]() {
      expectAssertion(() => {
        runTask(() =>
          this.createSecondApplication({
            rootElement: '#one',
          })
        );
      });
    }

    [`@test you cannot make two default applications without a rootElement error`]() {
      expectAssertion(() => {
        runTask(() => this.createSecondApplication());
      });
    }
  }
);

moduleFor(
  'Application',
  class extends ApplicationTestCase {
    [`@test builds a registry`](assert) {
      let { application } = this;
      assert.strictEqual(
        application.resolveRegistration('application:main'),
        application,
        `application:main is registered`
      );
      assert.deepEqual(
        application.registeredOptionsForType('component'),
        { singleton: false },
        `optionsForType 'component'`
      );
      assert.deepEqual(
        application.registeredOptionsForType('view'),
        { singleton: false },
        `optionsForType 'view'`
      );

      verifyRegistration(assert, application, 'controller:basic');
      verifyRegistration(assert, application, '-view-registry:main');
      verifyInjection(assert, application, 'view', '_viewRegistry', '-view-registry:main');
      verifyInjection(assert, application, 'route', '_topLevelViewTemplate', 'template:-outlet');
      verifyRegistration(assert, application, 'route:basic');
      verifyRegistration(assert, application, 'event_dispatcher:main');
      verifyInjection(assert, application, 'router:main', 'namespace', 'application:main');
      verifyInjection(assert, application, 'view:-outlet', 'namespace', 'application:main');

      verifyRegistration(assert, application, 'location:auto');
      verifyRegistration(assert, application, 'location:hash');
      verifyRegistration(assert, application, 'location:history');
      verifyRegistration(assert, application, 'location:none');

      verifyInjection(assert, application, 'controller', 'target', 'router:main');
      verifyInjection(assert, application, 'controller', 'namespace', 'application:main');

      verifyRegistration(assert, application, P`-bucket-cache:main`);
      verifyInjection(assert, application, 'router', '_bucketCache', P`-bucket-cache:main`);
      verifyInjection(assert, application, 'route', '_bucketCache', P`-bucket-cache:main`);

      verifyInjection(assert, application, 'route', '_router', 'router:main');

      verifyRegistration(assert, application, 'component:-text-field');
      verifyRegistration(assert, application, 'component:-checkbox');
      verifyRegistration(assert, application, 'component:link-to');

      verifyRegistration(assert, application, 'component:textarea');

      verifyRegistration(assert, application, 'service:-routing');
      verifyInjection(assert, application, 'service:-routing', 'router', 'router:main');

      // DEBUGGING
      verifyRegistration(assert, application, 'resolver-for-debugging:main');
      verifyInjection(
        assert,
        application,
        'container-debug-adapter:main',
        'resolver',
        'resolver-for-debugging:main'
      );
      verifyInjection(
        assert,
        application,
        'data-adapter:main',
        'containerDebugAdapter',
        'container-debug-adapter:main'
      );
      verifyRegistration(assert, application, 'container-debug-adapter:main');
      verifyRegistration(assert, application, 'component-lookup:main');

      verifyRegistration(assert, application, 'service:-glimmer-environment');
      // verifyRegistration(assert, application, 'service:-dom-changes');
      // verifyRegistration(assert, application, 'service:-dom-tree-construction');
      // verifyInjection(
      //   assert,
      //   application,
      //   'service:-glimmer-environment',
      //   'appendOperations',
      //   'service:-dom-tree-construction'
      // );
      // verifyInjection(
      //   assert,
      //   application,
      //   'service:-glimmer-environment',
      //   'updateOperations',
      //   'service:-dom-changes'
      // );
      verifyInjection(assert, application, 'renderer', 'env', 'service:-glimmer-environment');
      verifyRegistration(assert, application, 'view:-outlet');
      verifyRegistration(assert, application, 'renderer:-dom');
      verifyRegistration(assert, application, 'renderer:-inert');
      verifyRegistration(assert, application, P`template:components/-default`);
      verifyRegistration(assert, application, 'template:-outlet');
      verifyInjection(assert, application, 'view:-outlet', 'template', 'template:-outlet');

      assert.deepEqual(
        application.registeredOptionsForType('helper'),
        { instantiate: false },
        `optionsForType 'helper'`
      );
    }
  }
);

moduleFor(
  'Application, default resolver with autoboot',
  class extends DefaultResolverApplicationTestCase {
    constructor() {
      super(...arguments);
      this.originalLookup = context.lookup;
    }

    teardown() {
      context.lookup = this.originalLookup;
      super.teardown();
      setTemplates({});
    }

    get applicationOptions() {
      return assign(super.applicationOptions, {
        autoboot: true,
      });
    }

    [`@test acts like a namespace`](assert) {
      this.application = runTask(() => this.createApplication());
      let Foo = (this.application.Foo = EmberObject.extend());
      assert.equal(Foo.toString(), 'TestApp.Foo', 'Classes pick up their parent namespace');
    }

    [`@test can specify custom router`](assert) {
      let MyRouter = Router.extend();
      runTask(() => {
        this.createApplication();
        this.application.Router = MyRouter;
      });

      assert.ok(
        this.application.__deprecatedInstance__.lookup('router:main') instanceof MyRouter,
        'application resolved the correct router'
      );
    }

    [`@test Minimal Application initialized with just an application template`]() {
      this.setupFixture('<script type="text/x-handlebars">Hello World</script>');
      runTask(() => this.createApplication());
      this.assertInnerHTML('Hello World');
    }
  }
);

moduleFor(
  'Application, autobooting',
  class extends AutobootApplicationTestCase {
    constructor() {
      super(...arguments);
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

    [`@test initialized application goes to initial route`]() {
      runTask(() => {
        this.createApplication();
        this.addTemplate('application', '{{outlet}}');
        this.addTemplate('index', '<h1>Hi from index</h1>');
      });

      this.assertText('Hi from index');
    }

    [`@test ready hook is called before routing begins`](assert) {
      assert.expect(2);

      runTask(() => {
        function registerRoute(application, name, callback) {
          let route = EmberRoute.extend({
            activate: callback,
          });

          application.register('route:' + name, route);
        }

        let MyApplication = Application.extend({
          ready() {
            registerRoute(this, 'index', () => {
              assert.ok(true, 'last-minute route is activated');
            });
          },
        });

        let app = this.createApplication({}, MyApplication);

        registerRoute(app, 'application', () => assert.ok(true, 'normal route is activated'));
      });
    }

    [`@test initialize application via initialize call`](assert) {
      runTask(() => this.createApplication());
      // This is not a public way to access the container; we just
      // need to make some assertions about the created router
      let router = this.applicationInstance.lookup('router:main');
      assert.equal(router instanceof Router, true, 'Router was set from initialize call');
      assert.equal(
        router.location instanceof NoneLocation,
        true,
        'Location was set from location implementation name'
      );
    }

    [`@test initialize application with stateManager via initialize call from Router class`](
      assert
    ) {
      runTask(() => {
        this.createApplication();
        this.addTemplate('application', '<h1>Hello!</h1>');
      });
      // This is not a public way to access the container; we just
      // need to make some assertions about the created router
      let router = this.application.__deprecatedInstance__.lookup('router:main');
      assert.equal(router instanceof Router, true, 'Router was set from initialize call');
      this.assertText('Hello!');
    }

    [`@test Application Controller backs the appplication template`]() {
      runTask(() => {
        this.createApplication();
        this.addTemplate('application', '<h1>{{greeting}}</h1>');
        this.add(
          'controller:application',
          Controller.extend({
            greeting: 'Hello!',
          })
        );
      });
      this.assertText('Hello!');
    }

    [`@test enable log of libraries with an ENV var`](assert) {
      if (!DEBUG) {
        assert.ok(true, 'Logging does not occur in production builds');
        return;
      }

      let messages = [];

      ENV.LOG_VERSION = true;

      setDebugFunction('debug', message => messages.push(message));

      libraries.register('my-lib', '2.0.0a');

      runTask(() => this.createApplication());

      assert.equal(messages[1], 'Ember  : ' + VERSION);
      if (jQueryDisabled) {
        assert.equal(messages[2], 'my-lib : ' + '2.0.0a');
      } else {
        assert.equal(messages[2], 'jQuery : ' + jQuery().jquery);
        assert.equal(messages[3], 'my-lib : ' + '2.0.0a');
      }

      libraries.deRegister('my-lib');
    }

    [`@test disable log of version of libraries with an ENV var`](assert) {
      let logged = false;

      ENV.LOG_VERSION = false;

      setDebugFunction('debug', () => (logged = true));

      runTask(() => this.createApplication());

      assert.ok(!logged, 'library version logging skipped');
    }

    [`@test can resolve custom router`](assert) {
      let CustomRouter = Router.extend();

      runTask(() => {
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
      runTask(() => this.createApplication());
      assert.equal(_loaded.application, this.application);
      runTask(() => this.application.destroy());
      assert.equal(_loaded.application, undefined);
    }

    [`@test can build a registry via Application.buildRegistry() --- simulates ember-test-helpers`](
      assert
    ) {
      let namespace = EmberObject.create({
        Resolver: { create: function() {} },
      });

      let registry = Application.buildRegistry(namespace);

      assert.equal(registry.resolve('application:main'), namespace);
    }
  }
);

moduleFor(
  'Application#buildRegistry',
  class extends AbstractTestCase {
    [`@test can build a registry via Application.buildRegistry() --- simulates ember-test-helpers`](
      assert
    ) {
      let namespace = EmberObject.create({
        Resolver: { create() {} },
      });

      let registry = Application.buildRegistry(namespace);

      assert.equal(registry.resolve('application:main'), namespace);
    }
  }
);

moduleFor(
  'Application - instance tracking',
  class extends ApplicationTestCase {
    ['@test tracks built instance'](assert) {
      let instance = this.application.buildInstance();
      run(() => {
        this.application.destroy();
      });

      assert.ok(instance.isDestroyed, 'instance was destroyed');
    }

    ['@test tracks built instances'](assert) {
      let instanceA = this.application.buildInstance();
      let instanceB = this.application.buildInstance();
      run(() => {
        this.application.destroy();
      });

      assert.ok(instanceA.isDestroyed, 'instanceA was destroyed');
      assert.ok(instanceB.isDestroyed, 'instanceB was destroyed');
    }
  }
);
