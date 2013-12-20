var Router;

var map = Ember.EnumerableUtils.map;

module("Ember Router", {
  setup: function() {
    Router = Ember.Router.extend();
  },
  teardown: function() {
    Router = null;
  }
});

test("should create a router if one does not exist on the constructor", function() {
  var router = Router.create();
  ok(router.router);
});

test("should destroy its location upon Router.destroy.", function(){
  var router = Router.create(),
      location = router.get('location');

  Ember.run(router, 'destroy');

  ok(router.isDestroyed, "router should be destroyed");
  ok(location.isDestroyed, "location should be destroyed");
});

test("Ember.Router._routePath should consume identical prefixes", function() {

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

