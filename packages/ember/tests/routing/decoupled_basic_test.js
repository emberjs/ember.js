/* eslint-disable no-console */
import { getOwner } from '@ember/-internals/owner';
import RSVP from 'rsvp';
import { compile } from 'ember-template-compiler';
import { Route, NoneLocation, HistoryLocation } from '@ember/-internals/routing';
import Controller from '@ember/controller';
import { Object as EmberObject } from '@ember/-internals/runtime';
import {
  moduleFor,
  ApplicationTestCase,
  getTextOf,
  ModuleBasedTestResolver,
  runDestroy,
  runTask,
} from 'internal-test-helpers';
import { run } from '@ember/runloop';
import { Mixin, set, addObserver } from '@ember/-internals/metal';
import Engine from '@ember/engine';
import { InternalTransition as Transition } from 'router_js';

let originalConsoleError;

function handleURLRejectsWith(context, assert, path, expectedReason) {
  return context
    .visit(path)
    .then(() => {
      assert.ok(false, 'expected handleURLing: `' + path + '` to fail');
    })
    .catch((reason) => {
      assert.equal(reason.message, expectedReason);
    });
}

moduleFor(
  'Basic Routing - Decoupled from global resolver',
  class extends ApplicationTestCase {
    constructor() {
      super(...arguments);
      this.addTemplate('home', '<h3 class="hours">Hours</h3>');
      this.addTemplate('camelot', '<section id="camelot"><h3>Is a silly place</h3></section>');
      this.addTemplate('homepage', '<h3 id="troll">Megatroll</h3><p>{{this.name}}</p>');

      this.router.map(function () {
        this.route('home', { path: '/' });
      });

      originalConsoleError = console.error;
    }

    teardown() {
      super.teardown();
      console.error = originalConsoleError;
    }

    handleURLAborts(assert, path, deprecated) {
      run(() => {
        let router = this.applicationInstance.lookup('router:main');
        let result;

        if (deprecated !== undefined) {
          expectDeprecation(() => {
            result = router.handleURL(path);
          });
        } else {
          result = router.handleURL(path);
        }

        result.then(
          function () {
            assert.ok(false, 'url: `' + path + '` was NOT to be handled');
          },
          function (reason) {
            assert.ok(
              reason && reason.message === 'TransitionAborted',
              'url: `' + path + '` was to be aborted'
            );
          }
        );
      });
    }

    get currentPath() {
      let currentPath;
      expectDeprecation(() => {
        currentPath = this.applicationInstance.lookup('controller:application').get('currentPath');
      }, 'Accessing `currentPath` on `controller:application` is deprecated, use the `currentPath` property on `service:router` instead.');
      return currentPath;
    }

    async ['@test warn on URLs not included in the route set'](assert) {
      await this.visit('/');

      await assert.rejects(this.visit('/what-is-this-i-dont-even'), /\/what-is-this-i-dont-even/);
    }

    ['@test The Homepage'](assert) {
      return this.visit('/').then(() => {
        assert.equal(this.currentPath, 'home', 'currently on the home route');

        let text = this.$('.hours').text();
        assert.equal(text, 'Hours', 'the home template was rendered');
      });
    }

    [`@test The Homepage and the Camelot page with multiple Router.map calls`](assert) {
      this.router.map(function () {
        this.route('camelot', { path: '/camelot' });
      });

      return this.visit('/camelot')
        .then(() => {
          assert.equal(this.currentPath, 'camelot');

          let text = this.$('#camelot').text();
          assert.equal(text, 'Is a silly place', 'the camelot template was rendered');

          return this.visit('/');
        })
        .then(() => {
          assert.equal(this.currentPath, 'home');

          let text = this.$('.hours').text();
          assert.equal(text, 'Hours', 'the home template was rendered');
        });
    }

    ['@feature(!EMBER_ROUTING_MODEL_ARG) The Special Page returning a promise puts the app into a loading state until the promise is resolved']() {
      this.router.map(function () {
        this.route('home', { path: '/' });
        this.route('special', { path: '/specials/:menu_item_id' });
      });

      let menuItem, resolve;

      let MenuItem = EmberObject.extend();
      MenuItem.reopenClass({
        find(id) {
          menuItem = MenuItem.create({ id: id });

          return new RSVP.Promise(function (res) {
            resolve = res;
          });
        },
      });

      this.add('model:menu_item', MenuItem);

      this.addTemplate('special', '<p>{{this.model.id}}</p>');
      this.addTemplate('loading', '<p>LOADING!</p>');

      let visited = runTask(() => this.visit('/specials/1'));
      this.assertText('LOADING!', 'The app is in the loading state');

      resolve(menuItem);

      return visited.then(() => {
        this.assertText('1', 'The app is now in the specials state');
      });
    }

    ['@feature(EMBER_ROUTING_MODEL_ARG) The Special Page returning a promise puts the app into a loading state until the promise is resolved']() {
      this.router.map(function () {
        this.route('home', { path: '/' });
        this.route('special', { path: '/specials/:menu_item_id' });
      });

      let menuItem, resolve;

      let MenuItem = EmberObject.extend();
      MenuItem.reopenClass({
        find(id) {
          menuItem = MenuItem.create({ id: id });

          return new RSVP.Promise(function (res) {
            resolve = res;
          });
        },
      });

      this.add('model:menu_item', MenuItem);

      this.addTemplate('special', '<p>{{@model.id}}</p>');
      this.addTemplate('loading', '<p>LOADING!</p>');

      let visited = runTask(() => this.visit('/specials/1'));
      this.assertText('LOADING!', 'The app is in the loading state');

      resolve(menuItem);

      return visited.then(() => {
        this.assertText('1', 'The app is now in the specials state');
      });
    }

    [`@feature(!EMBER_ROUTING_MODEL_ARG) The loading state doesn't get entered for promises that resolve on the same run loop`](
      assert
    ) {
      this.router.map(function () {
        this.route('home', { path: '/' });
        this.route('special', { path: '/specials/:menu_item_id' });
      });

      let MenuItem = EmberObject.extend();
      MenuItem.reopenClass({
        find(id) {
          return { id: id };
        },
      });

      this.add('model:menu_item', MenuItem);

      this.add(
        'route:loading',
        Route.extend({
          enter() {
            assert.ok(false, "LoadingRoute shouldn't have been entered.");
          },
        })
      );

      this.addTemplate('special', '<p>{{this.model.id}}</p>');
      this.addTemplate('loading', '<p>LOADING!</p>');

      return this.visit('/specials/1').then(() => {
        let text = this.$('p').text();

        assert.equal(text, '1', 'The app is now in the specials state');
      });
    }

    [`@feature(EMBER_ROUTING_MODEL_ARG) The loading state doesn't get entered for promises that resolve on the same run loop`](
      assert
    ) {
      this.router.map(function () {
        this.route('home', { path: '/' });
        this.route('special', { path: '/specials/:menu_item_id' });
      });

      let MenuItem = EmberObject.extend();
      MenuItem.reopenClass({
        find(id) {
          return { id: id };
        },
      });

      this.add('model:menu_item', MenuItem);

      this.add(
        'route:loading',
        Route.extend({
          enter() {
            assert.ok(false, "LoadingRoute shouldn't have been entered.");
          },
        })
      );

      this.addTemplate('special', '<p>{{@model.id}}</p>');
      this.addTemplate('loading', '<p>LOADING!</p>');

      return this.visit('/specials/1').then(() => {
        let text = this.$('p').text();

        assert.equal(text, '1', 'The app is now in the specials state');
      });
    }

    ["@test The Special page returning an error invokes SpecialRoute's error handler"](assert) {
      this.router.map(function () {
        this.route('home', { path: '/' });
        this.route('special', { path: '/specials/:menu_item_id' });
      });

      let menuItem, promise, resolve;

      let MenuItem = EmberObject.extend();
      MenuItem.reopenClass({
        find(id) {
          menuItem = MenuItem.create({ id: id });
          promise = new RSVP.Promise((res) => (resolve = res));

          return promise;
        },
      });

      this.add('model:menu_item', MenuItem);

      this.add(
        'route:special',
        Route.extend({
          setup() {
            throw new Error('Setup error');
          },
          actions: {
            error(reason) {
              assert.equal(
                reason.message,
                'Setup error',
                'SpecialRoute#error received the error thrown from setup'
              );
              return true;
            },
          },
        })
      );

      runTask(() => handleURLRejectsWith(this, assert, 'specials/1', 'Setup error'));

      resolve(menuItem);
    }

    ["@test ApplicationRoute's default error handler can be overridden"](assert) {
      assert.expect(2);

      this.router.map(function () {
        this.route('home', { path: '/' });
        this.route('special', { path: '/specials/:menu_item_id' });
      });

      let menuItem, resolve;

      let MenuItem = EmberObject.extend();

      MenuItem.reopenClass({
        find(id) {
          menuItem = MenuItem.create({ id: id });
          return new RSVP.Promise((res) => (resolve = res));
        },
      });
      this.add('model:menu_item', MenuItem);

      this.add(
        'route:application',
        Route.extend({
          actions: {
            error(reason) {
              assert.equal(
                reason.message,
                'Setup error',
                'error was correctly passed to custom ApplicationRoute handler'
              );
              return true;
            },
          },
        })
      );

      this.add(
        'route:special',
        Route.extend({
          setup() {
            throw new Error('Setup error');
          },
        })
      );

      let promise = runTask(() => handleURLRejectsWith(this, assert, '/specials/1', 'Setup error'));

      resolve(menuItem);

      return promise;
    }

    async ['@feature(!EMBER_ROUTING_MODEL_ARG) Events are triggered on the controller if a matching action name is implemented'](
      assert
    ) {
      let done = assert.async();

      this.router.map(function () {
        this.route('home', { path: '/' });
      });

      let model = { name: 'Tom Dale' };
      let stateIsNotCalled = true;

      this.add(
        'route:home',
        Route.extend({
          model() {
            return model;
          },

          actions: {
            showStuff() {
              stateIsNotCalled = false;
            },
          },
        })
      );

      this.addTemplate('home', '<a {{action "showStuff" this.model}}>{{this.name}}</a>');
      this.add(
        'controller:home',
        Controller.extend({
          actions: {
            showStuff(context) {
              assert.ok(stateIsNotCalled, 'an event on the state is not triggered');
              assert.deepEqual(context, { name: 'Tom Dale' }, 'an event with context is passed');
              done();
            },
          },
        })
      );

      await this.visit('/');

      document.getElementById('qunit-fixture').querySelector('a').click();
    }

    async ['@feature(EMBER_ROUTING_MODEL_ARG) Events are triggered on the controller if a matching action name is implemented'](
      assert
    ) {
      let done = assert.async();

      this.router.map(function () {
        this.route('home', { path: '/' });
      });

      let model = { name: 'Tom Dale' };
      let stateIsNotCalled = true;

      this.add(
        'route:home',
        Route.extend({
          model() {
            return model;
          },

          actions: {
            showStuff() {
              stateIsNotCalled = false;
            },
          },
        })
      );

      this.addTemplate('home', '<a {{action "showStuff" @model}}>{{this.name}}</a>');
      this.add(
        'controller:home',
        Controller.extend({
          actions: {
            showStuff(context) {
              assert.ok(stateIsNotCalled, 'an event on the state is not triggered');
              assert.deepEqual(context, { name: 'Tom Dale' }, 'an event with context is passed');
              done();
            },
          },
        })
      );

      await this.visit('/');

      document.getElementById('qunit-fixture').querySelector('a').click();
    }

    async ['@feature(!EMBER_ROUTING_MODEL_ARG) Events are triggered on the current state when defined in `actions` object'](
      assert
    ) {
      let done = assert.async();

      this.router.map(function () {
        this.route('home', { path: '/' });
      });

      let model = { name: 'Tom Dale' };
      let HomeRoute = Route.extend({
        model() {
          return model;
        },

        actions: {
          showStuff(obj) {
            assert.ok(this instanceof HomeRoute, 'the handler is an App.HomeRoute');
            assert.deepEqual(
              Object.assign({}, obj),
              { name: 'Tom Dale' },
              'the context is correct'
            );
            done();
          },
        },
      });

      this.add('route:home', HomeRoute);
      this.addTemplate('home', '<a {{action "showStuff" this.model}}>{{this.model.name}}</a>');

      await this.visit('/');

      document.getElementById('qunit-fixture').querySelector('a').click();
    }

    async ['@feature(EMBER_ROUTING_MODEL_ARG) Events are triggered on the current state when defined in `actions` object'](
      assert
    ) {
      let done = assert.async();

      this.router.map(function () {
        this.route('home', { path: '/' });
      });

      let model = { name: 'Tom Dale' };
      let HomeRoute = Route.extend({
        model() {
          return model;
        },

        actions: {
          showStuff(obj) {
            assert.ok(this instanceof HomeRoute, 'the handler is an App.HomeRoute');
            assert.deepEqual(
              Object.assign({}, obj),
              { name: 'Tom Dale' },
              'the context is correct'
            );
            done();
          },
        },
      });

      this.add('route:home', HomeRoute);
      this.addTemplate('home', '<a {{action "showStuff" @model}}>{{@model.name}}</a>');

      await this.visit('/');

      document.getElementById('qunit-fixture').querySelector('a').click();
    }

    async ['@feature(!EMBER_ROUTING_MODEL_ARG) Events defined in `actions` object are triggered on the current state when routes are nested'](
      assert
    ) {
      let done = assert.async();

      this.router.map(function () {
        this.route('root', { path: '/' }, function () {
          this.route('index', { path: '/' });
        });
      });

      let model = { name: 'Tom Dale' };

      let RootRoute = Route.extend({
        actions: {
          showStuff(obj) {
            assert.ok(this instanceof RootRoute, 'the handler is an App.HomeRoute');
            assert.deepEqual(
              Object.assign({}, obj),
              { name: 'Tom Dale' },
              'the context is correct'
            );
            done();
          },
        },
      });
      this.add('route:root', RootRoute);
      this.add(
        'route:root.index',
        Route.extend({
          model() {
            return model;
          },
        })
      );

      this.addTemplate(
        'root.index',
        '<a {{action "showStuff" this.model}}>{{this.model.name}}</a>'
      );

      await this.visit('/');

      document.getElementById('qunit-fixture').querySelector('a').click();
    }

    async ['@feature(EMBER_ROUTING_MODEL_ARG) Events defined in `actions` object are triggered on the current state when routes are nested'](
      assert
    ) {
      let done = assert.async();

      this.router.map(function () {
        this.route('root', { path: '/' }, function () {
          this.route('index', { path: '/' });
        });
      });

      let model = { name: 'Tom Dale' };

      let RootRoute = Route.extend({
        actions: {
          showStuff(obj) {
            assert.ok(this instanceof RootRoute, 'the handler is an App.HomeRoute');
            assert.deepEqual(
              Object.assign({}, obj),
              { name: 'Tom Dale' },
              'the context is correct'
            );
            done();
          },
        },
      });
      this.add('route:root', RootRoute);
      this.add(
        'route:root.index',
        Route.extend({
          model() {
            return model;
          },
        })
      );

      this.addTemplate('root.index', '<a {{action "showStuff" @model}}>{{@model.name}}</a>');

      await this.visit('/');

      document.getElementById('qunit-fixture').querySelector('a').click();
    }

    ['@test Events can be handled by inherited event handlers'](assert) {
      assert.expect(4);

      let SuperRoute = Route.extend({
        actions: {
          foo() {
            assert.ok(true, 'foo');
          },
          bar(msg) {
            assert.equal(msg, 'HELLO', 'bar hander in super route');
          },
        },
      });

      let RouteMixin = Mixin.create({
        actions: {
          bar(msg) {
            assert.equal(msg, 'HELLO', 'bar handler in mixin');
            this._super(msg);
          },
        },
      });

      this.add(
        'route:home',
        SuperRoute.extend(RouteMixin, {
          actions: {
            baz() {
              assert.ok(true, 'baz', 'baz hander in route');
            },
          },
        })
      );
      this.addTemplate(
        'home',
        `
      <a class="do-foo" {{action "foo"}}>Do foo</a>
      <a class="do-bar-with-arg" {{action "bar" "HELLO"}}>Do bar with arg</a>
      <a class="do-baz" {{action "baz"}}>Do bar</a>
    `
      );

      return this.visit('/').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        rootElement.querySelector('.do-foo').click();
        rootElement.querySelector('.do-bar-with-arg').click();
        rootElement.querySelector('.do-baz').click();
      });
    }

    async ['@feature(!EMBER_ROUTING_MODEL_ARG) Actions are not triggered on the controller if a matching action name is implemented as a method'](
      assert
    ) {
      let done = assert.async();

      this.router.map(function () {
        this.route('home', { path: '/' });
      });

      let model = { name: 'Tom Dale' };
      let stateIsNotCalled = true;

      this.add(
        'route:home',
        Route.extend({
          model() {
            return model;
          },

          actions: {
            showStuff(context) {
              assert.ok(stateIsNotCalled, 'an event on the state is not triggered');
              assert.deepEqual(context, { name: 'Tom Dale' }, 'an event with context is passed');
              done();
            },
          },
        })
      );

      this.addTemplate('home', '<a {{action "showStuff" this.model}}>{{this.name}}</a>');

      this.add(
        'controller:home',
        Controller.extend({
          showStuff() {
            stateIsNotCalled = false;
            assert.ok(stateIsNotCalled, 'an event on the state is not triggered');
          },
        })
      );

      await this.visit('/');

      document.getElementById('qunit-fixture').querySelector('a').click();
    }

    async ['@feature(EMBER_ROUTING_MODEL_ARG) Actions are not triggered on the controller if a matching action name is implemented as a method'](
      assert
    ) {
      let done = assert.async();

      this.router.map(function () {
        this.route('home', { path: '/' });
      });

      let model = { name: 'Tom Dale' };
      let stateIsNotCalled = true;

      this.add(
        'route:home',
        Route.extend({
          model() {
            return model;
          },

          actions: {
            showStuff(context) {
              assert.ok(stateIsNotCalled, 'an event on the state is not triggered');
              assert.deepEqual(context, { name: 'Tom Dale' }, 'an event with context is passed');
              done();
            },
          },
        })
      );

      this.addTemplate('home', '<a {{action "showStuff" @model}}>{{this.name}}</a>');

      this.add(
        'controller:home',
        Controller.extend({
          showStuff() {
            stateIsNotCalled = false;
            assert.ok(stateIsNotCalled, 'an event on the state is not triggered');
          },
        })
      );

      await this.visit('/');

      document.getElementById('qunit-fixture').querySelector('a').click();
    }

    async ['@test actions can be triggered with multiple arguments'](assert) {
      let done = assert.async();
      this.router.map(function () {
        this.route('root', { path: '/' }, function () {
          this.route('index', { path: '/' });
        });
      });

      let model1 = { name: 'Tilde' };
      let model2 = { name: 'Tom Dale' };

      let RootRoute = Route.extend({
        actions: {
          showStuff(obj1, obj2) {
            assert.ok(this instanceof RootRoute, 'the handler is an App.HomeRoute');
            assert.deepEqual(
              Object.assign({}, obj1),
              { name: 'Tilde' },
              'the first context is correct'
            );
            assert.deepEqual(
              Object.assign({}, obj2),
              { name: 'Tom Dale' },
              'the second context is correct'
            );
            done();
          },
        },
      });

      this.add('route:root', RootRoute);

      this.add(
        'controller:root.index',
        Controller.extend({
          model1: model1,
          model2: model2,
        })
      );

      this.addTemplate('root.index', '<a {{action "showStuff" model1 model2}}>{{model1.name}}</a>');

      await this.visit('/');

      document.getElementById('qunit-fixture').querySelector('a').click();
    }

    ['@test transitioning multiple times in a single run loop only sets the URL once'](assert) {
      this.router.map(function () {
        this.route('root', { path: '/' });
        this.route('foo');
        this.route('bar');
      });

      return this.visit('/').then(() => {
        let urlSetCount = 0;
        let router = this.applicationInstance.lookup('router:main');

        router.get('location').setURL = function (path) {
          urlSetCount++;
          set(this, 'path', path);
        };

        assert.equal(urlSetCount, 0);

        run(function () {
          router.transitionTo('foo');
          router.transitionTo('bar');
        });

        assert.equal(urlSetCount, 1);
        assert.equal(router.get('location').getURL(), '/bar');
      });
    }

    ['@test navigating away triggers a url property change'](assert) {
      assert.expect(3);

      this.router.map(function () {
        this.route('root', { path: '/' });
        this.route('foo', { path: '/foo' });
        this.route('bar', { path: '/bar' });
      });

      return this.visit('/').then(() => {
        let router = this.applicationInstance.lookup('router:main');

        addObserver(router, 'url', function () {
          assert.ok(true, 'url change event was fired');
        });
        ['foo', 'bar', '/foo'].forEach((destination) => run(router, 'transitionTo', destination));
      });
    }

    ['@test using replaceWith calls location.replaceURL if available'](assert) {
      let setCount = 0;
      let replaceCount = 0;
      this.router.reopen({
        location: NoneLocation.create({
          setURL(path) {
            setCount++;
            set(this, 'path', path);
          },

          replaceURL(path) {
            replaceCount++;
            set(this, 'path', path);
          },
        }),
      });

      this.router.map(function () {
        this.route('root', { path: '/' });
        this.route('foo');
      });

      return this.visit('/').then(() => {
        let router = this.applicationInstance.lookup('router:main');
        assert.equal(setCount, 1);
        assert.equal(replaceCount, 0);

        run(() => router.replaceWith('foo'));

        assert.equal(setCount, 1, 'should not call setURL');
        assert.equal(replaceCount, 1, 'should call replaceURL once');
        assert.equal(router.get('location').getURL(), '/foo');
      });
    }

    ['@test using replaceWith calls setURL if location.replaceURL is not defined'](assert) {
      let setCount = 0;

      this.router.reopen({
        location: NoneLocation.create({
          setURL(path) {
            setCount++;
            set(this, 'path', path);
          },
        }),
      });

      this.router.map(function () {
        this.route('root', { path: '/' });
        this.route('foo');
      });

      return this.visit('/').then(() => {
        let router = this.applicationInstance.lookup('router:main');

        assert.equal(setCount, 1);
        run(() => router.replaceWith('foo'));
        assert.equal(setCount, 2, 'should call setURL once');
        assert.equal(router.get('location').getURL(), '/foo');
      });
    }

    ['@test A redirection hook is provided'](assert) {
      this.router.map(function () {
        this.route('choose', { path: '/' });
        this.route('home');
      });

      let chooseFollowed = 0;
      let destination = 'home';

      this.add(
        'route:choose',
        Route.extend({
          redirect() {
            if (destination) {
              this.transitionTo(destination);
            }
          },

          setupController() {
            chooseFollowed++;
          },
        })
      );

      return this.visit('/').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(
          chooseFollowed,
          0,
          "The choose route wasn't entered since a transition occurred"
        );
        assert.equal(
          rootElement.querySelectorAll('h3.hours').length,
          1,
          'The home template was rendered'
        );
        assert.equal(this.currentPath, 'home');
      });
    }

    ['@test Redirecting from the middle of a route aborts the remainder of the routes'](assert) {
      assert.expect(4);

      this.router.map(function () {
        this.route('home');
        this.route('foo', function () {
          this.route('bar', { resetNamespace: true }, function () {
            this.route('baz');
          });
        });
      });

      this.add(
        'route:bar',
        Route.extend({
          redirect() {
            this.transitionTo('home');
          },
          setupController() {
            assert.ok(false, 'Should transition before setupController');
          },
        })
      );

      this.add(
        'route:bar-baz',
        Route.extend({
          enter() {
            assert.ok(false, 'Should abort transition getting to next route');
          },
        })
      );

      return this.visit('/').then(() => {
        let router = this.applicationInstance.lookup('router:main');
        this.handleURLAborts(assert, '/foo/bar/baz');
        let currentPath;
        expectDeprecation(() => {
          currentPath = this.applicationInstance
            .lookup('controller:application')
            .get('currentPath');
        }, 'Accessing `currentPath` on `controller:application` is deprecated, use the `currentPath` property on `service:router` instead.');
        assert.equal(currentPath, 'home');
        assert.equal(router.get('location').getURL(), '/home');
      });
    }

    ['@test Redirecting to the current target in the middle of a route does not abort initial routing'](
      assert
    ) {
      assert.expect(6);

      this.router.map(function () {
        this.route('home');
        this.route('foo', function () {
          this.route('bar', { resetNamespace: true }, function () {
            this.route('baz');
          });
        });
      });

      let successCount = 0;

      this.add(
        'route:bar',
        Route.extend({
          redirect() {
            return this.transitionTo('bar.baz').then(function () {
              successCount++;
            });
          },

          setupController() {
            assert.ok(true, "Should still invoke bar's setupController");
          },
        })
      );

      this.add(
        'route:bar.baz',
        Route.extend({
          setupController() {
            assert.ok(true, "Should still invoke bar.baz's setupController");
          },
        })
      );

      return this.visit('/foo/bar/baz').then(() => {
        assert.ok(true, '/foo/bar/baz has been handled');
        let currentPath;
        expectDeprecation(() => {
          currentPath = this.applicationInstance
            .lookup('controller:application')
            .get('currentPath');
        }, 'Accessing `currentPath` on `controller:application` is deprecated, use the `currentPath` property on `service:router` instead.');
        assert.equal(currentPath, 'foo.bar.baz');
        assert.equal(successCount, 1, 'transitionTo success handler was called once');
      });
    }

    ['@test Redirecting to the current target with a different context aborts the remainder of the routes'](
      assert
    ) {
      assert.expect(5);

      this.router.map(function () {
        this.route('home');
        this.route('foo', function () {
          this.route('bar', { path: 'bar/:id', resetNamespace: true }, function () {
            this.route('baz');
          });
        });
      });

      let model = { id: 2 };

      let count = 0;

      this.add(
        'route:bar',
        Route.extend({
          afterModel() {
            if (count++ > 10) {
              assert.ok(false, 'infinite loop');
            } else {
              this.transitionTo('bar.baz', model);
            }
          },
        })
      );

      this.add(
        'route:bar.baz',
        Route.extend({
          setupController() {
            assert.ok(true, 'Should still invoke setupController');
          },
        })
      );

      return this.visit('/').then(() => {
        this.handleURLAborts(assert, '/foo/bar/1/baz');
        let currentPath;
        expectDeprecation(() => {
          currentPath = this.applicationInstance
            .lookup('controller:application')
            .get('currentPath');
        }, 'Accessing `currentPath` on `controller:application` is deprecated, use the `currentPath` property on `service:router` instead.');
        assert.equal(currentPath, 'foo.bar.baz');
        assert.equal(
          this.applicationInstance.lookup('router:main').get('location').getURL(),
          '/foo/bar/2/baz'
        );
      });
    }

    ['@test Transitioning from a parent event does not prevent currentPath from being set'](
      assert
    ) {
      this.router.map(function () {
        this.route('foo', function () {
          this.route('bar', { resetNamespace: true }, function () {
            this.route('baz');
          });
          this.route('qux');
        });
      });

      this.add(
        'route:foo',
        Route.extend({
          actions: {
            goToQux() {
              this.transitionTo('foo.qux');
            },
          },
        })
      );

      return this.visit('/foo/bar/baz').then(() => {
        assert.ok(true, '/foo/bar/baz has been handled');
        let applicationController = this.applicationInstance.lookup('controller:application');
        let router = this.applicationInstance.lookup('router:main');

        let currentPath;
        expectDeprecation(() => {
          currentPath = applicationController.get('currentPath');
        }, 'Accessing `currentPath` on `controller:application` is deprecated, use the `currentPath` property on `service:router` instead.');
        assert.equal(currentPath, 'foo.bar.baz');
        run(() => router.send('goToQux'));
        expectDeprecation(() => {
          currentPath = applicationController.get('currentPath');
        }, 'Accessing `currentPath` on `controller:application` is deprecated, use the `currentPath` property on `service:router` instead.');
        assert.equal(currentPath, 'foo.qux');
        assert.equal(router.get('location').getURL(), '/foo/qux');
      });
    }

    ['@test Router accounts for rootURL on page load when using history location'](assert) {
      let rootURL = window.location.pathname + '/app';
      let postsTemplateRendered = false;
      let setHistory;

      setHistory = function (obj, path) {
        obj.set('history', { state: { path: path } });
      };

      let location = HistoryLocation.create({
        initState() {
          let path = rootURL + '/posts';

          setHistory(this, path);
          this.set('location', {
            pathname: path,
            href: 'http://localhost/' + path,
          });
        },

        replaceState(path) {
          setHistory(this, path);
        },

        pushState(path) {
          setHistory(this, path);
        },
      });

      this.router.reopen({
        // location: 'historyTest',
        location,
        rootURL: rootURL,
      });

      this.router.map(function () {
        this.route('posts', { path: '/posts' });
      });

      this.add(
        'route:posts',
        Route.extend({
          model() {},
          renderTemplate() {
            postsTemplateRendered = true;
          },
        })
      );

      return this.visit('/').then(() => {
        assert.ok(postsTemplateRendered, 'Posts route successfully stripped from rootURL');

        runDestroy(location);
        location = null;
      });
    }

    ['@test The rootURL is passed properly to the location implementation'](assert) {
      assert.expect(1);
      let rootURL = '/blahzorz';
      this.add(
        'location:history-test',
        HistoryLocation.extend({
          rootURL: 'this is not the URL you are looking for',
          history: {
            pushState() {},
          },
          initState() {
            assert.equal(this.get('rootURL'), rootURL);
          },
        })
      );

      this.router.reopen({
        location: 'history-test',
        rootURL: rootURL,
        // if we transition in this test we will receive failures
        // if the tests are run from a static file
        _doURLTransition() {
          return RSVP.resolve('');
        },
      });

      return this.visit('/');
    }

    ['@test Generating a URL should not affect currentModel'](assert) {
      this.router.map(function () {
        this.route('post', { path: '/posts/:post_id' });
      });

      let posts = {
        1: { id: 1 },
        2: { id: 2 },
      };

      this.add(
        'route:post',
        Route.extend({
          model(params) {
            return posts[params.post_id];
          },
        })
      );

      return this.visit('/posts/1').then(() => {
        assert.ok(true, '/posts/1 has been handled');

        let route = this.applicationInstance.lookup('route:post');
        assert.equal(route.modelFor('post'), posts[1]);

        let url = this.applicationInstance.lookup('router:main').generate('post', posts[2]);
        assert.equal(url, '/posts/2');
        assert.equal(route.modelFor('post'), posts[1]);
      });
    }

    ["@test Nested index route is not overridden by parent's implicit index route"](assert) {
      this.router.map(function () {
        this.route('posts', function () {
          this.route('index', { path: ':category' });
        });
      });

      return this.visit('/')
        .then(() => {
          let router = this.applicationInstance.lookup('router:main');
          return router.transitionTo('posts', { category: 'emberjs' });
        })
        .then(() => {
          let router = this.applicationInstance.lookup('router:main');
          assert.deepEqual(router.location.path, '/posts/emberjs');
        });
    }

    ['@test Promises encountered on app load put app into loading state until resolved'](assert) {
      assert.expect(2);

      let deferred = RSVP.defer();
      this.router.map(function () {
        this.route('index', { path: '/' });
      });

      this.add(
        'route:index',
        Route.extend({
          model() {
            return deferred.promise;
          },
        })
      );

      this.addTemplate('index', '<p>INDEX</p>');
      this.addTemplate('loading', '<p>LOADING</p>');

      run(() => this.visit('/'));
      let rootElement = document.getElementById('qunit-fixture');
      assert.equal(
        getTextOf(rootElement.querySelector('p')),
        'LOADING',
        'The loading state is displaying.'
      );
      run(deferred.resolve);
      assert.equal(
        getTextOf(rootElement.querySelector('p')),
        'INDEX',
        'The index route is display.'
      );
    }

    ['@test Router `willTransition` hook passes in cancellable transition'](assert) {
      assert.expect(8);
      this.router.reopen({
        willTransition(_, _2, transition) {
          assert.ok(true, 'willTransition was called');
          if (transition.intent.url !== '/') {
            transition.abort();
          }
        },
      });

      this.router.map(function () {
        this.route('nork');
        this.route('about');
      });

      this.add(
        'route:loading',
        Route.extend({
          activate() {
            assert.ok(false, 'LoadingRoute was not entered');
          },
        })
      );

      this.add(
        'route:nork',
        Route.extend({
          activate() {
            assert.ok(false, 'NorkRoute was not entered');
          },
        })
      );

      this.add(
        'route:about',
        Route.extend({
          activate() {
            assert.ok(false, 'AboutRoute was not entered');
          },
        })
      );

      let deprecation = /You attempted to override the "willTransition" method which is deprecated\./;

      return expectDeprecationAsync(() => {
        return this.visit('/').then(() => {
          this.handleURLAborts(assert, '/nork', deprecation);
          this.handleURLAborts(assert, '/about', deprecation);
        });
      }, deprecation);
    }

    ['@test Aborting/redirecting the transition in `willTransition` prevents LoadingRoute from being entered'](
      assert
    ) {
      assert.expect(5);

      this.router.map(function () {
        this.route('index');
        this.route('nork');
        this.route('about');
      });

      let redirect = false;

      this.add(
        'route:index',
        Route.extend({
          actions: {
            willTransition(transition) {
              assert.ok(true, 'willTransition was called');
              if (redirect) {
                // router.js won't refire `willTransition` for this redirect
                this.transitionTo('about');
              } else {
                transition.abort();
              }
            },
          },
        })
      );

      let deferred = null;

      this.add(
        'route:loading',
        Route.extend({
          activate() {
            assert.ok(deferred, 'LoadingRoute should be entered at this time');
          },
          deactivate() {
            assert.ok(true, 'LoadingRoute was exited');
          },
        })
      );

      this.add(
        'route:nork',
        Route.extend({
          activate() {
            assert.ok(true, 'NorkRoute was entered');
          },
        })
      );

      this.add(
        'route:about',
        Route.extend({
          activate() {
            assert.ok(true, 'AboutRoute was entered');
          },
          model() {
            if (deferred) {
              return deferred.promise;
            }
          },
        })
      );

      return this.visit('/').then(() => {
        let router = this.applicationInstance.lookup('router:main');
        // Attempted transitions out of index should abort.
        run(router, 'transitionTo', 'nork');
        run(router, 'handleURL', '/nork');

        // Attempted transitions out of index should redirect to about
        redirect = true;
        run(router, 'transitionTo', 'nork');
        run(router, 'transitionTo', 'index');

        // Redirected transitions out of index to a route with a
        // promise model should pause the transition and
        // activate LoadingRoute
        deferred = RSVP.defer();
        run(router, 'transitionTo', 'nork');
        run(deferred.resolve);
      });
    }

    async ['@test `didTransition` event fires on the router'](assert) {
      assert.expect(3);

      this.router.map(function () {
        this.route('nork');
      });

      await this.visit('/');

      let router = this.applicationInstance.lookup('router:main');
      router.one('didTransition', function () {
        assert.ok(true, 'didTransition fired on initial routing');
      });

      await this.visit('/');

      router.one('didTransition', function () {
        assert.ok(true, 'didTransition fired on the router');
        assert.equal(
          router.get('url'),
          '/nork',
          'The url property is updated by the time didTransition fires'
        );
      });

      await this.visit('/nork');
    }

    ['@test `activate` event fires on the route'](assert) {
      assert.expect(4);

      let eventFired = 0;

      this.router.map(function () {
        this.route('nork');
      });

      this.add(
        'route:nork',
        Route.extend({
          init() {
            this._super(...arguments);

            this.on('activate', function (transition) {
              assert.equal(++eventFired, 1, 'activate event is fired once');
              assert.ok(transition, 'transition is passed to activate event');
            });
          },

          activate(transition) {
            assert.ok(true, 'activate hook is called');
            assert.ok(transition, 'transition is passed to activate hook');
          },
        })
      );

      return this.visit('/nork');
    }

    ['@test `deactivate` event fires on the route'](assert) {
      assert.expect(4);

      let eventFired = 0;

      this.router.map(function () {
        this.route('nork');
        this.route('dork');
      });

      this.add(
        'route:nork',
        Route.extend({
          init() {
            this._super(...arguments);

            this.on('deactivate', function (transition) {
              assert.equal(++eventFired, 1, 'deactivate event is fired once');
              assert.ok(transition, 'transition is passed');
            });
          },

          deactivate(transition) {
            assert.ok(true, 'deactivate hook is called');
            assert.ok(transition, 'transition is passed');
          },
        })
      );

      return this.visit('/nork').then(() => this.visit('/dork'));
    }

    ['@test Actions can be handled by inherited action handlers'](assert) {
      assert.expect(4);

      let SuperRoute = Route.extend({
        actions: {
          foo() {
            assert.ok(true, 'foo');
          },
          bar(msg) {
            assert.equal(msg, 'HELLO');
          },
        },
      });

      let RouteMixin = Mixin.create({
        actions: {
          bar(msg) {
            assert.equal(msg, 'HELLO');
            this._super(msg);
          },
        },
      });

      this.add(
        'route:home',
        SuperRoute.extend(RouteMixin, {
          actions: {
            baz() {
              assert.ok(true, 'baz');
            },
          },
        })
      );

      this.addTemplate(
        'home',
        `
      <a class="do-foo" {{action "foo"}}>Do foo</a>
      <a class="do-bar-with-arg" {{action "bar" "HELLO"}}>Do bar with arg</a>
      <a class="do-baz" {{action "baz"}}>Do bar</a>
    `
      );

      return this.visit('/').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        rootElement.querySelector('.do-foo').click();
        rootElement.querySelector('.do-bar-with-arg').click();
        rootElement.querySelector('.do-baz').click();
      });
    }

    ['@test transitionTo returns Transition when passed a route name'](assert) {
      assert.expect(1);

      this.router.map(function () {
        this.route('root', { path: '/' });
        this.route('bar');
      });

      return this.visit('/').then(() => {
        let router = this.applicationInstance.lookup('router:main');
        let transition = run(() => router.transitionTo('bar'));
        assert.equal(transition instanceof Transition, true);
      });
    }

    ['@test transitionTo returns Transition when passed a url'](assert) {
      assert.expect(1);

      this.router.map(function () {
        this.route('root', { path: '/' });
        this.route('bar', function () {
          this.route('baz');
        });
      });

      return this.visit('/').then(() => {
        let router = this.applicationInstance.lookup('router:main');
        let transition = run(() => router.transitionTo('/bar/baz'));
        assert.equal(transition instanceof Transition, true);
      });
    }

    ['@test currentRouteName is a property installed on ApplicationController that can be used in transitionTo'](
      assert
    ) {
      assert.expect(36);

      this.router.map(function () {
        this.route('index', { path: '/' });
        this.route('be', function () {
          this.route('excellent', { resetNamespace: true }, function () {
            this.route('to', { resetNamespace: true }, function () {
              this.route('each', { resetNamespace: true }, function () {
                this.route('other');
              });
            });
          });
        });
      });

      return this.visit('/').then(() => {
        let appController = this.applicationInstance.lookup('controller:application');
        let router = this.applicationInstance.lookup('router:main');

        function transitionAndCheck(path, expectedPath, expectedRouteName) {
          if (path) {
            run(router, 'transitionTo', path);
          }
          expectDeprecation(() => {
            assert.equal(appController.get('currentPath'), expectedPath);
            assert.equal(appController.get('currentRouteName'), expectedRouteName);
          }, 'Accessing `currentPath` on `controller:application` is deprecated, use the `currentPath` property on `service:router` instead.');
        }

        transitionAndCheck(null, 'index', 'index');
        transitionAndCheck('/be', 'be.index', 'be.index');
        transitionAndCheck('/be/excellent', 'be.excellent.index', 'excellent.index');
        transitionAndCheck('/be/excellent/to', 'be.excellent.to.index', 'to.index');
        transitionAndCheck('/be/excellent/to/each', 'be.excellent.to.each.index', 'each.index');
        transitionAndCheck(
          '/be/excellent/to/each/other',
          'be.excellent.to.each.other',
          'each.other'
        );

        transitionAndCheck('index', 'index', 'index');
        transitionAndCheck('be', 'be.index', 'be.index');
        transitionAndCheck('excellent', 'be.excellent.index', 'excellent.index');
        transitionAndCheck('to.index', 'be.excellent.to.index', 'to.index');
        transitionAndCheck('each', 'be.excellent.to.each.index', 'each.index');
        transitionAndCheck('each.other', 'be.excellent.to.each.other', 'each.other');
      });
    }

    ["@test Redirecting with null model doesn't error out"](assert) {
      this.router.map(function () {
        this.route('home', { path: '/' });
        this.route('about', { path: '/about/:hurhurhur' });
      });

      this.add(
        'route:about',
        Route.extend({
          serialize: function (model) {
            if (model === null) {
              return { hurhurhur: 'TreeklesMcGeekles' };
            }
          },
        })
      );

      this.add(
        'route:home',
        Route.extend({
          beforeModel() {
            this.transitionTo('about', null);
          },
        })
      );

      return this.visit('/').then(() => {
        let router = this.applicationInstance.lookup('router:main');
        assert.equal(router.get('location.path'), '/about/TreeklesMcGeekles');
      });
    }

    async ['@test rejecting the model hooks promise with a non-error prints the `message` property'](
      assert
    ) {
      assert.expect(5);

      let rejectedMessage = 'OMG!! SOOOOOO BAD!!!!';
      let rejectedStack = 'Yeah, buddy: stack gets printed too.';

      this.router.map(function () {
        this.route('yippie', { path: '/' });
      });

      console.error = function (initialMessage, errorMessage, errorStack) {
        assert.equal(
          initialMessage,
          'Error while processing route: yippie',
          'a message with the current route name is printed'
        );
        assert.equal(
          errorMessage,
          rejectedMessage,
          "the rejected reason's message property is logged"
        );
        assert.equal(errorStack, rejectedStack, "the rejected reason's stack property is logged");
      };

      this.add(
        'route:yippie',
        Route.extend({
          model() {
            return RSVP.reject({
              message: rejectedMessage,
              stack: rejectedStack,
            });
          },
        })
      );

      await assert.rejects(
        this.visit('/'),
        function (err) {
          assert.equal(err.message, rejectedMessage);
          return true;
        },
        'expected an exception'
      );
    }

    async ['@test rejecting the model hooks promise with an error with `errorThrown` property prints `errorThrown.message` property'](
      assert
    ) {
      assert.expect(5);
      let rejectedMessage = 'OMG!! SOOOOOO BAD!!!!';
      let rejectedStack = 'Yeah, buddy: stack gets printed too.';

      this.router.map(function () {
        this.route('yippie', { path: '/' });
      });

      console.error = function (initialMessage, errorMessage, errorStack) {
        assert.equal(
          initialMessage,
          'Error while processing route: yippie',
          'a message with the current route name is printed'
        );
        assert.equal(
          errorMessage,
          rejectedMessage,
          "the rejected reason's message property is logged"
        );
        assert.equal(errorStack, rejectedStack, "the rejected reason's stack property is logged");
      };

      this.add(
        'route:yippie',
        Route.extend({
          model() {
            return RSVP.reject({
              errorThrown: { message: rejectedMessage, stack: rejectedStack },
            });
          },
        })
      );

      await assert.rejects(
        this.visit('/'),
        function ({ errorThrown: err }) {
          assert.equal(err.message, rejectedMessage);
          return true;
        },
        'expected an exception'
      );
    }

    async ['@test rejecting the model hooks promise with no reason still logs error'](assert) {
      assert.expect(2);
      this.router.map(function () {
        this.route('wowzers', { path: '/' });
      });

      console.error = function (initialMessage) {
        assert.equal(
          initialMessage,
          'Error while processing route: wowzers',
          'a message with the current route name is printed'
        );
      };

      this.add(
        'route:wowzers',
        Route.extend({
          model() {
            return RSVP.reject();
          },
        })
      );

      await assert.rejects(this.visit('/'));
    }

    async ['@test rejecting the model hooks promise with a string shows a good error'](assert) {
      assert.expect(3);
      let rejectedMessage = 'Supercalifragilisticexpialidocious';

      this.router.map(function () {
        this.route('yondo', { path: '/' });
      });

      console.error = function (initialMessage, errorMessage) {
        assert.equal(
          initialMessage,
          'Error while processing route: yondo',
          'a message with the current route name is printed'
        );
        assert.equal(
          errorMessage,
          rejectedMessage,
          "the rejected reason's message property is logged"
        );
      };

      this.add(
        'route:yondo',
        Route.extend({
          model() {
            return RSVP.reject(rejectedMessage);
          },
        })
      );

      await assert.rejects(this.visit('/'), new RegExp(rejectedMessage), 'expected an exception');
    }

    ["@test willLeave, willChangeContext, willChangeModel actions don't fire unless feature flag enabled"](
      assert
    ) {
      assert.expect(1);

      this.router.map(function () {
        this.route('about');
      });

      function shouldNotFire() {
        assert.ok(false, "this action shouldn't have been received");
      }

      this.add(
        'route:index',
        Route.extend({
          actions: {
            willChangeModel: shouldNotFire,
            willChangeContext: shouldNotFire,
            willLeave: shouldNotFire,
          },
        })
      );

      this.add(
        'route:about',
        Route.extend({
          setupController() {
            assert.ok(true, 'about route was entered');
          },
        })
      );

      return this.visit('/about');
    }

    async ['@test Errors in transitionTo within redirect hook are logged'](assert) {
      assert.expect(4);
      let actual = [];

      this.router.map(function () {
        this.route('yondo', { path: '/' });
        this.route('stink-bomb');
      });

      this.add(
        'route:yondo',
        Route.extend({
          redirect() {
            this.transitionTo('stink-bomb', { something: 'goes boom' });
          },
        })
      );

      console.error = function () {
        // push the arguments onto an array so we can detect if the error gets logged twice
        actual.push(arguments);
      };

      await assert.rejects(this.visit('/'), /More context objects were passed/);

      assert.equal(actual.length, 1, 'the error is only logged once');
      assert.equal(actual[0][0], 'Error while processing route: yondo', 'source route is printed');
      assert.ok(
        actual[0][1].match(
          /More context objects were passed than there are dynamic segments for the route: stink-bomb/
        ),
        'the error is printed'
      );
    }

    ['@test Errors in transition show error template if available'](assert) {
      this.addTemplate('error', "<div id='error'>Error!</div>");

      this.router.map(function () {
        this.route('yondo', { path: '/' });
        this.route('stink-bomb');
      });

      this.add(
        'route:yondo',
        Route.extend({
          redirect() {
            this.transitionTo('stink-bomb', { something: 'goes boom' });
          },
        })
      );
      console.error = () => {};

      return this.visit('/').then(() => {
        let rootElement = document.querySelector('#qunit-fixture');
        assert.equal(
          rootElement.querySelectorAll('#error').length,
          1,
          'Error template was rendered.'
        );
      });
    }

    ['@test Route#resetController gets fired when changing models and exiting routes'](assert) {
      assert.expect(4);

      this.router.map(function () {
        this.route('a', function () {
          this.route('b', { path: '/b/:id', resetNamespace: true }, function () {});
          this.route('c', { path: '/c/:id', resetNamespace: true }, function () {});
        });
        this.route('out');
      });

      let calls = [];

      let SpyRoute = Route.extend({
        setupController(/* controller, model, transition */) {
          calls.push(['setup', this.routeName]);
        },

        resetController(/* controller */) {
          calls.push(['reset', this.routeName]);
        },
      });

      this.add('route:a', SpyRoute.extend());
      this.add('route:b', SpyRoute.extend());
      this.add('route:c', SpyRoute.extend());
      this.add('route:out', SpyRoute.extend());

      let router;
      return this.visit('/')
        .then(() => {
          router = this.applicationInstance.lookup('router:main');
          assert.deepEqual(calls, []);
          return run(router, 'transitionTo', 'b', 'b-1');
        })
        .then(() => {
          assert.deepEqual(calls, [
            ['setup', 'a'],
            ['setup', 'b'],
          ]);
          calls.length = 0;
          return run(router, 'transitionTo', 'c', 'c-1');
        })
        .then(() => {
          assert.deepEqual(calls, [
            ['reset', 'b'],
            ['setup', 'c'],
          ]);
          calls.length = 0;
          return run(router, 'transitionTo', 'out');
        })
        .then(() => {
          assert.deepEqual(calls, [
            ['reset', 'c'],
            ['reset', 'a'],
            ['setup', 'out'],
          ]);
        });
    }

    async ['@test Exception during initialization of non-initial route is not swallowed'](assert) {
      this.router.map(function () {
        this.route('boom');
      });
      this.add(
        'route:boom',
        Route.extend({
          init() {
            throw new Error('boom!');
          },
        })
      );

      await assert.rejects(this.visit('/boom'), /\bboom\b/);
    }

    async ['@test Exception during initialization of initial route is not swallowed'](assert) {
      this.router.map(function () {
        this.route('boom', { path: '/' });
      });
      this.add(
        'route:boom',
        Route.extend({
          init() {
            throw new Error('boom!');
          },
        })
      );

      await assert.rejects(this.visit('/'), /\bboom\b/);
    }

    async ['@test Doesnt swallow exception thrown from willTransition'](assert) {
      assert.expect(1);
      this.addTemplate('application', '{{outlet}}');
      this.addTemplate('index', 'index');
      this.addTemplate('other', 'other');

      this.router.map(function () {
        this.route('index', { path: '/' });
        this.route('other', function () {});
      });

      this.add(
        'route:index',
        Route.extend({
          actions: {
            willTransition() {
              throw new Error('boom');
            },
          },
        })
      );

      await this.visit('/');
      await assert.rejects(
        this.visit('/other'),
        /boom/,
        'expected an exception but none was thrown'
      );
    }

    ['@test Route serializers work for Engines'](assert) {
      assert.expect(2);

      // Register engine
      let BlogEngine = Engine.extend({
        Resolver: ModuleBasedTestResolver,
      });
      this.add('engine:blog', BlogEngine);

      // Register engine route map
      let postSerialize = function (params) {
        assert.ok(true, 'serialize hook runs');
        return {
          post_id: params.id,
        };
      };
      let BlogMap = function () {
        this.route('post', {
          path: '/post/:post_id',
          serialize: postSerialize,
        });
      };
      this.add('route-map:blog', BlogMap);

      this.router.map(function () {
        this.mount('blog');
      });

      return this.visit('/').then(() => {
        let router = this.applicationInstance.lookup('router:main');
        assert.equal(
          router._routerMicrolib.generate('blog.post', { id: '13' }),
          '/blog/post/13',
          'url is generated properly'
        );
      });
    }

    async ['@test Defining a Route#serialize method in an Engine throws an error'](assert) {
      assert.expect(1);

      // Register engine
      let BlogEngine = Engine.extend({
        Resolver: ModuleBasedTestResolver,
      });
      this.add('engine:blog', BlogEngine);

      // Register engine route map
      let BlogMap = function () {
        this.route('post');
      };
      this.add('route-map:blog', BlogMap);

      this.router.map(function () {
        this.mount('blog');
      });

      await this.visit('/');

      let router = this.applicationInstance.lookup('router:main');
      let PostRoute = Route.extend({ serialize() {} });
      this.applicationInstance.lookup('engine:blog').register('route:post', PostRoute);

      try {
        // TODO: for some reason this doesn't work with assert.reject
        await router.transitionTo('blog.post');
      } catch (e) {
        assert.ok(
          e.message.match(/Defining a custom serialize method on an Engine route is not supported/)
        );
      }
    }

    ['@test App.destroy does not leave undestroyed views after clearing engines'](assert) {
      assert.expect(4);

      let engineInstance;
      // Register engine
      let BlogEngine = Engine.extend({
        Resolver: ModuleBasedTestResolver,
      });
      this.add('engine:blog', BlogEngine);
      let EngineIndexRoute = Route.extend({
        init() {
          this._super(...arguments);
          engineInstance = getOwner(this);
        },
      });

      // Register engine route map
      let BlogMap = function () {
        this.route('post');
      };
      this.add('route-map:blog', BlogMap);

      this.router.map(function () {
        this.mount('blog');
      });

      return this.visit('/')
        .then(() => {
          let engine = this.applicationInstance.lookup('engine:blog');
          engine.register('route:index', EngineIndexRoute);
          engine.register('template:index', compile('Engine Post!'));
          return this.visit('/blog');
        })
        .then(() => {
          assert.ok(true, '/blog has been handled');
          let route = engineInstance.lookup('route:index');
          let router = this.applicationInstance.lookup('router:main');

          run(router, 'destroy');
          assert.equal(router._toplevelView, null, 'the toplevelView was cleared');

          run(route, 'destroy');
          assert.equal(router._toplevelView, null, 'the toplevelView was not reinitialized');

          run(this.applicationInstance, 'destroy');
          assert.equal(router._toplevelView, null, 'the toplevelView was not reinitialized');
        });
    }

    ["@test Generated route should be an instance of App's default route if provided"](assert) {
      let generatedRoute;

      this.router.map(function () {
        this.route('posts');
      });

      let AppRoute = Route.extend();
      this.add('route:basic', AppRoute);

      return this.visit('/posts').then(() => {
        generatedRoute = this.applicationInstance.lookup('route:posts');

        assert.ok(generatedRoute instanceof AppRoute, 'should extend the correct route');
      });
    }
  }
);
