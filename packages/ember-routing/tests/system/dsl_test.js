import { setOwner } from 'ember-utils';
import EmberRouter from '../../system/router';
import { buildOwner, moduleFor, AbstractTestCase } from 'internal-test-helpers';

let Router;

moduleFor(
  'Ember Router DSL',
  class extends AbstractTestCase {
    constructor() {
      super();
      Router = EmberRouter.extend();
    }

    teardown() {
      Router = null;
    }

    ['@test should fail when using a reserved route name'](assert) {
      let reservedNames = ['array', 'basic', 'object', 'application'];

      assert.expect(reservedNames.length);

      reservedNames.forEach(reservedName => {
        expectAssertion(() => {
          Router = EmberRouter.extend();

          Router.map(function() {
            this.route(reservedName);
          });

          let router = Router.create();
          router._initRouterJs();
        }, "'" + reservedName + "' cannot be used as a route name.");
      });
    }

    ['@test should retain resource namespace if nested with routes'](assert) {
      Router = Router.map(function() {
        this.route('bleep', function() {
          this.route('bloop', function() {
            this.route('blork');
          });
        });
      });

      let router = Router.create();
      router._initRouterJs();

      assert.ok(
        router._routerMicrolib.recognizer.names['bleep'],
        'parent name was used as base of nested routes'
      );
      assert.ok(
        router._routerMicrolib.recognizer.names['bleep.bloop'],
        'parent name was used as base of nested routes'
      );
      assert.ok(
        router._routerMicrolib.recognizer.names['bleep.bloop.blork'],
        'parent name was used as base of nested routes'
      );
    }

    ['@test should add loading and error routes if _isRouterMapResult is true'](assert) {
      Router.map(function() {
        this.route('blork');
      });

      let router = Router.create({
        _hasModuleBasedResolver() {
          return true;
        },
      });

      router._initRouterJs();

      assert.ok(router._routerMicrolib.recognizer.names['blork'], 'main route was created');
      assert.ok(
        router._routerMicrolib.recognizer.names['blork_loading'],
        'loading route was added'
      );
      assert.ok(router._routerMicrolib.recognizer.names['blork_error'], 'error route was added');
    }

    ['@test should not add loading and error routes if _isRouterMapResult is false'](assert) {
      Router.map(function() {
        this.route('blork');
      });

      let router = Router.create();
      router._initRouterJs(false);

      assert.ok(router._routerMicrolib.recognizer.names['blork'], 'main route was created');
      assert.ok(
        !router._routerMicrolib.recognizer.names['blork_loading'],
        'loading route was not added'
      );
      assert.ok(
        !router._routerMicrolib.recognizer.names['blork_error'],
        'error route was not added'
      );
    }

    ['@test should reset namespace of loading and error routes for routes with resetNamespace'](
      assert
    ) {
      Router.map(function() {
        this.route('blork', function() {
          this.route('blorp');
          this.route('bleep', { resetNamespace: true });
        });
      });

      let router = Router.create({
        _hasModuleBasedResolver() {
          return true;
        },
      });

      router._initRouterJs();

      assert.ok(router._routerMicrolib.recognizer.names['blork.blorp'], 'nested route was created');
      assert.ok(
        router._routerMicrolib.recognizer.names['blork.blorp_loading'],
        'nested loading route was added'
      );
      assert.ok(
        router._routerMicrolib.recognizer.names['blork.blorp_error'],
        'nested error route was added'
      );

      assert.ok(router._routerMicrolib.recognizer.names['bleep'], 'reset route was created');
      assert.ok(
        router._routerMicrolib.recognizer.names['bleep_loading'],
        'reset loading route was added'
      );
      assert.ok(
        router._routerMicrolib.recognizer.names['bleep_error'],
        'reset error route was added'
      );

      assert.ok(
        !router._routerMicrolib.recognizer.names['blork.bleep'],
        'nested reset route was not created'
      );
      assert.ok(
        !router._routerMicrolib.recognizer.names['blork.bleep_loading'],
        'nested reset loading route was not added'
      );
      assert.ok(
        !router._routerMicrolib.recognizer.names['blork.bleep_error'],
        'nested reset error route was not added'
      );
    }

    ['@test should throw an error when defining a route serializer outside an engine'](assert) {
      Router.map(function() {
        assert.throws(() => {
          this.route('posts', { serialize: function() {} });
        }, /Defining a route serializer on route 'posts' outside an Engine is not allowed/);
      });

      Router.create()._initRouterJs();
    }
  }
);

