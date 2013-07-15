var set = Ember.set, get = Ember.get, trim = Ember.$.trim;
var app;

module("Ember.Application initialization", {
  teardown: function() {
    Ember.run(function() { app.destroy(); });
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

test("Minimal Application initialized with an application template and injections", function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-handlebars">Hello {{controller.name}}!</script>');

  Ember.run(function () {
    app = Ember.Application.create({
      router: false,
      rootElement: '#qunit-fixture'
    });
  });

  app.ApplicationController = Ember.Controller.extend({name: 'Kris'});

  Ember.run(function () {
    // required to receive injections
    var stateManager = Ember.Object.create();
    app.initialize(stateManager);
  });

  equal(trim(Ember.$('#qunit-fixture').text()), 'Hello Kris!');
});

