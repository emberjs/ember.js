var map = Ember.EnumerableUtils.map,
    copy = Ember.copy,
    run = Ember.run,
    EmberRouter = Ember.Router,
    HashLocation = Ember.HashLocation,
    AutoLocation = Ember.AutoLocation;

var Router, container, router;

module("Ember Router", {
  setup: function() {
    container = new Ember.Container();

    // register the HashLocation (the default)
    container.register('location:hash', HashLocation);

    // ensure rootURL is injected into any locations
    container.optionsForType('setting', { instantiate: false });
    container.injection('location', 'rootURL', 'setting:root-url');

    Router = EmberRouter.extend();
  },
  teardown: function() {
    Router = null;
  }
});

test("should create a router if one does not exist on the constructor", function() {
  router = Router.create({container: container});

  ok(router.router);
});

test("should destroy its location upon destroying the routers container.", function() {
  router = Router.create({container: container});

  var location = router.get('location');

  Ember.run(container, 'destroy');

  ok(location.isDestroyed, "location should be destroyed");
});

test("should instantiate its location with its `rootURL`", function() {
  router = Router.create({container: container, rootURL: '/rootdir'});

  var location = router.get('location');

  equal(location.get('rootURL'), '/rootdir');
});

test("Ember.AutoLocation._replacePath should be called with the right path", function() {
  expect(1);

  var AutoTestLocation = copy(AutoLocation);
  AutoTestLocation.supportsHistory = false;

  AutoTestLocation._location = {
    href: 'http://test.com/rootdir/welcome',
    origin: 'http://test.com',
    pathname: '/rootdir/welcome',
    hash: '',
    search: '',
    replace: function(url) {
      equal(url, 'http://test.com/rootdir#/welcome');
    }
  };
  AutoTestLocation._getSupportsHistory = function() { return false; };

  container.register('location:auto', AutoTestLocation);

  router = Router.create({
    container: container,
    location: 'auto',
    rootURL: '/rootdir'
  });
});

test("Ember.Router._routePath should consume identical prefixes", function() {
  router = Router.create({container: container});

  expect(8);

  function routePath(s1, s2, s3) {
    var handlerInfos = map(arguments, function(s) {
      return { name: s };
    });
    handlerInfos.unshift({ name: 'ignored' });

    return Ember.Router._routePath(handlerInfos);
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