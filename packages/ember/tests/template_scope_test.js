import "ember";
import EmberHandlebars from "ember-htmlbars/compat";

var compile = EmberHandlebars.compile;
var App, $fixture, templates;

QUnit.module("Template scoping examples", {
  setup() {
    Ember.run(function() {
      templates = Ember.TEMPLATES;
      App = Ember.Application.create({
        name: "App",
        rootElement: '#qunit-fixture'
      });
      App.deferReadiness();

      App.Router.reopen({
        location: 'none'
      });

      App.LoadingRoute = Ember.Route.extend();
    });

    $fixture = Ember.$('#qunit-fixture');
  },

  teardown() {
    Ember.run(function() {
      App.destroy();
    });

    App = null;

    Ember.TEMPLATES = {};
  }
});

QUnit.skip("Actions inside an outlet go to the associated controller", function() {
  expect(1);

  templates.index = compile("{{component-with-action action='componentAction'}}");

  App.IndexController = Ember.Controller.extend({
    actions: {
      componentAction() {
        ok(true, "received the click");
      }
    }
  });

  App.ComponentWithActionComponent = Ember.Component.extend({
    classNames: ['component-with-action'],
    click() {
      this.sendAction();
    }
  });

  bootApp();

  $fixture.find('.component-with-action').click();
});

function bootApp() {
  Ember.run(App, 'advanceReadiness');
}
