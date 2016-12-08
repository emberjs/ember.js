import { run, get, set } from 'ember-metal';
import EmberApplication from '../../system/application';
import { Object as EmberObject, Controller } from 'ember-runtime';
import { Router } from 'ember-routing';
import { Registry } from 'container';

let application, Application;

QUnit.module('Ember.Application - resetting', {
  setup() {
    Application = EmberApplication.extend({
      name: 'App',
      rootElement: '#qunit-fixture'
    });
  },
  teardown() {
    Application = null;
    if (application) {
      run(application, 'destroy');
    }
  }
});

QUnit.test('Brings its own run-loop if not provided', function() {
  application = run(Application, 'create');
  application.ready = function() {
    QUnit.start();
    ok(true, 'app booted');
  };

  QUnit.stop();
  application.reset();
});

QUnit.test('Does not bring its own run loop if one is already provided', function() {
  expect(3);

  var didBecomeReady = false;

  application = run(Application, 'create');

  run(() => {
    application.ready = function() {
      didBecomeReady = true;
    };

    application.reset();

    application.deferReadiness();
    ok(!didBecomeReady, 'app is not ready');
  });

  ok(!didBecomeReady, 'app is not ready');
  run(application, 'advanceReadiness');
  ok(didBecomeReady, 'app is ready');
});

QUnit.test('When an application is reset, new instances of controllers are generated', function() {
  run(() => {
    application = Application.create();
    application.AcademicController = Controller.extend();
  });

  let firstController = application.__container__.lookup('controller:academic');
  let secondController = application.__container__.lookup('controller:academic');

  application.reset();

  let thirdController = application.__container__.lookup('controller:academic');

  strictEqual(firstController, secondController, 'controllers looked up in succession should be the same instance');

  ok(firstController.isDestroying, 'controllers are destroyed when their application is reset');

  notStrictEqual(firstController, thirdController, 'controllers looked up after the application is reset should not be the same instance');
});

QUnit.test('When an application is reset, the eventDispatcher is destroyed and recreated', function() {
  let eventDispatcherWasSetup, eventDispatcherWasDestroyed;

  eventDispatcherWasSetup = 0;
  eventDispatcherWasDestroyed = 0;

  let mock_event_dispatcher = {
    create() {
      return {
        setup() {
          eventDispatcherWasSetup++;
        },
        destroy() {
          eventDispatcherWasDestroyed++;
        }
      };
    }
  };

  // this is pretty awful. We should make this less Global-ly.
  let originalRegister = Registry.prototype.register;
  Registry.prototype.register = function(name, type, options) {
    if (name === 'event_dispatcher:main') {
      return mock_event_dispatcher;
    } else {
      return originalRegister.call(this, name, type, options);
    }
  };

  try {
    run(() => {
      application = Application.create();

      equal(eventDispatcherWasSetup, 0);
      equal(eventDispatcherWasDestroyed, 0);
    });

    equal(eventDispatcherWasSetup, 1);
    equal(eventDispatcherWasDestroyed, 0);

    application.reset();

    equal(eventDispatcherWasDestroyed, 1);
    equal(eventDispatcherWasSetup, 2, 'setup called after reset');
  } catch (error) { Registry.prototype.register = originalRegister; }

  Registry.prototype.register = originalRegister;
});

QUnit.test('When an application is reset, the router URL is reset to `/`', function() {
  let location, router;

  run(() => {
    application = Application.create();
    application.Router = Router.extend({
      location: 'none'
    });

    application.Router.map(function() {
      this.route('one');
      this.route('two');
    });
  });

  router = application.__container__.lookup('router:main');

  location = router.get('location');

  run(() => {
    location.handleURL('/one');
  });

  application.reset();

  let applicationController = application.__container__.lookup('controller:application');
  router = application.__container__.lookup('router:main');
  location = router.get('location');

  equal(location.getURL(), '');

  equal(get(applicationController, 'currentPath'), 'index');

  location = application.__container__.lookup('router:main').get('location');
  run(() => {
    location.handleURL('/one');
  });

  equal(get(applicationController, 'currentPath'), 'one');
});

QUnit.test('When an application with advance/deferReadiness is reset, the app does correctly become ready after reset', function() {
  var readyCallCount;

  readyCallCount = 0;

  run(() => {
    application = Application.create({
      ready() {
        readyCallCount++;
      }
    });

    application.deferReadiness();
    equal(readyCallCount, 0, 'ready has not yet been called');
  });

  run(() => {
    application.advanceReadiness();
  });

  equal(readyCallCount, 1, 'ready was called once');

  application.reset();

  equal(readyCallCount, 2, 'ready was called twice');
});

QUnit.test('With ember-data like initializer and constant', function() {
  let DS = {
    Store: EmberObject.extend({
      init() {
        if (!get(DS, 'defaultStore')) {
          set(DS, 'defaultStore', this);
        }

        this._super(...arguments);
      },
      willDestroy() {
        if (get(DS, 'defaultStore') === this) {
          set(DS, 'defaultStore', null);
        }
      }
    })
  };

  Application.initializer({
    name: 'store',
    initialize(application) {
      application.unregister('store:main');
      application.register('store:main', application.Store);

      application.__container__.lookup('store:main');
    }
  });

  run(() => {
    application = Application.create();
    application.Store = DS.Store;
  });

  ok(DS.defaultStore, 'has defaultStore');

  application.reset();

  ok(DS.defaultStore, 'still has defaultStore');
  ok(application.__container__.lookup('store:main'), 'store is still present');
});
