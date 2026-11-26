import { setOwner } from '@ember/-internals/owner';
import { runDestroy, buildOwner, moduleFor, AbstractTestCase } from 'internal-test-helpers';
import RouterService, { ROUTER } from '@ember/routing/router-service';

moduleFor(
  'RouterService with engines',
  class extends AbstractTestCase {
    ["@test transitionTo considers an engine's mountPoint"](assert) {
      let lastArgs;
      let router = {
        _doTransition(...args) {
          lastArgs = args;
          return { route: args[0] };
        },
      };

      let engineInstance = buildOwner({
        ownerOptions: {
          routable: true,
          mountPoint: 'foo.bar',
        },
      });

      let routerService = RouterService.create();
      routerService[ROUTER] = router;
      setOwner(routerService, engineInstance);

      assert.strictEqual(
        routerService.transitionTo('application').route,
        'foo.bar.application',
        'properly prefixes application route'
      );

      assert.strictEqual(
        routerService.transitionTo('posts').route,
        'foo.bar.posts',
        'properly prefixes child routes'
      );

      assert.strictEqual(lastArgs[0], 'foo.bar.posts', 'transition used the prefixed route name');

      assert.throws(() => routerService.transitionTo('/posts'), 'throws when trying to use a url');

      routerService.transitionTo({ queryParams: { foo: 'bar' } });
      assert.strictEqual(
        lastArgs[0],
        undefined,
        'passes query param only transitions through without a route name'
      );
      assert.deepEqual(lastArgs[2], { foo: 'bar' }, 'passes query params through');

      runDestroy(engineInstance);
    }

    ['@test transitionTo does not prefix outside an engine'](assert) {
      let lastRoute;
      let router = {
        _doTransition(route) {
          lastRoute = route;
          return { route };
        },
      };

      let owner = buildOwner();

      let routerService = RouterService.create();
      routerService[ROUTER] = router;
      setOwner(routerService, owner);

      routerService.transitionTo('posts');

      assert.strictEqual(lastRoute, 'posts', 'route name is left alone outside an engine');

      runDestroy(owner);
    }

    ["@test urlFor considers an engine's mountPoint"](assert) {
      let lastRoute;
      let router = {
        setupRouter() {},
        generate(routeName) {
          lastRoute = routeName;
          return `/${routeName}`;
        },
      };

      let engineInstance = buildOwner({
        ownerOptions: {
          routable: true,
          mountPoint: 'foo.bar',
        },
      });

      let routerService = RouterService.create();
      routerService[ROUTER] = router;
      setOwner(routerService, engineInstance);

      assert.strictEqual(
        routerService.urlFor('posts'),
        '/foo.bar.posts',
        'generates a URL for the prefixed route name'
      );
      assert.strictEqual(lastRoute, 'foo.bar.posts', 'generate received the prefixed route name');

      runDestroy(engineInstance);
    }

    ["@test isActive considers an engine's mountPoint"](assert) {
      let lastRoute;
      let router = {
        setupRouter() {},
        _routerMicrolib: {
          isActiveIntent(routeName) {
            lastRoute = routeName;
            return routeName === 'foo.bar.posts';
          },
        },
      };

      let engineInstance = buildOwner({
        ownerOptions: {
          routable: true,
          mountPoint: 'foo.bar',
        },
      });

      let routerService = RouterService.create();
      routerService[ROUTER] = router;
      setOwner(routerService, engineInstance);

      assert.true(routerService.isActive('posts'), 'isActive matches the prefixed route name');
      assert.strictEqual(
        lastRoute,
        'foo.bar.posts',
        'isActiveIntent received the prefixed route name'
      );
      assert.false(routerService.isActive('other'), 'isActive does not match other routes');

      runDestroy(engineInstance);
    }

    ["@test refresh considers an engine's mountPoint"](assert) {
      let refreshedRoute;
      let router = {
        setupRouter() {},
        hasRoute(routeName) {
          return routeName === 'foo.bar.posts';
        },
        _routerMicrolib: {
          isActiveIntent(routeName) {
            return routeName === 'foo.bar.posts';
          },
          refresh(routeName) {
            refreshedRoute = routeName;
            return { route: routeName };
          },
        },
      };

      let engineInstance = buildOwner({
        ownerOptions: {
          routable: true,
          mountPoint: 'foo.bar',
        },
      });

      let routerService = RouterService.create();
      routerService[ROUTER] = router;
      setOwner(routerService, engineInstance);

      routerService.refresh('posts');

      assert.strictEqual(refreshedRoute, 'foo.bar.posts', 'refresh used the prefixed route name');

      runDestroy(engineInstance);
    }
  }
);
