var route, routeOne, routeTwo, router, container, lookupHash;

function createRoute(){
  route = Ember.Route.create();
}

function cleanupRoute(){
  Ember.run(route, 'destroy');
}

module("Ember.Route", {
  setup: createRoute,
  teardown: cleanupRoute
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
    has: function() { return true; },
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

test("asserts if model class is not found", function() {
  expect(1);
  Ember.run(route, 'destroy');

  var container = new Ember.Container();
  container.register('route:index',  Ember.Route);

  route = container.lookup('route:index');

  expectAssertion(function() {
    route.model({ post_id: 1});
  }, "You used the dynamic segment post_id in your route undefined, but undefined.Post did not exist and you did not override your route's `model` hook.");
});

test("'store' does not need to be injected", function() {
  expect(1);

  Ember.run(route, 'destroy');
  var originalAssert = Ember.assert;

  var container = new Ember.Container();
  container.register('route:index',  Ember.Route);

  route = container.lookup('route:index');

  ignoreAssertion(function(){
    route.model({ post_id: 1});
  });

  ok(true, 'no error was raised');
});

module("Ember.Route serialize", {
  setup: createRoute,
  teardown: cleanupRoute
});

test("returns the models properties if params does not include *_id", function(){
  var model = {id: 2, firstName: 'Ned', lastName: 'Ryerson'};

  deepEqual(route.serialize(model, ['firstName', 'lastName']), {firstName: 'Ned', lastName: 'Ryerson'}, "serialized correctly");
});

test("returns model.id if params include *_id", function(){
  var model = {id: 2};

  deepEqual(route.serialize(model, ['post_id']), {post_id: 2}, "serialized correctly");
});

test("returns undefined if model is not set", function(){
  equal(route.serialize(undefined, ['post_id']), undefined, "serialized correctly");
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

