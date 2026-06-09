import Route from '@ember/routing/route';
import { setRouteManager } from '@ember/routing';
import { ClassicRouteManager } from '@ember/-internals/routing/route-managers/classic/manager';
import {
  moduleFor,
  ApplicationTestCase,
  ModuleBasedTestResolver,
  runTask,
} from 'internal-test-helpers';
import { precompileTemplate } from '@ember/template-compilation';
import { getOwner } from '@ember/owner';
import { defer, reject, resolve } from 'rsvp';

// A manager that delegates everything to the ClassicRouteManager so existing
// routing behaviour is preserved, but records every hook into a shared log so
// the tests can assert the routing pipeline goes through the manager.
class RecordingRouteManager extends ClassicRouteManager {
  constructor(owner, log) {
    super(owner);
    this.log = log;
  }

  createRoute(factory, args) {
    let bucket = super.createRoute(factory, args);
    this.log.push(['createRoute', bucket.route.routeName]);
    return bucket;
  }

  getDestroyable(bucket) {
    this.log.push(['getDestroyable', bucket.route.routeName]);
    return super.getDestroyable(bucket);
  }

  getRouteWrapper(bucket) {
    this.log.push(['getRouteWrapper', bucket.route.routeName]);
    return super.getRouteWrapper(bucket);
  }

  getInvokable(bucket, enterPromise) {
    this.log.push(['getInvokable', bucket.route.routeName]);
    return super.getInvokable(bucket, enterPromise);
  }

  willEnter(bucket, state) {
    this.log.push(['willEnter', bucket.route.routeName]);
    return super.willEnter(bucket, state);
  }

  enter(bucket, state) {
    this.log.push(['enter', bucket.route.routeName]);
    return super.enter(bucket, state);
  }

  didEnter(bucket, state) {
    this.log.push(['didEnter', bucket.route.routeName, state.enter]);
    return super.didEnter(bucket, state);
  }

  willExit(bucket, state) {
    this.log.push(['willExit', bucket.route.routeName, state.isExiting]);
    return super.willExit(bucket, state);
  }

  exit(bucket, state) {
    this.log.push(['exit', bucket.route.routeName]);
    return super.exit(bucket, state);
  }

  didExit(bucket, state) {
    this.log.push(['didExit', bucket.route.routeName]);
    return super.didExit(bucket, state);
  }

  getContext(bucket, params, transition) {
    this.log.push(['getContext', bucket.route.routeName, params]);
    return super.getContext(bucket, params, transition);
  }

  serializeContext(bucket, routeInfo, value) {
    this.log.push(['serializeContext', bucket.route.routeName, value]);
    return super.serializeContext(bucket, routeInfo, value);
  }

  redirect(bucket, routeInfo, context, transition) {
    this.log.push(['redirect', bucket.route.routeName]);
    return super.redirect(bucket, routeInfo, context, transition);
  }

  getRouteInfoMetadata(bucket) {
    this.log.push(['getRouteInfoMetadata', bucket.route.routeName]);
    return super.getRouteInfoMetadata(bucket);
  }
}

moduleFor(
  'Route manager - integration',
  class extends ApplicationTestCase {
    constructor() {
      super(...arguments);

      let TestRoute = class extends Route {};

      this.log = [];
      this.managers = [];
      let test = this;
      setRouteManager((owner) => {
        let manager = new RecordingRouteManager(owner, test.log);
        test.managers.push(manager);
        return manager;
      }, TestRoute);

      this.add('route:application', class extends TestRoute {});
      this.add('route:index', class extends TestRoute {});
      this.add('template:application', precompileTemplate('app:{{outlet}}'));
      this.add('template:index', precompileTemplate('index'));
    }

    async ['@test routes flow through their registered RouteManager'](assert) {
      await this.visit('/');

      assert.strictEqual(this.managers.length, 1, 'one manager instance per owner');
      let methods = this.log.map(([m]) => m);

      assert.ok(methods.includes('createRoute'), 'createRoute was called');
      assert.ok(methods.includes('getRouteWrapper'), 'getRouteWrapper was called');
      assert.ok(methods.includes('getInvokable'), 'getInvokable was called');

      let createdRoutes = this.log
        .filter(([m]) => m === 'createRoute')
        .map(([, name]) => name)
        .sort();
      assert.deepEqual(
        createdRoutes,
        ['application', 'index'],
        'createRoute fired for application and index'
      );

      assert.strictEqual(this.element.textContent, 'app:index', 'route templates rendered');
    }
  }
);

