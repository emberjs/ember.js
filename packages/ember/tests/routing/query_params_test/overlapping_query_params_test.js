import Controller from 'ember-runtime/controllers/controller';
import Route from 'ember-routing/system/route';
import run from 'ember-metal/run_loop';
import isEnabled from 'ember-metal/features';
import Mixin from 'ember-metal/mixin';
import { compile } from 'ember-template-compiler';
import Application from 'ember-application/system/application';
import NoneLocation from 'ember-routing/location/none_location';
import { setTemplates, set as setTemplate } from 'ember-templates/template_registry';

var App, router, registry, container;

function bootApplication() {
  router = container.lookup('router:main');
  run(App, 'advanceReadiness');
}

var startingURL = '';
var expectedReplaceURL, expectedPushURL;

function setAndFlush(obj, prop, value) {
  run(obj, 'set', prop, value);
}

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
        run(router, 'transitionTo', 'parent.child');
      };
    },

    teardown() {
      sharedTeardown();
    }
  });

  QUnit.test('can remap same-named qp props', function() {
    App.ParentRoute = Route.extend({
      queryParams: {
        page: {
          as: 'parentPage',
          defaultValue: 1
        }
      }
    });

    App.ParentChildRoute = Route.extend({
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

    run(function() {
      parentController.set('page', 2);
      parentChildController.set('page', 2);
    });

    equal(router.get('location.path'), '/parent/child?childPage=2&parentPage=2');

    run(function() {
      parentController.set('page', 1);
      parentChildController.set('page', 1);
    });

    equal(router.get('location.path'), '/parent/child');
  });

  QUnit.test('query params in the same route hierarchy with the same url key get auto-scoped', function() {
    App.ParentRoute = Route.extend({
      queryParams: {
        foo: {
          as: 'shared',
          defaultValue: 1
        }
      }
    });

    App.ParentChildRoute = Route.extend({
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
        run(router, 'transitionTo', 'parent.child');
      };
    },

    teardown() {
      sharedTeardown();
    }
  });

  QUnit.test('can remap same-named qp props', function() {
    App.ParentController = Controller.extend({
      queryParams: { page: 'parentPage' },
      page: 1
    });

    App.ParentChildController = Controller.extend({
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

    run(function() {
      parentController.set('page', 2);
      parentChildController.set('page', 2);
    });

    equal(router.get('location.path'), '/parent/child?childPage=2&parentPage=2');

    run(function() {
      parentController.set('page', 1);
      parentChildController.set('page', 1);
    });

    equal(router.get('location.path'), '/parent/child');
  });

  QUnit.test('query params in the same route hierarchy with the same url key get auto-scoped', function() {
    App.ParentController = Controller.extend({
      queryParams: { foo: 'shared' },
      foo: 1
    });

    App.ParentChildController = Controller.extend({
      queryParams: { bar: 'shared' },
      bar: 1
    });

    var self = this;
    expectAssertion(function() {
      self.boot();
    }, 'You\'re not allowed to have more than one controller property map to the same query param key, but both `parent:foo` and `parent.child:bar` map to `shared`. You can fix this by mapping one of the controller properties to a different query param key via the `as` config option, e.g. `foo: { as: \'other-foo\' }`');
  });

  QUnit.test('Support shared but overridable mixin pattern', function() {
    var HasPage = Mixin.create({
      queryParams: 'page',
      page: 1
    });

    App.ParentController = Controller.extend(HasPage, {
      queryParams: { page: 'yespage' }
    });

    App.ParentChildController = Controller.extend(HasPage);

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
