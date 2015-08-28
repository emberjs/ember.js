import Ember from 'ember-metal/core';
import isEnabled from 'ember-metal/features';

var compile = Ember.HTMLBars.compile;

var App, container, router;

function setupApp(klass) {
  Ember.run(function() {
    App = klass.create({
      rootElement: '#qunit-fixture'
    });

    App.Router = App.Router.extend({
      location: 'none'
    });

    App.deferReadiness();

    container = App.__container__;
  });
}

QUnit.module('Application Lifecycle', {
  setup() {
    setupApp(Ember.Application.extend());
  },

  teardown() {
    router = null;
    Ember.run(App, 'destroy');
    Ember.TEMPLATES = {};
  }
});

function handleURL(path) {
  router = container.lookup('router:main');
  return Ember.run(function() {
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

  App.HomeRoute = Ember.Route.extend({
    setupController() {
      this.controllerFor('home').set('selectedMenuItem', 'home');
    },
    deactivate() {
      this.controllerFor('home').set('selectedMenuItem', null);
    }
  });
  App.ApplicationRoute = Ember.Route.extend({
    setupController() {
      this.controllerFor('application').set('selectedMenuItem', 'home');
    },
    deactivate() {
      this.controllerFor('application').set('selectedMenuItem', null);
    }
  });

  container.lookup('router:main');

  Ember.run(App, 'advanceReadiness');

  handleURL('/');

  equal(Ember.controllerFor(container, 'home').get('selectedMenuItem'), 'home');
  equal(Ember.controllerFor(container, 'application').get('selectedMenuItem'), 'home');

  App.reset();

  equal(Ember.controllerFor(container, 'home').get('selectedMenuItem'), null);
  equal(Ember.controllerFor(container, 'application').get('selectedMenuItem'), null);
});

QUnit.test('Destroying the application resets the router before the container is destroyed', function() {
  App.Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeRoute = Ember.Route.extend({
    setupController() {
      this.controllerFor('home').set('selectedMenuItem', 'home');
    },
    deactivate() {
      this.controllerFor('home').set('selectedMenuItem', null);
    }
  });
  App.ApplicationRoute = Ember.Route.extend({
    setupController() {
      this.controllerFor('application').set('selectedMenuItem', 'home');
    },
    deactivate() {
      this.controllerFor('application').set('selectedMenuItem', null);
    }
  });

  container.lookup('router:main');

  Ember.run(App, 'advanceReadiness');

  handleURL('/');

  equal(Ember.controllerFor(container, 'home').get('selectedMenuItem'), 'home');
  equal(Ember.controllerFor(container, 'application').get('selectedMenuItem'), 'home');

  Ember.run(App, 'destroy');

  equal(Ember.controllerFor(container, 'home').get('selectedMenuItem'), null);
  equal(Ember.controllerFor(container, 'application').get('selectedMenuItem'), null);
});

QUnit.test('initializers can augment an applications customEvents hash', function(assert) {
  assert.expect(1);

  Ember.run(App, 'destroy');

  var ApplicationSubclass = Ember.Application.extend();

  if (isEnabled('ember-registry-container-reform')) {
    ApplicationSubclass.initializer({
      name: 'customize-things',
      initialize(application) {
        application.customEvents = {
          wowza: 'wowza'
        };
      }
    });
  } else {
    ApplicationSubclass.initializer({
      name: 'customize-things',
      initialize(registry, application) {
        application.customEvents = {
          wowza: 'wowza'
        };
      }
    });
  }

  setupApp(ApplicationSubclass);

  App.FooBarComponent = Ember.Component.extend({
    wowza() {
      assert.ok(true, 'fired the event!');
    }
  });

  Ember.TEMPLATES['application'] = compile(`{{foo-bar}}`);
  Ember.TEMPLATES['components/foo-bar'] = compile(`<div id='wowza-thingy'></div>`);

  Ember.run(App, 'advanceReadiness');

  Ember.run(function() {
    Ember.$('#wowza-thingy').trigger('wowza');
  });
});

QUnit.test('instanceInitializers can augment an the customEvents hash', function(assert) {
  assert.expect(1);

  Ember.run(App, 'destroy');

  var ApplicationSubclass = Ember.Application.extend();

  ApplicationSubclass.instanceInitializer({
    name: 'customize-things',
    initialize(application) {
      application.customEvents = {
        herky: 'jerky'
      };
    }
  });

  setupApp(ApplicationSubclass);

  App.FooBarComponent = Ember.Component.extend({
    jerky() {
      assert.ok(true, 'fired the event!');
    }
  });

  Ember.TEMPLATES['application'] = compile(`{{foo-bar}}`);
  Ember.TEMPLATES['components/foo-bar'] = compile(`<div id='herky-thingy'></div>`);

  Ember.run(App, 'advanceReadiness');

  Ember.run(function() {
    Ember.$('#herky-thingy').trigger('herky');
  });
});
