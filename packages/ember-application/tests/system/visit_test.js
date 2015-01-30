import run from "ember-metal/run_loop";
import Application from "ember-application/system/application";

function createApplication() {
  var app = Application.extend().create({
    autoboot: false
  });

  return app;
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
        initialize: function() {
          clearTimeout(timeout);
          QUnit.start();
          assert.ok(false, "instance should not have been created");
        }
      });
    });
  });
}
