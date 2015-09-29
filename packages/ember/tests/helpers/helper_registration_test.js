import Ember from 'ember-metal/core';
import Controller from 'ember-runtime/controllers/controller';
import run from 'ember-metal/run_loop';
import helpers from 'ember-htmlbars/helpers';
import { compile } from 'ember-template-compiler';
import Helper, { helper } from 'ember-htmlbars/helper';
import Application from 'ember-application/system/application';
import jQuery from 'ember-views/system/jquery';
import inject from 'ember-runtime/inject';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';

var App, registry, container, originalViewKeyword;

QUnit.module('Application Lifecycle - Helper Registration', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
  },
  teardown() {
    run(function() {
      if (App) {
        App.destroy();
      }

      App = null;
      Ember.TEMPLATES = {};
    });
    delete helpers['foo-bar-baz-widget'];
    resetKeyword('view', originalViewKeyword);
  }
});

var boot = function(callback) {
  run(function() {
    App = Application.create({
      name: 'App',
      rootElement: '#qunit-fixture'
    });

    App.deferReadiness();

    App.Router = Ember.Router.extend({
      location: 'none'
    });

    registry = App.__registry__;
    container = App.__container__;

    if (callback) { callback(); }
  });

  var router = container.lookup('router:main');

  run(App, 'advanceReadiness');
  run(function() {
    router.handleURL('/');
  });
};

QUnit.test('Unbound dashed helpers registered on the container can be late-invoked', function() {
  Ember.TEMPLATES.application = compile('<div id=\'wrapper\'>{{x-borf}} {{x-borf \'YES\'}}</div>');
  let myHelper = helper(function(params) {
    return params[0] || 'BORF';
  });

  boot(() => {
    registry.register('helper:x-borf', myHelper);
  });

  equal(jQuery('#wrapper').text(), 'BORF YES', 'The helper was invoked from the container');
  ok(!helpers['x-borf'], 'Container-registered helper doesn\'t wind up on global helpers hash');
});

QUnit.test('Bound helpers registered on the container can be late-invoked', function() {
  Ember.TEMPLATES.application = compile('<div id=\'wrapper\'>{{x-reverse}} {{x-reverse foo}}</div>');

  boot(function() {
    registry.register('controller:application', Controller.extend({
      foo: 'alex'
    }));

    registry.register('helper:x-reverse', helper(function([ value ]) {
      return value ? value.split('').reverse().join('') : '--';
    }));
  });

  equal(jQuery('#wrapper').text(), '-- xela', 'The bound helper was invoked from the container');
  ok(!helpers['x-reverse'], 'Container-registered helper doesn\'t wind up on global helpers hash');
});

QUnit.test('Undashed helpers registered on the container can be invoked', function() {
  Ember.TEMPLATES.application = compile('<div id=\'wrapper\'>{{omg}}|{{yorp \'boo\'}}|{{yorp \'ya\'}}</div>');

  boot(function() {
    registry.register('helper:omg', helper(function() {
      return 'OMG';
    }));

    registry.register('helper:yorp', helper(function([ value ]) {
      return value;
    }));
  });

  equal(jQuery('#wrapper').text(), 'OMG|boo|ya', 'The helper was invoked from the container');
});

QUnit.test('Helpers can receive injections', function() {
  Ember.TEMPLATES.application = compile('<div id=\'wrapper\'>{{full-name}}</div>');

  var serviceCalled = false;
  boot(function() {
    registry.register('service:name-builder', Ember.Service.extend({
      build() {
        serviceCalled = true;
      }
    }));
    registry.register('helper:full-name', Helper.extend({
      nameBuilder: inject.service('name-builder'),
      compute() {
        this.get('nameBuilder').build();
      }
    }));
  });

  ok(serviceCalled, 'service was injected, method called');
});
