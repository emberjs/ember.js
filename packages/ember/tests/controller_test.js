import Controller from 'ember-runtime/controllers/controller';
import Route from 'ember-routing/system/route';
import run from 'ember-metal/run_loop';
import { compile } from 'ember-template-compiler/tests/utils/helpers';
import Application from 'ember-application/system/application';
import { Component, setTemplates, setTemplate } from 'ember-glimmer';
import jQuery from 'ember-views/system/jquery';

/*
 In Ember 1.x, controllers subtly affect things like template scope
 and action targets in exciting and often inscrutable ways. This test
 file contains integration tests that verify the correct behavior of
 the many parts of the system that change and rely upon controller scope,
 from the runtime up to the templating layer.
*/

let App, $fixture;

QUnit.module('Template scoping examples', {
  setup() {
    run(() => {
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
    run(() => App.destroy());

    App = null;

    setTemplates({});
  }
});

QUnit.test('Actions inside an outlet go to the associated controller', function() {
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

function bootApp() {
  run(App, 'advanceReadiness');
}
