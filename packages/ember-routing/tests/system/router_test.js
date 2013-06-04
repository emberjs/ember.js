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
