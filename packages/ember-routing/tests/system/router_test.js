import run from "ember-metal/run_loop";
import copy from "ember-runtime/copy";
import merge from "ember-metal/merge";
import { map } from "ember-metal/enumerable_utils";
import Container from 'container/container';
import HashLocation from "ember-routing/location/hash_location";
import AutoLocation from "ember-routing/location/auto_location";
import EmberRouter from "ember-routing/system/router";

var container, Router, router;

function createRouter(overrides) {
  var opts = merge({ container: container }, overrides);
  router = Router.create(opts);
}

QUnit.module("Ember Router", {
  setup: function() {
    container = new Container();

    //register the HashLocation (the default)
    container.register('location:hash', HashLocation);

    // ensure rootURL is injected into any locations
    container.injection('location', 'rootURL', '-location-setting:root-url');

    Router = EmberRouter.extend();
  },
  teardown: function() {
    container = Router = router = null;
  }
});

test("should create a router if one does not exist on the constructor", function() {
  createRouter();

  ok(router.router);
});

test("should destroy its location upon destroying the routers container.", function() {
  createRouter();

  var location = router.get('location');

  run(container, 'destroy');

  ok(location.isDestroyed, "location should be destroyed");
});

test("should instantiate its location with its `rootURL`", function() {
  createRouter({
    rootURL: '/rootdir/'
  });

  var location = router.get('location');

  equal(location.get('rootURL'), '/rootdir/');
});

test("Ember.AutoLocation._replacePath should be called with the right path", function() {
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

  container.register('location:auto', AutoTestLocation);

  createRouter({
    location: 'auto',
    rootURL: '/rootdir/'
  });
});

test("Ember.Router._routePath should consume identical prefixes", function() {
  createRouter();

  expect(8);

  function routePath(s1, s2, s3) {
    var handlerInfos = map(arguments, function(s) {
      return { name: s };
    });
    handlerInfos.unshift({ name: 'ignored' });

    return EmberRouter._routePath(handlerInfos);
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

test("Router should cancel routing setup when the Location class says so via cancelRouterSetup", function() {
  expect(0);

  var FakeLocation = {
    cancelRouterSetup: true,
    create: function () { return this; }
  };

  container.register('location:fake', FakeLocation);

  router = Router.create({
    container: container,
    location: 'fake',

    _setupRouter: function () {
      ok(false, '_setupRouter should not be called');
    }
  });

  router.startRouting();
});

test("AutoLocation should replace the url when it's not in the preferred format", function() {
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

  container.register('location:auto', AutoTestLocation);

  createRouter({
    location: 'auto',
    rootURL: '/rootdir/'
  });
});
