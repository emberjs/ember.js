/* eslint-disable no-console */
import { getOwner } from '@ember/-internals/owner';
import RSVP from 'rsvp';
import { compile } from 'ember-template-compiler';
import { ENV } from '@ember/-internals/environment';
import { Route, NoneLocation, HistoryLocation } from '@ember/-internals/routing';
import Controller from '@ember/controller';
import { Object as EmberObject, A as emberA } from '@ember/-internals/runtime';
import { moduleFor, ApplicationTestCase, runDestroy } from 'internal-test-helpers';
import { run } from '@ember/runloop';
import { Mixin, computed, set, addObserver, observer } from '@ember/-internals/metal';
import { getTextOf } from 'internal-test-helpers';
import { Component } from '@ember/-internals/glimmer';
import Engine from '@ember/engine';
import { Transition } from 'router_js';

let originalRenderSupport;
let originalConsoleError;

moduleFor(
  'Basic Routing - Decoupled from global resolver',
  class extends ApplicationTestCase {
    constructor() {
      super(...arguments);
      this.addTemplate('home', '<h3 class="hours">Hours</h3>');
      this.addTemplate('camelot', '<section id="camelot"><h3>Is a silly place</h3></section>');
      this.addTemplate('homepage', '<h3 id="troll">Megatroll</h3><p>{{model.home}}</p>');

      this.router.map(function() {
        this.route('home', { path: '/' });
      });
      originalRenderSupport = ENV._ENABLE_RENDER_SUPPORT;
      ENV._ENABLE_RENDER_SUPPORT = true;
      originalConsoleError = console.error;
    }

    teardown() {
      super.teardown();
      ENV._ENABLE_RENDER_SUPPORT = originalRenderSupport;
      console.error = originalConsoleError;
    }

    getController(name) {
      return this.applicationInstance.lookup(`controller:${name}`);
    }

    handleURLAborts(assert, path) {
      run(() => {
        let router = this.applicationInstance.lookup('router:main');
        router.handleURL(path).then(
          function() {
            assert.ok(false, 'url: `' + path + '` was NOT to be handled');
          },
          function(reason) {
            assert.ok(
              reason && reason.message === 'TransitionAborted',
              'url: `' + path + '` was to be aborted'
            );
          }
        );
      });
    }

    get currentPath() {
      return this.getController('application').get('currentPath');
    }

    get currentURL() {
      return this.appRouter.get('currentURL');
    }

    handleURLRejectsWith(context, assert, path, expectedReason) {
      return context
        .visit(path)
        .then(() => {
          assert.ok(false, 'expected handleURLing: `' + path + '` to fail');
        })
        .catch(reason => {
          assert.equal(reason, expectedReason);
        });
    }

    ['@test warn on URLs not included in the route set']() {
      return this.visit('/').then(() => {
        expectAssertion(() => {
          this.visit('/what-is-this-i-dont-even');
        }, /'\/what-is-this-i-dont-even' did not match any routes/);
      });
    }

    ['@test The Homepage'](assert) {
      return this.visit('/').then(() => {
        assert.equal(this.currentPath, 'home', 'currently on the home route');

        let text = this.$('.hours').text();
        assert.equal(text, 'Hours', 'the home template was rendered');
      });
    }

    [`@test The Homepage and the Camelot page with multiple Router.map calls`](assert) {
      this.router.map(function() {
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

    [`@test The Homepage with explicit template name in renderTemplate`](assert) {
      this.add(
        'route:home',
        Route.extend({
          renderTemplate() {
            this.render('homepage');
          },
        })
      );

      return this.visit('/').then(() => {
        let text = this.$('#troll').text();
        assert.equal(text, 'Megatroll', 'the homepage template was rendered');
      });
    }

    [`@test an alternate template will pull in an alternate controller`](assert) {
      this.add(
        'route:home',
        Route.extend({
          renderTemplate() {
            this.render('homepage');
          },
        })
      );
      this.add(
        'controller:homepage',
        Controller.extend({
          model: {
            home: 'Comes from homepage',
          },
        })
      );

      return this.visit('/').then(() => {
        let text = this.$('p').text();

        assert.equal(text, 'Comes from homepage', 'the homepage template was rendered');
      });
    }

    [`@test An alternate template will pull in an alternate controller instead of controllerName`](
      assert
    ) {
      this.add(
        'route:home',
        Route.extend({
          controllerName: 'foo',
          renderTemplate() {
            this.render('homepage');
          },
        })
      );
      this.add(
        'controller:foo',
        Controller.extend({
          model: {
            home: 'Comes from foo',
          },
        })
      );
      this.add(
        'controller:homepage',
        Controller.extend({
          model: {
            home: 'Comes from homepage',
          },
        })
      );

      return this.visit('/').then(() => {
        let text = this.$('p').text();

        assert.equal(text, 'Comes from homepage', 'the homepage template was rendered');
      });
    }

    [`@test The template will pull in an alternate controller via key/value`](assert) {
      this.router.map(function() {
        this.route('homepage', { path: '/' });
      });

      this.add(
        'route:homepage',
        Route.extend({
          renderTemplate() {
            this.render({ controller: 'home' });
          },
        })
      );
      this.add(
        'controller:home',
        Controller.extend({
          model: {
            home: 'Comes from home.',
          },
        })
      );

      return this.visit('/').then(() => {
        let text = this.$('p').text();

        assert.equal(
          text,
          'Comes from home.',
          'the homepage template was rendered from data from the HomeController'
        );
      });
    }

    [`@test The Homepage with explicit template name in renderTemplate and controller`](assert) {
      this.add(
        'controller:home',
        Controller.extend({
          model: {
            home: 'YES I AM HOME',
          },
        })
      );
      this.add(
        'route:home',
        Route.extend({
          renderTemplate() {
            this.render('homepage');
          },
        })
      );

      return this.visit('/').then(() => {
        let text = this.$('p').text();

        assert.equal(text, 'YES I AM HOME', 'The homepage template was rendered');
      });
    }

    [`@test Model passed via renderTemplate model is set as controller's model`](assert) {
      this.addTemplate('bio', '<p>{{model.name}}</p>');
      this.add(
        'route:home',
        Route.extend({
          renderTemplate() {
            this.render('bio', {
              model: { name: 'emberjs' },
            });
          },
        })
      );

      return this.visit('/').then(() => {
        let text = this.$('p').text();

        assert.equal(text, 'emberjs', `Passed model was set as controller's model`);
      });
    }

    ['@test render uses templateName from route'](assert) {
      this.addTemplate('the_real_home_template', '<p>THIS IS THE REAL HOME</p>');
      this.add(
        'route:home',
        Route.extend({
          templateName: 'the_real_home_template',
        })
      );

      return this.visit('/').then(() => {
        let text = this.$('p').text();

        assert.equal(text, 'THIS IS THE REAL HOME', 'the homepage template was rendered');
      });
    }

    ['@test defining templateName allows other templates to be rendered'](assert) {
      this.addTemplate('alert', `<div class='alert-box'>Invader!</div>`);
      this.addTemplate('the_real_home_template', `<p>THIS IS THE REAL HOME</p>{{outlet 'alert'}}`);
      this.add(
        'route:home',
        Route.extend({
          templateName: 'the_real_home_template',
          actions: {
            showAlert() {
              this.render('alert', {
                into: 'home',
                outlet: 'alert',
              });
            },
          },
        })
      );

      return this.visit('/')
        .then(() => {
          let text = this.$('p').text();
          assert.equal(text, 'THIS IS THE REAL HOME', 'the homepage template was rendered');

          return this.runTask(() => this.appRouter.send('showAlert'));
        })
        .then(() => {
          let text = this.$('.alert-box').text();

          assert.equal(text, 'Invader!', 'Template for alert was rendered into the outlet');
        });
    }

    ['@test templateName is still used when calling render with no name and options'](assert) {
      this.addTemplate('alert', `<div class='alert-box'>Invader!</div>`);
      this.addTemplate('home', `<p>THIS IS THE REAL HOME</p>{{outlet 'alert'}}`);

      this.add(
        'route:home',
        Route.extend({
          templateName: 'alert',
          renderTemplate() {
            this.render({});
          },
        })
      );

      return this.visit('/').then(() => {
        let text = this.$('.alert-box').text();

        assert.equal(text, 'Invader!', 'default templateName was rendered into outlet');
      });
    }

    ['@test The Homepage with a `setupController` hook'](assert) {
      this.addTemplate(
        'home',
        `<ul>{{#each hours as |entry|}}
        <li>{{entry}}</li>
      {{/each}}
      </ul>
    `
      );

      this.add(
        'route:home',
        Route.extend({
          setupController(controller) {
            controller.set('hours', [
              'Monday through Friday: 9am to 5pm',
              'Saturday: Noon to Midnight',
              'Sunday: Noon to 6pm',
            ]);
          },
        })
      );
      return this.visit('/').then(() => {
        let text = this.$('ul li:nth-child(3)').text();

        assert.equal(
          text,
          'Sunday: Noon to 6pm',
          'The template was rendered with the hours context'
        );
      });
    }

    [`@test The route controller is still set when overriding the setupController hook`](assert) {
      this.add(
        'route:home',
        Route.extend({
          setupController() {
            // no-op
            // importantly, we are not calling this._super
          },
        })
      );

      this.add('controller:home', Controller.extend());

      return this.visit('/').then(() => {
        let homeRoute = this.applicationInstance.lookup('route:home');
        let homeController = this.applicationInstance.lookup('controller:home');

        assert.equal(
          homeRoute.controller,
          homeController,
          'route controller is the home controller'
        );
      });
    }

    ['@test the route controller can be specified via controllerName'](assert) {
      this.addTemplate('home', '<p>{{myValue}}</p>');
      this.add(
        'route:home',
        Route.extend({
          controllerName: 'myController',
        })
      );
      this.add(
        'controller:myController',
        Controller.extend({
          myValue: 'foo',
        })
      );

      return this.visit('/').then(() => {
        let homeRoute = this.applicationInstance.lookup('route:home');
        let myController = this.applicationInstance.lookup('controller:myController');
        let text = this.$('p').text();

        assert.equal(
          homeRoute.controller,
          myController,
          'route controller is set by controllerName'
        );
        assert.equal(
          text,
          'foo',
          'The homepage template was rendered with data from the custom controller'
        );
      });
    }

    [`@test The route controller specified via controllerName is used in render`](assert) {
      this.router.map(function() {
        this.route('home', { path: '/' });
      });

      this.add(
        'route:home',
        Route.extend({
          controllerName: 'myController',
          renderTemplate() {
            this.render('alternative_home');
          },
        })
      );

      this.add(
        'controller:myController',
        Controller.extend({
          myValue: 'foo',
        })
      );

      this.addTemplate('alternative_home', '<p>alternative home: {{myValue}}</p>');

      return this.visit('/').then(() => {
        let homeRoute = this.applicationInstance.lookup('route:home');
        let myController = this.applicationInstance.lookup('controller:myController');
        let text = this.$('p').text();

        assert.equal(
          homeRoute.controller,
          myController,
          'route controller is set by controllerName'
        );

        assert.equal(
          text,
          'alternative home: foo',
          'The homepage template was rendered with data from the custom controller'
        );
      });
    }

    [`@test The route controller specified via controllerName is used in render even when a controller with the routeName is available`](
      assert
    ) {
      this.router.map(function() {
        this.route('home', { path: '/' });
      });

      this.addTemplate('home', '<p>home: {{myValue}}</p>');

      this.add(
        'route:home',
        Route.extend({
          controllerName: 'myController',
        })
      );

      this.add(
        'controller:home',
        Controller.extend({
          myValue: 'home',
        })
      );

      this.add(
        'controller:myController',
        Controller.extend({
          myValue: 'myController',
        })
      );

      return this.visit('/').then(() => {
        let homeRoute = this.applicationInstance.lookup('route:home');
        let myController = this.applicationInstance.lookup('controller:myController');
        let text = this.$('p').text();

        assert.equal(
          homeRoute.controller,
          myController,
          'route controller is set by controllerName'
        );

        assert.equal(
          text,
          'home: myController',
          'The homepage template was rendered with data from the custom controller'
        );
      });
    }

    [`@test The Homepage with a 'setupController' hook modifying other controllers`](assert) {
      this.router.map(function() {
        this.route('home', { path: '/' });
      });

      this.add(
        'route:home',
        Route.extend({
          setupController(/* controller */) {
            this.controllerFor('home').set('hours', [
              'Monday through Friday: 9am to 5pm',
              'Saturday: Noon to Midnight',
              'Sunday: Noon to 6pm',
            ]);
          },
        })
      );

      this.addTemplate('home', '<ul>{{#each hours as |entry|}}<li>{{entry}}</li>{{/each}}</ul>');

      return this.visit('/').then(() => {
        let text = this.$('ul li:nth-child(3)').text();

        assert.equal(
          text,
          'Sunday: Noon to 6pm',
          'The template was rendered with the hours context'
        );
      });
    }

    [`@test The Homepage with a computed model that does not get overridden`](assert) {
      this.router.map(function() {
        this.route('home', { path: '/' });
      });

      this.add(
        'controller:home',
        Controller.extend({
          model: computed(function() {
            return [
              'Monday through Friday: 9am to 5pm',
              'Saturday: Noon to Midnight',
              'Sunday: Noon to 6pm',
            ];
          }),
        })
      );

      this.addTemplate(
        'home',
        '<ul>{{#each model as |passage|}}<li>{{passage}}</li>{{/each}}</ul>'
      );

      return this.visit('/').then(() => {
        let text = this.$('ul li:nth-child(3)').text();

        assert.equal(
          text,
          'Sunday: Noon to 6pm',
          'The template was rendered with the context intact'
        );
      });
    }

    [`@test The Homepage getting its controller context via model`](assert) {
      this.router.map(function() {
        this.route('home', { path: '/' });
      });

      this.add(
        'route:home',
        Route.extend({
          model() {
            return [
              'Monday through Friday: 9am to 5pm',
              'Saturday: Noon to Midnight',
              'Sunday: Noon to 6pm',
            ];
          },

          setupController(controller, model) {
            assert.equal(this.controllerFor('home'), controller);

            this.controllerFor('home').set('hours', model);
          },
        })
      );

      this.addTemplate('home', '<ul>{{#each hours as |entry|}}<li>{{entry}}</li>{{/each}}</ul>');

      return this.visit('/').then(() => {
        let text = this.$('ul li:nth-child(3)').text();

        assert.equal(
          text,
          'Sunday: Noon to 6pm',
          'The template was rendered with the hours context'
        );
      });
    }

    [`@test The Specials Page getting its controller context by deserializing the params hash`](
      assert
    ) {
      this.router.map(function() {
        this.route('home', { path: '/' });
        this.route('special', { path: '/specials/:menu_item_id' });
      });

      this.add(
        'route:special',
        Route.extend({
          model(params) {
            return EmberObject.create({
              menuItemId: params.menu_item_id,
            });
          },
        })
      );

      this.addTemplate('special', '<p>{{model.menuItemId}}</p>');

      return this.visit('/specials/1').then(() => {
        let text = this.$('p').text();

        assert.equal(text, '1', 'The model was used to render the template');
      });
    }

    ['@test The Specials Page defaults to looking models up via `find`']() {
      let MenuItem = EmberObject.extend();
      MenuItem.reopenClass({
        find(id) {
          return MenuItem.create({ id });
        },
      });
      this.add('model:menu_item', MenuItem);

      this.router.map(function() {
        this.route('home', { path: '/' });
        this.route('special', { path: '/specials/:menu_item_id' });
      });

      this.addTemplate('special', '{{model.id}}');

      return this.visit('/specials/1').then(() => {
        this.assertText('1', 'The model was used to render the template');
      });
    }

    ['@test The Special Page returning a promise puts the app into a loading state until the promise is resolved']() {
      this.router.map(function() {
        this.route('home', { path: '/' });
        this.route('special', { path: '/specials/:menu_item_id' });
      });

      let menuItem, resolve;

      let MenuItem = EmberObject.extend();
      MenuItem.reopenClass({
        find(id) {
          menuItem = MenuItem.create({ id: id });

          return new RSVP.Promise(function(res) {
            resolve = res;
          });
        },
      });

      this.add('model:menu_item', MenuItem);

      this.addTemplate('special', '<p>{{model.id}}</p>');
      this.addTemplate('loading', '<p>LOADING!</p>');

      let visited = this.visit('/specials/1');
      this.assertText('LOADING!', 'The app is in the loading state');

      resolve(menuItem);

      return visited.then(() => {
        this.assertText('1', 'The app is now in the specials state');
      });
    }

    [`@test The loading state doesn't get entered for promises that resolve on the same run loop`](
      assert
    ) {
      this.router.map(function() {
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

      this.addTemplate('special', '<p>{{model.id}}</p>');
      this.addTemplate('loading', '<p>LOADING!</p>');

      return this.visit('/specials/1').then(() => {
        let text = this.$('p').text();

        assert.equal(text, '1', 'The app is now in the specials state');
      });
    }

    ["@test The Special page returning an error invokes SpecialRoute's error handler"](assert) {
      this.router.map(function() {
        this.route('home', { path: '/' });
        this.route('special', { path: '/specials/:menu_item_id' });
      });

      let menuItem, promise, resolve;

      let MenuItem = EmberObject.extend();
      MenuItem.reopenClass({
        find(id) {
          menuItem = MenuItem.create({ id: id });
          promise = new RSVP.Promise(res => (resolve = res));

          return promise;
        },
      });

      this.add('model:menu_item', MenuItem);

      this.add(
        'route:special',
        Route.extend({
          setup() {
            throw 'Setup error';
          },
          actions: {
            error(reason) {
              assert.equal(
                reason,
                'Setup error',
                'SpecialRoute#error received the error thrown from setup'
              );
              return true;
            },
          },
        })
      );

      this.handleURLRejectsWith(this, assert, 'specials/1', 'Setup error');

      run(() => resolve(menuItem));
    }

    ["@test ApplicationRoute's default error handler can be overridden"](assert) {
      assert.expect(2);

      this.router.map(function() {
        this.route('home', { path: '/' });
        this.route('special', { path: '/specials/:menu_item_id' });
      });

      let menuItem, resolve;

      let MenuItem = EmberObject.extend();

      MenuItem.reopenClass({
        find(id) {
          menuItem = MenuItem.create({ id: id });
          return new RSVP.Promise(res => (resolve = res));
        },
      });
      this.add('model:menu_item', MenuItem);

      this.add(
        'route:application',
        Route.extend({
          actions: {
            error(reason) {
              assert.equal(
                reason,
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
            throw 'Setup error';
          },
        })
      );

      this.handleURLRejectsWith(this, assert, '/specials/1', 'Setup error');

      run(() => resolve(menuItem));
    }

    ['@test Moving from one page to another triggers the correct callbacks'](assert) {
      assert.expect(3);

      this.router.map(function() {
        this.route('home', { path: '/' });
        this.route('special', { path: '/specials/:menu_item_id' });
      });

      let MenuItem = EmberObject.extend();
      MenuItem.reopenClass({
        find(id) {
          return MenuItem.create({ id: id });
        },
      });
      this.add('model:menu_item', MenuItem);

      this.addTemplate('home', '<h3>Home</h3>');
      this.addTemplate('special', '<p>{{model.id}}</p>');

      return this.visit('/')
        .then(() => {
          this.assertText('Home', 'The app is now in the initial state');

          let promiseContext = MenuItem.create({ id: 1 });

          return this.visit('/specials/1', promiseContext);
        })
        .then(() => {
          assert.equal(this.currentURL, '/specials/1');
          this.assertText('1', 'The app is now transitioned');
        });
    }

    ['@test Nested callbacks are not exited when moving to siblings'](assert) {
      let rootSetup = 0;
      let rootRender = 0;
      let rootModel = 0;
      let rootSerialize = 0;
      let menuItem;
      let rootElement;

      let MenuItem = EmberObject.extend();
      MenuItem.reopenClass({
        find(id) {
          menuItem = MenuItem.create({ id: id });
          return menuItem;
        },
      });

      this.router.map(function() {
        this.route('root', { path: '/' }, function() {
          this.route('special', {
            path: '/specials/:menu_item_id',
            resetNamespace: true,
          });
        });
      });

      this.add(
        'route:root',
        Route.extend({
          model() {
            rootModel++;
            return this._super(...arguments);
          },

          setupController() {
            rootSetup++;
          },

          renderTemplate() {
            rootRender++;
          },

          serialize() {
            rootSerialize++;
            return this._super(...arguments);
          },
        })
      );

      this.add('route:loading', Route.extend({}));
      this.add('route:home', Route.extend({}));
      this.add(
        'route:special',
        Route.extend({
          model({ menu_item_id }) {
            return MenuItem.find(menu_item_id);
          },
          setupController(controller, model) {
            set(controller, 'model', model);
          },
        })
      );

      this.addTemplate('root.index', '<h3>Home</h3>');
      this.addTemplate('special', '<p>{{model.id}}</p>');
      this.addTemplate('loading', '<p>LOADING!</p>');

      return this.visit('/').then(() => {
        rootElement = document.getElementById('qunit-fixture');

        assert.equal(
          getTextOf(rootElement.querySelector('h3')),
          'Home',
          'The app is now in the initial state'
        );
        assert.equal(rootSetup, 1, 'The root setup was triggered');
        assert.equal(rootRender, 1, 'The root render was triggered');
        assert.equal(rootSerialize, 0, 'The root serialize was not called');
        assert.equal(rootModel, 1, 'The root model was called');

        let router = this.applicationInstance.lookup('router:main');
        let menuItem = MenuItem.create({ id: 1 });

        return router.transitionTo('special', menuItem).then(function() {
          assert.equal(rootSetup, 1, 'The root setup was not triggered again');
          assert.equal(rootRender, 1, 'The root render was not triggered again');
          assert.equal(rootSerialize, 0, 'The root serialize was not called');

          // TODO: Should this be changed?
          assert.equal(rootModel, 1, 'The root model was called again');

          assert.deepEqual(router.location.path, '/specials/1');
          assert.equal(router.currentPath, 'root.special');
        });
      });
    }

    ['@test Events are triggered on the controller if a matching action name is implemented'](
      assert
    ) {
      let done = assert.async();

      this.router.map(function() {
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

      this.addTemplate('home', '<a {{action "showStuff" model}}>{{name}}</a>');
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

      this.visit('/').then(() => {
        document
          .getElementById('qunit-fixture')
          .querySelector('a')
          .click();
      });
    }

    ['@test Events are triggered on the current state when defined in `actions` object'](assert) {
      let done = assert.async();

      this.router.map(function() {
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
      this.addTemplate('home', '<a {{action "showStuff" model}}>{{model.name}}</a>');

      this.visit('/').then(() => {
        document
          .getElementById('qunit-fixture')
          .querySelector('a')
          .click();
      });
    }

    ['@test Events defined in `actions` object are triggered on the current state when routes are nested'](
      assert
    ) {
      let done = assert.async();

      this.router.map(function() {
        this.route('root', { path: '/' }, function() {
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

      this.addTemplate('root.index', '<a {{action "showStuff" model}}>{{model.name}}</a>');

      this.visit('/').then(() => {
        document
          .getElementById('qunit-fixture')
          .querySelector('a')
          .click();
      });
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

    ['@test Actions are not triggered on the controller if a matching action name is implemented as a method'](
      assert
    ) {
      let done = assert.async();

      this.router.map(function() {
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

      this.addTemplate('home', '<a {{action "showStuff" model}}>{{name}}</a>');

      this.add(
        'controller:home',
        Controller.extend({
          showStuff() {
            stateIsNotCalled = false;
            assert.ok(stateIsNotCalled, 'an event on the state is not triggered');
          },
        })
      );

      this.visit('/').then(() => {
        document
          .getElementById('qunit-fixture')
          .querySelector('a')
          .click();
      });
    }

    ['@test actions can be triggered with multiple arguments'](assert) {
      let done = assert.async();
      this.router.map(function() {
        this.route('root', { path: '/' }, function() {
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

      this.visit('/').then(() => {
        document
          .getElementById('qunit-fixture')
          .querySelector('a')
          .click();
      });
    }

    ['@test transitioning multiple times in a single run loop only sets the URL once'](assert) {
      this.router.map(function() {
        this.route('root', { path: '/' });
        this.route('foo');
        this.route('bar');
      });

      return this.visit('/').then(() => {
        let urlSetCount = 0;
        let router = this.applicationInstance.lookup('router:main');

        router.get('location').setURL = function(path) {
          urlSetCount++;
          set(this, 'path', path);
        };

        assert.equal(urlSetCount, 0);

        run(function() {
          router.transitionTo('foo');
          router.transitionTo('bar');
        });

        assert.equal(urlSetCount, 1);
        assert.equal(router.get('location').getURL(), '/bar');
      });
    }

    ['@test navigating away triggers a url property change'](assert) {
      assert.expect(3);

      this.router.map(function() {
        this.route('root', { path: '/' });
        this.route('foo', { path: '/foo' });
        this.route('bar', { path: '/bar' });
      });

      return this.visit('/').then(() => {
        let router = this.applicationInstance.lookup('router:main');

        addObserver(router, 'url', function() {
          assert.ok(true, 'url change event was fired');
        });
        ['foo', 'bar', '/foo'].forEach(destination => run(router, 'transitionTo', destination));
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

      this.router.map(function() {
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

      this.router.map(function() {
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

    ['@test Route inherits model from parent route'](assert) {
      assert.expect(9);

      this.router.map(function() {
        this.route('the-post', { path: '/posts/:post_id' }, function() {
          this.route('comments');

          this.route('shares', { path: '/shares/:share_id', resetNamespace: true }, function() {
            this.route('share');
          });
        });
      });

      let post1 = {};
      let post2 = {};
      let post3 = {};
      let share1 = {};
      let share2 = {};
      let share3 = {};

      let posts = {
        1: post1,
        2: post2,
        3: post3,
      };
      let shares = {
        1: share1,
        2: share2,
        3: share3,
      };

      this.add(
        'route:the-post',
        Route.extend({
          model(params) {
            return posts[params.post_id];
          },
        })
      );

      this.add(
        'route:the-post.comments',
        Route.extend({
          afterModel(post /*, transition */) {
            let parent_model = this.modelFor('the-post');

            assert.equal(post, parent_model);
          },
        })
      );

      this.add(
        'route:shares',
        Route.extend({
          model(params) {
            return shares[params.share_id];
          },
        })
      );

      this.add(
        'route:shares.share',
        Route.extend({
          afterModel(share /*, transition */) {
            let parent_model = this.modelFor('shares');

            assert.equal(share, parent_model);
          },
        })
      );

      return this.visit('/posts/1/comments')
        .then(() => {
          assert.ok(true, 'url: /posts/1/comments was handled');
          return this.visit('/posts/1/shares/1');
        })
        .then(() => {
          assert.ok(true, 'url: /posts/1/shares/1 was handled');
          return this.visit('/posts/2/comments');
        })
        .then(() => {
          assert.ok(true, 'url: /posts/2/comments was handled');
          return this.visit('/posts/2/shares/2');
        })
        .then(() => {
          assert.ok(true, 'url: /posts/2/shares/2 was handled');
          return this.visit('/posts/3/comments');
        })
        .then(() => {
          assert.ok(true, 'url: /posts/3/shares was handled');
          return this.visit('/posts/3/shares/3');
        })
        .then(() => {
          assert.ok(true, 'url: /posts/3/shares/3 was handled');
        });
    }

    ['@test Routes with { resetNamespace: true } inherits model from parent route'](assert) {
      assert.expect(6);

      this.router.map(function() {
        this.route('the-post', { path: '/posts/:post_id' }, function() {
          this.route('comments', { resetNamespace: true }, function() {});
        });
      });

      let post1 = {};
      let post2 = {};
      let post3 = {};

      let posts = {
        1: post1,
        2: post2,
        3: post3,
      };

      this.add(
        'route:the-post',
        Route.extend({
          model(params) {
            return posts[params.post_id];
          },
        })
      );

      this.add(
        'route:comments',
        Route.extend({
          afterModel(post /*, transition */) {
            let parent_model = this.modelFor('the-post');

            assert.equal(post, parent_model);
          },
        })
      );

      return this.visit('/posts/1/comments')
        .then(() => {
          assert.ok(true, '/posts/1/comments');
          return this.visit('/posts/2/comments');
        })
        .then(() => {
          assert.ok(true, '/posts/2/comments');
          return this.visit('/posts/3/comments');
        })
        .then(() => {
          assert.ok(true, '/posts/3/comments');
        });
    }

    ['@test It is possible to get the model from a parent route'](assert) {
      assert.expect(6);

      this.router.map(function() {
        this.route('the-post', { path: '/posts/:post_id' }, function() {
          this.route('comments', { resetNamespace: true });
        });
      });

      let post1 = {};
      let post2 = {};
      let post3 = {};
      let currentPost;

      let posts = {
        1: post1,
        2: post2,
        3: post3,
      };

      this.add(
        'route:the-post',
        Route.extend({
          model(params) {
            return posts[params.post_id];
          },
        })
      );

      this.add(
        'route:comments',
        Route.extend({
          model() {
            assert.equal(this.modelFor('the-post'), currentPost);
          },
        })
      );

      currentPost = post1;
      return this.visit('/posts/1/comments')
        .then(() => {
          assert.ok(true, '/posts/1/comments has been handled');
          currentPost = post2;
          return this.visit('/posts/2/comments');
        })
        .then(() => {
          assert.ok(true, '/posts/2/comments has been handled');
          currentPost = post3;
          return this.visit('/posts/3/comments');
        })
        .then(() => {
          assert.ok(true, '/posts/3/comments has been handled');
        });
    }

    ['@test A redirection hook is provided'](assert) {
      this.router.map(function() {
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
        assert.equal(
          this.applicationInstance.lookup('controller:application').get('currentPath'),
          'home'
        );
      });
    }

    ['@test Redirecting from the middle of a route aborts the remainder of the routes'](assert) {
      assert.expect(3);

      this.router.map(function() {
        this.route('home');
        this.route('foo', function() {
          this.route('bar', { resetNamespace: true }, function() {
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
        assert.equal(
          this.applicationInstance.lookup('controller:application').get('currentPath'),
          'home'
        );
        assert.equal(router.get('location').getURL(), '/home');
      });
    }

    ['@test Redirecting to the current target in the middle of a route does not abort initial routing'](
      assert
    ) {
      assert.expect(5);

      this.router.map(function() {
        this.route('home');
        this.route('foo', function() {
          this.route('bar', { resetNamespace: true }, function() {
            this.route('baz');
          });
        });
      });

      let successCount = 0;

      this.add(
        'route:bar',
        Route.extend({
          redirect() {
            return this.transitionTo('bar.baz').then(function() {
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
        assert.equal(
          this.applicationInstance.lookup('controller:application').get('currentPath'),
          'foo.bar.baz'
        );
        assert.equal(successCount, 1, 'transitionTo success handler was called once');
      });
    }

    ['@test Redirecting to the current target with a different context aborts the remainder of the routes'](
      assert
    ) {
      assert.expect(4);

      this.router.map(function() {
        this.route('home');
        this.route('foo', function() {
          this.route('bar', { path: 'bar/:id', resetNamespace: true }, function() {
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
        assert.equal(
          this.applicationInstance.lookup('controller:application').get('currentPath'),
          'foo.bar.baz'
        );
        assert.equal(
          this.applicationInstance
            .lookup('router:main')
            .get('location')
            .getURL(),
          '/foo/bar/2/baz'
        );
      });
    }

    ['@test Transitioning from a parent event does not prevent currentPath from being set'](
      assert
    ) {
      this.router.map(function() {
        this.route('foo', function() {
          this.route('bar', { resetNamespace: true }, function() {
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
        assert.equal(applicationController.get('currentPath'), 'foo.bar.baz');
        run(() => router.send('goToQux'));
        assert.equal(applicationController.get('currentPath'), 'foo.qux');
        assert.equal(router.get('location').getURL(), '/foo/qux');
      });
    }

    ['@test Generated names can be customized when providing routes with dot notation'](assert) {
      assert.expect(4);

      this.addTemplate('index', '<div>Index</div>');
      this.addTemplate('application', "<h1>Home</h1><div class='main'>{{outlet}}</div>");
      this.addTemplate('foo', "<div class='middle'>{{outlet}}</div>");
      this.addTemplate('bar', "<div class='bottom'>{{outlet}}</div>");
      this.addTemplate('bar.baz', '<p>{{name}}Bottom!</p>');

      this.router.map(function() {
        this.route('foo', { path: '/top' }, function() {
          this.route('bar', { path: '/middle', resetNamespace: true }, function() {
            this.route('baz', { path: '/bottom' });
          });
        });
      });

      this.add(
        'route:foo',
        Route.extend({
          renderTemplate() {
            assert.ok(true, 'FooBarRoute was called');
            return this._super(...arguments);
          },
        })
      );

      this.add(
        'route:bar.baz',
        Route.extend({
          renderTemplate() {
            assert.ok(true, 'BarBazRoute was called');
            return this._super(...arguments);
          },
        })
      );

      this.add(
        'controller:bar',
        Controller.extend({
          name: 'Bar',
        })
      );

      this.add(
        'controller:bar.baz',
        Controller.extend({
          name: 'BarBaz',
        })
      );

      return this.visit('/top/middle/bottom').then(() => {
        assert.ok(true, '/top/middle/bottom has been handled');
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(
          getTextOf(rootElement.querySelector('.main .middle .bottom p')),
          'BarBazBottom!',
          'The templates were rendered into their appropriate parents'
        );
      });
    }

    ["@test Child routes render into their parent route's template by default"](assert) {
      this.addTemplate('index', '<div>Index</div>');
      this.addTemplate('application', "<h1>Home</h1><div class='main'>{{outlet}}</div>");
      this.addTemplate('top', "<div class='middle'>{{outlet}}</div>");
      this.addTemplate('middle', "<div class='bottom'>{{outlet}}</div>");
      this.addTemplate('middle.bottom', '<p>Bottom!</p>');

      this.router.map(function() {
        this.route('top', function() {
          this.route('middle', { resetNamespace: true }, function() {
            this.route('bottom');
          });
        });
      });

      return this.visit('/top/middle/bottom').then(() => {
        assert.ok(true, '/top/middle/bottom has been handled');
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(
          getTextOf(rootElement.querySelector('.main .middle .bottom p')),
          'Bottom!',
          'The templates were rendered into their appropriate parents'
        );
      });
    }

    ['@test Child routes render into specified template'](assert) {
      this.addTemplate('index', '<div>Index</div>');
      this.addTemplate('application', "<h1>Home</h1><div class='main'>{{outlet}}</div>");
      this.addTemplate('top', "<div class='middle'>{{outlet}}</div>");
      this.addTemplate('middle', "<div class='bottom'>{{outlet}}</div>");
      this.addTemplate('middle.bottom', '<p>Bottom!</p>');

      this.router.map(function() {
        this.route('top', function() {
          this.route('middle', { resetNamespace: true }, function() {
            this.route('bottom');
          });
        });
      });

      this.add(
        'route:middle.bottom',
        Route.extend({
          renderTemplate() {
            this.render('middle/bottom', { into: 'top' });
          },
        })
      );

      return this.visit('/top/middle/bottom').then(() => {
        assert.ok(true, '/top/middle/bottom has been handled');
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(
          rootElement.querySelectorAll('.main .middle .bottom p').length,
          0,
          'should not render into the middle template'
        );
        assert.equal(
          getTextOf(rootElement.querySelector('.main .middle > p')),
          'Bottom!',
          'The template was rendered into the top template'
        );
      });
    }

    ['@test Rendering into specified template with slash notation'](assert) {
      this.addTemplate('person.profile', 'profile {{outlet}}');
      this.addTemplate('person.details', 'details!');

      this.router.map(function() {
        this.route('home', { path: '/' });
      });

      this.add(
        'route:home',
        Route.extend({
          renderTemplate() {
            this.render('person/profile');
            this.render('person/details', { into: 'person/profile' });
          },
        })
      );

      return this.visit('/').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(
          rootElement.textContent.trim(),
          'profile details!',
          'The templates were rendered'
        );
      });
    }

    ['@test Parent route context change'](assert) {
      let editCount = 0;
      let editedPostIds = emberA();

      this.addTemplate('application', '{{outlet}}');
      this.addTemplate('posts', '{{outlet}}');
      this.addTemplate('post', '{{outlet}}');
      this.addTemplate('post/index', 'showing');
      this.addTemplate('post/edit', 'editing');

      this.router.map(function() {
        this.route('posts', function() {
          this.route('post', { path: '/:postId', resetNamespace: true }, function() {
            this.route('edit');
          });
        });
      });

      this.add(
        'route:posts',
        Route.extend({
          actions: {
            showPost(context) {
              this.transitionTo('post', context);
            },
          },
        })
      );

      this.add(
        'route:post',
        Route.extend({
          model(params) {
            return { id: params.postId };
          },

          serialize(model) {
            return { postId: model.id };
          },

          actions: {
            editPost() {
              this.transitionTo('post.edit');
            },
          },
        })
      );

      this.add(
        'route:post.edit',
        Route.extend({
          model() {
            let postId = this.modelFor('post').id;
            editedPostIds.push(postId);
            return null;
          },
          setup() {
            this._super(...arguments);
            editCount++;
          },
        })
      );

      return this.visit('/posts/1').then(() => {
        assert.ok(true, '/posts/1 has been handled');
        let router = this.applicationInstance.lookup('router:main');
        run(() => router.send('editPost'));
        run(() => router.send('showPost', { id: '2' }));
        run(() => router.send('editPost'));
        assert.equal(editCount, 2, 'set up the edit route twice without failure');
        assert.deepEqual(
          editedPostIds,
          ['1', '2'],
          'modelFor posts.post returns the right context'
        );
      });
    }

    ['@test Router accounts for rootURL on page load when using history location'](assert) {
      let rootURL = window.location.pathname + '/app';
      let postsTemplateRendered = false;
      let setHistory;

      setHistory = function(obj, path) {
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

      this.router.map(function() {
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

    ['@test Only use route rendered into main outlet for default into property on child'](assert) {
      this.addTemplate('application', "{{outlet 'menu'}}{{outlet}}");
      this.addTemplate('posts', '{{outlet}}');
      this.addTemplate('posts.index', '<p class="posts-index">postsIndex</p>');
      this.addTemplate('posts.menu', '<div class="posts-menu">postsMenu</div>');

      this.router.map(function() {
        this.route('posts', function() {});
      });

      this.add(
        'route:posts',
        Route.extend({
          renderTemplate() {
            this.render();
            this.render('posts/menu', {
              into: 'application',
              outlet: 'menu',
            });
          },
        })
      );

      return this.visit('/posts').then(() => {
        assert.ok(true, '/posts has been handled');
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(
          getTextOf(rootElement.querySelector('div.posts-menu')),
          'postsMenu',
          'The posts/menu template was rendered'
        );
        assert.equal(
          getTextOf(rootElement.querySelector('p.posts-index')),
          'postsIndex',
          'The posts/index template was rendered'
        );
      });
    }

    ['@test Generating a URL should not affect currentModel'](assert) {
      this.router.map(function() {
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
      this.router.map(function() {
        this.route('posts', function() {
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

    ['@test Application template does not duplicate when re-rendered'](assert) {
      this.addTemplate('application', '<h3 class="render-once">I render once</h3>{{outlet}}');

      this.router.map(function() {
        this.route('posts');
      });

      this.add(
        'route:application',
        Route.extend({
          model() {
            return emberA();
          },
        })
      );

      return this.visit('/posts').then(() => {
        assert.ok(true, '/posts has been handled');
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(getTextOf(rootElement.querySelector('h3.render-once')), 'I render once');
      });
    }

    ['@test Child routes should render inside the application template if the application template causes a redirect'](
      assert
    ) {
      this.addTemplate('application', '<h3>App</h3> {{outlet}}');
      this.addTemplate('posts', 'posts');

      this.router.map(function() {
        this.route('posts');
        this.route('photos');
      });

      this.add(
        'route:application',
        Route.extend({
          afterModel() {
            this.transitionTo('posts');
          },
        })
      );

      return this.visit('/posts').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(rootElement.textContent.trim(), 'App posts');
      });
    }

    ["@test The template is not re-rendered when the route's context changes"](assert) {
      this.router.map(function() {
        this.route('page', { path: '/page/:name' });
      });

      this.add(
        'route:page',
        Route.extend({
          model(params) {
            return EmberObject.create({ name: params.name });
          },
        })
      );

      let insertionCount = 0;
      this.add(
        'component:foo-bar',
        Component.extend({
          didInsertElement() {
            insertionCount += 1;
          },
        })
      );

      this.addTemplate('page', '<p>{{model.name}}{{foo-bar}}</p>');

      let rootElement = document.getElementById('qunit-fixture');
      return this.visit('/page/first')
        .then(() => {
          assert.ok(true, '/page/first has been handled');
          assert.equal(getTextOf(rootElement.querySelector('p')), 'first');
          assert.equal(insertionCount, 1);
          return this.visit('/page/second');
        })
        .then(() => {
          assert.ok(true, '/page/second has been handled');
          assert.equal(getTextOf(rootElement.querySelector('p')), 'second');
          assert.equal(insertionCount, 1, 'view should have inserted only once');
          let router = this.applicationInstance.lookup('router:main');
          return run(() => router.transitionTo('page', EmberObject.create({ name: 'third' })));
        })
        .then(() => {
          assert.equal(getTextOf(rootElement.querySelector('p')), 'third');
          assert.equal(insertionCount, 1, 'view should still have inserted only once');
        });
    }

    ['@test The template is not re-rendered when two routes present the exact same template & controller'](
      assert
    ) {
      this.router.map(function() {
        this.route('first');
        this.route('second');
        this.route('third');
        this.route('fourth');
      });

      // Note add a component to test insertion

      let insertionCount = 0;
      this.add(
        'component:x-input',
        Component.extend({
          didInsertElement() {
            insertionCount += 1;
          },
        })
      );

      let SharedRoute = Route.extend({
        setupController() {
          this.controllerFor('shared').set('message', 'This is the ' + this.routeName + ' message');
        },

        renderTemplate() {
          this.render('shared', { controller: 'shared' });
        },
      });

      this.add('route:shared', SharedRoute);
      this.add('route:first', SharedRoute.extend());
      this.add('route:second', SharedRoute.extend());
      this.add('route:third', SharedRoute.extend());
      this.add('route:fourth', SharedRoute.extend());

      this.add('controller:shared', Controller.extend());

      this.addTemplate('shared', '<p>{{message}}{{x-input}}</p>');

      let rootElement = document.getElementById('qunit-fixture');
      return this.visit('/first')
        .then(() => {
          assert.ok(true, '/first has been handled');
          assert.equal(getTextOf(rootElement.querySelector('p')), 'This is the first message');
          assert.equal(insertionCount, 1, 'expected one assertion');
          return this.visit('/second');
        })
        .then(() => {
          assert.ok(true, '/second has been handled');
          assert.equal(getTextOf(rootElement.querySelector('p')), 'This is the second message');
          assert.equal(insertionCount, 1, 'expected one assertion');
          return run(() => {
            this.applicationInstance
              .lookup('router:main')
              .transitionTo('third')
              .then(
                function() {
                  assert.ok(true, 'expected transition');
                },
                function(reason) {
                  assert.ok(false, 'unexpected transition failure: ', QUnit.jsDump.parse(reason));
                }
              );
          });
        })
        .then(() => {
          assert.equal(getTextOf(rootElement.querySelector('p')), 'This is the third message');
          assert.equal(insertionCount, 1, 'expected one assertion');
          return this.visit('fourth');
        })
        .then(() => {
          assert.ok(true, '/fourth has been handled');
          assert.equal(insertionCount, 1, 'expected one assertion');
          assert.equal(getTextOf(rootElement.querySelector('p')), 'This is the fourth message');
        });
    }

    ['@test ApplicationRoute with model does not proxy the currentPath'](assert) {
      let model = {};
      let currentPath;

      this.router.map(function() {
        this.route('index', { path: '/' });
      });

      this.add(
        'route:application',
        Route.extend({
          model() {
            return model;
          },
        })
      );

      this.add(
        'controller:application',
        Controller.extend({
          currentPathDidChange: observer('currentPath', function() {
            currentPath = this.currentPath;
          }),
        })
      );

      return this.visit('/').then(() => {
        assert.equal(currentPath, 'index', 'currentPath is index');
        assert.equal(
          'currentPath' in model,
          false,
          'should have defined currentPath on controller'
        );
      });
    }

    ['@test Promises encountered on app load put app into loading state until resolved'](assert) {
      assert.expect(2);

      let deferred = RSVP.defer();
      this.router.map(function() {
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

    ['@test Route should tear down multiple outlets'](assert) {
      this.addTemplate('application', "{{outlet 'menu'}}{{outlet}}{{outlet 'footer'}}");
      this.addTemplate('posts', '{{outlet}}');
      this.addTemplate('users', 'users');
      this.addTemplate('posts.index', '<p class="posts-index">postsIndex</p>');
      this.addTemplate('posts.menu', '<div class="posts-menu">postsMenu</div>');
      this.addTemplate('posts.footer', '<div class="posts-footer">postsFooter</div>');

      this.router.map(function() {
        this.route('posts', function() {});
        this.route('users', function() {});
      });

      this.add(
        'route:posts',
        Route.extend({
          renderTemplate() {
            this.render('posts/menu', {
              into: 'application',
              outlet: 'menu',
            });

            this.render();

            this.render('posts/footer', {
              into: 'application',
              outlet: 'footer',
            });
          },
        })
      );

      let rootElement = document.getElementById('qunit-fixture');
      return this.visit('/posts')
        .then(() => {
          assert.ok(true, '/posts has been handled');
          assert.equal(
            getTextOf(rootElement.querySelector('div.posts-menu')),
            'postsMenu',
            'The posts/menu template was rendered'
          );
          assert.equal(
            getTextOf(rootElement.querySelector('p.posts-index')),
            'postsIndex',
            'The posts/index template was rendered'
          );
          assert.equal(
            getTextOf(rootElement.querySelector('div.posts-footer')),
            'postsFooter',
            'The posts/footer template was rendered'
          );

          return this.visit('/users');
        })
        .then(() => {
          assert.ok(true, '/users has been handled');
          assert.equal(
            rootElement.querySelector('div.posts-menu'),
            null,
            'The posts/menu template was removed'
          );
          assert.equal(
            rootElement.querySelector('p.posts-index'),
            null,
            'The posts/index template was removed'
          );
          assert.equal(
            rootElement.querySelector('div.posts-footer'),
            null,
            'The posts/footer template was removed'
          );
        });
    }

    ['@test Route will assert if you try to explicitly render {into: ...} a missing template']() {
      expectDeprecation(
        /Rendering into a {{render}} helper that resolves to an {{outlet}} is deprecated./
      );

      this.router.map(function() {
        this.route('home', { path: '/' });
      });

      this.add(
        'route:home',
        Route.extend({
          renderTemplate() {
            this.render({ into: 'nonexistent' });
          },
        })
      );

      expectAssertion(
        () => this.visit('/'),
        "You attempted to render into 'nonexistent' but it was not found"
      );
    }

    ['@test Route supports clearing outlet explicitly'](assert) {
      this.addTemplate('application', "{{outlet}}{{outlet 'modal'}}");
      this.addTemplate('posts', '{{outlet}}');
      this.addTemplate('users', 'users');
      this.addTemplate('posts.index', '<div class="posts-index">postsIndex {{outlet}}</div>');
      this.addTemplate('posts.modal', '<div class="posts-modal">postsModal</div>');
      this.addTemplate('posts.extra', '<div class="posts-extra">postsExtra</div>');

      this.router.map(function() {
        this.route('posts', function() {});
        this.route('users', function() {});
      });

      this.add(
        'route:posts',
        Route.extend({
          actions: {
            showModal() {
              this.render('posts/modal', {
                into: 'application',
                outlet: 'modal',
              });
            },
            hideModal() {
              this.disconnectOutlet({
                outlet: 'modal',
                parentView: 'application',
              });
            },
          },
        })
      );

      this.add(
        'route:posts.index',
        Route.extend({
          actions: {
            showExtra() {
              this.render('posts/extra', {
                into: 'posts/index',
              });
            },
            hideExtra() {
              this.disconnectOutlet({ parentView: 'posts/index' });
            },
          },
        })
      );

      let rootElement = document.getElementById('qunit-fixture');

      return this.visit('/posts')
        .then(() => {
          let router = this.applicationInstance.lookup('router:main');

          assert.equal(
            getTextOf(rootElement.querySelector('div.posts-index')),
            'postsIndex',
            'The posts/index template was rendered'
          );
          run(() => router.send('showModal'));
          assert.equal(
            getTextOf(rootElement.querySelector('div.posts-modal')),
            'postsModal',
            'The posts/modal template was rendered'
          );
          run(() => router.send('showExtra'));

          assert.equal(
            getTextOf(rootElement.querySelector('div.posts-extra')),
            'postsExtra',
            'The posts/extra template was rendered'
          );
          run(() => router.send('hideModal'));

          assert.equal(
            rootElement.querySelector('div.posts-modal'),
            null,
            'The posts/modal template was removed'
          );
          run(() => router.send('hideExtra'));

          assert.equal(
            rootElement.querySelector('div.posts-extra'),
            null,
            'The posts/extra template was removed'
          );
          run(function() {
            router.send('showModal');
          });
          assert.equal(
            getTextOf(rootElement.querySelector('div.posts-modal')),
            'postsModal',
            'The posts/modal template was rendered'
          );
          run(function() {
            router.send('showExtra');
          });
          assert.equal(
            getTextOf(rootElement.querySelector('div.posts-extra')),
            'postsExtra',
            'The posts/extra template was rendered'
          );
          return this.visit('/users');
        })
        .then(() => {
          assert.equal(
            rootElement.querySelector('div.posts-index'),
            null,
            'The posts/index template was removed'
          );
          assert.equal(
            rootElement.querySelector('div.posts-modal'),
            null,
            'The posts/modal template was removed'
          );
          assert.equal(
            rootElement.querySelector('div.posts-extra'),
            null,
            'The posts/extra template was removed'
          );
        });
    }

    ['@test Route supports clearing outlet using string parameter'](assert) {
      this.addTemplate('application', "{{outlet}}{{outlet 'modal'}}");
      this.addTemplate('posts', '{{outlet}}');
      this.addTemplate('users', 'users');
      this.addTemplate('posts.index', '<div class="posts-index">postsIndex {{outlet}}</div>');
      this.addTemplate('posts.modal', '<div class="posts-modal">postsModal</div>');

      this.router.map(function() {
        this.route('posts', function() {});
        this.route('users', function() {});
      });

      this.add(
        'route:posts',
        Route.extend({
          actions: {
            showModal() {
              this.render('posts/modal', {
                into: 'application',
                outlet: 'modal',
              });
            },
            hideModal() {
              this.disconnectOutlet('modal');
            },
          },
        })
      );

      let rootElement = document.getElementById('qunit-fixture');
      return this.visit('/posts')
        .then(() => {
          let router = this.applicationInstance.lookup('router:main');
          assert.equal(
            getTextOf(rootElement.querySelector('div.posts-index')),
            'postsIndex',
            'The posts/index template was rendered'
          );
          run(() => router.send('showModal'));
          assert.equal(
            getTextOf(rootElement.querySelector('div.posts-modal')),
            'postsModal',
            'The posts/modal template was rendered'
          );
          run(() => router.send('hideModal'));
          assert.equal(
            rootElement.querySelector('div.posts-modal'),
            null,
            'The posts/modal template was removed'
          );
          return this.visit('/users');
        })
        .then(() => {
          assert.equal(
            rootElement.querySelector('div.posts-index'),
            null,
            'The posts/index template was removed'
          );
          assert.equal(
            rootElement.querySelector('div.posts-modal'),
            null,
            'The posts/modal template was removed'
          );
        });
    }

    ['@test Route silently fails when cleaning an outlet from an inactive view'](assert) {
      assert.expect(1); // handleURL

      this.addTemplate('application', '{{outlet}}');
      this.addTemplate('posts', "{{outlet 'modal'}}");
      this.addTemplate('modal', 'A Yo.');

      this.router.map(function() {
        this.route('posts');
      });

      this.add(
        'route:posts',
        Route.extend({
          actions: {
            hideSelf() {
              this.disconnectOutlet({
                outlet: 'main',
                parentView: 'application',
              });
            },
            showModal() {
              this.render('modal', { into: 'posts', outlet: 'modal' });
            },
            hideModal() {
              this.disconnectOutlet({ outlet: 'modal', parentView: 'posts' });
            },
          },
        })
      );

      return this.visit('/posts').then(() => {
        assert.ok(true, '/posts has been handled');
        let router = this.applicationInstance.lookup('router:main');
        run(() => router.send('showModal'));
        run(() => router.send('hideSelf'));
        run(() => router.send('hideModal'));
      });
    }

    ['@test Router `willTransition` hook passes in cancellable transition'](assert) {
      // Should hit willTransition 3 times, once for the initial route, and then 2 more times
      // for the two handleURL calls below
      assert.expect(5);

      this.router.map(function() {
        this.route('nork');
        this.route('about');
      });

      this.router.reopen({
        willTransition(_, _2, transition) {
          assert.ok(true, 'willTransition was called');
          if (transition.intent.url !== '/') {
            transition.abort();
          }
        },
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

      return this.visit('/').then(() => {
        this.handleURLAborts(assert, '/nork');
        this.handleURLAborts(assert, '/about');
      });
    }

    ['@test Aborting/redirecting the transition in `willTransition` prevents LoadingRoute from being entered'](
      assert
    ) {
      assert.expect(5);

      this.router.map(function() {
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

    ['@test `didTransition` event fires on the router'](assert) {
      assert.expect(3);

      this.router.map(function() {
        this.route('nork');
      });

      return this.visit('/')
        .then(() => {
          let router = this.applicationInstance.lookup('router:main');
          router.one('didTransition', function() {
            assert.ok(true, 'didTransition fired on initial routing');
          });
          this.visit('/');
        })
        .then(() => {
          let router = this.applicationInstance.lookup('router:main');
          router.one('didTransition', function() {
            assert.ok(true, 'didTransition fired on the router');
            assert.equal(
              router.get('url'),
              '/nork',
              'The url property is updated by the time didTransition fires'
            );
          });

          return this.visit('/nork');
        });
    }

    ['@test `didTransition` can be reopened'](assert) {
      assert.expect(1);

      this.router.map(function() {
        this.route('nork');
      });

      this.router.reopen({
        didTransition() {
          this._super(...arguments);
          assert.ok(true, 'reopened didTransition was called');
        },
      });

      return this.visit('/');
    }

    ['@test `activate` event fires on the route'](assert) {
      assert.expect(2);

      let eventFired = 0;

      this.router.map(function() {
        this.route('nork');
      });

      this.add(
        'route:nork',
        Route.extend({
          init() {
            this._super(...arguments);

            this.on('activate', function() {
              assert.equal(++eventFired, 1, 'activate event is fired once');
            });
          },

          activate() {
            assert.ok(true, 'activate hook is called');
          },
        })
      );

      return this.visit('/nork');
    }

    ['@test `deactivate` event fires on the route'](assert) {
      assert.expect(2);

      let eventFired = 0;

      this.router.map(function() {
        this.route('nork');
        this.route('dork');
      });

      this.add(
        'route:nork',
        Route.extend({
          init() {
            this._super(...arguments);

            this.on('deactivate', function() {
              assert.equal(++eventFired, 1, 'deactivate event is fired once');
            });
          },

          deactivate() {
            assert.ok(true, 'deactivate hook is called');
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

      this.router.map(function() {
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

      this.router.map(function() {
        this.route('root', { path: '/' });
        this.route('bar', function() {
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
      assert.expect(24);

      this.router.map(function() {
        this.route('index', { path: '/' });
        this.route('be', function() {
          this.route('excellent', { resetNamespace: true }, function() {
            this.route('to', { resetNamespace: true }, function() {
              this.route('each', { resetNamespace: true }, function() {
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
          assert.equal(appController.get('currentPath'), expectedPath);
          assert.equal(appController.get('currentRouteName'), expectedRouteName);
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

    ['@test Route model hook finds the same model as a manual find'](assert) {
      let post;
      let Post = EmberObject.extend();
      this.add('model:post', Post);
      Post.reopenClass({
        find() {
          post = this;
          return {};
        },
      });

      this.router.map(function() {
        this.route('post', { path: '/post/:post_id' });
      });

      return this.visit('/post/1').then(() => {
        assert.equal(Post, post);
      });
    }

    ['@test Routes can refresh themselves causing their model hooks to be re-run'](assert) {
      this.router.map(function() {
        this.route('parent', { path: '/parent/:parent_id' }, function() {
          this.route('child');
        });
      });

      let appcount = 0;
      this.add(
        'route:application',
        Route.extend({
          model() {
            ++appcount;
          },
        })
      );

      let parentcount = 0;
      this.add(
        'route:parent',
        Route.extend({
          model(params) {
            assert.equal(params.parent_id, '123');
            ++parentcount;
          },
          actions: {
            refreshParent() {
              this.refresh();
            },
          },
        })
      );

      let childcount = 0;
      this.add(
        'route:parent.child',
        Route.extend({
          model() {
            ++childcount;
          },
        })
      );

      let router;
      return this.visit('/')
        .then(() => {
          router = this.applicationInstance.lookup('router:main');
          assert.equal(appcount, 1);
          assert.equal(parentcount, 0);
          assert.equal(childcount, 0);
          return run(router, 'transitionTo', 'parent.child', '123');
        })
        .then(() => {
          assert.equal(appcount, 1);
          assert.equal(parentcount, 1);
          assert.equal(childcount, 1);
          return run(router, 'send', 'refreshParent');
        })
        .then(() => {
          assert.equal(appcount, 1);
          assert.equal(parentcount, 2);
          assert.equal(childcount, 2);
        });
    }

    ['@test Specifying non-existent controller name in route#render throws'](assert) {
      assert.expect(1);

      this.router.map(function() {
        this.route('home', { path: '/' });
      });

      this.add(
        'route:home',
        Route.extend({
          renderTemplate() {
            expectAssertion(() => {
              this.render('homepage', {
                controller: 'stefanpenneristhemanforme',
              });
            }, "You passed `controller: 'stefanpenneristhemanforme'` into the `render` method, but no such controller could be found.");
          },
        })
      );

      return this.visit('/');
    }

    ["@test Redirecting with null model doesn't error out"](assert) {
      this.router.map(function() {
        this.route('home', { path: '/' });
        this.route('about', { path: '/about/:hurhurhur' });
      });

      this.add(
        'route:about',
        Route.extend({
          serialize: function(model) {
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

    ['@test rejecting the model hooks promise with a non-error prints the `message` property'](
      assert
    ) {
      assert.expect(5);

      let rejectedMessage = 'OMG!! SOOOOOO BAD!!!!';
      let rejectedStack = 'Yeah, buddy: stack gets printed too.';

      this.router.map(function() {
        this.route('yippie', { path: '/' });
      });

      console.error = function(initialMessage, errorMessage, errorStack) {
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

      return assert.throws(
        () => {
          return this.visit('/');
        },
        function(err) {
          assert.equal(err.message, rejectedMessage);
          return true;
        },
        'expected an exception'
      );
    }

    ['@test rejecting the model hooks promise with an error with `errorThrown` property prints `errorThrown.message` property'](
      assert
    ) {
      assert.expect(5);
      let rejectedMessage = 'OMG!! SOOOOOO BAD!!!!';
      let rejectedStack = 'Yeah, buddy: stack gets printed too.';

      this.router.map(function() {
        this.route('yippie', { path: '/' });
      });

      console.error = function(initialMessage, errorMessage, errorStack) {
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

      assert.throws(
        () => this.visit('/'),
        function(err) {
          assert.equal(err.message, rejectedMessage);
          return true;
        },
        'expected an exception'
      );
    }

    ['@test rejecting the model hooks promise with no reason still logs error'](assert) {
      assert.expect(2);
      this.router.map(function() {
        this.route('wowzers', { path: '/' });
      });

      console.error = function(initialMessage) {
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

      return assert.throws(() => this.visit('/'));
    }

    ['@test rejecting the model hooks promise with a string shows a good error'](assert) {
      assert.expect(3);
      let rejectedMessage = 'Supercalifragilisticexpialidocious';

      this.router.map(function() {
        this.route('yondo', { path: '/' });
      });

      console.error = function(initialMessage, errorMessage) {
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

      assert.throws(() => this.visit('/'), new RegExp(rejectedMessage), 'expected an exception');
    }

    ["@test willLeave, willChangeContext, willChangeModel actions don't fire unless feature flag enabled"](
      assert
    ) {
      assert.expect(1);

      this.router.map(function() {
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

    ['@test Errors in transitionTo within redirect hook are logged'](assert) {
      assert.expect(4);
      let actual = [];

      this.router.map(function() {
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

      console.error = function() {
        // push the arguments onto an array so we can detect if the error gets logged twice
        actual.push(arguments);
      };

      assert.throws(() => this.visit('/'), /More context objects were passed/);

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

      this.router.map(function() {
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

      this.router.map(function() {
        this.route('a', function() {
          this.route('b', { path: '/b/:id', resetNamespace: true }, function() {});
          this.route('c', { path: '/c/:id', resetNamespace: true }, function() {});
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
          assert.deepEqual(calls, [['setup', 'a'], ['setup', 'b']]);
          calls.length = 0;
          return run(router, 'transitionTo', 'c', 'c-1');
        })
        .then(() => {
          assert.deepEqual(calls, [['reset', 'b'], ['setup', 'c']]);
          calls.length = 0;
          return run(router, 'transitionTo', 'out');
        })
        .then(() => {
          assert.deepEqual(calls, [['reset', 'c'], ['reset', 'a'], ['setup', 'out']]);
        });
    }

    ['@test Exception during initialization of non-initial route is not swallowed'](assert) {
      this.router.map(function() {
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

      return assert.throws(() => this.visit('/boom'), /\bboom\b/);
    }

    ['@test Exception during initialization of initial route is not swallowed'](assert) {
      this.router.map(function() {
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
      return assert.throws(() => this.visit('/'), /\bboom\b/);
    }

    ['@test {{outlet}} works when created after initial render'](assert) {
      this.addTemplate('sample', 'Hi{{#if showTheThing}}{{outlet}}{{/if}}Bye');
      this.addTemplate('sample.inner', 'Yay');
      this.addTemplate('sample.inner2', 'Boo');
      this.router.map(function() {
        this.route('sample', { path: '/' }, function() {
          this.route('inner', { path: '/' });
          this.route('inner2', { path: '/2' });
        });
      });

      let rootElement;
      return this.visit('/')
        .then(() => {
          rootElement = document.getElementById('qunit-fixture');
          assert.equal(rootElement.textContent.trim(), 'HiBye', 'initial render');

          run(() => this.applicationInstance.lookup('controller:sample').set('showTheThing', true));

          assert.equal(rootElement.textContent.trim(), 'HiYayBye', 'second render');
          return this.visit('/2');
        })
        .then(() => {
          assert.equal(rootElement.textContent.trim(), 'HiBooBye', 'third render');
        });
    }

    ['@test Can render into a named outlet at the top level'](assert) {
      this.addTemplate('application', 'A-{{outlet}}-B-{{outlet "other"}}-C');
      this.addTemplate('modal', 'Hello world');
      this.addTemplate('index', 'The index');
      this.router.map(function() {
        this.route('index', { path: '/' });
      });
      this.add(
        'route:application',
        Route.extend({
          renderTemplate() {
            this.render();
            this.render('modal', {
              into: 'application',
              outlet: 'other',
            });
          },
        })
      );

      return this.visit('/').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(
          rootElement.textContent.trim(),
          'A-The index-B-Hello world-C',
          'initial render'
        );
      });
    }

    ['@test Can disconnect a named outlet at the top level'](assert) {
      this.addTemplate('application', 'A-{{outlet}}-B-{{outlet "other"}}-C');
      this.addTemplate('modal', 'Hello world');
      this.addTemplate('index', 'The index');
      this.router.map(function() {
        this.route('index', { path: '/' });
      });
      this.add(
        'route:application',
        Route.extend({
          renderTemplate() {
            this.render();
            this.render('modal', {
              into: 'application',
              outlet: 'other',
            });
          },
          actions: {
            banish() {
              this.disconnectOutlet({
                parentView: 'application',
                outlet: 'other',
              });
            },
          },
        })
      );

      return this.visit('/').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(
          rootElement.textContent.trim(),
          'A-The index-B-Hello world-C',
          'initial render'
        );

        run(this.applicationInstance.lookup('router:main'), 'send', 'banish');

        assert.equal(rootElement.textContent.trim(), 'A-The index-B--C', 'second render');
      });
    }

    ['@test Can render into a named outlet at the top level, with empty main outlet'](assert) {
      this.addTemplate('application', 'A-{{outlet}}-B-{{outlet "other"}}-C');
      this.addTemplate('modal', 'Hello world');

      this.router.map(function() {
        this.route('hasNoTemplate', { path: '/' });
      });

      this.add(
        'route:application',
        Route.extend({
          renderTemplate() {
            this.render();
            this.render('modal', {
              into: 'application',
              outlet: 'other',
            });
          },
        })
      );

      return this.visit('/').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(rootElement.textContent.trim(), 'A--B-Hello world-C', 'initial render');
      });
    }

    ['@test Can render into a named outlet at the top level, later'](assert) {
      this.addTemplate('application', 'A-{{outlet}}-B-{{outlet "other"}}-C');
      this.addTemplate('modal', 'Hello world');
      this.addTemplate('index', 'The index');
      this.router.map(function() {
        this.route('index', { path: '/' });
      });
      this.add(
        'route:application',
        Route.extend({
          actions: {
            launch() {
              this.render('modal', {
                into: 'application',
                outlet: 'other',
              });
            },
          },
        })
      );

      return this.visit('/').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(rootElement.textContent.trim(), 'A-The index-B--C', 'initial render');
        run(this.applicationInstance.lookup('router:main'), 'send', 'launch');
        assert.equal(
          rootElement.textContent.trim(),
          'A-The index-B-Hello world-C',
          'second render'
        );
      });
    }

    ["@test Can render routes with no 'main' outlet and their children"](assert) {
      this.addTemplate('application', '<div id="application">{{outlet "app"}}</div>');
      this.addTemplate(
        'app',
        '<div id="app-common">{{outlet "common"}}</div><div id="app-sub">{{outlet "sub"}}</div>'
      );
      this.addTemplate('common', '<div id="common"></div>');
      this.addTemplate('sub', '<div id="sub"></div>');

      this.router.map(function() {
        this.route('app', { path: '/app' }, function() {
          this.route('sub', { path: '/sub', resetNamespace: true });
        });
      });

      this.add(
        'route:app',
        Route.extend({
          renderTemplate() {
            this.render('app', {
              outlet: 'app',
              into: 'application',
            });
            this.render('common', {
              outlet: 'common',
              into: 'app',
            });
          },
        })
      );

      this.add(
        'route:sub',
        Route.extend({
          renderTemplate() {
            this.render('sub', {
              outlet: 'sub',
              into: 'app',
            });
          },
        })
      );

      let rootElement;
      return this.visit('/app')
        .then(() => {
          rootElement = document.getElementById('qunit-fixture');
          assert.equal(
            rootElement.querySelectorAll('#app-common #common').length,
            1,
            'Finds common while viewing /app'
          );
          return this.visit('/app/sub');
        })
        .then(() => {
          assert.equal(
            rootElement.querySelectorAll('#app-common #common').length,
            1,
            'Finds common while viewing /app/sub'
          );
          assert.equal(
            rootElement.querySelectorAll('#app-sub #sub').length,
            1,
            'Finds sub while viewing /app/sub'
          );
        });
    }

    ['@test Tolerates stacked renders'](assert) {
      this.addTemplate('application', '{{outlet}}{{outlet "modal"}}');
      this.addTemplate('index', 'hi');
      this.addTemplate('layer', 'layer');
      this.router.map(function() {
        this.route('index', { path: '/' });
      });
      this.add(
        'route:application',
        Route.extend({
          actions: {
            openLayer() {
              this.render('layer', {
                into: 'application',
                outlet: 'modal',
              });
            },
            close() {
              this.disconnectOutlet({
                outlet: 'modal',
                parentView: 'application',
              });
            },
          },
        })
      );

      return this.visit('/').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        let router = this.applicationInstance.lookup('router:main');
        assert.equal(rootElement.textContent.trim(), 'hi');
        run(router, 'send', 'openLayer');
        assert.equal(rootElement.textContent.trim(), 'hilayer');
        run(router, 'send', 'openLayer');
        assert.equal(rootElement.textContent.trim(), 'hilayer');
        run(router, 'send', 'close');
        assert.equal(rootElement.textContent.trim(), 'hi');
      });
    }

    ['@test Renders child into parent with non-default template name'](assert) {
      this.addTemplate('application', '<div class="a">{{outlet}}</div>');
      this.addTemplate('exports.root', '<div class="b">{{outlet}}</div>');
      this.addTemplate('exports.index', '<div class="c"></div>');

      this.router.map(function() {
        this.route('root', function() {});
      });

      this.add(
        'route:root',
        Route.extend({
          renderTemplate() {
            this.render('exports/root');
          },
        })
      );

      this.add(
        'route:root.index',
        Route.extend({
          renderTemplate() {
            this.render('exports/index');
          },
        })
      );

      return this.visit('/root').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        assert.equal(rootElement.querySelectorAll('.a .b .c').length, 1);
      });
    }

    ["@test Allows any route to disconnectOutlet another route's templates"](assert) {
      this.addTemplate('application', '{{outlet}}{{outlet "modal"}}');
      this.addTemplate('index', 'hi');
      this.addTemplate('layer', 'layer');
      this.router.map(function() {
        this.route('index', { path: '/' });
      });
      this.add(
        'route:application',
        Route.extend({
          actions: {
            openLayer() {
              this.render('layer', {
                into: 'application',
                outlet: 'modal',
              });
            },
          },
        })
      );
      this.add(
        'route:index',
        Route.extend({
          actions: {
            close() {
              this.disconnectOutlet({
                parentView: 'application',
                outlet: 'modal',
              });
            },
          },
        })
      );

      return this.visit('/').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        let router = this.applicationInstance.lookup('router:main');
        assert.equal(rootElement.textContent.trim(), 'hi');
        run(router, 'send', 'openLayer');
        assert.equal(rootElement.textContent.trim(), 'hilayer');
        run(router, 'send', 'close');
        assert.equal(rootElement.textContent.trim(), 'hi');
      });
    }

    ['@test Can this.render({into:...}) the render helper'](assert) {
      expectDeprecation(
        /Rendering into a {{render}} helper that resolves to an {{outlet}} is deprecated./
      );

      expectDeprecation(() => {
        this.addTemplate('application', '{{render "sidebar"}}');
      }, /Please refactor [\w\{\}"` ]+ to a component/);
      this.router.map(function() {
        this.route('index', { path: '/' });
      });
      this.addTemplate('sidebar', '<div class="sidebar">{{outlet}}</div>');
      this.addTemplate('index', 'other');
      this.addTemplate('bar', 'bar');

      this.add(
        'route:index',
        Route.extend({
          renderTemplate() {
            this.render({ into: 'sidebar' });
          },
          actions: {
            changeToBar() {
              this.disconnectOutlet({
                parentView: 'sidebar',
                outlet: 'main',
              });
              this.render('bar', { into: 'sidebar' });
            },
          },
        })
      );

      return this.visit('/').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        let router = this.applicationInstance.lookup('router:main');
        assert.equal(getTextOf(rootElement.querySelector('.sidebar')), 'other');
        run(router, 'send', 'changeToBar');
        assert.equal(getTextOf(rootElement.querySelector('.sidebar')), 'bar');
      });
    }

    ['@test Can disconnect from the render helper'](assert) {
      expectDeprecation(
        /Rendering into a {{render}} helper that resolves to an {{outlet}} is deprecated./
      );

      expectDeprecation(() => {
        this.addTemplate('application', '{{render "sidebar"}}');
      }, /Please refactor [\w\{\}"` ]+ to a component/);
      this.router.map(function() {
        this.route('index', { path: '/' });
      });
      this.addTemplate('sidebar', '<div class="sidebar">{{outlet}}</div>');
      this.addTemplate('index', 'other');

      this.add(
        'route:index',
        Route.extend({
          renderTemplate() {
            this.render({ into: 'sidebar' });
          },
          actions: {
            disconnect: function() {
              this.disconnectOutlet({
                parentView: 'sidebar',
                outlet: 'main',
              });
            },
          },
        })
      );

      return this.visit('/').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        let router = this.applicationInstance.lookup('router:main');
        assert.equal(getTextOf(rootElement.querySelector('.sidebar')), 'other');
        run(router, 'send', 'disconnect');
        assert.equal(getTextOf(rootElement.querySelector('.sidebar')), '');
      });
    }

    ["@test Can this.render({into:...}) the render helper's children"](assert) {
      expectDeprecation(
        /Rendering into a {{render}} helper that resolves to an {{outlet}} is deprecated./
      );

      expectDeprecation(() => {
        this.addTemplate('application', '{{render "sidebar"}}');
      }, /Please refactor [\w\{\}"` ]+ to a component/);

      this.addTemplate('sidebar', '<div class="sidebar">{{outlet}}</div>');
      this.addTemplate('index', '<div class="index">{{outlet}}</div>');
      this.addTemplate('other', 'other');
      this.addTemplate('bar', 'bar');
      this.router.map(function() {
        this.route('index', { path: '/' });
      });
      this.add(
        'route:index',
        Route.extend({
          renderTemplate() {
            this.render({ into: 'sidebar' });
            this.render('other', { into: 'index' });
          },
          actions: {
            changeToBar() {
              this.disconnectOutlet({
                parentView: 'index',
                outlet: 'main',
              });
              this.render('bar', { into: 'index' });
            },
          },
        })
      );

      return this.visit('/').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        let router = this.applicationInstance.lookup('router:main');
        assert.equal(getTextOf(rootElement.querySelector('.sidebar .index')), 'other');
        run(router, 'send', 'changeToBar');
        assert.equal(getTextOf(rootElement.querySelector('.sidebar .index')), 'bar');
      });
    }

    ["@test Can disconnect from the render helper's children"](assert) {
      expectDeprecation(
        /Rendering into a {{render}} helper that resolves to an {{outlet}} is deprecated./
      );

      expectDeprecation(() => {
        this.addTemplate('application', '{{render "sidebar"}}');
      }, /Please refactor [\w\{\}"` ]+ to a component/);
      this.router.map(function() {
        this.route('index', { path: '/' });
      });
      this.addTemplate('sidebar', '<div class="sidebar">{{outlet}}</div>');
      this.addTemplate('index', '<div class="index">{{outlet}}</div>');
      this.addTemplate('other', 'other');

      this.add(
        'route:index',
        Route.extend({
          renderTemplate() {
            this.render({ into: 'sidebar' });
            this.render('other', { into: 'index' });
          },
          actions: {
            disconnect() {
              this.disconnectOutlet({
                parentView: 'index',
                outlet: 'main',
              });
            },
          },
        })
      );

      return this.visit('/').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        let router = this.applicationInstance.lookup('router:main');
        assert.equal(getTextOf(rootElement.querySelector('.sidebar .index')), 'other');
        run(router, 'send', 'disconnect');
        assert.equal(getTextOf(rootElement.querySelector('.sidebar .index')), '');
      });
    }

    ['@test Can this.render({into:...}) nested render helpers'](assert) {
      expectDeprecation(
        /Rendering into a {{render}} helper that resolves to an {{outlet}} is deprecated./
      );

      expectDeprecation(() => {
        this.addTemplate('application', '{{render "sidebar"}}');
      }, /Please refactor [\w\{\}"` ]+ to a component/);

      expectDeprecation(() => {
        this.addTemplate('sidebar', '<div class="sidebar">{{render "cart"}}</div>');
      }, /Please refactor [\w\{\}"` ]+ to a component/);
      this.router.map(function() {
        this.route('index', { path: '/' });
      });
      this.addTemplate('cart', '<div class="cart">{{outlet}}</div>');
      this.addTemplate('index', 'other');
      this.addTemplate('baz', 'baz');

      this.add(
        'route:index',
        Route.extend({
          renderTemplate() {
            this.render({ into: 'cart' });
          },
          actions: {
            changeToBaz() {
              this.disconnectOutlet({
                parentView: 'cart',
                outlet: 'main',
              });
              this.render('baz', { into: 'cart' });
            },
          },
        })
      );

      return this.visit('/').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        let router = this.applicationInstance.lookup('router:main');
        assert.equal(getTextOf(rootElement.querySelector('.cart')), 'other');
        run(router, 'send', 'changeToBaz');
        assert.equal(getTextOf(rootElement.querySelector('.cart')), 'baz');
      });
    }

    ['@test Can disconnect from nested render helpers'](assert) {
      expectDeprecation(
        /Rendering into a {{render}} helper that resolves to an {{outlet}} is deprecated./
      );

      expectDeprecation(() => {
        this.addTemplate('application', '{{render "sidebar"}}');
      }, /Please refactor [\w\{\}"` ]+ to a component/);

      expectDeprecation(() => {
        this.addTemplate('sidebar', '<div class="sidebar">{{render "cart"}}</div>');
      }, /Please refactor [\w\{\}"` ]+ to a component/);
      this.router.map(function() {
        this.route('index', { path: '/' });
      });
      this.addTemplate('cart', '<div class="cart">{{outlet}}</div>');
      this.addTemplate('index', 'other');

      this.add(
        'route:index',
        Route.extend({
          renderTemplate() {
            this.render({ into: 'cart' });
          },
          actions: {
            disconnect() {
              this.disconnectOutlet({
                parentView: 'cart',
                outlet: 'main',
              });
            },
          },
        })
      );

      return this.visit('/').then(() => {
        let rootElement = document.getElementById('qunit-fixture');
        let router = this.applicationInstance.lookup('router:main');
        assert.equal(getTextOf(rootElement.querySelector('.cart')), 'other');
        run(router, 'send', 'disconnect');
        assert.equal(getTextOf(rootElement.querySelector('.cart')), '');
      });
    }

    ['@test Components inside an outlet have their didInsertElement hook invoked when the route is displayed'](
      assert
    ) {
      this.addTemplate(
        'index',
        '{{#if showFirst}}{{my-component}}{{else}}{{other-component}}{{/if}}'
      );

      let myComponentCounter = 0;
      let otherComponentCounter = 0;
      let indexController;

      this.router.map(function() {
        this.route('index', { path: '/' });
      });

      this.add(
        'controller:index',
        Controller.extend({
          showFirst: true,
        })
      );

      this.add(
        'route:index',
        Route.extend({
          setupController(controller) {
            indexController = controller;
          },
        })
      );

      this.add(
        'component:my-component',
        Component.extend({
          didInsertElement() {
            myComponentCounter++;
          },
        })
      );

      this.add(
        'component:other-component',
        Component.extend({
          didInsertElement() {
            otherComponentCounter++;
          },
        })
      );

      return this.visit('/').then(() => {
        assert.strictEqual(
          myComponentCounter,
          1,
          'didInsertElement invoked on displayed component'
        );
        assert.strictEqual(
          otherComponentCounter,
          0,
          'didInsertElement not invoked on displayed component'
        );

        run(() => indexController.set('showFirst', false));

        assert.strictEqual(
          myComponentCounter,
          1,
          'didInsertElement not invoked on displayed component'
        );
        assert.strictEqual(
          otherComponentCounter,
          1,
          'didInsertElement invoked on displayed component'
        );
      });
    }

    ['@test Doesnt swallow exception thrown from willTransition'](assert) {
      assert.expect(1);
      this.addTemplate('application', '{{outlet}}');
      this.addTemplate('index', 'index');
      this.addTemplate('other', 'other');

      this.router.map(function() {
        this.route('index', { path: '/' });
        this.route('other', function() {});
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

      return this.visit('/').then(() => {
        return assert.throws(
          () => {
            return this.visit('/other');
          },
          /boom/,
          'expected an exception but none was thrown'
        );
      });
    }

    ['@test Exception if outlet name is undefined in render and disconnectOutlet']() {
      this.add(
        'route:application',
        Route.extend({
          actions: {
            showModal() {
              this.render({
                outlet: undefined,
                parentView: 'application',
              });
            },
            hideModal() {
              this.disconnectOutlet({
                outlet: undefined,
                parentView: 'application',
              });
            },
          },
        })
      );

      return this.visit('/').then(() => {
        let router = this.applicationInstance.lookup('router:main');
        expectAssertion(() => {
          run(() => router.send('showModal'));
        }, /You passed undefined as the outlet name/);

        expectAssertion(() => {
          run(() => router.send('hideModal'));
        }, /You passed undefined as the outlet name/);
      });
    }

    ['@test Route serializers work for Engines'](assert) {
      assert.expect(2);

      // Register engine
      let BlogEngine = Engine.extend();
      this.add('engine:blog', BlogEngine);

      // Register engine route map
      let postSerialize = function(params) {
        assert.ok(true, 'serialize hook runs');
        return {
          post_id: params.id,
        };
      };
      let BlogMap = function() {
        this.route('post', {
          path: '/post/:post_id',
          serialize: postSerialize,
        });
      };
      this.add('route-map:blog', BlogMap);

      this.router.map(function() {
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

    ['@test Defining a Route#serialize method in an Engine throws an error'](assert) {
      assert.expect(1);

      // Register engine
      let BlogEngine = Engine.extend();
      this.add('engine:blog', BlogEngine);

      // Register engine route map
      let BlogMap = function() {
        this.route('post');
      };
      this.add('route-map:blog', BlogMap);

      this.router.map(function() {
        this.mount('blog');
      });

      return this.visit('/').then(() => {
        let router = this.applicationInstance.lookup('router:main');
        let PostRoute = Route.extend({ serialize() {} });
        this.applicationInstance.lookup('engine:blog').register('route:post', PostRoute);

        assert.throws(
          () => router.transitionTo('blog.post'),
          /Defining a custom serialize method on an Engine route is not supported/
        );
      });
    }

    ['@test App.destroy does not leave undestroyed views after clearing engines'](assert) {
      assert.expect(4);

      let engineInstance;
      // Register engine
      let BlogEngine = Engine.extend();
      this.add('engine:blog', BlogEngine);
      let EngineIndexRoute = Route.extend({
        init() {
          this._super(...arguments);
          engineInstance = getOwner(this);
        },
      });

      // Register engine route map
      let BlogMap = function() {
        this.route('post');
      };
      this.add('route-map:blog', BlogMap);

      this.router.map(function() {
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

      this.router.map(function() {
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
