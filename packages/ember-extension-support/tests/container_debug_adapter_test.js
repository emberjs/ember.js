import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';
import { assign } from '@ember/polyfills';
import { run } from '@ember/runloop';
import EmberController from '@ember/controller';
import '../index'; // Must be required to export Ember.ContainerDebugAdapter.
import { getDebugFunction, setDebugFunction } from 'ember-debug';

const originalDebug = getDebugFunction('debug');
const noop = function() {};
let adapter;

moduleFor(
  'Container Debug Adapter',
  class extends ApplicationTestCase {
    constructor() {
      setDebugFunction('debug', noop);
      super();
      adapter = this.application.__deprecatedInstance__.lookup('container-debug-adapter:main');
    }

    get applicationOptions() {
      return assign(super.applicationOptions, {
        autoboot: true,
      });
    }

    teardown() {
      setDebugFunction('debug', originalDebug);
      run(() => {
        adapter.destroy();
      });

      super.teardown();
    }

    ['@test default ContainerDebugAdapter cannot catalog certain entries by type'](assert) {
      assert.equal(
        adapter.canCatalogEntriesByType('model'),
        false,
        'canCatalogEntriesByType should return false for model'
      );
      assert.equal(
        adapter.canCatalogEntriesByType('template'),
        false,
        'canCatalogEntriesByType should return false for template'
      );
    }

    ['@test default ContainerDebugAdapter can catalog typical entries by type'](assert) {
      assert.equal(
        adapter.canCatalogEntriesByType('controller'),
        true,
        'canCatalogEntriesByType should return true for controller'
      );
      assert.equal(
        adapter.canCatalogEntriesByType('route'),
        true,
        'canCatalogEntriesByType should return true for route'
      );
      assert.equal(
        adapter.canCatalogEntriesByType('view'),
        true,
        'canCatalogEntriesByType should return true for view'
      );
    }

    ['@test default ContainerDebugAdapter catalogs controller entries'](assert) {
      this.application.PostController = EmberController.extend();
      let controllerClasses = adapter.catalogEntriesByType('controller');

      assert.equal(controllerClasses.length, 1, 'found 1 class');
      assert.equal(controllerClasses[0], 'post', 'found the right class');
    }
  }
);
