var App, logs, originalLogger, visit;

module("Ember.Application – logging", {
  setup: function(){
    logs = {};

    originalLogger = Ember.Logger.info;

    Ember.Logger.info = function(){
      var fullName = arguments[1].fullName;

      logs[fullName] = logs[fullName] || 0;
      logs[fullName]++;
    };

    Ember.run(function(){
      App = Ember.Application.create({
        LOG_ACTIVE_GENERATION: true
      });

      App.Router.reopen({
        location: 'none'
      });

      App.Router.map(function() {
        this.resource("posts");
      });

      App.deferReadiness();
      App.injectTestHelpers();
      visit = App.testHelpers.visit;
    });
  },

  teardown: function(){
    App.removeTestHelpers();
    Ember.Logger.info = originalLogger;

    Ember.run(App, 'destroy');

    logs = App = null;
  }
});

test("log class generation if logging enabled", function() {
  Ember.run(App, 'advanceReadiness');

  visit('/posts').then(function(){
    equal(Ember.keys(logs).length, 6, 'expected no logs');
  });
});

test("do NOT log class generation if logging disabled", function() {
  App.reopen({
    LOG_ACTIVE_GENERATION: false
  });

  Ember.run(App, 'advanceReadiness');

  visit('/posts').then(function(){
    equal(Ember.keys(logs).length, 0, 'expected no logs');
  });
});

test("actively generated classes get logged", function() {
  Ember.run(App, 'advanceReadiness');

  visit('/posts').then(function(){
    equal(logs['controller:application'], 1, 'expected: ApplicationController was generated');
    equal(logs['controller:posts'], 1, 'expected: PostsController was generated');

    equal(logs['route:application'], 1, 'expected: ApplicationRoute was generated');
    equal(logs['route:posts'], 1, 'expected: PostsRoute was generated');
  });
});

test("predefined classes do not get logged", function() {
  App.ApplicationController = Ember.Controller.extend();
  App.PostsController = Ember.Controller.extend();

  App.ApplicationRoute = Ember.Route.extend();
  App.PostsRoute = Ember.Route.extend();

  Ember.run(App, 'advanceReadiness');

  visit('/posts').then(function(){
    ok(!logs['controller:application'], 'did not expect: ApplicationController was generated');
    ok(!logs['controller:posts'], 'did not expect: PostsController was generated');

    ok(!logs['route:application'], 'did not expect: ApplicationRoute was generated');
    ok(!logs['route:posts'], 'did not expect: PostsRoute was generated');
  });
});
