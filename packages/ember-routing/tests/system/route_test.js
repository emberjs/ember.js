var route;

module("Ember.Route", {
  setup: function() {
    route = Ember.Route.create();
  },

  teardown: function() {
    Ember.run(route, 'destroy');
  }
});

test("default model utilizes the container to acquire the model factory", function(){
  var container, Post, post;

  expect(2);

  post = {};

  Post = {
    find: function(id) {
      return post;
    }
  };

  container = {
    lookupFactory: lookupFactory
  };

  route.container = container;

  equal(route.model({ post_id: 1}), post);

  function lookupFactory(fullName) {
    equal(fullName, "model:post", "correct factory was looked up");

    return Post;
  }
});

test("Route#viewFor", function(){
  ok(route.viewFor, 'function is present');

  var lookup = {
    'view:application': {}
  };

  route.container = {
    lookup: function(fullName) {
      return lookup[fullName];
    }
  };

  equal(route.viewFor('unknown'), undefined, 'returns undefined for unknown for lookup');
  equal(route.viewFor('application'), lookup['view:application'], 'return the correct view on valid lookup');
});
