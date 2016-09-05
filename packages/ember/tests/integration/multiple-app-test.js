import { run } from 'ember-metal';
import { compile } from 'ember-template-compiler';
import { Application } from 'ember-application';
import { Component } from 'ember-glimmer';
import { jQuery } from 'ember-views';

let App1, App2, actions;

function startApp(rootElement) {
  let application;

  run(() => {
    application = Application.create({
      rootElement
    });
    application.deferReadiness();

    application.Router.reopen({
      location: 'none'
    });

    let registry = application.__registry__;

    registry.register('component:special-button', Component.extend({
      actions: {
        doStuff() {
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
  let router = application.__container__.lookup('router:main');
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
