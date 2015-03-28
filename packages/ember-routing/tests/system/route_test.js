import { runDestroy } from "ember-runtime/tests/utils";
import Registry from "container/registry";
import Service from "ember-runtime/system/service";
import EmberObject from "ember-runtime/system/object";
import EmberRoute from "ember-routing/system/route";
import inject from "ember-runtime/inject";

var route, routeOne, routeTwo, lookupHash;

function setup() {
  route = EmberRoute.create();
}

function teardown() {
  runDestroy(route);
}

QUnit.module("Ember.Route", {
  setup: setup,
  teardown: teardown
});

QUnit.test("default store utilizes the container to acquire the model factory", function() {
  expect(4);

  var Post = EmberObject.extend();
  var post = {};

  Post.reopenClass({
    find(id) {
      return post;
    }
  });

  route.container = {
    has() {
      return true;
    },

    lookupFactory(fullName) {
      equal(fullName, "model:post", "correct factory was looked up");

      return Post;
    }
  };

  route.set('_qp', null);

  equal(route.model({ post_id: 1 }), post);
  equal(route.findModel('post', 1), post, '#findModel returns the correct post');
});

QUnit.test("'store' can be injected by data persistence frameworks", function() {
  expect(8);
  runDestroy(route);

  var registry = new Registry();
  var container = registry.container();
  var post = {
    id: 1
  };

  var Store = EmberObject.extend({
    find(type, value) {
      ok(true, 'injected model was called');
      equal(type, 'post', 'correct type was called');
      equal(value, 1, 'correct value was called');
      return post;
    }
  });

  registry.register('route:index', EmberRoute);
  registry.register('store:main', Store);

  registry.injection('route', 'store', 'store:main');

  route = container.lookup('route:index');

  equal(route.model({ post_id: 1 }), post, '#model returns the correct post');
  equal(route.findModel('post', 1), post, '#findModel returns the correct post');
});

QUnit.test("assert if 'store.find' method is not found", function() {
  expect(1);
  runDestroy(route);

  var registry = new Registry();
  var container = registry.container();
  var Post = EmberObject.extend();

  registry.register('route:index', EmberRoute);
  registry.register('model:post', Post);

  route = container.lookup('route:index');

  expectAssertion(function() {
    route.findModel('post', 1);
  }, 'Post has no method `find`.');
});

QUnit.test("asserts if model class is not found", function() {
  expect(1);
  runDestroy(route);

  var registry = new Registry();
  var container = registry.container();
  registry.register('route:index', EmberRoute);

  route = container.lookup('route:index');

  expectAssertion(function() {
    route.model({ post_id: 1 });
  }, "You used the dynamic segment post_id in your route undefined, but undefined.Post did not exist and you did not override your route's `model` hook.");
});

QUnit.test("'store' does not need to be injected", function() {
  expect(1);

  runDestroy(route);

  var registry = new Registry();
  var container = registry.container();

  registry.register('route:index', EmberRoute);

  route = container.lookup('route:index');

  ignoreAssertion(function() {
    route.model({ post_id: 1 });
  });

  ok(true, 'no error was raised');
});

QUnit.test("modelFor doesn't require the router", function() {
  var registry = new Registry();
  var container = registry.container();
  route.container = container;

  var foo = { name: 'foo' };

  var fooRoute = EmberRoute.extend({
    container: container,
    currentModel: foo
  });

  registry.register('route:foo', fooRoute);

  equal(route.modelFor('foo'), foo);
});


QUnit.test(".send just calls an action if the router is absent", function() {
  expect(7);
  var route = EmberRoute.createWithMixins({
    actions: {
      returnsTrue(foo, bar) {
        equal(foo, 1);
        equal(bar, 2);
        equal(this, route);
        return true;
      },

      returnsFalse() {
        ok(true, "returnsFalse was called");
        return false;
      }
    }
  });

  equal(true, route.send('returnsTrue', 1, 2));
  equal(false, route.send('returnsFalse'));
  equal(undefined, route.send('nonexistent', 1, 2, 3));
});


QUnit.module("Ember.Route serialize", {
  setup: setup,
  teardown: teardown
});

QUnit.test("returns the models properties if params does not include *_id", function() {
  var model = { id: 2, firstName: 'Ned', lastName: 'Ryerson' };

  deepEqual(route.serialize(model, ['firstName', 'lastName']), { firstName: 'Ned', lastName: 'Ryerson' }, "serialized correctly");
});

QUnit.test("returns model.id if params include *_id", function() {
  var model = { id: 2 };

  deepEqual(route.serialize(model, ['post_id']), { post_id: 2 }, "serialized correctly");
});

QUnit.test("returns checks for existence of model.post_id before trying model.id", function() {
  var model = { post_id: 3 };

  deepEqual(route.serialize(model, ['post_id']), { post_id: 3 }, "serialized correctly");
});

QUnit.test("returns undefined if model is not set", function() {
  equal(route.serialize(undefined, ['post_id']), undefined, "serialized correctly");
});

QUnit.module("Ember.Route interaction", {
  setup() {
    var container = {
      lookup(fullName) {
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

  teardown() {
    runDestroy(routeOne);
    runDestroy(routeTwo);
  }
});

QUnit.test("controllerFor uses route's controllerName if specified", function() {
  var testController = {};
  lookupHash['controller:test'] = testController;

  routeOne.controllerName = 'test';

  equal(routeTwo.controllerFor('one'), testController);
});

QUnit.module('Route injected properties');

QUnit.test("services can be injected into routes", function() {
  var registry = new Registry();
  var container = registry.container();

  registry.register('route:application', EmberRoute.extend({
    authService: inject.service('auth')
  }));

  registry.register('service:auth', Service.extend());

  var appRoute = container.lookup('route:application');
  var authService = container.lookup('service:auth');

  equal(authService, appRoute.get('authService'), "service.auth is injected");
});
