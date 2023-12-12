import { DEBUG } from '@glimmer/env';
import VERSION from 'ember/version';
import { ENV } from '@ember/-internals/environment';
import { libraries } from '@ember/-internals/metal';
import { getDebugFunction, setDebugFunction } from '@ember/debug';
import EmberRoute from '@ember/routing/route';
import Router from '@ember/routing/router';
import NoneLocation from '@ember/routing/none-location';
import { _loaded } from '@ember/application';
import Controller from '@ember/controller';
import EmberObject from '@ember/object';
import {
  moduleFor,
  ApplicationTestCase,
  AbstractTestCase,
  AutobootApplicationTestCase,
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
      return Object.assign(super.applicationOptions, {
        rootElement: '#one',
        router: null,
        autoboot: true,
      });
    }

    createSecondApplication(options) {
      let myOptions = Object.assign(this.applicationOptions, options);
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
      verifyRegistration(assert, application, 'route:basic');
      verifyRegistration(assert, application, 'event_dispatcher:main');

      verifyRegistration(assert, application, 'location:hash');
      verifyRegistration(assert, application, 'location:history');
      verifyRegistration(assert, application, 'location:none');

      verifyRegistration(assert, application, 'component:link-to');

      verifyRegistration(assert, application, 'component:textarea');

      verifyRegistration(assert, application, 'service:-routing');

      // DEBUGGING
      verifyRegistration(assert, application, 'resolver-for-debugging:main');
      verifyRegistration(assert, application, 'container-debug-adapter:main');
      verifyRegistration(assert, application, 'component-lookup:main');

      verifyRegistration(assert, application, 'view:-outlet');
      verifyRegistration(assert, application, 'renderer:-dom');
      verifyRegistration(assert, application, 'template:-outlet');

      assert.deepEqual(
        application.registeredOptionsForType('helper'),
        { instantiate: false },
        `optionsForType 'helper'`
      );
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
        this.addTemplate('application', '<h1>{{this.greeting}}</h1>');
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

      setDebugFunction('debug', (message) => messages.push(message));

      libraries.register('my-lib', '2.0.0a');

      runTask(() => this.createApplication());

      assert.equal(messages[1], 'Ember  : ' + VERSION);
      assert.equal(messages[2], 'my-lib : ' + '2.0.0a');

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
        Resolver: { create: function () {} },
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
