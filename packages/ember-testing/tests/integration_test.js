var App, find, visit, originalAdapter;

module("ember-testing Integration", {
  setup: function() {
    Ember.$('<div id="ember-testing-container"><div id="ember-testing"></div></div>').appendTo('body');
    Ember.run(function() {
      App = Ember.Application.create({
        rootElement: '#ember-testing'
      });

      App.Router.map(function() {
        this.resource("people", { path: "/" });
      });

      App.PeopleRoute = Ember.Route.extend({
        model: function() {
          return App.Person.find();
        }
      });

      App.PeopleView = Ember.View.extend({
        defaultTemplate: Ember.Handlebars.compile("{{#each person in controller}}<div class=\"name\">{{person.firstName}}</div>{{/each}}")
      });

      App.PeopleController = Ember.ArrayController.extend({});

      App.Person = Ember.Object.extend({
        firstName: ''
      });

      App.Person.reopenClass({
        find: function() {
          return Ember.A(); 
        }
      });

      App.ApplicationView = Ember.View.extend({
        defaultTemplate: Ember.Handlebars.compile("{{outlet}}")
      });

      App.setupForTesting();
    });

    Ember.run(function() {
      App.reset();
      if (Ember.FEATURES.isEnabled('ember-testing-lazy-routing')){
        // no need to deferReadiness as it is done via an initializer
      } else {
        App.deferReadiness();
      }
    });

    App.injectTestHelpers();

    find = window.find;
    visit = window.visit;

    originalAdapter = Ember.Test.adapter;
  },

  teardown: function() {
    App.removeTestHelpers();
    Ember.$('#ember-testing-container, #ember-testing').remove();
    Ember.run(App, App.destroy);
    App = null;
    Ember.Test.adapter = originalAdapter;
  }
});

test("template is bound to empty array of people", function() {
  App.Person.find = function() {
    return Ember.A();
  };
  Ember.run(App, 'advanceReadiness');
  visit("/").then(function() {
    var rows = find(".name").length;
    equal(rows, 0, "successfully stubbed an empty array of people");
  });
});

test("template is bound to array of 2 people", function() {
  App.Person.find = function() {
    var people = Ember.A();
    var first = App.Person.create({firstName: "x"});
    var last = App.Person.create({firstName: "y"});
    Ember.run(people, people.pushObject, first);
    Ember.run(people, people.pushObject, last);
    return people;
  };
  Ember.run(App, 'advanceReadiness');
  visit("/").then(function() {
    var rows = find(".name").length;
    equal(rows, 2, "successfully stubbed a non empty array of people");
  });
});

test("template is again bound to empty array of people", function() {
  App.Person.find = function() {
    return Ember.A();
  };
  Ember.run(App, 'advanceReadiness');
  visit("/").then(function() {
    var rows = find(".name").length;
    equal(rows, 0, "successfully stubbed another empty array of people");
  });
});

if (Ember.FEATURES.isEnabled('ember-testing-lazy-routing')){
  test("`visit` can be called without advancedReadiness.", function(){
    App.Person.find = function() {
      return Ember.A();
    };

    visit("/").then(function() {
      var rows = find(".name").length;
      equal(rows, 0, "stubbed an empty array of people without calling advancedReadiness.");
    });
  });
}
