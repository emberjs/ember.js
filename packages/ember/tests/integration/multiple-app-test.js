import run from 'ember-metal/run_loop';
import compile from 'ember-template-compiler/system/compile';
import Application from 'ember-application/system/application';
import Component from 'ember-views/components/component';
import jQuery from 'ember-views/system/jquery';

var App1, App2, actions;

function startApp(rootElement) {
  var application;

  run(function() {
    application = Application.create({
      rootElement
    });
    application.deferReadiness();

    application.Router.reopen({
      location: 'none'
    });

    var registry = application.__registry__;

    registry.register('component:special-button', Component.extend({
      actions: {
        doStuff: function() {
          actions.push(rootElement);
        }
      }
    }));
    registry.register('template:application', compile('{{outlet}}', { moduleName: 'application' }));
    registry.register('template:index', compile('<h1>Node 1</h1>{{special-button}}', { moduleName: 'index' }));
    registry.register('template:components/special-button', compile('<button class=\'do-stuff\' {{action \'doStuff\'}}>Button</button>', { moduleName: 'components/special-button' }));
  });

  return application;
}

function handleURL(application, path) {
  var router = application.__container__.lookup('router:main');
  return run(router, 'handleURL', path);
}

QUnit.module('View Integration', {
  setup() {
    actions = [];
    jQuery('#qunit-fixture').html('<div id="app-1"></div><div id="app-2"></div>');
    App1 = startApp('#app-1');
    App2 = startApp('#app-2');
  },

  teardown() {
    run(App1, 'destroy');
    run(App2, 'destroy');
    App1 = App2 = null;
  }
});

QUnit.test('booting multiple applications can properly handle events', function(assert) {
  run(App1, 'advanceReadiness');
  run(App2, 'advanceReadiness');

  handleURL(App1, '/');
  handleURL(App2, '/');

  jQuery('#app-2 .do-stuff').click();
  jQuery('#app-1 .do-stuff').click();

  assert.deepEqual(actions, ['#app-2', '#app-1']);
});