// Real-world resolvers (ember-resolver, the strict resolver) normalize a
// dotted route name like `posts.show` to the slashed module path
// `posts/show`. The default test resolver does NOT, which is why this never
// surfaced in the rest of the suite: the router and a `route:` container
// lookup ended up with the same spelling, so the route manager's per-name
// bucket cache only ever held one instance.
//
// With a normalizing resolver the two callers disagree: router_js calls
// `getRoute('parent.child')` (dotted, straight from the recognizer) while a
// `paramsFor`/`modelFor` container lookup is intercepted and calls
// `getRoute('parent/child')` (slashed, post-normalize). If the bucket cache
// keys on the raw name those become two different route instances with
// different `fullRouteName`s, and `paramsFor` reads `state.params` under the
// wrong key, so a nested dynamic route resolves with empty params.
class NormalizingResolver extends ModuleBasedTestResolver {
  normalize(fullName) {
    let [type, name] = fullName.split(':');
    if (type === 'route') {
      return `route:${name.replace(/\./g, '/')}`;
    }
    return fullName;
  }

  add(specifier, factory) {
    return super.add(
      typeof specifier === 'string' ? this.normalize(specifier) : specifier,
      factory
    );
  }

  resolve(specifier) {
    return super.resolve(this.normalize(specifier));
  }
}

moduleFor(
  'Route manager - nested dynamic params with a normalizing resolver',
  class extends ApplicationTestCase {
    get applicationOptions() {
      return Object.assign(super.applicationOptions, {
        Resolver: NormalizingResolver,
      });
    }

    constructor() {
      super(...arguments);

      let test = this;
      this.childParams = undefined;

      this.add('route:application', class extends Route {});
      this.add('route:parent', class extends Route {});
      this.add(
        'route:parent.child',
        class extends Route {
          model(params) {
            test.childParams = params;
            return params;
          }
        }
      );

      this.add('template:application', precompileTemplate('{{outlet}}'));
      this.add('template:parent', precompileTemplate('{{outlet}}'));
      this.add('template:parent.child', precompileTemplate('child'));

      this.router.map(function () {
        this.route('parent', function () {
          this.route('child', { path: '/:child_id' });
        });
      });
    }

    async ['@test a nested dynamic route receives its params when the resolver normalizes route names'](
      assert
    ) {
      await this.visit('/parent/42');

      assert.strictEqual(this.currentURL, '/parent/42', 'transitioned to the nested route');
      assert.ok(this.childParams, 'the nested route model hook ran');
      assert.strictEqual(
        this.childParams.child_id,
        '42',
        'the nested route received its dynamic segment param'
      );
    }
  }
);

