import { Route } from 'ember-routing';
import { Controller, A as emberA } from 'ember-runtime';
import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';

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

  ['@test warn on URLs not included in the route set'](assert) {
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
        controller.set('hours', emberA([
          'Monday through Friday: 9am to 5pm',
          'Saturday: Noon to Midnight',
          'Sunday: Noon to 6pm'
        ]))
      }
    }));
    return this.visit('/').then(() => {
      let text = this.$('ul li').eq(2).text();

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

      assert.deepEqual(homeRoute.controller, myController,
        'route controller is set by controllerName'
      );
      assert.equal(text, 'foo',
        'The homepage template was rendered with data from the custom controller'
      );
    });
  }
});
