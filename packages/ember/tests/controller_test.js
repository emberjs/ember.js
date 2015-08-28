import Ember from 'ember-metal/core';
import { compile } from 'ember-template-compiler';
import EmberView from 'ember-views/views/view';

import plugins, { registerPlugin } from 'ember-template-compiler/plugins';
import TransformEachIntoCollection from 'ember-template-compiler/plugins/transform-each-into-collection';

/*
 In Ember 1.x, controllers subtly affect things like template scope
 and action targets in exciting and often inscrutable ways. This test
 file contains integration tests that verify the correct behavior of
 the many parts of the system that change and rely upon controller scope,
 from the runtime up to the templating layer.
*/

var App, $fixture, templates;

let originalAstPlugins;

QUnit.module('Template scoping examples', {
  setup() {
    originalAstPlugins = plugins['ast'].slice(0);
    registerPlugin('ast', TransformEachIntoCollection);

    Ember.run(function() {
      templates = Ember.TEMPLATES;
      App = Ember.Application.create({
        name: 'App',
        rootElement: '#qunit-fixture'
      });
      App.deferReadiness();

      App.Router.reopen({
        location: 'none'
      });

      App.LoadingRoute = Ember.Route.extend();
    });

    $fixture = Ember.$('#qunit-fixture');
  },

  teardown() {
    Ember.run(function() {
      App.destroy();
    });

    App = null;

    Ember.TEMPLATES = {};

    plugins['ast'] = originalAstPlugins;
  }
});

QUnit.test('Actions inside an outlet go to the associated controller', function() {
  expect(1);

  templates.index = compile('{{component-with-action action=\'componentAction\'}}');

  App.IndexController = Ember.Controller.extend({
    actions: {
      componentAction() {
        ok(true, 'received the click');
      }
    }
  });

  App.ComponentWithActionComponent = Ember.Component.extend({
    classNames: ['component-with-action'],
    click() {
      this.sendAction();
    }
  });

  bootApp();

  $fixture.find('.component-with-action').click();
});

QUnit.test('the controller property is provided to route driven views', function() {
  var applicationController, applicationViewController;

  App.ApplicationController = Ember.Controller.extend({
    init: function() {
      this._super(...arguments);
      applicationController = this;
    }
  });

  App.ApplicationView = EmberView.extend({
    init: function() {
      this._super(...arguments);
      applicationViewController = this.get('controller');
    }
  });

  bootApp();

  equal(applicationViewController, applicationController, 'application view should get its controller set properly');
});

// This test caught a regression where {{#each}}s used directly in a template
// (i.e., not inside a view or component) did not have access to a container and
// would raise an exception.
QUnit.test('{{#each}} inside outlet can have an itemController', function(assert) {
  expectDeprecation(function() {
    templates.index = compile(`
      {{#each model itemController='thing'}}
        <p>hi</p>
      {{/each}}
    `);
  }, `Using 'itemController' with '{{each}}' (L2:C20) is deprecated.  Please refactor to a component.`);

  App.IndexController = Ember.Controller.extend({
    model: Ember.A([1, 2, 3])
  });

  App.ThingController = Ember.Controller.extend();

  bootApp();

  assert.equal($fixture.find('p').length, 3, 'the {{#each}} rendered without raising an exception');
});

function bootApp() {
  Ember.run(App, 'advanceReadiness');
}