// Lifecycle ordering. A single recording manager instance (one per
// owner) logs every hook in call order so the tests can assert the router
// drives willEnter -> enter -> didEnter on the way in and
// willExit -> exit -> didExit on the way out, plus the context-update and
// enter-gates-didEnter guarantees.
moduleFor(
  'Route manager - lifecycle ordering',
  class extends ApplicationTestCase {
    constructor() {
      super(...arguments);

      let test = this;
      this.log = [];

      let TestRoute = class extends Route {};
      setRouteManager((owner) => new RecordingRouteManager(owner, test.log), TestRoute);

      this.add('route:application', class extends TestRoute {});
      this.add('route:parent', class extends TestRoute {});
      this.add(
        'route:parent.child',
        class extends TestRoute {
          model(params) {
            // Mark when this route's async model work settles so the
            // enter-gates-didEnter test can assert ordering against it.
            return resolve().then(() => {
              test.log.push(['model-settled', 'parent.child']);
              return params;
            });
          }
        }
      );
      this.add('route:other', class extends TestRoute {});

      this.add('template:application', precompileTemplate('{{outlet}}'));
      this.add('template:parent', precompileTemplate('{{outlet}}'));
      this.add('template:parent.child', precompileTemplate('child'));
      this.add('template:other', precompileTemplate('other'));

      this.router.map(function () {
        this.route('parent', function () {
          this.route('child', { path: '/:child_id' });
        });
        this.route('other');
      });
    }

    async ['@test entering routes fire willEnter -> enter -> didEnter in order'](assert) {
      await this.visit('/parent/1');

      for (let name of ['application', 'parent', 'parent.child']) {
        let willEnter = this.log.findIndex(([h, n]) => h === 'willEnter' && n === name);
        let enter = this.log.findIndex(([h, n]) => h === 'enter' && n === name);
        let didEnter = this.log.findIndex(([h, n]) => h === 'didEnter' && n === name);

        assert.notStrictEqual(willEnter, -1, `willEnter fired for ${name}`);
        assert.notStrictEqual(enter, -1, `enter fired for ${name}`);
        assert.notStrictEqual(didEnter, -1, `didEnter fired for ${name}`);
        assert.ok(willEnter < enter, `willEnter before enter for ${name}`);
        assert.ok(enter < didEnter, `enter before didEnter for ${name}`);
      }

      // The manager awaits every enter promise before running any didEnter,
      // so the last enter must precede the first didEnter across all routes.
      let lastEnter = this.log.findLastIndex(([h]) => h === 'enter');
      let firstDidEnter = this.log.findIndex(([h]) => h === 'didEnter');
      assert.ok(lastEnter < firstDidEnter, 'all enters resolve before any didEnter runs');
    }

    async ['@test exiting routes fire willExit -> exit -> didExit, leaf-first'](assert) {
      await this.visit('/parent/1');
      this.log.length = 0;
      await this.visit('/other');

      for (let name of ['parent.child', 'parent']) {
        let willExit = this.log.findIndex(([h, n]) => h === 'willExit' && n === name);
        let exit = this.log.findIndex(([h, n]) => h === 'exit' && n === name);
        let didExit = this.log.findIndex(([h, n]) => h === 'didExit' && n === name);

        assert.notStrictEqual(willExit, -1, `willExit fired for ${name}`);
        assert.notStrictEqual(exit, -1, `exit fired for ${name}`);
        assert.notStrictEqual(didExit, -1, `didExit fired for ${name}`);
        assert.ok(willExit < exit, `willExit before exit for ${name}`);
        assert.ok(exit < didExit, `exit before didExit for ${name}`);
      }

      // Leaf exits before its parent.
      let childExit = this.log.findIndex(([h, n]) => h === 'exit' && n === 'parent.child');
      let parentExit = this.log.findIndex(([h, n]) => h === 'exit' && n === 'parent');
      assert.ok(childExit < parentExit, 'child exits before parent');
    }

    async ['@test a context update fires didEnter(enter:false) and willExit(isExiting:false)'](
      assert
    ) {
      await this.visit('/parent/1');
      this.log.length = 0;
      await this.visit('/parent/2');

      let didEnter = this.log.find(([h, n]) => h === 'didEnter' && n === 'parent.child');
      assert.ok(didEnter, 'didEnter fired for the context-updated route');
      assert.strictEqual(didEnter[2], false, 'didEnter ran with enter=false');

      let willExit = this.log.find(([h, n]) => h === 'willExit' && n === 'parent.child');
      assert.ok(willExit, 'willExit fired for the context-updated route');
      assert.strictEqual(willExit[2], false, 'willExit ran with isExiting=false');

      let fullExit = this.log.find(([h, n]) => h === 'exit' && n === 'parent.child');
      assert.notOk(fullExit, 'the route did not fully exit on a context update');
    }

    async ['@test didEnter waits for the enter promise to settle'](assert) {
      await this.visit('/parent/1');

      let modelSettled = this.log.findIndex(([h]) => h === 'model-settled');
      let childDidEnter = this.log.findIndex(([h, n]) => h === 'didEnter' && n === 'parent.child');

      assert.notStrictEqual(modelSettled, -1, 'the async model settled');
      assert.ok(
        modelSettled < childDidEnter,
        'didEnter ran only after the async enter work settled'
      );
    }
  }
);

