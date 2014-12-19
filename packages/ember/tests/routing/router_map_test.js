import "ember";

var Router, App, container;

QUnit.module("Router.map", {
  setup: function() {
    Ember.run(function() {
      App = Ember.Application.create({
        name: "App",
        rootElement: '#qunit-fixture'
      });

      App.deferReadiness();

      App.Router.reopen({
        location: 'none'
      });

      Router = App.Router;

      container = App.__container__;

      //Ember.TEMPLATES.application = compile("{{outlet}}");
      //Ember.TEMPLATES.home = compile("<h3>Hours</h3>");
      //Ember.TEMPLATES.homepage = compile("<h3>Megatroll</h3><p>{{home}}</p>");
      //Ember.TEMPLATES.camelot = compile('<section><h3>Is a silly place</h3></section>');

      //originalLoggerError = Ember.Logger.error;
    });
  },

  teardown: function() {
    Ember.run(function() {
      App.destroy();
      App = null;

      Ember.TEMPLATES = {};
      //Ember.Logger.error = originalLoggerError;
    });
  }
});

test("Router.map returns an Ember Router class", function () {
  var ret = App.Router.map(function() {
    this.route('hello');
  });

  ok(Ember.Router.detect(ret));
});
