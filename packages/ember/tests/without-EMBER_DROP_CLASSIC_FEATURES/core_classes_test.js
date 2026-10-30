import Application from '@ember/application';
import ApplicationInstance from '@ember/application/instance';
import Namespace from '@ember/application/namespace';
import Engine from '@ember/engine';
import EngineInstance from '@ember/engine/instance';
import EmberRouter from '@ember/routing/router';
import HashLocation from '@ember/routing/hash-location';
import HistoryLocation from '@ember/routing/history-location';
import NoneLocation from '@ember/routing/none-location';
import DataAdapter from '@ember/debug/data-adapter';
import ContainerDebugAdapter from '@ember/debug/container-debug-adapter';
import EventDispatcher from '@ember/-internals/views/lib/system/event_dispatcher';
import EmberObject from '@ember/object/lib/ember-object';
import RegistryProxyMixin from '@ember/-internals/runtime/lib/mixins/registry_proxy';
import ContainerProxyMixin from '@ember/-internals/runtime/lib/mixins/container_proxy';
import { moduleFor, AbstractTestCase, runDestroy } from 'internal-test-helpers';

/*
  The `EMBER_DROP_CLASSIC_FEATURES` build flag puts these classes on a plain
  base. These tests run only in builds without the flag.
*/
if (!import.meta.env?.EMBER_DROP_CLASSIC_FEATURES) {
  moduleFor(
    'without EMBER_DROP_CLASSIC_FEATURES: core classes',
    class extends AbstractTestCase {
      ['@test the core classes extend EmberObject'](assert) {
        let classes = {
          Application,
          ApplicationInstance,
          Namespace,
          Engine,
          EngineInstance,
          EmberRouter,
          HashLocation,
          HistoryLocation,
          NoneLocation,
          DataAdapter,
          ContainerDebugAdapter,
          EventDispatcher,
        };

        for (let [name, klass] of Object.entries(classes)) {
          assert.true(klass.prototype instanceof EmberObject, name);
        }
      }

      ['@test Engine and EngineInstance use the proxy mixins'](assert) {
        assert.true(RegistryProxyMixin.detect(Engine.prototype), 'Engine');
        assert.true(RegistryProxyMixin.detect(EngineInstance.prototype), 'EngineInstance');
        assert.true(ContainerProxyMixin.detect(EngineInstance.prototype), 'EngineInstance');
      }

      ['@test extend, create and get work on a Namespace'](assert) {
        let MyNamespace = Namespace.extend({ VERSION: '1.0.0' });
        let namespace = MyNamespace.create();

        assert.strictEqual(namespace.get('VERSION'), '1.0.0');

        runDestroy(namespace);
      }
    }
  );
}
