import EmberRouter from '../../lib/system/router';
import { buildOwner, moduleFor, runDestroy, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Ember Router DSL',
  class extends AbstractTestCase {
    constructor() {
      super();
      this.Router = class extends EmberRouter {};

      this.owner = buildOwner({
        ownerOptions: { routable: true },
      });
      this.routerInstance = new this.Router(this.owner);
    }

    teardown() {
      this.Router = null;
      this.routerInstance = null;
      runDestroy(this.owner);
    }

    ['@test should fail when using a reserved route name'](assert) {
      let owners = [];
      let reservedNames = ['basic', 'application'];

      assert.expect(reservedNames.length);

      reservedNames.forEach((reservedName) => {
        expectAssertion(() => {
          let Router = class extends this.Router {};

          Router.map(function () {
            this.route(reservedName);
          });

          let owner = buildOwner();
          owners.push(owner);
          new Router(owner)._initRouterJs();
        }, "'" + reservedName + "' cannot be used as a route name.");
      });

      owners.forEach((o) => runDestroy(o));
    }

    ['@test [GH#16642] better error when using a colon in a route name']() {
      expectAssertion(() => {
        this.Router.map(function () {
          this.route('resource/:id');
        });

        this.routerInstance._initRouterJs();
      }, "'resource/:id' is not a valid route name. It cannot contain a ':'. You may want to use the 'path' option instead.");
    }

    ['@test should retain resource namespace if nested with routes'](assert) {
      this.Router.map(function () {
        this.route('bleep', function () {
          this.route('bloop', function () {
            this.route('blork');
          });
        });
      });

      let router = this.routerInstance;
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
      this.Router.map(function () {
        this.route('blork');
      });

      this.routerInstance.reopen({
        _hasModuleBasedResolver() {
          return true;
        },
      });

      let router = this.routerInstance;
      router._initRouterJs();

      assert.ok(router._routerMicrolib.recognizer.names['blork'], 'main route was created');
      assert.ok(
        router._routerMicrolib.recognizer.names['blork_loading'],
        'loading route was added'
      );
      assert.ok(router._routerMicrolib.recognizer.names['blork_error'], 'error route was added');
    }

    ['@test should not add loading and error routes if _isRouterMapResult is false'](assert) {
      this.Router.map(function () {
        this.route('blork');
      });

      let router = this.routerInstance;
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
      this.Router.map(function () {
        this.route('blork', function () {
          this.route('blorp');
          this.route('bleep', { resetNamespace: true });
        });
      });

      this.routerInstance.reopen({
        _hasModuleBasedResolver() {
          return true;
        },
      });

      let router = this.routerInstance;
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
      this.Router.map(function () {
        assert.throws(() => {
          this.route('posts', { serialize: function () {} });
        }, /Defining a route serializer on route 'posts' outside an Engine is not allowed/);
      });

      this.routerInstance._initRouterJs();
    }
  }
);

moduleFor(
  'Ember Router DSL with engines',
  class extends AbstractTestCase {
    constructor() {
      super();
      this.Router = class extends EmberRouter {};
      this.owner = buildOwner({
        ownerOptions: { routable: true },
      });
      this.routerInstance = new this.Router(this.owner);
    }

    teardown() {
      runDestroy(this.owner);
      this.Router = null;
      this.routerInstance = null;
    }

    ['@test should allow mounting of engines'](assert) {
      assert.expect(3);

      this.Router.map(function () {
        this.route('bleep', function () {
          this.route('bloop', function () {
            this.mount('chat');
          });
        });
      });

      let router = this.routerInstance;
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

      this.Router.map(function () {
        this.route('bleep', function () {
          this.route('bloop', function () {
            this.mount('chat', { path: 'custom-chat' });
          });
        });
      });

      let router = this.routerInstance;
      router._initRouterJs();

      assert.deepEqual(
        router._routerMicrolib.recognizer.names['bleep.bloop.chat'].segments
          .slice(1, 4)
          .map((s) => s.value),
        ['bleep', 'bloop', 'custom-chat'],
        'segments are properly associated with mounted engine'
      );
    }

    ['@test should allow aliasing of engine names with `as`'](assert) {
      assert.expect(1);

      this.Router.map(function () {
        this.route('bleep', function () {
          this.route('bloop', function () {
            this.mount('chat', { as: 'blork' });
          });
        });
      });

      let router = this.routerInstance;
      router._initRouterJs();

      assert.deepEqual(
        router._routerMicrolib.recognizer.names['bleep.bloop.blork'].segments
          .slice(1, 4)
          .map((s) => s.value),
        ['bleep', 'bloop', 'blork'],
        'segments are properly associated with mounted engine with aliased name'
      );
    }

    ['@test should add loading and error routes to a mount if _isRouterMapResult is true'](assert) {
      this.Router.map(function () {
        this.mount('chat');
      });

      this.routerInstance.reopen({
        _hasModuleBasedResolver() {
          return true;
        },
      });
      this.routerInstance._initRouterJs();
      let router = this.routerInstance;
      assert.ok(router._routerMicrolib.recognizer.names['chat'], 'main route was created');
      assert.ok(router._routerMicrolib.recognizer.names['chat_loading'], 'loading route was added');
      assert.ok(router._routerMicrolib.recognizer.names['chat_error'], 'error route was added');
    }

    ['@test should add loading and error routes to a mount alias if _isRouterMapResult is true'](
      assert
    ) {
      this.Router.map(function () {
        this.mount('chat', { as: 'shoutbox' });
      });

      this.routerInstance.reopen({
        _hasModuleBasedResolver() {
          return true;
        },
      });
      this.routerInstance._initRouterJs();
      let router = this.routerInstance;

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
      this.Router.map(function () {
        this.mount('chat');
      });

      let router = this.routerInstance;
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
      this.Router.map(function () {
        this.route('news', function () {
          this.mount('chat');
          this.mount('blog', { resetNamespace: true });
        });
      });

      this.routerInstance.reopen({
        _hasModuleBasedResolver() {
          return true;
        },
      });
      this.routerInstance._initRouterJs();
      let router = this.routerInstance;

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
