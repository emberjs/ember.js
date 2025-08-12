import { setOwner } from '@ember/-internals/owner';
import { runDestroy, buildOwner, moduleFor, AbstractTestCase } from 'internal-test-helpers';
import Service, { service } from '@ember/service';
import EmberRoute from '@ember/routing/route';
import ObjectProxy from '@ember/object/proxy';
import { getDebugFunction, setDebugFunction } from '@ember/debug';

let route, routeOne, routeTwo, lookupHash;

moduleFor(
  'Route',
  class extends AbstractTestCase {
    constructor() {
      super();
      route = EmberRoute.create();
    }

    teardown() {
      super.teardown();
      runDestroy(route);
      route = routeOne = routeTwo = lookupHash = undefined;
    }

    ['@test default store can be overridden'](assert) {
      runDestroy(route);

      let calledFind = false;
      route = class extends EmberRoute {
        store = {
          find() {
            calledFind = true;
          },
        };
      }.create();

      route.store.find();
      assert.true(calledFind, 'store.find was called');
    }

    ["@test modelFor doesn't require the router"](assert) {
      let owner = buildOwner();
      setOwner(route, owner);

      let foo = { name: 'foo' };

      let FooRoute = class extends EmberRoute {
        currentModel = foo;
      };

      owner.register('route:foo', FooRoute);

      assert.strictEqual(route.modelFor('foo'), foo);

      runDestroy(owner);
    }

    ['@test _optionsForQueryParam should work with nested properties'](assert) {
      let route = class extends EmberRoute {
        queryParams = {
          'nested.foo': {
            // By default, controller query param properties don't
            // cause a full transition when they are changed, but
            // rather only cause the URL to update. Setting
            // `refreshModel` to true will cause an "in-place"
            // transition to occur, whereby the model hooks for
            // this route (and any child routes) will re-fire, allowing
            // you to reload models (e.g., from the server) using the
            // updated query param values.
            refreshModel: true,

            // By default, the query param URL key is the same name as
            // the controller property name. Use `as` to specify a
            // different URL key.
            as: 'foobar',
          },
        };
      }.create();

      assert.strictEqual(
        route._optionsForQueryParam({
          prop: 'nested.foo',
          urlKey: 'foobar',
        }),
        route.queryParams['nested.foo']
      );
    }

    ["@test modelFor doesn't require the routerMicrolib"](assert) {
      let route = EmberRoute.create({
        _router: { _routerMicrolib: null },
      });

      let owner = buildOwner();
      setOwner(route, owner);

      let foo = { name: 'foo' };

      let FooRoute = class extends EmberRoute {
        currentModel = foo;
      };

      owner.register('route:foo', FooRoute);

      assert.strictEqual(route.modelFor('foo'), foo);

      runDestroy(owner);
    }

    ['@test .send just calls an action if the router is absent'](assert) {
      assert.expect(7);
      let route = class extends EmberRoute {
        actions = {
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
        };
      }.create();

      assert.equal(route.send('returnsTrue', 1, 2), true);
      assert.equal(route.send('returnsFalse'), false);
      assert.equal(route.send('nonexistent', 1, 2, 3), undefined);

      runDestroy(route);
    }

    ['@test .send just calls an action if the routers internal router property is absent'](assert) {
      assert.expect(7);
      let route = class extends EmberRoute {
        router = {};
        actions = {
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
        };
      }.create();

      assert.equal(true, route.send('returnsTrue', 1, 2));
      assert.equal(false, route.send('returnsFalse'));
      assert.equal(undefined, route.send('nonexistent', 1, 2, 3));

      runDestroy(route);
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

    ['@test returns model.id if model is a Proxy'](assert) {
      let model = ObjectProxy.create({ content: { id: 3 } });

      assert.deepEqual(route.serialize(model, ['id']), { id: 3 }, 'serialized Proxy correctly');
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

      // Disable assertions for these tests so we can use fake controllers
      this.originalAssert = getDebugFunction('assert');
      setDebugFunction('assert', () => {});

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
      setDebugFunction('assert', this.originalAssert);
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
        class extends EmberRoute {
          @service('auth')
          authService;
        }
      );

      owner.register('service:auth', class extends Service {});

      let appRoute = owner.lookup('route:application');
      let authService = owner.lookup('service:auth');

      assert.equal(authService, appRoute.get('authService'), 'service.auth is injected');

      runDestroy(owner);
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
            routeInfos: [{ name: 'posts' }],
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

      runDestroy(engineInstance);
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

      runDestroy(engineInstance);
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

      runDestroy(engineInstance);
    }
  }
);
