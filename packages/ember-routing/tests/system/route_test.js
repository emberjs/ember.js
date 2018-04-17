import { setOwner } from 'ember-owner';
import { runDestroy, buildOwner, moduleFor, AbstractTestCase } from 'internal-test-helpers';
import Service from '@ember/service';
import { Object as EmberObject, inject } from 'ember-runtime';
import EmberRoute from '../../lib/system/route';

let route, routeOne, routeTwo, lookupHash;

moduleFor(
  'Route',
  class extends AbstractTestCase {
    constructor() {
      super();
      route = EmberRoute.create();
    }

    teardown() {
      runDestroy(route);
    }

    ['@test default store utilizes the container to acquire the model factory'](assert) {
      assert.expect(4);

      let Post = EmberObject.extend();
      let post = {};

      Post.reopenClass({
        find() {
          return post;
        },
      });

      let ownerOptions = {
        ownerOptions: {
          hasRegistration() {
            return true;
          },
          factoryFor(fullName) {
            assert.equal(fullName, 'model:post', 'correct factory was looked up');

            return {
              class: Post,
              create() {
                return Post.create();
              },
            };
          },
        },
      };

      setOwner(route, buildOwner(ownerOptions));

      route.set('_qp', null);

      assert.equal(route.model({ post_id: 1 }), post);
      assert.equal(route.findModel('post', 1), post, '#findModel returns the correct post');
    }

    ["@test 'store' can be injected by data persistence frameworks"](assert) {
      assert.expect(8);
      runDestroy(route);

      let owner = buildOwner();

      let post = {
        id: 1,
      };

      let Store = EmberObject.extend({
        find(type, value) {
          assert.ok(true, 'injected model was called');
          assert.equal(type, 'post', 'correct type was called');
          assert.equal(value, 1, 'correct value was called');
          return post;
        },
      });

      owner.register('route:index', EmberRoute);
      owner.register('store:main', Store);

      owner.inject('route', 'store', 'store:main');

      route = owner.lookup('route:index');

      assert.equal(route.model({ post_id: 1 }), post, '#model returns the correct post');
      assert.equal(route.findModel('post', 1), post, '#findModel returns the correct post');
    }

    ["@test assert if 'store.find' method is not found"]() {
      runDestroy(route);

      let owner = buildOwner();
      let Post = EmberObject.extend();

      owner.register('route:index', EmberRoute);
      owner.register('model:post', Post);

      route = owner.lookup('route:index');

      expectAssertion(function() {
        route.findModel('post', 1);
      }, 'Post has no method `find`.');
    }

    ['@test asserts if model class is not found']() {
      runDestroy(route);

      let owner = buildOwner();
      owner.register('route:index', EmberRoute);

      route = owner.lookup('route:index');

      expectAssertion(function() {
        route.model({ post_id: 1 });
      }, /You used the dynamic segment post_id in your route undefined, but <Ember.Object:ember\d+>.Post did not exist and you did not override your route\'s `model` hook./);
    }

    ["@test 'store' does not need to be injected"](assert) {
      runDestroy(route);

      let owner = buildOwner();

      owner.register('route:index', EmberRoute);

      route = owner.lookup('route:index');

      ignoreAssertion(function() {
        route.model({ post_id: 1 });
      });

      assert.ok(true, 'no error was raised');
    }

    ["@test modelFor doesn't require the router"](assert) {
      let owner = buildOwner();
      setOwner(route, owner);

      let foo = { name: 'foo' };

      let FooRoute = EmberRoute.extend({
        currentModel: foo,
      });

      owner.register('route:foo', FooRoute);

      assert.strictEqual(route.modelFor('foo'), foo);
    }

    ['@test .send just calls an action if the router is absent'](assert) {
      assert.expect(7);
      let route = EmberRoute.extend({
        actions: {
          returnsTrue(foo, bar) {
            assert.equal(foo, 1);
            assert.equal(bar, 2);
            assert.equal(this, route);
            return true;
          },

          returnsFalse() {
            assert.ok(true, 'returnsFalse was called');
            return false;
          },
        },
      }).create();

      assert.equal(true, route.send('returnsTrue', 1, 2));
      assert.equal(false, route.send('returnsFalse'));
      assert.equal(undefined, route.send('nonexistent', 1, 2, 3));
    }

    ['@test .send just calls an action if the routers internal router property is absent'](assert) {
      assert.expect(7);
      let route = EmberRoute.extend({
        router: {},
        actions: {
          returnsTrue(foo, bar) {
            assert.equal(foo, 1);
            assert.equal(bar, 2);
            assert.equal(this, route);
            return true;
          },

          returnsFalse() {
            assert.ok(true, 'returnsFalse was called');
            return false;
          },
        },
      }).create();

      assert.equal(true, route.send('returnsTrue', 1, 2));
      assert.equal(false, route.send('returnsFalse'));
      assert.equal(undefined, route.send('nonexistent', 1, 2, 3));
    }

    ['@test .send asserts if called on a destroyed route']() {
      route.routeName = 'rip-alley';
      runDestroy(route);

      expectAssertion(() => {
        route.send('trigger-me-dead');
      }, "Attempted to call .send() with the action 'trigger-me-dead' on the destroyed route 'rip-alley'.");
    }
  }
);

moduleFor(
  'Route serialize',
  class extends AbstractTestCase {
    constructor() {
      super();
      route = EmberRoute.create();
    }

    teardown() {
      runDestroy(route);
    }

    ['@test returns the models properties if params does not include *_id'](assert) {
      let model = { id: 2, firstName: 'Ned', lastName: 'Ryerson' };

      assert.deepEqual(
        route.serialize(model, ['firstName', 'lastName']),
        { firstName: 'Ned', lastName: 'Ryerson' },
        'serialized correctly'
      );
    }

    ['@test returns model.id if params include *_id'](assert) {
      let model = { id: 2 };

      assert.deepEqual(route.serialize(model, ['post_id']), { post_id: 2 }, 'serialized correctly');
    }

    ['@test returns checks for existence of model.post_id before trying model.id'](assert) {
      let model = { post_id: 3 };

      assert.deepEqual(route.serialize(model, ['post_id']), { post_id: 3 }, 'serialized correctly');
    }

    ['@test returns undefined if model is not set'](assert) {
      assert.equal(route.serialize(undefined, ['post_id']), undefined, 'serialized correctly');
    }
  }
);

moduleFor(
  'Route interaction',
  class extends AbstractTestCase {
    constructor() {
      super();

      let owner = {
        lookup(fullName) {
          return lookupHash[fullName];
        },
      };

      routeOne = EmberRoute.create({ routeName: 'one' });
      routeTwo = EmberRoute.create({ routeName: 'two' });

      setOwner(routeOne, owner);
      setOwner(routeTwo, owner);

      lookupHash = {
        'route:one': routeOne,
        'route:two': routeTwo,
      };
    }

    teardown() {
      runDestroy(routeOne);
      runDestroy(routeTwo);
    }

    ['@test route._qp does not crash if the controller has no QP, or setProperties'](assert) {
      lookupHash['controller:test'] = {};

      routeOne.controllerName = 'test';
      let qp = routeOne.get('_qp');

      assert.deepEqual(qp.map, {}, 'map should be empty');
      assert.deepEqual(qp.propertyNames, [], 'property names should be empty');
      assert.deepEqual(qp.qps, [], 'qps is should be empty');
    }

    ["@test controllerFor uses route's controllerName if specified"](assert) {
      let testController = {};
      lookupHash['controller:test'] = testController;

      routeOne.controllerName = 'test';

      assert.equal(routeTwo.controllerFor('one'), testController);
    }
  }
);

moduleFor(
  'Route injected properties',
  class extends AbstractTestCase {
    ['@test services can be injected into routes'](assert) {
      let owner = buildOwner();

      owner.register(
        'route:application',
        EmberRoute.extend({
          authService: inject.service('auth'),
        })
      );

      owner.register('service:auth', Service.extend());

      let appRoute = owner.lookup('route:application');
      let authService = owner.lookup('service:auth');

      assert.equal(authService, appRoute.get('authService'), 'service.auth is injected');
    }
  }
);

moduleFor(
  'Route with engines',
  class extends AbstractTestCase {
    ["@test paramsFor considers an engine's mountPoint"](assert) {
      let router = {
        _deserializeQueryParams() {},
        _routerMicrolib: {
          state: {
            handlerInfos: [{ name: 'posts' }],
            params: {
              'foo.bar': { a: 'b' },
              'foo.bar.posts': { c: 'd' },
            },
          },
        },
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
          },
        },
      });

      let applicationRoute = EmberRoute.create({
        _router: router,
        routeName: 'application',
        fullRouteName: 'foo.bar',
      });
      let postsRoute = EmberRoute.create({
        _router: router,
        routeName: 'posts',
        fullRouteName: 'foo.bar.posts',
      });
      let route = EmberRoute.create({ _router: router });

      setOwner(applicationRoute, engineInstance);
      setOwner(postsRoute, engineInstance);
      setOwner(route, engineInstance);

      assert.deepEqual(
        route.paramsFor('application'),
        { a: 'b' },
        'params match for root `application` route in engine'
      );
      assert.deepEqual(
        route.paramsFor('posts'),
        { c: 'd' },
        'params match for `posts` route in engine'
      );
    }

    ["@test modelFor considers an engine's mountPoint"](assert) {
      let applicationModel = { id: '1' };
      let postsModel = { id: '2' };

      let router = {
        _routerMicrolib: {
          activeTransition: {
            resolvedModels: {
              'foo.bar': applicationModel,
              'foo.bar.posts': postsModel,
            },
          },
        },
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
          },
        },
      });

      let applicationRoute = EmberRoute.create({
        _router: router,
        routeName: 'application',
      });
      let postsRoute = EmberRoute.create({
        _router: router,
        routeName: 'posts',
      });
      let route = EmberRoute.create({ _router: router });

      setOwner(applicationRoute, engineInstance);
      setOwner(postsRoute, engineInstance);
      setOwner(route, engineInstance);

      assert.strictEqual(route.modelFor('application'), applicationModel);
      assert.strictEqual(route.modelFor('posts'), postsModel);
    }

    ["@test transitionTo considers an engine's mountPoint"](assert) {
      let router = {
        transitionTo(route) {
          return route;
        },
      };

      let engineInstance = buildOwner({
        ownerOptions: {
          routable: true,
          mountPoint: 'foo.bar',
        },
      });

      let route = EmberRoute.create({ _router: router });
      setOwner(route, engineInstance);

      assert.strictEqual(
        route.transitionTo('application'),
        'foo.bar.application',
        'properly prefixes application route'
      );
      assert.strictEqual(
        route.transitionTo('posts'),
        'foo.bar.posts',
        'properly prefixes child routes'
      );
      assert.throws(() => route.transitionTo('/posts'), 'throws when trying to use a url');

      let queryParams = {};
      assert.strictEqual(
        route.transitionTo(queryParams),
        queryParams,
        'passes query param only transitions through'
      );
    }

    ["@test intermediateTransitionTo considers an engine's mountPoint"](assert) {
      let lastRoute;
      let router = {
        intermediateTransitionTo(route) {
          lastRoute = route;
        },
      };

      let engineInstance = buildOwner({
        ownerOptions: {
          routable: true,
          mountPoint: 'foo.bar',
        },
      });

      let route = EmberRoute.create({ _router: router });
      setOwner(route, engineInstance);

      route.intermediateTransitionTo('application');
      assert.strictEqual(lastRoute, 'foo.bar.application', 'properly prefixes application route');

      route.intermediateTransitionTo('posts');
      assert.strictEqual(lastRoute, 'foo.bar.posts', 'properly prefixes child routes');

      assert.throws(
        () => route.intermediateTransitionTo('/posts'),
        'throws when trying to use a url'
      );

      let queryParams = {};
      route.intermediateTransitionTo(queryParams);
      assert.strictEqual(lastRoute, queryParams, 'passes query param only transitions through');
    }

    ["@test replaceWith considers an engine's mountPoint"](assert) {
      let router = {
        replaceWith(route) {
          return route;
        },
      };

      let engineInstance = buildOwner({
        ownerOptions: {
          routable: true,
          mountPoint: 'foo.bar',
        },
      });

      let route = EmberRoute.create({ _router: router });
      setOwner(route, engineInstance);

      assert.strictEqual(
        route.replaceWith('application'),
        'foo.bar.application',
        'properly prefixes application route'
      );
      assert.strictEqual(
        route.replaceWith('posts'),
        'foo.bar.posts',
        'properly prefixes child routes'
      );
      assert.throws(() => route.replaceWith('/posts'), 'throws when trying to use a url');

      let queryParams = {};
      assert.strictEqual(
        route.replaceWith(queryParams),
        queryParams,
        'passes query param only transitions through'
      );
    }

    ['@test `router` is a deprecated one-way alias to `_router`'](assert) {
      let router = {};
      let route = EmberRoute.create({ _router: router });
      expectDeprecation(function() {
        return assert.equal(route.router, router);
      }, 'Route#router is an intimate API that has been renamed to Route#_router. However you might want to consider using the router service');
    }
  }
);
