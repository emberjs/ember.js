import Ember from 'ember-metal/core';
import isEnabled from 'ember-metal/features';
import { capitalize } from 'ember-runtime/system/string';
import { compile } from 'ember-template-compiler';

var App, Router, container, router, registry;
var expectedReplaceURL, expectedPushURL;


var TestLocation = Ember.NoneLocation.extend({
  initState() {
    this.set('path', startingURL);
  },

  setURL(path) {
    if (expectedReplaceURL) {
      ok(false, 'pushState occurred but a replaceState was expected');
    }
    if (expectedPushURL) {
      equal(path, expectedPushURL, 'an expected pushState occurred');
      expectedPushURL = null;
    }
    this.set('path', path);
  },

  replaceURL(path) {
    if (expectedPushURL) {
      ok(false, 'replaceState occurred but a pushState was expected');
    }
    if (expectedReplaceURL) {
      equal(path, expectedReplaceURL, 'an expected replaceState occurred');
      expectedReplaceURL = null;
    }
    this.set('path', path);
  }
});

function bootApplication() {
  router = container.lookup('router:main');
  Ember.run(App, 'advanceReadiness');
}

function sharedSetup() {
  Ember.run(function() {
    App = Ember.Application.create({
      name: 'App',
      rootElement: '#qunit-fixture'
    });

    App.deferReadiness();

    registry = App.__registry__;
    container = App.__container__;

    registry.register('location:test', TestLocation);

    startingURL = expectedReplaceURL = expectedPushURL = '';

    App.Router.reopen({
      location: 'test'
    });

    Router = App.Router;

    App.LoadingRoute = Ember.Route.extend({
    });

    Ember.TEMPLATES.application = compile('{{outlet}}');
    Ember.TEMPLATES.home = compile('<h3>Hours</h3>');
  });
}

function sharedTeardown() {
  Ember.run(function() {
    App.destroy();
    App = null;

    Ember.TEMPLATES = {};
  });
}

QUnit.module('Routing with Query Params', {
  setup() {
    sharedSetup();
  },

  teardown() {
    sharedTeardown();
  }
});

var startingURL = '';

var testParamlessLinks = function(routeName) {
  QUnit.test('param-less links in an app booted with query params in the URL don\'t reset the query params: ' + routeName, function() {
    expect(1);

    Ember.TEMPLATES[routeName] = compile('{{link-to \'index\' \'index\' id=\'index-link\'}}');

    App[capitalize(routeName) + 'Controller'] = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: 'wat'
    });

    startingURL = '/?foo=YEAH';
    bootApplication();

    equal(Ember.$('#index-link').attr('href'), '/?foo=YEAH');
  });
};

var testParamlessLinksWithRouteConfig = function(routeName) {
  QUnit.test('param-less links in an app booted with query params in the URL don\'t reset the query params: ' + routeName, function() {
    expect(1);

    Ember.TEMPLATES[routeName] = compile('{{link-to \'index\' \'index\' id=\'index-link\'}}');

    App[capitalize(routeName) + 'Route'] = Ember.Route.extend({
      queryParams: {
        foo: {
          defaultValue: 'wat'
        }
      }
    });

    startingURL = '/?foo=YEAH';
    bootApplication();

    equal(Ember.$('#index-link').attr('href'), '/?foo=YEAH');
  });
};

if (isEnabled('ember-routing-route-configured-query-params')) {
  testParamlessLinksWithRouteConfig('application');
  testParamlessLinksWithRouteConfig('index');
} else {
  testParamlessLinks('application');
  testParamlessLinks('index');
}
