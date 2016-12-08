/*globals EmberDev */

import Logger from 'ember-console';
import { run } from 'ember-metal';
import Application from '../../system/application';
import { Controller, RSVP } from 'ember-runtime';
import { Route } from 'ember-routing';
import { compile } from 'ember-template-compiler';

let App, logs, originalLogger;

QUnit.module('Ember.Application – logging of generated classes', {
  setup() {
    logs = {};

    originalLogger = Logger.info;

    Logger.info = function() {
      let fullName = arguments[1].fullName;

      logs[fullName] = logs[fullName] || 0;
      logs[fullName]++;
    };

    run(() => {
      App = Application.create({
        LOG_ACTIVE_GENERATION: true
      });

      App.Router.reopen({
        location: 'none'
      });

      App.Router.map(function() {
        this.route('posts', { resetNamespace: true });
      });

      App.deferReadiness();
    });
  },

  teardown() {
    Logger.info = originalLogger;

    run(App, 'destroy');

    logs = App = null;
  }
});

function visit(path) {
  QUnit.stop();

  var promise = run(() => {
    return new RSVP.Promise((resolve, reject) => {
      var router = App.__container__.lookup('router:main');

      resolve(router.handleURL(path).then(value => {
        QUnit.start();
        ok(true, 'visited: `' + path + '`');
        return value;
      }, reason => {
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

QUnit.test('log class generation if logging enabled', function() {
  if (EmberDev && EmberDev.runningProdBuild) {
    ok(true, 'Logging does not occur in production builds');
    return;
  }

  run(App, 'advanceReadiness');

  visit('/posts').then(function() {
    equal(Object.keys(logs).length, 6, 'expected logs');
  });
});

QUnit.test('do NOT log class generation if logging disabled', function() {
  App.reopen({
    LOG_ACTIVE_GENERATION: false
  });

  run(App, 'advanceReadiness');

  visit('/posts').then(() => {
    equal(Object.keys(logs).length, 0, 'expected no logs');
  });
});

QUnit.test('actively generated classes get logged', function() {
  if (EmberDev && EmberDev.runningProdBuild) {
    ok(true, 'Logging does not occur in production builds');
    return;
  }

  run(App, 'advanceReadiness');

  visit('/posts').then(() => {
    equal(logs['controller:application'], 1, 'expected: ApplicationController was generated');
    equal(logs['controller:posts'], 1, 'expected: PostsController was generated');

    equal(logs['route:application'], 1, 'expected: ApplicationRoute was generated');
    equal(logs['route:posts'], 1, 'expected: PostsRoute was generated');
  });
});

QUnit.test('predefined classes do not get logged', function() {
  App.ApplicationController = Controller.extend();
  App.PostsController = Controller.extend();

  App.ApplicationRoute = Route.extend();
  App.PostsRoute = Route.extend();

  run(App, 'advanceReadiness');

  visit('/posts').then(() => {
    ok(!logs['controller:application'], 'did not expect: ApplicationController was generated');
    ok(!logs['controller:posts'], 'did not expect: PostsController was generated');

    ok(!logs['route:application'], 'did not expect: ApplicationRoute was generated');
    ok(!logs['route:posts'], 'did not expect: PostsRoute was generated');
  });
});

QUnit.module('Ember.Application – logging of view lookups', {
  setup() {
    logs = {};

    originalLogger = Logger.info;

    Logger.info = function() {
      var fullName = arguments[1].fullName;

      logs[fullName] = logs[fullName] || 0;
      logs[fullName]++;
    };

    run(() => {
      App = Application.create({
        LOG_VIEW_LOOKUPS: true
      });

      App.Router.reopen({
        location: 'none'
      });

      App.Router.map(function() {
        this.route('posts', { resetNamespace: true });
      });

      App.deferReadiness();
    });
  },

  teardown() {
    Logger.info = originalLogger;

    run(App, 'destroy');

    logs = App = null;
  }
});

QUnit.test('log when template and view are missing when flag is active', function() {
  if (EmberDev && EmberDev.runningProdBuild) {
    ok(true, 'Logging does not occur in production builds');
    return;
  }

  App.register('template:application', compile('{{outlet}}'));
  run(App, 'advanceReadiness');

  visit('/posts').then(() => {
    equal(logs['template:application'], undefined, 'expected: Should not log template:application since it exists.');
    equal(logs['template:index'], 1, 'expected: Could not find "index" template or view.');
    equal(logs['template:posts'], 1, 'expected: Could not find "posts" template or view.');
  });
});

QUnit.test('do not log when template and view are missing when flag is not true', function() {
  App.reopen({
    LOG_VIEW_LOOKUPS: false
  });

  run(App, 'advanceReadiness');

  visit('/posts').then(() => {
    equal(Object.keys(logs).length, 0, 'expected no logs');
  });
});

QUnit.test('do not log which views are used with templates when flag is not true', function() {
  App.reopen({
    LOG_VIEW_LOOKUPS: false
  });

  run(App, 'advanceReadiness');

  visit('/posts').then(() => {
    equal(Object.keys(logs).length, 0, 'expected no logs');
  });
});
