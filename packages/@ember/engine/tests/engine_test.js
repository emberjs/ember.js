import { context } from '@ember/-internals/environment';
import { run } from '@ember/runloop';
import Engine from '@ember/engine';
import EmberObject from '@ember/object';
import { processAllNamespaces } from '@ember/-internals/metal';
import { getName } from '@ember/-internals/utils';
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

    ['@test acts like a namespace'](assert) {
      engine.Foo = EmberObject.extend();
      processAllNamespaces();
      assert.equal(getName(engine.Foo), 'TestEngine.Foo', 'Classes pick up their parent namespace');
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
      verifyRegistration(assert, engine, 'component-lookup:main');

      verifyRegistration(assert, engine, 'view:-outlet');
      verifyRegistration(assert, engine, 'template:-outlet');
      assert.deepEqual(
        engine.registeredOptionsForType('helper'),
        { instantiate: false },
        `optionsForType 'helper'`
      );
    }
  }
);
