var route;

module("Ember.Route", {
  setup: function() {
    route = Ember.Route.create();
  },

  teardown: function() {
    Ember.run(route, 'destroy');
  }
});

test("default model utilizes the container to acquire the model factory", function() {
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