moduleFor(
  'Ember Router DSL with engines',
  class extends AbstractTestCase {
    constructor() {
      super();
      Router = EmberRouter.extend();
    }

    teardown() {
      Router = null;
    }

    ['@test should allow mounting of engines'](assert) {
      assert.expect(3);

      Router = Router.map(function() {
        this.route('bleep', function() {
          this.route('bloop', function() {
            this.mount('chat');
          });
        });
      });

      let engineInstance = buildOwner({
        ownerOptions: { routable: true },
      });

      let router = Router.create();
      setOwner(router, engineInstance);
      router._initRouterJs();

      assert.ok(
        router._routerMicrolib.recognizer.names['bleep'],
        'parent name was used as base of nested routes'
      );
      assert.ok(
        router._routerMicrolib.recognizer.names['bleep.bloop'],
        'parent name was used as base of nested routes'
      );
      assert.ok(
        router._routerMicrolib.recognizer.names['bleep.bloop.chat'],
        'parent name was used as base of mounted engine'
      );
    }

    ['@test should allow mounting of engines at a custom path'](assert) {
      assert.expect(1);

      Router = Router.map(function() {
        this.route('bleep', function() {
          this.route('bloop', function() {
            this.mount('chat', { path: 'custom-chat' });
          });
        });
      });

      let engineInstance = buildOwner({
        ownerOptions: { routable: true },
      });

      let router = Router.create();
      setOwner(router, engineInstance);
      router._initRouterJs();

      assert.deepEqual(
        router._routerMicrolib.recognizer.names['bleep.bloop.chat'].segments
          .slice(1, 4)
          .map(s => s.value),
        ['bleep', 'bloop', 'custom-chat'],
        'segments are properly associated with mounted engine'
      );
    }

    ['@test should allow aliasing of engine names with `as`'](assert) {
      assert.expect(1);

      Router = Router.map(function() {
        this.route('bleep', function() {
          this.route('bloop', function() {
            this.mount('chat', { as: 'blork' });
          });
        });
      });

      let engineInstance = buildOwner({
        ownerOptions: { routable: true },
      });

      let router = Router.create();
      setOwner(router, engineInstance);
      router._initRouterJs();

      assert.deepEqual(
        router._routerMicrolib.recognizer.names['bleep.bloop.blork'].segments
          .slice(1, 4)
          .map(s => s.value),
        ['bleep', 'bloop', 'blork'],
        'segments are properly associated with mounted engine with aliased name'
      );
    }

    ['@test should add loading and error routes to a mount if _isRouterMapResult is true'](assert) {
      Router.map(function() {
        this.mount('chat');
      });

      let engineInstance = buildOwner({
        ownerOptions: { routable: true },
      });

      let router = Router.create({
        _hasModuleBasedResolver() {
          return true;
        },
      });
      setOwner(router, engineInstance);
      router._initRouterJs();

      assert.ok(router._routerMicrolib.recognizer.names['chat'], 'main route was created');
      assert.ok(router._routerMicrolib.recognizer.names['chat_loading'], 'loading route was added');
      assert.ok(router._routerMicrolib.recognizer.names['chat_error'], 'error route was added');
    }

    ['@test should add loading and error routes to a mount alias if _isRouterMapResult is true'](
      assert
    ) {
      Router.map(function() {
        this.mount('chat', { as: 'shoutbox' });
      });

      let engineInstance = buildOwner({
        ownerOptions: { routable: true },
      });

      let router = Router.create({
        _hasModuleBasedResolver() {
          return true;
        },
      });
      setOwner(router, engineInstance);
      router._initRouterJs();

      assert.ok(router._routerMicrolib.recognizer.names['shoutbox'], 'main route was created');
      assert.ok(
        router._routerMicrolib.recognizer.names['shoutbox_loading'],
        'loading route was added'
      );
      assert.ok(router._routerMicrolib.recognizer.names['shoutbox_error'], 'error route was added');
    }

    ['@test should not add loading and error routes to a mount if _isRouterMapResult is false'](
      assert
    ) {
      Router.map(function() {
        this.mount('chat');
      });

      let engineInstance = buildOwner({
        ownerOptions: { routable: true },
      });

      let router = Router.create();
      setOwner(router, engineInstance);
      router._initRouterJs(false);

      assert.ok(router._routerMicrolib.recognizer.names['chat'], 'main route was created');
      assert.ok(
        !router._routerMicrolib.recognizer.names['chat_loading'],
        'loading route was not added'
      );
      assert.ok(
        !router._routerMicrolib.recognizer.names['chat_error'],
        'error route was not added'
      );
    }

    ['@test should reset namespace of loading and error routes for mounts with resetNamespace'](
      assert
    ) {
      Router.map(function() {
        this.route('news', function() {
          this.mount('chat');
          this.mount('blog', { resetNamespace: true });
        });
      });

      let engineInstance = buildOwner({
        ownerOptions: { routable: true },
      });

      let router = Router.create({
        _hasModuleBasedResolver() {
          return true;
        },
      });
      setOwner(router, engineInstance);
      router._initRouterJs();

      assert.ok(router._routerMicrolib.recognizer.names['news.chat'], 'nested route was created');
      assert.ok(
        router._routerMicrolib.recognizer.names['news.chat_loading'],
        'nested loading route was added'
      );
      assert.ok(
        router._routerMicrolib.recognizer.names['news.chat_error'],
        'nested error route was added'
      );

      assert.ok(router._routerMicrolib.recognizer.names['blog'], 'reset route was created');
      assert.ok(
        router._routerMicrolib.recognizer.names['blog_loading'],
        'reset loading route was added'
      );
      assert.ok(
        router._routerMicrolib.recognizer.names['blog_error'],
        'reset error route was added'
      );

      assert.ok(
        !router._routerMicrolib.recognizer.names['news.blog'],
        'nested reset route was not created'
      );
      assert.ok(
        !router._routerMicrolib.recognizer.names['news.blog_loading'],
        'nested reset loading route was not added'
      );
      assert.ok(
        !router._routerMicrolib.recognizer.names['news.blog_error'],
        'nested reset error route was not added'
      );
    }
  }
);
