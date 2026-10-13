import { context } from '@ember/-internals/environment';
import { run } from '@ember/runloop';
import Engine from '@ember/engine';
import { NAMESPACES } from '@ember/-internals/metal';
import { guidFor } from '@ember/-internals/utils';
import {
  moduleFor,
  AbstractTestCase as TestCase,
  ModuleBasedTestResolver,
  verifyRegistration,
} from 'internal-test-helpers';

let engine;
let originalLookup = context.lookup;

moduleFor(
  'Engine',
  class extends TestCase {
    constructor() {
      super();

      run(() => {
        engine = Engine.create({
          Resolver: ModuleBasedTestResolver,
        });
        context.lookup = { TestEngine: engine };
      });
    }

    teardown() {
      context.lookup = originalLookup;
      if (engine) {
        run(engine, 'destroy');
        engine = null;
      }
    }

    ['@test is in the list of namespaces until it is destroyed'](assert) {
      assert.true(NAMESPACES.includes(engine), 'the engine is in NAMESPACES');

      run(engine, 'destroy');

      assert.false(NAMESPACES.includes(engine), 'the engine is not in NAMESPACES');

      engine = null;
    }

    ['@test toString returns the name or the modulePrefix'](assert) {
      assert.strictEqual(engine.toString(), guidFor(engine), 'the guid is the last choice');

      engine.modulePrefix = 'my-engine';
      assert.strictEqual(engine.toString(), 'my-engine', 'modulePrefix is used');

      engine.name = 'named';
      assert.strictEqual(engine.toString(), 'named', 'name wins');
    }

    ['@test builds a registry'](assert) {
      assert.strictEqual(
        engine.resolveRegistration('application:main'),
        engine,
        `application:main is registered`
      );
      assert.deepEqual(
        engine.registeredOptionsForType('component'),
        { singleton: false },
        `optionsForType 'component'`
      );
      assert.deepEqual(
        engine.registeredOptionsForType('view'),
        { singleton: false },
        `optionsForType 'view'`
      );
      verifyRegistration(assert, engine, 'controller:basic');

      verifyRegistration(assert, engine, 'component:link-to');

      verifyRegistration(assert, engine, 'component:textarea');

      verifyRegistration(assert, engine, 'service:-routing');

      // DEBUGGING
      verifyRegistration(assert, engine, 'resolver-for-debugging:main');
      verifyRegistration(assert, engine, 'container-debug-adapter:main');

      assert.deepEqual(
        engine.registeredOptionsForType('helper'),
        { instantiate: false },
        `optionsForType 'helper'`
      );
    }
  }
);
