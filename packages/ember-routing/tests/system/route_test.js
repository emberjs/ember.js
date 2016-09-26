import { setOwner } from 'ember-utils';
import { runDestroy, buildOwner } from 'internal-test-helpers';
import {
  Service,
  Object as EmberObject,
  inject
} from 'ember-runtime';
import EmberRoute from '../../system/route';

let route, routeOne, routeTwo, lookupHash;

function setup() {
  route = EmberRoute.create();
}

function teardown() {
  runDestroy(route);
}

QUnit.module('Ember.Route', {
  setup: setup,
  teardown: teardown
});

QUnit.test('default store utilizes the container to acquire the model factory', function() {
  expect(4);

  let Post = EmberObject.extend();
  let post = {};

  Post.reopenClass({
    find(id) {
      return post;
    }
  });

  setOwner(route, buildOwner({
    ownerOptions: {
      hasRegistration() {
        return true;
      },

      factoryFor(fullName) {
        equal(fullName, 'model:post', 'correct factory was looked up');

        return {
          class: Post,
          create() {
            return Post.create();
          }
        };
      }
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

  let post = {
    id: 1
  };

  let Store = EmberObject.extend({
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
  let Post = EmberObject.extend();

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
  }, /You used the dynamic segment post_id in your route undefined, but <Ember.Object:ember\d+>.Post did not exist and you did not override your route\'s `model` hook./);
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
  let route = EmberRoute.extend({
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
  let route = EmberRoute.extend({
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

  let route = EmberRoute.extend({
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
  let model = { id: 2, firstName: 'Ned', lastName: 'Ryerson' };

  deepEqual(route.serialize(model, ['firstName', 'lastName']), { firstName: 'Ned', lastName: 'Ryerson' }, 'serialized correctly');
});

QUnit.test('returns model.id if params include *_id', function() {
  let model = { id: 2 };

  deepEqual(route.serialize(model, ['post_id']), { post_id: 2 }, 'serialized correctly');
});

QUnit.test('returns checks for existence of model.post_id before trying model.id', function() {
  let model = { post_id: 3 };

  deepEqual(route.serialize(model, ['post_id']), { post_id: 3 }, 'serialized correctly');
});

QUnit.test('returns undefined if model is not set', function() {
  equal(route.serialize(undefined, ['post_id']), undefined, 'serialized correctly');
});

QUnit.module('Ember.Route interaction', {
  setup() {
    let owner = {
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
  let testController = {};
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

  let appRoute = owner.lookup('route:application');
  let authService = owner.lookup('service:auth');

  equal(authService, appRoute.get('authService'), 'service.auth is injected');
});

QUnit.module('Ember.Route with engines');

QUnit.test('paramsFor considers an engine\'s mountPoint', function(assert) {
  expect(2);

  let router = {
    _deserializeQueryParams() {},
    router: {
      state: {
        handlerInfos: [
          { name: 'posts' }
        ],
        params: {
          'foo.bar': { a: 'b' },
          'foo.bar.posts': { c: 'd' }
        }
      }
    }
  };

  let engineInstance = buildOwner({
    ownerOptions: {
      routable: true,

      mountPoint: 'foo.bar',

      lookup(name) {
        if (name === 'route:posts') {
          return postsRoute;
        } else if (name === 'route:application') {
          return applicationRoute;
        }
      }
    }
  });

  let applicationRoute = EmberRoute.create({ router, routeName: 'application', fullRouteName: 'foo.bar' });
  let postsRoute = EmberRoute.create({ router, routeName: 'posts', fullRouteName: 'foo.bar.posts' });
  let route = EmberRoute.create({ router });

  setOwner(applicationRoute, engineInstance);
  setOwner(postsRoute, engineInstance);
  setOwner(route, engineInstance);

  assert.deepEqual(route.paramsFor('application'), { a: 'b' }, 'params match for root `application` route in engine');
  assert.deepEqual(route.paramsFor('posts'), { c: 'd' }, 'params match for `posts` route in engine');
});

QUnit.test('modelFor considers an engine\'s mountPoint', function() {
  expect(2);

  let applicationModel = { id: '1' };
  let postsModel = { id: '2' };

  let router = {
    router: {
      activeTransition: {
        resolvedModels: {
          'foo.bar': applicationModel,
          'foo.bar.posts': postsModel
        }
      }
    }
  };

  let engineInstance = buildOwner({
    ownerOptions: {
      routable: true,

      mountPoint: 'foo.bar',

      lookup(name) {
        if (name === 'route:posts') {
          return postsRoute;
        } else if (name === 'route:application') {
          return applicationRoute;
        }
      }
    }
  });

  let applicationRoute = EmberRoute.create({ router, routeName: 'application' });
  let postsRoute = EmberRoute.create({ router, routeName: 'posts' });
  let route = EmberRoute.create({ router });

  setOwner(applicationRoute, engineInstance);
  setOwner(postsRoute, engineInstance);
  setOwner(route, engineInstance);

  strictEqual(route.modelFor('application'), applicationModel);
  strictEqual(route.modelFor('posts'), postsModel);
});

QUnit.test('transitionTo considers an engine\'s mountPoint', function() {
  expect(4);

  let router = {
    transitionTo(route) {
      return route;
    }
  };

  let engineInstance = buildOwner({
    ownerOptions: {
      routable: true,
      mountPoint: 'foo.bar'
    }
  });

  let route = EmberRoute.create({ router });
  setOwner(route, engineInstance);

  strictEqual(route.transitionTo('application'), 'foo.bar.application', 'properly prefixes application route');
  strictEqual(route.transitionTo('posts'), 'foo.bar.posts', 'properly prefixes child routes');
  throws(() => route.transitionTo('/posts'), 'throws when trying to use a url');

  let queryParams = {};
  strictEqual(route.transitionTo(queryParams), queryParams, 'passes query param only transitions through');
});

QUnit.test('intermediateTransitionTo considers an engine\'s mountPoint', function() {
  expect(4);

  let lastRoute;
  let router = {
    intermediateTransitionTo(route) {
      lastRoute = route;
    }
  };

  let engineInstance = buildOwner({
    ownerOptions: {
      routable: true,
      mountPoint: 'foo.bar'
    }
  });

  let route = EmberRoute.create({ router });
  setOwner(route, engineInstance);

  route.intermediateTransitionTo('application');
  strictEqual(lastRoute, 'foo.bar.application', 'properly prefixes application route');

  route.intermediateTransitionTo('posts');
  strictEqual(lastRoute, 'foo.bar.posts', 'properly prefixes child routes');

  throws(() => route.intermediateTransitionTo('/posts'), 'throws when trying to use a url');

  let queryParams = {};
  route.intermediateTransitionTo(queryParams);
  strictEqual(lastRoute, queryParams, 'passes query param only transitions through');
});

QUnit.test('replaceWith considers an engine\'s mountPoint', function() {
  expect(4);

  let router = {
    replaceWith(route) {
      return route;
    }
  };

  let engineInstance = buildOwner({
    ownerOptions: {
      routable: true,
      mountPoint: 'foo.bar'
    }
  });

  let route = EmberRoute.create({ router });
  setOwner(route, engineInstance);

  strictEqual(route.replaceWith('application'), 'foo.bar.application', 'properly prefixes application route');
  strictEqual(route.replaceWith('posts'), 'foo.bar.posts', 'properly prefixes child routes');
  throws(() => route.replaceWith('/posts'), 'throws when trying to use a url');

  let queryParams = {};
  strictEqual(route.replaceWith(queryParams), queryParams, 'passes query param only transitions through');
});
