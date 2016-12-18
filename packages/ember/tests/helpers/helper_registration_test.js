import { Controller, Service, inject } from 'ember-runtime';
import { run } from 'ember-metal';
import { compile } from 'ember-template-compiler';
import {
  Helper,
  helper,
  setTemplates,
  setTemplate
} from 'ember-glimmer';
import { Application } from 'ember-application';
import { Router } from 'ember-routing';
import { jQuery } from 'ember-views';

let App, appInstance;

QUnit.module('Application Lifecycle - Helper Registration', {
  teardown() {
    run(() => {
      if (App) {
        App.destroy();
      }

      App = appInstance = null;
      setTemplates({});
    });
  }
});

function boot(callback) {
  run(() => {
    App = Application.create({
      name: 'App',
      rootElement: '#qunit-fixture'
    });

    App.deferReadiness();

    App.Router = Router.extend({
      location: 'none'
    });

    // We shouldn't be testing this
    appInstance = App.__deprecatedInstance__;

    if (callback) { callback(); }
  });

  let router = appInstance.lookup('router:main');

  run(App, 'advanceReadiness');
  run(() => router.handleURL('/'));
}

QUnit.test('Unbound dashed helpers registered on the container can be late-invoked', function() {
  setTemplate('application', compile('<div id=\'wrapper\'>{{x-borf}} {{x-borf \'YES\'}}</div>'));
  let myHelper = helper(params => params[0] || 'BORF');

  boot(() => {
    App.register('helper:x-borf', myHelper);
  });

  equal(jQuery('#wrapper').text(), 'BORF YES', 'The helper was invoked from the container');
});

QUnit.test('Bound helpers registered on the container can be late-invoked', function() {
  setTemplate('application', compile('<div id=\'wrapper\'>{{x-reverse}} {{x-reverse foo}}</div>'));

  boot(() => {
    appInstance.register('controller:application', Controller.extend({
      foo: 'alex'
    }));

    appInstance.register('helper:x-reverse', helper(function([ value ]) {
      return value ? value.split('').reverse().join('') : '--';
    }));
  });

  equal(jQuery('#wrapper').text(), '-- xela', 'The bound helper was invoked from the container');
});

QUnit.test('Undashed helpers registered on the container can be invoked', function() {
  setTemplate('application', compile('<div id=\'wrapper\'>{{omg}}|{{yorp \'boo\'}}|{{yorp \'ya\'}}</div>'));

  boot(() => {
    appInstance.register('helper:omg', helper(() => 'OMG'));

    appInstance.register('helper:yorp', helper(([ value ]) => value));
  });

  equal(jQuery('#wrapper').text(), 'OMG|boo|ya', 'The helper was invoked from the container');
});

QUnit.test('Helpers can receive injections', function() {
  setTemplate('application', compile('<div id=\'wrapper\'>{{full-name}}</div>'));

  let serviceCalled = false;
  boot(() => {
    appInstance.register('service:name-builder', Service.extend({
      build() {
        serviceCalled = true;
      }
    }));
    appInstance.register('helper:full-name', Helper.extend({
      nameBuilder: inject.service('name-builder'),
      compute() {
        this.get('nameBuilder').build();
      }
    }));
  });

  ok(serviceCalled, 'service was injected, method called');
});
