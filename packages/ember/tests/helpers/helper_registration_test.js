import "ember";

import EmberHandlebars from "ember-handlebars";
import htmlbarsCompile from "ember-htmlbars/system/compile";
import htmlbarsHelpers from "ember-htmlbars/helpers";

var compile, helpers;
if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  compile = htmlbarsCompile;
  helpers = htmlbarsHelpers;
} else {
  compile = EmberHandlebars.compile;
  helpers = EmberHandlebars.helpers;
}

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

if (!Ember.FEATURES.isEnabled('ember-htmlbars')) {
  // need to make container lookup of helpers normalize the path to
  // old format (currently using `params, hash, options, env`)
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

test("Bound helpers registered on the container can be late-invoked", function() {

  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{x-reverse}} {{x-reverse foo}}</div>");

  boot(function() {
    container.register('controller:application', Ember.Controller.extend({
      foo: "alex"
    }));
    container.register('helper:x-reverse', Ember.Handlebars.makeBoundHelper(reverseHelper));
  });

  equal(Ember.$('#wrapper').text(), "-- xela", "The bound helper was invoked from the container");
  ok(!helpers['x-reverse'], "Container-registered helper doesn't wind up on global helpers hash");
});

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
    container.register('helper:yorp', Ember.Handlebars.makeBoundHelper(function() {
      return "YORP";
    }));
  });

  equal(Ember.$('#wrapper').text(), "|NOHALPER||NOHALPER", "The undashed helper was invoked from the container");

  helpers.helperMissing = realHelperMissing;
});

}
