import Ember from 'ember-metal/core'; // HTMLBars, TEMPLATES
import Application from 'ember-application/system/application';
import Route from 'ember-routing/system/route';
import controllerFor from 'ember-routing/system/controller_for';
import run from 'ember-metal/run_loop';
import Component from 'ember-views/components/component';
import jQuery from 'ember-views/system/jquery';

var compile = Ember.HTMLBars.compile;

var App, appInstance, router;

function setupApp(klass) {
  run(function() {
    App = klass.create({
      rootElement: '#qunit-fixture'
    });

    App.Router = App.Router.extend({
      location: 'none'
    });

    App.deferReadiness();

    appInstance = App.__deprecatedInstance__;
  });
}

QUnit.module('Application Lifecycle', {
  setup() {
    setupApp(Application.extend());
  },

  teardown() {
    router = null;
    run(App, 'destroy');
    Ember.TEMPLATES = {};
  }
});

function handleURL(path) {
  router = appInstance.lookup('router:main');
  return run(function() {
    return router.handleURL(path).then(function(value) {
      ok(true, 'url: `' + path + '` was handled');
      return value;
    }, function(reason) {
      ok(false, reason);
      throw reason;
    });
  });
}

QUnit.test('Resetting the application allows controller properties to be set when a route deactivates', function() {
  App.Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeRoute = Route.extend({
    setupController() {
      this.controllerFor('home').set('selectedMenuItem', 'home');
    },
    deactivate() {
      this.controllerFor('home').set('selectedMenuItem', null);
    }
  });
  App.ApplicationRoute = Route.extend({
    setupController() {
      this.controllerFor('application').set('selectedMenuItem', 'home');
    },
    deactivate() {
      this.controllerFor('application').set('selectedMenuItem', null);
    }
  });

  appInstance.lookup('router:main');

  run(App, 'advanceReadiness');

  handleURL('/');

  equal(controllerFor(appInstance, 'home').get('selectedMenuItem'), 'home');
  equal(controllerFor(appInstance, 'application').get('selectedMenuItem'), 'home');

  App.reset();

  equal(controllerFor(appInstance, 'home').get('selectedMenuItem'), null);
  equal(controllerFor(appInstance, 'application').get('selectedMenuItem'), null);
});

QUnit.test('Destroying the application resets the router before the appInstance is destroyed', function() {
  App.Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeRoute = Route.extend({
    setupController() {
      this.controllerFor('home').set('selectedMenuItem', 'home');
    },
    deactivate() {
      this.controllerFor('home').set('selectedMenuItem', null);
    }
  });
  App.ApplicationRoute = Route.extend({
    setupController() {
      this.controllerFor('application').set('selectedMenuItem', 'home');
    },
    deactivate() {
      this.controllerFor('application').set('selectedMenuItem', null);
    }
  });

  appInstance.lookup('router:main');

  run(App, 'advanceReadiness');

  handleURL('/');

  equal(controllerFor(appInstance, 'home').get('selectedMenuItem'), 'home');
  equal(controllerFor(appInstance, 'application').get('selectedMenuItem'), 'home');

  run(App, 'destroy');

  equal(controllerFor(appInstance, 'home').get('selectedMenuItem'), null);
  equal(controllerFor(appInstance, 'application').get('selectedMenuItem'), null);
});

QUnit.test('initializers can augment an applications customEvents hash', function(assert) {
  assert.expect(1);

  run(App, 'destroy');

  var ApplicationSubclass = Application.extend();

  ApplicationSubclass.initializer({
    name: 'customize-things',
    initialize(application) {
      application.customEvents = {
        wowza: 'wowza'
      };
    }
  });

  setupApp(ApplicationSubclass);

  App.FooBarComponent = Component.extend({
    wowza() {
      assert.ok(true, 'fired the event!');
    }
  });

  Ember.TEMPLATES['application'] = compile(`{{foo-bar}}`);
  Ember.TEMPLATES['components/foo-bar'] = compile(`<div id='wowza-thingy'></div>`);

  run(App, 'advanceReadiness');

  run(function() {
    jQuery('#wowza-thingy').trigger('wowza');
  });
});

QUnit.test('instanceInitializers can augment an the customEvents hash', function(assert) {
  assert.expect(1);

  run(App, 'destroy');

  var ApplicationSubclass = Application.extend();

  ApplicationSubclass.instanceInitializer({
    name: 'customize-things',
    initialize(application) {
      application.customEvents = {
        herky: 'jerky'
      };
    }
  });

  setupApp(ApplicationSubclass);

  App.FooBarComponent = Component.extend({
    jerky() {
      assert.ok(true, 'fired the event!');
    }
  });

  Ember.TEMPLATES['application'] = compile(`{{foo-bar}}`);
  Ember.TEMPLATES['components/foo-bar'] = compile(`<div id='herky-thingy'></div>`);

  run(App, 'advanceReadiness');

  run(function() {
    jQuery('#herky-thingy').trigger('herky');
  });
});
