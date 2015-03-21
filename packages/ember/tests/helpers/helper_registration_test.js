import "ember";

import EmberHandlebars from "ember-htmlbars/compat";

var compile, helpers, makeBoundHelper;
compile = EmberHandlebars.compile;
helpers = EmberHandlebars.helpers;
makeBoundHelper = EmberHandlebars.makeBoundHelper;

var App, registry, container;

function reverseHelper(value) {
  return arguments.length > 1 ? value.split('').reverse().join('') : "--";
}


QUnit.module("Application Lifecycle - Helper Registration", {
  teardown() {
    Ember.run(function() {
      if (App) {
        App.destroy();
      }

      App = null;
      Ember.TEMPLATES = {};
    });
  }
});

var boot = function(callback) {
  Ember.run(function() {
    App = Ember.Application.create({
      name: 'App',
      rootElement: '#qunit-fixture'
    });

    App.deferReadiness();

    App.Router = Ember.Router.extend({
      location: 'none'
    });

    registry = App.registry;
    container = App.__container__;

    if (callback) { callback(); }
  });

  var router = container.lookup('router:main');

  Ember.run(App, 'advanceReadiness');
  Ember.run(function() {
    router.handleURL('/');
  });
};

QUnit.skip("Unbound dashed helpers registered on the container can be late-invoked", function() {

  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{x-borf}} {{x-borf YES}}</div>");

  boot(function() {
    registry.register('helper:x-borf', function(val) {
      return arguments.length > 1 ? val : "BORF";
    });
  });

  equal(Ember.$('#wrapper').text(), "BORF YES", "The helper was invoked from the container");
  ok(!helpers['x-borf'], "Container-registered helper doesn't wind up on global helpers hash");
});

// need to make `makeBoundHelper` for HTMLBars
QUnit.skip("Bound helpers registered on the container can be late-invoked", function() {
  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{x-reverse}} {{x-reverse foo}}</div>");

  boot(function() {
    registry.register('controller:application', Ember.Controller.extend({
      foo: "alex"
    }));
    registry.register('helper:x-reverse', makeBoundHelper(reverseHelper));
  });

  equal(Ember.$('#wrapper').text(), "-- xela", "The bound helper was invoked from the container");
  ok(!helpers['x-reverse'], "Container-registered helper doesn't wind up on global helpers hash");
});

// we have unit tests for this in ember-htmlbars/tests/system/lookup-helper
// and we are not going to recreate the handlebars helperMissing concept
QUnit.test("Undashed helpers registered on the container can not (presently) be invoked", function() {

  // Note: the reason we're not allowing undashed helpers is to avoid
  // a possible perf hit in hot code paths, i.e. _triageMustache.
  // We only presently perform container lookups if prop.indexOf('-') >= 0

  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{omg}}|{{omg 'GRRR'}}|{{yorp}}|{{yorp 'ahh'}}</div>");

  expectAssertion(function() {
    boot(function() {
      registry.register('helper:omg', function() {
        return "OMG";
      });
      registry.register('helper:yorp', makeBoundHelper(function() {
        return "YORP";
      }));
    });
  }, /A helper named 'omg' could not be found/);
});
