var Router, container, router;

module("Ember Router", {
  setup: function() {
    container = new Ember.Container();

    //register the HashLocation (the default)
    container.register('location:hash', Ember.HashLocation);

    Router = Ember.Router.extend();

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

  Ember.run(container, 'destroy');

  ok(location.isDestroyed, "location should be destroyed");
});
