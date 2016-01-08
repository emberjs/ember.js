import HashLocation from 'ember-routing/location/hash_location';
import HistoryLocation from 'ember-routing/location/history_location';
import AutoLocation from 'ember-routing/location/auto_location';
import NoneLocation from 'ember-routing/location/none_location';
import Router from 'ember-routing/system/router';
import { runDestroy } from 'ember-runtime/tests/utils';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { setOwner } from 'container/owner';

var owner;

function createRouter(settings, options) {
  options = options || {};

  var CustomRouter = Router.extend();
  var router = CustomRouter.create(settings);

  if (!options.skipOwner) {
    setOwner(router, owner);
  }

  if (!options.disableSetup) {
    router.setupRouter();
  }

  return router;
}

QUnit.module('Ember Router', {
  setup() {
    owner = buildOwner();

    //register the HashLocation (the default)
    owner.register('location:hash', HashLocation);
    owner.register('location:history', HistoryLocation);
    owner.register('location:auto', AutoLocation);
    owner.register('location:none', NoneLocation);
  },
  teardown() {
    runDestroy(owner);
    owner = null;
  }
});

QUnit.test('can create a router without an owner', function() {
  createRouter(null, { disableSetup: true, skipOwner: true });

  ok(true, 'no errors were thrown when creating without a container');
});

QUnit.test('should not create a router.js instance upon init', function() {
  var router = createRouter(null, { disableSetup: true });

  ok(!router.router);
});

QUnit.test('should not reify location until setupRouter is called', function() {
  var router = createRouter(null, { disableSetup: true });
  equal(typeof router.location, 'string', 'location is specified as a string');

  router.setupRouter();

  equal(typeof router.location, 'object', 'location is reified into an object');
});

QUnit.test('should destroy its location upon destroying the routers owner.', function() {
  var router = createRouter();
  var location = router.get('location');

  runDestroy(owner);

  ok(location.isDestroyed, 'location should be destroyed');
});

QUnit.test('should instantiate its location with its `rootURL`', function() {
  var router = createRouter({
    rootURL: '/rootdir/'
  });
  var location = router.get('location');

  equal(location.get('rootURL'), '/rootdir/');
});

QUnit.test('replacePath should be called with the right path', function() {
  expect(1);

  var location = owner.lookup('location:auto');

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
    rootURL: '/rootdir/'
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

  owner.register('location:fake', FakeLocation);

  router = createRouter({
    location: 'fake',

    _setupRouter() {
      ok(false, '_setupRouter should not be called');
    }
  });

  router.startRouting();
});

QUnit.test('AutoLocation should replace the url when it\'s not in the preferred format', function() {
  expect(1);

  var location = owner.lookup('location:auto');

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
    rootURL: '/rootdir/'
  });
});

QUnit.test('Router#handleURL should remove any #hashes before doing URL transition', function() {
  expect(2);

  var router = createRouter({
    _doURLTransition(routerJsMethod, url) {
      equal(routerJsMethod, 'handleURL');
      equal(url, '/foo/bar?time=morphin');
    }
  });

  router.handleURL('/foo/bar?time=morphin#pink-power-ranger');
});
