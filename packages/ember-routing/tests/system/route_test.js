var route, routeOne, routeTwo, router, container, lookupHash;

module("Ember.Route", {
  setup: function() {
    route = Ember.Route.create();
  },

  teardown: function() {
    Ember.run(route, 'destroy');
  }
});

test("default model utilizes the container to acquire the model factory", function() {
  var Post, post;

  expect(2);

  post = {};

  Post = Ember.Object.extend();
  Post.reopenClass({
    find: function(id) {
      return post;
    }
  });

  container = {
    lookupFactory: lookupFactory
  };

  route.container = container;

  equal(route.model({ post_id: 1}), post);

  function lookupFactory(fullName) {
    equal(fullName, "model:post", "correct factory was looked up");

    return Post.extend();
  }

});

module("Ember.Route interaction", {
  setup: function() {
    container = {
      lookup: function(fullName) {
        return lookupHash[fullName];
      }
    };

    routeOne = Ember.Route.create({ container: container, routeName: 'one' });
    routeTwo = Ember.Route.create({ container: container, routeName: 'two' });

    lookupHash = {
      'route:one': routeOne,
      'route:two': routeTwo
    };
  },

  teardown: function() {
    Ember.run(function() {
      routeOne.destroy();
      routeTwo.destroy();
    });
  }
});

test("controllerFor uses route's controllerName if specified", function() {
  var testController = {};
  lookupHash['controller:test'] = testController;

  routeOne.controllerName = 'test';

  equal(routeTwo.controllerFor('one'), testController);
});
