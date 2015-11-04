import Ember from 'ember-metal/core'; // TEMPLATES
import run from 'ember-metal/run_loop';
import $ from 'ember-views/system/jquery';
import Application from 'ember-application/system/application';
import { subscribe, unsubscribe } from 'ember-metal/instrumentation';
import { compile } from 'ember-template-compiler';

var App, $fixture;

function setupExample() {
  // setup templates
  Ember.TEMPLATES.application = compile('{{outlet}}');
  Ember.TEMPLATES.index = compile('<h1>Node 1</h1>');
  Ember.TEMPLATES.posts = compile('<h1>Node 1</h1>');

  App.Router.map(function() {
    this.route('posts');
  });
}

function handleURL(path) {
  var router = App.__container__.lookup('router:main');
  return run(router, 'handleURL', path);
}

QUnit.module('View Instrumentation', {
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
    run(App, 'destroy');
    App = null;
    Ember.TEMPLATES = {};
  }
});

QUnit.test('Nodes without view instances are instrumented', function(assert) {
  var called = false;
  var subscriber = subscribe('render', {
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
  unsubscribe(subscriber);
});
