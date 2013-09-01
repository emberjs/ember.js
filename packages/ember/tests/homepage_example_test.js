var App, $fixture;

function setupExample() {
  // setup templates
  Ember.TEMPLATES.application = Ember.Handlebars.compile("{{outlet}}");
  Ember.TEMPLATES.index = Ember.Handlebars.compile("<h1>People</h1><ul>{{#each model}}<li>Hello, <b>{{fullName}}</b>!</li>{{/each}}</ul>");


  App.Person = Ember.Object.extend({
    firstName: null,
    lastName: null,

    fullName: Ember.computed('firstName', 'lastName', function() {
      return this.get('firstName') + " " + this.get('lastName');
    })
  });

  App.IndexRoute = Ember.Route.extend({
    model: function() {
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

module("Homepage Example", {
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

      App.LoadingRoute = Ember.Route.extend();
    });

    $fixture = Ember.$('#qunit-fixture');


    setupExample();

  },

  teardown: function() {
    Ember.run(function() {
      App.destroy();
      App = null;

      Ember.TEMPLATES = {};
    });
  }
});


test("The example renders correctly", function() {
  Ember.run(App, 'advanceReadiness');

  equal($fixture.find('h1:contains(People)').length, 1);
  equal($fixture.find('li').length, 2);
  equal($fixture.find('li:nth-of-type(1)').text(), 'Hello, Tom Dale!');
  equal($fixture.find('li:nth-of-type(2)').text(), 'Hello, Yehuda Katz!');
});
