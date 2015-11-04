import Ember from 'ember-metal/core'; // TEMPLATES
import run from 'ember-metal/run_loop';
import { compile } from 'ember-template-compiler';
import EmberView from 'ember-views/views/view';
import Application from 'ember-application/system/application';
import jQuery from 'ember-views/system/jquery';
import NoneLocation from 'ember-routing/location/none_location';

var Router, App, templates, router, container;

function bootApplication() {
  for (var name in templates) {
    Ember.TEMPLATES[name] = compile(templates[name]);
  }
  router = container.lookup('router:main');
  run(App, 'advanceReadiness');
}

QUnit.module('Top Level DOM Structure', {
  setup() {
    run(function() {
      App = Application.create({
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
    run(function() {
      App.destroy();
      App = null;

      Ember.TEMPLATES = {};
    });

    NoneLocation.reopen({
      path: ''
    });
  }
});

QUnit.test('Topmost template always get an element', function() {
  bootApplication();
  equal(jQuery('#qunit-fixture > .ember-view').text(), 'hello world');
});

QUnit.test('If topmost view has its own element, it doesn\'t get wrapped in a higher element', function() {
  App.register('view:application', EmberView.extend({
    classNames: ['im-special']
  }));
  bootApplication();
  equal(jQuery('#qunit-fixture > .im-special').text(), 'hello world');
});
