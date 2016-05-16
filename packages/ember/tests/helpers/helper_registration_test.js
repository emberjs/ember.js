import Controller from 'ember-runtime/controllers/controller';
import run from 'ember-metal/run_loop';
import helpers from 'ember-htmlbars/helpers';
import { compile } from 'ember-template-compiler';
import Helper, { helper } from 'ember-htmlbars/helper';
import Application from 'ember-application/system/application';
import Router from 'ember-routing/system/router';
import Service from 'ember-runtime/system/service';
import jQuery from 'ember-views/system/jquery';
import inject from 'ember-runtime/inject';
import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';
import { setTemplates, set as setTemplate } from 'ember-templates/template_registry';

var App, appInstance, originalViewKeyword;

QUnit.module('Application Lifecycle - Helper Registration', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
  },
  teardown() {
    run(function() {
      if (App) {
        App.destroy();
      }

      App = appInstance = null;
      setTemplates({});
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

    App.Router = Router.extend({
      location: 'none'
    });

    appInstance = App.__deprecatedInstance__;

    if (callback) { callback(); }
  });

  var router = appInstance.lookup('router:main');

  run(App, 'advanceReadiness');
  run(function() {
    router.handleURL('/');
  });
};

QUnit.test('Unbound dashed helpers registered on the container can be late-invoked', function() {
  setTemplate('application', compile('<div id=\'wrapper\'>{{x-borf}} {{x-borf \'YES\'}}</div>'));
  let myHelper = helper(function(params) {
    return params[0] || 'BORF';
  });

  boot(() => {
    App.register('helper:x-borf', myHelper);
  });

  equal(jQuery('#wrapper').text(), 'BORF YES', 'The helper was invoked from the container');
  ok(!helpers['x-borf'], 'Container-registered helper doesn\'t wind up on global helpers hash');
});

QUnit.test('Bound helpers registered on the container can be late-invoked', function() {
  setTemplate('application', compile('<div id=\'wrapper\'>{{x-reverse}} {{x-reverse foo}}</div>'));

  boot(function() {
    appInstance.register('controller:application', Controller.extend({
      foo: 'alex'
    }));

    appInstance.register('helper:x-reverse', helper(function([ value ]) {
      return value ? value.split('').reverse().join('') : '--';
    }));
  });

  equal(jQuery('#wrapper').text(), '-- xela', 'The bound helper was invoked from the container');
  ok(!helpers['x-reverse'], 'Container-registered helper doesn\'t wind up on global helpers hash');
});

QUnit.test('Undashed helpers registered on the container can be invoked', function() {
  setTemplate('application', compile('<div id=\'wrapper\'>{{omg}}|{{yorp \'boo\'}}|{{yorp \'ya\'}}</div>'));

  boot(function() {
    appInstance.register('helper:omg', helper(function() {
      return 'OMG';
    }));

    appInstance.register('helper:yorp', helper(function([ value ]) {
      return value;
    }));
  });

  equal(jQuery('#wrapper').text(), 'OMG|boo|ya', 'The helper was invoked from the container');
});

import { test } from 'ember-glimmer/tests/utils/skip-if-glimmer';

// needs glimmer Helper
test('Helpers can receive injections', function() {
  setTemplate('application', compile('<div id=\'wrapper\'>{{full-name}}</div>'));

  var serviceCalled = false;
  boot(function() {
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
