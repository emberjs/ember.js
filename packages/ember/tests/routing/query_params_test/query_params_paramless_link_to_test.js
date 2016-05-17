import Controller from 'ember-runtime/controllers/controller';
import Route from 'ember-routing/system/route';
import isEnabled from 'ember-metal/features';
import run from 'ember-metal/run_loop';
import { capitalize } from 'ember-runtime/system/string';
import { compile } from 'ember-template-compiler';
import Application from 'ember-application/system/application';
import jQuery from 'ember-views/system/jquery';
import NoneLocation from 'ember-routing/location/none_location';
import { setTemplates, set as setTemplate } from 'ember-templates/template_registry';

var App, container, router, registry;
var expectedReplaceURL, expectedPushURL;


var TestLocation = NoneLocation.extend({
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
  run(App, 'advanceReadiness');
}

function sharedSetup() {
  run(function() {
    App = Application.create({
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

    App.LoadingRoute = Route.extend({
    });

    setTemplate('application', compile('{{outlet}}'));
    setTemplate('home', compile('<h3>Hours</h3>'));
  });
}

function sharedTeardown() {
  run(function() {
    App.destroy();
    App = null;
    setTemplates({});
  });
}

import { test, testModule } from 'ember-glimmer/tests/utils/skip-if-glimmer';

testModule('Routing with Query Params', {
  setup() {
    sharedSetup();
  },

  teardown() {
    sharedTeardown();
  }
});

var startingURL = '';

var testParamlessLinks = function(routeName) {
  test('param-less links in an app booted with query params in the URL don\'t reset the query params: ' + routeName, function() {
    expect(1);

    setTemplate(routeName, compile('{{link-to \'index\' \'index\' id=\'index-link\'}}'));

    App[capitalize(routeName) + 'Controller'] = Controller.extend({
      queryParams: ['foo'],
      foo: 'wat'
    });

    startingURL = '/?foo=YEAH';
    bootApplication();

    equal(jQuery('#index-link').attr('href'), '/?foo=YEAH');
  });
};

var testParamlessLinksWithRouteConfig = function(routeName) {
  test('param-less links in an app booted with query params in the URL don\'t reset the query params: ' + routeName, function() {
    expect(1);

    setTemplate(routeName, compile('{{link-to \'index\' \'index\' id=\'index-link\'}}'));

    App[capitalize(routeName) + 'Route'] = Route.extend({
      queryParams: {
        foo: {
          defaultValue: 'wat'
        }
      }
    });

    startingURL = '/?foo=YEAH';
    bootApplication();

    equal(jQuery('#index-link').attr('href'), '/?foo=YEAH');
  });
};

if (isEnabled('ember-routing-route-configured-query-params')) {
  testParamlessLinksWithRouteConfig('application');
  testParamlessLinksWithRouteConfig('index');
} else {
  testParamlessLinks('application');
  testParamlessLinks('index');
}
