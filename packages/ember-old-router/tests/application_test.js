require('ember-application');

var set = Ember.set, get = Ember.get;
var app;

module("Ember.Application initialization", {
  teardown: function() {
    Ember.run(function(){ app.destroy(); });
  }
});

test('initialized application go to initial route', function() {
  Ember.run(function() {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });

    app.stateManager = Ember.Router.create({
      location: {
        getURL: function() {
          return '/';
        },
        setURL: function() {},
        onUpdateURL: function() {}
      },

      root: Ember.Route.extend({
        index: Ember.Route.extend({
          route: '/'
        })
      })
    });


    app.ApplicationView = Ember.View.extend({
      template: function() { return "Hello!"; }
    });

    app.ApplicationController = Ember.Controller.extend();

    Ember.run(function() { app.initialize(app.stateManager); });
  });

  equal(app.get('router.currentState.path'), 'root.index', "The router moved the state into the right place");
});

