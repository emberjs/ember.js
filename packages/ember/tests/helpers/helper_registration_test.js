var App, container;
var compile = Ember.Handlebars.compile;

function reverseHelper(value) {
  return arguments.length > 1 ? value.split('').reverse().join('') : "--";
}

module("Application Lifecycle - Helper Registration", {
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
  ok(!Ember.Handlebars.helpers['x-borf'], "Container-registered helper doesn't wind up on global helpers hash");
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
  ok(!Ember.Handlebars.helpers['x-reverse'], "Container-registered helper doesn't wind up on global helpers hash");
});

test("Undashed helpers registered on the container can not (presently) be invoked", function() {

  var realHelperMissing = Ember.Handlebars.helpers.helperMissing;
  Ember.Handlebars.helpers.helperMissing = function() {
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

  Ember.Handlebars.helpers.helperMissing = realHelperMissing;
});
