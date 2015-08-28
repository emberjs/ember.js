import Ember from 'ember-metal/core';
import { compile } from 'ember-template-compiler';
import EmberView from 'ember-views/views/view';

var Router, App, templates, router, container;

function bootApplication() {
  for (var name in templates) {
    Ember.TEMPLATES[name] = compile(templates[name]);
  }
  router = container.lookup('router:main');
  Ember.run(App, 'advanceReadiness');
}

QUnit.module('Top Level DOM Structure', {
  setup() {
    Ember.run(function() {
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

      templates = {
        application: 'hello world'
      };
    });
  },

  teardown() {
    Ember.run(function() {
      App.destroy();
      App = null;

      Ember.TEMPLATES = {};
    });

    Ember.NoneLocation.reopen({
      path: ''
    });
  }
});

QUnit.test('Topmost template always get an element', function() {
  bootApplication();
  equal(Ember.$('#qunit-fixture > .ember-view').text(), 'hello world');
});

QUnit.test('If topmost view has its own element, it doesn\'t get wrapped in a higher element', function() {
  App.register('view:application', EmberView.extend({
    classNames: ['im-special']
  }));
  bootApplication();
  equal(Ember.$('#qunit-fixture > .im-special').text(), 'hello world');
});
