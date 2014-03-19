import run from "ember-metal/run_loop";
import EnumerableUtils from "ember-metal/enumerable_utils";
import Container from 'container/container';
import HashLocation from "ember-routing/location/hash_location";
import EmberRouter from "ember-routing/system/router";

var Router, container, router;

var map = EnumerableUtils.map;

module("Ember Router", {
  setup: function() {
    container = new Container();

    //register the HashLocation (the default)
    container.register('location:hash', HashLocation);

    Router = EmberRouter.extend();

    router = Router.create({container: container});
  },
  teardown: function() {
    Router = null;
  }
});

test("should create a router if one does not exist on the constructor", function() {
  ok(router.router);
});

test("should destroy its location upon destroying the routers container.", function(){
  var location = router.get('location');

  run(container, 'destroy');

  ok(location.isDestroyed, "location should be destroyed");
});

test("Ember.Router._routePath should consume identical prefixes", function() {

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

