import { run } from 'ember-metal';
import { Controller as EmberController } from 'ember-runtime';
import '../index'; // Must be required to export Ember.ContainerDebugAdapter.
import { Application } from 'ember-application';

let adapter, App, appInstance;

function boot() {
  run(App, 'advanceReadiness');
}

QUnit.module('Container Debug Adapter', {
  setup() {
    run(() => {
      App = Application.create();  // ES6TODO: this comes from the ember-application package NOT ember-runtime.
      App.toString = function() { return 'App'; };
      App.deferReadiness();
    });
    boot();
    run(() => {
      appInstance = App.__deprecatedInstance__;
      adapter = appInstance.lookup('container-debug-adapter:main');
    });
  },
  teardown() {
    run(() => {
      adapter.destroy();
      appInstance.destroy();
      App.destroy();
      App = appInstance = adapter = null;
    });
  }
});

QUnit.test('the default ContainerDebugAdapter cannot catalog certain entries by type', function() {
  equal(adapter.canCatalogEntriesByType('model'), false, 'canCatalogEntriesByType should return false for model');
  equal(adapter.canCatalogEntriesByType('template'), false, 'canCatalogEntriesByType should return false for template');
});

QUnit.test('the default ContainerDebugAdapter can catalog typical entries by type', function() {
  equal(adapter.canCatalogEntriesByType('controller'), true, 'canCatalogEntriesByType should return true for controller');
  equal(adapter.canCatalogEntriesByType('route'), true, 'canCatalogEntriesByType should return true for route');
  equal(adapter.canCatalogEntriesByType('view'), true, 'canCatalogEntriesByType should return true for view');
});

QUnit.test('the default ContainerDebugAdapter catalogs controller entries', function() {
  App.PostController = EmberController.extend();
  let controllerClasses = adapter.catalogEntriesByType('controller');

  equal(controllerClasses.length, 1, 'found 1 class');
  equal(controllerClasses[0], 'post', 'found the right class');
});