// Classic-interop surface. Asserts the router resolves models
// (getContext), serializes URLs (serializeContext), runs redirects, and
// surfaces metadata (getRouteInfoMetadata) through the manager boundary.
moduleFor(
  'Route manager - classic interop surface',
  class extends ApplicationTestCase {
    constructor() {
      super(...arguments);

      let test = this;
      this.log = [];

      let TestRoute = class extends Route {};
      setRouteManager((owner) => new RecordingRouteManager(owner, test.log), TestRoute);

      this.add('route:application', class extends TestRoute {});
      this.add(
        'route:post',
        class extends TestRoute {
          model(params) {
            test.postParams = params;
            // `id` drives the default `_id` serialize convention.
            return { id: params.post_id };
          }
          buildRouteInfoMetadata() {
            return { kind: 'post' };
          }
        }
      );
      this.add(
        'route:redirector',
        class extends TestRoute {
          redirect() {
            getOwner(this).lookup('service:router').transitionTo('target');
          }
        }
      );
      this.add('route:target', class extends TestRoute {});

      this.add('template:application', precompileTemplate('{{outlet}}'));
      this.add('template:post', precompileTemplate('post'));
      this.add('template:redirector', precompileTemplate('redirector'));
      this.add('template:target', precompileTemplate('target'));

      this.router.map(function () {
        this.route('post', { path: '/post/:post_id' });
        this.route('redirector');
        this.route('target');
      });
    }

    get routerService() {
      return this.applicationInstance.lookup('service:router');
    }

    async ['@test getContext resolves the model from URL params'](assert) {
      await this.visit('/post/42');

      let call = this.log.find(([h, n]) => h === 'getContext' && n === 'post');
      assert.ok(call, 'getContext was dispatched for the dynamic route');
      assert.strictEqual(call[2].post_id, '42', 'getContext received the dynamic segment param');
      assert.strictEqual(this.postParams.post_id, '42', 'the model hook ran with that param');
    }

    async ['@test serializeContext runs through the manager'](assert) {
      await this.visit('/');

      let url = this.routerService.urlFor('post', { id: 7 });

      assert.strictEqual(url, '/post/7', 'the model serialized into the dynamic segment');
      let call = this.log.find(([h, n]) => h === 'serializeContext' && n === 'post');
      assert.ok(call, 'serializeContext was dispatched');
      assert.deepEqual(call[2], { id: 7 }, 'serializeContext received the model');
    }

    async ['@test redirect runs through the manager'](assert) {
      await this.visit('/redirector');

      assert.strictEqual(this.currentURL, '/target', 'the redirect landed on the target route');
      let call = this.log.find(([h, n]) => h === 'redirect' && n === 'redirector');
      assert.ok(call, 'redirect was dispatched through the manager');
    }

    async ['@test getRouteInfoMetadata surfaces buildRouteInfoMetadata'](assert) {
      await this.visit('/post/42');

      assert.deepEqual(
        this.routerService.currentRoute.metadata,
        { kind: 'post' },
        'the RouteInfo carries the metadata the route built'
      );
      let call = this.log.find(([h, n]) => h === 'getRouteInfoMetadata' && n === 'post');
      assert.ok(call, 'getRouteInfoMetadata was dispatched');
    }
  }
);

// Substates. A pending model enters the loading substate and a
// rejected model enters the error substate. Both substate routes extend the
// tracked base class, so the recording manager proves the router drives them
// (via the intermediate transition) through the manager boundary.
moduleFor(
  'Route manager - substates',
  class extends ApplicationTestCase {
    constructor() {
      super(...arguments);

      let test = this;
      this.log = [];
      this.TestRoute = class extends Route {};
      setRouteManager((owner) => new RecordingRouteManager(owner, test.log), this.TestRoute);

      this.add('template:application', precompileTemplate('<div id="app">{{outlet}}</div>'));
    }

    // runTask lets the loading substate render synchronously while the model
    // promise is still pending, so the test can inspect the DOM mid-transition.
    visit(...args) {
      return runTask(() => super.visit(...args));
    }

    ['@test a pending model enters the loading substate through the manager'](assert) {
      let TestRoute = this.TestRoute;
      let deferred = defer();

      this.router.map(function () {
        this.route('slow');
      });

      this.add(
        'route:slow',
        class extends TestRoute {
          model() {
            return deferred.promise;
          }
        }
      );
      this.add('route:loading', class extends TestRoute {});
      this.add('template:slow', precompileTemplate('SLOW'));
      this.add('template:loading', precompileTemplate('LOADING'));

      let promise = this.visit('/slow').then(() => {
        assert.equal(this.$('#app').text(), 'SLOW', 'the real route replaced the loading substate');
        let didExit = this.log.find(([h, n]) => h === 'didExit' && n === 'loading');
        assert.ok(didExit, 'the loading substate exited through the manager');
      });

      // While the model is pending, the loading substate is active.
      assert.equal(this.$('#app').text(), 'LOADING', 'the loading substate rendered');
      let didEnter = this.log.find(([h, n]) => h === 'didEnter' && n === 'loading');
      assert.ok(didEnter, 'the loading substate entered through the manager');

      deferred.resolve();
      return promise;
    }

    async ['@test a rejected model enters the error substate through the manager'](assert) {
      let TestRoute = this.TestRoute;

      this.router.map(function () {
        this.route('boom');
      });

      this.add(
        'route:boom',
        class extends TestRoute {
          model() {
            return reject({ msg: 'broke' });
          }
        }
      );
      this.add('route:error', class extends TestRoute {});
      this.add('template:error', precompileTemplate('<span id="err">ERROR: {{@model.msg}}</span>'));

      await this.visit('/boom');

      assert.equal(
        this.$('#err').text(),
        'ERROR: broke',
        'the error substate rendered with the error as its model'
      );
      let didEnter = this.log.find(([h, n]) => h === 'didEnter' && n === 'error');
      assert.ok(didEnter, 'the error substate entered through the manager');
    }
  }
);
