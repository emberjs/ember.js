import RSVP from 'rsvp';
import { Route } from 'ember-routing';
import { Controller, Object as EmberObject } from 'ember-runtime';
import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';
import { computed, run } from 'ember-metal';

moduleFor('Basic Routing - Decoupled from global resovler',
class extends ApplicationTestCase {
  constructor() {
    super();
    this.addTemplate('home', '<h3 id="app">Hours</h3>');
    this.addTemplate('camelot', '<section id="camelot"><h3>Is a silly place</h3></section>');
    this.addTemplate('homepage', '<h3 id="troll">Megatroll</h3><p>{{model.home}}</p>');

    this.router.map(function() {
      this.route('home', { path: '/' });
    });
  }

  getController(name) {
    return this.applicationInstance.lookup(`controller:${name}`);
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

      let text = this.$('#app').text();
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

      let text = this.$('#app').text();
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

});
