import Application from 'ember-application/system/application';
import ApplicationInstance from 'ember-application/system/application-instance';
import run from 'ember-metal/run_loop';
import jQuery from 'ember-views/system/jquery';
import isEnabled from 'ember-metal/features';

let app, appInstance;

QUnit.module('Ember.ApplicationInstance', {
  setup() {
    jQuery('#qunit-fixture').html('<div id=\'one\'><div id=\'one-child\'>HI</div></div><div id=\'two\'>HI</div>');
    run(function() {
      app = Application.create({ rootElement: '#one', router: null });
    });
  },

  teardown() {
    jQuery('#qunit-fixture').empty();

    if (appInstance) {
      run(appInstance, 'destroy');
    }

    if (app) {
      run(app, 'destroy');
    }
  }
});

QUnit.test('an application instance can be created based upon an application', function() {
  run(function() {
    appInstance = ApplicationInstance.create({ application: app });
  });

  ok(appInstance, 'instance should be created');
  equal(appInstance.application, app, 'application should be set to parent');
});

QUnit.test('properties (and aliases) are correctly assigned for accessing the container and registry', function() {
  run(function() {
    appInstance = ApplicationInstance.create({ application: app });
  });

  ok(appInstance, 'instance should be created');
  ok(appInstance.__container__, '#__container__ is accessible');
  ok(appInstance.__registry__, '#__registry__ is accessible');

  if (isEnabled('ember-registry-container-reform')) {
    expect(9);

    ok(typeof appInstance.container.lookup === 'function', '#container.lookup is available as a function');

    // stub with a no-op to keep deprecation test simple
    appInstance.__container__.lookup = function() {
      ok(true, '#loookup alias is called correctly');
    };

    expectDeprecation(function() {
      appInstance.container.lookup();
    }, /Using `ApplicationInstance.container.lookup` is deprecated. Please use `ApplicationInstance.lookup` instead./);


    ok(typeof appInstance.registry.register === 'function', '#registry.register is available as a function');
    appInstance.__registry__.register = function() {
      ok(true, '#register alias is called correctly');
    };

    expectDeprecation(function() {
      appInstance.registry.register();
    }, /Using `ApplicationInstance.registry.register` is deprecated. Please use `ApplicationInstance.register` instead./);
  } else {
    expect(5);

    strictEqual(appInstance.container, appInstance.__container__, '#container alias should be assigned');
    strictEqual(appInstance.registry, appInstance.__registry__, '#registry alias should be assigned');
  }
});

QUnit.test('customEvents added to the application before setupEventDispatcher', function(assert) {
  assert.expect(1);

  run(function() {
    appInstance = ApplicationInstance.create({ application: app });
  });

  app.customEvents = {
    awesome: 'sauce'
  };

  var eventDispatcher = appInstance.lookup('event_dispatcher:main');
  eventDispatcher.setup = function(events) {
    assert.equal(events.awesome, 'sauce');
  };

  appInstance.setupEventDispatcher();
});

QUnit.test('customEvents added to the application before setupEventDispatcher', function(assert) {
  assert.expect(1);

  run(function() {
    appInstance = ApplicationInstance.create({ application: app });
  });

  app.customEvents = {
    awesome: 'sauce'
  };

  var eventDispatcher = appInstance.lookup('event_dispatcher:main');
  eventDispatcher.setup = function(events) {
    assert.equal(events.awesome, 'sauce');
  };

  appInstance.setupEventDispatcher();
});

QUnit.test('customEvents added to the application instance before setupEventDispatcher', function(assert) {
  assert.expect(1);

  run(function() {
    appInstance = ApplicationInstance.create({ application: app });
  });

  appInstance.customEvents = {
    awesome: 'sauce'
  };

  var eventDispatcher = appInstance.lookup('event_dispatcher:main');
  eventDispatcher.setup = function(events) {
    assert.equal(events.awesome, 'sauce');
  };

  appInstance.setupEventDispatcher();
});
