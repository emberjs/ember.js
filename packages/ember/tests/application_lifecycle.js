var App, container;

module("Application Lifecycle", {
  setup: function() {
    Ember.run(function() {
      App = Ember.Application.create({
        rootElement: '#qunit-fixture'
      });
      App.deferReadiness();

      App.Router = Ember.Router.extend({
        location: 'none'
      });

      container = App.__container__;
    });
  },

  teardown: function() {
    Ember.run(App, 'destroy');
  }
});

test("Resetting the application allows controller properties to be set when a route deactivates", function() {
  App.Router.map(function() {
    this.route('home', { path: '/' });
  });
  App.HomeRoute = Ember.Route.extend({
    setupController: function() {
      this.controllerFor('home').set('selectedMenuItem', 'home');
    },
    deactivate: function() {
      this.controllerFor('home').set('selectedMenuItem', null);
    }
  });
  App.ApplicationRoute = Ember.Route.extend({
    setupController: function() {
      this.controllerFor('application').set('selectedMenuItem', 'home');
    },
    deactivate: function() {
      this.controllerFor('application').set('selectedMenuItem', null);
    }
  });

  var router = container.lookup('router:main');

  Ember.run(App, 'advanceReadiness');
  Ember.run(function() {
    router.handleURL('/');
  });
  equal(Ember.controllerFor(container, 'home').get('selectedMenuItem'), 'home');
  equal(Ember.controllerFor(container, 'application').get('selectedMenuItem'), 'home');

  App.reset();
  equal(Ember.controllerFor(container, 'home').get('selectedMenuItem'), null);
  equal(Ember.controllerFor(container, 'application').get('selectedMenuItem'), null);
});
