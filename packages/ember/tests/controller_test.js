import Controller from 'ember-runtime/controllers/controller';
import Route from 'ember-routing/system/route';
import run from 'ember-metal/run_loop';
import { compile } from 'ember-template-compiler';
import Application from 'ember-application/system/application';
import EmberView from 'ember-views/views/view';
import Component from 'ember-templates/component';
import jQuery from 'ember-views/system/jquery';
import { setTemplates, set as setTemplate } from 'ember-templates/template_registry';

/*
 In Ember 1.x, controllers subtly affect things like template scope
 and action targets in exciting and often inscrutable ways. This test
 file contains integration tests that verify the correct behavior of
 the many parts of the system that change and rely upon controller scope,
 from the runtime up to the templating layer.
*/

var App, $fixture;

QUnit.module('Template scoping examples', {
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

      App.LoadingRoute = Route.extend();
    });

    $fixture = jQuery('#qunit-fixture');
  },

  teardown() {
    run(function() {
      App.destroy();
    });

    App = null;

    setTemplates({});
  }
});

import { test } from 'ember-glimmer/tests/utils/skip-if-glimmer';

test('Actions inside an outlet go to the associated controller', function() {
  expect(1);

  setTemplate('index', compile('{{component-with-action action=\'componentAction\'}}'));

  App.IndexController = Controller.extend({
    actions: {
      componentAction() {
        ok(true, 'received the click');
      }
    }
  });

  App.ComponentWithActionComponent = Component.extend({
    classNames: ['component-with-action'],
    click() {
      this.sendAction();
    }
  });

  bootApp();

  $fixture.find('.component-with-action').click();
});

test('the controller property is provided to route driven views', function() {
  var applicationController, applicationViewController;

  App.ApplicationController = Controller.extend({
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

function bootApp() {
  run(App, 'advanceReadiness');
}
