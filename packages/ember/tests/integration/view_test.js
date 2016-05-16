import Controller from 'ember-runtime/controllers/controller';
import run from 'ember-metal/run_loop';
import EmberView from 'ember-views/views/view';
import compile from 'ember-template-compiler/system/compile';
import Application from 'ember-application/system/application';
import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';
import { setTemplates, set as setTemplate } from 'ember-templates/template_registry';

var App, registry, originalViewKeyword;

function setupExample() {
  // setup templates
  setTemplate('application', compile('{{outlet}}', { moduleName: 'application' }));
  setTemplate('index', compile('<h1>Node 1</h1>', { moduleName: 'index' }));
  setTemplate('posts', compile('<h1>Node 1</h1>', { moduleName: 'posts' }));

  App.Router.map(function() {
    this.route('posts');
  });
}

function handleURL(path) {
  var router = App.__container__.lookup('router:main');
  return run(router, 'handleURL', path);
}

import { test, testModule } from 'ember-glimmer/tests/utils/skip-if-glimmer';

testModule('View Integration', {
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
    setTemplates({});
  }
});

test('invoking `{{view}} from a non-view backed (aka only template) template provides the correct controller to the view instance`', function(assert) {
  var controllerInMyFoo, indexController;

  setTemplate('index', compile('{{view "my-foo"}}', { moduleName: 'my-foo' }));

  registry.register('view:my-foo', EmberView.extend({
    init() {
      this._super(...arguments);

      controllerInMyFoo = this.get('controller');
    }
  }));

  registry.register('controller:index', Controller.extend({
    init() {
      this._super(...arguments);

      indexController = this;
    }
  }));

  run(App, 'advanceReadiness');
  handleURL('/');

  assert.strictEqual(controllerInMyFoo, indexController, 'controller is provided to `{{view}}`');
});
