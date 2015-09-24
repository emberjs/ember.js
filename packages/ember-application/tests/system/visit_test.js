import Ember from 'ember-metal/core';
import isEnabled from 'ember-metal/features';
import run from 'ember-metal/run_loop';
import Application from 'ember-application/system/application';
import ApplicationInstance from 'ember-application/system/application-instance';
import Router from 'ember-routing/system/router';
import View from 'ember-views/views/view';
import compile from 'ember-template-compiler/system/compile';

function createApplication() {
  var App = Application.extend().create({
    autoboot: false,
    LOG_TRANSITIONS: true,
    LOG_TRANSITIONS_INTERNAL: true,
    LOG_ACTIVE_GENERATION: true
  });

  App.Router = Router.extend();

  return App;
}

if (isEnabled('ember-application-visit')) {
  QUnit.module('Ember.Application - visit()');

  // This tests whether the application is "autobooted" by registering an
  // instance initializer and asserting it never gets run. Since this is
  // inherently testing that async behavior *doesn't* happen, we set a
  // 500ms timeout to verify that when autoboot is set to false, the
  // instance initializer that would normally get called on DOM ready
  // does not fire.
  QUnit.test('Applications with autoboot set to false do not autoboot', function(assert) {
    QUnit.expect(4);
    QUnit.stop();

    let app;
    let appBooted = 0;
    let instanceBooted = 0;

    run(function() {
      app = createApplication();

      // Create an application initializer that should *not* get run.
      app.initializer({
        name: 'assert-no-autoboot',
        initialize() {
          appBooted++;
        }
      });

      // Create an instance initializer that should *not* get run.
      app.instanceInitializer({
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
        app.boot().then(
          () => {
            QUnit.start();
            ok(appBooted === 1, 'app should boot when manually calling `app.boot()`');
            ok(instanceBooted === 0, 'no instances should be booted automatically when manually calling `app.boot()');
          },
          (error) => {
            QUnit.start();
            ok(false, 'the boot process failed with ' + error);
          }
        );
      });
    }, 500);
  });

  QUnit.test('calling visit() on app without first calling boot() should boot the app', function(assert) {
    QUnit.expect(2);
    QUnit.stop();

    let app;
    let appBooted = 0;
    let instanceBooted = 0;

    run(function() {
      app = createApplication();

      // Create an application initializer that should *not* get run.
      app.initializer({
        name: 'assert-no-autoboot',
        initialize() {
          appBooted++;
        }
      });

      // Create an instance initializer that should *not* get run.
      app.instanceInitializer({
        name: 'assert-no-autoboot',
        initialize() {
          instanceBooted++;
        }
      });

      app.visit('/').then(
        () => {
          QUnit.start();
          ok(appBooted === 1, 'the app should be booted`');
          ok(instanceBooted === 1, 'an instances should be booted');
        },
        (error) => {
          QUnit.start();
          ok(false, 'the boot process failed with ' + error);
        }
      );
    });
  });

  QUnit.test('calling visit() on an already booted app should not boot it again', function(assert) {
    QUnit.expect(6);
    QUnit.stop();

    let app;
    let appBooted = 0;
    let instanceBooted = 0;

    run(function() {
      app = createApplication();

      // Create an application initializer that should *not* get run.
      app.initializer({
        name: 'assert-no-autoboot',
        initialize() {
          appBooted++;
        }
      });

      // Create an instance initializer that should *not* get run.
      app.instanceInitializer({
        name: 'assert-no-autoboot',
        initialize() {
          instanceBooted++;
        }
      });

      app.boot().then(() => {
        QUnit.start();
        ok(appBooted === 1, 'the app should be booted');
        ok(instanceBooted === 0, 'no instances should be booted');
        QUnit.stop();

        return app.visit('/');
      }).then(() => {
        QUnit.start();
        ok(appBooted === 1, 'the app should not be booted again');
        ok(instanceBooted === 1, 'an instance should be booted');
        QUnit.stop();

        return app.visit('/');
      }).then(() => {
        QUnit.start();
        ok(appBooted === 1, 'the app should not be booted again');
        ok(instanceBooted === 2, 'another instance should be booted');
      }).catch((error) => {
        QUnit.start();
        ok(false, 'the boot process failed with ' + error);
      });
    });
  });

  QUnit.test('visit() returns a promise that resolves when the view has rendered', function(assert) {
    QUnit.expect(3);
    QUnit.stop();

    var app;

    run(function() {
      app = createApplication();

      app.instanceInitializer({
        name: 'register-application-template',
        initialize(app) {
          app.register('template:application', compile('<h1>Hello world</h1>'));
        }
      });

      assert.equal(Ember.$('#qunit-fixture').children().length, 0, 'there are no elements in the fixture element');

      app.visit('/').then(function(instance) {
        QUnit.start();
        assert.ok(instance instanceof ApplicationInstance, 'promise is resolved with an ApplicationInstance');

        run(instance.view, 'appendTo', '#qunit-fixture');
        assert.equal(Ember.$('#qunit-fixture > .ember-view h1').text(), 'Hello world', 'the application was rendered once the promise resolves');

        instance.destroy();
      }, function(error) {
        QUnit.start();
        assert.ok(false, 'The visit() promise was rejected: ' + error);
      });
    });
  });

  QUnit.test('Views created via visit() are not added to the global views hash', function(assert) {
    QUnit.expect(6);
    QUnit.stop();

    var app;

    run(function() {
      app = createApplication();
      app.instanceInitializer({
        name: 'register-application-template',
        initialize(app) {
          app.register('template:application', compile('<h1>Hello world</h1> {{component "x-child"}}'));
          app.register('view:application', View.extend({
            elementId: 'my-cool-app'
          }));
          app.register('component:x-child', View.extend({
            elementId: 'child-view'
          }));
        }
      });
    });

    assert.equal(Ember.$('#qunit-fixture').children().length, 0, 'there are no elements in the fixture element');

    run(function() {
      app.visit('/').then(function(instance) {
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

        ok(lookup('-view-registry:main')['my-cool-app'] instanceof View, 'view was registered on the instance\'s view registry');
        ok(lookup('-view-registry:main')['child-view'] instanceof View, 'child view was registered on the instance\'s view registry');

        instance.destroy();
      }, function(error) {
        QUnit.start();
        assert.ok(false, 'The visit() promise was rejected: ' + error);
      });
    });
  });
}
