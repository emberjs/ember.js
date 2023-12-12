import HashLocation from '@ember/routing/hash-location';
import HistoryLocation from '@ember/routing/history-location';
import NoneLocation from '@ember/routing/none-location';
import Router, { triggerEvent } from '@ember/routing/router';
import { runDestroy, buildOwner, moduleFor, AbstractTestCase } from 'internal-test-helpers';

let owner;

function createRouter({ settings = {}, options = {} } = {}) {
  let CustomRouter = class extends Router {};
  let router = new CustomRouter(owner);
  for (let setting in settings) {
    router[setting] = settings[setting];
  }

  if (!options.disableSetup) {
    router.setupRouter();
  }

  return router;
}

moduleFor(
  'Ember Router',
  class extends AbstractTestCase {
    constructor() {
      super();
      owner = buildOwner();

      //register the HashLocation (the default)
      owner.register('location:hash', HashLocation);
      owner.register('location:history', HistoryLocation);
      owner.register('location:none', NoneLocation);
    }

    teardown() {
      runDestroy(owner);
      owner = null;
    }

    ['@test [GH#15237] EmberError is imported correctly'](assert) {
      // If we get the right message it means Error is being imported correctly.
      assert.throws(function () {
        triggerEvent(null, false, []);
      }, /because your app hasn't finished transitioning/);
    }

    ['@test should not create a router.js instance upon init'](assert) {
      let router = createRouter({ options: { disableSetup: true } });

      assert.ok(!router._routerMicrolib);
    }

    ['@test should create a router.js instance after setupRouter'](assert) {
      let router = createRouter({ options: { disableSetup: false } });

      assert.ok(router._didSetupRouter);
      assert.ok(router._routerMicrolib);
    }

    ['@test should return false if setupRouter is called multiple times'](assert) {
      let router = createRouter({ options: { disableSetup: true } });

      assert.ok(router.setupRouter());
      assert.notOk(router.setupRouter());
    }

    ['@test should not reify location until setupRouter is called'](assert) {
      let router = createRouter({ options: { disableSetup: true } });
      assert.equal(typeof router.location, 'string', 'location is specified as a string');

      router.setupRouter();

      assert.equal(typeof router.location, 'object', 'location is reified into an object');
    }

    ['@test should destroy its location upon destroying the routers owner.'](assert) {
      let router = createRouter();
      let location = router.get('location');

      runDestroy(owner);

      assert.ok(location.isDestroyed, 'location should be destroyed');
    }

    ['@test should instantiate its location with its `rootURL`'](assert) {
      let router = createRouter({
        settings: {
          rootURL: '/rootdir/',
        },
      });

      let location = router.get('location');

      assert.equal(location.get('rootURL'), '/rootdir/');
    }

    ['@test Router._routePath should consume identical prefixes'](assert) {
      createRouter();

      function routePath() {
        let routeInfos = Array.prototype.slice.call(arguments).map(function (s) {
          return { name: s };
        });
        routeInfos.unshift({ name: 'ignored' });

        return Router._routePath(routeInfos);
      }

      assert.equal(routePath('foo'), 'foo');
      assert.equal(routePath('foo', 'bar', 'baz'), 'foo.bar.baz');
      assert.equal(routePath('foo', 'foo.bar'), 'foo.bar');
      assert.equal(routePath('foo', 'foo.bar', 'foo.bar.baz'), 'foo.bar.baz');
      assert.equal(routePath('foo', 'foo.bar', 'foo.bar.baz.wow'), 'foo.bar.baz.wow');
      assert.equal(routePath('foo', 'foo.bar.baz.wow'), 'foo.bar.baz.wow');
      assert.equal(routePath('foo.bar', 'bar.baz.wow'), 'foo.bar.baz.wow');

      // This makes no sense, not trying to handle it, just
      // making sure it doesn't go boom.
      assert.equal(routePath('foo.bar.baz', 'foo'), 'foo.bar.baz.foo');
    }

    ['@test Router should cancel routing setup when the Location class says so via cancelRouterSetup'](
      assert
    ) {
      assert.expect(0);

      let router;
      let FakeLocation = {
        cancelRouterSetup: true,
        create() {
          return this;
        },
      };

      owner.register('location:fake', FakeLocation);

      router = createRouter({
        location: 'fake',

        _setupRouter() {
          assert.ok(false, '_setupRouter should not be called');
        },
      });

      router.startRouting();
    }

    ['@test Router#handleURL should remove any #hashes before doing URL transition'](assert) {
      assert.expect(2);

      let router = createRouter({
        settings: {
          _doURLTransition(routerJsMethod, url) {
            assert.equal(routerJsMethod, 'handleURL');
            assert.equal(url, '/foo/bar?time=morphin');
          },
        },
      });

      router.handleURL('/foo/bar?time=morphin#pink-power-ranger');
    }

    ['@test Router#triggerEvent allows actions to bubble when returning true'](assert) {
      assert.expect(2);

      let routeInfos = [
        {
          name: 'application',
          route: {
            actions: {
              loading() {
                assert.ok(false, 'loading not handled by application route');
              },
            },
          },
        },
        {
          name: 'about',
          route: {
            actions: {
              loading() {
                assert.ok(true, 'loading handled by about route');
                return false;
              },
            },
          },
        },
        {
          name: 'about.me',
          route: {
            actions: {
              loading() {
                assert.ok(true, 'loading handled by about.me route');
                return true;
              },
            },
          },
        },
      ];

      triggerEvent(routeInfos, false, ['loading']);
    }

    ['@test Router#triggerEvent ignores handlers that have not loaded yet'](assert) {
      assert.expect(1);

      let routeInfos = [
        {
          name: 'about',
          route: {
            actions: {
              loading() {
                assert.ok(true, 'loading handled by about route');
              },
            },
          },
        },
        {
          name: 'about.me',
          route: undefined,
        },
      ];

      triggerEvent(routeInfos, false, ['loading']);
    }

    ['@test transitionTo should throw an error when called after owner is destroyed']() {
      let router = createRouter();

      runDestroy(router);

      router.currentRouteName = 'route-a';

      expectAssertion(function () {
        router.transitionTo('route-b');
      }, "A transition was attempted from 'route-a' to 'route-b' but the application instance has already been destroyed.");

      expectAssertion(function () {
        router.transitionTo('./route-b/1');
      }, "A transition was attempted from 'route-a' to './route-b/1' but the application instance has already been destroyed.");
    }

    ['@test computed url when location is a string should not crash'](assert) {
      let router = createRouter({ options: { disableSetup: true } });
      assert.equal(router.url, undefined);
    }
  }
);
