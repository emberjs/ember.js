import RSVP from 'rsvp';
import {
  Route,
  NoneLocation,
  HistoryLocation
} from 'ember-routing';
import {
  Controller,
  Object as EmberObject,
  A as emberA,
  copy
} from 'ember-runtime';
import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';
import {
  Mixin,
  computed,
  run,
  set,
  addObserver
} from 'ember-metal';
import { getTextOf } from 'internal-test-helpers';

moduleFor('Basic Routing - Decoupled from global resolver',
class extends ApplicationTestCase {
  constructor() {
    super();
    this.addTemplate('home', '<h3 class="hours">Hours</h3>');
    this.addTemplate('camelot', '<section id="camelot"><h3>Is a silly place</h3></section>');
    this.addTemplate('homepage', '<h3 id="troll">Megatroll</h3><p>{{model.home}}</p>');

    this.router.map(function() {
      this.route('home', { path: '/' });
    });
  }

  getController(name) {
    return this.applicationInstance.lookup(`controller:${name}`);
  }

  handleURL(assert, path) {
    return run(() => {
      let router = this.applicationInstance.lookup('router:main');
      return router.handleURL(path).then(function (value) {
        assert.ok(true, 'url: `' + path + '` was handled');
        return value;
      }, function (reason) {
        assert.ok(false, 'failed to visit:`' + path + '` reason: `' + QUnit.jsDump.parse(reason));
        throw reason;
      });
    });
  }

  handleURLAborts(assert, path) {
    run(() => {
      let router = this.applicationInstance.lookup('router:main');
      router.handleURL(path).then(function () {
        assert.ok(false, 'url: `' + path + '` was NOT to be handled');
      }, function (reason) {
        assert.ok(reason && reason.message === 'TransitionAborted', 'url: `' + path + '` was to be aborted');
      });
    });
  }

  get currentPath() {
    return this.getController('application').get('currentPath');
  }

  get currentURL() {
    return this.appRouter.get('currentURL');
  }

  handleURLRejectsWith(context, assert, path, expectedReason) {
    return context.visit(path).then(() => {
      assert.ok(false, 'expected handleURLing: `' + path + '` to fail');
    }).catch(reason => {
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
      assert.equal(text, "Hours", 'the home template was rendered');
    });
  }

  [`@test The Homepage and the Camelot page with multiple Router.map calls`](assert) {
    this.router.map(function() {
      this.route('camelot', { path: '/camelot' });
    });

    return this.visit('/camelot').then(() => {
      assert.equal(this.currentPath, 'camelot');

      let text = this.$('#camelot').text();
      assert.equal(text, "Is a silly place",
        'the camelot template was rendered'
      );

      return this.visit('/');
    }).then(() => {
      assert.equal(this.currentPath, 'home');

      let text = this.$('.hours').text();
      assert.equal(text, "Hours", 'the home template was rendered');
    });
  }

  [`@test The Homepage with explicit template name in renderTemplate`](assert) {
    this.add('route:home', Route.extend({
      renderTemplate() {
        this.render('homepage');
      }
    }));

    return this.visit('/').then(() => {
      let text = this.$('#troll').text();
      assert.equal(text, "Megatroll", 'the homepage template was rendered');
    });
  }

  [`@test an alternate template will pull in an alternate controller`](assert) {
    this.add('route:home',  Route.extend({
      renderTemplate() {
        this.render('homepage');
      }
    }));
    this.add('controller:homepage', Controller.extend({
      model: {
        home: 'Comes from homepage'
      }
    }));

    return this.visit('/').then(() => {
      let text = this.$('p').text();

      assert.equal(text, 'Comes from homepage',
        'the homepage template was rendered'
      );
    });
  }

  [`@test An alternate template will pull in an alternate controller instead of controllerName`](assert) {
    this.add('route:home', Route.extend({
      controllerName: 'foo',
      renderTemplate() {
        this.render('homepage');
      }
    }));
    this.add('controller:foo', Controller.extend({
      model: {
        home: 'Comes from foo'
      }
    }));
    this.add('controller:homepage', Controller.extend({
      model: {
        home: 'Comes from homepage'
      }
    }));

    return this.visit('/').then(() => {
      let text = this.$('p').text();

      assert.equal(text, 'Comes from homepage',
        'the homepage template was rendered'
      );
    });
  }

  [`@test The template will pull in an alternate controller via key/value`](assert) {
    this.router.map(function() {
      this.route('homepage', { path: '/' });
    });

    this.add('route:homepage', Route.extend({
      renderTemplate() {
        this.render({ controller: 'home' });
      }
    }));
    this.add('controller:home', Controller.extend({
      model: {
        home: 'Comes from home.'
      }
    }));

    return this.visit('/').then(() => {
      let text = this.$('p').text();

      assert.equal(text, 'Comes from home.',
        'the homepage template was rendered from data from the HomeController'
      );
    });
  }

  [`@test The Homepage with explicit template name in renderTemplate and controller`](assert) {
    this.add('controller:home', Controller.extend({
      model: {
        home: 'YES I AM HOME'
      }
    }));
    this.add('route:home', Route.extend({
      renderTemplate() {
        this.render('homepage');
      }
    }));

    return this.visit('/').then(() => {
      let text = this.$('p').text();

      assert.equal(text, 'YES I AM HOME',
        'The homepage template was rendered'
      );
    });
  }

  [`@test Model passed via renderTemplate model is set as controller's model`](assert) {
    this.addTemplate('bio', '<p>{{model.name}}</p>');
    this.add('route:home', Route.extend({
      renderTemplate() {
        this.render('bio', {
          model: { name: 'emberjs' }
        });
      }
    }));

    return this.visit('/').then(() => {
      let text = this.$('p').text();

      assert.equal(text, 'emberjs',
        `Passed model was set as controller's model`
      );
    });
  }

  ['@test render uses templateName from route'](assert) {
    this.addTemplate('the_real_home_template',
      '<p>THIS IS THE REAL HOME</p>'
    );
    this.add('route:home', Route.extend({
      templateName: 'the_real_home_template'
    }));

    return this.visit('/').then(() => {
      let text = this.$('p').text();

      assert.equal(text, 'THIS IS THE REAL HOME',
        'the homepage template was rendered'
      );
    });
  }

  ['@test defining templateName allows other templates to be rendered'](assert) {
    this.addTemplate('alert', `<div class='alert-box'>Invader!</div>`);
    this.addTemplate('the_real_home_template',
      `<p>THIS IS THE REAL HOME</p>{{outlet 'alert'}}`
    );
    this.add('route:home', Route.extend({
      templateName: 'the_real_home_template',
      actions: {
        showAlert() {
          this.render('alert', {
            into: 'home',
            outlet: 'alert'
          });
        }
      }
    }));

    return this.visit('/').then(() => {
      let text = this.$('p').text();
      assert.equal(text, 'THIS IS THE REAL HOME',
        'the homepage template was rendered'
      );

      return this.runTask(() => this.appRouter.send('showAlert'));
    }).then(() => {
      let text = this.$('.alert-box').text();

      assert.equal(text, 'Invader!',
        'Template for alert was rendered into the outlet'
      );
    });
  }

  ['@test templateName is still used when calling render with no name and options'](assert) {
    this.addTemplate('alert', `<div class='alert-box'>Invader!</div>`);
    this.addTemplate('home', `<p>THIS IS THE REAL HOME</p>{{outlet 'alert'}}`);

    this.add('route:home', Route.extend({
      templateName: 'alert',
      renderTemplate() {
        this.render({});
      }
    }));

    return this.visit('/').then(() => {
      let text = this.$('.alert-box').text();

      assert.equal(text, 'Invader!',
        'default templateName was rendered into outlet'
      );
    });
  }

  ['@test The Homepage with a `setupController` hook'](assert) {
    this.addTemplate('home',
      `<ul>{{#each hours as |entry|}}
        <li>{{entry}}</li>
      {{/each}}
      </ul>
    `);

    this.add('route:home', Route.extend({
      setupController(controller) {
        controller.set('hours', [
          'Monday through Friday: 9am to 5pm',
          'Saturday: Noon to Midnight',
          'Sunday: Noon to 6pm'
        ]);
      }
    }));
    return this.visit('/').then(() => {
      let text = this.$('ul li:nth-child(3)').text();

      assert.equal(text, 'Sunday: Noon to 6pm',
        'The template was rendered with the hours context'
      );
    });
  }

  [`@test The route controller is still set when overriding the setupController hook`](assert) {
    this.add('route:home', Route.extend({
      setupController() {
        // no-op
        // importantly, we are not calling this._super
      }
    }));

    this.add('controller:home', Controller.extend());

    return this.visit('/').then(() => {
      let homeRoute = this.applicationInstance.lookup('route:home');
      let homeController = this.applicationInstance.lookup('controller:home');

      assert.equal(homeRoute.controller, homeController,
        'route controller is the home controller'
      );
    });
  }

  ['@test the route controller can be specified via controllerName'](assert) {
    this.addTemplate('home', '<p>{{myValue}}</p>');
    this.add('route:home', Route.extend({
      controllerName: 'myController'
    }));
    this.add('controller:myController', Controller.extend({
      myValue: 'foo'
    }));

    return this.visit('/').then(() => {
      let homeRoute = this.applicationInstance.lookup('route:home');
      let myController = this.applicationInstance.lookup('controller:myController');
      let text = this.$('p').text();

      assert.equal(homeRoute.controller, myController,
        'route controller is set by controllerName'
      );
      assert.equal(text, 'foo',
        'The homepage template was rendered with data from the custom controller'
      );
    });
  }

  [`@test The route controller specified via controllerName is used in render`](assert) {
    this.router.map(function() {
      this.route('home', { path: '/' });
    });

    this.add('route:home', Route.extend({
      controllerName: 'myController',
      renderTemplate() {
        this.render('alternative_home');
      }
    }));

    this.add('controller:myController', Controller.extend({
      myValue: 'foo'
    }));

    this.addTemplate('alternative_home', '<p>alternative home: {{myValue}}</p>');


    return this.visit('/').then(() => {
      let homeRoute = this.applicationInstance.lookup('route:home');
      let myController = this.applicationInstance.lookup('controller:myController');
      let text = this.$('p').text();

      assert.equal(homeRoute.controller, myController,
        'route controller is set by controllerName');

      assert.equal(text, 'alternative home: foo',
        'The homepage template was rendered with data from the custom controller');
    });

  }

  [`@test The route controller specified via controllerName is used in render even when a controller with the routeName is available`](assert) {
    this.router.map(function() {
      this.route('home', { path: '/' });
    });

    this.addTemplate('home', '<p>home: {{myValue}}</p>');

    this.add('route:home', Route.extend({
      controllerName: 'myController'
    }));

    this.add('controller:home', Controller.extend({
      myValue: 'home'
    }));

    this.add('controller:myController', Controller.extend({
      myValue: 'myController'
    }));

    return this.visit('/').then(() => {
      let homeRoute = this.applicationInstance.lookup('route:home');
      let myController = this.applicationInstance.lookup('controller:myController');
      let text = this.$('p').text();

      assert.equal(homeRoute.controller, myController,
        'route controller is set by controllerName');

      assert.equal(text, 'home: myController',
        'The homepage template was rendered with data from the custom controller');
    });
  }

  [`@test The Homepage with a 'setupController' hook modifying other controllers`](assert) {
    this.router.map(function() {
      this.route('home', { path: '/' });
    });

    this.add('route:home', Route.extend({
      setupController(/* controller */) {
        this.controllerFor('home').set('hours', [
          'Monday through Friday: 9am to 5pm',
          'Saturday: Noon to Midnight',
          'Sunday: Noon to 6pm'
        ]);
      }
    }));

    this.addTemplate('home', '<ul>{{#each hours as |entry|}}<li>{{entry}}</li>{{/each}}</ul>');

    return this.visit('/').then(() => {
      let text = this.$('ul li:nth-child(3)').text();

      assert.equal(text, 'Sunday: Noon to 6pm',
        'The template was rendered with the hours context');
    });
  }

  [`@test The Homepage with a computed model that does not get overridden`](assert) {
    this.router.map(function() {
      this.route('home', { path: '/' });
    });

    this.add('controller:home', Controller.extend({
      model: computed(function() {
        return [
          'Monday through Friday: 9am to 5pm',
          'Saturday: Noon to Midnight',
          'Sunday: Noon to 6pm'
        ];
      })
    }));

    this.addTemplate('home', '<ul>{{#each model as |passage|}}<li>{{passage}}</li>{{/each}}</ul>');

    return this.visit('/').then(() => {
      let text = this.$('ul li:nth-child(3)').text();

      assert.equal(text, 'Sunday: Noon to 6pm',
        'The template was rendered with the context intact');
    });
  }

  [`@test The Homepage getting its controller context via model`](assert) {
    this.router.map(function() {
      this.route('home', { path: '/' });
    });

    this.add('route:home', Route.extend({
      model() {
        return [
          'Monday through Friday: 9am to 5pm',
          'Saturday: Noon to Midnight',
          'Sunday: Noon to 6pm'
        ];
      },

      setupController(controller, model) {
        assert.equal(this.controllerFor('home'), controller);

        this.controllerFor('home').set('hours', model);
      }
    }));

    this.addTemplate('home', '<ul>{{#each hours as |entry|}}<li>{{entry}}</li>{{/each}}</ul>');

    return this.visit('/').then(() => {
      let text = this.$('ul li:nth-child(3)').text();

      assert.equal(text, 'Sunday: Noon to 6pm',
        'The template was rendered with the hours context');
    });

  }

  [`@test The Specials Page getting its controller context by deserializing the params hash`](assert) {
    this.router.map(function() {
      this.route('home', { path: '/' });
      this.route('special', { path: '/specials/:menu_item_id' });
    });

    this.add('route:special',  Route.extend({
      model(params) {
        return EmberObject.create({
          menuItemId: params.menu_item_id
        });
      }
    }));

    this.addTemplate('special', '<p>{{model.menuItemId}}</p>');

    return this.visit('/specials/1').then(() => {
      let text = this.$('p').text();

      assert.equal(text, '1',
      'The model was used to render the template');
    });
  }

  ['@test The Specials Page defaults to looking models up via `find`']() {
    let MenuItem = EmberObject.extend();
    MenuItem.reopenClass({
      find(id) {
        return MenuItem.create({id});
      }
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
      }
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

  [`@test The loading state doesn't get entered for promises that resolve on the same run loop`](assert) {
    this.router.map(function() {
      this.route('home', { path: '/' });
      this.route('special', { path: '/specials/:menu_item_id' });
    });

    let MenuItem = EmberObject.extend();
    MenuItem.reopenClass({
      find(id) {
        return { id: id };
      }
    });

    this.add('model:menu_item', MenuItem);


    this.add('route:loading', Route.extend({
      enter() {
        assert.ok(false, 'LoadingRoute shouldn\'t have been entered.');
      }
    }));

    this.addTemplate('special', '<p>{{model.id}}</p>');
    this.addTemplate('loading', '<p>LOADING!</p>');

    return this.visit('/specials/1').then(() => {
      let text = this.$('p').text();

      assert.equal(text, '1', 'The app is now in the specials state');
    });
  }

  ['@test The Special page returning an error invokes SpecialRoute\'s error handler'](assert) {
    this.router.map(function() {
      this.route('home', { path: '/' });
      this.route('special', { path: '/specials/:menu_item_id' });
    });

    let menuItem, promise, resolve;

    let MenuItem = EmberObject.extend();
    MenuItem.reopenClass({
      find(id) {
        menuItem = MenuItem.create({ id: id });
        promise = new RSVP.Promise(res => resolve = res);

        return promise;
      }
    });

    this.add('model:menu_item', MenuItem);


    this.add('route:special', Route.extend({
      setup() {
        throw 'Setup error';
      },
      actions: {
        error(reason) {
          assert.equal(reason, 'Setup error', 'SpecialRoute#error received the error thrown from setup');
          return true;
        }
      }
    }));

    this.handleURLRejectsWith(this, assert, 'specials/1', 'Setup error');

    run(() => resolve(menuItem));
  }

  ['@test ApplicationRoute\'s default error handler can be overridden'](assert) {
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
        return new RSVP.Promise(res => resolve = res);
      }
    });
    this.add('model:menu_item', MenuItem);

    this.add('route:application', Route.extend({
      actions: {
        error(reason) {
          assert.equal(reason, 'Setup error', 'error was correctly passed to custom ApplicationRoute handler');
          return true;
        }
      }
    }));

    this.add('route:special', Route.extend({
      setup() {
        throw 'Setup error';
      }
    }));

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
      }
    });
    this.add('model:menu_item', MenuItem);

    this.addTemplate('home', '<h3>Home</h3>');
    this.addTemplate('special', '<p>{{model.id}}</p>');

    return this.visit('/').then(() => {
      this.assertText('Home', 'The app is now in the initial state');

      let promiseContext = MenuItem.create({ id: 1 });

      return this.visit('/specials/1', promiseContext);
    }).then(() => {
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
      }
    });

    this.router.map(function () {
      this.route('root', { path: '/' }, function () {
        this.route('special', { path: '/specials/:menu_item_id', resetNamespace: true });
      });
    });

    this.add('route:root', Route.extend({
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
      }
    }));

    this.add('route:loading', Route.extend({}));
    this.add('route:home', Route.extend({}));
    this.add('route:special', Route.extend({
      model({ menu_item_id }) {
        return MenuItem.find(menu_item_id);
      },
      setupController(controller, model) {
        set(controller, 'model', model);
      }
    }));

    this.addTemplate('root.index', '<h3>Home</h3>');
    this.addTemplate('special', '<p>{{model.id}}</p>');
    this.addTemplate('loading', '<p>LOADING!</p>');

    return this.visit('/').then(() => {
      rootElement = document.getElementById('qunit-fixture');

      assert.equal(getTextOf(rootElement.querySelector('h3')), 'Home', 'The app is now in the initial state');
      assert.equal(rootSetup, 1, 'The root setup was triggered');
      assert.equal(rootRender, 1, 'The root render was triggered');
      assert.equal(rootSerialize, 0, 'The root serialize was not called');
      assert.equal(rootModel, 1, 'The root model was called');

      let router = this.applicationInstance.lookup('router:main');
      let menuItem = MenuItem.create({ id: 1 });

      run.later(() => RSVP.resolve(menuItem), 1);
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

  ['@test Events are triggered on the controller if a matching action name is implemented'](assert) {
    let done = assert.async();

    this.router.map(function () {
      this.route('home', { path: '/' });
    });

    let model = { name: 'Tom Dale' };
    let stateIsNotCalled = true;

    this.add('route:home', Route.extend({
      model() {
        return model;
      },

      actions: {
        showStuff() {
          stateIsNotCalled = false;
        }
      }
    }));

    this.addTemplate('home', '<a {{action "showStuff" model}}>{{name}}</a>');
    this.add('controller:home', Controller.extend({
      actions: {
        showStuff(context) {
          assert.ok(stateIsNotCalled, 'an event on the state is not triggered');
          assert.deepEqual(context, { name: 'Tom Dale' }, 'an event with context is passed');
          done();
        }
      }
    }));

    this.visit('/').then(() => {
      document.getElementById('qunit-fixture').querySelector('a').click();
    });
  }

  ['@test Events are triggered on the current state when defined in `actions` object'](assert) {
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
          // Using Ember.copy removes any private Ember vars which older IE would be confused by
          assert.deepEqual(copy(obj, true), { name: 'Tom Dale' }, 'the context is correct');
          done();
        }
      }
    });

    this.add('route:home', HomeRoute);
    this.addTemplate('home', '<a {{action "showStuff" model}}>{{model.name}}</a>');

    this.visit('/').then(() => {
      document.getElementById('qunit-fixture').querySelector('a').click();
    });
  }

  ['@test Events defined in `actions` object are triggered on the current state when routes are nested'](assert) {
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
          // Using Ember.copy removes any private Ember vars which older IE would be confused by
          assert.deepEqual(copy(obj, true), { name: 'Tom Dale' }, 'the context is correct');
          done();
        }
      }
    });
    this.add('route:root', RootRoute);
    this.add('route:root.index', Route.extend({
      model() {
        return model;
      }
    }));

    this.addTemplate('root.index', '<a {{action "showStuff" model}}>{{model.name}}</a>');

    this.visit('/').then(() => {
      document.getElementById('qunit-fixture').querySelector('a').click();
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
        }
      }
    });

    let RouteMixin = Mixin.create({
      actions: {
        bar(msg) {
          assert.equal(msg, 'HELLO', 'bar handler in mixin');
          this._super(msg);
        }
      }
    });

    this.add('route:home', SuperRoute.extend(RouteMixin, {
      actions: {
        baz() {
          assert.ok(true, 'baz', 'baz hander in route');
        }
      }
    }));
    this.addTemplate('home', `
      <a class="do-foo" {{action "foo"}}>Do foo</a>
      <a class="do-bar-with-arg" {{action "bar" "HELLO"}}>Do bar with arg</a>
      <a class="do-baz" {{action "baz"}}>Do bar</a>
    `);

    return this.visit('/').then(() => {
      let rootElement = document.getElementById('qunit-fixture');
      rootElement.querySelector('.do-foo').click();
      rootElement.querySelector('.do-bar-with-arg').click();
      rootElement.querySelector('.do-baz').click();
    });
  }

  ['@test Actions are not triggered on the controller if a matching action name is implemented as a method'](assert) {
    let done = assert.async();

    this.router.map(function () {
      this.route('home', { path: '/' });
    });

    let model = { name: 'Tom Dale' };
    let stateIsNotCalled = true;

    this.add('route:home', Route.extend({
      model() {
        return model;
      },

      actions: {
        showStuff(context) {
          assert.ok(stateIsNotCalled, 'an event on the state is not triggered');
          assert.deepEqual(context, { name: 'Tom Dale' }, 'an event with context is passed');
          done();
        }
      }
    }));

    this.addTemplate('home', '<a {{action "showStuff" model}}>{{name}}</a>');

    this.add('controller:home', Controller.extend({
      showStuff() {
        stateIsNotCalled = false;
        assert.ok(stateIsNotCalled, 'an event on the state is not triggered');
      }
    }));

    this.visit('/').then(() => {
      document.getElementById('qunit-fixture').querySelector('a').click();
    });
  }

  ['@test actions can be triggered with multiple arguments'](assert) {
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
          // Using Ember.copy removes any private Ember vars which older IE would be confused by
          assert.deepEqual(copy(obj1, true), { name: 'Tilde' }, 'the first context is correct');
          assert.deepEqual(copy(obj2, true), { name: 'Tom Dale' }, 'the second context is correct');
          done();
        }
      }
    });

    this.add('route:root', RootRoute);

    this.add('controller:root.index', Controller.extend({
      model1: model1,
      model2: model2
    }));

    this.addTemplate('root.index', '<a {{action "showStuff" model1 model2}}>{{model1.name}}</a>');

    this.visit('/').then(() => {
      document.getElementById('qunit-fixture').querySelector('a').click();
    });
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

      run(() => {
        addObserver(router, 'url', function () {
          assert.ok(true, 'url change event was fired');
        });
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
        }
      })
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
        }
      })
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

  ['@test Route inherits model from parent route'](assert) {
    assert.expect(9);

    this.router.map(function () {
      this.route('the-post', { path: '/posts/:post_id' }, function () {
        this.route('comments');

        this.route('shares', { path: '/shares/:share_id', resetNamespace: true }, function () {
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
      3: post3
    };
    let shares = {
      1: share1,
      2: share2,
      3: share3
    };

    this.add('route:the-post', Route.extend({
      model(params) {
        return posts[params.post_id];
      }
    }));

    this.add('route:the-post.comments', Route.extend({
      afterModel(post /*, transition */) {
        let parent_model = this.modelFor('the-post');

        assert.equal(post, parent_model);
      }
    }));

    this.add('route:shares', Route.extend({
      model(params) {
        return shares[params.share_id];
      }
    }));

    this.add('route:shares.share', Route.extend({
      afterModel(share /*, transition */) {
        let parent_model = this.modelFor('shares');

        assert.equal(share, parent_model);
      }
    }));

    return this.visit('/').then(() => {
      this.handleURL(assert, '/posts/1/comments');
      this.handleURL(assert, '/posts/1/shares/1');

      this.handleURL(assert, '/posts/2/comments');
      this.handleURL(assert, '/posts/2/shares/2');

      this.handleURL(assert, '/posts/3/comments');
      this.handleURL(assert, '/posts/3/shares/3');
    });
  }

  ['@test Routes with { resetNamespace: true } inherits model from parent route'](assert) {
    assert.expect(6);

    this.router.map(function () {
      this.route('the-post', { path: '/posts/:post_id' }, function () {
        this.route('comments', { resetNamespace: true }, function () {
        });
      });
    });

    let post1 = {};
    let post2 = {};
    let post3 = {};

    let posts = {
      1: post1,
      2: post2,
      3: post3
    };

    this.add('route:the-post', Route.extend({
      model(params) {
        return posts[params.post_id];
      }
    }));

    this.add('route:comments', Route.extend({
      afterModel(post /*, transition */) {
        let parent_model = this.modelFor('the-post');

        assert.equal(post, parent_model);
      }
    }));

    return this.visit('/').then(() => {
      this.handleURL(assert, '/posts/1/comments');
      this.handleURL(assert, '/posts/2/comments');
      this.handleURL(assert, '/posts/3/comments');
    });
  }

  ['@test It is possible to get the model from a parent route'](assert) {
    assert.expect(6);

    this.router.map(function () {
      this.route('the-post', { path: '/posts/:post_id' }, function () {
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
      3: post3
    };

    this.add('route:the-post', Route.extend({
      model(params) {
        return posts[params.post_id];
      }
    }));

    this.add('route:comments', Route.extend({
      model() {
        assert.equal(this.modelFor('the-post'), currentPost);
      }
    }));

    return this.visit('/').then(() => {
      currentPost = post1;
      this.handleURL(assert, '/posts/1/comments');

      currentPost = post2;
      this.handleURL(assert, '/posts/2/comments');

      currentPost = post3;
      this.handleURL(assert, '/posts/3/comments');
    });
  }

  ['@test A redirection hook is provided'](assert) {
    this.router.map(function () {
      this.route('choose', { path: '/' });
      this.route('home');
    });

    let chooseFollowed = 0;
    let destination = 'home';

    this.add('route:choose', Route.extend({
      redirect() {
        if (destination) {
          this.transitionTo(destination);
        }
      },

      setupController() {
        chooseFollowed++;
      }
    }));

    return this.visit('/').then(() => {
      let rootElement = document.getElementById('qunit-fixture');
      assert.equal(chooseFollowed, 0, 'The choose route wasn\'t entered since a transition occurred');
      assert.equal(rootElement.querySelectorAll('h3.hours').length, 1, 'The home template was rendered');
      assert.equal(this.applicationInstance.lookup('controller:application').get('currentPath'), 'home');
    });
  }

  ['@test Redirecting from the middle of a route aborts the remainder of the routes'](assert) {
    assert.expect(3);

    this.router.map(function () {
      this.route('home');
      this.route('foo', function () {
        this.route('bar', { resetNamespace: true }, function () {
          this.route('baz');
        });
      });
    });

    this.add('route:bar', Route.extend({
      redirect() {
        this.transitionTo('home');
      },
      setupController() {
        assert.ok(false, 'Should transition before setupController');
      }
    }));

    this.add('route:bar-baz', Route.extend({
      enter() {
        assert.ok(false, 'Should abort transition getting to next route');
      }
    }));

    return this.visit('/').then(() => {
      let router = this.applicationInstance.lookup('router:main');
      this.handleURLAborts(assert, '/foo/bar/baz');
      assert.equal(this.applicationInstance.lookup('controller:application').get('currentPath'), 'home');
      assert.equal(router.get('location').getURL(), '/home');
    });
  }

  ['@test Redirecting to the current target in the middle of a route does not abort initial routing'](assert) {
    assert.expect(5);

    this.router.map(function () {
      this.route('home');
      this.route('foo', function () {
        this.route('bar', { resetNamespace: true }, function () {
          this.route('baz');
        });
      });
    });

    let successCount = 0;

    this.add('route:bar', Route.extend({
      redirect() {
        return this.transitionTo('bar.baz').then(function () {
          successCount++;
        });
      },

      setupController() {
        assert.ok(true, 'Should still invoke bar\'s setupController');
      }
    }));

    this.add('route:bar.baz', Route.extend({
      setupController() {
        assert.ok(true, 'Should still invoke bar.baz\'s setupController');
      }
    }));

    return this.visit('/').then(() => {
      this.handleURL(assert, '/foo/bar/baz');
      assert.equal(this.applicationInstance.lookup('controller:application').get('currentPath'), 'foo.bar.baz');
      assert.equal(successCount, 1, 'transitionTo success handler was called once');
    });
  }

  ['@test Redirecting to the current target with a different context aborts the remainder of the routes'](assert) {
    assert.expect(4);

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

    this.add('route:bar', Route.extend({
      afterModel() {
        if (count++ > 10) {
          assert.ok(false, 'infinite loop');
        } else {
          this.transitionTo('bar.baz', model);
        }
      }
    }));

    this.add('route:bar.baz', Route.extend({
      setupController() {
        assert.ok(true, 'Should still invoke setupController');
      }
    }));

    return this.visit('/').then(() => {
      this.handleURLAborts(assert, '/foo/bar/1/baz');
      assert.equal(this.applicationInstance.lookup('controller:application').get('currentPath'), 'foo.bar.baz');
      assert.equal(this.applicationInstance.lookup('router:main').get('location').getURL(), '/foo/bar/2/baz');
    });
  }

  ['@test Transitioning from a parent event does not prevent currentPath from being set'](assert) {
    this.router.map(function () {
      this.route('foo', function () {
        this.route('bar', { resetNamespace: true }, function () {
          this.route('baz');
        });
        this.route('qux');
      });
    });

    this.add('route:foo', Route.extend({
      actions: {
        goToQux() {
          this.transitionTo('foo.qux');
        }
      }
    }));

    return this.visit('/').then(() => {
      let applicationController = this.applicationInstance.lookup('controller:application');
      let router = this.applicationInstance.lookup('router:main');
      this.handleURL(assert, '/foo/bar/baz');
      assert.equal(applicationController.get('currentPath'), 'foo.bar.baz');
      run(() => router.send('goToQux'));
      assert.equal(applicationController.get('currentPath'), 'foo.qux');
      assert.equal(router.get('location').getURL(), '/foo/qux');
    });
  }

  ['@test Generated names can be customized when providing routes with dot notation'](assert) {
    assert.expect(4);

    this.addTemplate('index', '<div>Index</div>');
    this.addTemplate('application', '<h1>Home</h1><div class=\'main\'>{{outlet}}</div>');
    this.addTemplate('foo', '<div class=\'middle\'>{{outlet}}</div>');
    this.addTemplate('bar', '<div class=\'bottom\'>{{outlet}}</div>');
    this.addTemplate('bar.baz', '<p>{{name}}Bottom!</p>');

    this.router.map(function () {
      this.route('foo', { path: '/top' }, function () {
        this.route('bar', { path: '/middle', resetNamespace: true }, function () {
          this.route('baz', { path: '/bottom' });
        });
      });
    });

    this.add('route:foo', Route.extend({
      renderTemplate() {
        assert.ok(true, 'FooBarRoute was called');
        return this._super(...arguments);
      }
    }));

    this.add('route:bar.baz', Route.extend({
      renderTemplate() {
        assert.ok(true, 'BarBazRoute was called');
        return this._super(...arguments);
      }
    }));

    this.add('controller:bar', Controller.extend({
      name: 'Bar'
    }));

    this.add('controller:bar.baz', Controller.extend({
      name: 'BarBaz'
    }));

    return this.visit('/').then(() => {
      let rootElement = document.getElementById('qunit-fixture');
      this.handleURL(assert, '/top/middle/bottom');
      assert.equal(getTextOf(rootElement.querySelector('.main .middle .bottom p')), 'BarBazBottom!', 'The templates were rendered into their appropriate parents');
    });
  }

  ['@test Child routes render into their parent route\'s template by default'](assert) {
    this.addTemplate('index', '<div>Index</div>');
    this.addTemplate('application', '<h1>Home</h1><div class=\'main\'>{{outlet}}</div>');
    this.addTemplate('top', '<div class=\'middle\'>{{outlet}}</div>');
    this.addTemplate('middle', '<div class=\'bottom\'>{{outlet}}</div>');
    this.addTemplate('middle.bottom', '<p>Bottom!</p>');

    this.router.map(function () {
      this.route('top', function () {
        this.route('middle', { resetNamespace: true }, function () {
          this.route('bottom');
        });
      });
    });

    return this.visit('/').then(() => {
      let rootElement = document.getElementById('qunit-fixture');
      this.handleURL(assert, '/top/middle/bottom');
      assert.equal(getTextOf(rootElement.querySelector('.main .middle .bottom p')), 'Bottom!', 'The templates were rendered into their appropriate parents');
    });
  }

  ['@test Child routes render into specified template'](assert) {
    this.addTemplate('index', '<div>Index</div>');
    this.addTemplate('application', '<h1>Home</h1><div class=\'main\'>{{outlet}}</div>');
    this.addTemplate('top', '<div class=\'middle\'>{{outlet}}</div>');
    this.addTemplate('middle', '<div class=\'bottom\'>{{outlet}}</div>');
    this.addTemplate('middle.bottom', '<p>Bottom!</p>');

    this.router.map(function () {
      this.route('top', function () {
        this.route('middle', { resetNamespace: true }, function () {
          this.route('bottom');
        });
      });
    });

    this.add('route:middle.bottom', Route.extend({
      renderTemplate() {
        this.render('middle/bottom', { into: 'top' });
      }
    }));

    return this.visit('/').then(() => {
      let rootElement = document.getElementById('qunit-fixture');
      this.handleURL(assert, '/top/middle/bottom');
      assert.equal(rootElement.querySelectorAll('.main .middle .bottom p').length, 0, 'should not render into the middle template');
      assert.equal(getTextOf(rootElement.querySelector('.main .middle > p')), 'Bottom!', 'The template was rendered into the top template');
    });
  }

  ['@test Rendering into specified template with slash notation'](assert) {
    this.addTemplate('person.profile', 'profile {{outlet}}');
    this.addTemplate('person.details', 'details!');

    this.router.map(function () {
      this.route('home', { path: '/' });
    });

    this.add('route:home', Route.extend({
      renderTemplate() {
        this.render('person/profile');
        this.render('person/details', { into: 'person/profile' });
      }
    }));

    return this.visit('/').then(() => {
      let rootElement = document.getElementById('qunit-fixture');
      assert.equal(rootElement.textContent.trim(), 'profile details!', 'The templates were rendered');
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

    this.router.map(function () {
      this.route('posts', function () {
        this.route('post', { path: '/:postId', resetNamespace: true }, function () {
          this.route('edit');
        });
      });
    });

    this.add('route:posts', Route.extend({
      actions: {
        showPost(context) {
          this.transitionTo('post', context);
        }
      }
    }));

    this.add('route:post', Route.extend({
      model(params) {
        return { id: params.postId };
      },

      serialize(model) {
        return { postId: model.id };
      },

      actions: {
        editPost() {
          this.transitionTo('post.edit');
        }
      }
    }));

    this.add('route:post.edit', Route.extend({
      model() {
        let postId = this.modelFor('post').id;
        editedPostIds.push(postId);
        return null;
      },
      setup() {
        this._super(...arguments);
        editCount++;
      }
    }));

    return this.visit('/').then(() => {
      let router = this.applicationInstance.lookup('router:main');
      this.handleURL(assert, '/posts/1');

      run(() => router.send('editPost'));
      run(() => router.send('showPost', { id: '2' }));
      run(() => router.send('editPost'));
      assert.equal(editCount, 2, 'set up the edit route twice without failure');
      assert.deepEqual(editedPostIds, ['1', '2'], 'modelFor posts.post returns the right context');
    });
  }

  ['@test Router accounts for rootURL on page load when using history location'](assert) {
    let rootURL = window.location.pathname + '/app';
    let postsTemplateRendered = false;
    let setHistory;

    setHistory = function (obj, path) {
      obj.set('history', { state: { path: path } });
    };


    this.router.reopen({
      // location: 'historyTest',
      location: HistoryLocation.create({
        initState() {
          let path = rootURL + '/posts';

          setHistory(this, path);
          this.set('location', {
            pathname: path,
            href: 'http://localhost/' + path
          });
        },

        replaceState(path) {
          setHistory(this, path);
        },

        pushState(path) {
          setHistory(this, path);
        }
      }),
      rootURL: rootURL
    });

    this.router.map(function () {
      this.route('posts', { path: '/posts' });
    });

    this.add('route:posts', Route.extend({
      model() { },
      renderTemplate() {
        postsTemplateRendered = true;
      }
    }));

    return this.visit('/').then(() => {
      assert.ok(postsTemplateRendered, 'Posts route successfully stripped from rootURL');
    });
  }

  ['@test The rootURL is passed properly to the location implementation'](assert) {
    assert.expect(1);
    let rootURL = '/blahzorz';
    this.add('location:history-test', HistoryLocation.extend({
      rootURL: 'this is not the URL you are looking for',
      history: {
        pushState() { }
      },
      initState() {
        assert.equal(this.get('rootURL'), rootURL);
      }
    }));

    this.router.reopen({
      location: 'history-test',
      rootURL: rootURL,
      // if we transition in this test we will receive failures
      // if the tests are run from a static file
      _doURLTransition() {
        return RSVP.resolve('');
      }
    });

    return this.visit('/');
  }

  ['@test Only use route rendered into main outlet for default into property on child'](assert) {
    this.addTemplate('application', '{{outlet \'menu\'}}{{outlet}}');
    this.addTemplate('posts', '{{outlet}}');
    this.addTemplate('posts.index', '<p class="posts-index">postsIndex</p>');
    this.addTemplate('posts.menu', '<div class="posts-menu">postsMenu</div>');

    this.router.map(function () {
      this.route('posts', function () { });
    });

    this.add('route:posts', Route.extend({
      renderTemplate() {
        this.render();
        this.render('posts/menu', {
          into: 'application',
          outlet: 'menu'
        });
      }
    }));

    return this.visit('/').then(() => {
      this.handleURL(assert, '/posts');
      let rootElement = document.getElementById('qunit-fixture');
      assert.equal(getTextOf(rootElement.querySelector('div.posts-menu')), 'postsMenu', 'The posts/menu template was rendered');
      assert.equal(getTextOf(rootElement.querySelector('p.posts-index')), 'postsIndex', 'The posts/index template was rendered');
    });
  }

  ['@test Generating a URL should not affect currentModel'](assert) {
    this.router.map(function () {
      this.route('post', { path: '/posts/:post_id' });
    });

    let posts = {
      1: { id: 1 },
      2: { id: 2 }
    };

    this.add('route:post', Route.extend({
      model(params) {
        return posts[params.post_id];
      }
    }));

    return this.visit('/').then(() => {
      this.handleURL(assert, '/posts/1');

      let route = this.applicationInstance.lookup('route:post');
      assert.equal(route.modelFor('post'), posts[1]);

      let url = this.applicationInstance.lookup('router:main').generate('post', posts[2]);
      assert.equal(url, '/posts/2');
      assert.equal(route.modelFor('post'), posts[1]);
    });
  }
});
