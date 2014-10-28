import run from "ember-metal/run_loop";
import Container from 'container/container';
import Service from "ember-runtime/system/service";
import EmberObject from "ember-runtime/system/object";
import EmberRoute from "ember-routing/system/route";
import inject from "ember-runtime/inject";

var route, routeOne, routeTwo, container, lookupHash;

function createRoute(){
  route = EmberRoute.create();
}

function cleanupRoute(){
  run(route, 'destroy');
}

QUnit.module("Ember.Route", {
  setup: createRoute,
  teardown: cleanupRoute
});

test("default store utilizes the container to acquire the model factory", function() {
  var Post, post;

  expect(4);

  post = {};

  Post = EmberObject.extend();
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
  route.set('_qp', null);

  equal(route.model({ post_id: 1}), post);
  equal(route.findModel('post', 1), post, '#findModel returns the correct post');

  function lookupFactory(fullName) {
    equal(fullName, "model:post", "correct factory was looked up");

    return Post;
  }

});

test("'store' can be injected by data persistence frameworks", function() {
  expect(8);
  run(route, 'destroy');

  var container = new Container();
  var post = {
    id: 1
  };

  var Store = EmberObject.extend({
    find: function(type, value){
      ok(true, 'injected model was called');
      equal(type, 'post', 'correct type was called');
      equal(value, 1, 'correct value was called');
      return post;
    }
  });

  container.register('route:index',  EmberRoute);
  container.register('store:main', Store);

  container.injection('route', 'store', 'store:main');

  route = container.lookup('route:index');

  equal(route.model({ post_id: 1}), post, '#model returns the correct post');
  equal(route.findModel('post', 1), post, '#findModel returns the correct post');
});

test("assert if 'store.find' method is not found", function() {
  expect(1);
  run(route, 'destroy');

  var container = new Container();
  var Post = EmberObject.extend();

  container.register('route:index', EmberRoute);
  container.register('model:post',  Post);

  route = container.lookup('route:index');

  expectAssertion(function() {
    route.findModel('post', 1);
  }, 'Post has no method `find`.');
});

test("asserts if model class is not found", function() {
  expect(1);
  run(route, 'destroy');

  var container = new Container();
  container.register('route:index', EmberRoute);

  route = container.lookup('route:index');

  expectAssertion(function() {
    route.model({ post_id: 1});
  }, "You used the dynamic segment post_id in your route undefined, but undefined.Post did not exist and you did not override your route's `model` hook.");
});

test("'store' does not need to be injected", function() {
  expect(1);

  run(route, 'destroy');

  var container = new Container();
  container.register('route:index',  EmberRoute);

  route = container.lookup('route:index');

  ignoreAssertion(function(){
    route.model({ post_id: 1});
  });

  ok(true, 'no error was raised');
});

test("modelFor doesn't require the router", function() {
  var container = new Container();
  route.container = container;

  var foo = { name: 'foo' };

  var fooRoute = EmberRoute.extend({
    container: container,
    currentModel: foo
  });

  container.register('route:foo', fooRoute);

  equal(route.modelFor('foo'), foo);
});

QUnit.module("Ember.Route serialize", {
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

QUnit.module("Ember.Route interaction", {
  setup: function() {
    container = {
      lookup: function(fullName) {
        return lookupHash[fullName];
      }
    };

    routeOne = EmberRoute.create({ container: container, routeName: 'one' });
    routeTwo = EmberRoute.create({ container: container, routeName: 'two' });

    lookupHash = {
      'route:one': routeOne,
      'route:two': routeTwo
    };
  },

  teardown: function() {
    run(function() {
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

if (Ember.FEATURES.isEnabled('ember-metal-injected-properties')) {
  QUnit.module('Route injected properties');

  test("services can be injected into routes", function() {
    var container = new Container();

    container.register('route:application', EmberRoute.extend({
      authService: inject.service('auth')
    }));

    container.register('service:auth', Service.extend());

    var appRoute = container.lookup('route:application'),
      authService = container.lookup('service:auth');

    equal(authService, appRoute.get('authService'), "service.auth is injected");
  });
}
