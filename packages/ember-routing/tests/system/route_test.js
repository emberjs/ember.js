import { runDestroy } from 'ember-runtime/tests/utils';
import Service from 'ember-runtime/system/service';
import EmberObject from 'ember-runtime/system/object';
import EmberRoute from 'ember-routing/system/route';
import inject from 'ember-runtime/inject';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { setOwner } from 'container/owner';

var route, routeOne, routeTwo, lookupHash;

function setup() {
  route = EmberRoute.create();
}

function teardown() {
  runDestroy(route);
}

QUnit.module('Ember.Route', {
  setup,
  teardown
});

QUnit.test('default store utilizes the container to acquire the model factory', function() {
  expect(4);

  var Post = EmberObject.extend();
  var post = {};

  Post.reopenClass({
    find(id) {
      return post;
    }
  });

  setOwner(route, buildOwner({
    hasRegistration() {
      return true;
    },

    _lookupFactory(fullName) {
      equal(fullName, 'model:post', 'correct factory was looked up');

      return Post;
    }
  }));

  route.set('_qp', null);

  equal(route.model({ post_id: 1 }), post);
  equal(route.findModel('post', 1), post, '#findModel returns the correct post');
});

QUnit.test('\'store\' can be injected by data persistence frameworks', function() {
  expect(8);
  runDestroy(route);

  let owner = buildOwner();

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

  owner.register('route:index', EmberRoute);
  owner.register('store:main', Store);

  owner.inject('route', 'store', 'store:main');

  route = owner.lookup('route:index');

  equal(route.model({ post_id: 1 }), post, '#model returns the correct post');
  equal(route.findModel('post', 1), post, '#findModel returns the correct post');
});

QUnit.test('assert if \'store.find\' method is not found', function() {
  expect(1);
  runDestroy(route);

  let owner = buildOwner();
  var Post = EmberObject.extend();

  owner.register('route:index', EmberRoute);
  owner.register('model:post', Post);

  route = owner.lookup('route:index');

  expectAssertion(function() {
    route.findModel('post', 1);
  }, 'Post has no method `find`.');
});

QUnit.test('asserts if model class is not found', function() {
  expect(1);
  runDestroy(route);

  let owner = buildOwner();
  owner.register('route:index', EmberRoute);

  route = owner.lookup('route:index');

  expectAssertion(function() {
    route.model({ post_id: 1 });
  }, 'You used the dynamic segment post_id in your route undefined, but undefined.Post did not exist and you did not override your route\'s `model` hook.');
});

QUnit.test('\'store\' does not need to be injected', function() {
  expect(1);

  runDestroy(route);

  let owner = buildOwner();

  owner.register('route:index', EmberRoute);

  route = owner.lookup('route:index');

  ignoreAssertion(function() {
    route.model({ post_id: 1 });
  });

  ok(true, 'no error was raised');
});

QUnit.test('modelFor doesn\'t require the router', function() {
  expect(1);

  let owner = buildOwner();
  setOwner(route, owner);

  let foo = { name: 'foo' };

  let FooRoute = EmberRoute.extend({
    currentModel: foo
  });

  owner.register('route:foo', FooRoute);

  strictEqual(route.modelFor('foo'), foo);
});

QUnit.test('.send just calls an action if the router is absent', function() {
  expect(7);
  var route = EmberRoute.extend({
    actions: {
      returnsTrue(foo, bar) {
        equal(foo, 1);
        equal(bar, 2);
        equal(this, route);
        return true;
      },

      returnsFalse() {
        ok(true, 'returnsFalse was called');
        return false;
      }
    }
  }).create();

  equal(true, route.send('returnsTrue', 1, 2));
  equal(false, route.send('returnsFalse'));
  equal(undefined, route.send('nonexistent', 1, 2, 3));
});

QUnit.test('.send just calls an action if the routers internal router property is absent', function() {
  expect(7);
  var route = EmberRoute.extend({
    router: { },
    actions: {
      returnsTrue(foo, bar) {
        equal(foo, 1);
        equal(bar, 2);
        equal(this, route);
        return true;
      },

      returnsFalse() {
        ok(true, 'returnsFalse was called');
        return false;
      }
    }
  }).create();

  equal(true, route.send('returnsTrue', 1, 2));
  equal(false, route.send('returnsFalse'));
  equal(undefined, route.send('nonexistent', 1, 2, 3));
});

QUnit.test('can access `actions` hash via `_actions` [DEPRECATED]', function() {
  expect(2);

  var route = EmberRoute.extend({
    actions: {
      foo: function() {
        ok(true, 'called foo action');
      }
    }
  }).create();

  expectDeprecation(function() {
    route._actions.foo();
  }, 'Usage of `_actions` is deprecated, use `actions` instead.');
});

QUnit.test('actions in both `_actions` and `actions` results in an assertion', function() {
  expectAssertion(function() {
    EmberRoute.extend({
      _actions: { },
      actions: { }
    }).create();
  }, 'Specifying `_actions` and `actions` in the same mixin is not supported.');
});

QUnit.test('actions added via `_actions` can be used [DEPRECATED]', function() {
  expect(3);

  let route;
  expectDeprecation(function() {
    route = EmberRoute.extend({
      _actions: {
        bar: function() {
          ok(true, 'called bar action');
        }
      }
    }, {
      actions: {
        foo: function() {
          ok(true, 'called foo action');
        }
      }
    }).create();
  }, 'Specifying actions in `_actions` is deprecated, please use `actions` instead.');

  route.send('foo');
  route.send('bar');
});

QUnit.module('Ember.Route serialize', {
  setup: setup,
  teardown: teardown
});

QUnit.test('returns the models properties if params does not include *_id', function() {
  var model = { id: 2, firstName: 'Ned', lastName: 'Ryerson' };

  deepEqual(route.serialize(model, ['firstName', 'lastName']), { firstName: 'Ned', lastName: 'Ryerson' }, 'serialized correctly');
});

QUnit.test('returns model.id if params include *_id', function() {
  var model = { id: 2 };

  deepEqual(route.serialize(model, ['post_id']), { post_id: 2 }, 'serialized correctly');
});

QUnit.test('returns checks for existence of model.post_id before trying model.id', function() {
  var model = { post_id: 3 };

  deepEqual(route.serialize(model, ['post_id']), { post_id: 3 }, 'serialized correctly');
});

QUnit.test('returns undefined if model is not set', function() {
  equal(route.serialize(undefined, ['post_id']), undefined, 'serialized correctly');
});

QUnit.module('Ember.Route interaction', {
  setup() {
    var owner = {
      lookup(fullName) {
        return lookupHash[fullName];
      }
    };

    routeOne = EmberRoute.create({ routeName: 'one' });
    routeTwo = EmberRoute.create({ routeName: 'two' });

    setOwner(routeOne, owner);
    setOwner(routeTwo, owner);

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

QUnit.test('controllerFor uses route\'s controllerName if specified', function() {
  var testController = {};
  lookupHash['controller:test'] = testController;

  routeOne.controllerName = 'test';

  equal(routeTwo.controllerFor('one'), testController);
});

QUnit.module('Route injected properties');

QUnit.test('services can be injected into routes', function() {
  let owner = buildOwner();

  owner.register('route:application', EmberRoute.extend({
    authService: inject.service('auth')
  }));

  owner.register('service:auth', Service.extend());

  var appRoute = owner.lookup('route:application');
  var authService = owner.lookup('service:auth');

  equal(authService, appRoute.get('authService'), 'service.auth is injected');
});
