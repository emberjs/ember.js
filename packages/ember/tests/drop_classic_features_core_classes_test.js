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
import Service, { service } from '@ember/service';
import { setOwner } from '@ember/owner';
import Helper from '@ember/component/helper';
import DataAdapter from '@ember/debug/data-adapter';
import ContainerDebugAdapter from '@ember/debug/container-debug-adapter';
import EventDispatcher from '@ember/-internals/views/lib/system/event_dispatcher';
import CoreObject from '@ember/object/lib/core-object';
import { isDestroyed } from '@ember/destroyable';
import {
  buildOwner,
  moduleFor,
  AbstractTestCase,
  ModuleBasedTestResolver,
  runTask,
} from 'internal-test-helpers';

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

      ['@test Namespace is not exported'](assert) {
        assert.strictEqual(Namespace, undefined);
      }

      ['@test Application.create assigns the options, then starts the application'](assert) {
        class MyApplication extends Application {
          Resolver = ModuleBasedTestResolver;

          ready() {
            assert.step(`ready ${this.autoboot}`);
          }
        }

        let application = runTask(() =>
          MyApplication.create({ autoboot: false, rootElement: '#qunit-fixture' })
        );

        assert.strictEqual(application.rootElement, '#qunit-fixture');
        assert.strictEqual(application.__deprecatedInstance__, undefined, 'autoboot is off');
        assert.verifySteps([]);

        runTask(() => application.destroy());

        assert.true(isDestroyed(application));
      }

      ['@test an engine builds its registry with the Resolver of its subclass'](assert) {
        class MyEngine extends Engine {
          Resolver = ModuleBasedTestResolver;
        }

        let engine = MyEngine.create();

        assert.strictEqual(engine.resolveRegistration('application:main'), engine);

        let instance = engine.buildInstance();

        assert.strictEqual(instance.base, engine);
        assert.strictEqual(instance.lookup('-application-instance:main'), undefined);

        runTask(() => instance.destroy());
        runTask(() => engine.destroy());

        assert.true(isDestroyed(instance));
        assert.true(isDestroyed(engine));
      }

      ['@test `@service` looks up the service once, and can be replaced'](assert) {
        class Session extends Service {}

        class Holder {
          @service session;
          @service('session') renamed;

          constructor(owner) {
            setOwner(this, owner);
          }
        }

        let owner = buildOwner();

        owner.register('service:session', Session);

        let holder = new Holder(owner);
        let session = holder.session;

        assert.true(session instanceof Session);
        assert.strictEqual(holder.renamed, session);
        assert.strictEqual(holder.session, session);

        let replacement = {};

        holder.session = replacement;

        assert.strictEqual(holder.session, replacement);

        runTask(() => owner.destroy());
      }

      ['@test willDestroy runs once'](assert) {
        class MyEngine extends Engine {
          Resolver = ModuleBasedTestResolver;

          willDestroy() {
            super.willDestroy();
            assert.step('willDestroy');
          }
        }

        let engine = MyEngine.create();

        runTask(() => engine.destroy());
        runTask(() => engine.destroy());

        assert.verifySteps(['willDestroy']);
      }
    }
  );
}
