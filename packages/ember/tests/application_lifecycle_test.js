import Application from 'ember-application/system/application';
import Route from 'ember-routing/system/route';
import run from 'ember-metal/run_loop';
import Component from 'ember-templates/component';
import jQuery from 'ember-views/system/jquery';
import { compile } from 'ember-template-compiler';
import { getTemplates, setTemplates } from 'ember-templates/template_registry';
import controllerFor from 'ember-routing/system/controller_for';

var App, TEMPLATES, appInstance, router;

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
    TEMPLATES = getTemplates();
    setupApp(Application.extend());
  },

  teardown() {
    router = null;
    run(App, 'destroy');
    setTemplates({});
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

import { test } from 'ember-glimmer/tests/utils/skip-if-glimmer';

test('initializers can augment an applications customEvents hash', function(assert) {
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

  TEMPLATES['application'] = compile(`{{foo-bar}}`);
  TEMPLATES['components/foo-bar'] = compile(`<div id='wowza-thingy'></div>`);

  run(App, 'advanceReadiness');

  run(function() {
    jQuery('#wowza-thingy').trigger('wowza');
  });
});

test('instanceInitializers can augment an the customEvents hash', function(assert) {
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

  TEMPLATES['application'] = compile(`{{foo-bar}}`);
  TEMPLATES['components/foo-bar'] = compile(`<div id='herky-thingy'></div>`);

  run(App, 'advanceReadiness');

  run(function() {
    jQuery('#herky-thingy').trigger('herky');
  });
});
