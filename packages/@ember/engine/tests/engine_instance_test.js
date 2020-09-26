import Engine, { getEngineParent, setEngineParent } from '@ember/engine';
import EngineInstance from '@ember/engine/instance';
import { run } from '@ember/runloop';
import { factory } from 'internal-test-helpers';
import {
  moduleFor,
  ModuleBasedTestResolver,
  AbstractTestCase as TestCase,
} from 'internal-test-helpers';

let engine, engineInstance;

moduleFor(
  'EngineInstance',
  class extends TestCase {
    constructor() {
      super();

      run(() => {
        engine = Engine.create({
          router: null,
          Resolver: ModuleBasedTestResolver,
        });
      });
    }

    teardown() {
      if (engineInstance) {
        run(engineInstance, 'destroy');
        engineInstance = undefined;
      }

      if (engine) {
        run(engine, 'destroy');
        engine = undefined;
      }
    }

    ['@test an engine instance can be created based upon a base engine'](assert) {
      run(() => {
        engineInstance = EngineInstance.create({ base: engine });
      });

      assert.ok(engineInstance, 'instance should be created');
      assert.equal(engineInstance.base, engine, 'base should be set to engine');
    }

    ['@test unregistering a factory clears all cached instances of that factory'](assert) {
      assert.expect(3);

      engineInstance = run(() => EngineInstance.create({ base: engine }));

      let PostComponent = factory();

      engineInstance.register('component:post', PostComponent);

      let postComponent1 = engineInstance.lookup('component:post');
      assert.ok(postComponent1, 'lookup creates instance');

      engineInstance.unregister('component:post');
      engineInstance.register('component:post', PostComponent);

      let postComponent2 = engineInstance.lookup('component:post');
      assert.ok(postComponent2, 'lookup creates instance');

      assert.notStrictEqual(
        postComponent1,
        postComponent2,
        'lookup creates a brand new instance because previous one was reset'
      );
    }

    ['@test can be booted when its parent has been set'](assert) {
      assert.expect(3);

      engineInstance = run(() => EngineInstance.create({ base: engine }));

      expectAssertion(() => {
        engineInstance._bootSync();
      }, "An engine instance's parent must be set via `setEngineParent(engine, parent)` prior to calling `engine.boot()`.");

      setEngineParent(engineInstance, {});

      // Stub `cloneParentDependencies`, the internals of which are tested along
      // with application instances.
      engineInstance.cloneParentDependencies = function () {
        assert.ok(true, 'parent dependencies are cloned');
      };

      return engineInstance.boot().then(() => {
        assert.ok(true, 'boot successful');
      });
    }

    ['@test can build a child instance of a registered engine'](assert) {
      let ChatEngine = Engine.extend({
        Resolver: ModuleBasedTestResolver,
      });
      let chatEngineInstance;

      engine.register('engine:chat', ChatEngine);

      run(() => {
        engineInstance = EngineInstance.create({ base: engine });

        // Try to build an unregistered engine.
        assert.throws(() => {
          engineInstance.buildChildEngineInstance('fake');
        }, `You attempted to mount the engine 'fake', but it is not registered with its parent.`);

        // Build the `chat` engine, registered above.
        chatEngineInstance = engineInstance.buildChildEngineInstance('chat');
      });

      assert.ok(chatEngineInstance, 'child engine instance successfully created');

      assert.strictEqual(
        getEngineParent(chatEngineInstance),
        engineInstance,
        'child engine instance is assigned the correct parent'
      );
    }
  }
);
