import Ember from 'ember-metal/core';
import isEnabled from 'ember-metal/features';
import run from 'ember-metal/run_loop';
import Application from 'ember-application/system/application';
import ApplicationInstance from 'ember-application/system/application-instance';
import Route from 'ember-routing/system/route';
import Router from 'ember-routing/system/router';
import View from 'ember-views/views/view';
import compile from 'ember-template-compiler/system/compile';

let App = null;
let instance = null;

function createApplication() {
  App = Application.extend().create({
    autoboot: false,
    LOG_TRANSITIONS: true,
    LOG_TRANSITIONS_INTERNAL: true,
    LOG_ACTIVE_GENERATION: true
  });

  App.Router = Router.extend();

  App.instanceInitializer({
    name: 'auto-cleanup',
    initialize(_instance) {
      if (instance) {
        run(instance, 'destroy');
      }

      instance = _instance;
    }
  });

  return App;
}

if (isEnabled('ember-application-visit')) {
  QUnit.module('Ember.Application - visit()', {
    teardown() {
      if (instance) {
        run(instance, 'destroy');
        instance = null;
      }

      if (App) {
        run(App, 'destroy');
        App = null;
      }
    }
  });

  // This tests whether the application is "autobooted" by registering an
  // instance initializer and asserting it never gets run. Since this is
  // inherently testing that async behavior *doesn't* happen, we set a
  // 500ms timeout to verify that when autoboot is set to false, the
  // instance initializer that would normally get called on DOM ready
  // does not fire.
  QUnit.test('Applications with autoboot set to false do not autoboot', function(assert) {
    QUnit.expect(4);
    QUnit.stop();

    let appBooted = 0;
    let instanceBooted = 0;

    run(function() {
      createApplication();

      App.initializer({
        name: 'assert-no-autoboot',
        initialize() {
          appBooted++;
        }
      });

      App.instanceInitializer({
        name: 'assert-no-autoboot',
        initialize() {
          instanceBooted++;
        }
      });
    });

    // Continue after 500ms
    setTimeout(function() {
      QUnit.start();
      ok(appBooted === 0, '500ms elapsed without app being booted');
      ok(instanceBooted === 0, '500ms elapsed without instances being booted');

      QUnit.stop();

      run(function() {
        App.boot().then(
          () => {
            QUnit.start();
            assert.ok(appBooted === 1, 'app should boot when manually calling `app.boot()`');
            assert.ok(instanceBooted === 0, 'no instances should be booted automatically when manually calling `app.boot()');
          },
          (error) => {
            QUnit.start();
            assert.ok(false, 'the boot process failed with ' + error);
          }
        );
      });
    }, 500);
  });

  QUnit.test('calling visit() on app without first calling boot() should boot the app', function(assert) {
    QUnit.expect(2);
    QUnit.stop();

    let appBooted = 0;
    let instanceBooted = 0;

    run(function() {
      createApplication();

      App.initializer({
        name: 'assert-no-autoboot',
        initialize() {
          appBooted++;
        }
      });

      App.instanceInitializer({
        name: 'assert-no-autoboot',
        initialize() {
          instanceBooted++;
        }
      });

      App.visit('/').then(
        () => {
          QUnit.start();
          assert.ok(appBooted === 1, 'the app should be booted`');
          assert.ok(instanceBooted === 1, 'an instances should be booted');
        },
        (error) => {
          QUnit.start();
          assert.ok(false, 'the boot process failed with ' + error);
        }
      );
    });
  });

  QUnit.test('calling visit() on an already booted app should not boot it again', function(assert) {
    QUnit.expect(6);
    QUnit.stop();

    let appBooted = 0;
    let instanceBooted = 0;

    run(function() {
      createApplication();

      App.initializer({
        name: 'assert-no-autoboot',
        initialize() {
          appBooted++;
        }
      });

      App.instanceInitializer({
        name: 'assert-no-autoboot',
        initialize() {
          instanceBooted++;
        }
      });

      App.boot().then(() => {
        QUnit.start();
        assert.ok(appBooted === 1, 'the app should be booted');
        assert.ok(instanceBooted === 0, 'no instances should be booted');
        QUnit.stop();

        return App.visit('/');
      }).then(() => {
        QUnit.start();
        assert.ok(appBooted === 1, 'the app should not be booted again');
        assert.ok(instanceBooted === 1, 'an instance should be booted');
        QUnit.stop();

        return App.visit('/');
      }).then(() => {
        QUnit.start();
        assert.ok(appBooted === 1, 'the app should not be booted again');
        assert.ok(instanceBooted === 2, 'another instance should be booted');
      }).catch((error) => {
        QUnit.start();
        assert.ok(false, 'the boot process failed with ' + error);
      });
    });
  });

  QUnit.test('visit() rejects on application boot failure', function(assert) {
    QUnit.expect(2);
    QUnit.stop();

    run(function() {
      createApplication();

      App.initializer({
        name: 'error',
        initialize() {
          throw new Error('boot failure');
        }
      });

      App.visit('/').then(
        () => {
          QUnit.start();
          assert.ok(false, 'It should not resolve the promise');
        },
        (error) => {
          QUnit.start();
          assert.ok(error instanceof Error, 'It should reject the promise with the boot error');
          assert.equal(error.message, 'boot failure');
        }
      );
    });
  });

  QUnit.test('visit() rejects on instance boot failure', function(assert) {
    QUnit.expect(2);
    QUnit.stop();

    run(function() {
      createApplication();

      App.instanceInitializer({
        name: 'error',
        initialize() {
          throw new Error('boot failure');
        }
      });

      App.visit('/').then(
        () => {
          QUnit.start();
          assert.ok(false, 'It should not resolve the promise');
        },
        (error) => {
          QUnit.start();
          assert.ok(error instanceof Error, 'It should reject the promise with the boot error');
          assert.equal(error.message, 'boot failure');
        }
      );
    });
  });

  QUnit.test('visit() follows redirects', function(assert) {
    QUnit.expect(2);
    QUnit.stop();

    run(function() {
      createApplication();

      App.Router.map(function() {
        this.route('a');
        this.route('b', { path: '/b/:b' });
        this.route('c', { path: '/c/:c' });
      });

      App.register('route:a', Route.extend({
        afterModel() {
          this.replaceWith('b', 'zomg');
        }
      }));

      App.register('route:b', Route.extend({
        afterModel(params) {
          this.transitionTo('c', params.b);
        }
      }));

      App.visit('/a').then(
        (instance) => {
          QUnit.start();
          assert.ok(instance instanceof ApplicationInstance, 'promise is resolved with an ApplicationInstance');
          assert.equal(instance.getURL(), '/c/zomg', 'It should follow all redirects');
        },
        (error) => {
          QUnit.start();
          assert.ok(false, 'The visit() promise was rejected: ' + error);
        }
      );
    });
  });

  QUnit.test('visit() rejects if an error occured during a transition', function(assert) {
    QUnit.expect(2);
    QUnit.stop();

    run(function() {
      createApplication();

      App.Router.map(function() {
        this.route('a');
        this.route('b', { path: '/b/:b' });
        this.route('c', { path: '/c/:c' });
      });

      App.register('route:a', Route.extend({
        afterModel() {
          this.replaceWith('b', 'zomg');
        }
      }));

      App.register('route:b', Route.extend({
        afterModel(params) {
          this.transitionTo('c', params.b);
        }
      }));

      App.register('route:c', Route.extend({
        afterModel(params) {
          throw new Error('transition failure');
        }
      }));

      App.visit('/a').then(
        () => {
          QUnit.start();
          assert.ok(false, 'It should not resolve the promise');
        },
        (error) => {
          QUnit.start();
          assert.ok(error instanceof Error, 'It should reject the promise with the boot error');
          assert.equal(error.message, 'transition failure');
        }
      );
    });
  });

  QUnit.test('visit() chain', function(assert) {
    QUnit.expect(8);
    QUnit.stop();

    run(function() {
      createApplication();

      App.Router.map(function() {
        this.route('a');
        this.route('b');
        this.route('c');
      });

      App.visit('/').then((instance) => {
        QUnit.start();
        assert.ok(instance instanceof ApplicationInstance, 'promise is resolved with an ApplicationInstance');
        assert.equal(instance.getURL(), '/');

        QUnit.stop();
        return instance.visit('/a');
      }).then((instance) => {
        QUnit.start();
        assert.ok(instance instanceof ApplicationInstance, 'promise is resolved with an ApplicationInstance');
        assert.equal(instance.getURL(), '/a');

        QUnit.stop();
        return instance.visit('/b');
      }).then((instance) => {
        QUnit.start();
        assert.ok(instance instanceof ApplicationInstance, 'promise is resolved with an ApplicationInstance');
        assert.equal(instance.getURL(), '/b');

        QUnit.stop();
        return instance.visit('/c');
      }).then((instance) => {
        QUnit.start();
        assert.ok(instance instanceof ApplicationInstance, 'promise is resolved with an ApplicationInstance');
        assert.equal(instance.getURL(), '/c');
      }).catch((error) => {
        QUnit.start();
        assert.ok(false, 'The visit() promise was rejected: ' + error);
      });
    });
  });

  QUnit.test('visit() returns a promise that resolves when the view has rendered', function(assert) {
    QUnit.expect(3);
    QUnit.stop();

    run(function() {
      createApplication();

      App.register('template:application', compile('<h1>Hello world</h1>'));
    });

    assert.strictEqual(Ember.$('#qunit-fixture').children().length, 0, 'there are no elements in the fixture element');

    run(function() {
      App.visit('/').then(function(instance) {
        QUnit.start();
        assert.ok(instance instanceof ApplicationInstance, 'promise is resolved with an ApplicationInstance');

        run(instance.view, 'appendTo', '#qunit-fixture');
        assert.equal(Ember.$('#qunit-fixture > .ember-view h1').text(), 'Hello world', 'the application was rendered once the promise resolves');
      }, function(error) {
        QUnit.start();
        assert.ok(false, 'The visit() promise was rejected: ' + error);
      });
    });
  });

  QUnit.test('Views created via visit() are not added to the global views hash', function(assert) {
    QUnit.expect(6);
    QUnit.stop();

    run(function() {
      createApplication();

      App.register('template:application', compile('<h1>Hello world</h1> {{component "x-child"}}'));

      App.register('view:application', View.extend({
        elementId: 'my-cool-app'
      }));

      App.register('component:x-child', View.extend({
        elementId: 'child-view'
      }));
    });

    assert.equal(Ember.$('#qunit-fixture').children().length, 0, 'there are no elements in the fixture element');

    run(function() {
      App.visit('/').then(function(instance) {
        QUnit.start();
        assert.ok(instance instanceof ApplicationInstance, 'promise is resolved with an ApplicationInstance');

        run(instance.view, 'appendTo', '#qunit-fixture');
        assert.equal(Ember.$('#qunit-fixture > #my-cool-app h1').text(), 'Hello world', 'the application was rendered once the promise resolves');
        assert.strictEqual(View.views['my-cool-app'], undefined, 'view was not registered globally');

        function lookup(fullName) {
          if (isEnabled('ember-registry-container-reform')) {
            return instance.lookup(fullName);
          } else {
            return instance.container.lookup(fullName);
          }
        }

        assert.ok(lookup('-view-registry:main')['my-cool-app'] instanceof View, 'view was registered on the instance\'s view registry');
        assert.ok(lookup('-view-registry:main')['child-view'] instanceof View, 'child view was registered on the instance\'s view registry');
      }, function(error) {
        QUnit.start();
        assert.ok(false, 'The visit() promise was rejected: ' + error);
      });
    });
  });
}
