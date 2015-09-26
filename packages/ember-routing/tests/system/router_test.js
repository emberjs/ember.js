import assign from 'ember-metal/assign';
import Registry from 'container/registry';
import HashLocation from 'ember-routing/location/hash_location';
import HistoryLocation from 'ember-routing/location/history_location';
import AutoLocation from 'ember-routing/location/auto_location';
import NoneLocation from 'ember-routing/location/none_location';
import Router from 'ember-routing/system/router';
import { runDestroy } from 'ember-runtime/tests/utils';

var registry, container;

function createRouter(overrides, disableSetup) {
  var opts = assign({ container: container }, overrides);
  var routerWithContainer = Router.extend();
  var router = routerWithContainer.create(opts);

  if (!disableSetup) {
    router.setupRouter();
  }

  return router;
}

QUnit.module('Ember Router', {
  setup() {
    registry = new Registry();
    container = registry.container();

    //register the HashLocation (the default)
    registry.register('location:hash', HashLocation);
    registry.register('location:history', HistoryLocation);
    registry.register('location:auto', AutoLocation);
    registry.register('location:none', NoneLocation);
  },
  teardown() {
    runDestroy(container);
    registry = container = null;
  }
});

QUnit.test('can create a router without a container', function() {
  createRouter({ container: null }, true);

  ok(true, 'no errors were thrown when creating without a container');
});

QUnit.test('should not create a router.js instance upon init', function() {
  var router = createRouter(null, true);

  ok(!router.router);
});

QUnit.test('should not reify location until setupRouter is called', function() {
  var router = createRouter(null, true);
  equal(typeof router.location, 'string', 'location is specified as a string');

  router.setupRouter();

  equal(typeof router.location, 'object', 'location is reified into an object');
});

QUnit.test('should destroy its location upon destroying the routers container.', function() {
  var router = createRouter();
  var location = router.get('location');

  runDestroy(container);

  ok(location.isDestroyed, 'location should be destroyed');
});

QUnit.test('should instantiate its location with its `rootPath`', function() {
  var router = createRouter({
    rootPath: '/rootdir/'
  });
  var location = router.get('location');

  equal(location.get('rootPath'), '/rootdir/');
});

QUnit.test('replacePath should be called with the right path', function() {
  expect(1);

  var location = container.lookup('location:auto');

  var browserLocation = {
    href: 'http://test.com/rootdir/welcome',
    origin: 'http://test.com',
    pathname: '/rootdir/welcome',
    hash: '',
    search: '',
    replace(url) {
      equal(url, 'http://test.com/rootdir/#/welcome');
    }
  };

  location.location = browserLocation;
  location.global = { onhashchange() { } };
  location.history = null;

  createRouter({
    location: 'auto',
    rootPath: '/rootdir/'
  });
});

QUnit.test('Ember.Router._routePath should consume identical prefixes', function() {
  createRouter();

  expect(8);

  function routePath(s1, s2, s3) {
    var handlerInfos = Array.prototype.slice.call(arguments).map(function(s) {
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

QUnit.test('Router should cancel routing setup when the Location class says so via cancelRouterSetup', function() {
  expect(0);

  var router;
  var FakeLocation = {
    cancelRouterSetup: true,
    create() { return this; }
  };

  registry.register('location:fake', FakeLocation);

  router = createRouter({
    container: container,
    location: 'fake',

    _setupRouter() {
      ok(false, '_setupRouter should not be called');
    }
  });

  router.startRouting();
});

QUnit.test('AutoLocation should replace the url when it\'s not in the preferred format', function() {
  expect(1);

  var location = container.lookup('location:auto');

  location.location = {
    href: 'http://test.com/rootdir/welcome',
    origin: 'http://test.com',
    pathname: '/rootdir/welcome',
    hash: '',
    search: '',
    replace(url) {
      equal(url, 'http://test.com/rootdir/#/welcome');
    }
  };
  location.history = null;
  location.global = {
    onhashchange() { }
  };

  createRouter({
    location: 'auto',
    rootPath: '/rootdir/'
  });
});

QUnit.test('Router#handleURL should remove any #hashes before doing URL transition', function() {
  expect(2);

  var router = createRouter({
    container: container,

    _doURLTransition(routerJsMethod, url) {
      equal(routerJsMethod, 'handleURL');
      equal(url, '/foo/bar?time=morphin');
    }
  });

  router.handleURL('/foo/bar?time=morphin#pink-power-ranger');
});
