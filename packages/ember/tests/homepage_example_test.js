import "ember";

import EmberHandlebars from "ember-htmlbars/compat";

var compile = EmberHandlebars.compile;

var App, $fixture;

function setupExample() {
  // setup templates
  Ember.TEMPLATES.application = compile("{{outlet}}");
  Ember.TEMPLATES.index = compile("<h1>People</h1><ul>{{#each person in model}}<li>Hello, <b>{{person.fullName}}</b>!</li>{{/each}}</ul>");


  App.Person = Ember.Object.extend({
    firstName: null,
    lastName: null,

    fullName: Ember.computed('firstName', 'lastName', function() {
      return this.get('firstName') + " " + this.get('lastName');
    })
  });

  App.IndexRoute = Ember.Route.extend({
    model() {
      var people = Ember.A([
        App.Person.create({
          firstName: "Tom",
          lastName: "Dale"
        }),
        App.Person.create({
          firstName: "Yehuda",
          lastName: "Katz"
        })
      ]);
      return people;
    }
  });
}

QUnit.module("Homepage Example", {
  setup() {
    Ember.run(function() {
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
    setupExample();
  },

  teardown() {
    Ember.run(function() {
      App.destroy();
    });

    App = null;

    Ember.TEMPLATES = {};
  }
});


QUnit.test("The example renders correctly", function() {
  Ember.run(App, 'advanceReadiness');

  equal($fixture.find('h1:contains(People)').length, 1);
  equal($fixture.find('li').length, 2);
  equal($fixture.find('li:nth-of-type(1)').text(), 'Hello, Tom Dale!');
  equal($fixture.find('li:nth-of-type(2)').text(), 'Hello, Yehuda Katz!');
});
