var route, routeOne, routeTwo, router, container, lookupHash;

module("Ember.Route", {
  setup: function() {
    route = Ember.Route.create();
  },

  teardown: function() {
    Ember.run(route, 'destroy');
  }
});

test("default store utilizes the container to acquire the model factory", function() {
  var Post, post;

  expect(4);

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
  equal(route.findModel('post', 1), post, '#findModel returns the correct post');

  function lookupFactory(fullName) {
    equal(fullName, "model:post", "correct factory was looked up");

    return Post;
  }

});

test("'store' can be injected by data persistence frameworks", function() {
  expect(8);
  Ember.run(route, 'destroy'); 

  var container = new Ember.Container();
  var post = {
    id: 1
  };

  var Store = Ember.Object.extend({
    find: function(type, value){
      ok(true, 'injected model was called');
      equal(type, 'post', 'correct type was called');
      equal(value, 1, 'correct value was called');
      return post;
    }
  });

  container.register('route:index',  Ember.Route);
  container.register('store:main', Store);

  container.injection('route', 'store', 'store:main');

  route = container.lookup('route:index');

  equal(route.model({ post_id: 1}), post, '#model returns the correct post');
  equal(route.findModel('post', 1), post, '#findModel returns the correct post');
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
