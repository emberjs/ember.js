import Ember from 'ember-metal/core';
import run from 'ember-metal/run_loop';
import EmberView from 'ember-views/views/view';
import EmberComponent from 'ember-views/views/component';
import compile from 'ember-template-compiler/system/compile';
import Application from 'ember-application/system/application';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';

var App, registry, originalViewKeyword;

function setupExample() {
  // setup templates
  Ember.TEMPLATES.application = compile('{{outlet}}', { moduleName: 'application' });
  Ember.TEMPLATES.index = compile('<h1>Node 1</h1>', { moduleName: 'index' });
  Ember.TEMPLATES.posts = compile('<h1>Node 1</h1>', { moduleName: 'posts' });

  App.Router.map(function() {
    this.route('posts');
  });
}

function handleURL(path) {
  var router = App.__container__.lookup('router:main');
  return run(router, 'handleURL', path);
}

QUnit.module('View Integration', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
    run(function() {
      App = Application.create({
        rootElement: '#qunit-fixture'
      });
      App.deferReadiness();

      App.Router.reopen({
        location: 'none'
      });

      registry = App.__registry__;
    });

    setupExample();
  },

  teardown() {
    run(App, 'destroy');
    resetKeyword('view', originalViewKeyword);
    App = null;
    Ember.TEMPLATES = {};
  }
});

QUnit.test('invoking `{{view}} from a non-view backed (aka only template) template provides the correct index controller to the view instance`', function(assert) {
  var controllerInMyFoo, indexController;

  Ember.TEMPLATES.index = compile('{{view "my-foo" aProperty=thisProperty}}', { moduleName: 'index' });

  registry.register('view:my-foo', EmberView.extend({
    aProperty: null,
    init() {
      this._super(...arguments);
      controllerInMyFoo = this.get('controller');
    }
  }));

  registry.register('controller:index', Ember.Controller.extend({
    thisProperty: 'foo',
    init() {
      this._super(...arguments);

      indexController = this;
    }
  }));

  run(App, 'advanceReadiness');
  handleURL('/');

  assert.strictEqual(controllerInMyFoo, indexController, 'controller is provided to `{{view}}`');

  run(indexController, 'set', 'thisProperty', 'bar');

  assert.strictEqual(controllerInMyFoo, indexController, 'the same controller is still provided to `{{view}}`');
});

QUnit.test('invoking `{{view}} from a non-view backed (aka only template) template provides the correct application controller to the view instance`', function(assert) {
  var controllerInMyFoo, applicationController;

  Ember.TEMPLATES.application = compile('{{view "my-foo" aProperty=thisProperty}}', { moduleName: 'application' });

  registry.register('view:my-foo', EmberView.extend({
    aProperty: null,
    init() {
      this._super(...arguments);
      controllerInMyFoo = this.get('controller');
    }
  }));

  registry.register('controller:application', Ember.Controller.extend({
    thisProperty: 'foo',
    init() {
      this._super(...arguments);

      applicationController = this;
    }
  }));

  run(App, 'advanceReadiness');
  handleURL('/');

  assert.strictEqual(controllerInMyFoo, applicationController, 'controller is provided to `{{view}}`');

  run(applicationController, 'set', 'thisProperty', 'bar');

  assert.strictEqual(controllerInMyFoo, applicationController, 'the same controller is still provided to `{{view}}`');
});

QUnit.test('invoking `{{view}} from a component block provides the correct application controller to the view instance`', function(assert) {
  var controllerInMyFoo, applicationController;

  Ember.TEMPLATES.application = compile('{{#x-foo}}{{view "my-foo" aProperty=thisProperty}}{{/x-foo}}', { moduleName: 'application' });

  registry.register('component:x-foo', EmberComponent.extend());

  registry.register('view:my-foo', EmberView.extend({
    aProperty: null,
    init() {
      this._super(...arguments);
      controllerInMyFoo = this.get('controller');
    }
  }));

  registry.register('controller:application', Ember.Controller.extend({
    thisProperty: 'foo',
    init() {
      this._super(...arguments);
      applicationController = this;
    }
  }));

  run(App, 'advanceReadiness');
  handleURL('/');

  assert.strictEqual(controllerInMyFoo, applicationController, 'controller is provided to `{{view}}`');

  run(applicationController, 'set', 'thisProperty', 'bar');

  assert.strictEqual(controllerInMyFoo, applicationController, 'the same controller is still provided to `{{view}}`');
});
