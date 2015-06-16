import compile from 'ember-template-compiler/system/compile';
import run from 'ember-metal/run_loop';
import EmberView from 'ember-views/views/view';

var App, registry;

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
    run(function() {
      App = Ember.Application.create({
        rootElement: '#qunit-fixture'
      });
      App.deferReadiness();

      App.Router.reopen({
        location: 'none'
      });

      registry = App.__container__._registry;
    });

    setupExample();
  },

  teardown() {
    run(App, 'destroy');
    App = null;
    Ember.TEMPLATES = {};
  }
});

QUnit.test('invoking `{{view}} from a non-view backed (aka only template) template provides the correct controller to the view instance`', function(assert) {
  var controllerInMyFoo, indexController;

  Ember.TEMPLATES.index = compile('{{view "my-foo"}}', { moduleName: 'my-foo' });

  registry.register('view:my-foo', EmberView.extend({
    init() {
      this._super(...arguments);

      controllerInMyFoo = this.get('controller');
    }
  }));

  registry.register('controller:index', Ember.Controller.extend({
    init() {
      this._super(...arguments);

      indexController = this;
    }
  }));

  run(App, 'advanceReadiness');
  handleURL('/');

  assert.strictEqual(controllerInMyFoo, indexController, 'controller is provided to `{{view}}`');
});
