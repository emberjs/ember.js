var Router;

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
