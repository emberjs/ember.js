import Ember from 'ember-metal/core';
import isEnabled from 'ember-metal/features';
import { compile } from 'ember-template-compiler';

var Router, App, router, registry, container;

function bootApplication() {
  router = container.lookup('router:main');
  Ember.run(App, 'advanceReadiness');
}

var startingURL = '';
var expectedReplaceURL, expectedPushURL;

function setAndFlush(obj, prop, value) {
  Ember.run(obj, 'set', prop, value);
}

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


if (isEnabled('ember-routing-route-configured-query-params')) {
  QUnit.module('Query Params - overlapping query param property names when configured on the route', {
    setup() {
      sharedSetup();

      App.Router.map(function() {
        this.route('parent', function() {
          this.route('child');
        });
      });

      this.boot = function() {
        bootApplication();
        Ember.run(router, 'transitionTo', 'parent.child');
      };
    },

    teardown() {
      sharedTeardown();
    }
  });

  QUnit.test('can remap same-named qp props', function() {
    App.ParentRoute = Ember.Route.extend({
      queryParams: {
        page: {
          as: 'parentPage',
          defaultValue: 1
        }
      }
    });

    App.ParentChildRoute = Ember.Route.extend({
      queryParams: {
        page: {
          as: 'childPage',
          defaultValue: 1
        }
      }
    });

    this.boot();

    equal(router.get('location.path'), '/parent/child');

    var parentController = container.lookup('controller:parent');
    var parentChildController = container.lookup('controller:parent.child');

    setAndFlush(parentController, 'page', 2);
    equal(router.get('location.path'), '/parent/child?parentPage=2');
    setAndFlush(parentController, 'page', 1);
    equal(router.get('location.path'), '/parent/child');

    setAndFlush(parentChildController, 'page', 2);
    equal(router.get('location.path'), '/parent/child?childPage=2');
    setAndFlush(parentChildController, 'page', 1);
    equal(router.get('location.path'), '/parent/child');

    Ember.run(function() {
      parentController.set('page', 2);
      parentChildController.set('page', 2);
    });

    equal(router.get('location.path'), '/parent/child?childPage=2&parentPage=2');

    Ember.run(function() {
      parentController.set('page', 1);
      parentChildController.set('page', 1);
    });

    equal(router.get('location.path'), '/parent/child');
  });

  QUnit.test('query params in the same route hierarchy with the same url key get auto-scoped', function() {
    App.ParentRoute = Ember.Route.extend({
      queryParams: {
        foo: {
          as: 'shared',
          defaultValue: 1
        }
      }
    });

    App.ParentChildRoute = Ember.Route.extend({
      queryParams: {
        bar: {
          as: 'shared',
          defaultValue: 1
        }
      }
    });

    var self = this;
    expectAssertion(function() {
      self.boot();
    }, 'You\'re not allowed to have more than one controller property map to the same query param key, but both `parent:foo` and `parent.child:bar` map to `shared`. You can fix this by mapping one of the controller properties to a different query param key via the `as` config option, e.g. `foo: { as: \'other-foo\' }`');
  });
} else {
  QUnit.module('Query Params - overlapping query param property names', {
    setup() {
      sharedSetup();

      App.Router.map(function() {
        this.route('parent', function() {
          this.route('child');
        });
      });

      this.boot = function() {
        bootApplication();
        Ember.run(router, 'transitionTo', 'parent.child');
      };
    },

    teardown() {
      sharedTeardown();
    }
  });

  QUnit.test('can remap same-named qp props', function() {
    App.ParentController = Ember.Controller.extend({
      queryParams: { page: 'parentPage' },
      page: 1
    });

    App.ParentChildController = Ember.Controller.extend({
      queryParams: { page: 'childPage' },
      page: 1
    });

    this.boot();

    equal(router.get('location.path'), '/parent/child');

    var parentController = container.lookup('controller:parent');
    var parentChildController = container.lookup('controller:parent.child');

    setAndFlush(parentController, 'page', 2);
    equal(router.get('location.path'), '/parent/child?parentPage=2');
    setAndFlush(parentController, 'page', 1);
    equal(router.get('location.path'), '/parent/child');

    setAndFlush(parentChildController, 'page', 2);
    equal(router.get('location.path'), '/parent/child?childPage=2');
    setAndFlush(parentChildController, 'page', 1);
    equal(router.get('location.path'), '/parent/child');

    Ember.run(function() {
      parentController.set('page', 2);
      parentChildController.set('page', 2);
    });

    equal(router.get('location.path'), '/parent/child?childPage=2&parentPage=2');

    Ember.run(function() {
      parentController.set('page', 1);
      parentChildController.set('page', 1);
    });

    equal(router.get('location.path'), '/parent/child');
  });

  QUnit.test('query params in the same route hierarchy with the same url key get auto-scoped', function() {
    App.ParentController = Ember.Controller.extend({
      queryParams: { foo: 'shared' },
      foo: 1
    });

    App.ParentChildController = Ember.Controller.extend({
      queryParams: { bar: 'shared' },
      bar: 1
    });

    var self = this;
    expectAssertion(function() {
      self.boot();
    }, 'You\'re not allowed to have more than one controller property map to the same query param key, but both `parent:foo` and `parent.child:bar` map to `shared`. You can fix this by mapping one of the controller properties to a different query param key via the `as` config option, e.g. `foo: { as: \'other-foo\' }`');
  });

  QUnit.test('Support shared but overridable mixin pattern', function() {
    var HasPage = Ember.Mixin.create({
      queryParams: 'page',
      page: 1
    });

    App.ParentController = Ember.Controller.extend(HasPage, {
      queryParams: { page: 'yespage' }
    });

    App.ParentChildController = Ember.Controller.extend(HasPage);

    this.boot();

    equal(router.get('location.path'), '/parent/child');

    var parentController = container.lookup('controller:parent');
    var parentChildController = container.lookup('controller:parent.child');

    setAndFlush(parentChildController, 'page', 2);
    equal(router.get('location.path'), '/parent/child?page=2');
    equal(parentController.get('page'), 1);
    equal(parentChildController.get('page'), 2);

    setAndFlush(parentController, 'page', 2);
    equal(router.get('location.path'), '/parent/child?page=2&yespage=2');
    equal(parentController.get('page'), 2);
    equal(parentChildController.get('page'), 2);
  });
}
