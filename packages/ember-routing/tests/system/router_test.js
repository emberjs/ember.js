import copy from "ember-runtime/copy";
import merge from "ember-metal/merge";
import { map } from "ember-metal/enumerable_utils";
import Registry from "container/registry";
import HashLocation from "ember-routing/location/hash_location";
import AutoLocation from "ember-routing/location/auto_location";
import Router from "ember-routing/system/router";
import { runDestroy } from "ember-runtime/tests/utils";

var registry, container;

function createRouter(overrides) {
  var opts = merge({ container: container }, overrides);
  var routerWithContainer = Router.extend();

  return routerWithContainer.create(opts);
}

QUnit.module("Ember Router", {
  setup: function() {
    registry = new Registry();
    container = registry.container();

    //register the HashLocation (the default)
    registry.register('location:hash', HashLocation);

    // ensure rootURL is injected into any locations
    registry.injection('location', 'rootURL', '-location-setting:root-url');
  },
  teardown: function() {
    runDestroy(container);
    registry = container = null;
  }
});

QUnit.test("can create a router without a container", function() {
  createRouter({ container: null });

  ok(true, 'no errors were thrown when creating without a container');
});

QUnit.test("should not create a router.js instance upon init", function() {
  var router = createRouter();

  ok(!router.router);
});

QUnit.test("should destroy its location upon destroying the routers container.", function() {
  var router = createRouter();
  var location = router.get('location');

  runDestroy(container);

  ok(location.isDestroyed, "location should be destroyed");
});

QUnit.test("should instantiate its location with its `rootURL`", function() {
  var router = createRouter({
    rootURL: '/rootdir/'
  });
  var location = router.get('location');

  equal(location.get('rootURL'), '/rootdir/');
});

QUnit.test("Ember.AutoLocation._replacePath should be called with the right path", function() {
  expect(1);

  var AutoTestLocation = copy(AutoLocation);

  AutoTestLocation._location = {
    href: 'http://test.com/rootdir/welcome',
    origin: 'http://test.com',
    pathname: '/rootdir/welcome',
    hash: '',
    search: '',
    replace: function(url) {
      equal(url, 'http://test.com/rootdir/#/welcome');
    }
  };
  AutoTestLocation._getSupportsHistory = function() { return false; };

  registry.register('location:auto', AutoTestLocation);

  createRouter({
    location: 'auto',
    rootURL: '/rootdir/'
  });
});

QUnit.test("Ember.Router._routePath should consume identical prefixes", function() {
  createRouter();

  expect(8);

  function routePath(s1, s2, s3) {
    var handlerInfos = map(arguments, function(s) {
      return { name: s };
    });
    handlerInfos.unshift({ name: 'ignored' });

    return Router._routePath(handlerInfos);
  }

  equal(routePath('foo'), 'foo');
  equal(routePath('foo', 'bar', 'baz'), 'foo.bar.baz');
  equal(routePath('foo', 'foo.bar'), 'foo.bar');
  equal(routePath('foo', 'foo.bar', 'foo.bar.baz'), 'foo.bar.baz');
  equal(routePath('foo', 'foo.bar', 'foo.bar.baz.wow'), 'foo.bar.baz.wow');
  equal(routePath('foo', 'foo.bar.baz.wow'), 'foo.bar.baz.wow');
  equal(routePath('foo.bar', 'bar.baz.wow'), 'foo.bar.baz.wow');

  // This makes no sense, not trying to handle it, just
  // making sure it doesn't go boom.
  equal(routePath('foo.bar.baz', 'foo'), 'foo.bar.baz.foo');
});

QUnit.test("Router should cancel routing setup when the Location class says so via cancelRouterSetup", function() {
  expect(0);

  var router;
  var FakeLocation = {
    cancelRouterSetup: true,
    create: function () { return this; }
  };

  registry.register('location:fake', FakeLocation);

  router = createRouter({
    container: container,
    location: 'fake',

    _setupRouter: function () {
      ok(false, '_setupRouter should not be called');
    }
  });

  router.startRouting();
});

QUnit.test("AutoLocation should replace the url when it's not in the preferred format", function() {
  expect(1);

  var AutoTestLocation = copy(AutoLocation);

  AutoTestLocation._location = {
    href: 'http://test.com/rootdir/welcome',
    origin: 'http://test.com',
    pathname: '/rootdir/welcome',
    hash: '',
    search: '',
    replace: function(url) {
      equal(url, 'http://test.com/rootdir/#/welcome');
    }
  };

  AutoTestLocation._getSupportsHistory = function() { return false; };

  registry.register('location:auto', AutoTestLocation);

  createRouter({
    location: 'auto',
    rootURL: '/rootdir/'
  });
});

QUnit.test("Router#handleURL should remove any #hashes before doing URL transition", function() {
  expect(2);

  var router = createRouter({
    container: container,

    _doURLTransition: function (routerJsMethod, url) {
      equal(routerJsMethod, 'handleURL');
      equal(url, '/foo/bar?time=morphin');
    }
  });

  router.handleURL('/foo/bar?time=morphin#pink-power-ranger');
});
