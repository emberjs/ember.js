import Application from '@ember/application';
import ApplicationInstance from '@ember/application/instance';
import Namespace from '@ember/application/namespace';
import Engine from '@ember/engine';
import EngineInstance from '@ember/engine/instance';
import EmberRouter from '@ember/routing/router';
import Route from '@ember/routing/route';
import HashLocation from '@ember/routing/hash-location';
import HistoryLocation from '@ember/routing/history-location';
import NoneLocation from '@ember/routing/none-location';
import Controller from '@ember/controller';
import Service from '@ember/service';
import Helper from '@ember/component/helper';
import DataAdapter from '@ember/debug/data-adapter';
import ContainerDebugAdapter from '@ember/debug/container-debug-adapter';
import EventDispatcher from '@ember/-internals/views/lib/system/event_dispatcher';
import CoreObject from '@ember/object/lib/core-object';
import { moduleFor, AbstractTestCase, runDestroy } from 'internal-test-helpers';

/*
  The flag is a build-time value. Build with
  `EMBER_DROP_CLASSIC_FEATURES=true` to run this module.
*/
if (import.meta.env?.EMBER_DROP_CLASSIC_FEATURES) {
  moduleFor(
    'EMBER_DROP_CLASSIC_FEATURES build flag: core classes',
    class extends AbstractTestCase {
      ['@test the core classes do not extend CoreObject'](assert) {
        let classes = {
          Application,
          ApplicationInstance,
          Namespace,
          Engine,
          EngineInstance,
          EmberRouter,
          Route,
          HashLocation,
          HistoryLocation,
          NoneLocation,
          Controller,
          Service,
          Helper,
          DataAdapter,
          ContainerDebugAdapter,
          EventDispatcher,
        };

        for (let [name, klass] of Object.entries(classes)) {
          assert.false(klass.prototype instanceof CoreObject, name);
          assert.strictEqual(klass.extend, undefined, `${name}.extend`);
        }
      }

      ['@test create assigns the properties, then calls init'](assert) {
        class MyNamespace extends Namespace {
          init(properties) {
            super.init(properties);
            assert.step(`init ${this.VERSION}`);
          }
        }

        let namespace = MyNamespace.create({ VERSION: '1.0.0' });

        assert.verifySteps(['init 1.0.0']);
        assert.strictEqual(namespace.VERSION, '1.0.0');

        runDestroy(namespace);

        assert.true(namespace.isDestroyed);
      }

      ['@test destroy runs willDestroy once'](assert) {
        class MyNamespace extends Namespace {
          willDestroy() {
            super.willDestroy();
            assert.step('willDestroy');
          }
        }

        let namespace = MyNamespace.create();

        runDestroy(namespace);
        runDestroy(namespace);

        assert.verifySteps(['willDestroy']);
      }
    }
  );
}
