import Ember from 'ember-metal/core';
import run from 'ember-metal/run_loop';
import compile from 'ember-template-compiler/system/compile';

var Router, router, App, container;

function bootApplication() {
  router = container.lookup('router:main');
  run(App, 'advanceReadiness');
}

function handleURL(path) {
  return run(function() {
    return router.handleURL(path).then(function(value) {
      ok(true, 'url: `' + path + '` was handled');
      return value;
    }, function(reason) {
      ok(false, 'failed to visit:`' + path + '` reason: `' + QUnit.jsDump.parse(reason));
      throw reason;
    });
  });
}

QUnit.module('Router.map', {
  setup() {
    run(function() {
      App = Ember.Application.create({
        name: 'App',
        rootElement: '#qunit-fixture'
      });

      App.deferReadiness();

      App.Router.reopen({
        location: 'none'
      });

      Router = App.Router;

      container = App.__container__;
    });
  },

  teardown() {
    run(function() {
      App.destroy();
      App = null;

      Ember.TEMPLATES = {};
    });
  }
});

QUnit.test('Router.map returns an Ember Router class', function () {
  expect(1);

  var ret = App.Router.map(function() {
    this.route('hello');
  });

  ok(Ember.Router.detect(ret));
});

QUnit.test('Router.map can be called multiple times', function () {
  expect(4);

  Ember.TEMPLATES.hello = compile('Hello!');
  Ember.TEMPLATES.goodbye = compile('Goodbye!');

  App.Router.map(function() {
    this.route('hello');
  });

  App.Router.map(function() {
    this.route('goodbye');
  });

  bootApplication();

  handleURL('/hello');

  equal(Ember.$('#qunit-fixture').text(), 'Hello!', 'The hello template was rendered');

  handleURL('/goodbye');

  equal(Ember.$('#qunit-fixture').text(), 'Goodbye!', 'The goodbye template was rendered');
});
