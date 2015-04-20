import run from "ember-metal/run_loop";
import Application from "ember-application/system/application";
import ApplicationInstance from "ember-application/system/application-instance";
import Router from "ember-routing/system/router";
import View from "ember-views/views/view";
import compile from "ember-template-compiler/system/compile";

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

if (Ember.FEATURES.isEnabled('ember-application-visit')) {
  QUnit.module("Ember.Application - visit()");

  // This tests whether the application is "autobooted" by registering an
  // instance initializer and asserting it never gets run. Since this is
  // inherently testing that async behavior *doesn't* happen, we set a
  // 500ms timeout to verify that when autoboot is set to false, the
  // instance initializer that would normally get called on DOM ready
  // does not fire.
  QUnit.test("Applications with autoboot set to false do not autoboot", function(assert) {
    QUnit.expect(1);
    QUnit.stop();

    run(function() {
      var app = createApplication();

      // Start the timeout
      var timeout = setTimeout(function() {
        ok(true, "500ms elapsed without initializers being called");
        QUnit.start();
      }, 500);

      // Create an instance initializer that should *not* get run.
      app.instanceInitializer({
        name: "assert-no-autoboot",
        initialize() {
          clearTimeout(timeout);
          QUnit.start();
          assert.ok(false, "instance should not have been created");
        }
      });
    });
  });

  QUnit.test("visit() returns a promise that resolves when the view has rendered", function(assert) {
    QUnit.expect(3);
    QUnit.stop();

    var app;

    run(function() {
      app = createApplication();
      app.instanceInitializer({
        name: 'register-application-template',
        initialize(app) {
          app.registry.register('template:application', compile('<h1>Hello world</h1>'));
        }
      });
    });

    assert.equal(Ember.$('#qunit-fixture').children().length, 0, "there are no elements in the fixture element");

    app.visit('/').then(function(instance) {
      QUnit.start();
      assert.ok(instance instanceof ApplicationInstance, "promise is resolved with an ApplicationInstance");

      run(instance.view, 'appendTo', '#qunit-fixture');
      assert.equal(Ember.$("#qunit-fixture > .ember-view h1").text(), "Hello world", "the application was rendered once the promise resolves");

      instance.destroy();
    }, function(error) {
      QUnit.start();
      assert.ok(false, "The visit() promise was rejected: " + error);
    });
  });

  QUnit.test("Views created via visit() are not added to the global views hash", function(assert) {
    QUnit.expect(6);
    QUnit.stop();

    var app;

    run(function() {
      app = createApplication();
      app.instanceInitializer({
        name: 'register-application-template',
        initialize(app) {
          app.registry.register('template:application', compile('<h1>Hello world</h1> {{view "child"}}'));
          app.registry.register('view:application', View.extend({
            elementId: 'my-cool-app'
          }));
          app.registry.register('view:child', View.extend({
            elementId: 'child-view'
          }));
        }
      });
    });

    assert.equal(Ember.$('#qunit-fixture').children().length, 0, "there are no elements in the fixture element");

    app.visit('/').then(function(instance) {
      QUnit.start();
      assert.ok(instance instanceof ApplicationInstance, "promise is resolved with an ApplicationInstance");

      run(instance.view, 'appendTo', '#qunit-fixture');
      assert.equal(Ember.$("#qunit-fixture > #my-cool-app h1").text(), "Hello world", "the application was rendered once the promise resolves");
      assert.strictEqual(View.views['my-cool-app'], undefined, "view was not registered globally");
      ok(instance.container.lookup('-view-registry:main')['my-cool-app'] instanceof View, "view was registered on the instance's view registry");
      ok(instance.container.lookup('-view-registry:main')['child-view'] instanceof View, "child view was registered on the instance's view registry");

      instance.destroy();
    }, function(error) {
      QUnit.start();
      assert.ok(false, "The visit() promise was rejected: " + error);
    });
  });
}
