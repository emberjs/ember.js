import "ember";
import EmberHandlebars from "ember-htmlbars/compat";

/*
 In Ember 1.x, controllers subtly affect things like template scope
 and action targets in exciting and often inscrutable ways. This test
 file contains integration tests that verify the correct behavior of
 the many parts of the system that change and rely upon controller scope,
 from the runtime up to the templating layer.
*/

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

QUnit.test("Actions inside an outlet go to the associated controller", function() {
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

// This test caught a regression where {{#each}}s used directly in a template
// (i.e., not inside a view or component) did not have access to a container and
// would raise an exception.
QUnit.test("{{#each}} inside outlet can have an itemController", function() {
  templates.index = compile(`
    {{#each model itemController='thing'}}
      <p>hi</p>
    {{/each}}
  `);

  App.IndexController = Ember.Controller.extend({
    model: Ember.A([1, 2, 3])
  });

  App.ThingController = Ember.Controller.extend();

  bootApp();

  equal($fixture.find('p').length, 3, "the {{#each}} rendered without raising an exception");
});

function bootApp() {
  Ember.run(App, 'advanceReadiness');
}
