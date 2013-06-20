var App, container, originalTemplates;
var compile = Ember.Handlebars.compile;

module("Application Lifecycle - Control Registration", {
  setup: function() {
    originalTemplates = Ember.$.extend({}, Ember.TEMPLATES);
    Ember.TEMPLATES["controls/expand-it"] = compile("<p>hello {{yield}}</p>");
    Ember.TEMPLATES.application = compile("Hello world {{#expand-it}}world{{/expand-it}}");
  },

  teardown: function() {
    Ember.run(function() {
      App.destroy();
      App = null;
      Ember.TEMPLATES = originalTemplates;
    });
  }
});

function boot(callback) {
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
}

test("A helper is registered for templates under the controls/ directory", function() {
  boot();
  ok(Ember.Handlebars.helpers['expand-it'], "The helper is registered");
});

test("The helper becomes the body of the control", function() {
  boot();
  equal(Ember.$('div.ember-view > div.ember-view', '#qunit-fixture').text(), "hello world", "The control is composed correctly");
});

test("If a control is registered, it is used", function() {
  boot(function() {
    container.register('control:expand-it', Ember.Control.extend({
      classNames: 'testing123'
    }));
  });

  equal(Ember.$('div.testing123', '#qunit-fixture').text(), "hello world", "The control is composed correctly");
});
