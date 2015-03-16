/*globals EmberDev */

import run from "ember-metal/run_loop";
import Application from "ember-application/system/application";
import View from "ember-views/views/view";
import Controller from "ember-runtime/controllers/controller";
import Route from "ember-routing/system/route";
import RSVP from "ember-runtime/ext/rsvp";
import keys from "ember-metal/keys";
import compile from "ember-template-compiler/system/compile";

import "ember-routing";

var App, logs, originalLogger;

QUnit.module("Ember.Application – logging of generated classes", {
  setup() {
    logs = {};

    originalLogger = Ember.Logger.info;

    Ember.Logger.info = function() {
      var fullName = arguments[1].fullName;

      logs[fullName] = logs[fullName] || 0;
      logs[fullName]++;
    };

    run(function() {
      App = Application.create({
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

  teardown() {
    Ember.Logger.info = originalLogger;

    run(App, 'destroy');

    logs = App = null;
  }
});

function visit(path) {
  QUnit.stop();

  var promise = run(function() {
    return new RSVP.Promise(function(resolve, reject) {
      var router = App.__container__.lookup('router:main');

      resolve(router.handleURL(path).then(function(value) {
        QUnit.start();
        ok(true, 'visited: `' + path + '`');
        return value;
      }, function(reason) {
        QUnit.start();
        ok(false, 'failed to visit:`' + path + '` reason: `' + QUnit.jsDump.parse(reason));
        throw reason;
      }));
    });
  });

  return {
    then(resolve, reject) {
      run(promise, 'then', resolve, reject);
    }
  };
}

QUnit.test("log class generation if logging enabled", function() {
  if (EmberDev && EmberDev.runningProdBuild) {
    ok(true, 'Logging does not occur in production builds');
    return;
  }

  run(App, 'advanceReadiness');

  visit('/posts').then(function() {
    equal(Ember.keys(logs).length, 6, 'expected logs');
  });
});

QUnit.test("do NOT log class generation if logging disabled", function() {
  App.reopen({
    LOG_ACTIVE_GENERATION: false
  });

  run(App, 'advanceReadiness');

  visit('/posts').then(function() {
    equal(keys(logs).length, 0, 'expected no logs');
  });
});

QUnit.test("actively generated classes get logged", function() {
  if (EmberDev && EmberDev.runningProdBuild) {
    ok(true, 'Logging does not occur in production builds');
    return;
  }

  run(App, 'advanceReadiness');

  visit('/posts').then(function() {
    equal(logs['controller:application'], 1, 'expected: ApplicationController was generated');
    equal(logs['controller:posts'], 1, 'expected: PostsController was generated');

    equal(logs['route:application'], 1, 'expected: ApplicationRoute was generated');
    equal(logs['route:posts'], 1, 'expected: PostsRoute was generated');
  });
});

QUnit.test("predefined classes do not get logged", function() {
  App.ApplicationController = Controller.extend();
  App.PostsController = Controller.extend();

  App.ApplicationRoute = Route.extend();
  App.PostsRoute = Route.extend();

  run(App, 'advanceReadiness');

  visit('/posts').then(function() {
    ok(!logs['controller:application'], 'did not expect: ApplicationController was generated');
    ok(!logs['controller:posts'], 'did not expect: PostsController was generated');

    ok(!logs['route:application'], 'did not expect: ApplicationRoute was generated');
    ok(!logs['route:posts'], 'did not expect: PostsRoute was generated');
  });
});

QUnit.module("Ember.Application – logging of view lookups", {
  setup() {
    logs = {};

    originalLogger = Ember.Logger.info;

    Ember.Logger.info = function() {
      var fullName = arguments[1].fullName;

      logs[fullName] = logs[fullName] || 0;
      logs[fullName]++;
    };

    run(function() {
      App = Application.create({
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

  teardown() {
    Ember.Logger.info = originalLogger;

    run(App, 'destroy');

    logs = App = null;
  }
});

QUnit.test("log when template and view are missing when flag is active", function() {
  if (EmberDev && EmberDev.runningProdBuild) {
    ok(true, 'Logging does not occur in production builds');
    return;
  }

  App.register('template:application', compile("{{outlet}}"));
  run(App, 'advanceReadiness');

  visit('/posts').then(function() {
    equal(logs['template:application'], undefined, 'expected: Should not log template:application since it exists.');
    equal(logs['template:index'], 1, 'expected: Could not find "index" template or view.');
    equal(logs['template:posts'], 1, 'expected: Could not find "posts" template or view.');
  });
});

QUnit.test("do not log when template and view are missing when flag is not true", function() {
  App.reopen({
    LOG_VIEW_LOOKUPS: false
  });

  run(App, 'advanceReadiness');

  visit('/posts').then(function() {
    equal(keys(logs).length, 0, 'expected no logs');
  });
});

QUnit.test("log which view is used with a template", function() {
  if (EmberDev && EmberDev.runningProdBuild) {
    ok(true, 'Logging does not occur in production builds');
    return;
  }

  App.register('template:application', compile('{{outlet}}'));
  App.register('template:foo', function() { return 'Template with custom view'; });
  App.register('view:posts', View.extend({ templateName: 'foo' }));
  run(App, 'advanceReadiness');

  visit('/posts').then(function() {
    equal(logs['view:application'], 1, 'expected: Should log use of default view');
    equal(logs['view:index'], undefined, 'expected: Should not log when index is not present.');
    equal(logs['view:posts'], 1, 'expected: Rendering posts with PostsView.');
  });
});

QUnit.test("do not log which views are used with templates when flag is not true", function() {
  App.reopen({
    LOG_VIEW_LOOKUPS: false
  });

  run(App, 'advanceReadiness');

  visit('/posts').then(function() {
    equal(keys(logs).length, 0, 'expected no logs');
  });
});
