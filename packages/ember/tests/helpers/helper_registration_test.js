import 'ember';
import Ember from 'ember-metal/core';
import isEnabled from 'ember-metal/features';
import helpers from 'ember-htmlbars/helpers';
import { compile } from 'ember-template-compiler/main';
import { helper }, Helper from 'ember-htmlbars/helper';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';

var App, registry, container, originalViewKeyword;

function reverseHelper(value) {
  return arguments.length > 1 ? value.split('').reverse().join('') : '--';
}


QUnit.module('Application Lifecycle - Helper Registration', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
  },
  teardown() {
    Ember.run(function() {
      if (App) {
        App.destroy();
      }

      App = null;
      Ember.TEMPLATES = {};
    });
    resetKeyword('view', originalViewKeyword);
  }
});

var boot = function(callback) {
  Ember.run(function() {
    App = Ember.Application.create({
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

  Ember.run(App, 'advanceReadiness');
  Ember.run(function() {
    router.handleURL('/');
  });
};

QUnit.test('Unbound dashed helpers registered on the container can be late-invoked', function() {
  Ember.TEMPLATES.application = compile('<div id=\'wrapper\'>{{x-borf}} {{x-borf \'YES\'}}</div>');
  let myHelper = helper(function(val) {
    return arguments.length > 1 ? val : 'BORF';
  });

  boot(() => {
    registry.register('helper:x-borf', myHelper);
  });

  equal(Ember.$('#wrapper').text(), 'BORF YES', 'The helper was invoked from the container');
  ok(!helpers['x-borf'], 'Container-registered helper doesn\'t wind up on global helpers hash');
});

QUnit.test('Bound helpers registered on the container can be late-invoked', function() {
  Ember.TEMPLATES.application = compile('<div id=\'wrapper\'>{{x-reverse}} {{x-reverse foo}}</div>');

  boot(function() {
    registry.register('controller:application', Ember.Controller.extend({
      foo: 'alex'
    }));
    registry.register('helper:x-reverse', helper(reverseHelper));
  });

  equal(Ember.$('#wrapper').text(), '-- xela', 'The bound helper was invoked from the container');
  ok(!helpers['x-reverse'], 'Container-registered helper doesn\'t wind up on global helpers hash');
});

if (isEnabled('ember-htmlbars-dashless-helpers')) {
  QUnit.test('Undashed helpers registered on the container can be invoked', function() {
    Ember.TEMPLATES.application = compile('<div id=\'wrapper\'>{{omg}}|{{yorp \'boo\'}}|{{yorp \'ya\'}}</div>');

    expectDeprecation(function() {
      boot(function() {
        registry.register('helper:omg', function([value]) {
          return 'OMG';
        });

        registry.register('helper:yorp', helper(function(value) {
          return value;
        }));
      }, /Please use Ember.Helper.build to wrap helper functions./);
    });

    equal(Ember.$('#wrapper').text(), 'OMG|boo|ya', 'The helper was invoked from the container');
  });
} else {
  QUnit.test('Undashed helpers registered on the container can not (presently) be invoked', function() {
    // Note: the reason we're not allowing undashed helpers is to avoid
    // a possible perf hit in hot code paths, i.e. _triageMustache.
    // We only presently perform container lookups if prop.indexOf('-') >= 0

    Ember.TEMPLATES.application = compile('<div id=\'wrapper\'>{{omg}}|{{omg \'GRRR\'}}|{{yorp}}|{{yorp \'ahh\'}}</div>');

    expectAssertion(function() {
      boot(function() {
        registry.register('helper:omg', function() {
          return 'OMG';
        });
        registry.register('helper:yorp', helper(function() {
          return 'YORP';
        }));
      });
    }, /A helper named 'omg' could not be found/);
  });
}

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
      nameBuilder: Ember.inject.service('name-builder'),
      compute() {
        this.get('nameBuilder').build();
      }
    }));
  });

  ok(serviceCalled, 'service was injected, method called');
});
