import run from 'ember-metal/run_loop';
import $ from 'ember-views/system/jquery';
import Application from 'ember-application/system/application';
import { subscribe, unsubscribe } from 'ember-metal/instrumentation';
import { compile } from 'ember-template-compiler';
import { setTemplates, set as setTemplate } from 'ember-templates/template_registry';
import { test, testModule } from 'ember-glimmer/tests/utils/skip-if-glimmer';

var App, $fixture;

function setupExample() {
  // setup templates
  setTemplate('application', compile('{{outlet}}'));
  setTemplate('index', compile('<h1>Node 1</h1>'));
  setTemplate('posts', compile('<h1>Node 1</h1>'));

  App.Router.map(function() {
    this.route('posts');
  });
}

function handleURL(path) {
  var router = App.__container__.lookup('router:main');
  return run(router, 'handleURL', path);
}

let subscriber;
testModule('View Instrumentation', {
  setup() {
    run(function() {
      App = Application.create({
        rootElement: '#qunit-fixture'
      });
      App.deferReadiness();

      App.Router.reopen({
        location: 'none'
      });
    });

    $fixture = $('#qunit-fixture');
    setupExample();
  },

  teardown() {
    if (subscriber) {
      unsubscribe(subscriber);
    }
    run(App, 'destroy');
    App = null;
    setTemplates({});
  }
});

test('Nodes without view instances are instrumented', function(assert) {
  var called = false;
  subscriber = subscribe('render', {
    before() {
      called = true;
    },
    after() {}
  });
  run(App, 'advanceReadiness');
  assert.ok(called, 'Instrumentation called on first render');
  called = false;
  handleURL('/posts');
  assert.ok(called, 'instrumentation called on transition to non-view backed route');
});
