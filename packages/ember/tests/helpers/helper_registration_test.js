import "ember";

import EmberHandlebars from "ember-handlebars";

var compile, helpers, makeBoundHelper;
compile = EmberHandlebars.compile;
helpers = EmberHandlebars.helpers;
makeBoundHelper = EmberHandlebars.makeBoundHelper;

var App, container;

function reverseHelper(value) {
  return arguments.length > 1 ? value.split('').reverse().join('') : "--";
}


QUnit.module("Application Lifecycle - Helper Registration", {
  teardown: function() {
    Ember.run(function() {
      App.destroy();
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

    container = App.__container__;

    if (callback) { callback(); }
  });

  var router = container.lookup('router:main');

  Ember.run(App, 'advanceReadiness');
  Ember.run(function() {
    router.handleURL('/');
  });
};

test("Unbound dashed helpers registered on the container can be late-invoked", function() {

  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{x-borf}} {{x-borf YES}}</div>");

  boot(function() {
    container.register('helper:x-borf', function(val) {
      return arguments.length > 1 ? val : "BORF";
    });
  });

  equal(Ember.$('#wrapper').text(), "BORF YES", "The helper was invoked from the container");
  ok(!helpers['x-borf'], "Container-registered helper doesn't wind up on global helpers hash");
});

  // need to make `makeBoundHelper` for HTMLBars
test("Bound helpers registered on the container can be late-invoked", function() {
  if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
    expectDeprecation('`Ember.Handlebars.makeBoundHelper` has been deprecated in favor of `Ember.HTMLBars.makeBoundHelper`.');
  }

  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{x-reverse}} {{x-reverse foo}}</div>");

  boot(function() {
    container.register('controller:application', Ember.Controller.extend({
      foo: "alex"
    }));
    container.register('helper:x-reverse', makeBoundHelper(reverseHelper));
  });

  equal(Ember.$('#wrapper').text(), "-- xela", "The bound helper was invoked from the container");
  ok(!helpers['x-reverse'], "Container-registered helper doesn't wind up on global helpers hash");
});

if (!Ember.FEATURES.isEnabled('ember-htmlbars')) {

  // we have unit tests for this in ember-htmlbars/tests/system/lookup-helper
  // and we are not going to recreate the handlebars helperMissing concept
test("Undashed helpers registered on the container can not (presently) be invoked", function() {

  var realHelperMissing = helpers.helperMissing;
  helpers.helperMissing = function() {
    return "NOHALPER";
  };

  // Note: the reason we're not allowing undashed helpers is to avoid
  // a possible perf hit in hot code paths, i.e. _triageMustache.
  // We only presently perform container lookups if prop.indexOf('-') >= 0

  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{omg}}|{{omg 'GRRR'}}|{{yorp}}|{{yorp 'ahh'}}</div>");

  boot(function() {
    container.register('helper:omg', function() {
      return "OMG";
    });
    container.register('helper:yorp', makeBoundHelper(function() {
      return "YORP";
    }));
  });

  equal(Ember.$('#wrapper').text(), "|NOHALPER||NOHALPER", "The undashed helper was invoked from the container");

  helpers.helperMissing = realHelperMissing;
});

}
