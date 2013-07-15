var App, logs, originalLogger;

module("Ember.Application – logging of generated classes", {
  setup: function() {
    logs = {};

    originalLogger = Ember.Logger.info;

    Ember.Logger.info = function() {
      var fullName = arguments[1].fullName;

      logs[fullName] = logs[fullName] || 0;
      logs[fullName]++;
    };

    Ember.run(function() {
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
    });
  },

  teardown: function() {
    Ember.Logger.info = originalLogger;

    Ember.run(App, 'destroy');

    logs = App = null;
  }
});

function visit(path) {
  stop();

  var promise = Ember.run(function() {
    return new Ember.RSVP.Promise(function(resolve, reject) {
      var router = App.__container__.lookup('router:main');

      resolve(router.handleURL(path).then(function(value) {
        start();
        ok(true, 'visited: `' + path + '`');
        return value;
      }, function(reason) {
        start();
        ok(false, 'failed to visit:`' + path + '` reason: `' + QUnit.jsDump.parse(reason));
        throw reason;
      }));
    });
  });

  return {
    then: function(resolve, reject) {
      Ember.run(promise, 'then', resolve, reject);
    }
  };
}

test("log class generation if logging enabled", function() {
  Ember.run(App, 'advanceReadiness');

  visit('/posts').then(function() {
    equal(Ember.keys(logs).length, 6, 'expected logs');
  });
});

test("do NOT log class generation if logging disabled", function() {
  App.reopen({
    LOG_ACTIVE_GENERATION: false
  });

  Ember.run(App, 'advanceReadiness');

  visit('/posts').then(function() {
    equal(Ember.keys(logs).length, 0, 'expected no logs');
  });
});

test("actively generated classes get logged", function() {
  Ember.run(App, 'advanceReadiness');

  visit('/posts').then(function() {
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

  visit('/posts').then(function() {
    ok(!logs['controller:application'], 'did not expect: ApplicationController was generated');
    ok(!logs['controller:posts'], 'did not expect: PostsController was generated');

    ok(!logs['route:application'], 'did not expect: ApplicationRoute was generated');
    ok(!logs['route:posts'], 'did not expect: PostsRoute was generated');
  });
});

module("Ember.Application – logging of view lookups", {
  setup: function() {
    logs = {};

    originalLogger = Ember.Logger.info;

    Ember.Logger.info = function() {
      var fullName = arguments[1].fullName;

      logs[fullName] = logs[fullName] || 0;
      logs[fullName]++;
    };

    Ember.run(function() {
      App = Ember.Application.create({
        LOG_VIEW_LOOKUPS: true
      });

      App.Router.reopen({
        location: 'none'
      });

      App.Router.map(function() {
        this.resource("posts");
      });

      App.deferReadiness();
    });
  },

  teardown: function() {
    Ember.Logger.info = originalLogger;

    Ember.run(App, 'destroy');

    logs = App = null;
  }
});

test("log when template and view are missing when flag is active", function() {
  App.register('template:application', function() { return ''; });
  Ember.run(App, 'advanceReadiness');

  visit('/posts').then(function() {
    equal(logs['template:application'], undefined, 'expected: Should not log template:application since it exists.');
    equal(logs['template:index'], 1, 'expected: Could not find "index" template or view.');
    equal(logs['template:posts'], 1, 'expected: Could not find "posts" template or view.');
  });
});

test("do not log when template and view are missing when flag is not true", function() {
  App.reopen({
    LOG_VIEW_LOOKUPS: false
  });

  Ember.run(App, 'advanceReadiness');

  visit('/posts').then(function() {
    equal(Ember.keys(logs).length, 0, 'expected no logs');
  });
});

test("log which view is used with a template", function() {
  App.register('template:application', function() { return 'Template with default view'; });
  App.register('template:foo', function() { return 'Template with custom view'; });
  App.register('view:posts', Ember.View.extend({templateName: 'foo'}));
  Ember.run(App, 'advanceReadiness');

  visit('/posts').then(function() {
    equal(logs['view:application'], 1, 'expected: Should log use of default view');
    equal(logs['view:index'], undefined, 'expected: Should not log when index is not present.');
    equal(logs['view:posts'], 1, 'expected: Rendering posts with PostsView.');
  });
});

test("do not log which views are used with templates when flag is not true", function() {
  App.reopen({
    LOG_VIEW_LOOKUPS: false
  });

  Ember.run(App, 'advanceReadiness');

  visit('/posts').then(function() {
    equal(Ember.keys(logs).length, 0, 'expected no logs');
  });
});
